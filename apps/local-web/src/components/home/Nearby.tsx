import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  ArrowRight,
  Baby,
  Battery,
  Bike,
  Clock,
  Croissant,
  HeartPulse,
  Home,
  MapPin,
  Milk,
  Minus,
  Package,
  Plus,
  Popcorn,
  Receipt,
  ShoppingBasket,
  Sparkles,
  Star,
  Timer,
  Truck,
  BadgePercent,
  type LucideIcon,
} from 'lucide-react';
import { useBasket } from '../categoryPage';
import { simpleLine } from '../../lib/cart';
import { rupees } from '../../lib/format';
import { itemIcon } from '../../lib/icons';
import { menuQuery, useOverview } from '../../lib/queries';
import type { Menu, Product, StoreCard, Vertical } from '../../lib/types';
import { BrandHead, CityNote, NowLogo, NowSection, StoreGrid, inKind, offerAt, pill, useAround } from './kit';

// ---------------------------------------------------------------- Stores near you

const SORTS: { k: string; icon: LucideIcon; label: string }[] = [
  { k: 'near', icon: MapPin, label: 'Nearby' },
  { k: 'fast', icon: Timer, label: 'Fastest' },
  { k: 'top', icon: Star, label: 'Top rated' },
];
const CATS: { k: string; label: string; test: (s: StoreCard) => boolean }[] = [
  { k: 'all', label: 'All categories', test: () => true },
  { k: 'EAT', label: 'Food & Restaurants', test: (s) => s.vertical === 'EAT' },
  { k: 'GROCERY', label: 'Grocery', test: (s) => s.vertical === 'GROCERY' },
  { k: 'PHARMACY', label: 'Pharmacy & Wellness', test: (s) => s.vertical === 'PHARMACY' },
  { k: 'DIAGNOSTICS', label: 'Lab Tests', test: (s) => s.vertical === 'DIAGNOSTICS' },
  { k: 'LOCAL_STORES', label: 'Local Stores', test: (s) => s.vertical === 'LOCAL_STORES' },
  { k: 'gifts', label: 'Gifts & Flowers', test: (s) => s.storeType === 'FLOWER' || s.storeType === 'OTHER' || /gift|flower|bouquet|hamper/i.test(s.name) },
  { k: 'street', label: 'Street Carts', test: (s) => inKind(s, 'STREET') },
];
const MIX: Vertical[] = ['EAT', 'GROCERY', 'PHARMACY', 'LOCAL_STORES', 'DIAGNOSTICS'];

