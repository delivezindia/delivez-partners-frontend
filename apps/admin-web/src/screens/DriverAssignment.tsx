import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bike, CheckCircle, Clock, History, MapPin, Phone, RefreshCcw, Search, Store, UserCheck, UserMinus, UserPlus, Users, X, Zap } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { CAN, can } from '../lib/types';
import { Button, Card, ErrorBox, fmtDate, inputCls, PageHead } from '../components/ui';
import { useMe } from './Layout';

// ───────── shapes (GET /admin/dispatch/…) ─────────
type Tab = 'UNASSIGNED' | 'ASSIGNED' | 'ON_THE_WAY' | 'DONE' | 'ALL';
interface Summary {
  tasks: { unassigned: number; assigned: number; onTheWay: number; deliveredToday: number; failedToday: number; longestWaitMinutes: number | null };
  drivers: { total: number; online: number; free: number; busy: number; gpsLive?: number };
  dispatch?: {
    auto: boolean;
    offersOut: number;
    offerSeconds: number;
    maxActivePerDriver: number;
    radiusKm: number[];
    maxSearchMinutes: number;
    today: { offered: number; accepted: number; declined: number; expired: number; acceptRate: number | null };
  };
}
interface Offered { name: string | null; code: string; distanceKm: number | null; expiresAt: string; round: number }
interface DispatchInfo { offeredTo: Offered | null; needsManual?: boolean; ridersAsked?: number; recent?: { name: string | null; code: string; answer: string }[] }
interface TaskRow {
  id: string;
  status: string;
  order: { orderNumber: string; placedAt: string; grandTotal: number; paymentMode?: string; isTestOrder?: boolean } | null;
  store: { name: string; city?: string | null } | null;
  pickup: { address: string | null };
  drop: { address: string | null; contactPhone?: string | null };
  distanceKm: number | null;
  codToCollect: number;
  readyAt: string | null;
  waitingMinutes: number | null;
  driver: { name: string | null; code: string; phone: string } | null;
  dispatch?: DispatchInfo | null;
  can: { assign: boolean; reassign: boolean; unassign: boolean };
}
interface TaskDetail extends TaskRow {
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedReason: string | null;
  history: { at: string; action?: string; to?: string; by: string; byName?: string | null; driver?: string | null; previousDriver?: string | null; reason?: string | null; distanceKm?: number | null; round?: number | null }[];
}
interface Driver {
  id: string;
  name: string | null;
  code: string;
  phone: string;
  isOnline: boolean;
  paused: boolean;
  isCurrent?: boolean;
  vehicleType: string | null;
  city?: string | null;
  activeTasks: number;
  maxActiveTasks?: number;
  distanceToPickupKm: number | null;
  etaToPickupMin: number | null;
  gpsLive?: boolean;
  lastSeenMinutes?: number | null;
  acceptRate7d?: number | null;
  canAssign: boolean;
  blockedReason?: string | null;
  autoDispatchOff?: string | null;
}

const TABS: { key: Tab; label: string; count?: (s?: Summary) => number | undefined }[] = [
  { key: 'UNASSIGNED', label: 'Needs a driver', count: (s) => s?.tasks.unassigned },
  { key: 'ASSIGNED', label: 'Driver assigned', count: (s) => s?.tasks.assigned },
  { key: 'ON_THE_WAY', label: 'On the way', count: (s) => s?.tasks.onTheWay },
  { key: 'DONE', label: 'Finished' },
  { key: 'ALL', label: 'All' },
];

