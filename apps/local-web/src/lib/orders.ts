import type { CheckoutParams } from './razorpay';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, newIdempotencyKey } from './api';
import type { CartLine } from './cart';
import type { MsgKey } from './i18n';
import type { Vertical } from './types';
import { useLiveRoom } from './live';

export type Blocker = 'STORE_CLOSED' | 'DELIVERY_NOT_OFFERED' | 'ADDRESS_REQUIRED' | 'OUT_OF_RANGE' | 'BELOW_MINIMUM' | 'LAB_BOOKING' | 'RX_REQUIRED' | 'NO_PHARMACIST' | 'ITEMS';
export type Problem = {
  productId: string;
  code: 'GONE' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'FEW_LEFT' | 'OPTIONS_CHANGED';
  name: string;
  left?: number;
};

export interface Quote {
  store: {
    id: string;
    name: string;
    slug: string | null;
    vertical: Vertical;
    supportsDelivery: boolean;
    minOrderAmount: number;
    open: boolean;
    address: string | null;
  };
  lines: {
    productId: string;
    variantId: string | null;
    addonIds: string[];
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    isRx: boolean;
  }[];
  problems: Problem[];
  /** Medicines in the basket that need the doctor's prescription. */
  rxItems: string[];
  distanceKm: number | null;
  totals: Totals;
  /** The applied coupon (null when none, or when the code doesn't fit — see couponError). */
  coupon: { code: string; headline: string; description: string | null; saved: number; itemsOff: number; deliveryOff: number } | null;
  couponError: { problem: CouponProblem; message: string; short?: number } | null;
  /** Listed offers for this shop: ok = usable now, otherwise short = paise still to add. */
  offers: Offer[];
  blockers: Blocker[];
  canPlace: boolean;
}

export type CouponKind = 'FLAT' | 'PERCENT' | 'FREE_DELIVERY';
export type CouponProblem = 'NOT_FOUND' | 'PAUSED' | 'NOT_STARTED' | 'EXPIRED' | 'USED_UP' | 'ALREADY_USED' | 'FIRST_ORDER_ONLY' | 'OTHER_SHOP' | 'OTHER_CITY' | 'OTHER_KIND' | 'BELOW_MINIMUM' | 'NOTHING_OFF';
export interface Offer {
  code: string;
  headline: string;
  description: string | null;
  kind: CouponKind;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  firstOrderOnly: boolean;
  endsAt: string;
  ok?: boolean;
  saved?: number;
  short?: number;
}

/** App orders are paid online — no cash on delivery. */
export const PAY_METHODS = ['UPI', 'CARD', 'NETBANKING'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const PAY_LABEL: Record<string, MsgKey> = { UPI: 'lc.pm.UPI', CARD: 'lc.pm.CARD', NETBANKING: 'lc.pm.NETBANKING', COD: 'lc.pm.COD' };

export interface Totals {
  items: number;
  delivery: number;
  packaging: number;
  discount: number;
  grandTotal: number;
}

export type OrderStatus =
  | 'DRAFT'
  | 'AWAITING_RX_REVIEW'
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_SOON'
  | 'READY'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DELIVERY_FAILED'
  | 'REFUNDED';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  active: boolean;
  fulfilmentType: 'DELIVERY' | 'PICKUP';
  store: {
    id: string;
    name: string;
    slug: string | null;
    vertical: Vertical;
    address: string | null;
    phone: string | null;
  };
  address: string | null;
  items: {
    id: string;
    productId: string;
    name: string;
    variant: string | null;
    addons: { name: string; price: number }[];
    qty: number;
    unitPrice: number;
    lineTotal: number;
    unavailable: boolean;
    returnedQty: number;
  }[];
  totals: Totals;
  coupon: { code: string; saved: number; freeDelivery: boolean } | null;
  payment: { mode: string; status: string };
  codes: { delivery: string | null } | null;
  etaAt: string | null;
  placedAt: string;
  deliveredAt: string | null;
  canCancel: boolean;
  /** Placed but not paid yet (Razorpay) — the shop hasn't seen it. */
  awaitingPayment?: boolean;
  /** Returned once, when an order is placed: open Razorpay Checkout with this. */
  checkout?: CheckoutParams;
  cancelReason: string | null;
  /** Order SLA outcome: why (code), whose fault, and the money back. */
  cancellation: {
    code: string;
    fault: 'CUSTOMER' | 'STORE' | 'PLATFORM' | 'RIDER' | 'NO_FAULT' | null;
    refunded: number;
    unpaid: number;
  } | null;
  note: string | null;
  rider: { name: string | null; phone: string; status: string } | null;
  timeline?: { status: OrderStatus; at: string }[];
  rx: { status: string; rejectionReason: string | null } | null;
  substitutions: Substitution[];
  returnWindow: { state: 'NONE' | 'OPEN' | 'CLOSED'; endsAt: string; outcome: string | null } | null;
  returns: { id: string; name: string; qty: number; amount: number; reason: ReturnReason; status: string }[];
  review: { rating: number; comment: string | null; tags: string[]; reply: string | null; createdAt: string } | null;
  canRate: boolean;
}

/** A replacement the shop offered for an item that ran out. */
export interface Substitution {
  id: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  forItem: string;
  forQty: number;
  forTotal: number;
  name: string;
  variant: string | null;
  qty: number;
  lineTotal: number;
  note: string | null;
  respondBy: string;
}

