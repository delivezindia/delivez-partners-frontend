import { useQuery } from '@tanstack/react-query';
import { api, newIdempotencyKey } from './api';
import type { CartLine } from './cart';
import type { MsgKey } from './i18n';
import type { Vertical } from './types';

export type Fulfilment = 'DELIVERY' | 'PICKUP';
export type Blocker = 'STORE_CLOSED' | 'DELIVERY_NOT_OFFERED' | 'PICKUP_NOT_OFFERED' | 'ADDRESS_REQUIRED' | 'OUT_OF_RANGE' | 'BELOW_MINIMUM' | 'LAB_BOOKING' | 'RX_REQUIRED' | 'ITEMS';
export type Problem = { productId: string; code: 'GONE' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'FEW_LEFT' | 'OPTIONS_CHANGED'; name: string; left?: number };

export interface Quote {
  store: { id: string; name: string; slug: string | null; vertical: Vertical; supportsDelivery: boolean; supportsPickup: boolean; minOrderAmount: number; open: boolean; address: string | null };
  lines: { productId: string; variantId: string | null; addonIds: string[]; name: string; qty: number; unitPrice: number; lineTotal: number; isRx: boolean }[];
  problems: Problem[];
  distanceKm: number | null;
  totals: Totals;
  blockers: Blocker[];
  canPlace: boolean;
}

export interface Totals {
  items: number;
  delivery: number;
  packaging: number;
  discount: number;
  grandTotal: number;
}

export type OrderStatus = 'AWAITING_RX_REVIEW' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_SOON' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'ARRIVED' | 'DELIVERED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DELIVERY_FAILED' | 'REFUNDED';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  active: boolean;
  fulfilmentType: Fulfilment;
  store: { id: string; name: string; slug: string | null; vertical: Vertical; address: string | null; phone: string | null };
  address: string | null;
  items: { id: string; productId: string; name: string; variant: string | null; addons: { name: string; price: number }[]; qty: number; unitPrice: number; lineTotal: number; unavailable: boolean; returnedQty: number }[];
  totals: Totals;
  payment: { mode: string; status: string };
  codes: { delivery: string | null; pickup: string | null } | null;
  etaAt: string | null;
  placedAt: string;
  deliveredAt: string | null;
  canCancel: boolean;
  cancelReason: string | null;
  note: string | null;
  rider: { name: string | null; phone: string; status: string } | null;
  timeline?: { status: OrderStatus; at: string }[];
}

export const toItems = (lines: CartLine[]) => lines.map((l) => ({ productId: l.productId, qty: l.qty, variantId: l.variantId ?? undefined, addonIds: l.addonIds.length ? l.addonIds : undefined }));

export function useQuote(input: { storeId: string | null; fulfilmentType: Fulfilment; addressId?: string; lines: CartLine[] }, enabled: boolean) {
  const items = toItems(input.lines);
  return useQuery({
    queryKey: ['quote', input.storeId, input.fulfilmentType, input.addressId, items],
    queryFn: () => api<Quote>('/local/cart/quote', { method: 'POST', body: { storeId: input.storeId, fulfilmentType: input.fulfilmentType, addressId: input.addressId, items }, idempotencyKey: newIdempotencyKey() }),
    enabled: enabled && !!input.storeId && items.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}

/** Live while the order is moving; the shop's actions show up within a few seconds. */
export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api<CustomerOrder>(`/local/orders/${encodeURIComponent(id)}`),
    refetchInterval: (q) => (q.state.data && !q.state.data.active ? false : 8_000),
  });
}

export function useOrders() {
  return useQuery({ queryKey: ['orders'], queryFn: () => api<{ orders: CustomerOrder[]; nextCursor: string | null }>('/local/orders') });
}

/** The customer's view of each state. */
export const STATUS_LABEL: Record<OrderStatus, MsgKey> = {
  AWAITING_RX_REVIEW: 'lc.os.AWAITING_RX_REVIEW',
  PLACED: 'lc.os.PLACED',
  ACCEPTED: 'lc.os.ACCEPTED',
  PREPARING: 'lc.os.PREPARING',
  READY_SOON: 'lc.os.PREPARING',
  READY: 'lc.os.READY',
  PICKED_UP: 'lc.os.PICKED_UP',
  OUT_FOR_DELIVERY: 'lc.os.PICKED_UP',
  ARRIVED: 'lc.os.ARRIVED',
  DELIVERED: 'lc.os.DELIVERED',
  COMPLETED: 'lc.os.COMPLETED',
  REJECTED: 'lc.os.REJECTED',
  CANCELLED: 'lc.os.CANCELLED',
  DELIVERY_FAILED: 'lc.os.DELIVERY_FAILED',
  REFUNDED: 'lc.os.REFUNDED',
};

/** Progress steps shown on the tracking screen. */
export function steps(f: Fulfilment): { key: MsgKey; states: OrderStatus[] }[] {
  return f === 'DELIVERY'
    ? [
        { key: 'lc.step.placed', states: ['AWAITING_RX_REVIEW', 'PLACED'] },
        { key: 'lc.step.preparing', states: ['ACCEPTED', 'PREPARING', 'READY_SOON', 'READY'] },
        { key: 'lc.step.onTheWay', states: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'] },
        { key: 'lc.step.delivered', states: ['DELIVERED', 'COMPLETED'] },
      ]
    : [
        { key: 'lc.step.placed', states: ['AWAITING_RX_REVIEW', 'PLACED'] },
        { key: 'lc.step.preparing', states: ['ACCEPTED', 'PREPARING', 'READY_SOON'] },
        { key: 'lc.step.ready', states: ['READY'] },
        { key: 'lc.step.collected', states: ['PICKED_UP', 'DELIVERED', 'COMPLETED'] },
      ];
}
