import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Apple,
  ArrowRight,
  Bike,
  Carrot,
  Clock,
  Coffee,
  CupSoda,
  Flower2,
  IceCreamCone,
  MapPin,
  Milk,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingBasket,
  ShoppingCart,
  Soup,
  Star,
  Timer,
  Truck,
  BadgePercent,
  type LucideIcon,
} from 'lucide-react';
import { useBasket } from '../categoryPage';
import { simpleLine } from '../../lib/cart';
import { rupees } from '../../lib/format';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { itemIcon } from '../../lib/icons';
import { allShopsQuery, menuQuery, useOverview } from '../../lib/queries';
import type { Menu, Product, StoreCard, Vertical } from '../../lib/types';
import { BrandHead, NowLogo, NowSection, StoreGrid, inKind, offerAt, pill, placed, useAround } from './kit';

// ---------------------------------------------------------------- Stores near you

const SORTS: { k: string; icon: LucideIcon; label: MsgKey }[] = [
  { k: 'near', icon: MapPin, label: 'lc.hm.sort.near' },
  { k: 'fast', icon: Timer, label: 'lc.hm.sort.fast' },
  { k: 'top', icon: Star, label: 'lc.hm.sort.top' },
];
const CATS: { k: string; label: MsgKey; test: (s: StoreCard) => boolean }[] = [
  { k: 'all', label: 'lc.hm.cat.all', test: () => true },
  { k: 'EAT', label: 'lc.hm.kind.EAT', test: (s) => s.vertical === 'EAT' },
  { k: 'GROCERY', label: 'lc.hm.kind.GROCERY', test: (s) => s.vertical === 'GROCERY' },
  { k: 'PHARMACY', label: 'lc.hm.kind.PHARMACY', test: (s) => s.vertical === 'PHARMACY' },
  { k: 'DIAGNOSTICS', label: 'lc.hm.kind.DIAGNOSTICS', test: (s) => s.vertical === 'DIAGNOSTICS' },
  { k: 'LOCAL_STORES', label: 'lc.hm.kind.LOCAL_STORES', test: (s) => inKind(s, 'LOCAL_STORES') },
  { k: 'gifts', label: 'lc.hm.cat.gifts', test: (s) => s.storeType === 'FLOWER' || s.storeType === 'OTHER' || /gift|flower|bouquet|hamper/i.test(s.name) },
  { k: 'STREET', label: 'lc.hm.kind.STREET', test: (s) => inKind(s, 'STREET') },
];
/** Shops shown before "View all". */
const SHOPS_PAGE = 12;
const MIX: Vertical[] = ['EAT', 'GROCERY', 'PHARMACY', 'LOCAL_STORES', 'DIAGNOSTICS'];

