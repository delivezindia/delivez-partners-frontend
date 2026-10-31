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
import { useBasket } from '../categoryPage';
import { useAuth } from '../../lib/auth-store';
import { simpleLine } from '../../lib/cart';
import { km, rupees } from '../../lib/format';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { itemIcon, storeLook } from '../../lib/icons';
import { STATUS_LABEL, useOrders, type CustomerOrder, type OrderStatus } from '../../lib/orders';
import { menuQuery, useNearby, useOverview, type PublicOffer } from '../../lib/queries';
import type { Menu, Product } from '../../lib/types';
import { KINDS, NowSection, Soon, pill, useAround } from './kit';

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
    <NowSection id="how" surface tag="How Delivez Now works" title="Four steps to your door.">
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

const EXAMPLES = ['Paracetamol', 'Milk', 'Flowers', 'Charger', 'Pizza', 'Pet food'];
type Tab = 'products' | 'stores' | 'categories';

export function SearchBand() {
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
  const kinds = searching ? KINDS.filter((k) => k.title.toLowerCase().includes(needle)) : [];
  const types = searching ? Object.entries(overview?.verticals ?? {}).flatMap(([v, x]) => x.types.filter((t) => t.name.toLowerCase().includes(needle)).map((t) => ({ v, name: t.name }))) : [];
  const busy = searching && (hits.isLoading || hits.isPlaceholderData || (tab === 'products' && menus.some((m) => m.isLoading)));
  const select = 'mt-1 rounded-[10px] border-[1.5px] border-now-line bg-now-card px-2.5 py-2 text-sm font-bold text-now-text';
  let body: ReactNode;
  if (!searching) body = <p className="text-now-muted">Type to search, or try an example above.</p>;
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
                  <small className="text-xs text-now-muted">{[km(s.distanceKm), s.open ? `${s.etaMinutes} min` : 'Closed', s.rating && `★ ${s.rating.avg.toFixed(1)}`].filter(Boolean).join(' · ')}</small>
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
            {k.title} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ))}
        {types.map((x) => (
          <Link key={`${x.v}-${x.name}`} to={`/shops?v=${x.v}`} className={pill(false)}>
            {x.name} · {KINDS.find((k) => k.k === x.v)?.title}
          </Link>
        ))}
      </div>
    ) : (
      <NoHits term={term} where={a.where} />
    );
  return (
    <NowSection id="search" tag="Search" title="Find anything nearby.">
      <label className="sr-only" htmlFor="now-q">
        Search for products, stores or categories
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-now-muted" aria-hidden />
        <input id="now-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products, stores or categories" className="min-h-14 w-full rounded-[14px] border-2 border-dz-red bg-now-card pl-12 pr-4 text-base text-now-text placeholder:text-now-muted" data-now-search />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((x) => (
          <button key={x} type="button" onClick={() => setQ(x)} className={pill(false)}>
            {x}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Search in">
        {(['products', 'stores', 'categories'] as Tab[]).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`rounded-full px-3.5 py-2 text-[13px] font-extrabold capitalize transition ${tab === x ? 'bg-dz-red text-white' : 'border-[1.5px] border-now-line bg-now-surface text-now-text'}`}>
            {x}
          </button>
        ))}
      </div>
      {tab !== 'categories' && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-extrabold text-now-muted">
          <label>
            Distance
            <select value={dist} onChange={(e) => setDist(Number(e.target.value))} className={`${select} block`}>
              <option value={0}>Any</option>
              <option value={1}>Under 1 km</option>
              <option value={3}>Under 3 km</option>
            </select>
          </label>
          <label>
            Delivery time
            <select value={time} onChange={(e) => setTime(Number(e.target.value))} className={`${select} block`}>
              <option value={0}>Any</option>
              <option value={20}>Under 20 min</option>
              <option value={40}>Under 40 min</option>
            </select>
          </label>
          <label>
            Rating
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={`${select} block`}>
              <option value={0}>Any</option>
              <option value={4}>4+</option>
            </select>
          </label>
          {tab === 'products' && (
            <label>
              Price
              <select value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`${select} block`}>
                <option value={0}>Any</option>
                <option value={10000}>Under ₹100</option>
                <option value={50000}>Under ₹500</option>
              </select>
            </label>
          )}
          <label>
            Availability
            <select value={openOnly ? 1 : 0} onChange={(e) => setOpenOnly(e.target.value === '1')} className={`${select} block`}>
              <option value={0}>Any</option>
              <option value={1}>Open now</option>
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
  return <p className="text-now-muted">{`Nothing matches “${term}” ${where ? `near ${where}` : 'near you'} yet.`}</p>;
}