const STATUS: Record<string, [string, string]> = {
  CREATED: ['Waiting for a driver', 'bg-amber-50 text-amber-800 border-amber-300'],
  SEARCHING_RIDER: ['Waiting for a driver', 'bg-amber-50 text-amber-800 border-amber-300'],
  ASSIGNED: ['Driver assigned', 'bg-dz-blue-soft text-dz-blue border-dz-blue'],
  EN_ROUTE_TO_PICKUP: ['Going to the shop', 'bg-dz-blue-soft text-dz-blue border-dz-blue'],
  ARRIVED_AT_PICKUP: ['At the shop', 'bg-indigo-50 text-indigo-700 border-indigo-300'],
  WAITING_AT_PICKUP: ['Waiting at the shop', 'bg-indigo-50 text-indigo-700 border-indigo-300'],
  PICKED_UP: ['Picked up', 'bg-purple-50 text-purple-700 border-purple-300'],
  EN_ROUTE_TO_DROP: ['Out for delivery', 'bg-purple-50 text-purple-700 border-purple-300'],
  ARRIVED_AT_DROP: ['At the customer', 'bg-purple-50 text-purple-700 border-purple-300'],
  DELIVERED: ['Delivered', 'bg-dz-green-soft text-dz-green border-dz-green'],
  FAILED: ['Delivery failed', 'bg-dz-red-soft text-dz-red border-dz-red'],
  CANCELLED: ['Cancelled', 'bg-neutral-100 text-neutral-600 border-neutral-300'],
  RETURNED_TO_STORE: ['Returned to shop', 'bg-dz-red-soft text-dz-red border-dz-red'],
};
const HISTORY_ACTION: Record<string, string> = {
  ASSIGN: 'Driver assigned by ops',
  REASSIGN: 'Driver changed by ops',
  UNASSIGN: 'Driver removed by ops',
  OFFERED: 'Offered to a driver (auto)',
  DECLINED: 'Driver declined',
  OFFER_EXPIRED: 'Driver didn’t answer in time',
  ACCEPTED: 'Driver accepted',
};
const DECLINE_TEXT: Record<string, string> = { TOO_FAR: 'too far', VEHICLE_ISSUE: 'vehicle issue', ON_BREAK: 'on a break', LOW_BATTERY: 'low battery', UNSAFE_AREA: 'unsafe area', OTHER: 'other', NO_RESPONSE: 'no answer' };
const ANSWER: Record<string, string> = { DECLINED: 'declined', EXPIRED: 'no answer', CANCELLED: 'withdrawn' };

const rupees = (paise: number | null | undefined) => `₹${((paise ?? 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const waited = (min: number | null | undefined) => {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h ${min % 60} min`;
  return `${Math.floor(min / 1440)} d ${Math.floor((min % 1440) / 60)} h`;
};
const by = (h: TaskDetail['history'][number]) => h.byName || (h.by === 'ADMIN' ? 'Delivez staff' : h.by === 'SYSTEM' ? 'Auto-dispatch' : h.by === 'RIDER' ? 'the driver' : h.by.toLowerCase());

function StatusBadge({ status }: { status: string }) {
  const [label, cls] = STATUS[status] ?? [status, 'bg-neutral-100 text-neutral-600 border-neutral-300'];
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

/** Live seconds left on an auto-dispatch offer. */
function Countdown({ until }: { until: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 1000))}s</span>;
}

/** What auto-dispatch is doing for a delivery that has no driver yet. */
function DispatchState({ d, autoOn }: { d?: DispatchInfo | null; autoOn?: boolean }) {
  if (!d) return null;
  if (d.offeredTo)
    return (
      <div className="mt-1 text-xs text-purple-700" data-offered>
        <span className="inline-flex items-center gap-1 font-bold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500" /> Offered to {d.offeredTo.name || d.offeredTo.code}
        </span>
        <div className="text-ink-3">
          {d.offeredTo.distanceKm != null ? `${d.offeredTo.distanceKm} km away · ` : ''}answer in <Countdown until={d.offeredTo.expiresAt} /> · try {d.offeredTo.round}
        </div>
      </div>
    );
  if (d.needsManual) return <div className="mt-1 text-xs font-bold text-dz-red">Auto-dispatch stopped — assign by hand</div>;
  if (!autoOn) return <div className="mt-1 text-xs text-ink-3">Auto-dispatch is off</div>;
  return (
    <div className="mt-1 text-xs text-ink-3">
      {d.ridersAsked ? `Asked ${d.ridersAsked} driver${d.ridersAsked === 1 ? '' : 's'} · looking for the next` : 'Looking for a nearby driver…'}
      {d.recent?.length ? <div className="text-ink-3/80">{d.recent.map((r) => `${r.name || r.code}: ${ANSWER[r.answer] || r.answer}`).join(' · ')}</div> : null}
    </div>
  );
}

