import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import { mapsAuthFailed, mapsLibrary, nearbyLandmark, onMapsAuthFailure, parseAddress } from '../lib/googleMaps';
import type { GeocodeResult } from './MapPicker';

type Suggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };

/**
 * Google Maps pin picker (plan §16.4): Places (New) autocomplete, reverse geocoding, draggable pin.
 * Calls onFail if the key is rejected so the caller can fall back to the OpenStreetMap picker.
 */
export function GoogleMapPicker({
  lat,
  lng,
  fallbackCenter,
  onChange,
  onAddress,
  onFail,
  height = 'h-72',
  hint = "Drag the pin to your building's entrance. Riders will come to this point.",
  placeholder = 'Search your area, street or building',
}: {
  lat: number | null;
  lng: number | null;
  fallbackCenter: [number, number];
  onChange: (lat: number, lng: number) => void;
  onAddress?: (result: GeocodeResult) => void;
  onFail: () => void;
  height?: string;
  hint?: string;
  placeholder?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const places = useRef<google.maps.PlacesLibrary | null>(null);
  const latest = useRef({ onChange, onAddress });
  latest.current = { onChange, onAddress };
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState('');

  // Load the map once.
  useEffect(() => {
    let cancelled = false;
    const off = onMapsAuthFailure(onFail);
    if (mapsAuthFailed()) onFail();
    (async () => {
      try {
        const [{ Map }, placesLib, { Geocoder }] = await Promise.all([mapsLibrary('maps'), mapsLibrary('places'), mapsLibrary('geocoding')]);
        if (cancelled || !box.current) return;
        places.current = placesLib;
        geocoder.current = new Geocoder();
        const start = lat != null && lng != null ? { lat, lng } : { lat: fallbackCenter[0], lng: fallbackCenter[1] };
        map.current = new Map(box.current, {
          center: start,
          zoom: lat != null ? 17 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        map.current.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && void move(e.latLng.lat(), e.latLng.lng()));
        setReady(true);
      } catch {
        if (!cancelled) onFail();
      }
    })();
    return () => {
      cancelled = true;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync with lat/lng from the parent.
  useEffect(() => {
    if (!ready || !map.current) return;
    if (lat == null || lng == null) {
      marker.current?.setMap(null);
      return;
    }
    const pos = { lat, lng };
    if (!marker.current) {
      marker.current = new google.maps.Marker({ map: map.current, position: pos, draggable: true, title: 'Drag to the exact spot' });
      marker.current.addListener('dragend', () => {
        const p = marker.current!.getPosition();
        if (p) void move(p.lat(), p.lng());
      });
    } else {
      marker.current.setPosition(pos);
      marker.current.setMap(map.current);
    }
    map.current.panTo(pos);
    if ((map.current.getZoom() ?? 0) < 16) map.current.setZoom(17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lat, lng]);

  async function move(newLat: number, newLng: number, lookup = true) {
    latest.current.onChange(round(newLat), round(newLng));
    if (!lookup || !latest.current.onAddress || !geocoder.current) return;
    try {
      const { results } = await geocoder.current.geocode({ location: { lat: newLat, lng: newLng } });
      // The most precise street address, plus the nearest named place as a landmark.
      const r = results.find((x) => x.types.includes('street_address') || x.types.includes('premise')) ?? results[0];
      if (r) {
        const parsed = parseAddress(r.formatted_address, r.address_components);
        latest.current.onAddress({ ...parsed, landmark: nearbyLandmark(results), lat: round(newLat), lng: round(newLng), placeId: r.place_id });
        setQuery(parsed.line1);
        setOpen(false);
      }
    } catch {
      // Reverse geocoding is a convenience; the customer can type the address.
    }
  }

  // Autocomplete as you type (debounced). One session token per search → one billable session.
  useEffect(() => {
    const q = query.trim();
    if (!ready || q.length < 3 || !open) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const lib = places.current!;
        session.current ??= new lib.AutocompleteSessionToken();
        const c = map.current?.getCenter();
        const { suggestions: rows } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: session.current,
          includedRegionCodes: ['in'],
          ...(c ? { locationBias: { center: { lat: c.lat(), lng: c.lng() }, radius: 30000 } } : {}),
        });
        setSuggestions(
          rows.flatMap((s) =>
            s.placePrediction
              ? [{ id: s.placePrediction.placeId, main: s.placePrediction.mainText?.toString() ?? s.placePrediction.text.toString(), secondary: s.placePrediction.secondaryText?.toString() ?? '', prediction: s.placePrediction }]
              : [],
          ),
        );
        setMessage(rows.length ? '' : 'No matches. Try a landmark or area name, or drag the pin.');
      } catch {
        setMessage('Search is unavailable right now. Drag the pin to your door.');
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, ready, open]);

  async function pick(s: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    setQuery(s.main);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'addressComponents', 'id', 'displayName', 'types'] });
      session.current = null; // session ends with the details call
      const loc = place.location;
      if (!loc) return;
      latest.current.onChange(round(loc.lat()), round(loc.lng()));
      // A picked shop / building name makes a good landmark; a plain street or area doesn't.
      const named = place.types?.some((t) => ['point_of_interest', 'establishment', 'premise'].includes(t)) ? place.displayName ?? null : null;
      latest.current.onAddress?.({ ...parseAddress(place.formattedAddress ?? s.main, place.addressComponents ?? []), landmark: named, lat: round(loc.lat()), lng: round(loc.lng()), placeId: place.id });
    } catch {
      setMessage('Could not open that place. Drag the pin instead.');
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMessage('Location is not available in this browser');
    setMessage('Finding you…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMessage('');
        void move(pos.coords.latitude, pos.coords.longitude);
      },
      () => setMessage('Could not get your location. Search or drag the pin instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2" data-map="google">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            value={query}
            onChange={(e) => (setQuery(e.target.value), setOpen(true))}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions[0]) void pick(suggestions[0]);
              }
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-12 w-full rounded-xl border border-neutral-300 pl-9 pr-3 outline-none focus:border-dz-black"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-neutral-200" role="listbox">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100" onClick={() => void pick(s)}>
                    <b className="block">{s.main}</b>
                    <span className="text-xs text-ink-3">{s.secondary}</span>
                  </button>
                </li>
              ))}
              <li className="px-3 py-1 text-right text-[10px] text-ink-3">Powered by Google</li>
            </ul>
          )}
        </div>
        <button type="button" onClick={useMyLocation} className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-300 hover:border-dz-black" title="Use my current location" aria-label="Use my current location">
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>
      {message && <p className="text-xs text-neutral-500">{message}</p>}
      <div className={`${height} overflow-hidden rounded-xl ring-1 ring-neutral-200`}>
        <div ref={box} className="h-full w-full bg-soft" aria-label="Map" />
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
