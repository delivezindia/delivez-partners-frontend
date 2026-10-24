import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Printer, ShieldCheck } from 'lucide-react';
import { api, newIdempotencyKey } from '../../lib/api';
import { inr } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { clock, printKot, STATUS, useOrder, type Order } from '../../lib/orders';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { SkeletonList, toast } from '../../components/feedback';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { openHealthFile } from '../../lib/labBookings';
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/stores/${storeId}/orders`} className="inline-flex items-center gap-1 font-bold text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {t('od.allOrders')}
        </Link>
        {o && (
          <Button variant="ghost" className="min-h-10 text-sm" onClick={() => printKot(o, detail.store.name) || toast.error(t('od.printFailed'))}>
            <Printer className="h-4 w-4" /> {t('od.printKot')}
          </Button>
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
                  <li key={i.id} className={`flex items-start justify-between gap-3 ${i.unavailable ? 'text-ink-3 line-through' : ''}`}>
                    <span>
                      {i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ''} <span className="text-ink-3">@ {inr(i.unitPrice)}</span>
                      {i.unavailable && <span className="ml-1 text-xs font-bold no-underline">{t('od.removed')}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <b className="tabular-nums">{inr(i.lineTotal)}</b>
                      {editable && !i.unavailable && (
                        <button type="button" className="text-xs font-bold text-dz-red underline" onClick={() => setRemoving(i)}>{t('od.unavailable')}</button>
                      )}
                    </span>
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
                {o.timeline?.map((ev, i) => (
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
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  const [switchOff, setSwitchOff] = useState(true);
  const { t } = useI18n();
  const m = useMutation({
    mutationFn: () => api<Order>(`/partners/stores/${storeId}/orders/${order.id}/items/${item.id}/unavailable`, { method: 'POST', body: { switchOff }, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (o) => {
      qc.setQueryData(['order', storeId, o.orderNumber], o);
      void qc.invalidateQueries({ queryKey: ['orders', storeId] });
      toast.success(t('od.removedToast', { name: item.name }));
      onClose();
    },
  });
  return (
    <Modal title={t('od.removeTitle', { name: item.name })} onClose={onClose}>
      <p className="text-sm text-ink-2">{item.qty > 1 ? t('od.removeNoteMany', { n: item.qty }) : t('od.removeNoteOne')}</p>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={switchOff} onChange={(e) => setSwitchOff(e.target.checked)} className="h-4 w-4" /> {t('od.switchOff')}
      </label>
      <Button variant="primary" className="mt-4 w-full" disabled={m.isPending} onClick={() => m.mutate()}>{t('od.removeItem')}</Button>
      {m.error && <div className="mt-2"><ErrorText>{errorMessageOf(m.error)}</ErrorText></div>}
    </Modal>
  );
}
