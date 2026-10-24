// Admin view of orders (Delivez team). Mirrors GET /v1/admin/orders and /v1/admin/orders/:id.

export type OrderStatus =
  | 'AWAITING_RX_REVIEW' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_SOON' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'ARRIVED'
  | 'DELIVERED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DELIVERY_FAILED' | 'REFUNDED';

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfilmentType: 'DELIVERY' | 'PICKUP';
  grandTotal: number;
  paymentMode: string;
  isTestOrder: boolean;
  placedAt: string;
  store: { id: string; name: string; city: string | null };
  task: { id: string; status: string } | null;
}

export interface AdminOrderList {
  items: AdminOrderRow[];
  counts: { active: number; today: number; missedToday: number };
  nextBefore: string | null;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: string;
  fulfilmentType: 'DELIVERY' | 'PICKUP';
  isTestOrder: boolean;
  customer: { name: string; phone: string };
  deliveryArea: string | null;
  note: string | null;
  items: { id: string; name: string; variant: string | null; qty: number; lineTotal: number; unavailable: boolean }[];
  totals: { items: number; delivery: number; packaging: number; discount: number; grandTotal: number };
  payment: { mode: string; status: string };
  times: Record<string, string | null>;
  rejectReason: string | null;
  cancelReason: string | null;
  rider: { taskStatus: string; name: string | null; phone: string | null } | null;
  timeline: { from: OrderStatus | null; to: OrderStatus; actorType: string; reason: string | null; at: string }[];
  store: { id: string; name: string };
  task: { id: string; status: string } | null;
  /** Development only: lets the team play rider / customer. */
  codes?: { handoverOtp: string | null; handoverQr: string | null; pickupOtp: string | null; deliveryOtp: string | null };
}

export const ACTIVE: OrderStatus[] = ['AWAITING_RX_REVIEW', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY_SOON', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'];

export const STATUS_LABEL: Record<OrderStatus, { label: string; cls: string }> = {
  AWAITING_RX_REVIEW: { label: 'Prescription check', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
  PLACED: { label: 'New', cls: 'border-dz-red bg-dz-red-soft text-dz-red' },
  ACCEPTED: { label: 'Accepted', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
  PREPARING: { label: 'Preparing', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink' },
  READY_SOON: { label: 'Ready soon', cls: 'border-amber-500 bg-amber-50 text-amber-800' },
  READY: { label: 'Ready', cls: 'border-dz-green bg-dz-green-soft text-dz-green' },
  PICKED_UP: { label: 'Picked up', cls: 'border-line bg-soft text-ink-2' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', cls: 'border-line bg-soft text-ink-2' },
  ARRIVED: { label: 'At customer', cls: 'border-line bg-soft text-ink-2' },
  DELIVERED: { label: 'Delivered', cls: 'border-line bg-soft text-ink-2' },
  COMPLETED: { label: 'Collected', cls: 'border-line bg-soft text-ink-2' },
  REJECTED: { label: 'Rejected', cls: 'border-line bg-soft text-ink-3' },
  CANCELLED: { label: 'Cancelled', cls: 'border-line bg-soft text-ink-3' },
  DELIVERY_FAILED: { label: 'Delivery failed', cls: 'border-dz-red bg-soft text-dz-red' },
  REFUNDED: { label: 'Refunded', cls: 'border-line bg-soft text-ink-3' },
};

/** Filter chips → API status value ('' = all). */
export const FILTERS: { value: string; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: '', label: 'All' },
  { value: 'AWAITING_RX_REVIEW', label: 'Prescription check' },
  { value: 'PLACED', label: 'New' },
  { value: 'READY', label: 'Ready' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Collected' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** Rider steps an admin can play, keyed by the delivery task's current status (mirrors the API rules). */
export const RIDER_NEXT: Record<string, { status: string; label: string }[]> = {
  ASSIGNED: [{ status: 'EN_ROUTE_TO_PICKUP', label: 'On the way to store' }, { status: 'ARRIVED_AT_PICKUP', label: 'Arrived at store' }],
  EN_ROUTE_TO_PICKUP: [{ status: 'ARRIVED_AT_PICKUP', label: 'Arrived at store' }],
  ARRIVED_AT_PICKUP: [{ status: 'PICKED_UP', label: 'Picked up' }],
  WAITING_AT_PICKUP: [{ status: 'PICKED_UP', label: 'Picked up' }],
  PICKED_UP: [{ status: 'EN_ROUTE_TO_DROP', label: 'On the way to customer' }, { status: 'FAILED', label: 'Delivery failed' }],
  EN_ROUTE_TO_DROP: [{ status: 'ARRIVED_AT_DROP', label: 'At customer' }, { status: 'DELIVERED', label: 'Delivered' }, { status: 'FAILED', label: 'Delivery failed' }],
  ARRIVED_AT_DROP: [{ status: 'DELIVERED', label: 'Delivered' }, { status: 'FAILED', label: 'Delivery failed' }],
};

export const rupees = (p: number) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const istTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');
