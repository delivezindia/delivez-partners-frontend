import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  Bike,
  Check,
  CircleUserRound,
  Gift,
  Globe,
  Home,
  LayoutGrid,
  MapPin,
  Pill,
  Receipt,
  Repeat,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Star,
  Store,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { rupees } from '../../lib/format';
import { itemIcon, storeLook } from '../../lib/icons';
import { useOverview } from '../../lib/queries';
import type { Vertical } from '../../lib/types';
import { KIND_LOOK } from '../VerticalIcon';
import { KINDS, NowLogo, NowSection, Soon, inKind, kindOf, useAround, type Kind } from './kit';

// ---------------------------------------------------------------- The app

const PHONE_TILES: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Store, label: 'Nearby Stores', color: '#7A3FC0' },
  { icon: BadgePercent, label: 'Offers', color: '#E8130F' },
  { icon: ShoppingBasket, label: 'Grocery', color: '#17803A' },
  { icon: UtensilsCrossed, label: 'Food', color: '#E8130F' },
  { icon: Pill, label: 'Pharmacy', color: '#1E5BB8' },
  { icon: Store, label: 'Local Shops', color: '#7A3FC0' },
  { icon: Gift, label: 'Gifts', color: '#BE185D' },
  { icon: Zap, label: 'Rush', color: '#7B2FD4' },
];
const APP_FEATURES: { icon: LucideIcon; label: string; body: string }[] = [
  { icon: ShoppingBag, label: 'One app, every store', body: 'Food, groceries and medicines in one place' },
  { icon: MapPin, label: 'Live order status', body: 'Every step as it happens, with your rider’s name' },
  { icon: Zap, label: 'Rush essentials', body: 'Everyday items from the quickest shops near you' },
  { icon: Repeat, label: 'Reorder in one tap', body: 'Your past orders, rebuilt from today’s menu' },
];

