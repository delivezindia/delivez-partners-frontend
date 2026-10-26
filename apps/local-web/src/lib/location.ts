import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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

/** Bengaluru — where the map opens before we know anything about the customer. */
export const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

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