export function StoresNear({ onStart }: { onStart: () => void }) {
  const a = useAround();
  const [sort, setSort] = useState('near');
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState(false);
  const [free, setFree] = useState(false);
  const [cat, setCat] = useState('all');
  const [all, setAll] = useState(false);
  const hasOffers = a.stores.some((s) => offerAt(s, a.offers));
  const hasFree = a.stores.some((s) => !s.bookable && s.deliveryFee === 0);
  const cats = CATS.filter((c) => c.k === 'all' || a.stores.some(c.test));
  const test = CATS.find((c) => c.k === cat)?.test ?? (() => true);
  let list = a.stores.filter((s) => test(s) && (!open || s.open) && (!offers || offerAt(s, a.offers)) && (!free || s.deliveryFee === 0));
  list = [...list].sort((p, q) => (sort === 'fast' ? Number(q.open) - Number(p.open) || p.etaMinutes - q.etaMinutes : sort === 'top' ? (q.rating?.avg ?? 0) - (p.rating?.avg ?? 0) : p.distanceKm - q.distanceKm));
  // All categories, nearest first: take shops in turn from each kind, so the many labs don't fill the first row.
  if (cat === 'all' && sort === 'near') {
    const by = MIX.map((v) => list.filter((s) => s.vertical === v));
    const mixed: StoreCard[] = [];
    for (let i = 0; mixed.length < list.length; i++) by.forEach((g) => g[i] && mixed.push(g[i]));
    list = mixed;
  }
  const shown = all ? list : list.slice(0, 8);
  return (
    <NowSection id="stores" surface tag="Nearby stores" title="Stores Near You" intro={`Real shops that deliver ${a.saved ? `to ${a.where}` : a.where ? `around ${a.where}` : 'near you'}. Filter, then tap a shop to see what it sells.`}>
      <CityNote />
      <div className="dz-scroll-x -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Sort and filter">
        {SORTS.map((x) => (
          <button key={x.k} type="button" aria-pressed={sort === x.k} onClick={() => setSort(x.k)} className={pill(sort === x.k)}>
            <x.icon className="h-4 w-4" aria-hidden /> {x.label}
          </button>
        ))}
        {hasOffers && (
          <button type="button" aria-pressed={offers} onClick={() => setOffers(!offers)} className={pill(offers)}>
            <BadgePercent className="h-4 w-4" aria-hidden /> Offers
          </button>
        )}
        <button type="button" aria-pressed={open} onClick={() => setOpen(!open)} className={pill(open)}>
          <Clock className="h-4 w-4" aria-hidden /> Open now
        </button>
        {hasFree && (
          <button type="button" aria-pressed={free} onClick={() => setFree(!free)} className={pill(free)}>
            <Truck className="h-4 w-4" aria-hidden /> Free delivery
          </button>
        )}
      </div>
      <div className="dz-scroll-x -mx-4 mb-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Category">
        {cats.map((c) => (
          <button key={c.k} type="button" aria-pressed={cat === c.k} onClick={() => (setCat(c.k), setAll(false))} className={pill(cat === c.k)}>
            {c.label}
          </button>
        ))}
      </div>
      <StoreGrid stores={shown} offers={a.offers} empty="No shops match these filters yet." />
      <div className="mt-4 flex flex-wrap gap-2">
        {!all && list.length > 8 && (
          <button type="button" onClick={() => setAll(true)} className="inline-flex min-h-12 items-center rounded-xl bg-black px-[18px] font-black text-dz-yellow">
            View all {list.length} nearby stores
          </button>
        )}
        {!a.saved && (
          <button type="button" onClick={onStart} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-dz-red px-[18px] font-black text-white">
            <MapPin className="h-4 w-4" aria-hidden /> Set my location
          </button>
        )}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Rush

const RUSH_STEPS: { icon: LucideIcon; label: string }[] = [
  { icon: Receipt, label: 'Order placed' },
  { icon: ShoppingBasket, label: 'Picked by the shop' },
  { icon: Package, label: 'Packed' },
  { icon: Bike, label: 'Rider on the way' },
];
const RUSH_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Milk, label: 'Milk' },
  { icon: Croissant, label: 'Bread' },
  { icon: Popcorn, label: 'Snacks' },
  { icon: Sparkles, label: 'Personal care' },
  { icon: Battery, label: 'Batteries' },
  { icon: HeartPulse, label: 'First aid' },
  { icon: Baby, label: 'Baby care' },
  { icon: Home, label: 'Household' },
];

