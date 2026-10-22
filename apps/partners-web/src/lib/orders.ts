import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, newIdempotencyKey } from './api';

export type OrderStatus =
  | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_SOON' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'ARRIVED'
  | 'DELIVERED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DELIVERY_FAILED' | 'REFUNDED';
export type OrderTab = 'NEW' | 'PREPARING' | 'READY' | 'DONE' | 'CANCELLED' | 'ALL';
export type TaskStatus = 'CREATED' | 'SEARCHING_RIDER' | 'ASSIGNED' | 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_AT_PICKUP' | 'WAITING_AT_PICKUP' | 'PICKED_UP' | 'EN_ROUTE_TO_DROP' | 'ARRIVED_AT_DROP' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: string;
  fulfilmentType: 'DELIVERY' | 'PICKUP';
  isTestOrder: boolean;
  customer: { name: string; phone: string };
  deliveryArea: string | null;
  distanceKm: number | null;
  note: string | null;
  items: { id: string; name: string; variant: string | null; addons: { name: string; price: number }[]; qty: number; unitPrice: number; lineTotal: number; isRx: boolean; unavailable: boolean }[];
  totals: { items: number; delivery: number; packaging: number; discount: number; grandTotal: number };
  payment: { mode: string; status: string; collectCash: number };
  prepMinutes: number | null;
  readySoonWindowMin: number | null;
  etaAt: string | null;
  acceptBy: string | null;
  times: Record<'placedAt' | 'acceptedAt' | 'preparingAt' | 'readySoonAt' | 'readyAt' | 'pickedUpAt' | 'deliveredAt' | 'completedAt' | 'cancelledAt', string | null>;
  rejectReason: string | null;
  cancelReason: string | null;
  rider: { taskStatus: TaskStatus; name: string | null; phone: string | null; assignedAt: string | null; arrivedAt: string | null; waitingSince: string | null; readyAtEstimate: string | null } | null;
  timeline?: { from: OrderStatus | null; to: OrderStatus; actorType: string; reason: string | null; meta: Record<string, unknown> | null; at: string }[];
}

export const TABS: { key: OrderTab; label: string }[] = [
  { key: 'NEW', label: 'New' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'DONE', label: 'Picked up' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'ALL', label: 'All' },
];

