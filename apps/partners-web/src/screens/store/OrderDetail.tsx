import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, LifeBuoy, Printer, Receipt, Replace, ShieldCheck, Trash2 } from 'lucide-react';
import { api, newIdempotencyKey } from '../../lib/api';
import { inr } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { clock, printKot, RETURN_REASON, STATUS, useOrder, type Order } from '../../lib/orders';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { SkeletonList, toast } from '../../components/feedback';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { openHealthFile } from '../../lib/labBookings';
import { fetchInvoice, printBill } from '../../lib/bill';
import { useProducts } from '../../lib/catalog';
import { istClock } from '../../lib/pharmacy';
import { useStoreContext } from './StoreLayout';
import { ActionDialog, OrderCard } from './Orders';

const TIMES: { key: keyof Order['times']; label: MsgKey }[] = [
  { key: 'placedAt', label: 'od.placed' },
  { key: 'acceptedAt', label: 'ord.st.ACCEPTED' },
  { key: 'preparingAt', label: 'ord.st.PREPARING' },
  { key: 'readySoonAt', label: 'ord.st.READY_SOON' },
  { key: 'readyAt', label: 'ord.st.READY' },
  { key: 'pickedUpAt', label: 'ord.st.PICKED_UP' },
  { key: 'deliveredAt', label: 'ord.st.DELIVERED' },
  { key: 'completedAt', label: 'ord.st.COMPLETED' },
  { key: 'cancelledAt', label: 'ord.st.CANCELLED' },
];

