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

export type ReturnReason = 'DAMAGED' | 'WRONG_ITEM' | 'EXPIRED' | 'POOR_QUALITY' | 'MISSING' | 'UNDELIVERED';
export const RETURN_REASON_LABEL: Record<ReturnReason, string> = { DAMAGED: 'Damaged', WRONG_ITEM: 'Wrong item', EXPIRED: 'Expired', POOR_QUALITY: 'Poor quality', MISSING: 'Missing (not delivered)', UNDELIVERED: 'Delivery failed — coming back' };

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
  items: { id: string; name: string; variant: string | null; qty: number; unitPrice: number; lineTotal: number; unavailable: boolean; returnedQty: number }[];
  returnWindow: { endsAt: string; closedAt: string | null; outcome: 'NO_RETURN' | 'RETURNED' | 'EXPIRED' | null; open: boolean } | null;
  returns: { id: string; itemId: string; name: string; qty: number; amount: number; reason: ReturnReason; status: 'WITH_RIDER' | 'RECEIVED' | 'NOT_APPLICABLE'; refundMethod: 'ONLINE' | 'CASH_AT_DOOR'; restocked: boolean | null }[];
  totals: { items: number; delivery: number; packaging: number; discount: number; grandTotal: number };
  payment: { mode: string; status: string };
  times: Record<string, string | null>;
  rejectReason: string | null;
  cancelReason: string | null;
  /** Order SLA outcome (sla.ts on the API). */
  cancellation: { code: string; text: string; fault: Fault | null; stage: string | null; storeCompensation: number; customerDue: number; refunded: number } | null;
  rider: { taskStatus: string; name: string | null; phone: string | null } | null;
  timeline: { from: OrderStatus | null; to: OrderStatus; actorType: string; reason: string | null; at: string }[];
  store: { id: string; name: string };
  task: { id: string; status: string } | null;
  /** Development only: lets the team play rider / customer. */
  codes?: { handoverOtp: string | null; handoverQr: string | null; pickupOtp: string | null; deliveryOtp: string | null };
}

export type Fault = 'CUSTOMER' | 'STORE' | 'PLATFORM' | 'RIDER' | 'NO_FAULT';

export const FAULT_LABEL: Record<Fault, string> = { CUSTOMER: 'Customer', STORE: 'Store', PLATFORM: 'Delivez', RIDER: 'Rider', NO_FAULT: 'No one (force majeure)' };

/** Ops cancel reasons — the code decides refund, store compensation and whose record it goes on. */
export const OPS_CANCEL: { code: string; label: string; outcome: string }[] = [
  { code: 'OPS_STORE_CANNOT_FULFIL', label: 'Store cannot complete it', outcome: 'Store’s fault · customer refunded in full · counts on store health' },
  { code: 'OPS_NO_RIDER', label: 'No rider available', outcome: 'Delivez’s fault · customer refunded · store paid for cooked food' },
  { code: 'OPS_PLATFORM_ISSUE', label: 'Delivez technical / ops issue', outcome: 'Delivez’s fault · customer refunded · store paid for cooked food' },
  { code: 'OPS_CUSTOMER_REQUEST', label: 'Customer asked to cancel', outcome: 'Customer’s choice · cooked food not refunded, other orders free' },
  { code: 'OPS_DUPLICATE_ORDER', label: 'Duplicate order', outcome: 'No one’s fault · customer refunded · store paid for cooked food' },
  { code: 'OPS_FORCE_MAJEURE', label: 'Weather, strike or emergency', outcome: 'No one’s fault · customer refunded · store paid for cooked food' },
];

/** Why a delivery failed after pickup. */
export const FAIL_REASONS: { code: string; label: string; outcome: string }[] = [
  { code: 'FAIL_CUSTOMER_UNAVAILABLE', label: 'Customer not reachable', outcome: 'Customer’s fault · food not refunded, goods back to the store minus delivery fee' },
  { code: 'FAIL_CUSTOMER_REFUSED', label: 'Customer refused it', outcome: 'Customer’s fault · same as above' },
  { code: 'FAIL_WRONG_ADDRESS', label: 'Wrong / incomplete address', outcome: 'Customer’s fault · same as above' },
  { code: 'FAIL_RIDER_ISSUE', label: 'Rider could not finish (accident, vehicle)', outcome: 'Rider’s fault · customer refunded · store paid for food' },
  { code: 'FAIL_DAMAGED_IN_TRANSIT', label: 'Damaged on the way', outcome: 'Rider’s fault · customer refunded · store paid for food' },
  { code: 'FAIL_FORCE_MAJEURE', label: 'Weather, strike or emergency', outcome: 'No one’s fault · customer refunded · store paid for food' },
];

/** States ops can still cancel from; after pickup it is "Delivery failed" instead. */
export const CANCELLABLE: OrderStatus[] = ['AWAITING_RX_REVIEW', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY_SOON', 'READY'];

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