export function RushBand() {
  const a = useAround();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setK((n) => (n + 1) % RUSH_STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);
  const shops = a.stores.filter((s) => inKind(s, 'RUSH'));
  const open = shops.filter((s) => s.open).sort((p, q) => p.etaMinutes - q.etaMinutes);
  const late = open.filter((s) => !!s.closesAt && s.closesAt >= '22:00').length;
  const first = open[0];
  const stats: [string, string][] = [
    [first ? `${first.etaMinutes} min` : '—', 'quickest delivery right now'],
    [String(shops.length), `essentials shops near ${a.where ?? 'you'}`],
    [String(late), 'open till 10 pm or later today'],
  ];
  return (
    <section id="quick" className="scroll-mt-28 bg-now-bg px-4 py-[52px] sm:px-6">
      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-7 text-white" style={{ background: 'linear-gradient(150deg,#2A0F4A 0%,#4B1B86 55%,#7B2FD4 100%)' }}>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute -bottom-10 right-6 h-60 w-60 opacity-[0.08]" aria-hidden>
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="#fff" />
          </svg>
          <span className="w-fit rounded-2xl bg-dz-yellow px-3 py-2">
            <NowLogo k="RUSH" className="h-[38px]" />
          </span>
          <h2 className="text-[clamp(34px,3.8vw,52px)] leading-[0.95]">
            Need essentials fast? <span className="text-dz-yellow">Rush it.</span>
          </h2>
          <p className="max-w-[56ch] text-[#DCCFF2]">Everyday essentials from the shops that can reach you quickest, packed and brought by a Delivez rider. Delivez Rush stores, stocked only with essentials, are coming soon.</p>
          <div className="flex flex-wrap gap-2">
            {['Quickest shops first', 'Daily essentials', 'Grocery', 'Snacks', 'Beverages', 'Personal care', 'Household', 'Medicines'].map((x) => (
              <span key={x} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                {x}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-2.5 pt-2">
            <Link to="/shops?v=RUSH" className="inline-flex items-center gap-1.5 rounded-xl bg-dz-yellow px-[18px] py-3 text-sm font-black text-black transition hover:-translate-y-0.5" data-rush-cta>
              Shop Rush <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a href="#how" className="inline-flex items-center rounded-xl border-[1.5px] border-white/30 px-[18px] py-3 text-sm font-black text-white transition hover:border-white">
              How Rush works
            </a>
          </div>
        </div>
        <div className="grid content-start gap-3.5 rounded-[28px] bg-[#0E0E0E] p-6 text-white ring-1 ring-white/5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[1px] text-neutral-400">Quickest right now</p>
              <b className="font-display text-[44px] leading-none text-dz-yellow tabular-nums">{a.loading ? '…' : first ? `${first.etaMinutes} min` : '—'}</b>
            </div>
            {first && (
              <span className="inline-flex max-w-full items-center gap-1.5 truncate text-[13px] font-extrabold text-[#5FE0A0]">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#5FE0A0]" /> <span className="truncate">{first.name}</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RUSH_STEPS.map((s, i) => (
              <div key={s.label} className={`rounded-2xl border p-3 text-[12.5px] transition duration-300 ${i <= k ? 'border-[#7B2FD4] bg-[#24133D] text-white' : 'border-[#262626] bg-[#181818] text-neutral-400'}`}>
                <s.icon className="mb-1.5 h-5 w-5" aria-hidden />
                {s.label}
              </div>
            ))}
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-[#222]">
            <i className="block h-full bg-gradient-to-r from-[#7B2FD4] to-dz-yellow transition-all duration-500" style={{ width: `${((k + 1) / RUSH_STEPS.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {RUSH_ITEMS.map((s) => (
              <span key={s.label} className="grid justify-items-center gap-1.5 rounded-2xl bg-[#181818] px-1 py-3 text-center text-[11.5px] text-neutral-300">
                <s.icon className="h-6 w-6 text-dz-yellow" aria-hidden />
                {s.label}
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

const SHOP_KINDS: { v: Vertical; label: string }[] = [
  { v: 'GROCERY', label: 'Grocery' },
  { v: 'PHARMACY', label: 'Pharmacy & Wellness' },
  { v: 'LOCAL_STORES', label: 'Local Stores' },
  { v: 'EAT', label: 'Food' },
];
/** Menus read for products: the nearest open shops of the kind picked. */
const MENUS = 6;
const PAGE = 15;
const offOf = (p: Product) => (p.mrp && p.mrp > simpleLine(p).unitPrice ? Math.round(((p.mrp - simpleLine(p).unitPrice) / p.mrp) * 100) : 0);

/** Products from the shops near you, with the design's filters (only the ones the data can answer). */
export function ShopProducts() {
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
  const label = SHOP_KINDS.find((k) => k.v === v)!.label;
  const field = 'mt-1 w-full rounded-[10px] border-[1.5px] border-now-line bg-now-bg px-3 py-2 text-sm font-bold text-now-text';
  return (
    <NowSection id="shop" surface tag="Shop products" title={label} intro={`From the shops nearest ${a.where ?? 'you'} that are open now. Filter, then add straight to your cart.`}>
      <div className="grid items-start gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="grid gap-3 rounded-[20px] border border-now-line bg-now-card p-4 text-now-text" aria-label="Product filters">
          <label className="text-[13px] font-extrabold">
            Shop
            <select value={v} onChange={(e) => reset(e.target.value as Vertical)} className={field}>
              {SHOP_KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-extrabold">
            Category
            <select value={aisle} onChange={(e) => (setAisle(e.target.value), setN(PAGE))} className={field}>
              <option value="">All</option>
              {aisles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          {top > 0 && (
            <label className="text-[13px] font-extrabold">
              Max price: {rupees(cap)}
              <input type="range" min={0} max={top} step={1000} value={cap} onChange={(e) => setMax(Number(e.target.value))} className="mt-2 w-full accent-[#E8130F]" />
            </label>
          )}
          <label className="text-[13px] font-extrabold">
            Discount
            <select value={disc} onChange={(e) => setDisc(Number(e.target.value))} className={field}>
              <option value={0}>Any</option>
              <option value={10}>10% off or more</option>
              <option value={20}>20% off or more</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] font-extrabold">
            <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} className="h-4 w-4 accent-[#E8130F]" /> In stock only
          </label>
          <label className="flex items-center gap-2 text-[13px] font-extrabold">
            <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} className="h-4 w-4 accent-[#17803A]" /> Vegetarian
          </label>
        </aside>
        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-64 animate-pulse rounded-[18px] bg-now-card" />)}</div>
          ) : !shops.length ? (
            <p className="rounded-2xl border border-now-line bg-now-card p-6 text-now-muted">{`No ${label.toLowerCase()} shops near ${a.where ?? 'you'} are open right now.`}</p>
          ) : !shown.length ? (
            <p className="rounded-2xl border border-now-line bg-now-card p-6 text-now-muted">No products match these filters.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-live="polite" data-products>
                {shown.slice(0, n).map((i) => (
                  <ProductTile key={`${i.m.store.id}-${i.p.id}`} p={i.p} m={i.m} aisle={i.aisle} basket={basket} />
                ))}
              </div>
              {shown.length > n && (
                <button type="button" onClick={() => setN(n + PAGE)} className="mt-4 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-now-line bg-now-card px-[18px] font-black text-now-text hover:border-now-text">
                  Show more ({shown.length - n})
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
  const Icon = itemIcon(p.name, aisle);
  const price = simpleLine(p).unitPrice;
  const off = offOf(p);
  const qty = basket.qtyOf(m.store.id, p.id);
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] border border-now-line bg-now-card p-2.5 text-now-text" data-product={p.id}>
      <div className="relative grid h-[84px] place-items-center overflow-hidden rounded-[14px] bg-now-surface">
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon className="h-9 w-9 text-dz-red" strokeWidth={1.8} aria-hidden />}
        {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-[#17803A] px-1.5 py-0.5 text-[10.5px] font-black text-white">{off}% OFF</span>}
      </div>
      <b className="line-clamp-2 min-h-[34px] text-[13.5px] leading-tight">{p.name}</b>
      <small className="truncate text-xs text-now-muted">{[p.unitSize && [p.unitSize, p.unit].filter(Boolean).join(' '), m.store.name].filter(Boolean).join(' · ')}</small>
      <span className="font-black">
        {rupees(price)}
        {off > 0 && <s className="ml-1 text-xs font-medium text-now-muted">{rupees(p.mrp!)}</s>}
      </span>
      <small className={`text-xs font-bold ${p.available ? 'text-[#17803A]' : 'text-dz-red'}`}>{!p.available ? 'Out of stock' : p.fewLeft ? `Only ${p.fewLeft} left` : 'In stock'}</small>
      {!p.available ? (
        <span className="mt-auto rounded-[10px] bg-now-surface py-2 text-center text-sm font-black text-now-muted">Out of stock</span>
      ) : qty > 0 ? (
        <span className="mt-auto flex items-center justify-between rounded-[10px] bg-dz-red text-white">
          <button type="button" onClick={() => basket.step(m.store, p, qty - 1)} className="grid h-9 w-9 place-items-center" aria-label={`Remove one ${p.name}`}>
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <b aria-live="polite">{qty}</b>
          <button type="button" disabled={qty >= p.maxQty} onClick={() => basket.step(m.store, p, qty + 1)} className="grid h-9 w-9 place-items-center disabled:opacity-50" aria-label={`Add one more ${p.name}`}>
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => basket.add(m.store, p)} className="mt-auto rounded-[10px] border-[1.5px] border-dz-red bg-white py-2 text-sm font-black text-dz-red transition hover:bg-dz-red hover:text-white" aria-label={`Add ${p.name}`}>
          Add
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Restaurants

export function FoodNear() {
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
        <BrandHead k="EAT" tag="Food & restaurants" title="Restaurants near you." intro="Cuisines, ratings and delivery times from the restaurants that deliver to you." />
        <div className="dz-scroll-x -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Cuisine">
          <button type="button" aria-pressed={!cuisine} onClick={() => setCuisine('')} className={pill(!cuisine)}>
            All
          </button>
          {cuisines.map((c) => (
            <button key={c} type="button" aria-pressed={cuisine === c} onClick={() => setCuisine(cuisine === c ? '' : c)} className={pill(cuisine === c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Food options">
          <button type="button" aria-pressed={top} onClick={() => setTop(!top)} className={pill(top)}>
            <Star className="h-4 w-4" aria-hidden /> Rating 4+
          </button>
          <button type="button" aria-pressed={open} onClick={() => setOpen(!open)} className={pill(open)}>
            <Clock className="h-4 w-4" aria-hidden /> Open now
          </button>
          {hasOffers && (
            <button type="button" aria-pressed={offers} onClick={() => setOffers(!offers)} className={pill(offers)}>
              <BadgePercent className="h-4 w-4" aria-hidden /> Offers
            </button>
          )}
        </div>
        <StoreGrid stores={list} offers={a.offers} empty={eat.length ? 'No restaurants match these filters.' : `No restaurants deliver to ${a.where ?? 'you'} yet.`} />
        <Link to="/shops?v=EAT" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
          Order Food <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
