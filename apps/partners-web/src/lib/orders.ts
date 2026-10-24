import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, newIdempotencyKey } from './api';
import type { MsgKey } from './i18n';

export type OrderStatus =
  | 'AWAITING_RX_REVIEW' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_SOON' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'ARRIVED'
  | 'DELIVERED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DELIVERY_FAILED' | 'REFUNDED';
export type OrderTab = 'RX' | 'NEW' | 'PREPARING' | 'READY' | 'DONE' | 'CANCELLED' | 'ALL';
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
  /** Pharmacy: when an unreviewed prescription order is cancelled. */
  rxReviewBy?: string | null;
  /** Grocery: replacements offered for items that ran out. */
  substitutions?: { id: string; itemId: string; name: string; variant: string | null; qty: number; lineTotal: number; status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'; respondBy: string; respondedAt: string | null }[];
  rx?: { id: string; status: string; files: number; doctorName: string | null; doctorRegNo: string | null; issuedOn: string | null; patientName: string | null; reviewedBy: { name: string; registrationNo: string } | null; reviewedAt: string | null; notes: string | null; rejectionReason: string | null } | null;
  rider: { taskStatus: TaskStatus; name: string | null; phone: string | null; assignedAt: string | null; arrivedAt: string | null; waitingSince: string | null; readyAtEstimate: string | null } | null;
  timeline?: { from: OrderStatus | null; to: OrderStatus; actorType: string; reason: string | null; meta: Record<string, unknown> | null; at: string }[];
}

export const TABS: { key: OrderTab; label: string; t: MsgKey }[] = [
  { key: 'NEW', label: 'New', t: 'ord.tab.NEW' },
  { key: 'PREPARING', label: 'Preparing', t: 'ord.tab.PREPARING' },
  { key: 'READY', label: 'Ready', t: 'ord.tab.READY' },
  { key: 'DONE', label: 'Picked up', t: 'ord.tab.DONE' },
  { key: 'CANCELLED', label: 'Cancelled', t: 'ord.tab.CANCELLED' },
  { key: 'ALL', label: 'All', t: 'ord.tab.ALL' },
];

