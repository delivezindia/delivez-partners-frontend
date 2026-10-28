import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
import { MAPS_KEY, mapsAuthFailed } from '../lib/googleMaps';
import { GoogleMapPicker } from './GoogleMapPicker';

export interface GeocodeResult {
  label: string;
  /** Street + area on one line (single-line address fields). */
  line1: string;
  /** House / building number and road. */
  street?: string | null;
  /** Neighbourhood / locality. */
  area?: string | null;
  /** A named place at or next to the pin, used as the landmark. */
  landmark?: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  /** Google place id when the result came from Google. */
  placeId?: string;
}

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#D40511;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng, map]);
  return null;
}

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) });
  return null;
}

export interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  fallbackCenter: [number, number];
  onChange: (lat: number, lng: number) => void;
  onAddress?: (result: GeocodeResult) => void;
  /** Tailwind height class for the map, e.g. h-56 inside a modal. */
  height?: string;
  hint?: string;
  placeholder?: string;
}

/**
 * Map pin picker (plan §16.4 MapAddressPicker). Google Maps when VITE_GOOGLE_MAPS_API_KEY is set
 * (falls back automatically if Google rejects the key); otherwise OpenStreetMap + Nominatim via the API.
 */
export function MapPicker(props: MapPickerProps) {
  const [googleFailed, setGoogleFailed] = useState(mapsAuthFailed);
  if (MAPS_KEY && !googleFailed) return <GoogleMapPicker {...props} onFail={() => setGoogleFailed(true)} />;
  return <OsmMapPicker {...props} />;
}

function OsmMapPicker({
  lat,
  lng,
  fallbackCenter,
  onChange,
  onAddress,
  height = 'h-72',
  hint = "Drag the pin to your building's entrance. Riders will come to this point.",
  placeholder = 'Search your area, street or building',
}: MapPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const center = useMemo<[number, number]>(() => (lat != null && lng != null ? [lat, lng] : fallbackCenter), [lat, lng, fallbackCenter]);

  async function move(newLat: number, newLng: number, lookup = true) {
    onChange(round(newLat), round(newLng));
    if (!lookup || !onAddress) return;
    try {
      const r = await api<GeocodeResult | null>(`/geo/reverse?lat=${newLat}&lng=${newLng}`);
      if (r) {
        onAddress(r);
        setQuery(r.line1);
        setMessage('');
      }
    } catch {
      // Reverse geocoding is a convenience; the customer can type the address.
    }
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 3) return;
    setBusy(true);
    setMessage('');
    try {
      const rows = await api<GeocodeResult[]>(`/geo/search?q=${encodeURIComponent(query.trim())}`);
      setResults(rows);
      if (!rows.length) setMessage('No matches. Try a landmark or area name, or drag the pin.');
    } catch {
      setMessage('Search is unavailable right now. Drag the pin to your door.');
    } finally {
      setBusy(false);
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
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void search();
              }
            }}
            placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-neutral-300 px-3 outline-none focus:border-dz-black"
          />
          {results.length > 0 && (
            <ul className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-neutral-200">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                    onClick={() => {
                      setResults([]);
                      setQuery(r.line1);
                      onChange(round(r.lat), round(r.lng));
                      onAddress?.(r);
                    }}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={() => void search()} disabled={busy} className="h-12 rounded-xl bg-dz-black px-4 text-sm font-semibold text-dz-yellow disabled:opacity-50">
          {busy ? '…' : 'Search'}
        </button>
        <button type="button" onClick={useMyLocation} className="h-12 rounded-xl border border-neutral-300 px-3 text-sm font-semibold hover:border-dz-black" title="Use my current location" aria-label="Use my current location">
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>
      {message && <p className="text-xs text-neutral-500">{message}</p>}
      <div className={`${height} overflow-hidden rounded-xl ring-1 ring-neutral-200`} data-map="osm">
        <MapContainer center={center} zoom={lat != null ? 17 : 12} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {lat != null && lng != null && (
            <>
              <Marker
                position={[lat, lng]}
                icon={pinIcon}
                draggable
                eventHandlers={{ dragend: (e) => void move((e.target as L.Marker).getLatLng().lat, (e.target as L.Marker).getLatLng().lng) }}
              />
              <Recenter lat={lat} lng={lng} />
            </>
          )}
          <ClickToMove onMove={(a, b) => void move(a, b)} />
        </MapContainer>
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