/** State colours (plan §16.1). */
export const STATUS: Record<OrderStatus, { label: string; cls: string; bar: string }> = {
  PLACED: { label: 'New', cls: 'border-dz-red bg-dz-red-soft text-dz-red', bar: 'bg-dz-red' },
  ACCEPTED: { label: 'Accepted', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue', bar: 'bg-dz-blue' },
  PREPARING: { label: 'Preparing', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink', bar: 'bg-dz-yellow-strong' },
  READY_SOON: { label: 'Ready soon', cls: 'border-amber-500 bg-amber-50 text-amber-800', bar: 'bg-amber-500' },
  READY: { label: 'Ready', cls: 'border-dz-green bg-dz-green-soft text-dz-green', bar: 'bg-dz-green' },
  PICKED_UP: { label: 'Picked up', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400' },
  ARRIVED: { label: 'At customer', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400' },
  DELIVERED: { label: 'Delivered', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400' },
  COMPLETED: { label: 'Collected', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400' },
  REJECTED: { label: 'Rejected', cls: 'border-line bg-soft text-ink-3', bar: 'bg-neutral-300' },
  CANCELLED: { label: 'Cancelled', cls: 'border-line bg-soft text-ink-3', bar: 'bg-neutral-300' },
  DELIVERY_FAILED: { label: 'Delivery failed', cls: 'border-dz-red bg-soft text-dz-red', bar: 'bg-neutral-300' },
  REFUNDED: { label: 'Refunded', cls: 'border-line bg-soft text-ink-3', bar: 'bg-neutral-300' },
};

export const RIDER: Record<TaskStatus, string> = {
  CREATED: 'Finding a rider',
  SEARCHING_RIDER: 'Finding a rider',
  ASSIGNED: 'Rider assigned',
  EN_ROUTE_TO_PICKUP: 'Rider on the way',
  ARRIVED_AT_PICKUP: 'Rider has arrived',
  WAITING_AT_PICKUP: 'Rider is waiting',
  PICKED_UP: 'Picked up',
  EN_ROUTE_TO_DROP: 'On the way to customer',
  ARRIVED_AT_DROP: 'At the customer',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery failed',
  CANCELLED: 'Cancelled',
};

export const REJECT_REASONS = [
  { value: 'ITEMS_UNAVAILABLE', label: 'Items unavailable' },
  { value: 'TOO_BUSY', label: 'Too busy right now' },
  { value: 'STORE_CLOSING', label: 'Store closing' },
  { value: 'KITCHEN_ISSUE', label: 'Kitchen / equipment issue' },
  { value: 'OTHER', label: 'Other' },
] as const;

type OrdersPage = { orders: Order[]; counts: Record<'NEW' | 'PREPARING' | 'READY', number>; nextCursor: string | null };

// Sockets keep the screen live; the 15 s poll is the fallback when the socket drops.
export const useOrders = (storeId: string, tab: OrderTab) =>
  useQuery({ queryKey: ['orders', storeId, tab], queryFn: () => api<OrdersPage>(`/partners/stores/${storeId}/orders?tab=${tab}`), refetchInterval: 15_000 });

/** The New tab is watched on every tab: it drives the sound and the badge. */
export const useNewOrders = (storeId: string) => useOrders(storeId, 'NEW');

export const useOrder = (storeId: string, idOrNumber: string | null) =>
  useQuery({ queryKey: ['order', storeId, idOrNumber], queryFn: () => api<Order>(`/partners/stores/${storeId}/orders/${idOrNumber}`), enabled: !!idOrNumber });

// --------------------------------------------------------------------
// Actions + offline queue
// --------------------------------------------------------------------

interface QueuedAction {
  key: string;
  storeId: string;
  orderId: string;
  path: string;
  body: unknown;
  label: string;
  at: number;
}

const DB = 'dz-partners';
const STORE = 'order-actions';
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
const queue = {
  all: () => tx<QueuedAction[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedAction[]>).catch(() => [] as QueuedAction[]),
  put: (a: QueuedAction) => tx('readwrite', (s) => s.put(a)),
  del: (key: string) => tx('readwrite', (s) => s.delete(key)).catch(() => undefined),
};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export class QueuedOffline extends Error {
  constructor() {
    super('No internet — saved, will send when you are back online');
  }
}

/**
 * POST an order action with a fresh Idempotency-Key. If the network is down the action is kept
 * in IndexedDB and replayed later with the same key, so it can never run twice.
 */
export async function orderAction(storeId: string, orderId: string, action: string, body: unknown = {}, label = action) {
  const key = newIdempotencyKey();
  const path = `/partners/stores/${storeId}/orders/${orderId}/${action}`;
  try {
    return await api<Order>(path, { method: 'POST', body, idempotencyKey: key });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    await queue.put({ key, storeId, orderId, path, body, label, at: Date.now() }).catch(() => undefined);
    notify();
    throw new QueuedOffline();
  }
}

let flushing = false;
/** Replays queued actions in order. Server-side rejections (e.g. the order was cancelled meanwhile) are dropped. */
export async function flushQueue(): Promise<{ sent: number; dropped: { label: string; message: string }[] }> {
  if (flushing) return { sent: 0, dropped: [] };
  flushing = true;
  const res = { sent: 0, dropped: [] as { label: string; message: string }[] };
  try {
    for (const a of (await queue.all()).sort((x, y) => x.at - y.at)) {
      try {
        await api(a.path, { method: 'POST', body: a.body, idempotencyKey: a.key });
        res.sent++;
      } catch (e) {
        if (!(e instanceof ApiError)) break; // still offline
        res.dropped.push({ label: a.label, message: e.message });
      }
      await queue.del(a.key);
    }
  } finally {
    flushing = false;
    notify();
  }
  return res;
}

/** Pending offline actions for this store, kept in sync with the queue. */
export function usePendingSync(storeId: string) {
  const [pending, setPending] = useState<QueuedAction[]>([]);
  const qc = useQueryClient();
  useEffect(() => {
    let live = true;
    const load = () => void queue.all().then((all) => live && setPending(all.filter((a) => a.storeId === storeId)));
    const online = () =>
      void flushQueue().then((r) => {
        if (r.sent || r.dropped.length) void qc.invalidateQueries({ queryKey: ['orders', storeId] });
      });
    listeners.add(load);
    load();
    online();
    window.addEventListener('online', online);
    const t = setInterval(online, 20_000);
    return () => {
      live = false;
      listeners.delete(load);
      window.removeEventListener('online', online);
      clearInterval(t);
    };
  }, [storeId, qc]);
  return pending;
}

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

export const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');
export const mmss = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, '0')}`;

/** Re-renders every second while mounted; returns now (ms). */
export function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

// --------------------------------------------------------------------
// New-order alarm: a two-tone beep every 2.5 s until acknowledged.
// Browsers only allow sound after the user has interacted with the page once.
// --------------------------------------------------------------------

let ctx: AudioContext | null = null;
export const soundReady = () => ctx?.state === 'running';
export async function enableSound() {
  ctx ??= new AudioContext();
  await ctx.resume();
  beep();
  return soundReady();
}
function beep() {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  for (const [i, f] of [880, 1175].entries()) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.type = 'square';
    g.gain.setValueAtTime(0.0001, t + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.15, t + i * 0.18 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16);
    o.connect(g).connect(ctx.destination);
    o.start(t + i * 0.18);
    o.stop(t + i * 0.18 + 0.17);
  }
}
/** One alert (e.g. a new order while on another screen). */
export const ring = () => beep();

export function useAlarm(ringing: boolean) {
  useEffect(() => {
    if (!ringing) return;
    beep();
    const t = setInterval(beep, 2500);
    return () => clearInterval(t);
  }, [ringing]);
}

/** 58 mm kitchen order ticket, printed through the browser's print dialog. */
export function printKot(o: Order, storeName: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const rows = o.items
    .filter((i) => !i.unavailable)
    .map((i) => `<tr><td class="q">${i.qty}×</td><td>${esc(i.name)}${i.variant ? ` <i>(${esc(i.variant)})</i>` : ''}${i.addons.map((a) => `<div class="a">+ ${esc(a.name)}</div>`).join('')}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>KOT ${esc(o.orderNumber)}</title><style>
    @page { size: 58mm auto; margin: 2mm; }
    body { width: 54mm; margin: 0; font: 12px/1.35 monospace; color: #000; }
    h1 { font-size: 16px; margin: 0; text-align: center; } .c { text-align: center; } hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; } td { vertical-align: top; padding: 1px 0; } .q { width: 8mm; font-weight: bold; } .a { font-size: 11px; }
  </style></head><body>
    <h1>KOT</h1><div class="c">${esc(storeName)}</div><hr>
    <div><b>${esc(o.orderNumber)}</b> · ${o.fulfilmentType === 'PICKUP' ? 'PICKUP' : 'DELIVERY'}</div>
    <div>${esc(o.customer.name)} · ${clock(o.times.placedAt)}</div><hr>
    <table>${rows}</table>
    ${o.note ? `<hr><div><b>Note:</b> ${esc(o.note)}</div>` : ''}<hr>
    <div class="c">Printed ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</div>
  </body></html>`;
  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  setTimeout(() => (w.focus(), w.print()), 300);
  return true;
}
