import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, ShoppingBag } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { ACTIVE, FILTERS, istTime, RETURN_REASON_LABEL, RIDER_NEXT, rupees, STATUS_LABEL, type AdminOrderDetail, type AdminOrderList, type OrderStatus, type ReturnReason } from '../lib/orders';
import { CAN, can } from '../lib/types';
import { Button, Card, Empty, ErrorBox, inputCls, Modal, PageHead } from '../components/ui';
import { useMe } from './Layout';

function Chip({ status }: { status: OrderStatus }) {
  const s = STATUS_LABEL[status];
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

/** Every order across the admin's cities: find, inspect, cancel, and (in development) play the rider. */
export default function Orders() {
  const [status, setStatus] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const search = q.trim().replace(/^#/, '');
  const list = useInfiniteQuery({
    queryKey: ['admin-orders', status, search],
    queryFn: ({ pageParam }) =>
      api<AdminOrderList>(`/admin/orders?${new URLSearchParams({ limit: '50', ...(status ? { status } : {}), ...(search.length >= 3 ? { q: search } : {}), ...(pageParam ? { before: pageParam } : {}) })}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    refetchInterval: 20_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const counts = list.data?.pages[0]?.counts;

  return (
    <div className="space-y-5">
      <PageHead title="Orders" sub="All orders in your cities. Click an order for details, timeline and actions." />
      {counts && (
        <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
          <Stat label="Active now" value={counts.active} />
          <Stat label="Placed today" value={counts.today} />
          <Stat label="Missed today" value={counts.missedToday} warn={counts.missedToday > 0} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.label} type="button" onClick={() => setStatus(f.value)} aria-pressed={status === f.value} className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-bold ${status === f.value ? 'border-black bg-black text-white' : 'border-line bg-white'}`}>
            {f.label}
          </button>
        ))}
        <div className="ml-auto w-56">
          <input className={inputCls} placeholder="Order number, e.g. DEL-123" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by order number" />
        </div>
      </div>
      <ErrorBox error={list.error ? errorText(list.error) : null} />
      <Card className="overflow-x-auto p-0">
        {list.data && rows.length === 0 ? (
          <div className="p-5"><Empty>No orders match.</Empty></div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Store</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Placed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-soft" data-order={o.orderNumber}>
                  <td className="px-4 py-2.5">
                    <button type="button" className="font-bold hover:underline" onClick={() => setOpenId(o.id)}>{o.orderNumber}</button>
                    {o.isTestOrder && <span className="ml-1.5 rounded bg-soft px-1 text-[10px] font-bold uppercase text-ink-3">test</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {o.store.name}
                    {o.store.city && <span className="block text-xs text-ink-3">{o.store.city}</span>}
                  </td>
                  <td className="px-4 py-2.5"><Chip status={o.status} /></td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1">{o.fulfilmentType === 'PICKUP' ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}{o.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{rupees(o.grandTotal)}<span className="block text-xs text-ink-3">{o.paymentMode}</span></td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{istTime(o.placedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {list.hasNextPage && (
        <Button variant="outline" className="w-full" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Load older orders'}
        </Button>
      )}
      {openId && <OrderPanel id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-[14px] border px-4 py-3 ${warn ? 'border-amber-400 bg-amber-50' : 'border-line bg-white'}`}>
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <b className="block text-2xl tabular-nums">{value}</b>
    </div>
  );
}

function OrderPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-order', id], queryFn: () => api<AdminOrderDetail>(`/admin/orders/${id}`), refetchInterval: 10_000 });
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const refresh = (o: AdminOrderDetail) => {
    qc.setQueryData(['admin-order', id], o);
    void qc.invalidateQueries({ queryKey: ['admin-orders'] });
  };
  const cancel = useMutation({ mutationFn: () => api<AdminOrderDetail>(`/admin/orders/${id}/cancel`, { method: 'POST', body: { reason } }), onSuccess: (o) => (refresh(o), setCancelling(false)) });
  // Assign answers with a short confirmation (not the order), so reload the order afterwards.
  const assign = useMutation({
    mutationFn: (taskId: string) => api<{ taskId: string; status: string }>(`/admin/tasks/${taskId}/assign`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-order', id] });
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
  const step = useMutation({ mutationFn: (v: { taskId: string; status: string }) => api<AdminOrderDetail>(`/admin/tasks/${v.taskId}/status`, { method: 'POST', body: { status: v.status } }), onSuccess: refresh });
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
            <Link to={`/stores/${o.store.id}`} className="ml-auto font-bold text-dz-red hover:underline" onClick={onClose}>Open store →</Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-soft p-3">
              <p className="font-bold">Items</p>
              <ul className="mt-1 space-y-0.5">
                {o.items.map((i) => (
                  <li key={i.id} className={`flex justify-between gap-2 ${i.unavailable ? 'text-ink-3 line-through' : ''}`}>
                    <span>{i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ''}</span>
                    <span className="tabular-nums">{rupees(i.lineTotal)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-line pt-1 font-extrabold"><span>Total · {o.payment.mode} ({o.payment.status.toLowerCase().replace(/_/g, ' ')})</span><span>{rupees(o.totals.grandTotal)}</span></li>
              </ul>
              {o.note && <p className="mt-2 rounded bg-white px-2 py-1">“{o.note}”</p>}
            </div>
            <div className="rounded-xl bg-soft p-3">
              <p className="font-bold">Customer & times</p>
              <p className="mt-1">{o.customer.name} · {o.customer.phone}{o.deliveryArea ? ` · ${o.deliveryArea}` : ''}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {Object.entries(o.times).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-ink-3">{k.replace(/At$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd className="font-semibold">{istTime(v)}</dd></div>
                ))}
              </dl>
              {(o.rejectReason || o.cancelReason) && <p className="mt-2 font-semibold text-dz-red">Reason: {o.rejectReason ?? o.cancelReason}</p>}
            </div>
          </div>

          {o.fulfilmentType === 'DELIVERY' && (
            <div className="rounded-xl border border-line p-3" data-rider>
              <p className="font-bold">Rider</p>
              <p className="mt-1">{o.task ? o.task.status.toLowerCase().replace(/_/g, ' ') : 'No delivery task yet (created when the store accepts)'}{o.rider?.name ? ` · ${o.rider.name} (${o.rider.phone})` : ''}</p>
              {canRide && o.task && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {['CREATED', 'SEARCHING_RIDER'].includes(o.task.status) && (
                    <Button variant="dark" className="min-h-9 px-3 text-xs" disabled={assign.isPending} onClick={() => assign.mutate(o.task!.id)}>Assign test rider</Button>
                  )}
                  {(RIDER_NEXT[o.task.status] ?? []).map((n) => (
                    <Button key={n.status} variant="outline" className="min-h-9 px-3 text-xs" disabled={step.isPending} onClick={() => step.mutate({ taskId: o.task!.id, status: n.status })}>{n.label}</Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {o.returnWindow && <DoorstepCheck order={o} canAct={canRide} onChange={refresh} />}

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
                  <b>{STATUS_LABEL[t.to].label}</b>{t.reason && <span className="text-ink-2"> — {t.reason}</span>}
                  <span className="block text-xs text-ink-3">{t.actorType.toLowerCase()} · {istTime(t.at)}</span>
                </li>
              ))}
            </ol>
          </details>

          <ErrorBox error={err ? errorText(err) : null} />
          {canCancel && ACTIVE.includes(o.status) && (
            <div className="border-t border-line pt-3">
              {!cancelling ? (
                <Button variant="outline" className="min-h-9 text-sm" onClick={() => setCancelling(true)}>Cancel order…</Button>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="Reason (the store and customer see this)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Cancel reason" />
                  <Button className="min-h-10 text-sm" disabled={reason.trim().length < 5 || cancel.isPending} onClick={() => cancel.mutate()}>Cancel order & refund</Button>
                  <Button variant="outline" className="min-h-10 text-sm" onClick={() => setCancelling(false)}>Back</Button>
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
    mutationFn: () => api<AdminOrderDetail>(`/admin/orders/${o.id}/returns`, { method: 'POST', body: { items: Object.entries(pick).filter(([, v]) => v.qty > 0).map(([itemId, v]) => ({ itemId, ...v })) } }),
    onSuccess: (r) => (onChange(r), setTaking(false), setPick({})),
  });
  const left = Math.max(0, Math.round((new Date(w.endsAt).getTime() - now) / 1000));
  const items = o.items.filter((i) => !i.unavailable && i.qty - i.returnedQty > 0);
  const total = Object.entries(pick).reduce((n, [id, v]) => n + (o.items.find((i) => i.id === id)?.unitPrice ?? 0) * v.qty, 0);
  return (
    <div className={`rounded-xl border p-3 ${open ? 'border-amber-400 bg-amber-50' : 'border-line'}`} data-doorstep={open ? 'open' : 'closed'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">Doorstep check</p>
        {open ? <span className="text-xl font-extrabold tabular-nums" data-timer>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span> : <span className="text-xs font-semibold text-ink-3">{OUTCOME[w.outcome ?? 'EXPIRED']}</span>}
      </div>
      {open && <p className="text-xs text-ink-2">The rider waits while the customer checks the items. Damaged, wrong or expired items go back with the rider; the customer is refunded {o.payment.mode === 'COD' ? 'in cash by the rider' : 'online'}.</p>}
      {open && canAct && !taking && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="green" className="min-h-9 px-3 text-xs" disabled={close.isPending} onClick={() => close.mutate()}>Customer is happy — leave</Button>
          <Button variant="outline" className="min-h-9 px-3 text-xs" onClick={() => setTaking(true)}>Take back items…</Button>
        </div>
      )}
      {open && taking && (
        <div className="mt-3 space-y-2">
          {items.map((i) => {
            const p = pick[i.id] ?? { qty: 0, reason: 'DAMAGED' as ReturnReason };
            const max = i.qty - i.returnedQty;
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm" data-return-item={i.name}>
                <span className="min-w-[10rem] flex-1">{i.name} <span className="text-ink-3">× {max}</span></span>
                <select aria-label={`Quantity of ${i.name} to take back`} className="h-9 rounded-lg border border-line bg-white px-2" value={p.qty} onChange={(e) => setPick({ ...pick, [i.id]: { ...p, qty: Number(e.target.value) } })}>
                  {Array.from({ length: max + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <select aria-label={`Why ${i.name} is returned`} className="h-9 rounded-lg border border-line bg-white px-2" value={p.reason} onChange={(e) => setPick({ ...pick, [i.id]: { ...p, reason: e.target.value as ReturnReason } })}>
                  {(Object.keys(RETURN_REASON_LABEL) as ReturnReason[]).map((r) => <option key={r} value={r}>{RETURN_REASON_LABEL[r]}</option>)}
                </select>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="red" className="min-h-9 px-3 text-xs" disabled={!total || take.isPending} onClick={() => take.mutate()}>Take back · refund {rupees(total)}</Button>
            <Button variant="outline" className="min-h-9 px-3 text-xs" onClick={() => (setTaking(false), setPick({}))}>Back</Button>
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
