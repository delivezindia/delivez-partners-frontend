import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from './auth-store';
import type { Address, AddressLabel, Me, Menu, StoreCard, Vertical } from './types';

export function useNearby(at: { lat: number; lng: number } | null, vertical: Vertical | null, q: string) {
  return useQuery({
    queryKey: ['nearby', at?.lat, at?.lng, vertical, q],
    queryFn: () => {
      const p = new URLSearchParams({ lat: String(at!.lat), lng: String(at!.lng) });
      if (vertical) p.set('vertical', vertical);
      if (q.trim().length >= 2) p.set('q', q.trim());
      return api<{ stores: StoreCard[]; verticals: Vertical[] }>(`/local/stores?${p}`);
    },
    enabled: !!at,
    placeholderData: (prev) => prev,
  });
}

export function useMenu(idOrSlug: string, at: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: ['menu', idOrSlug, at?.lat, at?.lng],
    queryFn: () => api<Menu>(`/local/stores/${encodeURIComponent(idOrSlug)}${at ? `?lat=${at.lat}&lng=${at.lng}` : ''}`),
  });
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