/** Every live shop on Delivez, filtered by category (and sort / open / offers); the ones that deliver to you first. */
export function StoresNear({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const a = useAround();
  const allQ = useQuery({ ...allShopsQuery(a.at), placeholderData: (prev) => prev });
  const source = allQ.data?.stores ?? [];
  const [sort, setSort] = useState('near');
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState(false);
  const [free, setFree] = useState(false);
  const [cat, setCat] = useState('all');
  const [all, setAll] = useState(false);
  const hasOffers = source.some((s) => offerAt(s, a.offers));
  const hasFree = source.some((s) => !s.bookable && s.delivers && s.deliveryFee === 0);
  const cats = CATS.map((c) => ({ ...c, n: source.filter(c.test).length })).filter((c) => c.k === 'all' || c.n > 0);
  const test = CATS.find((c) => c.k === cat)?.test ?? (() => true);
  let list = source.filter((s) => test(s) && (!open || s.open) && (!offers || offerAt(s, a.offers)) && (!free || s.deliveryFee === 0));
  // Shops that deliver to you always come before the ones further away.
  list = [...list].sort((p, q) => Number(q.delivers) - Number(p.delivers) || (sort === 'fast' ? Number(q.open) - Number(p.open) || p.etaMinutes - q.etaMinutes : sort === 'top' ? (q.rating?.avg ?? 0) - (p.rating?.avg ?? 0) : p.distanceKm - q.distanceKm));
  // All categories, nearest first: take shops in turn from each kind, so the many labs don't fill the first row.
  if (cat === 'all' && sort === 'near') {
    const mix = (part: StoreCard[]) => {
      const by = MIX.map((v) => part.filter((s) => s.vertical === v));
      const out: StoreCard[] = [];
      for (let i = 0; out.length < part.length; i++) by.forEach((g) => g[i] && out.push(g[i]));
      return out;
    };
    list = [...mix(list.filter((s) => s.delivers)), ...mix(list.filter((s) => !s.delivers))];
  }
  const shown = all ? list : list.slice(0, SHOPS_PAGE);
  return (
    <NowSection id="stores" surface tag={t('lc.hm.all.tag')} title={t('lc.hm.all.title')} intro={t('lc.hm.all.intro', { n: source.length })}>
      <div className="dz-scroll-x -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('lc.hm.sortFilter')}>
        {SORTS.map((x) => (
          <button key={x.k} type="button" aria-pressed={sort === x.k} onClick={() => setSort(x.k)} className={pill(sort === x.k)}>
            <x.icon className="h-4 w-4" aria-hidden /> {t(x.label)}
          </button>
        ))}
        {hasOffers && (
          <button type="button" aria-pressed={offers} onClick={() => setOffers(!offers)} className={pill(offers)}>
            <BadgePercent className="h-4 w-4" aria-hidden /> {t('lc.hm.offers')}
          </button>
        )}
        <button type="button" aria-pressed={open} onClick={() => setOpen(!open)} className={pill(open)}>
          <Clock className="h-4 w-4" aria-hidden /> {t('lc.food.fOpen')}
        </button>
        {hasFree && (
          <button type="button" aria-pressed={free} onClick={() => setFree(!free)} className={pill(free)}>
            <Truck className="h-4 w-4" aria-hidden /> {t('lc.dash.free')}
          </button>
        )}
      </div>
      <div className="dz-scroll-x -mx-4 mb-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('lc.hm.category')}>
        {cats.map((c) => (
          <button key={c.k} type="button" aria-pressed={cat === c.k} onClick={() => (setCat(c.k), setAll(false))} className={pill(cat === c.k)}>
            {t(c.label)} <span className="opacity-60">{c.n}</span>
          </button>
        ))}
      </div>
      <StoreGrid stores={shown} offers={a.offers} empty={t('lc.hm.near.empty')} loading={allQ.isLoading || !a.at} error={allQ.isError} />
      <div className="mt-4 flex flex-wrap gap-2">
        {!all && list.length > SHOPS_PAGE && (
          <button type="button" onClick={() => setAll(true)} className="inline-flex min-h-12 items-center rounded-xl bg-black px-[18px] font-black text-dz-yellow">
            {t('lc.hm.all.viewAll', { n: list.length })}
          </button>
        )}
        {!a.saved && (
          <button type="button" onClick={onStart} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-dz-red px-[18px] font-black text-white">
            <MapPin className="h-4 w-4" aria-hidden /> {t('lc.hm.setLocation')}
          </button>
        )}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Street Cart

const STREET_STEPS: { icon: LucideIcon; label: MsgKey }[] = [
  { icon: Receipt, label: 'lc.hm.street.s1' },
  { icon: ShoppingBasket, label: 'lc.hm.street.s2' },
  { icon: Package, label: 'lc.hm.street.s3' },
  { icon: Bike, label: 'lc.hm.street.s4' },
];
const STREET_ITEMS: { icon: LucideIcon; label: MsgKey }[] = [
  { icon: Apple, label: 'lc.hm.t.fruit' },
  { icon: Carrot, label: 'lc.hm.t.vegetables' },
  { icon: Soup, label: 'lc.hm.t.chaat' },
  { icon: CupSoda, label: 'lc.hm.t.juice' },
  { icon: Coffee, label: 'lc.hm.t.tea' },
  { icon: Flower2, label: 'lc.hm.t.flowers' },
  { icon: IceCreamCone, label: 'lc.hm.t.iceCream' },
  { icon: Milk, label: 'lc.hm.t.milkDairy' },
];
const STREET_CHIPS: MsgKey[] = ['lc.hm.t.fruit', 'lc.hm.t.vegetables', 'lc.hm.t.chaat', 'lc.hm.t.juice', 'lc.hm.t.tea', 'lc.hm.t.flowers', 'lc.hm.t.tiffin', 'lc.hm.t.corn'];

/** Street carts and society vendors near you, on the home page. */
export function StreetBand() {
  const { t } = useI18n();
  const a = useAround();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setK((n) => (n + 1) % STREET_STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);
  const shops = a.stores.filter((s) => inKind(s, 'STREET'));
  const open = shops.filter((s) => s.open).sort((p, q) => p.etaMinutes - q.etaMinutes);
  const first = open[0];
  const stats: [string, string][] = [
    [first ? t('lc.store.mins', { n: first.etaMinutes }) : '—', t('lc.hm.quickestNow')],
    [String(shops.length), placed(t, a.where, 'lc.hm.street.shops', 'lc.hm.street.shopsYou')],
    [String(open.length), t('lc.street.statOpen')],
  ];
  return (
    <section id="street" className="scroll-mt-28 bg-now-bg px-4 py-[52px] sm:px-6">
      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-7 text-white" style={{ background: 'linear-gradient(150deg,#4A1A05 0%,#8A3208 55%,#C2470B 100%)' }}>
          <ShoppingCart className="pointer-events-none absolute -bottom-10 right-6 h-60 w-60 text-white opacity-[0.08]" aria-hidden />
          <span className="w-fit rounded-2xl bg-dz-yellow px-3 py-2">
            <NowLogo k="STREET" className="h-[38px]" />
          </span>
          <h2 className="text-[clamp(34px,3.8vw,52px)] leading-[0.95]">
            {t('lc.hm.street.title1')} <span className="text-dz-yellow">{t('lc.hm.street.title2')}</span>
          </h2>
          <p className="max-w-[56ch] text-[#FFE3D2]">{t('lc.hm.street.body')}</p>
          <div className="flex flex-wrap gap-2">
            {STREET_CHIPS.map((x) => (
              <span key={x} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                {t(x)}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-2.5 pt-2">
            <Link to="/shops?v=STREET" className="inline-flex items-center gap-1.5 rounded-xl bg-dz-yellow px-[18px] py-3 text-sm font-black text-black transition hover:-translate-y-0.5" data-street-cta>
              {t('lc.hm.street.cta')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a href="#how" className="inline-flex items-center rounded-xl border-[1.5px] border-white/30 px-[18px] py-3 text-sm font-black text-white transition hover:border-white">
              {t('lc.hm.street.how')}
            </a>
          </div>
        </div>
        <div className="grid content-start gap-3.5 rounded-[28px] bg-[#0E0E0E] p-6 text-white ring-1 ring-white/5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[1px] text-neutral-400">{t('lc.hm.quickestHead')}</p>
              <b className="font-display text-[44px] leading-none text-dz-yellow tabular-nums">{a.loading ? '…' : first ? t('lc.store.mins', { n: first.etaMinutes }) : '—'}</b>
            </div>
            {first && (
              <span className="inline-flex max-w-full items-center gap-1.5 truncate text-[13px] font-extrabold text-[#5FE0A0]">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#5FE0A0]" /> <span className="truncate">{first.name}</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STREET_STEPS.map((s, i) => (
              <div key={s.label} className={`rounded-2xl border p-3 text-[12.5px] transition duration-300 ${i <= k ? 'border-[#C2470B] bg-[#3D1A08] text-white' : 'border-[#262626] bg-[#181818] text-neutral-400'}`}>
                <s.icon className="mb-1.5 h-5 w-5" aria-hidden />
                {t(s.label)}
              </div>
            ))}
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-[#222]">
            <i className="block h-full bg-gradient-to-r from-[#C2470B] to-dz-yellow transition-all duration-500" style={{ width: `${((k + 1) / STREET_STEPS.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STREET_ITEMS.map((s) => (
              <span key={s.label} className="grid justify-items-center gap-1.5 rounded-2xl bg-[#181818] px-1 py-3 text-center text-[11.5px] text-neutral-300">
                <s.icon className="h-6 w-6 text-dz-yellow" aria-hidden />
                {t(s.label)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-dz-yellow p-3 text-black">
                <b className="block font-display text-[24px] leading-none">{n}</b>
                <small className="mt-1 block text-[11.5px] font-bold leading-tight">{l}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Shop products

const SHOP_KINDS: { v: Vertical; label: MsgKey }[] = [
  { v: 'GROCERY', label: 'lc.hm.kind.GROCERY' },
  { v: 'PHARMACY', label: 'lc.hm.kind.PHARMACY' },
  { v: 'LOCAL_STORES', label: 'lc.hm.kind.LOCAL_STORES' },
  { v: 'EAT', label: 'lc.v.EAT' },
];
/** Menus read for products: the nearest open shops of the kind picked. */
const MENUS = 6;
const PAGE = 15;
const offOf = (p: Product) => (p.mrp && p.mrp > simpleLine(p).unitPrice ? Math.round(((p.mrp - simpleLine(p).unitPrice) / p.mrp) * 100) : 0);

/** Products from the shops near you, with the design's filters (only the ones the data can answer). */
export function ShopProducts() {
  const { t } = useI18n();
  const a = useAround();
  const basket = useBasket();
  const [v, setV] = useState<Vertical>('GROCERY');
  const [aisle, setAisle] = useState('');
  const [max, setMax] = useState<number | null>(null);
  const [disc, setDisc] = useState(0);
  const [stock, setStock] = useState(false);
  const [veg, setVeg] = useState(false);
  const [n, setN] = useState(PAGE);
  const shops = a.stores.filter((s) => s.vertical === v && s.open).slice(0, MENUS);
  const menus = useQueries({ queries: shops.map((s) => ({ ...menuQuery(s.slug ?? s.id, a.at), staleTime: 60_000 })) });
  const loaded = menus.map((q) => q.data).filter((m): m is Menu => !!m && m.store.open);
  const loading = a.loading || (shops.length > 0 && menus.some((q) => q.isLoading) && !loaded.length);
  // Shops take turns, so the first row isn't one shop's whole menu.
  const lists = loaded.map((m) => {
      const names = new Map(m.categories.map((c) => [c.id, c.name]));
      return m.products.filter((p) => !p.prescriptionRequired).map((p) => ({ p, m, aisle: names.get(p.categoryId ?? '') ?? '' }));
    });
  const items: { p: Product; m: Menu; aisle: string }[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) lists.forEach((l) => l[i] && items.push(l[i]));
  const aisles = [...new Set(items.map((i) => i.aisle).filter(Boolean))].sort();
  const top = Math.max(0, ...items.map((i) => simpleLine(i.p).unitPrice));
  const cap = max ?? top;
  const shown = items.filter((i) => (!aisle || i.aisle === aisle) && simpleLine(i.p).unitPrice <= cap && offOf(i.p) >= disc && (!stock || i.p.available) && (!veg || i.p.isVeg === true));
  const reset = (to: Vertical) => (setV(to), setAisle(''), setMax(null), setN(PAGE));
  const label = t(SHOP_KINDS.find((k) => k.v === v)!.label);
  const field = 'mt-1 w-full rounded-[10px] border-[1.5px] border-now-line bg-now-bg px-3 py-2 text-sm font-bold text-now-text';
  return (
    <NowSection id="shop" surface tag={t('lc.hm.shop.tag')} title={label} intro={placed(t, a.where, 'lc.hm.shop.intro', 'lc.hm.shop.introYou')}>
      <div className="grid items-start gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="grid gap-3 rounded-[20px] border border-now-line bg-now-card p-4 text-now-text" aria-label={t('lc.hm.shop.filters')}>
          <label className="text-[13px] font-extrabold">
            {t('lc.hm.shop.shop')}
            <select value={v} onChange={(e) => reset(e.target.value as Vertical)} className={field}>
              {SHOP_KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  {t(k.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-extrabold">
            {t('lc.hm.category')}
            <select value={aisle} onChange={(e) => (setAisle(e.target.value), setN(PAGE))} className={field}>
              <option value="">{t('lc.home.all')}</option>
              {aisles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          {top > 0 && (
            <label className="text-[13px] font-extrabold">
              {t('lc.hm.shop.maxPrice', { price: rupees(cap) })}
              <input type="range" min={0} max={top} step={1000} value={cap} onChange={(e) => setMax(Number(e.target.value))} className="mt-2 w-full accent-[#E8130F]" />
            </label>
          )}
          <label className="text-[13px] font-extrabold">
            {t('lc.hm.shop.discount')}
            <select value={disc} onChange={(e) => setDisc(Number(e.target.value))} className={field}>
              <option value={0}>{t('lc.hm.any')}</option>
              <option value={10}>{t('lc.hm.shop.offMin', { n: 10 })}</option>
              <option value={20}>{t('lc.hm.shop.offMin', { n: 20 })}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] font-extrabold">
            <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} className="h-4 w-4 accent-[#E8130F]" /> {t('lc.hm.shop.inStockOnly')}
          </label>
          <label className="flex items-center gap-2 text-[13px] font-extrabold">
            <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} className="h-4 w-4 accent-[#17803A]" /> {t('lc.hm.shop.veg')}
          </label>
        </aside>
        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-64 animate-pulse rounded-[18px] bg-now-card" />)}</div>
          ) : !shops.length ? (
            <p className="rounded-2xl border border-now-line bg-now-card p-6 text-now-muted">{placed(t, a.where, 'lc.hm.shop.none', 'lc.hm.shop.noneYou', { kind: label.toLowerCase() })}</p>
          ) : !shown.length ? (
            <p className="rounded-2xl border border-now-line bg-now-card p-6 text-now-muted">{t('lc.hm.shop.noMatch')}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-live="polite" data-products>
                {shown.slice(0, n).map((i) => (
                  <ProductTile key={`${i.m.store.id}-${i.p.id}`} p={i.p} m={i.m} aisle={i.aisle} basket={basket} />
                ))}
              </div>
              {shown.length > n && (
                <button type="button" onClick={() => setN(n + PAGE)} className="mt-4 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-now-line bg-now-card px-[18px] font-black text-now-text hover:border-now-text">
                  {t('lc.hm.showMore', { n: shown.length - n })}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {basket.ui}
    </NowSection>
  );
}

function ProductTile({ p, m, aisle, basket }: { p: Product; m: Menu; aisle: string; basket: ReturnType<typeof useBasket> }) {
  const { t } = useI18n();
  const Icon = itemIcon(p.name, aisle);
  const price = simpleLine(p).unitPrice;
  const off = offOf(p);
  const qty = basket.qtyOf(m.store.id, p.id);
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] border border-now-line bg-now-card p-2.5 text-now-text" data-product={p.id}>
      <div className="relative grid h-[84px] place-items-center overflow-hidden rounded-[14px] bg-now-surface">
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon className="h-9 w-9 text-dz-red" strokeWidth={1.8} aria-hidden />}
        {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-[#17803A] px-1.5 py-0.5 text-[10.5px] font-black uppercase text-white">{t('lc.off', { n: off })}</span>}
      </div>
      <b className="line-clamp-2 min-h-[34px] text-[13.5px] leading-tight">{p.name}</b>
      <small className="truncate text-xs text-now-muted">{[p.unitSize && [p.unitSize, p.unit].filter(Boolean).join(' '), m.store.name].filter(Boolean).join(' · ')}</small>
      <span className="font-black">
        {rupees(price)}
        {off > 0 && <s className="ml-1 text-xs font-medium text-now-muted">{rupees(p.mrp!)}</s>}
      </span>
      <small className={`text-xs font-bold ${p.available ? 'text-[#17803A]' : 'text-dz-red'}`}>{!p.available ? t('lc.hm.outOfStock') : p.fewLeft ? t('lc.fewLeft', { n: p.fewLeft }) : t('lc.hm.inStock')}</small>
      {!p.available ? (
        <span className="mt-auto rounded-[10px] bg-now-surface py-2 text-center text-sm font-black text-now-muted">{t('lc.hm.outOfStock')}</span>
      ) : qty > 0 ? (
        <span className="mt-auto flex items-center justify-between rounded-[10px] bg-dz-red text-white">
          <button type="button" onClick={() => basket.step(m.store, p, qty - 1)} className="grid h-9 w-9 place-items-center" aria-label={t('lc.hm.removeOne', { name: p.name })}>
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <b aria-live="polite">{qty}</b>
          <button type="button" disabled={qty >= p.maxQty} onClick={() => basket.step(m.store, p, qty + 1)} className="grid h-9 w-9 place-items-center disabled:opacity-50" aria-label={t('lc.hm.addOne', { name: p.name })}>
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => basket.add(m.store, p)} className="mt-auto rounded-[10px] border-[1.5px] border-dz-red bg-white py-2 text-sm font-black text-dz-red transition hover:bg-dz-red hover:text-white" aria-label={t('lc.addNamed', { name: p.name })}>
          {t('lc.hm.add')}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Restaurants

export function FoodNear() {
  const { t } = useI18n();
  const a = useAround();
  const types = useOverview().data?.verticals.EAT.types.map((t) => t.name).slice(0, 8) ?? [];
  const [cuisine, setCuisine] = useState('');
  const [top, setTop] = useState(false);
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState(false);
  const eat = a.stores.filter((s) => s.vertical === 'EAT');
  const cuisines = types.filter((t) => eat.some((s) => s.cuisines.includes(t)));
  const hasOffers = eat.some((s) => offerAt(s, a.offers));
  const list = eat.filter((s) => (!cuisine || s.cuisines.includes(cuisine)) && (!top || (s.rating?.avg ?? 0) >= 4) && (!open || s.open) && (!offers || offerAt(s, a.offers))).slice(0, 8);
  return (
    <section id="food" className="scroll-mt-28 bg-now-bg px-4 py-[52px] sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        <BrandHead k="EAT" tag={t('lc.hm.food.tag')} title={t('lc.hm.food.title')} intro={t('lc.hm.food.intro')} />
        <div className="dz-scroll-x -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('lc.hm.cuisine')}>
          <button type="button" aria-pressed={!cuisine} onClick={() => setCuisine('')} className={pill(!cuisine)}>
            {t('lc.home.all')}
          </button>
          {cuisines.map((c) => (
            <button key={c} type="button" aria-pressed={cuisine === c} onClick={() => setCuisine(cuisine === c ? '' : c)} className={pill(cuisine === c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t('lc.hm.food.options')}>
          <button type="button" aria-pressed={top} onClick={() => setTop(!top)} className={pill(top)}>
            <Star className="h-4 w-4" aria-hidden /> {t('lc.hm.rating4')}
          </button>
          <button type="button" aria-pressed={open} onClick={() => setOpen(!open)} className={pill(open)}>
            <Clock className="h-4 w-4" aria-hidden /> {t('lc.food.fOpen')}
          </button>
          {hasOffers && (
            <button type="button" aria-pressed={offers} onClick={() => setOffers(!offers)} className={pill(offers)}>
              <BadgePercent className="h-4 w-4" aria-hidden /> {t('lc.hm.offers')}
            </button>
          )}
        </div>
        <StoreGrid stores={list} offers={a.offers} empty={eat.length ? t('lc.hm.food.noMatch') : placed(t, a.where, 'lc.hm.food.none', 'lc.hm.food.noneYou')} />
        <Link to="/shops?v=EAT" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
          {t('lc.hm.food.cta')} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
