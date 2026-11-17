import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Home, MapPin, Navigation, Store, type LucideIcon } from 'lucide-react';
import { MAPS_KEY, mapsAuthFailed, mapsLibrary, onMapsAuthFailure } from '../lib/googleMaps';
import type { LatLng } from '../lib/orders';
import type { StoreCard } from '../lib/types';
import { storeLook } from '../lib/icons';
import { km } from '../lib/format';
import { useI18n } from '../lib/i18n';

export type { LatLng };

export interface MapPin {
  id: string;
  at: LatLng;
  /** you = the address in use, shop, rider (live), drop = where the order goes. */
  kind: 'you' | 'shop' | 'rider' | 'drop';
  label?: string;
  icon?: LucideIcon;
  /** Ring colour for shops. */
  color?: string;
  /** Closed shops are greyed. */
  dim?: boolean;
}

const KIND_ICON: Record<MapPin['kind'], LucideIcon> = { you: MapPin, shop: Store, rider: Bike, drop: Home };

/** Is a real Google map possible here (key set, not rejected)? */
export function useMapsAvailable() {
  const [ok, setOk] = useState(!!MAPS_KEY && !mapsAuthFailed());
  useEffect(() => {
    const off = onMapsAuthFailure(() => setOk(false));
    return () => void off();
  }, []);
  return ok;
}

function Pin({ p, on }: { p: MapPin; on: boolean }) {
  const Icon = p.icon ?? KIND_ICON[p.kind];
  if (p.kind === 'you' || p.kind === 'drop') {
    return (
      <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-dz-yellow shadow-lg ring-4 ring-white">
        <Icon className="h-4 w-4" strokeWidth={2.6} />
      </span>
    );
  }
  if (p.kind === 'rider') {
    return (
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-[#E8130F] text-white shadow-lg ring-4 ring-white">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#E8130F]/40" />
        <Icon className="relative h-5 w-5" strokeWidth={2.4} />
      </span>
    );
  }
  return (
    <span className="grid justify-items-center">
      <span
        className={`grid place-items-center rounded-full bg-white transition ${on ? 'h-11 w-11' : 'h-8 w-8'} ${p.dim ? 'opacity-60 grayscale' : ''}`}
        style={{ boxShadow: `0 0 0 ${on ? 4 : 2.5}px ${p.color ?? '#111'}`, color: p.color ?? '#111' }}
      >
        <Icon className={on ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.3} />
      </span>
      {on && p.label && <small className="mt-1.5 whitespace-nowrap rounded-full bg-black px-2 py-0.5 text-[11.5px] font-extrabold text-white">{p.label}</small>}
    </span>
  );
}

/**
 * A real Google map with the app's own pins (lucide icons). Fits all pins; a shop pin can be tapped (`onPick`).
 * `route` draws a dashed line shop → rider → drop. Without a working Maps key it shows `fallback` (or nothing).
 */
export function LiveMap({
  pins,
  picked = null,
  onPick,
  route = false,
  className = 'aspect-[16/10] w-full rounded-3xl',
  label,
  fallback = null,
  zoom = 14,
}: {
  pins: MapPin[];
  picked?: string | null;
  onPick?: (id: string) => void;
  route?: boolean;
  className?: string;
  label: string;
  fallback?: ReactNode;
  zoom?: number;
}) {
  const available = useMapsAvailable();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const overlays = useRef<{ o: google.maps.OverlayView; root: Root }[]>([]);
  const line = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const fitted = useRef('');
  // Callers build `pins` on every render: redraw only when what they show changes.
  const sig = JSON.stringify(pins.map((p) => [p.id, p.at.lat, p.at.lng, p.kind, p.label, p.color, p.dim, p.icon?.displayName]));
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    (async () => {
      try {
        const { Map } = await mapsLibrary('maps');
        if (cancelled || !box.current || map.current) return;
        const first = pins[0]?.at ?? { lat: 20.59, lng: 78.96 };
        map.current = new Map(box.current, {
          center: first,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
        });
        setReady(true);
      } catch {
        /* key missing or rejected: the fallback shows */
      }
    })();
    return () => {
      cancelled = true;
    };
    // The map is made once; pins update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  // Pins (HTML overlays so they can carry the app's icons), the route line and the view.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const pins = pinsRef.current;
    for (const { o, root } of overlays.current) {
      o.setMap(null);
      setTimeout(() => root.unmount());
    }
    overlays.current = [];
    for (const p of pins) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.transform = 'translate(-50%, -50%)';
      div.style.zIndex = p.id === picked ? '3' : p.kind === 'rider' ? '4' : '2';
      if (p.kind === 'shop' && pickRef.current) {
        div.style.cursor = 'pointer';
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', p.label ?? p.id);
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          pickRef.current?.(p.id);
        });
      }
      div.dataset.pin = p.id;
      const root = createRoot(div);
      root.render(<Pin p={p} on={p.id === picked} />);
      const o = new google.maps.OverlayView();
      o.onAdd = () => o.getPanes()!.overlayMouseTarget.appendChild(div);
      o.draw = () => {
        const pt = o.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(p.at.lat, p.at.lng));
        if (pt) {
          div.style.left = `${pt.x}px`;
          div.style.top = `${pt.y}px`;
        }
      };
      o.onRemove = () => div.remove();
      o.setMap(m);
      overlays.current.push({ o, root });
    }
    line.current?.setMap(null);
    line.current = null;
    if (route) {
      const order = ['shop', 'rider', 'drop'] as const;
      const path = order.flatMap((k) => pins.filter((p) => p.kind === k).map((p) => p.at));
      if (path.length > 1)
        line.current = new google.maps.Polyline({
          map: m,
          path,
          strokeOpacity: 0,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: '#111', scale: 3 }, offset: '0', repeat: '14px' }],
        });
    }
    // Fit the view when the set of pins changes (not on every rider move or pick).
    const key = pins.filter((p) => p.kind !== 'rider').map((p) => p.id).join('|');
    if (key !== fitted.current && pins.length) {
      fitted.current = key;
      if (pins.length === 1) {
        m.setCenter(pins[0].at);
        m.setZoom(zoom);
      } else {
        const b = new google.maps.LatLngBounds();
        pins.forEach((p) => b.extend(p.at));
        m.fitBounds(b, 56);
      }
    }
  }, [ready, sig, picked, route, zoom]);

  // Keep the picked shop in view.
  useEffect(() => {
    const p = pinsRef.current.find((x) => x.id === picked);
    if (ready && p && map.current && !map.current.getBounds()?.contains(p.at)) map.current.panTo(p.at);
  }, [ready, picked]);

  useEffect(
    () => () => {
      for (const { o, root } of overlays.current) {
        o.setMap(null);
        setTimeout(() => root.unmount());
      }
      line.current?.setMap(null);
    },
    [],
  );

  if (!available) return <>{fallback}</>;
  return (
    <div className={`relative overflow-hidden bg-soft ${className}`} role="group" aria-label={label} data-map="google" data-live-map>
      <div ref={box} className="absolute inset-0" />
    </div>
  );
}

