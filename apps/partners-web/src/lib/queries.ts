import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { MeResponse, StoreDetail } from './types';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<MeResponse>('/partners/me') });

export const useStore = (storeId: string | undefined) =>
  useQuery({
    queryKey: ['store', storeId],
    queryFn: () => api<StoreDetail>(`/partners/stores/${storeId}`),
    enabled: !!storeId,
  });
