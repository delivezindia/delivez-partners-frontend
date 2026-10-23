import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Bike, CheckCircle2, ClipboardList, CloudOff, Plus, ShoppingBag, SlidersHorizontal, Sparkles, Timer, Volume2 } from 'lucide-react';
import { api } from '../../lib/api';
import { inr } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { clock, enableSound, getSoundPrefs, HISTORY_TABS, mmss, orderAction, QueuedOffline, REJECT_REASONS, RIDER, setSoundPrefs, soundReady, STATUS, TABS, testSound, TONES, useAlarm, useNewOrders, useNow, useOrderHistory, useOrders, usePendingSync, type Order, type OrderTab, type SoundPrefs } from '../../lib/orders';
import { Field, TextInput } from '../../components/form';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';
import NewOrder from './NewOrder';

const KITCHEN = ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'PHARMACIST'];
const CREATE = ['OWNER', 'MANAGER', 'COUNTER_STAFF'];

type Dialog = { kind: 'accept' | 'reject' | 'ready' | 'delay'; order: Order } | null;

// P15 Orders (Step 11): the live order board.
export default function Orders() {
  const { storeId, role } = useStoreContext();
  const [tab, setTab] = useState<OrderTab>('NEW');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [creating, setCreating] = useState(false);
  const [heard, setHeard] = useState<Set<string>>(new Set());
  const [sound, setSound] = useState(soundReady());
  const fresh = useNewOrders(storeId);
  const isHistory = HISTORY_TABS.includes(tab);
  const list = useOrders(storeId, tab, tab !== 'NEW' && !isHistory);
  const history = useOrderHistory(storeId, tab, isHistory);
  const [soundPanel, setSoundPanel] = useState(false);
  const data = tab === 'NEW' ? fresh.data : isHistory ? (history.data ? { orders: history.data.pages.flatMap((p) => p.orders) } : undefined) : list.data;
  const pending = usePendingSync(storeId);
  const qc = useQueryClient();

  // Ring while any new order hasn't been seen (tapped, accepted, rejected or silenced).
  const unheard = (fresh.data?.orders ?? []).filter((o) => !heard.has(o.id));
  useAlarm(sound && unheard.length > 0);
  const silence = () => setHeard((h) => new Set([...h, ...(fresh.data?.orders ?? []).map((o) => o.id)]));

  const simulate = useMutation({
    mutationFn: () => api<{ orders: Order[] }>(`/dev/stores/${storeId}/orders/simulate`, { method: 'POST', body: { count: 1 } }),
    onSuccess: () => (setTab('NEW'), qc.invalidateQueries({ queryKey: ['orders', storeId] })),
    onError: (e) => toast.error(errorMessageOf(e) ?? 'Could not create a test order'),
  });

  // Keyboard: A = accept the oldest new order, R = mark the oldest cooking order ready.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialog || creating || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'a' && KITCHEN.includes(role) && fresh.data?.orders[0]) setDialog({ kind: 'accept', order: fresh.data.orders[0] });
      if (k === 'r' && tab === 'PREPARING' && list.data?.orders[0]) setDialog({ kind: 'ready', order: list.data.orders[0] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, creating, role, fresh.data, list.data, tab]);

  const counts = fresh.data?.counts ?? list.data?.counts;
  const orders = data?.orders ?? [];
  const isLoading = tab === 'NEW' ? fresh.isLoading : isHistory ? history.isLoading : list.isLoading;
  const error = tab === 'NEW' ? fresh.error : isHistory ? history.error : list.error;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">Orders</h1>
          <p className="text-ink-2">
            Accept within 3 minutes.<span className="hidden lg:inline"> Shortcuts: <kbd className="rounded border border-line bg-white px-1 text-xs">A</kbd> accept · <kbd className="rounded border border-line bg-white px-1 text-xs">R</kbd> ready</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending.length > 0 && (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-3 text-xs font-bold text-amber-800" title={pending.map((p) => p.label).join(', ')}>
              <CloudOff className="h-3.5 w-3.5" /> {pending.length} pending sync
            </span>
          )}
          <span className="relative flex">
            <Button variant="ghost" className="min-h-11 rounded-r-none" onClick={() => (sound ? setSound(false) : void enableSound().then(setSound))} aria-pressed={sound}>
              {sound ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />} {sound ? 'Sound on' : 'Turn on sound'}
            </Button>
            <Button variant="ghost" className="min-h-11 rounded-l-none border-l-0 px-3" onClick={() => setSoundPanel((v) => !v)} aria-label="Sound settings" aria-expanded={soundPanel}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            {soundPanel && <SoundSettings onClose={() => setSoundPanel(false)} onEnabled={() => setSound(true)} />}
          </span>
          {import.meta.env.DEV && (role === 'OWNER' || role === 'MANAGER') && (
            <Button variant="ghost" className="min-h-11" disabled={simulate.isPending} onClick={() => simulate.mutate()}>
              <Sparkles className="h-4 w-4" /> Test order
            </Button>
          )}
          {CREATE.includes(role) && (
            <Button className="min-h-11" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New order
            </Button>
          )}
        </div>
      </div>

      {unheard.length > 0 && (
        <button type="button" onClick={silence} className="dz-pulse-ring flex w-full items-center justify-between gap-3 rounded-2xl bg-dz-red px-4 py-3 text-left font-bold text-white">
          <span className="flex items-center gap-2"><Bell className="h-5 w-5" /> {unheard.length === 1 ? '1 new order' : `${unheard.length} new orders`} waiting</span>
          <span className="text-sm underline">{sound ? 'Silence' : 'Got it'}</span>
        </button>
      )}

      <div className="dz-scroll-x flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {TABS.map((t) => {
          const n = counts?.[t.key as keyof NonNullable<typeof counts>];
          return (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold ${tab === t.key ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {t.label}
              {n ? <span className={`ml-1.5 rounded-full px-1.5 text-xs text-white ${t.key === 'NEW' ? 'bg-dz-red' : 'bg-ink'}`}>{n}</span> : null}
            </button>
          );
        })}
      </div>

      {error && <ErrorText>{errorMessageOf(error)}</ErrorText>}
      {isLoading && <SkeletonList rows={3} />}
      {data && orders.length === 0 && (
        <EmptyState icon={ClipboardList} title={tab === 'NEW' ? 'No new orders' : 'Nothing here'} body={tab === 'NEW' ? (sound ? 'New orders ring here — keep this screen open.' : 'Turn on sound so you hear new orders.') : undefined} />
      )}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} onDialog={(kind) => (setHeard((h) => new Set([...h, o.id])), setDialog({ kind, order: o }))} onSeen={() => setHeard((h) => new Set([...h, o.id]))} />
        ))}
      </div>
      {isHistory && history.hasNextPage && (
        <Button variant="ghost" className="w-full" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
          {history.isFetchingNextPage ? 'Loading…' : 'Load older orders'}
        </Button>
      )}

      {dialog && <ActionDialog dialog={dialog} onClose={() => setDialog(null)} />}
      {creating && <NewOrder onClose={() => setCreating(false)} />}
    </div>
  );
}

