import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Banknote, Bike, MapPin, ShoppingBag, Store as StoreIcon } from 'lucide-react';
import { LocationSheet } from '../components/LocationSheet';
import { TextArea } from '../components/form';
import { Button, ErrorText, QtyStepper, VegMark } from '../components/ui';
import { api, ApiError, newIdempotencyKey } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { cartTotal, useCart } from '../lib/cart';
import { km, rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import { useDeliverTo } from '../lib/location';
import { toItems, useQuote, type Blocker, type CustomerOrder, type Fulfilment, type Problem } from '../lib/orders';
import { messageOf } from './Login';

const BLOCKER: Partial<Record<Blocker, MsgKey>> = {
  STORE_CLOSED: 'lc.co.b.closed',
  DELIVERY_NOT_OFFERED: 'lc.co.b.noDelivery',
  PICKUP_NOT_OFFERED: 'lc.co.b.noPickup',
  OUT_OF_RANGE: 'lc.co.b.range',
  LAB_BOOKING: 'lc.co.b.lab',
  RX_REQUIRED: 'lc.co.b.rx',
  ITEMS: 'lc.co.b.items',
};
const PROBLEM: Record<Problem['code'], MsgKey> = {
  GONE: 'lc.co.p.gone',
  UNAVAILABLE: 'lc.co.p.unavailable',
  OUT_OF_STOCK: 'lc.co.p.out',
  FEW_LEFT: 'lc.co.p.few',
  OPTIONS_CHANGED: 'lc.co.p.options',
};

// L2 Cart + checkout (cash on delivery / pay at the shop).
export default function Cart() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = useAuth((s) => s.accessToken);
  const cart = useCart();
  const at = useDeliverTo((s) => s.at);
  const [fulfilment, setFulfilment] = useState<Fulfilment>('DELIVERY');
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  // One key per checkout attempt, so a double tap or a retry after a timeout places one order.
  const attempt = useRef(newIdempotencyKey());

  const addressId = fulfilment === 'DELIVERY' ? at?.addressId : undefined;
  const quote = useQuote({ storeId: cart.storeId, fulfilmentType: fulfilment, addressId, lines: cart.lines }, !!token);
  const q = quote.data;

  // A shop that only does one of the two picks it for the customer.
  useEffect(() => {
    if (!q) return;
    if (fulfilment === 'DELIVERY' && !q.store.supportsDelivery && q.store.supportsPickup) setFulfilment('PICKUP');
    if (fulfilment === 'PICKUP' && !q.store.supportsPickup && q.store.supportsDelivery) setFulfilment('DELIVERY');
  }, [q, fulfilment]);

  if (!cart.lines.length)
    return (
      <Shell title={t('lc.cart.title')}>
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
          <ShoppingBag className="mx-auto h-12 w-12 text-ink-3" aria-hidden />
          <p className="mt-3 text-lg font-bold">{t('lc.cart.empty')}</p>
          <Link to="/" className="mt-4 inline-block font-bold text-dz-red underline">
            {t('lc.cart.browse')}
          </Link>
        </div>
      </Shell>
    );

  const problemOf = (productId: string) => q?.problems.find((p) => p.productId === productId);
  const totals = q?.totals ?? { items: cartTotal(cart.lines), delivery: 0, packaging: 0, discount: 0, grandTotal: cartTotal(cart.lines) };
  const shortBy = q ? q.store.minOrderAmount - q.totals.items : 0;
  const blockers = (q?.blockers ?? []).filter((b) => b !== 'ADDRESS_REQUIRED' && b !== 'BELOW_MINIMUM');

  async function place() {
    setError('');
    setPlacing(true);
    try {
      const o = await api<CustomerOrder>('/local/orders', {
        method: 'POST',
        body: { storeId: cart.storeId, fulfilmentType: fulfilment, addressId, items: toItems(cart.lines), paymentMode: 'COD', note: note.trim() || undefined },
        idempotencyKey: attempt.current,
      });
      cart.clear();
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['order', o.id], o);
      navigate(`/orders/${o.id}?placed=1`, { replace: true });
    } catch (err) {
      attempt.current = newIdempotencyKey();
      if (err instanceof ApiError && err.code === 'CART_CHANGED') void quote.refetch();
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <Shell title={t('lc.cart.title')}>
      <section className="rounded-2xl bg-white ring-1 ring-line">
        <Link to={cart.storeSlug ? `/s/${cart.storeSlug}` : `/s/${cart.storeId}`} className="flex items-center gap-2 border-b border-line px-4 py-3 font-extrabold">
          <StoreIcon className="h-4 w-4" aria-hidden /> {cart.storeName}
        </Link>
        <ul className="divide-y divide-line">
          {cart.lines.map((l) => {
            const p = problemOf(l.productId);
            return (
              <li key={l.key} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1">
                  <VegMark veg={l.isVeg} label={l.isVeg ? t('lc.veg') : t('lc.nonVeg')} />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block leading-snug">{l.name}</b>
                  {l.options && <span className="block text-xs text-ink-3">{l.options}</span>}
                  {p && <span className="mt-0.5 block text-xs font-bold text-dz-red">{t(PROBLEM[p.code], { n: p.left ?? 0 })}</span>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <QtyStepper size="sm" qty={l.qty} max={l.maxQty} onChange={(n) => cart.setQty(l.key, n)} label={l.name} />
                  <span className="text-sm font-semibold">{rupees(l.unitPrice * l.qty)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line px-4 py-3">
          <label className="text-sm font-bold" htmlFor="note">
            {t('lc.co.note')}
          </label>
          <TextArea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t('lc.co.notePh')} className="mt-1 min-h-16" />
        </div>
      </section>

      {!token ? (
        <section className="rounded-2xl bg-white p-4 text-center ring-1 ring-line">
          <p className="font-bold">{t('lc.co.loginTitle')}</p>
          <p className="mt-1 text-sm text-ink-2">{t('lc.co.loginBody')}</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/login?next=/cart')}>
            {t('lc.co.loginCta')}
          </Button>
        </section>
      ) : (
        <>
          {q && q.store.supportsDelivery && q.store.supportsPickup && (
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-line" role="radiogroup" aria-label={t('lc.co.how')}>
              {(['DELIVERY', 'PICKUP'] as const).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={fulfilment === f} onClick={() => setFulfilment(f)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold ${fulfilment === f ? 'bg-black text-dz-yellow' : 'text-ink-2'}`}>
                  {f === 'DELIVERY' ? <Bike className="h-4 w-4" aria-hidden /> : <StoreIcon className="h-4 w-4" aria-hidden />}
                  {f === 'DELIVERY' ? t('lc.co.delivery') : t('lc.co.pickup')}
                </button>
              ))}
            </div>
          )}

          {fulfilment === 'DELIVERY' ? (
            <section className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-dz-red" aria-hidden />
              <div className="min-w-0 flex-1">
                {at?.addressId ? (
                  <>
                    <b className="block">{t('lc.co.deliverTo', { place: at.title })}</b>
                    <span className="block text-sm text-ink-2">{at.line}</span>
                    {q?.distanceKm != null && <span className="text-xs text-ink-3">{t('lc.co.away', { d: km(q.distanceKm) })}</span>}
                  </>
                ) : (
                  <>
                    <b className="block">{t('lc.co.needAddress')}</b>
                    <span className="block text-sm text-ink-2">{t('lc.co.needAddressBody')}</span>
                  </>
                )}
              </div>
              {at?.addressId ? (
                <button type="button" onClick={() => setPicking(true)} className="shrink-0 text-sm font-bold text-dz-red">
                  {t('lc.change')}
                </button>
              ) : (
                <Link to="/addresses/new?next=/cart" className="shrink-0 text-sm font-bold text-dz-red">
                  {t('lc.co.addAddress')}
                </Link>
              )}
            </section>
          ) : (
            q && (
              <section className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
                <StoreIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                  <b className="block">{t('lc.co.collectFrom', { store: q.store.name })}</b>
                  {q.store.address && <span className="block text-sm text-ink-2">{q.store.address}</span>}
                </div>
              </section>
            )
          )}

          <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <h2 className="mb-2 text-xl">{t('lc.co.bill')}</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label={t('lc.co.items')} value={rupees(totals.items)} />
              {fulfilment === 'DELIVERY' && <Row label={t('lc.co.deliveryFee')} value={q ? rupees(totals.delivery) : '—'} />}
              {totals.packaging > 0 && <Row label={t('lc.co.packaging')} value={rupees(totals.packaging)} />}
              <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
                <dt>{t('lc.co.toPay')}</dt>
                <dd>{rupees(totals.grandTotal)}</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-soft px-3 py-2 text-sm font-semibold">
              <Banknote className="h-4 w-4 text-dz-green" aria-hidden /> {fulfilment === 'DELIVERY' ? t('lc.co.cod') : t('lc.co.payAtShop')}
            </p>
          </section>

          {shortBy > 0 && <Notice>{t('lc.co.b.min', { amount: rupees(shortBy) })}</Notice>}
          {blockers.map((b) => BLOCKER[b] && <Notice key={b}>{t(BLOCKER[b]!)}</Notice>)}
          <ErrorText>{error}</ErrorText>
          <Button className="w-full min-h-14 text-base" disabled={!q?.canPlace || placing || quote.isFetching} onClick={() => void place()}>
            {placing ? t('lc.co.placing') : t('lc.co.place', { total: rupees(totals.grandTotal) })}
          </Button>
        </>
      )}
      {picking && <LocationSheet onClose={() => setPicking(false)} />}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-soft pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')} onClick={(e) => (history.length > 1 ? (e.preventDefault(), history.back()) : undefined)}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl">{title}</h1>
      </header>
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">{children}</main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-dz-yellow-soft px-3 py-2.5 text-sm font-semibold" role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" aria-hidden /> {children}
    </p>
  );
}