function Tile({ icon, label, value, hint, tone = '' }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-3">
        {icon}
        {label}
      </div>
      <div className={`mt-2 text-2xl font-extrabold ${tone}`}>{value ?? '—'}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
    </Card>
  );
}

/** Right-hand panel for assign / change / remove / details. */
function Drawer({ title, subtitle, onClose, footer, children }: { title: string; subtitle?: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-2xl leading-none">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-soft">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function TaskSummary({ task }: { task: TaskRow }) {
  return (
    <div className="rounded-xl border border-line bg-soft p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-extrabold">{task.order?.orderNumber}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-3 space-y-2 text-ink-2">
        <div className="flex gap-2">
          <Store size={15} className="mt-0.5 shrink-0 text-ink-3" />
          <span>
            <b>{task.store?.name}</b> · {task.pickup.address || '—'}
          </span>
        </div>
        <div className="flex gap-2">
          <MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" />
          <span>{task.drop.address || '—'}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
        <span>Distance: {task.distanceKm != null ? `${task.distanceKm} km` : '—'}</span>
        <span>{task.codToCollect ? `Collect ${rupees(task.codToCollect)} cash` : 'Paid online'}</span>
        <span>Ready: {fmtDate(task.readyAt)}</span>
      </div>
    </div>
  );
}

/** Pick a driver (first assignment, or a change of driver). */
function AssignDrawer({ task, change, onClose, onDone }: { task: TaskRow; change: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const params = new URLSearchParams({ taskId: task.id, ...(q ? { search: q } : {}), ...(onlineOnly ? { onlineOnly: 'true' } : {}) });
  const drivers = useQuery({ queryKey: ['dispatch-drivers', task.id, q, onlineOnly], queryFn: () => api<{ items: Driver[] }>(`/admin/dispatch/drivers?${params}`) });

  const submit = async () => {
    setError(null);
    if (!picked) return setError('Choose a driver');
    if (change && text.trim().length < 5) return setError('Say why the driver is being changed (5+ characters)');
    setBusy(true);
    try {
      const body = change ? { riderId: picked, reason: text.trim() } : { riderId: picked, note: text.trim() || undefined };
      const updated = await api<TaskRow>(`/admin/dispatch/tasks/${task.id}/${change ? 'reassign' : 'assign'}`, { method: 'POST', body });
      onDone(`${updated.order?.orderNumber}: ${updated.driver?.name || 'driver'} ${change ? 'is the new driver' : 'assigned'}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={change ? 'Change driver' : 'Assign a driver'}
      subtitle={
        change
          ? `Now with ${task.driver?.name || 'a driver'}. Allowed until the order is picked up.`
          : task.dispatch?.offeredTo
            ? `Auto-dispatch is offering this to ${task.dispatch.offeredTo.name || task.dispatch.offeredTo.code}. Assigning by hand withdraws that offer.`
            : 'Best choices are listed first: online, nearest to the shop, least busy.'
      }
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={change ? 'Why is the driver being changed? (required)' : 'Note for the record (optional)'} className={inputCls} data-assign-note />
          <ErrorBox error={error} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !picked} data-confirm-assign>
              {busy ? 'Saving…' : change ? 'Change driver' : 'Assign driver'}
            </Button>
          </div>
        </div>
      }
    >
      <TaskSummary task={task} />
      <div className="mt-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver name, code or phone" className={`${inputCls} pl-9`} />
        </div>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="h-4 w-4 accent-dz-red" />
          Online only
        </label>
      </div>
      <div className="mt-3 space-y-2">
        {drivers.isLoading ? (
          <p className="py-8 text-center text-sm text-ink-3">Loading drivers…</p>
        ) : drivers.error ? (
          <ErrorBox error={errorText(drivers.error)} />
        ) : !drivers.data?.items.length ? (
          <p className="py-8 text-center text-sm text-ink-3">No approved drivers found{q ? ' for this search' : ''}. Drivers appear here after their sign-up is approved under Riders.</p>
        ) : (
          drivers.data.items.map((d) => (
            <label
              key={d.id}
              data-driver={d.code}
              className={`flex items-start gap-3 rounded-xl border-[1.5px] p-3 ${picked === d.id ? 'border-dz-red bg-dz-red-soft' : 'border-line hover:bg-soft'} ${d.canAssign ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              <input type="radio" name="driver" disabled={!d.canAssign} checked={picked === d.id} onChange={() => setPicked(d.id)} className="mt-1 h-4 w-4 accent-dz-red" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold">{d.name || 'Unnamed driver'}</span>
                  <span className="text-xs text-ink-3">{d.code}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${d.paused ? 'bg-amber-50 text-amber-800' : d.isOnline ? 'bg-dz-green-soft text-dz-green' : 'bg-neutral-100 text-neutral-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${d.paused ? 'bg-amber-500' : d.isOnline ? 'bg-dz-green' : 'bg-neutral-400'}`} />
                    {d.paused ? 'Paused' : d.isOnline ? 'Online' : 'Offline'}
                  </span>
                  {d.isCurrent && <span className="rounded-full bg-dz-blue-soft px-2 py-0.5 text-xs font-bold text-dz-blue">Current driver</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-3">
                  <span>{d.vehicleType || 'Vehicle not set'}</span>
                  {d.city && <span>{d.city}</span>}
                  <span>{d.activeTasks === 0 ? 'Free' : `Carrying ${d.activeTasks} of ${d.maxActiveTasks ?? '?'}`}</span>
                  <span>{d.distanceToPickupKm != null ? `${d.distanceToPickupKm} km from shop · about ${d.etaToPickupMin} min` : 'Location not known'}</span>
                  <span className={d.gpsLive ? 'text-dz-green' : ''}>{d.gpsLive ? 'GPS live' : d.lastSeenMinutes != null ? `GPS ${waited(d.lastSeenMinutes)} old` : 'No GPS yet'}</span>
                  {d.acceptRate7d != null && <span>Accepts {Math.round(d.acceptRate7d * 100)}% of offers</span>}
                  <span>{d.phone}</span>
                </div>
                {!d.blockedReason && d.autoDispatchOff && <div className="mt-1 text-xs text-ink-3">Not getting automatic offers: {d.autoDispatchOff.toLowerCase()}</div>}
                {d.blockedReason && <div className="mt-1 text-xs font-bold text-dz-red">{d.blockedReason}</div>}
              </div>
            </label>
          ))
        )}
      </div>
    </Drawer>
  );
}

function UnassignDrawer({ task, onClose, onDone }: { task: TaskRow; onClose: () => void; onDone: (msg: string) => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    if (reason.trim().length < 5) return setError('Say why the driver is being removed (5+ characters)');
    setBusy(true);
    try {
      await api(`/admin/dispatch/tasks/${task.id}/unassign`, { method: 'POST', body: { reason: reason.trim() } });
      onDone(`${task.order?.orderNumber}: driver removed. It needs a driver again.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer
      title="Remove driver"
      subtitle={`${task.driver?.name || 'The driver'} is taken off this delivery and it goes back to “Needs a driver”.`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Removing…' : 'Remove driver'}
          </Button>
        </div>
      }
    >
      <TaskSummary task={task} />
      <label className="mt-4 block text-sm font-bold">
        Why is the driver being removed?
        <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="For example: the driver's bike broke down" className={`${inputCls} mt-1 h-auto py-2`} />
      </label>
      <div className="mt-2">
        <ErrorBox error={error} />
      </div>
    </Drawer>
  );
}

function DetailDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data: task, error } = useQuery({ queryKey: ['dispatch-task', taskId], queryFn: () => api<TaskDetail>(`/admin/dispatch/tasks/${taskId}`), refetchInterval: 10_000 });
  return (
    <Drawer title="Delivery details" subtitle={task?.order?.orderNumber} onClose={onClose}>
      {error ? (
        <ErrorBox error={errorText(error)} />
      ) : !task ? (
        <p className="py-8 text-center text-sm text-ink-3">Loading…</p>
      ) : (
        <>
          <TaskSummary task={task} />
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(
              [
                ['Driver', task.driver ? `${task.driver.name} (${task.driver.code})` : 'None yet'],
                ['Driver phone', task.driver?.phone || '—'],
                ['Order placed', fmtDate(task.order?.placedAt)],
                ['Order total', `${rupees(task.order?.grandTotal)}${task.order?.paymentMode ? ` · ${task.order.paymentMode}` : ''}`],
                ['Assigned', fmtDate(task.assignedAt)],
                ['Picked up', fmtDate(task.pickedUpAt)],
                ['Delivered', fmtDate(task.deliveredAt)],
                ['Customer phone', task.drop.contactPhone || '—'],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-3">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {task.failedReason && <p className="mt-3 rounded-lg bg-dz-red-soft p-3 text-sm text-dz-red">Failed: {task.failedReason}</p>}
          <h3 className="mt-6 flex items-center gap-2 text-sm font-extrabold">
            <History size={15} /> History
          </h3>
          <ol className="mt-3 space-y-3 border-l border-line pl-4" data-history>
            {task.history.map((h, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-dz-red" />
                <div className="font-bold">{(h.action && HISTORY_ACTION[h.action]) || (h.to ? STATUS[h.to]?.[0] ?? h.to : h.action)}</div>
                <div className="text-xs text-ink-3">
                  {fmtDate(h.at)} · by {by(h)}
                </div>
                {h.driver && (
                  <div className="text-xs text-ink-2">
                    Driver: {h.driver}
                    {h.distanceKm != null ? ` · ${h.distanceKm} km away` : ''}
                    {h.round ? ` · try ${h.round}` : ''}
                  </div>
                )}
                {h.previousDriver && <div className="text-xs text-ink-2">Previous driver: {h.previousDriver}</div>}
                {h.reason && (
                  <div className="text-xs text-ink-2">
                    {h.action === 'DECLINED' ? 'Reason' : 'Note'}: {DECLINE_TEXT[h.reason] || h.reason}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Drawer>
  );
}

const PAGE_SIZE = 20;

/**
 * Driver assignment for Delivez Go store orders: see every delivery, what auto-dispatch is doing, and assign / change /
 * remove a driver by hand. Refreshes every 10 s (offers last ~30 s).
 */
export default function DriverAssignment() {
  const { data: me } = useMe();
  const canOperate = can(me?.role, CAN.dispatch);
  const qc = useQueryClient();
  // City filter: head office can look at one city at a time; a city-scoped login only gets its own cities.
  const cities = useQuery({ queryKey: ['dispatch-cities'], queryFn: () => api<{ allCities: boolean; items: { id: string; name: string }[] }>('/admin/dispatch/cities'), staleTime: 5 * 60_000 });
  const [city, setCity] = useState('');
  const cityList = cities.data?.items ?? [];
  const cityLabel = city ? (cityList.find((c) => c.id === city)?.name ?? '') : cities.data?.allCities ? 'All cities' : cityList.map((c) => c.name).join(', ');
  const [tab, setTab] = useState<Tab>('UNASSIGNED');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ type: 'ASSIGN' | 'REASSIGN' | 'UNASSIGN' | 'DETAIL'; task: TaskRow } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const live = drawer ? false : 10_000;
  const summary = useQuery({ queryKey: ['dispatch-summary', city], queryFn: () => api<Summary>(`/admin/dispatch/summary${city ? `?cityId=${city}` : ''}`), refetchInterval: live });
  const params = new URLSearchParams({ tab, page: String(page), pageSize: String(PAGE_SIZE), ...(q ? { search: q } : {}), ...(city ? { cityId: city } : {}) });
  const tasks = useQuery({ queryKey: ['dispatch-tasks', tab, q, page, city], queryFn: () => api<{ total: number; items: TaskRow[] }>(`/admin/dispatch/tasks?${params}`), refetchInterval: live });
  const s = summary.data;
  const data = tasks.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['dispatch-summary'] });
    void qc.invalidateQueries({ queryKey: ['dispatch-tasks'] });
  };
  const done = (msg: string) => {
    setDrawer(null);
    setFlash(msg);
    refresh();
  };

  return (
    <div className="space-y-5">
      <PageHead
        title="Driver assignment"
        sub={
          <>
            Give Delivez Go store orders to drivers, change a driver, and follow each delivery.
            {cityLabel && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border-[1.5px] border-black bg-dz-yellow-soft px-2.5 py-0.5 text-xs font-bold text-ink" data-city-scope>
                <MapPin size={12} aria-hidden /> {cityLabel}
              </span>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {cityList.length > 1 && (
              <select
                aria-label="City"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} !h-10 !w-auto min-w-[170px]`}
                data-city-filter
              >
                <option value="">{cities.data?.allCities ? 'All cities' : 'All my cities'}</option>
                {cityList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <Button variant="outline" onClick={refresh}>
              <RefreshCcw size={15} className={tasks.isFetching ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>
        }
      />

      {flash && (
        <div role="status" className="rounded-xl border-[1.5px] border-dz-green bg-dz-green-soft px-4 py-3 text-sm font-bold text-dz-green" data-flash>
          {flash}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={<AlertTriangle size={14} />} label="Needs a driver" value={s?.tasks.unassigned} tone={s?.tasks.unassigned ? 'text-amber-700' : ''} hint={s?.tasks.unassigned ? `Longest wait ${waited(s.tasks.longestWaitMinutes)}` : 'Nothing waiting'} />
        <Tile icon={<UserCheck size={14} />} label="Driver assigned" value={s?.tasks.assigned} hint="Going to the shop" />
        <Tile icon={<Bike size={14} />} label="On the way" value={s?.tasks.onTheWay} hint="Picked up" />
        <Tile icon={<CheckCircle size={14} />} label="Delivered today" value={s?.tasks.deliveredToday} tone="text-dz-green" hint={s?.tasks.failedToday ? `${s.tasks.failedToday} failed today` : 'None failed today'} />
        <Tile icon={<Users size={14} />} label="Drivers online" value={s ? `${s.drivers.online} / ${s.drivers.total}` : null} hint={s?.drivers.gpsLive != null ? `${s.drivers.gpsLive} with live GPS` : 'Online / approved'} />
        <Tile icon={<UserPlus size={14} />} label="Free drivers" value={s?.drivers.free} hint={s ? `${s.drivers.busy} on a delivery` : ''} />
      </div>

      {s?.dispatch && (
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border-[1.5px] px-4 py-3 text-sm ${s.dispatch.auto ? 'border-purple-300 bg-purple-50 text-purple-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`} data-auto-dispatch>
          <span className="flex items-center gap-2 font-extrabold">
            <Zap size={15} /> Auto-dispatch {s.dispatch.auto ? 'on' : 'off — assign every delivery by hand'}
          </span>
          {s.dispatch.auto && (
            <>
              <span>
                {s.dispatch.offersOut} offer{s.dispatch.offersOut === 1 ? '' : 's'} waiting for an answer
              </span>
              <span>
                Today: {s.dispatch.today.offered} offered · {s.dispatch.today.accepted} accepted · {s.dispatch.today.declined} declined · {s.dispatch.today.expired} no answer
                {s.dispatch.today.acceptRate != null ? ` (${Math.round(s.dispatch.today.acceptRate * 100)}% accepted)` : ''}
              </span>
              <span className="text-xs text-purple-700">
                Each driver gets {s.dispatch.offerSeconds}s to answer · up to {s.dispatch.maxActivePerDriver} orders each · searches {s.dispatch.radiusKm.join(' → ')} km · after {s.dispatch.maxSearchMinutes} min ops assign by hand
              </span>
            </>
          )}
        </div>
      )}

      {!canOperate && me && <p className="text-sm text-ink-3">You can see deliveries. Assigning drivers needs an operations role (Founder, Head of Ops, Regional head or City ops).</p>}

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-line px-4 pt-2">
          <div className="flex gap-1 overflow-x-auto overflow-y-hidden pt-1" role="tablist">
            {TABS.map((t) => {
              const n = t.count?.(s);
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  data-tab={t.key}
                  onClick={() => {
                    setTab(t.key);
                    setPage(1);
                  }}
                  className={`-mb-[1.5px] shrink-0 border-b-[3px] px-3 py-2.5 text-sm font-bold ${tab === t.key ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}
                >
                  {t.label}
                  {n != null && <span className="ml-1.5 rounded-full bg-soft px-1.5 text-xs">{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="relative mb-2 w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Order number, shop or driver"
              aria-label="Search deliveries"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {(tasks.error || summary.error) && (
          <div className="m-4">
            <ErrorBox error={errorText(tasks.error || summary.error)} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Shop → Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-3">
                    {tasks.isLoading ? 'Loading deliveries…' : ''}
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-3">
                    {q ? 'No deliveries match this search.' : tab === 'UNASSIGNED' ? 'No deliveries are waiting for a driver.' : 'No deliveries here.'}
                  </td>
                </tr>
              ) : (
                data.items.map((t) => (
                  <tr key={t.id} className="border-b border-line align-top last:border-0 hover:bg-soft" data-task={t.order?.orderNumber}>
                    <td className="px-4 py-3">
                      <button onClick={() => setDrawer({ type: 'DETAIL', task: t })} className="font-extrabold hover:text-dz-red" data-open-detail>
                        {t.order?.orderNumber || '—'}
                      </button>
                      <div className="text-xs text-ink-3">{fmtDate(t.order?.placedAt)}</div>
                      {t.order?.isTestOrder && <span className="mt-1 inline-block rounded bg-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-3">Test order</span>}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="font-bold">
                        {t.store?.name}
                        {t.store?.city && <span className="font-normal text-ink-3"> · {t.store.city}</span>}
                      </div>
                      <div className="truncate text-xs text-ink-3" title={t.drop.address || ''}>
                        To: {t.drop.address || '—'}
                      </div>
                      {t.distanceKm != null && <div className="text-xs text-ink-3">{t.distanceKm} km</div>}
                    </td>
                    <td className="px-4 py-3">
                      {t.codToCollect ? <span className="font-bold">Collect {rupees(t.codToCollect)}</span> : <span className="text-ink-2">Paid online</span>}
                      <div className="text-xs text-ink-3">Total {rupees(t.order?.grandTotal)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                      {t.waitingMinutes != null && (
                        <div className={`mt-1 flex items-center gap-1 text-xs ${t.waitingMinutes >= 10 ? 'font-bold text-dz-red' : 'text-ink-3'}`}>
                          <Clock size={12} /> Waiting {waited(t.waitingMinutes)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.driver ? (
                        <>
                          <div className="font-bold" data-driver-name>
                            {t.driver.name || t.driver.code}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-ink-3">
                            <Phone size={11} /> {t.driver.phone}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-ink-3">No driver</span>
                          {t.can.assign && <DispatchState d={t.dispatch} autoOn={s?.dispatch?.auto} />}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canOperate && t.can.assign && (
                          <Button className="min-h-8 px-3 text-xs" onClick={() => setDrawer({ type: 'ASSIGN', task: t })} data-assign>
                            <UserPlus size={13} /> Assign driver
                          </Button>
                        )}
                        {canOperate && t.can.reassign && (
                          <Button variant="outline" className="min-h-8 px-3 text-xs" onClick={() => setDrawer({ type: 'REASSIGN', task: t })} data-reassign>
                            <Users size={13} /> Change
                          </Button>
                        )}
                        {canOperate && t.can.unassign && (
                          <Button variant="outline" className="min-h-8 border-dz-red px-3 text-xs text-dz-red" onClick={() => setDrawer({ type: 'UNASSIGN', task: t })} data-unassign>
                            <UserMinus size={13} /> Remove
                          </Button>
                        )}
                        {(!canOperate || (!t.can.assign && !t.can.reassign)) && (
                          <Button variant="outline" className="min-h-8 px-3 text-xs" onClick={() => setDrawer({ type: 'DETAIL', task: t })}>
                            View
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-2">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" className="min-h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" className="min-h-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {(drawer?.type === 'ASSIGN' || drawer?.type === 'REASSIGN') && <AssignDrawer task={drawer.task} change={drawer.type === 'REASSIGN'} onClose={() => setDrawer(null)} onDone={done} />}
      {drawer?.type === 'UNASSIGN' && <UnassignDrawer task={drawer.task} onClose={() => setDrawer(null)} onDone={done} />}
      {drawer?.type === 'DETAIL' && <DetailDrawer taskId={drawer.task.id} onClose={() => setDrawer(null)} />}
    </div>
  );
}
