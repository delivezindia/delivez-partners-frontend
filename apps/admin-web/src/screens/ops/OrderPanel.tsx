import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../../lib/api';
import {
  istTime,
  RETURN_REASON_LABEL,
  RIDER_NEXT,
  rupees,
  STATUS_LABEL,
  type AdminOrderDetail,
  type OrderStatus,
  type ReturnReason,
  CANCELLABLE,
  FAIL_REASONS,
  FAULT_LABEL,
  OPS_CANCEL,
} from '../../lib/orders';
import { CAN, can } from '../../lib/types';
import { Button, ErrorBox, inputCls, Modal } from '../../components/ui';
import { useMe } from '../Layout';
import { clock, LEVEL, useNow, type BoardItem } from '../../lib/ops';

// Order detail panel shared by the live board and the order list.
export function Chip({ status }: { status: OrderStatus }) {
  const s = STATUS_LABEL[status];
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

export function OrderPanel({ id, onClose, live }: { id: string; onClose: () => void; live?: BoardItem }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-order', id], queryFn: () => api<AdminOrderDetail>(`/admin/orders/${id}`), refetchInterval: 10_000 });
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [failing, setFailing] = useState(false);
  const refresh = (o: AdminOrderDetail) => {
    qc.setQueryData(['admin-order', id], o);
    void qc.invalidateQueries({ queryKey: ['admin-orders'] });
  };
  const cancel = useMutation({
    mutationFn: () => api<AdminOrderDetail>(`/admin/orders/${id}/cancel`, { method: 'POST', body: { code, note: note.trim() || undefined } }),
    onSuccess: (o) => (refresh(o), setCancelling(false)),
  });
  // Assign answers with a short confirmation (not the order), so reload the order afterwards.
  const assign = useMutation({
    mutationFn: (taskId: string) => api<{ taskId: string; status: string }>(`/admin/tasks/${taskId}/assign`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-order', id] });
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
  const step = useMutation({
    mutationFn: (v: { taskId: string; status: string; code?: string }) => api<AdminOrderDetail>(`/admin/tasks/${v.taskId}/status`, { method: 'POST', body: { status: v.status, code: v.code } }),
    onSuccess: (o) => (refresh(o), setFailing(false)),
  });
  const o = q.data;
  const canCancel = can(me?.role, CAN.orderOps);
  const canRide = can(me?.role, CAN.operate);
  const err = cancel.error ?? assign.error ?? step.error;

  return (
    <Modal title={o ? `${o.orderNumber} · ${o.store.name}` : 'Order'} onClose={onClose} wide>
      <ErrorBox error={q.error ? errorText(q.error) : null} />
      {o && (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Chip status={o.status} />
            <span className="font-semibold">{o.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</span>
            <span className="text-ink-3">· via {o.channel.toLowerCase().replace(/_/g, ' ')}</span>
            {o.isTestOrder && <span className="rounded bg-soft px-1.5 text-xs font-bold uppercase text-ink-3">test order</span>}
            <Link to={`/stores/${o.store.id}`} className="ml-auto font-bold text-dz-red hover:underline" onClick={onClose}>
              Open store →
            </Link>
          </div>

          {live && live.alert.level !== 'NORMAL' && <AlertSection live={live} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-soft p-3">
              <p className="font-bold">Items</p>
              <ul className="mt-1 space-y-0.5">
                {o.items.map((i) => (
                  <li key={i.id} className={`flex justify-between gap-2 ${i.unavailable ? 'text-ink-3 line-through' : ''}`}>
                    <span>
                      {i.qty} × {i.name}
                      {i.variant ? ` (${i.variant})` : ''}
                    </span>
                    <span className="tabular-nums">{rupees(i.lineTotal)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-line pt-1 font-extrabold">
                  <span>
                    Total · {o.payment.mode} ({o.payment.status.toLowerCase().replace(/_/g, ' ')})
                  </span>
                  <span>{rupees(o.totals.grandTotal)}</span>
                </li>
              </ul>
              {o.note && <p className="mt-2 rounded bg-white px-2 py-1">“{o.note}”</p>}
            </div>
            <div className="rounded-xl bg-soft p-3">
              <p className="font-bold">Customer & times</p>
              <p className="mt-1">
                {o.customer.name} · {o.customer.phone}
                {o.deliveryArea ? ` · ${o.deliveryArea}` : ''}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {Object.entries(o.times)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-ink-3">
                        {k
                          .replace(/At$/, '')
                          .replace(/([A-Z])/g, ' $1')
                          .toLowerCase()}
                      </dt>
                      <dd className="font-semibold">{istTime(v)}</dd>
                    </div>
                  ))}
              </dl>
              {(o.rejectReason || o.cancelReason) && !o.cancellation && <p className="mt-2 font-semibold text-dz-red">Reason: {o.rejectReason ?? o.cancelReason}</p>}
            </div>
          </div>

          {o.fulfilmentType === 'DELIVERY' && (
            <div
              className={`rounded-xl border p-3 ${live && RIDER_KINDS.includes(live.alert.kind ?? '') && live.alert.level !== 'NORMAL' ? 'border-[#d03b3b] bg-[#fbe9e9]/50' : 'border-line'}`}
              data-rider
            >
              <p className="font-bold">Rider</p>
              <p className="mt-1">
                {o.task ? o.task.status.toLowerCase().replace(/_/g, ' ') : 'No delivery task yet (created when the store accepts)'}
                {o.rider?.name ? ` · ${o.rider.name} (${o.rider.phone})` : ''}
              </p>
              {canRide && o.task && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {['CREATED', 'SEARCHING_RIDER'].includes(o.task.status) && (
                    <Button variant="dark" className="min-h-9 px-3 text-xs" disabled={assign.isPending} onClick={() => assign.mutate(o.task!.id)}>
                      Assign test rider
                    </Button>
                  )}
                  {(RIDER_NEXT[o.task.status] ?? []).map((n) => (
                    <Button
                      key={n.status}
                      variant="outline"
                      className="min-h-9 px-3 text-xs"
                      disabled={step.isPending}
                      onClick={() => (n.status === 'FAILED' ? setFailing(true) : step.mutate({ taskId: o.task!.id, status: n.status }))}
                    >
                      {n.label}
                    </Button>
                  ))}
                </div>
              )}
              {failing && o.task && (
                <div className="mt-3 rounded-lg border border-dz-red/30 bg-dz-red-soft/40 p-3" data-fail>
                  <p className="text-xs font-bold">Why did the delivery fail?</p>
                  <div className="mt-2 grid gap-1.5">
                    {FAIL_REASONS.map((f) => (
                      <button
                        key={f.code}
                        type="button"
                        disabled={step.isPending}
                        onClick={() => step.mutate({ taskId: o.task!.id, status: 'FAILED', code: f.code })}
                        className="rounded-lg border border-line bg-white px-3 py-2 text-left hover:border-dz-red"
                      >
                        <b className="block text-sm">{f.label}</b>
                        <span className="text-xs text-ink-3">{f.outcome}</span>
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-2 min-h-8 px-3 text-xs" onClick={() => setFailing(false)}>
                    Back
                  </Button>
                </div>
              )}
            </div>
          )}

          {o.returnWindow && <DoorstepCheck order={o} canAct={canRide} onChange={refresh} />}

          {o.cancellation && (
            <div className="rounded-xl border border-dz-red/30 bg-dz-red-soft/40 p-3" data-outcome>
              <p className="font-bold">Why it ended: {o.cancellation.text}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-ink-3">Fault</dt>
                  <dd className="font-semibold">{o.cancellation.fault ? FAULT_LABEL[o.cancellation.fault] : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Refunded to customer</dt>
                  <dd className="font-semibold">{rupees(o.cancellation.refunded)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Store compensation</dt>
                  <dd className="font-semibold">{rupees(o.cancellation.storeCompensation)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Unpaid by customer (COD)</dt>
                  <dd className="font-semibold">{rupees(o.cancellation.customerDue)}</dd>
                </div>
              </dl>
            </div>
          )}

          {o.codes && (
            <p className="rounded-xl bg-dz-yellow-soft px-3 py-2 text-xs" data-codes>
              <b>Development only —</b> handover code <b>{o.codes.handoverOtp ?? '—'}</b> · pickup code <b>{o.codes.pickupOtp ?? '—'}</b> · delivery code <b>{o.codes.deliveryOtp ?? '—'}</b>
            </p>
          )}
          {o.codes?.handoverQr && o.status === 'READY' && <HandoverQr payload={o.codes.handoverQr} />}

          <details>
            <summary className="cursor-pointer font-bold">Timeline ({o.timeline.length})</summary>
            <ol className="mt-2 space-y-1.5">
              {o.timeline.map((t, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <b>{STATUS_LABEL[t.to].label}</b>
                  {t.reason && <span className="text-ink-2"> — {t.reason}</span>}
                  <span className="block text-xs text-ink-3">
                    {t.actorType.toLowerCase()} · {istTime(t.at)}
                  </span>
                </li>
              ))}
            </ol>
          </details>

          <ErrorBox error={err ? errorText(err) : null} />
          {canCancel && CANCELLABLE.includes(o.status) && (
            <div className="border-t border-line pt-3">
              {!cancelling ? (
                <Button variant="outline" className="min-h-9 text-sm" onClick={() => setCancelling(true)}>
                  Cancel order…
                </Button>
              ) : (
                <div className="space-y-2" data-cancel>
                  <p className="text-xs font-bold">Why is it being cancelled? This decides the refund and whose record it goes on.</p>
                  <div className="grid gap-1.5">
                    {OPS_CANCEL.map((c) => (
                      <label key={c.code} className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 ${code === c.code ? 'border-dz-red bg-dz-red-soft/40' : 'border-line'}`}>
                        <input type="radio" name="cancel-code" value={c.code} checked={code === c.code} onChange={() => setCode(c.code)} className="mt-1 accent-dz-red" />
                        <span>
                          <b className="block text-sm">{c.label}</b>
                          <span className="text-xs text-ink-3">{c.outcome}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <input className={inputCls} placeholder="Note (optional — the store sees it)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Cancel note" maxLength={300} />
                  <div className="flex gap-2">
                    <Button className="min-h-10 text-sm" disabled={!code || cancel.isPending} onClick={() => cancel.mutate()}>
                      Cancel order
                    </Button>
                    <Button variant="outline" className="min-h-10 text-sm" onClick={() => setCancelling(false)}>
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Development only: the QR the rider app will show, so the store's scanner can be tried end to end. */
function HandoverQr({ payload }: { payload: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void import('qrcode').then((q) => q.toDataURL(payload, { margin: 2, width: 220 })).then((url) => live && setSrc(url));
    return () => {
      live = false;
    };
  }, [payload]);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-dz-yellow-soft px-3 py-2 text-xs" data-handover-qr>
      {src && <img src={src} alt="Rider handover QR" className="h-28 w-28 rounded bg-white" />}
      <span>
        <b>Rider handover QR (development only).</b> Show this to the store's “Scan QR” camera, or save it and use “Scan from a photo”.
      </span>
    </div>
  );
}

const OUTCOME: Record<string, string> = { NO_RETURN: 'Customer was happy — nothing returned', RETURNED: 'Items returned at the door', EXPIRED: 'Time ran out — nothing returned' };

/**
 * The rider's 5-minute doorstep check (played by ops until the rider app exists): the customer checks the
 * items; the rider either leaves ("Customer is happy") or takes back damaged / wrong / expired items.
 */
function DoorstepCheck({ order: o, canAct, onChange }: { order: AdminOrderDetail; canAct: boolean; onChange: (o: AdminOrderDetail) => void }) {
  const [now, setNow] = useState(Date.now());
  const [taking, setTaking] = useState(false);
  const [pick, setPick] = useState<Record<string, { qty: number; reason: ReturnReason }>>({});
  const w = o.returnWindow!;
  const open = w.open && new Date(w.endsAt).getTime() > now;
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);
  const close = useMutation({ mutationFn: () => api<AdminOrderDetail>(`/admin/orders/${o.id}/return-window/close`, { method: 'POST' }), onSuccess: onChange });
  const take = useMutation({
    mutationFn: () =>
      api<AdminOrderDetail>(`/admin/orders/${o.id}/returns`, {
        method: 'POST',
        body: {
          items: Object.entries(pick)
            .filter(([, v]) => v.qty > 0)
            .map(([itemId, v]) => ({ itemId, ...v })),
        },
      }),
    onSuccess: (r) => (onChange(r), setTaking(false), setPick({})),
  });
  const left = Math.max(0, Math.round((new Date(w.endsAt).getTime() - now) / 1000));
  const items = o.items.filter((i) => !i.unavailable && i.qty - i.returnedQty > 0);
  const total = Object.entries(pick).reduce((n, [id, v]) => n + (o.items.find((i) => i.id === id)?.unitPrice ?? 0) * v.qty, 0);
  return (
    <div className={`rounded-xl border p-3 ${open ? 'border-amber-400 bg-amber-50' : 'border-line'}`} data-doorstep={open ? 'open' : 'closed'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">Doorstep check</p>
        {open ? (
          <span className="text-xl font-extrabold tabular-nums" data-timer>
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        ) : (
          <span className="text-xs font-semibold text-ink-3">{OUTCOME[w.outcome ?? 'EXPIRED']}</span>
        )}
      </div>
      {open && (
        <p className="text-xs text-ink-2">
          The rider waits while the customer checks the items. Damaged, wrong or expired items go back with the rider; the customer is refunded{' '}
          {o.payment.mode === 'COD' ? 'in cash by the rider' : 'online'}.
        </p>
      )}
      {open && canAct && !taking && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="green" className="min-h-9 px-3 text-xs" disabled={close.isPending} onClick={() => close.mutate()}>
            Customer is happy — leave
          </Button>
          <Button variant="outline" className="min-h-9 px-3 text-xs" onClick={() => setTaking(true)}>
            Take back items…
          </Button>
        </div>
      )}
      {open && taking && (
        <div className="mt-3 space-y-2">
          {items.map((i) => {
            const p = pick[i.id] ?? { qty: 0, reason: 'DAMAGED' as ReturnReason };
            const max = i.qty - i.returnedQty;
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm" data-return-item={i.name}>
                <span className="min-w-[10rem] flex-1">
                  {i.name} <span className="text-ink-3">× {max}</span>
                </span>
                <select
                  aria-label={`Quantity of ${i.name} to take back`}
                  className="h-9 rounded-lg border border-line bg-white px-2"
                  value={p.qty}
                  onChange={(e) => setPick({ ...pick, [i.id]: { ...p, qty: Number(e.target.value) } })}
                >
                  {Array.from({ length: max + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Why ${i.name} is returned`}
                  className="h-9 rounded-lg border border-line bg-white px-2"
                  value={p.reason}
                  onChange={(e) => setPick({ ...pick, [i.id]: { ...p, reason: e.target.value as ReturnReason } })}
                >
                  {(Object.keys(RETURN_REASON_LABEL) as ReturnReason[])
                    .filter((r) => r !== 'UNDELIVERED')
                    .map((r) => (
                      <option key={r} value={r}>
                        {RETURN_REASON_LABEL[r]}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="red" className="min-h-9 px-3 text-xs" disabled={!total || take.isPending} onClick={() => take.mutate()}>
              Take back · refund {rupees(total)}
            </Button>
            <Button variant="outline" className="min-h-9 px-3 text-xs" onClick={() => (setTaking(false), setPick({}))}>
              Back
            </Button>
          </div>
        </div>
      )}
      {(close.error || take.error) && <p className="mt-2 text-sm font-semibold text-dz-red">{errorText(close.error ?? take.error)}</p>}
      {o.returns.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs" data-returns>
          {o.returns.map((r) => (
            <li key={r.id}>
              {r.qty} × {r.name} · {RETURN_REASON_LABEL[r.reason]} · {rupees(r.amount)} {r.refundMethod === 'CASH_AT_DOOR' ? 'cash back at the door' : 'refunded online'} ·{' '}
              <b>{r.status === 'WITH_RIDER' ? 'with rider' : r.status === 'RECEIVED' ? (r.restocked ? 'back on shelf' : 'received damaged') : 'nothing to return'}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const RIDER_KINDS = ['NO_RIDER', 'RIDER_TO_STORE', 'DELIVERY', 'DOOR'];
const RELEASABLE = ['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'WAITING_AT_PICKUP'];

/** Shop → rider → customer, with the leg that is late drawn in red. */
function RiderPath({ leg }: { leg: 'TO_SHOP' | 'TO_CUSTOMER' }) {
  const seg = (late: boolean) => <span className={`h-1.5 flex-1 rounded-full ${late ? 'bg-[#d03b3b]' : 'bg-black/15'}`} aria-hidden />;
  const dot = (label: string) => (
    <span className="flex flex-col items-center gap-1 text-[11px] font-bold text-ink-2">
      <span className="h-3 w-3 rounded-full bg-black" />
      {label}
    </span>
  );
  return (
    <div className="flex items-start gap-2 pt-1" data-rider-path={leg} aria-label={leg === 'TO_SHOP' ? 'Late on the way to the shop' : 'Late on the way to the customer'}>
      {dot('Shop')}
      <span className="mt-1 flex flex-1">{seg(leg === 'TO_SHOP')}</span>
      {dot('🚴 Rider')}
      <span className="mt-1 flex flex-1">{seg(leg === 'TO_CUSTOMER')}</span>
      {dot('Customer')}
    </div>
  );
}

/** Alert state for this order: prep delay (red prep timer + adjust) or rider delay (red path + swap / call). */
function AlertSection({ live }: { live: BoardItem }) {
  const now = useNow();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [msg, setMsg] = useState('');
  const L = LEVEL[live.alert.level];
  const t = clock(live.alert.deadline, now);
  const run = useMutation({
    mutationFn: async (a: { path: string; body?: unknown; ok: string }) => (await api(a.path, { method: 'POST', body: a.body ?? {} }), a.ok),
    onSuccess: (ok) => {
      setMsg(ok);
      void qc.invalidateQueries({ queryKey: ['ops-board'] });
      void qc.invalidateQueries({ queryKey: ['admin-order', live.id] });
    },
    onError: (e) => setMsg(errorText(e) ?? 'Failed'),
  });
  const ack = (action: string) =>
    live.record && void api(`/admin/ops/alerts/${live.record.id}/ack`, { method: 'POST', body: { action } }).then(() => qc.invalidateQueries({ queryKey: ['ops-board'] }));
  const canOperate = can(me?.role, CAN.operate);
  const kind = live.alert.kind ?? '';
  const prep = kind === 'PREP';
  const rider = RIDER_KINDS.includes(kind) || /rider waiting/i.test(live.alert.reason);
  const btn = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-black/15 bg-white px-2.5 text-xs font-bold hover:border-black disabled:opacity-40';
  return (
    <div
      className={`rounded-xl border-2 p-3 ${live.alert.level === 'BREACHED' ? 'border-[#d03b3b] bg-[#fbe9e9]' : live.alert.level === 'LIKELY' ? 'border-[#ec835a] bg-[#fdf0ea]' : 'border-[#fab219] bg-dz-yellow-soft'}`}
      data-alert-section={kind}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide ${L.text}`}>
          <L.icon className="h-4 w-4" aria-hidden /> {L.label}
        </p>
        {t && (
          <p className={`text-xl font-extrabold tabular-nums ${prep || t.over ? 'text-[#b02a2a]' : ''}`} data-prep-timer={prep ? '1' : undefined}>
            {prep ? 'Prep timer ' : ''}⏱ {t.text}
          </p>
        )}
      </div>
      <p className="mt-1 text-base font-extrabold" data-alert-reason>
        {live.alert.reason}
      </p>
      {rider && live.fulfilmentType === 'DELIVERY' && <RiderPath leg={['DELIVERY', 'DOOR'].includes(kind) ? 'TO_CUSTOMER' : 'TO_SHOP'} />}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {prep && canOperate && ['ACCEPTED', 'PREPARING', 'READY_SOON'].includes(live.status) && (
          <>
            <span className="self-center text-xs font-bold">Adjust prep time:</span>
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                className={btn}
                disabled={run.isPending}
                onClick={() => run.mutate({ path: `/admin/ops/orders/${live.id}/prep`, body: { minutes: m }, ok: `Prep time +${m} min` })}
                data-panel-prep={m}
              >
                +{m} min
              </button>
            ))}
          </>
        )}
        {rider && canOperate && live.task && (
          <button
            type="button"
            className={btn}
            disabled={run.isPending || !RELEASABLE.includes(live.task.status)}
            title={RELEASABLE.includes(live.task.status) ? '' : 'Only before pickup, with a rider assigned'}
            onClick={() => run.mutate({ path: `/admin/ops/tasks/${live.task!.id}/release`, ok: 'Rider released — assign the next rider below' })}
            data-panel-swap
          >
            🔁 Swap rider
          </button>
        )}
        {rider && live.rider && (
          <a href={`tel:${live.rider.phone}`} className={btn} onClick={() => ack('CALLED_RIDER')}>
            🚴 Call rider
          </a>
        )}
        {!rider && live.store.phone && (
          <a href={`tel:${live.store.phone}`} className={btn} onClick={() => ack('CALLED_STORE')}>
            📞 Call restaurant
          </a>
        )}
      </div>
      {msg && <p className="mt-2 text-xs font-bold text-ink-2">{msg}</p>}
    </div>
  );
}
