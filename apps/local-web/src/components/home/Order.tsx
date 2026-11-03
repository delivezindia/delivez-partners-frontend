import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  ArrowRight,
  Bike,
  ChefHat,
  Check,
  CreditCard,
  Gift,
  Home,
  MapPin,
  PackageCheck,
  Pill,
  Receipt,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Timer,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import en from '@delivez/i18n/locales/en.json';
import { useBasket } from '../categoryPage';
import { useAuth } from '../../lib/auth-store';
import { simpleLine } from '../../lib/cart';
import { km, rupees } from '../../lib/format';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { itemIcon, storeLook } from '../../lib/icons';
import { STATUS_LABEL, useOrders, type CustomerOrder, type OrderStatus } from '../../lib/orders';
import { menuQuery, useNearby, useOverview, type PublicOffer } from '../../lib/queries';
import type { Menu, Product } from '../../lib/types';
import { KINDS, NowSection, Soon, pill, placed, useAround } from './kit';

// ---------------------------------------------------------------- How it works

const STEPS: { icon: LucideIcon; title: MsgKey; body: MsgKey }[] = [
  { icon: MapPin, title: 'lc.land.s1', body: 'lc.land.s1b' },
  { icon: Store, title: 'lc.site.s2', body: 'lc.site.s2b' },
  { icon: ShoppingCart, title: 'lc.land.s2', body: 'lc.land.s2b' },
  { icon: Bike, title: 'lc.land.s3', body: 'lc.land.s3b' },
];

export function HowBand() {
  const { t } = useI18n();
  const [on, setOn] = useState(2);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setOn((n) => (n + 1) % STEPS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <NowSection id="how" surface tag={t('lc.hm.how.tag')} title={t('lc.hm.how.title')}>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} data-step={i} aria-current={i === on ? 'step' : undefined} className={`rounded-[20px] border p-5 transition duration-300 ${i === on ? 'border-black bg-black text-white' : 'border-now-line bg-now-card text-now-text'}`}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[40px] leading-none text-dz-red">{i + 1}</span>
              <s.icon className={`h-6 w-6 ${i === on ? 'text-dz-yellow' : 'text-now-muted'}`} aria-hidden />
            </div>
            <b className="mt-3 block font-display text-[21px]">{t(s.title)}</b>
            <p className={`mt-1 text-sm ${i === on ? 'text-neutral-300' : 'text-now-muted'}`}>{t(s.body)}</p>
          </li>
        ))}
      </ol>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Search

/** Shown in the reader's language; tapping one searches the English word, as products are named in the shops. */
const EXAMPLES: MsgKey[] = ['lc.hm.t.paracetamol', 'lc.hm.t.milk', 'lc.hm.t.flowers', 'lc.hm.t.charger', 'lc.hm.t.pizza', 'lc.hm.t.petFood'];
type Tab = 'products' | 'stores' | 'categories';
const TAB_LABEL: Record<Tab, MsgKey> = { products: 'lc.hm.s.products', stores: 'lc.hm.s.stores', categories: 'lc.home.categories' };

