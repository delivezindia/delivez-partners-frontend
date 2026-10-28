import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  Baby,
  BarChart3,
  Bell,
  Bike,
  Clock,
  Star,
  Boxes,
  Brain,
  Building2,
  CalendarClock,
  CircleHelp,
  ClipboardList,
  Coffee,
  Croissant,
  CreditCard,
  Flame,
  Flower2,
  Gift,
  Globe,
  Handshake,
  Headphones,
  HeartPulse,
  Home,
  IceCreamCone,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  MapPin,
  Megaphone,
  MessageCircle,
  Microscope,
  Moon,
  Package,
  PackageSearch,
  PawPrint,
  Phone,
  Pill,
  Pizza,
  Receipt,
  RefreshCw,
  Repeat,
  Route,
  Salad,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Tag,
  Timer,
  TrendingUp,
  Truck,
  Upload,
  UtensilsCrossed,
  Warehouse,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { PARTNERS_URL } from '../lib/config';
import { Section } from './site';
import type { StoreCard, Vertical } from '../lib/types';
import { useNearby } from '../lib/queries';
import { km, rupees } from '../lib/format';
import { VERTICAL_LOOK } from './VerticalIcon';

/*
 * Delivez Now home-page sections (from the Delivez Now page design).
 * Honest by rule: no invented store counts, prices or coupon codes; anything the app does not do yet says "Coming soon".
 * English for now — move to @delivez/i18n when the copy is final.
 */

type Item = { icon: LucideIcon; label: string };
const Soon = ({ dark = false }: { dark?: boolean }) => (
  <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${dark ? 'bg-white/10 text-dz-yellow' : 'bg-dz-yellow-soft text-black'}`}>Coming soon</span>
);
const Chip = ({ icon: Icon, label, dark = false }: Item & { dark?: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold ${dark ? 'border-white/15 bg-white/[0.06] text-white' : 'border-line bg-white text-ink'}`}>
    <Icon className={`h-4 w-4 ${dark ? 'text-dz-yellow' : 'text-dz-red'}`} aria-hidden /> {label}
  </span>
);

