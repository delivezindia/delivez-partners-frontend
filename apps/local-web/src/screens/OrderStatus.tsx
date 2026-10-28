import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, Check, CreditCard, CircleCheck, Phone, XCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { PushCard } from '../components/PushCard';
import { DoorCheck, HelpLink, RateOrder, RxStatus, Substitutions } from '../components/OrderExtras';
import { Button, ErrorText, Skeleton } from '../components/ui';
import { api, newIdempotencyKey } from '../lib/api';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { CANCEL_REASON, PAY_LABEL, STATUS_LABEL, STEPS, useOrder, type CustomerOrder } from '../lib/orders';
import { messageOf } from './Login';
import { payWithRazorpay, type CheckoutParams } from '../lib/razorpay';

// L2/L3 Order status: where it is, the code for the door / counter, what was ordered.
export default function OrderStatus() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const order = useOrder(id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const o = order.data;
  if (order.isLoading)
    return (
      <div className="mx-auto max-w-xl space-y-3 p-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  if (!o)
    return (
      <div className="p-10 text-center">
        <p className="font-bold">{t('lc.ord.notFound')}</p>
        <Link to="/orders" className="mt-3 inline-block font-bold text-dz-red underline">
          {t('lc.ord.all')}
        </Link>
      </div>
    );

  const flow = STEPS;
  const current = flow.findIndex((s) => s.states.includes(o.status));
  const failed = ['REJECTED', 'CANCELLED', 'DELIVERY_FAILED', 'REFUNDED'].includes(o.status);
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  const code = o.codes?.delivery;

  async function cancel() {
    setError('');
    setBusy(true);
    try {
      const updated = await api<CustomerOrder>(`/local/orders/${o!.id}/cancel`, { method: 'POST', body: {}, idempotencyKey: newIdempotencyKey() });
      qc.setQueryData(['order', id], updated);
      qc.invalidateQueries({ queryKey: ['orders'] });
      setConfirmCancel(false);
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-soft pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to="/orders" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl">{o.store.name}</h1>
          <p className="text-xs text-ink-3">{o.orderNumber}</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">
        {o.awaitingPayment && <PayNow o={o} failed={!!params.get('payfail')} />}

        {params.get('placed') && !failed && !o.awaitingPayment && (
          <p className="dz-rise flex items-center gap-2 rounded-2xl bg-dz-green px-4 py-3 font-bold text-white" role="status">
            <CircleCheck className="h-5 w-5" aria-hidden /> {t('lc.ord.placed')}
          </p>
        )}

        <Substitutions o={o} />

        <section className={`rounded-2xl p-5 ring-1 ${failed ? 'bg-dz-red-soft ring-dz-red/20' : 'bg-white ring-line'}`} aria-live="polite">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">{t('lc.ord.status')}</p>
          <h2 className="mt-1 flex items-center gap-2 text-3xl">
            {failed && <XCircle className="h-7 w-7 text-dz-red" aria-hidden />}
            {t(STATUS_LABEL[o.status])}
          </h2>
          {o.active && o.etaAt && <p className="mt-1 text-ink-2">{t('lc.ord.arrivesBy', { time: time(o.etaAt) })}</p>}
          {failed && <CancelOutcome o={o} />}

          {!failed && (
            <ol className="mt-5 grid grid-cols-4 gap-1">
              {flow.map((s, i) => {
                const done = i < current || (i === current && ['DELIVERED', 'COMPLETED'].includes(o.status));
                const on = i === current && !done;
                return (
                  <li key={s.key} className="text-center">
                    <span
                      className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-black ${done ? 'bg-dz-green text-white' : on ? 'bg-black text-dz-yellow' : 'bg-soft text-ink-3'}`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`mt-1 block text-[11px] font-bold leading-tight ${done || on ? 'text-ink' : 'text-ink-3'}`}>{t(s.key)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <RxStatus o={o} />
        <DoorCheck o={o} />
        <RateOrder o={o} />

        {code && (
          <section className="rounded-2xl bg-dz-yellow p-5 text-center ring-1 ring-black/10">
            <p className="text-sm font-bold">{t('lc.ord.codeDelivery')}</p>
            <p className="mt-1 font-display text-5xl tracking-[0.3em]" data-order-code>
              {code}
            </p>
          </section>
        )}

        {o.active && <PushCard compact />}

        {o.rider && o.active && (
          <section className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-dz-yellow" aria-hidden>
              <Bike className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <b>{t('lc.ord.rider', { name: o.rider.name ?? '' })}</b>
            </div>
            <a href={`tel:${o.rider.phone}`} className="grid h-10 w-10 place-items-center rounded-full bg-dz-green text-white" aria-label={t('lc.ord.callRider')}>
              <Phone className="h-4 w-4" />
            </a>
          </section>
        )}

        <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <h2 className="mb-2 text-xl">{t('lc.ord.items')}</h2>
          <ul className="space-y-2 text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className={i.unavailable ? 'text-ink-3 line-through' : ''}>
                  {i.qty} × {i.name}
                  {(i.variant || i.addons.length > 0) && <span className="block text-xs text-ink-3">{[i.variant, ...i.addons.map((a) => a.name)].filter(Boolean).join(' · ')}</span>}
                </span>
                <span className="font-semibold">{rupees(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {o.totals.delivery > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-2">{t('lc.co.deliveryFee')}</dt>
                <dd>{rupees(o.totals.delivery)}</dd>
              </div>
            )}
            {o.totals.packaging > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-2">{t('lc.co.packaging')}</dt>
                <dd>{rupees(o.totals.packaging)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold">
              <dt>{o.payment.mode === 'COD' && o.active ? t('lc.co.toPay') : t('lc.ord.total')}</dt>
              <dd>{rupees(o.totals.grandTotal)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-3">
            {o.payment.mode === 'COD' ? t('lc.pm.COD') : t('lc.ord.paidVia', { method: PAY_LABEL[o.payment.mode] ? t(PAY_LABEL[o.payment.mode]) : o.payment.mode })}
          </p>
          {o.address && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">{o.address}</p>}
          {o.note && <p className="mt-2 text-sm italic text-ink-2">“{o.note}”</p>}
        </section>

        {o.canCancel && (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmCancel(true)}>
            {t('lc.ord.cancel')}
          </Button>
        )}
        {!failed && (
          <p className="text-center text-xs text-ink-3">
            <Link to="/refund-policy" className="font-semibold underline underline-offset-2 hover:text-dz-red">
              {t('lc.site.policy')}
            </Link>
          </p>
        )}
        {!o.awaitingPayment && <HelpLink o={o} />}
        {o.store.phone && (
          <a href={`tel:${o.store.phone}`} className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-ink-2">
            <Phone className="h-4 w-4" aria-hidden /> {t('lc.ord.callStore')}
          </a>
        )}
      </main>

      {confirmCancel && (
        <Modal title={t('lc.ord.cancelTitle')} onClose={() => setConfirmCancel(false)}>
          <p className="text-ink-2">{t('lc.ord.cancelBody')}</p>
          <ErrorText>{error}</ErrorText>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              {t('lc.ord.keep')}
            </Button>
            <Button onClick={() => void cancel()} disabled={busy}>
              {t('lc.ord.cancelYes')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Why it ended and what it means for the customer's money (order SLA). */
function CancelOutcome({ o }: { o: CustomerOrder }) {
  const { t } = useI18n();
  const c = o.cancellation;
  const reason = c && CANCEL_REASON[c.code] ? t(CANCEL_REASON[c.code]) : o.cancelReason;
  const prepaid = o.payment.mode !== 'COD';
  const notOurs = c && c.fault !== 'CUSTOMER';
  return (
    <div className="mt-2 space-y-1.5 text-sm" data-cancel-outcome>
      {reason && <p className="font-semibold text-ink">{reason}</p>}
      {notOurs && <p className="text-ink-2">{t('lc.cx.sorry')}</p>}
      {prepaid && c && c.refunded > 0 && <p className="text-ink-2">{t('lc.cx.refunded', { amount: rupees(c.refunded) })}</p>}
      {prepaid && c && c.refunded > 0 && c.refunded < o.totals.grandTotal && <p className="text-ink-2">{t('lc.cx.partial')}</p>}
      {prepaid && c && c.refunded === 0 && <p className="text-ink-2">{t('lc.cx.noRefund')}</p>}
      {!prepaid && c && c.unpaid === 0 && <p className="text-ink-2">{t('lc.cx.notCharged')}</p>}
      {!prepaid && c && c.unpaid > 0 && <p className="text-ink-2">{t('lc.cx.unpaid', { amount: rupees(c.unpaid) })}</p>}
      <p>
        <Link to="/refund-policy" className="text-xs font-semibold underline underline-offset-2 hover:text-dz-red">
          {t('lc.site.policy')}
        </Link>
      </p>
    </div>
  );
}

/** Placed but unpaid: pay (again) with Razorpay, or cancel with the button below. */
function PayNow({ o, failed }: { o: CustomerOrder; failed: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(failed ? t('lc.pay.failed') : '');
  const [test, setTest] = useState(false);
  const holdUntil = new Date(new Date(o.placedAt).getTime() + 15 * 60_000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  async function pay() {
    setError('');
    setBusy(true);
    try {
      const params = await api<CheckoutParams>(`/local/orders/${o.id}/payment`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      setTest(params.testMode);
      const paid = await payWithRazorpay(o.id, params, () => setVerifying(true));
      if (paid) {
        qc.setQueryData(['order', o.id], paid);
        qc.invalidateQueries({ queryKey: ['orders'] });
      }
    } catch (err) {
      setError(messageOf(err, t('lc.pay.failed')));
      void qc.invalidateQueries({ queryKey: ['order', o.id] });
    } finally {
      setBusy(false);
      setVerifying(false);
    }
  }
  return (
    <section className="rounded-2xl bg-dz-yellow-soft p-5 ring-1 ring-dz-yellow" data-pay-now>
      <h2 className="flex items-center gap-2 text-2xl">
        <CreditCard className="h-6 w-6" aria-hidden /> {t('lc.pay.pending')}
      </h2>
      <p className="mt-1 text-sm text-ink-2">{t('lc.pay.pendingBody', { time: holdUntil })}</p>
      <ErrorText>{error}</ErrorText>
      <Button className="mt-3 w-full" disabled={busy} onClick={() => void pay()} data-pay-btn>
        {verifying ? t('lc.pay.verifying') : t('lc.pay.payNow', { total: rupees(o.totals.grandTotal) })}
      </Button>
      {test && <p className="mt-2 text-center text-xs font-bold text-ink-3">{t('lc.pay.test')}</p>}
    </section>
  );
}
