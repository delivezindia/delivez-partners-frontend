import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from './auth-store';
import type { Address, AddressLabel, Me, Menu, StoreCard, Vertical } from './types';

/** Shops around a point (for useQueries over several points; useNearby is the one-point hook). */
export const nearbyQuery = (at: { lat: number; lng: number } | null, vertical: Vertical | null, q: string) => ({
  queryKey: ['nearby', at?.lat, at?.lng, vertical, q],
  queryFn: () => {
    const p = new URLSearchParams({ lat: String(at!.lat), lng: String(at!.lng) });
    if (vertical) p.set('vertical', vertical);
    if (q.trim().length >= 2) p.set('q', q.trim());
    return api<{ stores: StoreCard[]; verticals: Vertical[] }>(`/local/stores?${p}`);
  },
  enabled: !!at,
});

export function useNearby(at: { lat: number; lng: number } | null, vertical: Vertical | null, q: string) {
  return useQuery({ ...nearbyQuery(at, vertical, q), placeholderData: (prev) => prev });
}

/** What's live right now (public page): cities with running shops, shops per kind and what they sell. */
export interface Overview {
  cities: { id: string; name: string; state: string; lat: number; lng: number; shops: number }[];
  verticals: Record<Vertical, { shops: number; types: { name: string; shops: number }[] }>;
  shops: number;
  deliveryFee: number;
  doorCheckMinutes: number;
}
export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('/local/overview'), staleTime: 60_000 });
}
/** Offers running now (admin panel → Coupons, listed ones only). */
export interface PublicOffer {
  code: string;
  headline: string;
  description: string | null;
  kind: 'FLAT' | 'PERCENT' | 'FREE_DELIVERY';
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  vertical: Vertical | null;
  firstOrderOnly: boolean;
  endsAt: string;
  city: string | null;
  shop: string | null;
}
export function useOffers() {
  return useQuery({ queryKey: ['offers'], queryFn: () => api<PublicOffer[]>('/local/offers'), staleTime: 60_000 });
}
/** "Main city, Second city" — for copy like "Now in …". */
export const cityList = (o: Overview | undefined) => (o?.cities.length ? o.cities.map((c) => c.name).join(', ') : null);

/** One shop's menu; shared by the shop page and the pages that show dishes from several shops. */
export const menuQuery = (idOrSlug: string, at: { lat: number; lng: number } | null) => ({
  queryKey: ['menu', idOrSlug, at?.lat, at?.lng],
  queryFn: () => api<Menu>(`/local/stores/${encodeURIComponent(idOrSlug)}${at ? `?lat=${at.lat}&lng=${at.lng}` : ''}`),
});

export function useMenu(idOrSlug: string, at: { lat: number; lng: number } | null) {
  return useQuery(menuQuery(idOrSlug, at));
}

export function useMe() {
  const token = useAuth((s) => s.accessToken);
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/local/me'), enabled: !!token });
}

export function useAddresses() {
  const token = useAuth((s) => s.accessToken);
  return useQuery({ queryKey: ['addresses'], queryFn: () => api<Address[]>('/local/me/addresses'), enabled: !!token });
}

export interface AddressForm {
  label: AddressLabel;
  contactName?: string;
  contactPhone?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  pincode: string;
  cityName: string;
  state: string;
  lat: number;
  lng: number;
  placeId?: string;
  isDefault?: boolean;
}

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AddressForm }) => (id ? api<Address>(`/local/me/addresses/${id}`, { method: 'PUT', body }) : api<Address>('/local/me/addresses', { method: 'POST', body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Address[]>(`/local/me/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: (rows) => qc.setQueryData(['addresses'], rows),
  });
}
