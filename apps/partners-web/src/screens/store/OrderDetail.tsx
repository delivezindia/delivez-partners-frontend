import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { api, newIdempotencyKey } from '../../lib/api';
import { inr } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { clock, printKot, STATUS, useOrder, type Order } from '../../lib/orders';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';
import { ActionDialog, OrderCard } from './Orders';

const TIMES: { key: keyof Order['times']; label: string }[] = [
  { key: 'placedAt', label: 'Placed' },
  { key: 'acceptedAt', label: 'Accepted' },
  { key: 'preparingAt', label: 'Preparing' },
  { key: 'readySoonAt', label: 'Ready soon' },
  { key: 'readyAt', label: 'Ready' },
  { key: 'pickedUpAt', label: 'Picked up' },
  { key: 'deliveredAt', label: 'Delivered' },
  { key: 'completedAt', label: 'Collected' },
  { key: 'cancelledAt', label: 'Cancelled' },
];

// P16 Order detail: the full card, every timestamp, bill, items you can mark unavailable, timeline.
export default function OrderDetail() {
  const { orderNo = '' } = useParams();
  const { storeId, detail, role } = useStoreContext();
  const { data: o, error, isLoading } = useOrder(storeId, orderNo);
  const [dialog, setDialog] = useState<{ kind: 'accept' | 'reject' | 'ready' | 'delay'; order: Order } | null>(null);
  const [removing, setRemoving] = useState<Order['items'][number] | null>(null);
  const editable = o && ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status) && role !== 'ACCOUNTANT';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/stores/${storeId}/orders`} className="inline-flex items-center gap-1 font-bold text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All orders
        </Link>
        {o && (
          <Button variant="ghost" className="min-h-10 text-sm" onClick={() => printKot(o, detail.store.name) || toast.error('Allow pop-ups to print the KOT')}>
            <Printer className="h-4 w-4" /> Print KOT
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
              <h2 className="text-xl">Bill</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className={`flex items-start justify-between gap-3 ${i.unavailable ? 'text-ink-3 line-through' : ''}`}>
                    <span>
                      {i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ''} <span className="text-ink-3">@ {inr(i.unitPrice)}</span>
                      {i.unavailable && <span className="ml-1 text-xs font-bold no-underline">removed</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <b className="tabular-nums">{inr(i.lineTotal)}</b>
                      {editable && !i.unavailable && (
                        <button type="button" className="text-xs font-bold text-dz-red underline" onClick={() => setRemoving(i)}>Unavailable</button>
                      )}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-line pt-1.5 text-ink-2"><span>Items</span><span>{inr(o.totals.items)}</span></li>
                {o.totals.packaging > 0 && <li className="flex justify-between text-ink-2"><span>Packaging</span><span>{inr(o.totals.packaging)}</span></li>}
                {o.totals.delivery > 0 && <li className="flex justify-between text-ink-2"><span>Delivery</span><span>{inr(o.totals.delivery)}</span></li>}
                {o.totals.discount > 0 && <li className="flex justify-between text-dz-green"><span>Discount</span><span>−{inr(o.totals.discount)}</span></li>}
                <li className="flex justify-between text-base font-extrabold"><span>Total · {o.payment.mode === 'COD' ? 'cash' : 'paid online'}</span><span>{inr(o.totals.grandTotal)}</span></li>
              </ul>
              <p className="mt-2 text-xs text-ink-3">Customer {o.customer.name} · {o.customer.phone} · via {o.channel.toLowerCase().replace(/_/g, ' ')}</p>
            </section>
          </div>

          <div className="space-y-5">
            <section className="dz-card p-5">
              <h2 className="text-xl">Times</h2>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                {TIMES.filter((t) => o.times[t.key] && !(t.key === 'pickedUpAt' && o.fulfilmentType === 'PICKUP')).map((t) => (
                  <div key={t.key}>
                    <dt className="text-xs font-semibold text-ink-3">{t.label}</dt>
                    <dd className="font-bold tabular-nums" data-time={t.key}>{clock(o.times[t.key])}</dd>
                  </div>
                ))}
                {o.prepMinutes && <div><dt className="text-xs font-semibold text-ink-3">Prep promised</dt><dd className="font-bold">{o.prepMinutes} min</dd></div>}
                {o.etaAt && ['ACCEPTED', 'PREPARING', 'READY_SOON'].includes(o.status) && <div><dt className="text-xs font-semibold text-ink-3">Ready by</dt><dd className="font-bold">{clock(o.etaAt)}</dd></div>}
              </dl>
            </section>

            <section className="dz-card p-5">
              <h2 className="text-xl">Timeline</h2>
              <ol className="mt-3 space-y-3">
                {o.timeline?.map((t, i) => (
                  <li key={i} className="relative border-l-2 border-line pl-4">
                    <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${STATUS[t.to].bar}`} />
                    <b>{STATUS[t.to].label}</b>
                    {t.reason && <span className="text-ink-2"> — {t.reason}</span>}
                    <span className="block text-xs text-ink-3">{t.actorType.toLowerCase()} · {new Date(t.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
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
  const m = useMutation({
    mutationFn: () => api<Order>(`/partners/stores/${storeId}/orders/${order.id}/items/${item.id}/unavailable`, { method: 'POST', body: { switchOff }, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (o) => {
      qc.setQueryData(['order', storeId, o.orderNumber], o);
      void qc.invalidateQueries({ queryKey: ['orders', storeId] });
      toast.success(`${item.name} removed — customer refunded for it`);
      onClose();
    },
  });
  return (
    <Modal title={`Remove ${item.name}?`} onClose={onClose}>
      <p className="text-sm text-ink-2">The customer is told and refunded {item.qty > 1 ? `for all ${item.qty}` : 'for it'}. The rest of the order goes ahead.</p>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={switchOff} onChange={(e) => setSwitchOff(e.target.checked)} className="h-4 w-4" /> Also mark it out of stock on the menu
      </label>
      <Button variant="primary" className="mt-4 w-full" disabled={m.isPending} onClick={() => m.mutate()}>Remove item</Button>
      {m.error && <div className="mt-2"><ErrorText>{errorMessageOf(m.error)}</ErrorText></div>}
    </Modal>
  );
}