/** State colours (plan §16.1). */
export const STATUS: Record<OrderStatus, { label: string; cls: string; bar: string; t: MsgKey }> = {
  AWAITING_RX_REVIEW: { label: 'Prescription check', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue', bar: 'bg-dz-blue', t: 'rx.status' },
  PLACED: { label: 'New', cls: 'border-dz-red bg-dz-red-soft text-dz-red', bar: 'bg-dz-red', t: 'ord.st.PLACED' },
  ACCEPTED: { label: 'Accepted', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue', bar: 'bg-dz-blue', t: 'ord.st.ACCEPTED' },
  PREPARING: { label: 'Preparing', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink', bar: 'bg-dz-yellow-strong', t: 'ord.st.PREPARING' },
  READY_SOON: { label: 'Ready soon', cls: 'border-amber-500 bg-amber-50 text-amber-800', bar: 'bg-amber-500', t: 'ord.st.READY_SOON' },
  READY: { label: 'Ready', cls: 'border-dz-green bg-dz-green-soft text-dz-green', bar: 'bg-dz-green', t: 'ord.st.READY' },
  PICKED_UP: { label: 'Picked up', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400', t: 'ord.st.PICKED_UP' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400', t: 'ord.st.OUT_FOR_DELIVERY' },
  ARRIVED: { label: 'At customer', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400', t: 'ord.st.ARRIVED' },
  DELIVERED: { label: 'Delivered', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400', t: 'ord.st.DELIVERED' },
  COMPLETED: { label: 'Collected', cls: 'border-line bg-soft text-ink-2', bar: 'bg-neutral-400', t: 'ord.st.COMPLETED' },
  REJECTED: { label: 'Rejected', cls: 'border-line bg-soft text-ink-3', bar: 'bg-neutral-300', t: 'ord.st.REJECTED' },
  CANCELLED: { label: 'Cancelled', cls: 'border-line bg-soft text-ink-3', bar: 'bg-neutral-300', t: 'ord.st.CANCELLED' },
  DELIVERY_FAILED: { label: 'Delivery failed', cls: 'border-dz-red bg-soft text-dz-red', bar: 'bg-neutral-300', t: 'ord.st.DELIVERY_FAILED' },
  REFUNDED: { label: 'Refunded', cls: 'border-line bg-soft text-ink-3', bar: 'bg-neutral-300', t: 'ord.st.REFUNDED' },
};

export const RIDER: Record<TaskStatus, MsgKey> = {
  CREATED: 'ord.rider.CREATED',
  SEARCHING_RIDER: 'ord.rider.SEARCHING_RIDER',
  ASSIGNED: 'ord.rider.ASSIGNED',
  EN_ROUTE_TO_PICKUP: 'ord.rider.EN_ROUTE_TO_PICKUP',
  ARRIVED_AT_PICKUP: 'ord.rider.ARRIVED_AT_PICKUP',
  WAITING_AT_PICKUP: 'ord.rider.WAITING_AT_PICKUP',
  PICKED_UP: 'ord.rider.PICKED_UP',
  EN_ROUTE_TO_DROP: 'ord.rider.EN_ROUTE_TO_DROP',
  ARRIVED_AT_DROP: 'ord.rider.ARRIVED_AT_DROP',
  DELIVERED: 'ord.rider.DELIVERED',
  FAILED: 'ord.rider.FAILED',
  CANCELLED: 'ord.rider.CANCELLED',
};

export const REJECT_REASONS = [
  { value: 'ITEMS_UNAVAILABLE', label: 'Items unavailable', t: 'ord.rr.ITEMS_UNAVAILABLE' as MsgKey },
  { value: 'TOO_BUSY', label: 'Too busy right now', t: 'ord.rr.TOO_BUSY' as MsgKey },
  { value: 'STORE_CLOSING', label: 'Store closing', t: 'ord.rr.STORE_CLOSING' as MsgKey },
  { value: 'KITCHEN_ISSUE', label: 'Kitchen / equipment issue', t: 'ord.rr.KITCHEN_ISSUE' as MsgKey },
  { value: 'OTHER', label: 'Other', t: 'ord.rr.OTHER' as MsgKey },
] as const;

type OrdersPage = { orders: Order[]; counts: Record<'NEW' | 'PREPARING' | 'READY', number> & { RX?: number }; nextCursor: string | null };

// Sockets keep the screen live; the 15 s poll is the fallback when the socket drops.
export const useOrders = (storeId: string, tab: OrderTab, enabled = true) =>
  useQuery({ queryKey: ['orders', storeId, tab], queryFn: () => api<OrdersPage>(`/partners/stores/${storeId}/orders?tab=${tab}`), refetchInterval: 15_000, enabled });

/** History tabs (Picked up / Cancelled / All) page back 50 at a time. */
export const HISTORY_TABS: OrderTab[] = ['DONE', 'CANCELLED', 'ALL'];
export const useOrderHistory = (storeId: string, tab: OrderTab, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['orders', storeId, tab, 'history'],
    queryFn: ({ pageParam }) => api<OrdersPage>(`/partners/stores/${storeId}/orders?tab=${tab}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 30_000,
    enabled,
  });

/** The New tab is watched on every tab: it drives the sound and the badge. */
export const useNewOrders = (storeId: string, enabled = true) => useOrders(storeId, 'NEW', enabled);

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

// Each device (kitchen tablet, counter PC) keeps its own tone and volume.
export type Tone = 'classic' | 'bell' | 'urgent';
export const TONES: { value: Tone; label: string; t: MsgKey }[] = [
  { value: 'classic', label: 'Classic', t: 'ord.tone.classic' },
  { value: 'bell', label: 'Bell', t: 'ord.tone.bell' },
  { value: 'urgent', label: 'Urgent', t: 'ord.tone.urgent' },
];
/** Notes per tone: [frequency Hz, start s, length s]. */
const NOTES: Record<Tone, { wave: OscillatorType; notes: [number, number, number][] }> = {
  classic: { wave: 'square', notes: [[880, 0, 0.16], [1175, 0.18, 0.16]] },
  bell: { wave: 'sine', notes: [[1319, 0, 0.5], [1568, 0.16, 0.5], [2093, 0.32, 0.7]] },
  urgent: { wave: 'sawtooth', notes: [[988, 0, 0.1], [988, 0.14, 0.1], [988, 0.28, 0.1], [1319, 0.42, 0.18]] },
};
/** Volume steps 1–5 → peak gain (3 = the original level). */
const GAIN = [0, 0.04, 0.08, 0.15, 0.24, 0.35];
const PREFS_KEY = 'dz-order-sound';
export interface SoundPrefs {
  tone: Tone;
  volume: 1 | 2 | 3 | 4 | 5;
}
export function getSoundPrefs(): SoundPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<SoundPrefs>;
    return { tone: p.tone && p.tone in NOTES ? p.tone : 'classic', volume: p.volume && p.volume >= 1 && p.volume <= 5 ? p.volume : 3 };
  } catch {
    return { tone: 'classic', volume: 3 };
  }
}
export function setSoundPrefs(p: SoundPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* private mode: keep for this visit only */
  }
}

let ctx: AudioContext | null = null;
export const soundReady = () => ctx?.state === 'running';
export async function enableSound() {
  ctx ??= new AudioContext();
  await ctx.resume();
  beep();
  return soundReady();
}
function play(prefs: SoundPrefs) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const { wave, notes } = NOTES[prefs.tone];
  const peak = GAIN[prefs.volume];
  for (const [f, start, len] of notes) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.type = wave;
    g.gain.setValueAtTime(0.0001, t + start);
    g.gain.exponentialRampToValueAtTime(peak, t + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + start + len);
    o.connect(g).connect(ctx.destination);
    o.start(t + start);
    o.stop(t + start + len + 0.01);
  }
}
const beep = () => play(getSoundPrefs());
/** "Test sound" button: also unlocks audio, since it runs from a tap. */
export async function testSound(prefs: SoundPrefs) {
  ctx ??= new AudioContext();
  await ctx.resume();
  play(prefs);
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
  return printHtml(html, 'kot', o.orderNumber);
}

/**
 * Prints a small HTML page through a hidden frame instead of a popup: works for automatic printing too
 * (popup blockers only allow clicks). The frame is tagged (data-kot / data-bill) so tests can find it.
 */
export function printHtml(html: string, kind: 'kot' | 'bill', id: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.dataset[kind] = id;
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) return false;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  }, 250);
  return true;
}

// Auto-print the kitchen ticket on accept — a per-device choice (the tablet next to the printer).
const AUTO_KOT_KEY = 'dz-auto-kot';
export const getAutoKot = () => {
  try {
    return localStorage.getItem(AUTO_KOT_KEY) === '1';
  } catch {
    return false;
  }
};
export const setAutoKot = (on: boolean) => {
  try {
    localStorage.setItem(AUTO_KOT_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
};