// P16 Order detail: the full card, every timestamp, bill, items you can mark unavailable, timeline.
export default function OrderDetail() {
  const { orderNo = '' } = useParams();
  const { storeId, detail, role } = useStoreContext();
  const { t } = useI18n();
  const { data: o, error, isLoading } = useOrder(storeId, orderNo);
  const [dialog, setDialog] = useState<{ kind: 'accept' | 'reject' | 'ready' | 'delay'; order: Order } | null>(null);
  const [removing, setRemoving] = useState<Order['items'][number] | null>(null);
  const editable = o && ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status) && role !== 'ACCOUNTANT';
  const canSeeRx = ['OWNER', 'MANAGER', 'PHARMACIST'].includes(role);
  const now = useTick(!!o?.substitutions?.some((s) => s.status === 'PROPOSED'));
  const bill = useMutation({
    mutationFn: () => fetchInvoice(storeId, o!.id),
    onSuccess: (inv) => void (printBill(inv) || toast.error(t('od.printFailed'))),
    onError: (e) => toast.error(errorMessageOf(e) ?? t('od.printFailed')),
  });
  const respond = useMutation({
    mutationFn: ({ subId, accept }: { subId: string; accept: boolean }) => api<Order>(`/dev/stores/${storeId}/orders/${o!.id}/substitutions/${subId}/respond`, { method: 'POST', body: { accept } }),
    onSuccess: (r) => qc.setQueryData(['order', storeId, r.orderNumber], r),
  });
  const qc = useQueryClient();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/stores/${storeId}/orders`} className="inline-flex items-center gap-1 font-bold text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {t('od.allOrders')}
        </Link>
        {o && (
          <span className="flex flex-wrap gap-2">
            <Link to={`/stores/${storeId}/help?order=${o.orderNumber}`} className="inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-bold text-ink-2 underline hover:text-ink">
              <LifeBuoy className="h-4 w-4" aria-hidden /> {t('help.reportProblem')}
            </Link>
            <Button variant="ghost" className="min-h-10 text-sm" disabled={bill.isPending} onClick={() => bill.mutate()}>
              <Receipt className="h-4 w-4" aria-hidden /> {t('gst.printBill')}
            </Button>
            <Button variant="ghost" className="min-h-10 text-sm" onClick={() => printKot(o, detail.store.name) || toast.error(t('od.printFailed'))}>
              <Printer className="h-4 w-4" /> {t('od.printKot')}
            </Button>
          </span>
        )}
      </div>
      {error && <ErrorText>{errorMessageOf(error)}</ErrorText>}
      {isLoading && <SkeletonList rows={3} />}
      {o && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <OrderCard order={o} detail onDialog={(kind) => setDialog({ kind, order: o })} />

            <section className="dz-card p-5">
              <h2 className="text-xl">{t('od.bill')}</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-1 ${i.unavailable ? 'text-ink-3 line-through' : ''}`}>
                    <span>
                      {i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ''} <span className="text-ink-3">@ {inr(i.unitPrice)}</span>
                      {i.unavailable && <span className="ml-1 text-xs font-bold no-underline">{t('od.removed')}</span>}
                      {!!i.returnedQty && <span className="ml-1 rounded bg-dz-red-soft px-1 text-xs font-bold text-dz-red">{t('ret.returnedTag', { n: i.returnedQty })}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <b className="tabular-nums">{inr(i.lineTotal)}</b>
                      {(editable || o.status === 'READY_SOON') && !i.unavailable && !o.substitutions?.some((s) => s.itemId === i.id && s.status === 'PROPOSED') && (
                        <button type="button" className="text-xs font-bold text-dz-red underline" onClick={() => setRemoving(i)}>{t('od.unavailable')}</button>
                      )}
                    </span>
                    {o.substitutions?.filter((s) => s.itemId === i.id).map((s) => (
                      <span key={s.id} className={`basis-full rounded-lg px-2 py-1 text-xs no-underline ${s.status === 'PROPOSED' ? 'bg-amber-50 text-amber-900' : s.status === 'ACCEPTED' ? 'bg-dz-green-soft text-dz-green' : 'bg-soft text-ink-3'}`} data-sub={s.status}>
                        <Replace className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        {s.status === 'PROPOSED'
                          ? t('sub.waiting', { name: `${s.qty} × ${s.name}`, time: mmss((new Date(s.respondBy).getTime() - now) / 1000) })
                          : s.status === 'ACCEPTED'
                            ? t('sub.accepted', { name: `${s.qty} × ${s.name}` })
                            : s.status === 'DECLINED'
                              ? t('sub.declined', { name: s.name })
                              : t('sub.expired', { name: s.name })}
                        {s.status === 'PROPOSED' && import.meta.env.DEV && (
                          <span className="ml-2 inline-flex gap-2">
                            <button type="button" className="font-bold underline" disabled={respond.isPending} onClick={() => respond.mutate({ subId: s.id, accept: true })}>{t('sub.devAccept')}</button>
                            <button type="button" className="font-bold underline" disabled={respond.isPending} onClick={() => respond.mutate({ subId: s.id, accept: false })}>{t('sub.devDecline')}</button>
                          </span>
                        )}
                      </span>
                    ))}
                  </li>
                ))}
                <li className="flex justify-between border-t border-line pt-1.5 text-ink-2"><span>{t('od.items')}</span><span>{inr(o.totals.items)}</span></li>
                {o.totals.packaging > 0 && <li className="flex justify-between text-ink-2"><span>{t('od.packaging')}</span><span>{inr(o.totals.packaging)}</span></li>}
                {o.totals.delivery > 0 && <li className="flex justify-between text-ink-2"><span>{t('ord.delivery')}</span><span>{inr(o.totals.delivery)}</span></li>}
                {o.totals.discount > 0 && <li className="flex justify-between text-dz-green"><span>{t('od.discount')}</span><span>−{inr(o.totals.discount)}</span></li>}
                <li className="flex justify-between text-base font-extrabold"><span>{o.payment.mode === 'COD' ? t('od.totalCash') : t('od.totalOnline')}</span><span>{inr(o.totals.grandTotal)}</span></li>
              </ul>
              <p className="mt-2 text-xs text-ink-3">{t('od.customerLine', { name: o.customer.name, phone: o.customer.phone, channel: o.channel.toLowerCase().replace(/_/g, ' ') })}</p>
            </section>
          </div>

          <div className="space-y-5">
            {o.cancellation && (
              <section className="dz-card border-l-4 border-dz-red p-5" data-cancellation>
                <h2 className="text-xl">{t('ord.cx.title')}</h2>
                <p className="mt-1 font-semibold">{o.cancellation.text}</p>
                {o.cancellation.storeCompensation > 0 && <p className="mt-2 rounded-lg bg-dz-green-soft px-3 py-2 text-sm font-semibold text-dz-green">{t('ord.cx.comp', { amount: inr(o.cancellation.storeCompensation) })}</p>}
                {o.cancellation.fault === 'STORE' && <p className="mt-2 text-sm text-ink-2">{t('ord.cx.storeFault')}</p>}
              </section>
            )}
            {(o.returnWindow || (o.returns?.length ?? 0) > 0) && <ReturnsCard order={o} />}
            {o.rx && (
              <section className="dz-card p-5" data-rx-section>
                <h2 className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-dz-blue" aria-hidden /> {t('lb.rx')}</h2>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-ink-3">{t('lb.rxStatusLabel')}</dt><dd className="font-bold">{t(o.rx.status === 'APPROVED' ? 'rx.approved' : o.rx.status === 'REJECTED' ? 'rx.rejected' : o.rx.status === 'EXPIRED' ? 'rx.expired' : 'rx.status')}</dd></div>
                  {o.rx.reviewedBy && <div className="flex justify-between gap-3"><dt className="text-ink-3">{t('rx.pharmacist')}</dt><dd className="text-right font-semibold">{o.rx.reviewedBy.name} ({o.rx.reviewedBy.registrationNo}){o.rx.reviewedAt ? ` · ${istClock(o.rx.reviewedAt)}` : ''}</dd></div>}
                  {o.rx.doctorName && <div className="flex justify-between gap-3"><dt className="text-ink-3">{t('rx.doctor')}</dt><dd className="text-right font-semibold">{o.rx.doctorName} ({o.rx.doctorRegNo}){o.rx.issuedOn ? ` · ${o.rx.issuedOn.slice(0, 10)}` : ''}</dd></div>}
                  {o.rx.notes && <div className="rounded bg-soft px-2 py-1 text-ink-2">{o.rx.notes}</div>}
                  {o.rx.rejectionReason && <div className="text-dz-red">{o.rx.rejectionReason}</div>}
                </dl>
                {canSeeRx && (
                  <Button variant="ghost" className="mt-3 min-h-10 text-sm" onClick={() => void openHealthFile(`/partners/stores/${storeId}/orders/${o.id}/prescription`).catch((e) => toast.error(errorMessageOf(e) ?? t('lb.openFailed')))}>
                    <Eye className="h-4 w-4" aria-hidden /> {t('lb.openRx')}
                  </Button>
                )}
              </section>
            )}
            <section className="dz-card p-5">
              <h2 className="text-xl">{t('od.times')}</h2>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                {TIMES.filter((tm) => o.times[tm.key] && !(tm.key === 'pickedUpAt' && o.fulfilmentType === 'PICKUP')).map((tm) => (
                  <div key={tm.key}>
                    <dt className="text-xs font-semibold text-ink-3">{t(tm.label)}</dt>
                    <dd className="font-bold tabular-nums" data-time={tm.key}>{clock(o.times[tm.key])}</dd>
                  </div>
                ))}
                {o.prepMinutes && <div><dt className="text-xs font-semibold text-ink-3">{t('od.prepPromised')}</dt><dd className="font-bold">{t('sales.minutes', { n: o.prepMinutes })}</dd></div>}
                {o.etaAt && ['ACCEPTED', 'PREPARING', 'READY_SOON'].includes(o.status) && <div><dt className="text-xs font-semibold text-ink-3">{t('od.readyBy')}</dt><dd className="font-bold">{clock(o.etaAt)}</dd></div>}
              </dl>
            </section>

            <section className="dz-card p-5">
              <h2 className="text-xl">{t('od.timeline')}</h2>
              <ol className="mt-3 space-y-3">
                {/* App orders start as DRAFT (waiting for payment) — the shop never saw that step, so it isn't shown. */}
                {o.timeline?.filter((ev) => STATUS[ev.to]).map((ev, i) => (
                  <li key={i} className="relative border-l-2 border-line pl-4">
                    <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${STATUS[ev.to].bar}`} />
                    <b>{t(STATUS[ev.to].t)}</b>
                    {ev.reason && <span className="text-ink-2"> — {ev.reason}</span>}
                    <span className="block text-xs text-ink-3">{ev.actorType.toLowerCase()} · {new Date(ev.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
      {dialog && <ActionDialog dialog={dialog} onClose={() => setDialog(null)} />}
      {removing && o && <RemoveItem order={o} item={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}

function RemoveItem({ order, item, onClose }: { order: Order; item: Order['items'][number]; onClose: () => void }) {
  const { storeId, detail } = useStoreContext();
  const qc = useQueryClient();
  const [switchOff, setSwitchOff] = useState(true);
  const { t } = useI18n();
  // Grocery stores with substitutes on can offer a replacement instead of just dropping the item.
  const canSubstitute = ['GROCERY', 'LOCAL_STORES'].includes(detail.store.vertical) && !!detail.store.allowSubstitutions && ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_SOON'].includes(order.status);
  const [mode, setMode] = useState<'substitute' | 'remove'>(canSubstitute ? 'substitute' : 'remove');
  const done = (o: Order, msg: string) => {
    qc.setQueryData(['order', storeId, o.orderNumber], o);
    void qc.invalidateQueries({ queryKey: ['orders', storeId] });
    toast.success(msg);
    onClose();
  };
  const m = useMutation({
    mutationFn: () => api<Order>(`/partners/stores/${storeId}/orders/${order.id}/items/${item.id}/unavailable`, { method: 'POST', body: { switchOff }, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (o) => done(o, t('od.removedToast', { name: item.name })),
  });
  return (
    <Modal title={canSubstitute ? t('sub.title', { name: item.name }) : t('od.removeTitle', { name: item.name })} onClose={onClose}>
      {canSubstitute && (
        <div className="mb-4 flex gap-1 rounded-xl bg-soft p-1" role="tablist">
          {(['substitute', 'remove'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold ${mode === k ? 'bg-white shadow' : 'text-ink-3'}`}>
              {k === 'substitute' ? <Replace className="h-4 w-4" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />} {k === 'substitute' ? t('sub.offer') : t('sub.removeTab')}
            </button>
          ))}
        </div>
      )}
      {mode === 'substitute' ? (
        <SubstitutePicker order={order} item={item} onDone={(o, name) => done(o, t('sub.offered', { name }))} />
      ) : (
        <>
          <p className="text-sm text-ink-2">{item.qty > 1 ? t('od.removeNoteMany', { n: item.qty }) : t('od.removeNoteOne')}</p>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={switchOff} onChange={(e) => setSwitchOff(e.target.checked)} className="h-4 w-4" /> {t('od.switchOff')}
          </label>
          <Button variant="primary" className="mt-4 w-full" disabled={m.isPending} onClick={() => m.mutate()}>{t('od.removeItem')}</Button>
          {m.error && <div className="mt-2"><ErrorText>{errorMessageOf(m.error)}</ErrorText></div>}
        </>
      )}
    </Modal>
  );
}