export function SearchBand() {
  const { t } = useI18n();
  const a = useAround();
  const overview = useOverview().data;
  const basket = useBasket();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [tab, setTab] = useState<Tab>('products');
  const [dist, setDist] = useState(0);
  const [time, setTime] = useState(0);
  const [rating, setRating] = useState(0);
  const [price, setPrice] = useState(0);
  const [openOnly, setOpenOnly] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);
  const searching = term.length >= 2;
  // The API finds shops by name, cuisine or a product they sell.
  const hits = useNearby(searching ? a.at : null, null, term);
  const stores = searching && !hits.isPlaceholderData ? (hits.data?.stores ?? []).filter((s) => s.delivers && (!dist || s.distanceKm <= dist) && (!time || s.etaMinutes <= time) && (!rating || (s.rating?.avg ?? 0) >= rating) && (!openOnly || s.open)) : [];
  const menus = useQueries({ queries: tab === 'products' ? stores.slice(0, 4).map((s) => ({ ...menuQuery(s.slug ?? s.id, a.at), staleTime: 60_000 })) : [] });
  const needle = term.toLowerCase();
  const products = menus
    .map((m) => m.data)
    .filter((m): m is Menu => !!m)
    .flatMap((m) => m.products.filter((p) => p.available && !p.prescriptionRequired && p.name.toLowerCase().includes(needle) && (!price || simpleLine(p).unitPrice <= price)).map((p) => ({ p, m })))
    .slice(0, 12);
  const kinds = searching ? KINDS.filter((k) => [t(k.title), en[k.title]].some((s) => s.toLowerCase().includes(needle))) : [];
  const types = searching ? Object.entries(overview?.verticals ?? {}).flatMap(([v, x]) => x.types.filter((y) => y.name.toLowerCase().includes(needle)).map((y) => ({ v, name: y.name }))) : [];
  const kindName = (v: string) => KINDS.find((k) => k.k === v);
  const busy = searching && (hits.isLoading || hits.isPlaceholderData || (tab === 'products' && menus.some((m) => m.isLoading)));
  const select = 'mt-1 rounded-[10px] border-[1.5px] border-now-line bg-now-card px-2.5 py-2 text-sm font-bold text-now-text';
  let body: ReactNode;
  if (!searching) body = <p className="text-now-muted">{t('lc.hm.s.hint')}</p>;
  else if (busy) body = <div className="h-24 animate-pulse rounded-2xl bg-now-card" />;
  else if (tab === 'stores')
    body = stores.length ? (
      <ul className="grid gap-2 sm:grid-cols-2">
        {stores.slice(0, 10).map((s) => {
          const L = storeLook(s);
          return (
            <li key={s.id}>
              <Link to={`/s/${s.slug ?? s.id}`} className="flex items-center gap-3 rounded-2xl border border-now-line bg-now-card px-3 py-2.5 text-now-text hover:border-now-text">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: L.bg }} aria-hidden>
                  <L.icon className="h-5 w-5 text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{s.name}</b>
                  <small className="text-xs text-now-muted">{[km(s.distanceKm), s.open ? t('lc.store.mins', { n: s.etaMinutes }) : t('lc.hm.closed'), s.rating && `★ ${s.rating.avg.toFixed(1)}`].filter(Boolean).join(' · ')}</small>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    ) : (
      <NoHits term={term} where={a.where} />
    );
  else if (tab === 'products')
    body = products.length ? (
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(({ p, m }) => (
          <ProductRow key={`${m.store.id}-${p.id}`} p={p} m={m} onAdd={() => basket.add(m.store, p)} qty={basket.qtyOf(m.store.id, p.id)} />
        ))}
      </ul>
    ) : (
      <NoHits term={term} where={a.where} />
    );
  else
    body = kinds.length || types.length ? (
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <Link key={k.k} to={k.to} className={pill(false)}>
            {t(k.title)} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ))}
        {types.map((x) => (
          <Link key={`${x.v}-${x.name}`} to={`/shops?v=${x.v}`} className={pill(false)}>
            {x.name} · {kindName(x.v) ? t(kindName(x.v)!.title) : ''}
          </Link>
        ))}
      </div>
    ) : (
      <NoHits term={term} where={a.where} />
    );
  return (
    <NowSection id="search" tag={t('lc.dash.search')} title={t('lc.hm.s.title')}>
      <label className="sr-only" htmlFor="now-q">
        {t('lc.hm.searchPh')}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-now-muted" aria-hidden />
        <input id="now-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lc.hm.searchPh')} className="min-h-14 w-full rounded-[14px] border-2 border-dz-red bg-now-card pl-12 pr-4 text-base text-now-text placeholder:text-now-muted" data-now-search />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((x) => (
          <button key={x} type="button" onClick={() => setQ(en[x])} className={pill(false)}>
            {t(x)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('lc.hm.s.in')}>
        {(['products', 'stores', 'categories'] as Tab[]).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`rounded-full px-3.5 py-2 text-[13px] font-extrabold capitalize transition ${tab === x ? 'bg-dz-red text-white' : 'border-[1.5px] border-now-line bg-now-surface text-now-text'}`}>
            {t(TAB_LABEL[x])}
          </button>
        ))}
      </div>
      {tab !== 'categories' && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-extrabold text-now-muted">
          <label>
            {t('lc.hm.s.dist')}
            <select value={dist} onChange={(e) => setDist(Number(e.target.value))} className={`${select} block`}>
              <option value={0}>{t('lc.hm.any')}</option>
              <option value={1}>{t('lc.hm.s.underKm', { n: 1 })}</option>
              <option value={3}>{t('lc.hm.s.underKm', { n: 3 })}</option>
            </select>
          </label>
          <label>
            {t('lc.hm.s.time')}
            <select value={time} onChange={(e) => setTime(Number(e.target.value))} className={`${select} block`}>
              <option value={0}>{t('lc.hm.any')}</option>
              <option value={20}>{t('lc.food.fFast', { n: 20 })}</option>
              <option value={40}>{t('lc.food.fFast', { n: 40 })}</option>
            </select>
          </label>
          <label>
            {t('lc.hm.s.rating')}
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={`${select} block`}>
              <option value={0}>{t('lc.hm.any')}</option>
              <option value={4}>4+</option>
            </select>
          </label>
          {tab === 'products' && (
            <label>
              {t('lc.hm.s.price')}
              <select value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`${select} block`}>
                <option value={0}>{t('lc.hm.any')}</option>
                <option value={10000}>{t('lc.hm.s.underPrice', { price: rupees(10000) })}</option>
                <option value={50000}>{t('lc.hm.s.underPrice', { price: rupees(50000) })}</option>
              </select>
            </label>
          )}
          <label>
            {t('lc.hm.s.avail')}
            <select value={openOnly ? 1 : 0} onChange={(e) => setOpenOnly(e.target.value === '1')} className={`${select} block`}>
              <option value={0}>{t('lc.hm.any')}</option>
              <option value={1}>{t('lc.food.fOpen')}</option>
            </select>
          </label>
        </div>
      )}
      <div className="mt-4" aria-live="polite" data-search-results={tab}>
        {body}
      </div>
      {basket.ui}
    </NowSection>
  );
}