export function AppBand() {
  const overview = useOverview().data;
  const a = useAround();
  // The phone shows real shops: two restaurants near you (or the two nearest shops of any kind).
  const eats = a.stores.filter((s) => s.vertical === 'EAT');
  const rows = (eats.length >= 2 ? eats : a.stores).slice(0, 2);
  const kinds = overview ? Object.values(overview.verticals).filter((v) => v.shops > 0).length : 0;
  return (
    <section id="app" className="relative scroll-mt-28 overflow-hidden bg-now-bg px-4 py-[52px] sm:px-6">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(900px 420px at 90% 0%, rgba(255,212,0,.35), transparent 60%), radial-gradient(700px 380px at 0% 100%, rgba(232,19,15,.12), transparent 60%)' }} aria-hidden />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative grid place-items-center py-5">
          <span className="vp-spin absolute aspect-square w-[78%] rounded-full opacity-35 blur-[42px]" style={{ background: 'conic-gradient(from 0deg,#FFD400,#E8130F,#FFD400)' }} aria-hidden />
          <div className="relative w-[288px] -rotate-[4deg] rounded-[40px] bg-black p-2.5 shadow-[0_50px_80px_-40px_rgba(0,0,0,.6)] transition duration-500 hover:rotate-0 hover:-translate-y-1.5" aria-hidden>
            <div className="overflow-hidden rounded-[32px] bg-white text-[#161616]">
              <div className="space-y-2 bg-[#E8130F] p-4 pb-3 text-white">
                <b className="block font-display text-lg italic">DELIVEZ NOW</b>
                <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-[#7C7C77]">
                  <Search className="h-3.5 w-3.5" /> Search for products, stores or categories
                </span>
              </div>
              <p className="flex items-center gap-1.5 px-3.5 pt-3 text-xs font-extrabold">
                <MapPin className="h-3.5 w-3.5 text-[#E8130F]" /> {a.where ?? 'Your area'}
              </p>
              <div className="grid grid-cols-4 gap-1.5 p-3">
                {PHONE_TILES.map((x) => (
                  <span key={x.label} className="grid justify-items-center gap-1 rounded-xl bg-[#F6F6F4] px-0.5 py-2 text-center text-[9.5px] font-extrabold leading-tight">
                    <x.icon className="h-[18px] w-[18px]" style={{ color: x.color }} strokeWidth={2.2} />
                    {x.label}
                  </span>
                ))}
              </div>
              <p className="mx-3 flex items-center gap-1.5 rounded-xl bg-[#E8130F] px-3 py-2.5 text-[11px] font-extrabold text-white">
                <Zap className="h-3.5 w-3.5" /> Essentials from the quickest shops
              </p>
              <ul className="space-y-1 px-3 pb-2 pt-2">
                {rows.map((s) => {
                  const L = storeLook(s);
                  return (
                    <li key={s.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: L.bg }}>
                        <L.icon className="h-4 w-4 text-white" />
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-[12px]">{s.name}</b>
                        <small className="flex items-center gap-1 text-[10.5px] text-[#5E5E5A]">
                          {s.rating && (
                            <>
                              <Star className="h-3 w-3 fill-[#FFD400] text-[#FFD400]" /> {s.rating.avg.toFixed(1)} ·
                            </>
                          )}{' '}
                          {s.etaMinutes} min
                        </small>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="grid grid-cols-6 border-t border-[#E4E4E0] px-1 py-2 text-[8.5px] font-bold text-[#7C7C77]">
                {(
                  [
                    [Home, 'Home'],
                    [LayoutGrid, 'Categories'],
                    [Search, 'Search'],
                    [ShoppingCart, 'Cart'],
                    [Receipt, 'Orders'],
                    [CircleUserRound, 'Account'],
                  ] as [LucideIcon, string][]
                ).map(([I, l], i) => (
                  <span key={l} className={`grid justify-items-center gap-0.5 ${i === 0 ? 'text-[#E8130F]' : ''}`}>
                    <I className="h-4 w-4" /> {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Float className="left-0 top-[18%]" icon={Bike} title="Rider on the way" sub="Live on your order page" />
          <Float className="bottom-[22%] right-0" icon={ShieldCheck} title="Delivered" sub="Handed over with your code" delay="1.2s" />
          <Float className="bottom-[8%] left-[4%]" icon={BadgePercent} title="Coupons at checkout" sub="Offers near you" delay="2.2s" />
        </div>
        <div>
          <p className="text-[13.5px] font-extrabold uppercase tracking-[1.4px] text-dz-red">Delivez Now app</p>
          <h2 className="mb-3.5 mt-2.5 text-[clamp(34px,4.4vw,58px)] leading-[0.98] text-now-text">
            Your whole neighbourhood, <span className="text-dz-red">in one app.</span>
          </h2>
          <p className="mb-[22px] max-w-[54ch] text-[17px] text-now-muted">Food, groceries, medicines, local shops, gifts and Rush essentials, with one checkout and live order status to your door. Shop on the web today.</p>
          <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
            {APP_FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3 rounded-2xl border border-now-line bg-now-card px-3.5 py-3">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-[#FFF3B0] text-black">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <b className="block text-[14.5px] text-now-text">{f.label}</b>
                  <small className="text-[13px] text-now-muted">{f.body}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {['Android app', 'iPhone app'].map((x) => (
              <span key={x} className="inline-flex items-center gap-2.5 rounded-[14px] bg-[#111] px-[18px] py-2.5 leading-[1.05] text-white">
                <Smartphone className="h-6 w-6" aria-hidden />
                <span>
                  <small className="block text-[10.5px] font-semibold opacity-80">{x}</small>
                  <b className="text-[15px]">Coming soon</b>
                </span>
              </span>
            ))}
            <a href="#categories" className="inline-flex items-center gap-2 rounded-[14px] border-[1.5px] border-now-line px-[18px] py-3 font-extrabold text-now-text transition hover:border-now-text">
              <Globe className="h-5 w-5" aria-hidden /> Shop on the web <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
          {overview && (
            <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[14.5px] text-now-muted" data-app-stats>
              <span>
                <b className="text-[17px] text-now-text">{overview.shops}</b> shops live
              </span>
              <span>
                <b className="text-[17px] text-now-text">{overview.cities.length}</b> {overview.cities.length === 1 ? 'city' : 'cities'}
              </span>
              <span>
                <b className="text-[17px] text-now-text">{kinds}</b> kinds of shops
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Float({ className, icon: Icon, title, sub, delay = '0s' }: { className: string; icon: LucideIcon; title: string; sub: string; delay?: string }) {
  return (
    <span className={`vp-bob absolute z-[2] flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[13px] font-extrabold text-[#161616] shadow-[0_18px_36px_-22px_rgba(0,0,0,.5)] max-sm:hidden ${className}`} style={{ animationDuration: '3.6s', animationDelay: delay }} aria-hidden>
      <Icon className="h-4 w-4 text-[#E8130F]" />
      <span>
        {title}
        <small className="block text-[11.5px] font-semibold text-[#5E5E5A]">{sub}</small>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- Check your area

type AreaAnswer = { pincode: string; live: boolean; city: string | null; liveCities: string[] };
type PinInfo = { serviceable: boolean; zone: { name: string } | null };

export function AreaCheck({ onStart }: { onStart: () => void }) {
  const overview = useOverview().data;
  const { fee } = useAround();
  const [pin, setPin] = useState('');
  const [state, setState] = useState<null | 'bad' | 'error' | 'busy'>(null);
  const [answer, setAnswer] = useState<(AreaAnswer & { zone: string | null }) | null>(null);
  async function check(e: FormEvent) {
    e.preventDefault();
    const p = pin.trim();
    if (!/^[1-9]\d{5}$/.test(p)) return setState('bad');
    setState('busy');
    try {
      const [a, z] = await Promise.all([api<AreaAnswer>(`/local/serviceable/${p}`), api<PinInfo>(`/geo/pincodes/${p}`).catch(() => null)]);
      setAnswer({ ...a, zone: z?.zone?.name ?? null });
      setState(null);
    } catch (err) {
      setState(err instanceof ApiError && err.status === 400 ? 'bad' : 'error');
    }
  }
  const cityShops = answer?.city ? overview?.cities.find((c) => c.name.toLowerCase() === answer.city!.toLowerCase())?.shops : undefined;
  const cells: [string, ReactNode, boolean?][] = answer
    ? [
        ['Delivez Now', answer.live ? 'Available' : 'Not yet', answer.live],
        ['City', answer.city ?? '—'],
        ['Area', answer.zone ?? '—'],
        [answer.city ? `Shops live in ${answer.city}` : 'Shops live', cityShops ?? (answer.live ? '—' : 0)],
        ['Delivery fee', `Flat ${rupees(fee)} per order`],
        ['Live now in', answer.liveCities.join(', ') || '—'],
      ]
    : [];
  return (
    <NowSection id="serviceability" surface tag="Serviceability" title="Check Your Area">
      <div className="grid gap-3 rounded-[22px] border border-white/10 bg-[#07090D] p-4 text-white sm:p-5">
        <form onSubmit={check} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="pin">
            PIN code
          </label>
          <input
            id="pin"
            value={pin}
            onChange={(e) => (setPin(e.target.value.replace(/\D/g, '').slice(0, 6)), setState(null))}
            inputMode="numeric"
            placeholder="PIN code, e.g. 226021"
            className="min-h-12 w-full rounded-[10px] border-[1.5px] border-[#2A3140] bg-[#11151D] px-3.5 font-mono text-white placeholder:text-neutral-500 sm:w-[180px]"
            data-pin
          />
          <button type="submit" disabled={state === 'busy'} className="min-h-12 rounded-xl bg-dz-yellow px-[18px] font-black text-black disabled:opacity-60">
            {state === 'busy' ? 'Checking…' : 'Check Your Area'}
          </button>
        </form>
        <div aria-live="polite" data-pin-result={answer ? (answer.live ? 'yes' : 'soon') : (state ?? '')}>
          {state === 'bad' && <p className="font-bold text-[#FF7D84]">Enter a valid 6-digit PIN code.</p>}
          {state === 'error' && <p className="font-bold text-[#FF7D84]">Couldn’t check right now. Try again in a moment.</p>}
          {!answer && !state && <p className="text-sm text-neutral-400">Enter your PIN code to see if Delivez Now delivers there.</p>}
          {answer && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cells.map(([label, value, ok]) => (
                <div key={label} className="rounded-[10px] bg-[#11151D] px-3 py-2.5">
                  <small className="block text-xs text-neutral-400">{label}</small>
                  <b className={`flex items-center gap-1 ${ok === true ? 'text-[#2BD463]' : ok === false ? 'text-dz-yellow' : ''}`}>
                    {ok === true && <Check className="h-4 w-4" aria-hidden />}
                    {value}
                  </b>
                </div>
              ))}
            </div>
          )}
          {answer?.live && (
            <button type="button" onClick={onStart} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
              <MapPin className="h-4 w-4" aria-hidden /> Set my exact location
            </button>
          )}
        </div>
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Shop by category

/** What each kind's page offers, by type: the Rush page's categories and the Street Cart page's cart types. */
const PAGE_TYPES: Record<'RUSH' | 'STREET', string[]> = {
  RUSH: ['Staples', 'Fruit & veg', 'Dairy & bread', 'Snacks & drinks', 'Personal care', 'Household', 'Baby', 'Pet', 'Health', 'Electronics'],
  STREET: ['Fruit', 'Vegetables', 'Chaat & snacks', 'Juice & coconut', 'Tea & coffee', 'Flowers', 'Ice cream & kulfi', 'Tiffin & breakfast', 'Corn & grills', 'Milk & dairy'],
};
/** Until shops of a kind are live, the kinds of shop it will have. */
const PLANNED: Record<Vertical, string[]> = {
  EAT: ['Restaurants', 'Cafés', 'Bakeries', 'Desserts', 'Fast food', 'Local kitchens', 'Breakfast', 'Healthy food'],
  GROCERY: ['Fruits & vegetables', 'Dairy', 'Staples', 'Snacks', 'Beverages', 'Household essentials'],
  PHARMACY: ['Medicines', 'Healthcare products', 'Medical supplies', 'Baby care', 'First aid', 'Health devices'],
  DIAGNOSTICS: ['Blood tests', 'Health packages', 'Home sample collection', 'Walk-in labs'],
  LOCAL_STORES: ['Electronics', 'Fashion', 'Beauty', 'Home & kitchen', 'Stationery', 'Pet supplies'],
};
const LONG: Record<Kind, string> = {
  EAT: 'Restaurants and cloud kitchens near you, with every step of your order shown live.',
  GROCERY: 'Fresh produce, daily staples and household essentials from your neighbourhood stores.',
  PHARMACY: 'Medicines from pharmacies near you, with a pharmacist’s check where a prescription is needed.',
  DIAGNOSTICS: 'Book tests at labs near you: home sample collection or walk in.',
  LOCAL_STORES: 'Your neighbourhood shops, from bakeries and florists to electronics, delivered.',
  RUSH: 'Everyday essentials from the shops that can reach you quickest. Delivez Rush stores are coming soon.',
  STREET: 'Street carts, stalls and society vendors near you, brought by a Delivez rider.',
};

export function Categories() {
  const overview = useOverview().data;
  const a = useAround();
  const [on, setOn] = useState<Kind>('EAT');
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setOn((k) => KINDS[(KINDS.findIndex((x) => x.k === k) + 1) % KINDS.length].k), 6000);
    return () => clearInterval(id);
  }, [auto]);
  const count = (k: Kind) => (k === 'RUSH' || k === 'STREET' ? null : (overview?.verticals[k]?.shops ?? null));
  const pick = (k: Kind) => (setAuto(false), setOn(k));
  return (
    <NowSection id="categories" tag="Shop by category" title="Everything around you, in one place.">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4" data-cats>
        {KINDS.map((x) => {
          const L = KIND_LOOK[x.k];
          const n = count(x.k);
          const near = a.stores.filter((s) => inKind(s, x.k)).length;
          const active = on === x.k;
          return (
            <Link
              key={x.k}
              to={x.to}
              data-cat={x.k}
              onMouseEnter={() => pick(x.k)}
              onFocus={() => pick(x.k)}
              className={`group relative isolate flex min-h-[222px] flex-col overflow-hidden rounded-[24px] border-[1.5px] p-5 text-[#161616] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_50px_-34px_rgba(0,0,0,.45)] ${active ? 'shadow-[0_24px_44px_-30px_rgba(232,19,15,.6)]' : 'border-[#ECE8DF]'}`}
              style={{ background: `linear-gradient(165deg, ${L.tint} 0%, #fff 62%)`, borderColor: active ? L.accent : undefined }}
            >
              <L.icon className="absolute -bottom-5 -right-3 -z-10 h-32 w-32 -rotate-12 opacity-[0.09] transition duration-500 group-hover:rotate-0 group-hover:scale-110" style={{ color: L.accent }} aria-hidden />
              <NowLogo k={x.k} className="h-[42px]" />
              <h3 className="mt-3 font-display text-[23px] leading-tight">{x.title}</h3>
              <p className="mt-1 text-[13.5px] text-[#5E5E5A]">{x.blurb}</p>
              <span className="mt-auto flex items-center gap-2 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE8DF] bg-white px-2.5 py-1 text-xs font-extrabold">
                  <i className="h-2 w-2 rounded-full bg-[#17803A]" aria-hidden />
                  {n === null ? `${near} near ${a.where ?? 'you'}` : n ? `${n} shops live` : 'Coming soon'}
                </span>
                <span className="ml-auto grid h-9 w-9 place-items-center rounded-full text-white transition group-hover:translate-x-1" style={{ background: active ? L.accent : '#111' }}>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </span>
              {active && auto && <span key={on} className="absolute inset-x-5 bottom-2 h-[3px] origin-left rounded bg-current" style={{ color: L.accent, animation: 'now-grow 6s linear' }} aria-hidden />}
            </Link>
          );
        })}
        <div className="flex min-h-[222px] flex-col justify-between rounded-[24px] p-6 text-white" style={{ background: 'radial-gradient(420px 260px at 100% 0%, rgba(255,212,0,.3), transparent 60%), radial-gradient(360px 300px at 0% 100%, rgba(232,19,15,.45), transparent 65%), #111' }}>
          <div>
            <h3 className="font-display text-2xl">Can’t wait to start?</h3>
            <p className="mt-1 text-sm text-neutral-300">Set your location and see every shop that delivers to you right now.</p>
          </div>
          <a href="#hero-location" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-dz-yellow font-black text-black">
            Choose location
          </a>
        </div>
      </div>
      <KindPanel k={on} onPick={pick} />
    </NowSection>
  );
}

/** The kind picked above: the nearest shop of that kind, how quick and how many, and what it sells by type. */
function KindPanel({ k, onPick }: { k: Kind; onPick: (k: Kind) => void }) {
  const overview = useOverview().data;
  const a = useAround();
  const x = kindOf(k);
  const L = KIND_LOOK[k];
  const near = a.stores.filter((s) => inKind(s, k));
  const open = near.filter((s) => s.open);
  const first = [...open].sort((p, q) => p.etaMinutes - q.etaMinutes)[0];
  const types = k === 'RUSH' || k === 'STREET' ? PAGE_TYPES[k] : overview?.verticals[k]?.types.length ? overview.verticals[k].types.map((t) => t.name) : PLANNED[k];
  return (
    <div key={k} className="vp-up mt-3.5 grid overflow-hidden rounded-[24px] border border-now-line bg-now-card lg:grid-cols-[0.9fr_1.1fr]" data-kind-panel={k}>
      <div className="flex flex-col gap-3.5 border-now-line p-6 lg:border-r" style={{ background: `linear-gradient(160deg, ${L.tint}22, transparent 80%)` }}>
        <span className="w-fit rounded-2xl bg-white px-3 py-2">
          <NowLogo k={k} className="h-[40px]" />
        </span>
        <p className="text-[15.5px] text-now-muted">{LONG[k]}</p>
        <div className="rounded-2xl border border-now-line bg-now-bg p-4">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[1px] text-now-muted">
            <i className={`h-2 w-2 rounded-full ${first ? 'bg-[#17803A]' : 'bg-neutral-400'}`} aria-hidden /> {a.where ? `Quickest near ${a.where}` : 'Quickest near you'}
          </p>
          {a.loading ? (
            <div className="mt-3 h-10 animate-pulse rounded-lg bg-now-surface" />
          ) : first ? (
            <>
              <div className="relative mt-4 h-1.5 rounded-full bg-now-line">
                <span className="absolute inset-y-0 left-0 w-[72%] rounded-full" style={{ background: `linear-gradient(90deg, ${L.accent}, #FFD400)` }} />
                <span className="absolute -top-[11px] left-[72%] grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-dz-yellow text-black">
                  <Bike className="h-4 w-4" aria-hidden />
                </span>
                <Home className="absolute -right-1 -top-[9px] h-6 w-6 text-dz-red" aria-hidden />
              </div>
              <p className="mt-4 flex items-baseline justify-between gap-3 text-sm text-now-muted">
                <Link to={`/s/${first.slug ?? first.id}`} className="truncate font-bold text-now-text hover:underline">
                  {first.name}
                </Link>
                <b className="shrink-0 text-dz-red">{first.etaMinutes} min</b>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-now-muted">{near.length ? 'These shops are closed right now.' : `No ${x.title.toLowerCase()} shops deliver to ${a.where ?? 'you'} yet.`}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-now-line bg-now-bg p-3.5">
            <b className="block font-display text-[26px] leading-none text-now-text">{first ? `${first.etaMinutes} min` : '—'}</b>
            <small className="text-xs text-now-muted">quickest delivery right now</small>
          </div>
          <div className="rounded-2xl border border-now-line bg-now-bg p-3.5">
            <b className="block font-display text-[26px] leading-none text-now-text">{near.length}</b>
            <small className="text-xs text-now-muted">{`shops near ${a.where ?? 'you'}`}</small>
          </div>
        </div>
        <Link to={x.to} className="inline-flex w-fit items-center gap-2 rounded-xl px-[18px] py-3 text-sm font-black text-white" style={{ background: L.accent }}>
          Shop {x.title} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-xs font-extrabold uppercase tracking-[1px] text-now-muted">Shop {x.title} by type</p>
          {overview && liveShops(k, overview) === 0 && <Soon />}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => {
            const I = itemIcon(t, '', L.icon);
            return (
              <Link key={t} to={x.to} className="group flex items-center gap-2.5 rounded-2xl border border-now-line bg-now-surface px-3 py-3 text-sm font-bold text-now-text transition hover:-translate-y-0.5 hover:border-now-text">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: L.tint, color: L.accent }} aria-hidden>
                  <I className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 truncate">{t}</span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" aria-hidden />
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Kinds of shop">
          {KINDS.map((y) => (
            <button key={y.k} type="button" aria-pressed={y.k === k} onClick={() => onPick(y.k)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-extrabold transition ${y.k === k ? 'border-black bg-black text-dz-yellow' : 'border-now-line text-now-text hover:border-now-text'}`}>
              {y.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
const liveShops = (k: Kind, o: NonNullable<ReturnType<typeof useOverview>['data']>) => (k === 'RUSH' || k === 'STREET' ? null : (o.verticals[k]?.shops ?? 0));
