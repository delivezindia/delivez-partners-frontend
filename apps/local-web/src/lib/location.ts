import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GeocodeResult } from '../components/MapPicker';
import { api } from './api';
import { useI18n } from './i18n';
import { ADDRESS_LABEL } from './labels';
import { useAddresses } from './queries';
import type { Address } from './types';

/** Where the customer wants things delivered. A saved address, or a pin picked before signing in. */
export interface DeliverTo {
  lat: number;
  lng: number;
  /** Short name for the header: "Home", "Indiranagar"… */
  title: string;
  /** One line under it: the street / area. */
  line: string;
  addressId?: string;
}

interface LocationState {
  at: DeliverTo | null;
  set: (at: DeliverTo) => void;
  clear: () => void;
}

export const useDeliverTo = create<LocationState>()(
  persist(
    (set) => ({
      at: null,
      set: (at) => set({ at }),
      clear: () => set({ at: null }),
    }),
    { name: 'dz-local-location', storage: createJSONStorage(() => localStorage) },
  ),
);

export const fromAddress = (a: Address, title: string): DeliverTo => ({
  lat: a.lat,
  lng: a.lng,
  title,
  line: [a.line1, a.landmark].filter(Boolean).join(', '),
  addressId: a.id,
});

/** Bengaluru: where the map opens when not even the live cities are known yet. */
export const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

/** Runs `locate` unless the customer has blocked location for this site (then the map just opens on the city). */
export function locateUnlessBlocked(locate: () => void) {
  void navigator.permissions?.query({ name: 'geolocation' }).then((p) => p.state !== 'denied' && locate(), () => {});
}

/**
 * Header text for a looked-up spot: the area as the title, the street under it. When the street is just the area again
 * (OpenStreetMap often has no road there), the first parts of the full address instead.
 */
export function placeLabel(r: GeocodeResult | null, fallback: string): Pick<DeliverTo, 'title' | 'line'> {
  const title = r?.area?.split(',').pop()?.trim() || r?.city || fallback;
  const line = r?.line1 && r.line1 !== title ? r.line1 : (r?.label?.split(',').slice(0, 3).join(',').trim() ?? '');
  return { title, line };
}

/** The address at a point: from Google in the browser when the key works, else from the API (OpenStreetMap). */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  // Loaded on first use, so the Maps loader stays out of every page's main bundle.
  const g = await import('./googleMaps').then((m) => m.googleReverse(lat, lng)).catch(() => null);
  if (g) return { ...g, lat, lng };
  return api<GeocodeResult | null>(`/geo/reverse?lat=${lat}&lng=${lng}`).catch(() => null);
}

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const k = 111_320;
  return Math.hypot((a.lat - b.lat) * k, (a.lng - b.lng) * k * Math.cos((a.lat * Math.PI) / 180));
};

/**
 * Signed in with a plain pin (or nothing): use the saved address at that spot (within 300 m),
 * or the default address when no place was chosen yet. Orders need a saved address.
 */
export function useAdoptSavedAddress() {
  const { t } = useI18n();
  const addresses = useAddresses();
  const { at, set } = useDeliverTo();
  useEffect(() => {
    const rows = addresses.data;
    if (!rows?.length || (at?.addressId && rows.some((a) => a.id === at.addressId))) return;
    const match = at ? rows.filter((a) => metres(a, at) <= 300).sort((x, y) => metres(x, at) - metres(y, at))[0] : rows.find((a) => a.isDefault) ?? rows[0];
    if (match) set(fromAddress(match, t(ADDRESS_LABEL[match.label])));
    else if (at?.addressId) set({ ...at, addressId: undefined });
  }, [addresses.data, at, set, t]);
}