function ProductRow({ p, m, onAdd, qty }: { p: Product; m: Menu; onAdd: () => void; qty: number }) {
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
      <button type="button" onClick={onAdd} className="shrink-0 rounded-lg border-[1.5px] border-dz-red px-3 py-1.5 text-xs font-black text-dz-red hover:bg-dz-red hover:text-white" aria-label={`Add ${p.name}`}>
        {qty > 0 ? `${qty} in cart` : 'Add'}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- Offers

const OFFER_BG = ['linear-gradient(135deg,#E8130F,#7A0209)', 'linear-gradient(135deg,#1E5BD6,#0E2E6E)', 'linear-gradient(135deg,#17803A,#0B3D20)', 'linear-gradient(135deg,#000,#3A2E00)', 'linear-gradient(135deg,#0E5A7A,#05202A)', 'linear-gradient(135deg,#7A1E5A,#2A0A20)', 'linear-gradient(135deg,#E0A800,#7A5A0A)'];
const OFFER_KINDS: { k: string; label: string; test: (o: PublicOffer) => boolean }[] = [
  { k: 'shop', label: 'Store Offers', test: (o) => !!o.shop },
  { k: 'free', label: 'Free Delivery', test: (o) => o.kind === 'FREE_DELIVERY' },
  { k: 'first', label: 'First Order', test: (o) => o.firstOrderOnly },
  { k: 'cat', label: 'Category Discounts', test: (o) => !o.shop && !!o.vertical },
];
const COMING: { icon: LucideIcon; label: string; body: string; bg: string }[] = [
  { icon: Store, label: 'Store offers', body: 'Discounts from the shops you order from', bg: OFFER_BG[0] },
  { icon: CreditCard, label: 'Bank offers', body: 'Savings on UPI and cards', bg: OFFER_BG[1] },
  { icon: Truck, label: 'Free delivery', body: 'Free delivery days and minimum-order deals', bg: OFFER_BG[2] },
  { icon: Sparkles, label: 'First order', body: 'A welcome offer on your first order', bg: OFFER_BG[3] },
  { icon: Pill, label: 'Category deals', body: 'Savings on medicines, groceries and more', bg: OFFER_BG[4] },
  { icon: Gift, label: 'Festival offers', body: 'Hampers and gifts for every festival', bg: OFFER_BG[5] },
  { icon: Timer, label: 'Flash deals', body: 'Short-time deals near you', bg: OFFER_BG[6] },
];

export function OffersBand() {
  const { offers } = useAround();
  const [k, setK] = useState('');
  const kinds = OFFER_KINDS.filter((x) => offers.some(x.test));
  const shown = offers.filter((o) => !k || OFFER_KINDS.find((x) => x.k === k)!.test(o));
  return (
    <NowSection id="offers" surface tag="Offers & promotions" title="Offers near you." intro={offers.length ? 'Tap a code to copy it, then apply it in your cart. Every order also has no platform fee and no packaging fee.' : 'Coupons are on the way. Today every order has no platform fee and no packaging fee.'}>
      {offers.length ? (
        <>
          {kinds.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Kind of offer">
              <button type="button" aria-pressed={!k} onClick={() => setK('')} className={pill(!k)}>
                All
              </button>
              {kinds.map((x) => (
                <button key={x.k} type="button" aria-pressed={k === x.k} onClick={() => setK(k === x.k ? '' : x.k)} className={pill(k === x.k)}>
                  {x.label}
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
                <b className="font-display text-2xl leading-tight">{o.label}</b>
                <small className="opacity-90">{o.body}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </NowSection>
  );
}

const VERTICAL_WORD: Record<string, string> = { EAT: 'food', GROCERY: 'grocery', PHARMACY: 'pharmacy', DIAGNOSTICS: 'lab', LOCAL_STORES: 'local shop' };
function OfferCard({ o, bg }: { o: PublicOffer; bg: string }) {
  const [copied, setCopied] = useState(false);
  const where = o.shop ? `At ${o.shop}` : o.vertical ? `On ${VERTICAL_WORD[o.vertical]} orders` : 'On any shop';
  const terms = [where + (o.city ? ` in ${o.city}` : ''), o.minOrder > 0 && `above ${rupees(o.minOrder)}`, o.firstOrderOnly && 'first order only'].filter(Boolean).join(' · ');
  const ends = new Date(o.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <div className="grid content-start gap-2 rounded-[18px] p-4 text-white" style={{ background: bg }} data-offer-card={o.code}>
      <small className="text-xs font-black uppercase tracking-[1px] opacity-90">{o.kind === 'FREE_DELIVERY' ? 'Free delivery' : o.shop ? 'Store offer' : o.firstOrderOnly ? 'First order' : 'Offer'}</small>
      <b className="font-display text-2xl leading-tight">{o.headline}</b>
      {o.description && <span className="text-sm opacity-95">{o.description}</span>}
      <small className="opacity-90">{terms}</small>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={() => void navigator.clipboard?.writeText(o.code).then(() => setCopied(true), () => undefined)} className="rounded-lg border border-dashed border-white/70 px-2.5 py-1 font-mono font-extrabold tracking-wider hover:bg-white/10" aria-label={`Copy code ${o.code}`}>
          {o.code}
        </button>
        <small className="font-bold">{copied ? 'Copied' : 'Tap to copy'}</small>
        <small className="ml-auto opacity-80">Ends {ends}</small>
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
  const token = useAuth((s) => s.accessToken);
  return (
    <NowSection id="track" tag="Live order tracking" title="Track Every Step" intro={token ? 'Your orders in progress, as they move. Enter an order number to find one.' : 'Log in to follow your orders here, from the shop to your door.'}>
      {token ? <MyOrders /> : <Tracker order={null} note={null} onFind={null} />}
    </NowSection>
  );
}

function MyOrders() {
  const { data } = useOrders();
  const orders = data?.orders ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const order = orders.find((o) => o.id === picked) ?? orders.find((o) => o.active) ?? null;
  const find = (num: string) => {
    const hit = orders.find((o) => o.orderNumber.toLowerCase() === num.trim().toLowerCase().replace(/^#/, ''));
    setNote(hit ? null : 'No order with that number in your account.');
    if (hit) setPicked(hit.id);
  };
  return <Tracker order={order} note={note ?? (orders.length && !order ? 'Nothing on its way right now. Enter an order number to see one.' : null)} onFind={find} />;
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
          Order number
        </label>
        <input id="track-no" value={num} onChange={(e) => setNum(e.target.value)} placeholder="Order number" disabled={!onFind} className="min-h-11 rounded-[10px] border-[1.5px] border-[#2A3140] bg-[#11151D] px-3 font-mono text-sm text-white placeholder:text-neutral-500 disabled:opacity-60" />
        {onFind ? (
          <button type="submit" className="min-h-11 rounded-xl bg-dz-yellow px-[18px] text-sm font-black text-black">
            Track Order
          </button>
        ) : (
          <Link to={`/login?next=${encodeURIComponent('/#track')}`} className="inline-flex min-h-11 items-center rounded-xl bg-dz-yellow px-[18px] text-sm font-black text-black">
            Log in to track
          </Link>
        )}
      </form>
      {note && <p className="text-sm font-bold text-dz-yellow">{note}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-[#0B1220] p-3.5">
          <p className="mb-2 flex justify-between text-[11px] font-black uppercase tracking-[1px] text-neutral-400">
            <span>On the way</span>
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
                Open order page <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-center text-sm text-neutral-400">{onFind ? 'Place an order and it shows up here.' : 'Your orders show up here once you log in.'}</p>
          )}
        </div>
        <div className="rounded-[18px] border border-white/10 bg-[#0B1220] p-3.5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[1px] text-neutral-400">Timeline</p>
          <ol className="grid gap-1.5" aria-live="polite">
            {TRACK.map((x, i) => {
              const done = i < step || (i === step && step === TRACK.length - 1);
              const now = i === step && !done;
              return (
                <li key={x.s} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${now ? 'bg-dz-yellow font-black text-black' : 'bg-[#11151D]'}`}>
                  <x.icon className={`h-4 w-4 shrink-0 ${done ? 'text-[#2BD463]' : now ? '' : 'text-neutral-500'}`} aria-hidden />
                  <span className="flex-1">{t(STATUS_LABEL[x.s])}</span>
                  {done ? <Check className="h-4 w-4 text-[#2BD463]" aria-label="Done" /> : <span className={now ? '' : 'text-neutral-600'}>{now ? 'Now' : '–'}</span>}
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