function SubstitutePicker({ order, item, onDone }: { order: Order; item: Order['items'][number]; onDone: (o: Order, name: string) => void }) {
  const { storeId } = useStoreContext();
  const { t } = useI18n();
  const products = useProducts(storeId);
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<string | null>(null);
  const [qty, setQty] = useState(item.qty);
  const prepaid = order.payment.status === 'CAPTURED';
  const options = (products.data?.products ?? []).filter((p) => p.status === 'AVAILABLE' && !p.prescriptionRequired && p.name !== item.name && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())));
  const chosen = options.find((p) => p.id === pick) ?? (products.data?.products ?? []).find((p) => p.id === pick);
  const cost = chosen ? chosen.price * qty : 0;
  const tooDear = prepaid && cost > item.lineTotal;
  const offer = useMutation({
    mutationFn: () => api<Order>(`/partners/stores/${storeId}/orders/${order.id}/items/${item.id}/substitute`, { method: 'POST', body: { productId: pick, qty }, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (o) => onDone(o, chosen?.name ?? ''),
  });
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">{t('sub.explain')}</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('sub.search')} aria-label={t('sub.search')} className="h-11 w-full rounded-[10px] border-[1.5px] border-line bg-white px-3 outline-none focus:border-black" />
      <ul className="max-h-56 divide-y divide-line overflow-auto rounded-xl border border-line" role="listbox" aria-label={t('sub.search')}>
        {products.isLoading && <li className="p-3 text-sm text-ink-3">{t('no.loadingMenu')}</li>}
        {options.slice(0, 30).map((p) => (
          <li key={p.id}>
            <button type="button" role="option" aria-selected={pick === p.id} onClick={() => setPick(p.id)} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${pick === p.id ? 'bg-dz-yellow-soft font-bold' : 'hover:bg-soft'}`}>
              <span>{p.name}</span>
              <span className="tabular-nums">{inr(p.price)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{t('sub.qty')}</span>
        <button type="button" className="h-9 w-9 rounded-lg border border-line font-bold" onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="−">−</button>
        <b className="w-6 text-center tabular-nums">{qty}</b>
        <button type="button" className="h-9 w-9 rounded-lg border border-line font-bold" onClick={() => setQty((x) => Math.min(50, x + 1))} aria-label="+">+</button>
        {chosen && <span className="ml-auto text-sm">{t('sub.newPrice', { amount: inr(cost), was: inr(item.lineTotal) })}</span>}
      </div>
      {prepaid && <p className={`text-xs ${tooDear ? 'font-bold text-dz-red' : 'text-ink-3'}`}>{t('sub.prepaidNote', { amount: inr(item.lineTotal) })}</p>}
      {offer.error && <ErrorText>{errorMessageOf(offer.error)}</ErrorText>}
      <Button className="w-full" disabled={!pick || tooDear || offer.isPending} onClick={() => offer.mutate()}>{t('sub.send')}</Button>
    </div>
  );
}

function useTick(on: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

const mmss = (s: number) => {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

const RECEIVERS = ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST'];

/** Doorstep check result and items coming back with the rider; the shop confirms what it got back. */
function ReturnsCard({ order: o }: { order: Order }) {
  const { storeId, role } = useStoreContext();
  const { t } = useI18n();
  const qc = useQueryClient();
  const w = o.returnWindow;
  const open = !!w && w.open && new Date(w.endsAt).getTime() > Date.now();
  const receive = useMutation({
    mutationFn: ({ id, restock }: { id: string; restock: boolean }) => api<Order>(`/partners/stores/${storeId}/orders/${o.id}/returns/${id}/receive`, { method: 'POST', body: { restock }, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (r, v) => (qc.setQueryData(['order', storeId, r.orderNumber], r), void qc.invalidateQueries({ queryKey: ['orders', storeId] }), toast.success(v.restock ? t('ret.shelfToast') : t('ret.damagedToast'))),
  });
  const returns = o.returns ?? [];
  return (
    <section className="dz-card p-5" data-returns-card>
      <h2 className="text-xl">{t(w ? 'ret.title' : 'ret.titleBack')}</h2>
      <p className="mt-1 text-sm text-ink-2" data-outcome={!w ? 'UNDELIVERED' : open ? 'OPEN' : w.outcome ?? 'EXPIRED'}>
        {!w ? t('ret.undelivered') : open ? t('ret.openNow') : w.outcome === 'NO_RETURN' ? t('ret.happy') : w.outcome === 'RETURNED' ? t('ret.returned') : t('ret.expired')}
      </p>
      {returns.length > 0 && (
        <ul className="mt-3 space-y-3">
          {returns.map((r) => (
            <li key={r.id} className="rounded-xl bg-soft p-3 text-sm" data-return={r.status}>
              <div className="flex flex-wrap justify-between gap-2">
                <b>{r.qty} × {r.name}</b>
                {r.reason !== 'UNDELIVERED' && <span className="tabular-nums">−{inr(r.amount)}</span>}
              </div>
              <p className="text-xs text-ink-2">
                {t(RETURN_REASON[r.reason])}{r.note ? ` — ${r.note}` : ''}{r.reason === 'UNDELIVERED' ? '' : ` · ${r.refundMethod === 'CASH_AT_DOOR' ? t('ret.cashBack') : t('ret.onlineBack')}`}
              </p>
              {r.status === 'WITH_RIDER' && RECEIVERS.includes(role) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button className="min-h-10 text-sm" disabled={receive.isPending} onClick={() => receive.mutate({ id: r.id, restock: true })}>{t('ret.backOnShelf')}</Button>
                  <Button variant="ghost" className="min-h-10 text-sm" disabled={receive.isPending} onClick={() => receive.mutate({ id: r.id, restock: false })}>{t('ret.damaged')}</Button>
                </div>
              )}
              {r.status === 'WITH_RIDER' && !RECEIVERS.includes(role) && <p className="mt-1 text-xs font-semibold">{t('ret.withRider')}</p>}
              {r.status === 'RECEIVED' && <p className="mt-1 text-xs font-semibold text-dz-green">{r.restocked ? t('ret.receivedShelf') : t('ret.receivedDamaged')}</p>}
              {r.status === 'NOT_APPLICABLE' && <p className="mt-1 text-xs text-ink-3">{t('ret.nothingBack')}</p>}
            </li>
          ))}
        </ul>
      )}
      {receive.error && <div className="mt-2"><ErrorText>{errorMessageOf(receive.error)}</ErrorText></div>}
    </section>
  );
}