/** Shops around an address on a real map: tap a pin to see the shop, then open it. */
export function ShopsMap({ at, stores, accent = '#111', title }: { at: LatLng; stores: StoreCard[]; accent?: string; title?: string }) {
  const { t } = useI18n();
  const available = useMapsAvailable();
  const withPos = stores.filter((s) => s.lat != null && s.lng != null).slice(0, 40);
  const [picked, setPicked] = useState<string | null>(null);
  if (!available || !withPos.length) return null;
  const sel = withPos.find((s) => s.id === picked) ?? null;
  const pins: MapPin[] = [
    { id: 'you', at, kind: 'you' },
    ...withPos.map((s) => ({ id: s.id, at: { lat: s.lat!, lng: s.lng! }, kind: 'shop' as const, label: s.name, icon: storeLook(s).icon, color: accent, dim: !s.open })),
  ];
  return (
    <section className="grid gap-2" data-shops-map>
      {title && <h2 className="font-display text-xl font-extrabold">{title}</h2>}
      <LiveMap pins={pins} picked={picked} onPick={setPicked} label={title ?? t('lc.map.shops')} className="aspect-[16/9] w-full rounded-3xl sm:aspect-[21/9]" />
      {sel && (
        <Link to={`/s/${sel.slug ?? sel.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 hover:border-black" data-map-pick={sel.id}>
          <span className="min-w-0">
            <b className="block truncate">{sel.name}</b>
            <small className="text-ink-2">{[km(sel.distanceKm), sel.open ? t('lc.store.mins', { n: sel.etaMinutes }) : t('lc.store.closed')].join(' · ')}</small>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-extrabold">
            {t('lc.map.open')} <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      )}
    </section>
  );
}

/** One place (a shop, a lab) on a real map, with a link that opens directions in Google Maps. */
export function PlaceMap({ at, label, name, kind = 'shop', color }: { at: LatLng; label: string; name: string; kind?: MapPin['kind']; color?: string }) {
  const { t } = useI18n();
  const available = useMapsAvailable();
  if (!available) return null;
  return (
    <section className="grid gap-2" data-place-map>
      <LiveMap pins={[{ id: 'place', at, kind, label: name, color }]} picked="place" label={label} zoom={16} className="aspect-[16/9] w-full rounded-3xl" />
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${at.lat},${at.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 justify-self-start text-sm font-extrabold underline">
        <Navigation className="h-4 w-4" aria-hidden /> {t('lc.map.directions')}
      </a>
    </section>
  );
}