/** Tone + volume for the new-order alarm, saved on this device. */
function SoundSettings({ onClose, onEnabled }: { onClose: () => void; onEnabled: () => void }) {
  const [prefs, setPrefs] = useState<SoundPrefs>(getSoundPrefs);
  const update = (p: SoundPrefs) => (setPrefs(p), setSoundPrefs(p));
  return (
    <div role="dialog" aria-label="Sound settings" className="dz-pop absolute right-0 top-12 z-40 w-72 space-y-3 rounded-2xl border-[1.5px] border-black bg-white p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <b>Order sound</b>
        <button type="button" onClick={onClose} className="text-sm font-bold text-ink-3 hover:text-ink">Done</button>
      </div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Tone">
        {TONES.map((t) => (
          <button key={t.value} type="button" role="radio" aria-checked={prefs.tone === t.value} onClick={() => update({ ...prefs, tone: t.value })} className={`flex-1 rounded-lg border-[1.5px] px-2 py-1.5 text-sm font-bold ${prefs.tone === t.value ? 'border-black bg-black text-dz-yellow' : 'border-line'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <label className="block text-sm font-semibold">
        Volume
        <input type="range" min={1} max={5} step={1} value={prefs.volume} onChange={(e) => update({ ...prefs, volume: Number(e.target.value) as SoundPrefs['volume'] })} className="mt-1 w-full accent-dz-red" aria-label="Volume" />
        <span className="flex justify-between text-[11px] text-ink-3"><span>Quiet</span><span>Loud</span></span>
      </label>
      <Button variant="dark" className="min-h-10 w-full text-sm" onClick={() => void testSound(prefs).then(onEnabled)}>
        <Volume2 className="h-4 w-4" /> Test sound
      </Button>
      <p className="text-[11px] text-ink-3">Saved on this device. Also check the tablet’s own volume.</p>
    </div>
  );
}

/** Shared mutation for order actions: updates caches, handles the offline queue. */
export function useOrderAction(order: Order, onDone?: () => void) {
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  return useMutation({
    // Don't let TanStack pause it offline: orderAction queues it in IndexedDB instead (survives reloads).
    networkMode: 'always',
    mutationFn: ({ action, body, label }: { action: string; body?: unknown; label?: string }) => orderAction(storeId, order.id, action, body, label),
    onSuccess: (o) => {
      qc.setQueryData(['order', storeId, o.orderNumber], o);
      void qc.invalidateQueries({ queryKey: ['orders', storeId] });
      toast.success(`${o.orderNumber}: ${STATUS[o.status].label}`);
      onDone?.();
    },
    onError: (e) => {
      if (e instanceof QueuedOffline) {
        toast.info(e.message);
        onDone?.();
      }
    },
  });
}

export function OrderCard({ order: o, onDialog, onSeen, detail = false }: { order: Order; onDialog: (k: 'accept' | 'reject' | 'ready' | 'delay') => void; onSeen?: () => void; detail?: boolean }) {
  const { role, storeId } = useStoreContext();
  const kitchen = KITCHEN.includes(role);
  const isNew = o.status === 'PLACED';
  const cooking = ['ACCEPTED', 'PREPARING', 'READY_SOON'].includes(o.status);
  const now = useNow(isNew || cooking || o.status === 'READY');
  const act = useOrderAction(o);
  const [code, setCode] = useState('');
  const left = o.acceptBy ? (new Date(o.acceptBy).getTime() - now) / 1000 : 0;
  const etaLeft = o.etaAt ? (new Date(o.etaAt).getTime() - now) / 1000 : null;
  const items = useMemo(() => o.items.filter((i) => !i.unavailable), [o.items]);
  const onRoad = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED'].includes(o.status) && !!o.rider;
  const hasFooter = isNew || cooking || o.status === 'READY' || onRoad || !!act.error;

  return (
    <article onClick={onSeen} className={`dz-card relative flex flex-col overflow-hidden ${isNew ? 'dz-pulse-ring border-dz-red' : ''}`} aria-label={`Order ${o.orderNumber}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${STATUS[o.status].bar}`} aria-hidden />
      <header className="flex items-start justify-between gap-3 py-3 pl-5 pr-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {detail ? <b className="text-lg">{o.orderNumber}</b> : <Link to={`/stores/${storeId}/orders/${o.orderNumber}`} className="text-lg font-extrabold hover:underline">{o.orderNumber}</Link>}
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
            {o.isTestOrder && <span className="rounded bg-soft px-1 text-[10px] font-bold uppercase text-ink-3">test</span>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1 font-semibold text-ink">{o.fulfilmentType === 'PICKUP' ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}{o.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</span>
            <span>{o.customer.name}</span>
            {o.deliveryArea && <span className="text-ink-3">· {o.deliveryArea}{o.distanceKm != null ? ` · ${o.distanceKm} km` : ''}</span>}
            <span className="text-ink-3">· {clock(o.times.placedAt)}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {isNew && (
            <span className={`block text-2xl font-extrabold tabular-nums ${left < 60 ? 'text-dz-red' : ''}`} aria-label="Time left to accept">{mmss(left)}</span>
          )}
          {cooking && etaLeft != null && (
            <span className={`flex items-center justify-end gap-1 text-lg font-extrabold tabular-nums ${etaLeft < 0 ? 'text-dz-red' : ''}`} title="Promised ready time">
              <Timer className="h-4 w-4" /> {etaLeft < 0 ? `+${mmss(-etaLeft)}` : mmss(etaLeft)}
            </span>
          )}
          <b className="block tabular-nums">{inr(o.totals.grandTotal)}</b>
          <span className="text-[11px] font-semibold text-ink-3">{o.payment.mode === 'COD' ? 'Cash' : 'Paid online'}</span>
        </div>
      </header>

      {cooking && <PrepStepper status={o.status} />}

      <ul className="flex-1 space-y-1 border-t border-line py-3 pl-5 pr-4 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <b className="w-7 shrink-0 tabular-nums">{i.qty}×</b>
            <span className="flex-1">
              {i.name}{i.variant && <span className="text-ink-3"> ({i.variant})</span>}
              {i.isRx && <b className="ml-1 text-dz-red">Rx</b>}
              {i.addons.length > 0 && <span className="block text-xs text-ink-3">+ {i.addons.map((a) => a.name).join(', ')}</span>}
            </span>
          </li>
        ))}
        {o.items.length > items.length && <li className="text-xs text-ink-3">{o.items.length - items.length} item(s) removed</li>}
        {o.note && <li className="mt-2 rounded-lg bg-dz-yellow-soft px-2 py-1 text-ink">“{o.note}”</li>}
        {(o.rejectReason || o.cancelReason) && <li className="mt-2 text-ink-2">Reason: {o.rejectReason ?? o.cancelReason}</li>}
      </ul>

      {/* Actions */}
      {hasFooter && (
      <footer className="space-y-2 border-t border-line bg-neutral-50/60 py-3 pl-5 pr-4" onClick={(e) => e.stopPropagation()}>
        {isNew && kitchen && (
          <div className="flex gap-2">
            <Button className="min-h-12 flex-1" onClick={() => onDialog('accept')}>Accept</Button>
            <Button variant="ghost" className="min-h-12" onClick={() => onDialog('reject')}>Reject</Button>
          </div>
        )}
        {isNew && !kitchen && <p className="text-sm text-ink-2">Waiting for the kitchen to accept.</p>}

        {cooking && (
          <>
            {kitchen && (
              <div className="flex flex-wrap items-center gap-2">
                {o.status === 'ACCEPTED' && <Button variant="ghost" className="min-h-10 text-sm" disabled={act.isPending} onClick={() => act.mutate({ action: 'preparing', label: `Start ${o.orderNumber}` })}>Start preparing</Button>}
                {o.status !== 'READY_SOON' && (
                  <span className="flex items-center gap-1 text-sm">
                    <span className="font-semibold text-ink-2">Ready in</span>
                    {[5, 10, 15].map((w) => (
                      <button key={w} type="button" disabled={act.isPending} onClick={() => act.mutate({ action: 'ready-soon', body: { windowMinutes: w }, label: `Ready soon ${o.orderNumber}` })} className="h-9 rounded-lg border-[1.5px] border-line bg-white px-2 font-bold hover:border-black">
                        {w === 5 ? '3–5' : w === 10 ? '5–10' : '10–15'}
                      </button>
                    ))}
                    <span className="text-xs text-ink-3">min</span>
                  </span>
                )}
                {o.status === 'READY_SOON' && <span className="text-sm font-semibold text-amber-800">Ready within {o.readySoonWindowMin} min — rider told</span>}
                <button type="button" className="ml-auto text-sm font-bold text-ink-3 underline" onClick={() => onDialog('delay')}>Delay</button>
              </div>
            )}
            <button type="button" onClick={() => onDialog('ready')} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-dz-green text-lg font-extrabold tracking-wide text-white shadow-[0_3px_0_#0b4d2a] transition-transform active:translate-y-0.5">
              <CheckCircle2 className="h-6 w-6" /> ORDER READY
            </button>
          </>
        )}

        {o.status === 'READY' && o.fulfilmentType === 'DELIVERY' && (
          <>
            <RiderPanel order={o} now={now} />
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => (e.preventDefault(), act.mutate({ action: 'handover', body: { otp: code }, label: `Hand over ${o.orderNumber}` }, { onSuccess: () => setCode('') }))}
            >
              <Field label="Rider’s 4-digit code" className="flex-1">
                <TextInput inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••" aria-label={`Handover code for ${o.orderNumber}`} />
              </Field>
              <Button className="min-h-12" disabled={code.length !== 4 || act.isPending}>Hand over</Button>
            </form>
          </>
        )}
        {o.status === 'READY' && o.fulfilmentType === 'PICKUP' && (
          <form className="space-y-2" onSubmit={(e) => (e.preventDefault(), act.mutate({ action: 'pickup-complete', body: { otp: code }, label: `Collected ${o.orderNumber}` }, { onSuccess: () => setCode('') }))}>
            {o.payment.collectCash > 0 && <p className="rounded-lg bg-dz-yellow-soft px-2 py-1 text-sm font-bold">Collect {inr(o.payment.collectCash)} in cash</p>}
            <div className="flex items-end gap-2">
              <Field label="Customer’s pickup code" className="flex-1">
                <TextInput inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••" aria-label={`Pickup code for ${o.orderNumber}`} />
              </Field>
              <Button className="min-h-12" disabled={code.length !== 4 || act.isPending}>Collected</Button>
            </div>
          </form>
        )}
        {onRoad && o.rider && <p className="text-sm text-ink-2">{RIDER[o.rider.taskStatus]}{o.rider.name ? ` · ${o.rider.name}` : ''}</p>}
        {act.error && !(act.error instanceof QueuedOffline) && <ErrorText>{errorMessageOf(act.error)}</ErrorText>}
      </footer>
      )}
    </article>
  );
}

const STEPS = [
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY_SOON', label: 'Ready soon' },
  { key: 'READY', label: 'Ready' },
];
function PrepStepper({ status }: { status: string }) {
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-center gap-1 px-5 pb-3 text-[11px] font-bold" aria-label="Preparation progress">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex flex-1 flex-col gap-1">
          <span className={`h-1.5 rounded-full ${i <= at ? 'bg-ink' : 'bg-line'}`} />
          <span className={i === at ? 'text-ink' : 'text-ink-3'}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Where the rider is; once they arrive, a timer shows how long they've been kept waiting. */
export function RiderPanel({ order: o, now }: { order: Order; now: number }) {
  const r = o.rider;
  if (!r) return <p className="text-sm text-ink-2">Finding a rider…</p>;
  const since = r.waitingSince ?? r.arrivedAt;
  const waited = since ? (now - new Date(since).getTime()) / 1000 : null;
  const here = r.taskStatus === 'ARRIVED_AT_PICKUP' || r.taskStatus === 'WAITING_AT_PICKUP';
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${here ? 'bg-dz-blue-soft' : 'bg-soft'}`}>
      <span className="flex items-center gap-2">
        <Bike className={`h-5 w-5 ${here ? 'text-dz-blue' : 'text-ink-3'}`} />
        <span>
          <b>{RIDER[r.taskStatus]}</b>
          {r.name && <span className="block text-xs text-ink-2">{r.name} · {r.phone}</span>}
        </span>
      </span>
      {here && waited != null && (
        <span className={`text-right font-extrabold tabular-nums ${waited > 300 ? 'text-dz-red' : 'text-dz-blue'}`} aria-label="Rider waiting time">
          {mmss(waited)}
          <span className="block text-[10px] font-bold uppercase">waiting</span>
        </span>
      )}
    </div>
  );
}

export function ActionDialog({ dialog, onClose }: { dialog: NonNullable<Dialog>; onClose: () => void }) {
  const { detail } = useStoreContext();
  const { order: o, kind } = dialog;
  const act = useOrderAction(o, onClose);
  const [prep, setPrep] = useState(o.prepMinutes ?? detail.store.defaultPrepMinutes ?? 15);
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState([false, false, false]);
  const [delay, setDelay] = useState(10);

  if (kind === 'accept') {
    const options = [...new Set([10, 15, 20, 30, 45, detail.store.defaultPrepMinutes].filter(Boolean))].sort((a, b) => a - b);
    return (
      <Modal title={`Accept ${o.orderNumber}`} onClose={onClose}>
        <p className="text-sm text-ink-2">How long will it take to prepare?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((m) => (
            <button key={m} type="button" onClick={() => setPrep(m)} className={`h-12 min-w-16 rounded-xl border-[1.5px] px-3 text-lg font-extrabold ${prep === m ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white'}`}>{m}<span className="ml-0.5 text-xs">min</span></button>
          ))}
        </div>
        <Button className="mt-5 w-full" autoFocus disabled={act.isPending} onClick={() => act.mutate({ action: 'accept', body: { prepMinutes: prep }, label: `Accept ${o.orderNumber}` })}>Accept · ready in {prep} min</Button>
        {act.error && !(act.error instanceof QueuedOffline) && <div className="mt-2"><ErrorText>{errorMessageOf(act.error)}</ErrorText></div>}
      </Modal>
    );
  }
  if (kind === 'reject') {
    return (
      <Modal title={`Reject ${o.orderNumber}?`} onClose={onClose}>
        <p className="text-sm text-ink-2">The customer is told and any payment is refunded. Frequent rejections affect your ranking.</p>
        <div className="mt-3 grid gap-2">
          {REJECT_REASONS.map((r) => (
            <label key={r.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 font-semibold ${reason === r.value ? 'border-black bg-dz-yellow-soft' : 'border-line'}`}>
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4" /> {r.label}
            </label>
          ))}
        </div>
        {reason === 'OTHER' && <TextInput className="mt-2" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Tell us why" />}
        <Button variant="primary" className="mt-4 w-full" disabled={!reason || (reason === 'OTHER' && note.trim().length < 2) || act.isPending} onClick={() => act.mutate({ action: 'reject', body: { reason, note: note || undefined }, label: `Reject ${o.orderNumber}` })}>Reject order</Button>
        {act.error && !(act.error instanceof QueuedOffline) && <div className="mt-2"><ErrorText>{errorMessageOf(act.error)}</ErrorText></div>}
      </Modal>
    );
  }
  if (kind === 'delay') {
    return (
      <Modal title={`Delay ${o.orderNumber}`} onClose={onClose}>
        <p className="text-sm text-ink-2">The customer and rider see the new time.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[5, 10, 15, 20, 30].map((m) => (
            <button key={m} type="button" onClick={() => setDelay(m)} className={`h-11 rounded-xl border-[1.5px] px-3 font-extrabold ${delay === m ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white'}`}>+{m} min</button>
          ))}
        </div>
        <TextInput className="mt-3" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Reason, e.g. Rush at the counter" />
        <Button className="mt-4 w-full" disabled={note.trim().length < 3 || act.isPending} onClick={() => act.mutate({ action: 'delay', body: { minutes: delay, reason: note }, label: `Delay ${o.orderNumber}` })}>Add {delay} minutes</Button>
        {act.error && !(act.error instanceof QueuedOffline) && <div className="mt-2"><ErrorText>{errorMessageOf(act.error)}</ErrorText></div>}
      </Modal>
    );
  }
  const labels = ['All items are in the bag', 'The bag is sealed', o.items.some((i) => i.isRx) ? 'Bill and prescription copy are inside' : 'The bill is inside'];
  return (
    <Modal title={`${o.orderNumber} ready?`} onClose={onClose}>
      <p className="text-sm text-ink-2">{o.fulfilmentType === 'PICKUP' ? 'The customer is told to come and collect.' : 'The rider is told to pick it up.'}</p>
      <div className="mt-3 grid gap-2">
        {labels.map((l, i) => (
          <label key={l} className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-3 font-semibold ${checks[i] ? 'border-dz-green bg-dz-green-soft' : 'border-line'}`}>
            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((x, j) => (j === i ? e.target.checked : x)))} className="h-5 w-5" /> {l}
          </label>
        ))}
      </div>
      <button type="button" disabled={!checks.every(Boolean) || act.isPending} onClick={() => act.mutate({ action: 'ready', label: `Ready ${o.orderNumber}` })} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-dz-green text-lg font-extrabold text-white disabled:opacity-40">
        <CheckCircle2 className="h-6 w-6" /> ORDER READY
      </button>
      {act.error && !(act.error instanceof QueuedOffline) && <div className="mt-2"><ErrorText>{errorMessageOf(act.error)}</ErrorText></div>}
    </Modal>
  );
}
