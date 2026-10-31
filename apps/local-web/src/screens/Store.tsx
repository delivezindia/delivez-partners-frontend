import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bike, Clock, FileText, MapPin, Search, Star } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ProductSheet } from '../components/ProductSheet';
import { ReorderNotice } from '../components/ReorderNotice';
import { Button, QtyStepper, Skeleton, VegMark } from '../components/ui';
import { ApiError } from '../lib/api';
import { needsOptions, simpleLine, useCart, type CartLine } from '../lib/cart';
import { km, opensAtLabel, rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { VERTICAL_LABEL } from '../lib/labels';
import { VerticalIcon } from '../components/VerticalIcon';
import { useDeliverTo } from '../lib/location';
import { useMenu } from '../lib/queries';
import type { Menu, Product } from '../lib/types';

// L1 Store: one shop's menu / shelf, add to basket.
export default function Store() {
  const { slug = '' } = useParams();
  const { t, locale } = useI18n();
  const at = useDeliverTo((s) => s.at);
  const menu = useMenu(slug, at);
  const cart = useCart();
  const [q, setQ] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [options, setOptions] = useState<Product | null>(null);
  // Adding from a second shop asks first; holds what to add once the customer agrees.
  const [switching, setSwitching] = useState<{ line: Omit<CartLine, 'key' | 'qty'>; qty: number } | null>(null);

  const data = menu.data;
  const groups = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const shown = data.products.filter((p) => (!vegOnly || p.isVeg) && (!needle || `${p.name} ${p.description ?? ''} ${p.saltComposition ?? ''}`.toLowerCase().includes(needle)));
    return data.categories.map((c) => ({ ...c, products: shown.filter((p) => p.categoryId === c.id) })).filter((g) => g.products.length);
  }, [data, q, vegOnly]);

  if (menu.isLoading)
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  // Couldn't reach the server (as opposed to "no such shop"): say so and offer a retry.
  if (!data && menu.error && !(menu.error instanceof ApiError && menu.error.status === 404))
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-lg font-bold">{t('lc.err.network')}</p>
        <Button className="mt-4" onClick={() => void menu.refetch()} disabled={menu.isFetching}>
          {t('lc.tryAgain')}
        </Button>
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-lg font-bold">{t('lc.store.notFound')}</p>
        <Link to="/shops" className="mt-4 inline-block font-bold text-dz-red underline">
          {t('lc.backHome')}
        </Link>
      </div>
    );

  const s = data.store;
  const canOrder = s.open || s.vertical === 'DIAGNOSTICS';
  const hasVeg = data.products.some((p) => p.isVeg != null);
  const qtyOf = (productId: string) => (cart.storeId === s.id ? cart.lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.qty, 0) : 0);

  function add(line: Omit<CartLine, 'key' | 'qty'>, qty = 1) {
    if (cart.storeId && cart.storeId !== s.id && cart.lines.length) return setSwitching({ line, qty });
    cart.add(s, line, qty);
  }

  return (
    <div className="min-h-screen bg-soft pb-28">
      <div className="relative h-44 bg-dz-yellow sm:h-56">
        {s.coverUrl ? (
          <img src={s.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center">
            <VerticalIcon v={s.vertical} size="xl" />
          </span>
        )}
        <Link to="/shops" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white shadow" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <main className="mx-auto -mt-8 max-w-3xl px-4">
        <section className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl">{s.name}</h1>
              <p className="mt-1 text-sm text-ink-2">{s.cuisines.length ? s.cuisines.join(' · ') : t(VERTICAL_LABEL[s.vertical])}</p>
            </div>
            {s.rating && (
              <span className="shrink-0 rounded-lg bg-dz-green px-2 py-1 text-center text-white">
                <b className="flex items-center gap-0.5">
                  {s.rating.avg.toFixed(1)} <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                </b>
                <span className="block text-[10px]">{t('lc.store.ratings', { n: s.rating.count })}</span>
              </span>
            )}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {s.address}
            {s.distanceKm != null && <span className="shrink-0 font-semibold">· {km(s.distanceKm)}</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            {s.open ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-soft px-2.5 py-1">
                <Clock className="h-4 w-4" aria-hidden /> {t('lc.store.mins', { n: s.etaMinutes })}
              </span>
            ) : (
              <span className="rounded-lg bg-dz-red-soft px-2.5 py-1 text-dz-red">
                {s.opensAt ? t('lc.store.closedOpens', { time: opensAtLabel(s.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed')}
              </span>
            )}
            {s.delivers === false ? (
              <span className="rounded-lg bg-dz-yellow-soft px-2.5 py-1">{t('lc.store.noDelivery')}</span>
            ) : (
              s.supportsDelivery && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-soft px-2.5 py-1">
                  <Bike className="h-4 w-4" aria-hidden /> {t('lc.store.fee', { fee: rupees(s.deliveryFee) })}
                </span>
              )
            )}
            {s.minOrderAmount > 0 && <span className="rounded-lg bg-soft px-2.5 py-1">{t('lc.store.min', { amount: rupees(s.minOrderAmount) })}</span>}
            {s.busy && <span className="rounded-lg bg-[#fff4e5] px-2.5 py-1 text-[#b45309]">{t('lc.store.busyLong')}</span>}
          </div>
          {s.description && <p className="mt-3 text-sm text-ink-2">{s.description}</p>}
        </section>
        <div className="mt-3">
          <ReorderNotice />
        </div>

        <div className="sticky top-0 z-10 -mx-4 mt-3 bg-soft/95 px-4 pb-2 pt-2 backdrop-blur">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lc.store.search')} aria-label={t('lc.store.search')} className="h-11 w-full rounded-xl border-[1.5px] border-line bg-white pl-9 pr-3 outline-none focus:border-black" />
            </label>
            {hasVeg && (
              <button type="button" aria-pressed={vegOnly} onClick={() => setVegOnly(!vegOnly)} className={`h-11 shrink-0 rounded-xl border-[1.5px] px-3 text-sm font-bold ${vegOnly ? 'border-dz-green bg-dz-green-soft text-dz-green' : 'border-line bg-white'}`}>
                {t('lc.store.vegOnly')}
              </button>
            )}
          </div>
          {groups.length > 1 && (
            <nav className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4" aria-label={t('lc.home.categories')}>
              {groups.map((g) => (
                <a key={g.id ?? 'more'} href={`#c-${g.id ?? 'more'}`} className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-bold ring-1 ring-line hover:ring-black">
                  {g.id ? g.name : t('lc.store.more')} <span className="text-ink-3">{g.products.length}</span>
                </a>
              ))}
            </nav>
          )}
        </div>

        {groups.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-ink-2">{q || vegOnly ? t('lc.store.noMatch') : t('lc.store.empty')}</p>}
        {groups.map((g) => (
          <section key={g.id ?? 'more'} id={`c-${g.id ?? 'more'}`} className="scroll-mt-32">
            <h2 className="mb-2 mt-5 text-xl">{g.id ? g.name : t('lc.store.more')}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {g.products.map((p) => (
                <ProductRow
                  key={p.id}
                  p={p}
                  store={s}
                  canOrder={canOrder}
                  qty={qtyOf(p.id)}
                  onAdd={() => (needsOptions(p) ? setOptions(p) : add(simpleLine(p)))}
                  onQty={(n) => {
                    // A product with one plain line in the basket can be changed right here.
                    const own = cart.lines.filter((l) => l.productId === p.id);
                    if (own.length === 1) cart.setQty(own[0].key, n);
                    else setOptions(p);
                  }}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>

      {options && (
        <ProductSheet
          product={options}
          onClose={() => setOptions(null)}
          onAdd={(line, qty) => {
            add(line, qty);
            setOptions(null);
          }}
        />
      )}
      {switching && (
        <Modal title={t('lc.cart.switchTitle')} onClose={() => setSwitching(null)}>
          <p className="text-ink-2">{t('lc.cart.switchBody', { old: cart.storeName ?? '', store: s.name })}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setSwitching(null)}>
              {t('lc.cancel')}
            </Button>
            <Button
              onClick={() => {
                cart.clear();
                cart.add(s, switching.line, switching.qty);
                setSwitching(null);
              }}
            >
              {t('lc.cart.startNew')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductRow({ p, store, canOrder, qty, onAdd, onQty }: { p: Product; store: Menu['store']; canOrder: boolean; qty: number; onAdd: () => void; onQty: (n: number) => void }) {
  const { t } = useI18n();
  const off = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <li className={`flex gap-3 p-3 ${p.available ? '' : 'opacity-60'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <VegMark veg={p.isVeg} label={p.isVeg ? t('lc.veg') : t('lc.nonVeg')} />
          {p.prescriptionRequired && (
            <span className="inline-flex items-center gap-0.5 rounded bg-dz-blue-soft px-1.5 text-[11px] font-bold text-dz-blue">
              <FileText className="h-3 w-3" aria-hidden /> {t('lc.rx')}
            </span>
          )}
        </div>
        <b className="mt-0.5 block leading-snug">{p.name}</b>
        {p.unitSize && <span className="block text-xs text-ink-3">{[p.unitSize, p.unit].filter(Boolean).join(' ')}</span>}
        <p className="mt-1 flex items-baseline gap-2">
          <b>{rupees(p.price)}</b>
          {p.mrp && <s className="text-sm text-ink-3">{rupees(p.mrp)}</s>}
          {off >= 5 && <span className="text-xs font-bold text-dz-green">{t('lc.off', { n: off })}</span>}
        </p>
        {p.saltComposition && <p className="mt-0.5 text-xs text-ink-3">{p.saltComposition}</p>}
        {p.lab && (
          <p className="mt-1 text-xs text-ink-2">
            {[p.lab.sampleType, p.lab.fastingHours ? t('lc.lab.fasting', { n: p.lab.fastingHours }) : null, p.lab.reportHours ? t('lc.lab.report', { n: p.lab.reportHours }) : null, p.lab.homeCollection ? t('lc.lab.home') : null].filter(Boolean).join(' · ')}
          </p>
        )}
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.description}</p>}
        {p.fewLeft && <p className="mt-1 text-xs font-bold text-dz-red">{t('lc.fewLeft', { n: p.fewLeft })}</p>}
      </div>
      <div className="flex w-28 shrink-0 flex-col items-center">
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-24 w-28 rounded-xl object-cover" /> : <div className="h-6" />}
        <div className={p.imageUrl ? '-mt-4' : ''}>
          {!p.available ? (
            <span className="inline-block rounded-lg bg-white px-3 py-2 text-xs font-bold text-ink-3 ring-1 ring-line">{t('lc.soldOut')}</span>
          ) : !canOrder ? null : qty > 0 ? (
            <QtyStepper qty={qty} max={p.maxQty} onChange={onQty} label={p.name} />
          ) : (
            <button type="button" onClick={onAdd} className="h-10 rounded-lg border-[1.5px] border-dz-green bg-white px-6 font-extrabold text-dz-green shadow-sm hover:bg-dz-green-soft" aria-label={t('lc.addNamed', { name: p.name })} data-store={store.id}>
              {t('lc.add')}
            </button>
          )}
        </div>
        {needsOptions(p) && p.available && canOrder && <span className="mt-1 text-[10px] text-ink-3">{t('lc.customisable')}</span>}
      </div>
    </li>
  );
}