export const RETURN_REASONS = ['DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'POOR_QUALITY', 'MISSING'] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];
export const REVIEW_TAGS = ['ON_TIME', 'LATE', 'GOOD_PACKING', 'POOR_PACKING', 'FRESH', 'WRONG_ITEM', 'FRIENDLY', 'COLD_FOOD'] as const;

export const toItems = (lines: CartLine[]) =>
  lines.map((l) => ({
    productId: l.productId,
    qty: l.qty,
    variantId: l.variantId ?? undefined,
    addonIds: l.addonIds.length ? l.addonIds : undefined,
  }));

/** Home delivery only — customers don't collect from the shop. */
export function useQuote(input: { storeId: string | null; addressId?: string; lines: CartLine[]; rxKeys?: string[]; couponCode?: string }, enabled: boolean) {
  const items = toItems(input.lines);
  const rx = input.rxKeys?.length ? input.rxKeys : undefined;
  return useQuery({
    queryKey: ['quote', input.storeId, input.addressId, items, rx, input.couponCode],
    queryFn: () =>
      api<Quote>('/local/cart/quote', {
        method: 'POST',
        body: {
          storeId: input.storeId,
          fulfilmentType: 'DELIVERY',
          addressId: input.addressId,
          items,
          prescriptionFileKeys: rx,
          couponCode: input.couponCode,
        },
        idempotencyKey: newIdempotencyKey(),
      }),
    enabled: enabled && !!input.storeId && items.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}

/** Live while the order is moving: socket pushes refetch it at once; slow polling is the safety net. */
export function useOrder(id: string) {
  // Read by refetchInterval, so it is set before the query runs (the socket state comes after).
  const live = useRef(false);
  const q = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<CustomerOrder>(`/local/orders/${encodeURIComponent(id)}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && !q.state.data.active ? false : live.current ? 60_000 : 8_000),
  });
  const orderId = q.data?.active ? q.data.id : null;
  live.current = useLiveRoom(orderId && `order:${orderId}`, ['order', id]);
  return q;
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api<{ orders: CustomerOrder[]; nextCursor: string | null }>('/local/orders'),
  });
}

/** Why an order ended, in the customer's words (one per SLA code). */
export const CANCEL_REASON: Record<string, MsgKey> = {
  CUSTOMER_CANCELLED: 'lc.cx.CUSTOMER_CANCELLED',
  STORE_ITEMS_UNAVAILABLE: 'lc.cx.STORE_ITEMS_UNAVAILABLE',
  STORE_TOO_BUSY: 'lc.cx.STORE_TOO_BUSY',
  STORE_CLOSING: 'lc.cx.STORE_CLOSING',
  STORE_KITCHEN_ISSUE: 'lc.cx.STORE_KITCHEN_ISSUE',
  STORE_OTHER: 'lc.cx.STORE_OTHER',
  ACCEPT_TIMEOUT: 'lc.cx.ACCEPT_TIMEOUT',
  RX_TIMEOUT: 'lc.cx.RX_TIMEOUT',
  RX_REJECTED: 'lc.cx.RX_REJECTED',
  OPS_STORE_CANNOT_FULFIL: 'lc.cx.OPS_STORE_CANNOT_FULFIL',
  OPS_NO_RIDER: 'lc.cx.OPS_NO_RIDER',
  OPS_PLATFORM_ISSUE: 'lc.cx.OPS_PLATFORM_ISSUE',
  OPS_CUSTOMER_REQUEST: 'lc.cx.OPS_CUSTOMER_REQUEST',
  OPS_DUPLICATE_ORDER: 'lc.cx.OPS_DUPLICATE_ORDER',
  OPS_FORCE_MAJEURE: 'lc.cx.OPS_FORCE_MAJEURE',
  FAIL_CUSTOMER_UNAVAILABLE: 'lc.cx.FAIL_CUSTOMER_UNAVAILABLE',
  FAIL_CUSTOMER_REFUSED: 'lc.cx.FAIL_CUSTOMER_REFUSED',
  FAIL_WRONG_ADDRESS: 'lc.cx.FAIL_WRONG_ADDRESS',
  FAIL_RIDER_ISSUE: 'lc.cx.FAIL_RIDER_ISSUE',
  FAIL_DAMAGED_IN_TRANSIT: 'lc.cx.FAIL_DAMAGED_IN_TRANSIT',
  FAIL_FORCE_MAJEURE: 'lc.cx.FAIL_FORCE_MAJEURE',
};

/** The customer's view of each state. */
export const STATUS_LABEL: Record<OrderStatus, MsgKey> = {
  DRAFT: 'lc.os.DRAFT',
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
export const STEPS: { key: MsgKey; states: OrderStatus[] }[] = [
  { key: 'lc.step.placed', states: ['DRAFT', 'AWAITING_RX_REVIEW', 'PLACED'] },
  {
    key: 'lc.step.preparing',
    states: ['ACCEPTED', 'PREPARING', 'READY_SOON', 'READY'],
  },
  {
    key: 'lc.step.onTheWay',
    states: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'],
  },
  { key: 'lc.step.delivered', states: ['DELIVERED', 'COMPLETED'] },
];