function NoHits({ term, where }: { term: string; where: string | null }) {
  const { t } = useI18n();
  return <p className="text-now-muted">{placed(t, where, 'lc.hm.s.none', 'lc.hm.s.noneYou', { q: term })}</p>;
}

function ProductRow({ p, m, onAdd, qty }: { p: Product; m: Menu; onAdd: () => void; qty: number }) {
  const { t } = useI18n();
  const Icon = itemIcon(p.name);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-now-line bg-now-card px-3 py-2.5 text-now-text">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-now-surface" aria-hidden>
        <Icon className="h-5 w-5 text-dz-red" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm">{p.name}</b>
        <small className="block truncate text-xs text-now-muted">{`${rupees(simpleLine(p).unitPrice)} · ${m.store.name}`}</small>
      </span>
      <button type="button" onClick={onAdd} className="shrink-0 rounded-lg border-[1.5px] border-dz-red px-3 py-1.5 text-xs font-black text-dz-red hover:bg-dz-red hover:text-white" aria-label={t('lc.addNamed', { name: p.name })}>
        {qty > 0 ? t('lc.hm.inCart', { n: qty }) : t('lc.hm.add')}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- Offers

const OFFER_BG = ['linear-gradient(135deg,#E8130F,#7A0209)', 'linear-gradient(135deg,#1E5BD6,#0E2E6E)', 'linear-gradient(135deg,#17803A,#0B3D20)', 'linear-gradient(135deg,#000,#3A2E00)', 'linear-gradient(135deg,#0E5A7A,#05202A)', 'linear-gradient(135deg,#7A1E5A,#2A0A20)', 'linear-gradient(135deg,#E0A800,#7A5A0A)'];
const OFFER_KINDS: { k: string; label: MsgKey; test: (o: PublicOffer) => boolean }[] = [
  { k: 'shop', label: 'lc.hm.of.kShop', test: (o) => !!o.shop },
  { k: 'free', label: 'lc.hm.of.kFree', test: (o) => o.kind === 'FREE_DELIVERY' },
  { k: 'first', label: 'lc.hm.of.kFirst', test: (o) => o.firstOrderOnly },
  { k: 'cat', label: 'lc.hm.of.kCat', test: (o) => !o.shop && !!o.vertical },
];
const COMING: { icon: LucideIcon; label: MsgKey; body: MsgKey; bg: string }[] = [
  { icon: Store, label: 'lc.hm.of.c1', body: 'lc.hm.of.c1b', bg: OFFER_BG[0] },
  { icon: CreditCard, label: 'lc.hm.of.c2', body: 'lc.hm.of.c2b', bg: OFFER_BG[1] },
  { icon: Truck, label: 'lc.dash.free', body: 'lc.hm.of.c3b', bg: OFFER_BG[2] },
  { icon: Sparkles, label: 'lc.hm.of.c4', body: 'lc.hm.of.c4b', bg: OFFER_BG[3] },
  { icon: Pill, label: 'lc.hm.of.c5', body: 'lc.hm.of.c5b', bg: OFFER_BG[4] },
  { icon: Gift, label: 'lc.hm.of.c6', body: 'lc.hm.of.c6b', bg: OFFER_BG[5] },
  { icon: Timer, label: 'lc.hm.of.c7', body: 'lc.hm.of.c7b', bg: OFFER_BG[6] },
];

export function OffersBand() {
  const { t } = useI18n();
  const { offers } = useAround();
  const [k, setK] = useState('');
  const kinds = OFFER_KINDS.filter((x) => offers.some(x.test));
  const shown = offers.filter((o) => !k || OFFER_KINDS.find((x) => x.k === k)!.test(o));
  return (
    <NowSection id="offers" surface tag={t('lc.hm.of.tag')} title={t('lc.hm.of.title')} intro={t(offers.length ? 'lc.hm.of.intro' : 'lc.hm.of.introNone')}>
      {offers.length ? (
        <>
          {kinds.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t('lc.hm.of.kind')}>
              <button type="button" aria-pressed={!k} onClick={() => setK('')} className={pill(!k)}>
                {t('lc.home.all')}
              </button>
              {kinds.map((x) => (
                <button key={x.k} type="button" aria-pressed={k === x.k} onClick={() => setK(k === x.k ? '' : x.k)} className={pill(k === x.k)}>
                  {t(x.label)}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-live-offers>
            {shown.map((o, i) => (
              <OfferCard key={o.code} o={o} bg={OFFER_BG[i % OFFER_BG.length]} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3">
            <Soon />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COMING.map((o) => (
              <div key={o.label} className="grid content-start gap-2 rounded-[18px] p-4 text-white" style={{ background: o.bg }}>
                <o.icon className="h-6 w-6" aria-hidden />
                <b className="font-display text-2xl leading-tight">{t(o.label)}</b>
                <small className="opacity-90">{t(o.body)}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </NowSection>
  );
}

function OfferCard({ o, bg }: { o: PublicOffer; bg: string }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const where = o.shop ? t('lc.hm.of.at', { shop: o.shop }) : o.vertical ? t(`lc.hm.of.v.${o.vertical}` as MsgKey) : t('lc.hm.of.any');
  const terms = [where, o.city && t('lc.hm.of.city', { city: o.city }), o.minOrder > 0 && t('lc.hm.of.above', { amount: rupees(o.minOrder) }), o.firstOrderOnly && t('lc.hm.of.firstOnly')].filter(Boolean).join(' · ');
  const ends = new Date(o.endsAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return (
    <div className="grid content-start gap-2 rounded-[18px] p-4 text-white" style={{ background: bg }} data-offer-card={o.code}>
      <small className="text-xs font-black uppercase tracking-[1px] opacity-90">{t(o.kind === 'FREE_DELIVERY' ? 'lc.dash.free' : o.shop ? 'lc.hm.of.storeOffer' : o.firstOrderOnly ? 'lc.hm.of.c4' : 'lc.hm.of.offer')}</small>
      <b className="font-display text-2xl leading-tight">{o.headline}</b>
      {o.description && <span className="text-sm opacity-95">{o.description}</span>}
      <small className="opacity-90">{terms}</small>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={() => void navigator.clipboard?.writeText(o.code).then(() => setCopied(true), () => undefined)} className="rounded-lg border border-dashed border-white/70 px-2.5 py-1 font-mono font-extrabold tracking-wider hover:bg-white/10" aria-label={t('lc.hm.of.copy', { code: o.code })}>
          {o.code}
        </button>
        <small className="font-bold">{t(copied ? 'lc.hm.of.copied' : 'lc.hm.of.tap')}</small>
        <small className="ml-auto opacity-80">{t('lc.hm.of.ends', { date: ends })}</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Track

const TRACK: { s: OrderStatus; icon: LucideIcon }[] = [
  { s: 'PLACED', icon: Receipt },
  { s: 'ACCEPTED', icon: Store },
  { s: 'PREPARING', icon: ChefHat },
  { s: 'READY', icon: PackageCheck },
  { s: 'PICKED_UP', icon: Bike },
  { s: 'ARRIVED', icon: MapPin },
  { s: 'DELIVERED', icon: Home },
];
const AT: Partial<Record<OrderStatus, number>> = { DRAFT: 0, AWAITING_RX_REVIEW: 0, PLACED: 0, ACCEPTED: 1, PREPARING: 2, READY_SOON: 2, READY: 3, PICKED_UP: 4, OUT_FOR_DELIVERY: 4, ARRIVED: 5, DELIVERED: 6, COMPLETED: 6 };

export function TrackBand() {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  return (
    <NowSection id="track" tag={t('lc.hm.tr.tag')} title={t('lc.hm.tr.title')} intro={t(token ? 'lc.hm.tr.intro' : 'lc.hm.tr.introOut')}>
      {token ? <MyOrders /> : <Tracker order={null} note={null} onFind={null} />}
    </NowSection>
  );
}

function MyOrders() {
  const { t } = useI18n();
  const { data } = useOrders();
  const orders = data?.orders ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const order = orders.find((o) => o.id === picked) ?? orders.find((o) => o.active) ?? null;
  const find = (num: string) => {
    const hit = orders.find((o) => o.orderNumber.toLowerCase() === num.trim().toLowerCase().replace(/^#/, ''));
    setNote(hit ? null : t('lc.hm.tr.noOrder'));
    if (hit) setPicked(hit.id);
  };
  return <Tracker order={order} note={note ?? (orders.length && !order ? t('lc.hm.tr.nothing') : null)} onFind={find} />;
}

function Tracker({ order, note, onFind }: { order: CustomerOrder | null; note: string | null; onFind: ((num: string) => void) | null }) {
  const { t } = useI18n();
  const [num, setNum] = useState('');
  const step = order ? (AT[order.status] ?? -1) : -1;
  const ended = !!order && step < 0;
  return (
    <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-4 text-white sm:p-5" data-tracker>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (onFind && num.trim()) onFind(num);
        }}
      >
        <label className="sr-only" htmlFor="track-no">
          {t('lc.hm.tr.num')}
        </label>
        <input id="track-no" value={num} onChange={(e) => setNum(e.target.value)} placeholder={t('lc.hm.tr.num')} disabled={!onFind} className="min-h-11 rounded-[10px] border-[1.5px] border-[#2A3140] bg-[#11151D] px-3 font-mono text-sm text-white placeholder:text-neutral-500 disabled:opacity-60" />
        {onFind ? (
          <button type="submit" className="min-h-11 rounded-xl bg-dz-yellow px-[18px] text-sm font-black text-black">
            {t('lc.hm.tr.track')}
          </button>
        ) : (
          <Link to={`/login?next=${encodeURIComponent('/#track')}`} className="inline-flex min-h-11 items-center rounded-xl bg-dz-yellow px-[18px] text-sm font-black text-black">
            {t('lc.hm.tr.login')}
          </Link>
        )}
      </form>
      {note && <p className="text-sm font-bold text-dz-yellow">{note}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-[#0B1220] p-3.5">
          <p className="mb-2 flex justify-between text-[11px] font-black uppercase tracking-[1px] text-neutral-400">
            <span>{t('lc.hm.tr.onWay')}</span>
            {order && <span className="text-dz-yellow">#{order.orderNumber}</span>}
          </p>
          <RouteArt step={step} />
          {order ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <b className="block truncate">{order.store.name}</b>
                <small className="text-neutral-400">{t(STATUS_LABEL[order.status])}</small>
              </span>
              <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/20">
                {t('lc.hm.tr.open')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-center text-sm text-neutral-400">{t(onFind ? 'lc.hm.tr.empty' : 'lc.hm.tr.emptyOut')}</p>
          )}
        </div>
        <div className="rounded-[18px] border border-white/10 bg-[#0B1220] p-3.5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[1px] text-neutral-400">{t('lc.hm.tr.timeline')}</p>
          <ol className="grid gap-1.5" aria-live="polite">
            {TRACK.map((x, i) => {
              const done = i < step || (i === step && step === TRACK.length - 1);
              const now = i === step && !done;
              return (
                <li key={x.s} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${now ? 'bg-dz-yellow font-black text-black' : 'bg-[#11151D]'}`}>
                  <x.icon className={`h-4 w-4 shrink-0 ${done ? 'text-[#2BD463]' : now ? '' : 'text-neutral-500'}`} aria-hidden />
                  <span className="flex-1">{t(STATUS_LABEL[x.s])}</span>
                  {done ? <Check className="h-4 w-4 text-[#2BD463]" aria-label={t('lc.hm.tr.done')} /> : <span className={now ? '' : 'text-neutral-600'}>{now ? t('lc.hm.now') : '–'}</span>}
                </li>
              );
            })}
          </ol>
          {ended && <p className="mt-2 text-sm font-bold text-[#FF7D84]">{t(STATUS_LABEL[order!.status])}</p>}
        </div>
      </div>
    </div>
  );
}

/** Shop, road and door, with the rider placed by the order's step (a picture of the route, not a live map). */
function RouteArt({ step }: { step: number }) {
  const x = step < 4 ? 70 : step === 4 ? 230 : step === 5 ? 380 : 430;
  return (
    <svg viewBox="0 0 480 170" className="block h-auto w-full rounded-xl bg-[#080C14]" aria-hidden>
      <path d="M40 120 C 140 120, 160 50, 260 70 S 400 110, 440 60" fill="none" stroke="#1F2937" strokeWidth="14" strokeLinecap="round" />
      <path d="M40 120 C 140 120, 160 50, 260 70 S 400 110, 440 60" fill="none" stroke="#FFD400" strokeWidth="2.5" strokeDasharray="8 10" className={step >= 4 && step < 6 ? 'now-dash' : ''} />
      <g transform="translate(22 102)">
        <rect width="36" height="36" rx="10" fill="#17803A" />
        <Store x={8} y={8} width={20} height={20} color="#fff" strokeWidth={2.4} />
      </g>
      <g transform="translate(422 42)">
        <rect width="36" height="36" rx="10" fill="#E8130F" />
        <Home x={8} y={8} width={20} height={20} color="#fff" strokeWidth={2.4} />
      </g>
      {step >= 0 && (
        <g style={{ transform: `translate(${x - 16}px, ${step < 4 ? 66 : step === 4 ? 50 : 66}px)`, transition: 'transform .8s ease' }}>
          <circle cx="16" cy="16" r="16" fill="#FFD400" />
          <Bike x={6} y={6} width={20} height={20} color="#111" strokeWidth={2.4} />
        </g>
      )}
    </svg>
  );
}