// ---------------------------------------------------------------- Check your area
export function AreaCheck({ onStart }: { onStart: () => void }) {
  const [pin, setPin] = useState('');
  const [res, setRes] = useState<null | 'yes' | 'soon' | 'bad'>(null);
  function check(e: FormEvent) {
    e.preventDefault();
    const p = pin.trim();
    setRes(!/^[1-8]\d{5}$/.test(p) ? 'bad' : p.startsWith('560') ? 'yes' : 'soon');
  }
  return (
    <section id="serviceability" className="scroll-mt-20 bg-neutral-50 px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[22px] bg-[#07090D] p-6 text-white sm:p-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-dz-yellow">Serviceability</p>
          <h2 className="mt-2 text-[clamp(28px,3.4vw,40px)] leading-none">Check your area</h2>
          <p className="mt-2 text-neutral-300">Enter your PIN code to see if Delivez delivers to you.</p>
        </div>
        <div>
          <form onSubmit={check} className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="pin">PIN code</label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => (setPin(e.target.value.replace(/\D/g, '').slice(0, 6)), setRes(null))}
              inputMode="numeric"
              placeholder="PIN code, e.g. 560034"
              className="min-h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-[#2A3140] bg-[#11151D] px-4 font-mono text-white placeholder:text-neutral-500"
              data-pin
            />
            <button type="submit" className="dz-btn-yellow">
              <MapPin className="h-5 w-5" aria-hidden /> Check your area
            </button>
          </form>
          <div className="mt-3 min-h-[52px]" aria-live="polite" data-pin-result={res ?? ''}>
            {res === 'bad' && <p className="font-bold text-[#FF7D84]">Enter a valid 6-digit PIN code.</p>}
            {res === 'yes' && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-bold text-[#2BD463]">Yes, we deliver in Bengaluru. Set your exact location to see the shops near you.</p>
                <button type="button" onClick={onStart} className="dz-btn-red">
                  Set my location
                </button>
              </div>
            )}
            {res === 'soon' && <p className="font-bold text-dz-yellow">Not yet. Delivez is live in Bengaluru first, and more cities are coming soon.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Shop by type
const TYPES: Record<Vertical, string[]> = {
  EAT: ['Restaurants', 'Cafes', 'Bakeries', 'Desserts', 'Fast food', 'Local kitchens', 'Breakfast', 'Healthy food'],
  GROCERY: ['Fruits & vegetables', 'Dairy', 'Staples', 'Snacks', 'Beverages', 'Household essentials', 'Cleaning supplies', 'Meat & seafood', 'Organic products'],
  PHARMACY: ['Medicines', 'Healthcare products', 'Medical supplies', 'Personal wellness', 'Baby care', 'First aid', 'Health devices', 'Personal care'],
  DIAGNOSTICS: ['Blood tests', 'Health packages', 'Home sample collection', 'Walk-in labs', 'Fasting tests', 'Reports online'],
  LOCAL_STORES: ['Electronics', 'Fashion', 'Beauty', 'Home & kitchen', 'Stationery', 'Optical', 'Sports', 'Pet supplies', 'Hardware', 'Gardening', 'Religious products', 'Specialty retail'],
};
const TYPE_TITLE: Record<Vertical, string> = { EAT: 'Food & restaurants', GROCERY: 'Grocery', PHARMACY: 'Pharmacy & wellness', DIAGNOSTICS: 'Lab tests', LOCAL_STORES: 'Local stores' };
const TYPE_BLURB: Record<Vertical, string> = {
  EAT: 'Restaurants and cloud kitchens near you, with live order tracking from kitchen to door.',
  GROCERY: 'Fresh produce, daily staples and household essentials from your neighbourhood stores.',
  PHARMACY: 'Medicines with prescription checks by a pharmacist and sealed packaging.',
  DIAGNOSTICS: 'Book tests at certified labs near you — walk in or home sample collection.',
  LOCAL_STORES: 'Your neighbourhood shops, from electronics to florists, delivered.',
};
const ORDER: Vertical[] = ['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES'];

export function ShopByType() {
  const [v, setV] = useState<Vertical>('EAT');
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setV((x) => ORDER[(ORDER.indexOf(x) + 1) % ORDER.length]), 6000);
    return () => clearInterval(id);
  }, [auto]);
  const L = VERTICAL_LOOK[v];
  return (
    <Section id="shop-by-type" eyebrow="Shop by category" title="Everything around you, in one place.">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Kinds of shops">
        {ORDER.map((x) => {
          const XL = VERTICAL_LOOK[x];
          const on = x === v;
          return (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => (setAuto(false), setV(x))}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-sm font-extrabold transition ${on ? 'text-white' : 'border-line bg-white'}`}
              style={on ? { background: XL.accent, borderColor: XL.accent } : undefined}
            >
              <XL.icon className="h-4 w-4" style={on ? undefined : { color: XL.accent }} aria-hidden /> {TYPE_TITLE[x]}
            </button>
          );
        })}
      </div>
      <div key={v} className="mt-4 grid overflow-hidden rounded-[26px] border-[1.5px] border-[#ECE8DF] bg-white lg:grid-cols-[0.85fr_1.15fr]" data-type-panel={v}>
        <div className="flex flex-col gap-3 p-6" style={{ background: `linear-gradient(160deg, ${L.tint}, #fff 85%)` }}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow" style={{ color: L.accent }} aria-hidden>
            <L.icon className="h-7 w-7" />
          </span>
          <h3 className="text-[28px] leading-none">{TYPE_TITLE[v]}</h3>
          <p className="text-ink-2">{TYPE_BLURB[v]}</p>
          <Link to={`/?v=${v}`} className="mt-auto inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 font-extrabold text-white" style={{ background: L.accent }}>
            Shop {TYPE_TITLE[v].toLowerCase()} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="p-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-ink-3">Shop {TYPE_TITLE[v].toLowerCase()} by type</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {TYPES[v].map((t) => (
              <Link key={t} to={`/?v=${v}`} className="group flex items-center gap-2.5 rounded-2xl border border-[#ECE8DF] bg-[#FBFAF7] px-3 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-white" style={{ ['--a' as string]: L.accent }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: L.tint, color: L.accent }} aria-hidden>
                  <L.icon className="h-4 w-4" />
                </span>
                {t}
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition group-hover:opacity-100" style={{ color: L.accent }} aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- App
const APP_FEATURES: (Item & { body: string })[] = [
  { icon: ShoppingBag, label: 'One cart, every store', body: 'Food, grocery and pharmacy in one place' },
  { icon: MapPin, label: 'Live rider tracking', body: 'See your order move in real time' },
  { icon: Zap, label: 'Rush essentials', body: 'Everyday items from nearby stores, fast' },
  { icon: Repeat, label: 'Reorder in one tap', body: 'Repeat orders and saved lists' },
];
export function AppSection() {
  return (
    <section id="app" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20" style={{ background: 'radial-gradient(900px 420px at 90% 0%, rgba(255,212,0,.35), transparent 60%), radial-gradient(700px 380px at 0% 100%, rgba(232,19,15,.12), transparent 60%), #fff' }}>
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex justify-center">
          <div className="w-[280px] -rotate-3 rounded-[40px] bg-black p-2.5 shadow-[0_50px_80px_-40px_rgba(0,0,0,.6)] transition hover:rotate-0">
            <div className="overflow-hidden rounded-[32px] bg-white">
              <div className="space-y-2 bg-dz-red p-4 text-white">
                <b className="font-display italic">DELIVEZ</b>
                <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-ink-3">
                  <Search className="h-3.5 w-3.5" aria-hidden /> Search products, stores or categories
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3">
                {ORDER.concat(['EAT']).slice(0, 6).map((x, i) => {
                  const XL = VERTICAL_LOOK[x];
                  return (
                    <span key={i} className="grid aspect-square place-items-center rounded-xl" style={{ background: XL.tint, color: XL.accent }} aria-hidden>
                      <XL.icon className="h-6 w-6" />
                    </span>
                  );
                })}
              </div>
              <div className="m-3 flex items-center gap-2 rounded-xl bg-dz-red p-3 text-xs font-extrabold text-white">
                <Bike className="h-4 w-4" aria-hidden /> Rider on the way
              </div>
              <div className="grid grid-cols-5 border-t border-line px-2 py-3 text-ink-3">
                {[Home, Search, ShoppingBag, Receipt, CircleHelp].map((I, i) => (
                  <I key={i} className={`mx-auto h-5 w-5 ${i === 0 ? 'text-dz-red' : ''}`} aria-hidden />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-dz-red">Delivez Now app</p>
          <h2 className="mt-2 text-[clamp(32px,4.2vw,56px)] leading-[0.98]">
            Your whole neighbourhood, <span className="text-dz-red">in one app.</span>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-ink-2">Food, groceries, medicines and local shops, with one cart, one checkout and live tracking to your door.</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {APP_FEATURES.map((f) => (
              <div key={f.label} className="flex gap-3 rounded-2xl border border-line bg-white p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-dz-yellow-soft">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <b className="block text-[15px]">{f.label}</b>
                  <small className="text-ink-2">{f.body}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-black px-4 py-2.5 text-white opacity-80">
              <Smartphone className="h-6 w-6" aria-hidden />
              <span className="leading-tight">
                <small className="block text-[10.5px] opacity-80">Android & iPhone apps</small>
                <b>Coming soon</b>
              </span>
            </span>
            <a href="#categories" className="inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-extrabold ring-[1.5px] ring-line">
              <Globe className="h-5 w-5" aria-hidden /> Shop on the web now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Rush store
const RUSH_STEPS: Item[] = [
  { icon: Receipt, label: 'Order placed' },
  { icon: ShoppingBasket, label: 'Picked in minutes' },
  { icon: Package, label: 'Packed & sealed' },
  { icon: Bike, label: 'Rider on the way' },
];
const RUSH_ITEMS: Item[] = [
  { icon: ShoppingBasket, label: 'Milk & dairy' },
  { icon: Croissant, label: 'Bread' },
  { icon: IceCreamCone, label: 'Snacks' },
  { icon: Sparkles, label: 'Personal care' },
  { icon: Zap, label: 'Batteries' },
  { icon: HeartPulse, label: 'First aid' },
  { icon: Baby, label: 'Baby care' },
  { icon: Home, label: 'Household' },
];
export function RushSection() {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setK((n) => (n + 1) % RUSH_STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <section id="quick" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-7 text-white" style={{ background: 'linear-gradient(150deg,#2A0F4A 0%,#4B1B86 55%,#7B2FD4 100%)' }}>
          <Zap className="absolute -bottom-10 -right-6 h-60 w-60 -rotate-12 opacity-[0.08]" aria-hidden />
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-dz-yellow text-black">
              <Zap className="h-6 w-6" aria-hidden />
            </span>
            <Soon dark />
          </div>
          <h2 className="text-[clamp(32px,3.8vw,50px)] leading-none">
            Need essentials fast? <span className="text-dz-yellow">Rush it.</span>
          </h2>
          <p className="max-w-xl text-[#DCCFF2]">Delivez Rush Stores will be nearby dark stores stocked with everyday essentials, packed in minutes and sent out with a Delivez rider.</p>
          <div className="flex flex-wrap gap-2">
            {['Daily essentials', 'Grocery', 'Snacks', 'Beverages', 'Personal care', 'Household items', 'Emergency essentials'].map((x) => (
              <span key={x} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                {x}
              </span>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-4 rounded-[28px] bg-[#0E0E0E] p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-neutral-400">How a Rush order moves</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#5FE0A0]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#5FE0A0]" /> Preview
            </span>
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
              <span key={s.label} className="grid justify-items-center gap-1 rounded-2xl bg-[#181818] px-1 py-2.5 text-center text-[11.5px] text-neutral-300">
                <s.icon className="h-6 w-6 text-dz-yellow" aria-hidden />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Food / pharmacy / local / gifts / specialty
const CUISINES: Item[] = [
  { icon: Flame, label: 'Biryani' },
  { icon: UtensilsCrossed, label: 'South Indian' },
  { icon: Pizza, label: 'Pizza' },
  { icon: Coffee, label: 'Cafe' },
  { icon: IceCreamCone, label: 'Desserts' },
  { icon: Salad, label: 'Healthy' },
  { icon: Croissant, label: 'Breakfast' },
];
const PHARMA: Item[] = [
  { icon: Upload, label: 'Prescription upload' },
  { icon: Stethoscope, label: 'Pharmacist verification' },
  { icon: PackageSearch, label: 'Medicine search' },
  { icon: Repeat, label: 'Repeat orders' },
  { icon: CalendarClock, label: 'Scheduled delivery' },
  { icon: ShieldCheck, label: 'Secure packaging' },
];
const LOCAL: Item[] = [
  { icon: Smartphone, label: 'Electronics' },
  { icon: ShoppingBag, label: 'Fashion' },
  { icon: Sparkles, label: 'Beauty' },
  { icon: Home, label: 'Home & kitchen' },
  { icon: ClipboardList, label: 'Stationery' },
  { icon: PawPrint, label: 'Pet supplies' },
  { icon: Leaf, label: 'Gardening' },
  { icon: Store, label: 'Specialty retail' },
];
const GIFTS: Item[] = [
  { icon: Flower2, label: 'Flowers' },
  { icon: Gift, label: 'Cakes' },
  { icon: Gift, label: 'Chocolates' },
  { icon: Gift, label: 'Personalised gifts' },
  { icon: Gift, label: 'Celebration hampers' },
  { icon: Sparkles, label: 'Festival gifts' },
  { icon: Timer, label: 'Same-day' },
  { icon: CalendarClock, label: 'Scheduled' },
];
const SPECIAL: Item[] = [
  { icon: Leaf, label: 'Organic stores' },
  { icon: UtensilsCrossed, label: 'Gourmet foods' },
  { icon: MapPin, label: 'Regional specialties' },
  { icon: Sparkles, label: 'Local artisans' },
  { icon: Home, label: 'Home décor' },
  { icon: ClipboardList, label: 'Books & toys' },
  { icon: Store, label: 'Niche retailers' },
];

function FeatureBlock({ id, eyebrow, title, intro, items, v, cta, soon = false, tone = 'white' }: { id: string; eyebrow: string; title: string; intro: string; items: Item[]; v?: Vertical; cta?: string; soon?: boolean; tone?: 'white' | 'soft' }) {
  return (
    <Section id={id} className={tone === 'soft' ? 'bg-neutral-50' : ''} eyebrow={eyebrow} title={title} intro={intro}>
      {soon && (
        <div className="-mt-6 mb-4">
          <Soon />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Chip key={i.label} {...i} />
        ))}
      </div>
      {v && cta && (
        <Link to={`/?v=${v}`} className="dz-btn-red mt-6 inline-flex">
          {cta} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </Section>
  );
}

export function FoodSection() {
  return <FeatureBlock id="food" eyebrow="Food & restaurants" title="Restaurants near you." intro="Cuisines, ratings and delivery times from the restaurants around you, with a vegetarian filter." items={CUISINES} v="EAT" cta="Order food" />;
}
export function PharmacySection() {
  return <FeatureBlock id="pharmacy" tone="soft" eyebrow="Pharmacy & wellness" title="Medicines and wellness, delivered safely." intro="Prescription upload, pharmacist verification where required, repeat orders, scheduled delivery and secure packaging." items={PHARMA} v="PHARMACY" cta="Shop pharmacy" />;
}
export function LocalSection() {
  return <FeatureBlock id="localstores" eyebrow="Local stores" title="Your neighbourhood shops, online." intro="The shops on your street — electronics, fashion, beauty, stationery and more." items={LOCAL} v="LOCAL_STORES" cta="Explore local stores" />;
}
export function GiftsSection() {
  return <FeatureBlock id="gifts" tone="soft" eyebrow="Gifts & occasions" title="Make every moment special." intro="Flowers, cakes and gifts from local shops — instant, same-day, scheduled or as a surprise." items={GIFTS} soon />;
}
export function SpecialtySection() {
  return <FeatureBlock id="specialty" eyebrow="Specialty & local stores" title="Discover what only your city has." intro="Organic stores, regional specialties, local artisans and niche retailers you won't find on big marketplaces." items={SPECIAL} v="LOCAL_STORES" cta="Discover specialty stores" />;
}

// ---------------------------------------------------------------- Search
export function SearchSection({ onStart }: { onStart: () => void }) {
  const [q, setQ] = useState('');
  return (
    <Section id="search" eyebrow="Search" title="Find anything nearby.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
        className="flex flex-wrap gap-2"
      >
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products, stores or categories" className="min-h-14 min-w-0 flex-1 rounded-[14px] border-2 border-dz-red px-4 text-base" />
        <button type="submit" className="dz-btn-red min-h-14">
          <Search className="h-5 w-5" aria-hidden /> Search
        </button>
      </form>
      <p className="mt-3 text-sm text-ink-2">Set your location first — search shows products and shops that deliver to you.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['Paracetamol', 'Milk', 'Flowers', 'Phone charger', 'Pizza', 'Pet food'].map((x) => (
          <button key={x} type="button" onClick={() => (setQ(x), onStart())} className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold hover:border-black">
            {x}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Offers
const OFFERS: (Item & { body: string; bg: string })[] = [
  { icon: Store, label: 'Store offers', body: 'Discounts from the shops you order from', bg: 'linear-gradient(135deg,#E8130F,#7A0209)' },
  { icon: CreditCard, label: 'Bank offers', body: 'Savings on UPI and cards', bg: 'linear-gradient(135deg,#1E5BD6,#0E2E6E)' },
  { icon: Truck, label: 'Free delivery', body: 'Free delivery days and minimum-order deals', bg: 'linear-gradient(135deg,#17803A,#0B3D20)' },
  { icon: Sparkles, label: 'First order', body: 'A welcome offer on your first order', bg: 'linear-gradient(135deg,#000,#3A2E00)' },
  { icon: Pill, label: 'Category deals', body: 'Savings on medicines, groceries and more', bg: 'linear-gradient(135deg,#0E5A7A,#05202A)' },
  { icon: Gift, label: 'Festival offers', body: 'Hampers and gifts for every festival', bg: 'linear-gradient(135deg,#7A1E5A,#2A0A20)' },
  { icon: Timer, label: 'Flash deals', body: 'Short-time deals near you', bg: 'linear-gradient(135deg,#E0A800,#7A5A0A)' },
];
export function OffersSection() {
  return (
    <Section id="offers" className="bg-neutral-50" eyebrow="Offers & promotions" title="Offers near you." intro="Coupons and deals are on the way. Today every order has no platform fee and no packaging fee.">
      <div className="-mt-6 mb-4">
        <Soon />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OFFERS.map((o) => (
          <div key={o.label} className="grid content-start gap-2 rounded-[18px] p-4 text-white" style={{ background: o.bg }}>
            <o.icon className="h-6 w-6" aria-hidden />
            <b className="font-display text-2xl leading-tight">{o.label}</b>
            <small className="opacity-90">{o.body}</small>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Merchants
const M_BENEFITS = ['Digital storefront', 'Order management', 'Local delivery', 'Catalogue management', 'Inventory', 'Promotions', 'Customer analytics', 'Settlements', 'Business insights'];
const M_STEPS = ['Merchant account', 'Business details', 'Store location', 'Banking', 'Catalogue setup', 'Delivery setup', 'Review & go live'];
const M_TYPES: Item[] = [
  { icon: UtensilsCrossed, label: 'Restaurant' },
  { icon: ShoppingBasket, label: 'Grocery' },
  { icon: Pill, label: 'Pharmacy' },
  { icon: Microscope, label: 'Lab' },
  { icon: Smartphone, label: 'Electronics' },
  { icon: ShoppingBag, label: 'Fashion' },
  { icon: Sparkles, label: 'Beauty' },
  { icon: Store, label: 'Other shops' },
];
const M_TOOLS: Item[] = [
  { icon: Receipt, label: 'Orders' },
  { icon: Boxes, label: 'Products' },
  { icon: Warehouse, label: 'Inventory' },
  { icon: Megaphone, label: 'Promotions' },
  { icon: Truck, label: 'Delivery' },
  { icon: Wallet, label: 'Settlements' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: LayoutDashboard, label: 'Store settings' },
];
export function MerchantsSection() {
  return (
    <Section id="merchants" className="bg-neutral-50" eyebrow="Delivez for merchants" title="Grow your local business with Delivez." intro="For restaurants, grocery stores, pharmacies, labs, retail and specialty shops.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {M_BENEFITS.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold">
                <ShieldCheck className="h-4 w-4 text-dz-green" aria-hidden /> {b}
              </span>
            ))}
          </div>
          <div>
            <b className="text-sm uppercase tracking-wider text-ink-3">Merchant onboarding</b>
            <ol className="mt-2 flex flex-wrap items-center gap-1.5">
              {M_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden />}
                  <span className="rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-[13px] font-bold">
                    {i + 1}. {s}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap gap-2">
            {M_TYPES.map((t) => (
              <Chip key={t.label} {...t} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={PARTNERS_URL} className="dz-btn-red">
              Become a merchant
            </a>
            <a href={`${PARTNERS_URL}/login`} className="inline-flex min-h-12 items-center rounded-[10px] bg-black px-6 font-extrabold text-dz-yellow">
              Merchant login
            </a>
          </div>
        </div>
        <div className="rounded-[24px] bg-[#07090D] p-5 text-white">
          <p className="text-[11px] font-black tracking-[0.1em] text-dz-yellow">WHAT YOU GET IN THE DELIVEZ PARTNERS APP</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {M_TOOLS.map((t) => (
              <div key={t.label} className="grid justify-items-start gap-2 rounded-2xl bg-[#11151D] p-3 text-sm font-bold">
                <t.icon className="h-5 w-5 text-dz-yellow" aria-hidden /> {t.label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-neutral-400">Registration is free. Shops go live after a document and quality check.</p>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Delivery network
const NET: (Item & { body: string })[] = [
  { icon: Warehouse, label: 'Nearby hubs', body: 'Riders start close to the shops they serve.' },
  { icon: Zap, label: 'Dark stores', body: 'Essentials stocked for fast orders (coming soon).' },
  { icon: Boxes, label: 'Micro fulfilment', body: 'Small local warehouses for quick picking.' },
  { icon: Route, label: 'Delivery zones', body: 'Shops deliver within a set distance, so orders stay quick.' },
  { icon: Bike, label: 'Rider availability', body: 'Riders are matched to orders as soon as the shop marks them ready.' },
  { icon: MapPin, label: 'Serviceable areas', body: 'Bengaluru first; more cities soon.' },
];
export function NetworkSection() {
  return (
    <section id="network" className="scroll-mt-20 bg-black px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-extrabold uppercase tracking-wider text-dz-yellow">Local delivery network</p>
        <h2 className="mt-2 text-[clamp(30px,4vw,44px)] leading-none">Local delivery powered by Delivez.</h2>
        <p className="mt-3 max-w-2xl text-lg text-neutral-300">You shop from the stores near you; Delivez riders handle the delivery from shop to door.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NET.map((n) => (
            <div key={n.label} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-dz-yellow text-black">
                <n.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <b className="block">{n.label}</b>
                <small className="text-neutral-400">{n.body}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- AI
const AI: (Item & { ex: string })[] = [
  { icon: Store, label: 'Store recommendations', ex: 'You often order breakfast on weekday mornings — here is a bakery 400 m away.' },
  { icon: ShoppingBasket, label: 'Product recommendations', ex: 'People who buy atta here also add rice and toor dal.' },
  { icon: RefreshCw, label: 'Smart reorder', ex: 'You usually buy milk and bread every two days. Reorder in one tap?' },
  { icon: Timer, label: 'Delivery time prediction', ex: 'Arrival time based on the shop’s prep time, the rider’s location and traffic right now.' },
  { icon: TrendingUp, label: 'Demand forecasting', ex: 'Shops stock up before the weekend rush, so items stay available.' },
  { icon: Search, label: 'Search intelligence', ex: '“Fever medicine” also finds paracetamol, ORS and a thermometer.' },
  { icon: Repeat, label: 'Substitute suggestions', ex: 'Your milk is out of stock? Here is the same size from another brand at the same price.' },
  { icon: ShoppingBag, label: 'Basket suggestions', ex: 'Making dosa tonight? Add batter, chutney and filter coffee.' },
  { icon: Flame, label: 'Local trends', ex: 'Trending near you: mangoes, cold coffee and phone chargers.' },
  { icon: BarChart3, label: 'Merchant insights', ex: 'For shops: which items to stock more of on match days.' },
];
export function AiSection() {
  const [i, setI] = useState(2);
  const a = AI[i];
  return (
    <Section id="ai" className="bg-neutral-50" eyebrow="AI & personalisation" title="Smarter local shopping." intro="Tap a feature to see an example. These are rolling out step by step.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="AI features">
        {AI.map((x, k) => (
          <button key={x.label} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`grid content-start gap-1.5 rounded-2xl border-[1.5px] p-3 text-left text-[13px] font-extrabold transition ${k === i ? 'border-[#1E5BD6] bg-[#1E5BD6] text-white' : 'border-line bg-white'}`}>
            <x.icon className="h-5 w-5" aria-hidden /> {x.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 rounded-[18px] p-5 text-white" style={{ background: 'linear-gradient(135deg,#1E5BD6,#0E2E6E)' }} aria-live="polite">
        <small className="font-black tracking-wider opacity-85">EXAMPLE · {a.label.toUpperCase()}</small>
        <b className="flex items-start gap-2 font-display text-2xl leading-tight">
          <Brain className="mt-1 h-6 w-6 shrink-0" aria-hidden /> {a.ex}
        </b>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Ecosystem
const ECO: { k: string; icon: LucideIcon; need: string; name: string; body: string; bg: string; href?: string; to?: string; cta: string }[] = [
  { k: 'now', icon: ShoppingBag, need: 'Buy from a nearby store', name: 'Delivez Now', body: 'Shop food, groceries, medicines and more from local merchants; Delivez delivers it.', bg: '#E8130F', to: '#categories', cta: 'Start shopping' },
  { k: 'go', icon: Zap, need: 'Urgent pickup from a specific place', name: 'Delivez Go', body: 'Need something urgently from a specific location? A bike or truck in minutes.', bg: '#E0A800', href: 'https://claude.ai/artifact/CTrSZF548JkrBt8x2zdEtF', cta: 'Book Delivez Go' },
  { k: 'one', icon: Send, need: 'Send my own item', name: 'Delivez One', body: 'Sending your own personal item, documents or luggage? That’s Delivez One.', bg: '#1E5BD6', href: 'https://claude.ai/artifact/6K71f4sGe8wMdQim59bs6Z', cta: 'Send with Delivez One' },
  { k: 'move', icon: Truck, need: 'Move home or office', name: 'Delivez Move', body: 'Relocating? Delivez Move handles packing, moving and storage.', bg: '#7A0209', href: 'https://claude.ai/artifact/QmLvpSayuHtzGtvkkWPjbK', cta: 'Plan a move' },
  { k: 'pro', icon: Building2, need: 'Ship for my business', name: 'Delivez Pro', body: 'Business logistics: freight, fulfilment, distribution and more.', bg: '#111', href: 'https://claude.ai/artifact/7rN8zqzFYXrk9ZQihG6Em4', cta: 'Explore Delivez Pro' },
];
export function EcosystemSection() {
  const [k, setK] = useState('now');
  const e = ECO.find((x) => x.k === k)!;
  return (
    <Section id="ecosystem" eyebrow="One Delivez ecosystem" title="Which Delivez is right for this?" intro="Delivez Now is for buying from nearby merchants. Tap what you need.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="What do you need">
        {ECO.map((x) => (
          <button key={x.k} type="button" role="tab" aria-selected={x.k === k} onClick={() => setK(x.k)} className={`grid content-start gap-1.5 rounded-2xl border-[1.5px] p-3.5 text-left text-sm font-extrabold transition ${x.k === k ? 'border-black bg-dz-yellow-soft' : 'border-line bg-white'}`}>
            <x.icon className="h-5 w-5" aria-hidden /> {x.need}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 rounded-[18px] p-5 text-white" style={{ background: e.bg }} aria-live="polite">
        <small className="font-black tracking-wider opacity-85">USE</small>
        <b className="font-display text-[28px] leading-none">{e.name}</b>
        <span>{e.body}</span>
        {e.href ? (
          <a href={e.href} target="_blank" rel="noopener" className="dz-btn-yellow mt-1 w-fit">
            {e.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        ) : (
          <a href={e.to} className="dz-btn-yellow mt-1 w-fit">
            {e.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Support
const HELP: { t: string; a: string }[] = [
  { t: 'Order issue', a: 'Tell us what went wrong with your order and we will fix it or refund you, as set out in the refund policy.' },
  { t: 'Missing item', a: 'Report missing items from your order page with your order number. Refunds go back to your original payment method.' },
  { t: 'Wrong item', a: 'Share a photo of what you received from your order page and we will arrange a refund.' },
  { t: 'Refund', a: 'Track your refund on the order page. It goes back to the way you paid.' },
  { t: 'Cancellation', a: 'You can cancel free of charge until the shop accepts your order.' },
  { t: 'Payment', a: 'If money was taken but the order failed, it is refunded automatically to the way you paid.' },
  { t: 'Delayed delivery', a: 'See the live status on your order page. If the shop or rider is late, we keep you updated.' },
  { t: 'Prescription order', a: 'The pharmacist checks your prescription before the order is accepted and will contact you if anything is unclear.' },
  { t: 'Store issue', a: 'Problems with a shop’s listing, prices or behaviour go to our merchant team for review.' },
];
export function SupportSection() {
  const [i, setI] = useState(1);
  return (
    <Section id="support" className="bg-neutral-50" eyebrow="Customer support" title="We’re here to help.">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <b>What do you need help with?</b>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Support topics">
            {HELP.map((h, k) => (
              <button key={h.t} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold ${k === i ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white'}`}>
                {h.t}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/orders" className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2.5 text-sm font-extrabold">
              <Receipt className="h-4 w-4" aria-hidden /> My orders
            </Link>
            <Link to="/refund-policy" className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-line bg-white px-4 py-2.5 text-sm font-extrabold">
              <LifeBuoy className="h-4 w-4" aria-hidden /> Refund policy
            </Link>
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-[24px] bg-[#07090D] p-6 text-white" aria-live="polite">
          <b className="text-xs tracking-wider text-dz-yellow">{HELP[i].t.toUpperCase()}</b>
          <p className="text-[15px] leading-relaxed text-neutral-300">{HELP[i].a}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><MessageCircle className="h-4 w-4 text-dz-yellow" aria-hidden /> Live chat · coming soon</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Phone className="h-4 w-4 text-dz-yellow" aria-hidden /> Call support · coming soon</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Headphones className="h-4 w-4 text-dz-yellow" aria-hidden /> Help on every order page</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Why + family
const WHY: (Item & { body: string })[] = [
  { icon: Store, label: 'Everything nearby', body: 'Many kinds of local shops in one place.' },
  { icon: Zap, label: 'Fast delivery', body: 'Powered by the Delivez local rider network.' },
  { icon: ShieldCheck, label: 'Trusted stores', body: 'Every shop is checked before it goes live.' },
  { icon: MapPin, label: 'Live tracking', body: 'Follow your order from shop to doorstep.' },
  { icon: Handshake, label: 'Local economy', body: 'Your money stays with neighbourhood merchants.' },
  { icon: Globe, label: 'One Delivez ecosystem', body: 'Connected with Delivez Go and Delivez One when you need them.' },
];
export function WhyNowSection() {
  return (
    <Section id="why" eyebrow="Why Delivez Now" title="Shop local, the easy way.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map((w) => (
          <div key={w.label} className="grid gap-1.5 rounded-[20px] bg-black p-5 text-white">
            <w.icon className="h-7 w-7 text-dz-yellow" aria-hidden />
            <b className="font-display text-xl text-dz-yellow">{w.label}</b>
            <p className="text-sm text-neutral-300">{w.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const FAMILY: { icon: LucideIcon; name: string; body: string; accent: string; v?: Vertical; soon?: boolean }[] = [
  { icon: UtensilsCrossed, name: 'Delivez Now Food', body: 'Restaurants and cloud kitchens, delivered hot', accent: '#E8130F', v: 'EAT' },
  { icon: ShoppingBasket, name: 'Delivez Now Grocery', body: 'Daily essentials and fresh produce', accent: '#17803A', v: 'GROCERY' },
  { icon: Pill, name: 'Delivez Now Pharmacy', body: 'Medicines and healthcare at your door', accent: '#1E5BB8', v: 'PHARMACY' },
  { icon: Store, name: 'Delivez Now Local Shop', body: 'Every neighbourhood store, online', accent: '#7A3FC0', v: 'LOCAL_STORES' },
  { icon: Zap, name: 'Delivez Now Rush Store', body: 'Quick-commerce essentials in minutes', accent: '#7B2FD4', soon: true },
  { icon: Bell, name: 'Delivez Now Street Cart', body: 'Street vendors and carts, now deliverable', accent: '#C2410C', soon: true },
];
export function FamilySection() {
  return (
    <Section id="now-family" className="bg-neutral-50" eyebrow="The Delivez Now family" title="Six ways to get it now." intro="Food, groceries, medicines, local shops, quick-commerce and street carts, all on one Delivez account.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FAMILY.map((f) => {
          const body = (
            <>
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: f.accent }} aria-hidden />
              <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: f.accent }} aria-hidden>
                <f.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <b className="block font-display text-lg italic">
                  DELIVEZ <span className="text-dz-red">NOW</span> <span style={{ color: f.accent }}>{f.name.replace('Delivez Now ', '').toUpperCase()}</span>
                </b>
                <span className="text-sm text-ink-2">{f.body}</span>
              </span>
              {f.soon && (
                <span className="absolute right-3 top-3">
                  <Soon />
                </span>
              )}
            </>
          );
          const cls = 'relative flex items-center gap-4 overflow-hidden rounded-[18px] border border-line bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_34px_-22px_rgba(0,0,0,.45)]';
          return f.v ? (
            <Link key={f.name} to={`/?v=${f.v}`} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={f.name} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </Section>
  );
}


// ---------------------------------------------------------------- Nearby stores (live data)
/** Before a location is set, show real shops around central Bengaluru (Indiranagar). */
const PREVIEW_AT = { lat: 12.9719, lng: 77.6412 };
const FILTERS = ['Nearby', 'Fastest', 'Top rated', 'Open now', 'Free delivery'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_ICON: Record<Filter, LucideIcon> = { Nearby: MapPin, Fastest: Timer, 'Top rated': Star, 'Open now': Clock, 'Free delivery': Truck };

export function NearbyStores({ onStart }: { onStart: () => void }) {
  const [filter, setFilter] = useState<Filter>('Nearby');
  const [cat, setCat] = useState<Vertical | null>(null);
  const [all, setAll] = useState(false);
  const q = useNearby(PREVIEW_AT, cat, '');
  let list: StoreCard[] = [...(q.data?.stores ?? [])];
  if (filter === 'Open now') list = list.filter((s) => s.open);
  if (filter === 'Free delivery') list = list.filter((s) => s.deliveryFee === 0);
  list.sort((a, b) => (filter === 'Fastest' ? a.etaMinutes - b.etaMinutes : filter === 'Top rated' ? (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0) : a.distanceKm - b.distanceKm));
  // "All categories": take shops in turn from each kind, so one busy kind doesn't fill the first row.
  if (!cat) {
    const by = ORDER.map((v) => list.filter((s) => s.vertical === v));
    const mixed: StoreCard[] = [];
    for (let i = 0; mixed.length < list.length; i++) by.forEach((g) => g[i] && mixed.push(g[i]));
    list = mixed;
  }
  const shown = all ? list : list.slice(0, 8);
  const pill = (on: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold transition ${on ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white hover:border-black'}`;
  return (
    <Section id="stores" className="bg-neutral-50" eyebrow="Nearby stores" title="Stores near you" intro="Real shops around Indiranagar, Bengaluru. Set your location to see the shops that deliver to you.">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Store filters">
        {FILTERS.map((f) => {
          const I = FILTER_ICON[f];
          return (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={pill(filter === f)}>
              <I className="h-4 w-4" aria-hidden /> {f}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Store category">
        <button type="button" aria-pressed={!cat} onClick={() => setCat(null)} className={pill(!cat)}>
          All categories
        </button>
        {ORDER.map((v) => {
          const L = VERTICAL_LOOK[v];
          return (
            <button key={v} type="button" aria-pressed={cat === v} onClick={() => setCat(v)} className={pill(cat === v)}>
              <L.icon className="h-4 w-4" style={cat === v ? undefined : { color: L.accent }} aria-hidden /> {TYPE_TITLE[v]}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-nearby>
        {q.isLoading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-60 animate-pulse rounded-[18px] bg-white" />)
          : shown.map((s) => <NearbyCard key={s.id} s={s} />)}
      </div>
      {!q.isLoading && !shown.length && <p className="mt-4 text-ink-2">{q.isError ? 'Could not load shops right now.' : 'No shops match these filters yet.'}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {!all && list.length > 8 && (
          <button type="button" onClick={() => setAll(true)} className="inline-flex min-h-12 items-center rounded-[10px] bg-black px-6 font-extrabold text-dz-yellow">
            View all nearby stores
          </button>
        )}
        <button type="button" onClick={onStart} className="dz-btn-red">
          <MapPin className="h-5 w-5" aria-hidden /> Set my location
        </button>
      </div>
    </Section>
  );
}

function NearbyCard({ s }: { s: StoreCard }) {
  const L = VERTICAL_LOOK[s.vertical];
  const closed = !s.open && !s.bookable;
  return (
    <Link to={`/s/${s.slug ?? s.id}`} data-store={s.id} className={`group grid overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_34px_-22px_rgba(0,0,0,.45)] ${closed ? 'opacity-60' : ''}`}>
      <div className="relative grid h-28 place-items-center" style={{ background: s.coverUrl ? undefined : L.accent }}>
        {s.coverUrl || s.logoUrl ? (
          <img src={(s.coverUrl ?? s.logoUrl)!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <L.icon className="h-12 w-12 text-white/90" aria-hidden />
        )}
        <span className={`absolute right-2 top-2 rounded-lg px-2 py-0.5 text-[11px] font-black ${closed ? 'bg-[#2A0A0E] text-[#FF7D84]' : 'bg-[#0F2418] text-[#2BD463]'}`}>{s.bookable ? 'Book a slot' : closed ? 'Closed' : 'Open'}</span>
      </div>
      <div className="grid gap-1 p-3">
        <b className="line-clamp-1 text-[15px]">{s.name}</b>
        <small className="line-clamp-1 text-xs text-ink-2">{s.cuisines.length ? s.cuisines.slice(0, 3).join(' · ') : TYPE_TITLE[s.vertical]}</small>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-extrabold">
          {s.rating && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-dz-yellow text-dz-yellow" aria-hidden /> {s.rating.avg.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {km(s.distanceKm)}
          </span>
          {!s.bookable && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {s.etaMinutes} min
            </span>
          )}
        </div>
        {!s.bookable && <small className="text-xs text-ink-2">{s.minOrderAmount ? `Min order ${rupees(s.minOrderAmount)}` : 'No minimum'} · {s.deliveryFee ? `Delivery ${rupees(s.deliveryFee)}` : 'Free delivery'}</small>}
      </div>
    </Link>
  );
}
