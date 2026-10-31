import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Bike,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  Handshake,
  LifeBuoy,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Pill,
  Receipt,
  RefreshCw,
  Repeat,
  Route,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Ticket,
  Timer,
  TrendingUp,
  Truck,
  TriangleAlert,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { PARTNERS_URL } from '../../lib/config';
import { rupees } from '../../lib/format';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { cityList, useOverview } from '../../lib/queries';
import { KIND_LOOK } from '../VerticalIcon';
import { NowLogo, NowSection, Soon, kindOf, pill, useAround, type Kind } from './kit';

// ---------------------------------------------------------------- Merchants

const BENEFITS = ['Digital storefront', 'Order management', 'Local delivery', 'Catalogue management', 'Inventory', 'Promotions', 'Settlements', 'Business insights'];
const ONBOARDING = ['Merchant account', 'Business details', 'Store location', 'Banking', 'Catalogue setup', 'Delivery setup', 'Review & go live'];
const MERCHANT_TYPES: { icon: LucideIcon; label: string }[] = [
  { icon: UtensilsCrossed, label: 'Restaurant' },
  { icon: ShoppingBasket, label: 'Grocery' },
  { icon: Pill, label: 'Pharmacy' },
  { icon: FlaskConical, label: 'Lab' },
  { icon: Smartphone, label: 'Electronics' },
  { icon: ShoppingBag, label: 'Fashion' },
  { icon: Sparkles, label: 'Beauty' },
  { icon: Store, label: 'Other shops' },
];
/** What a shop sees on its Delivez Partners dashboard (labels only: these are each shop's own numbers). */
const DASHBOARD: { icon: LucideIcon; label: string }[] = [
  { icon: Receipt, label: 'Orders today' },
  { icon: BadgeIndianRupee, label: 'Revenue' },
  { icon: Wallet, label: 'Average order' },
  { icon: Timer, label: 'Preparing' },
  { icon: PackageCheck, label: 'Ready for pickup' },
  { icon: Truck, label: 'Delivered' },
  { icon: XCircle, label: 'Cancelled' },
  { icon: Star, label: 'Rating' },
  { icon: TriangleAlert, label: 'Stock alerts' },
];
const MODULES = ['Orders', 'Products', 'Inventory', 'Promotions', 'Delivery', 'Settlements', 'Analytics', 'Store settings'];

export function MerchantsBand() {
  return (
    <NowSection id="merchants" surface tag="Delivez Now for merchants" title="Grow Your Local Business with Delivez" intro="For restaurants, grocery stores, pharmacies, labs, retail stores and specialty shops.">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-3.5">
          <div className="flex flex-wrap gap-1.5">
            {BENEFITS.map((b) => (
              <span key={b} className={pill(false)}>
                <Check className="h-4 w-4 text-[#17803A]" aria-hidden /> {b}
              </span>
            ))}
          </div>
          <b className="text-now-text">Merchant onboarding</b>
          <ol className="flex flex-wrap items-center gap-1.5">
            {ONBOARDING.map((s, i) => (
              <li key={s} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="h-4 w-4 text-now-muted" aria-hidden />}
                <span className="rounded-xl border-[1.5px] border-now-line bg-now-card px-3 py-2 text-[13px] font-extrabold text-now-text">
                  {i + 1}. {s}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-1.5">
            {MERCHANT_TYPES.map((x) => (
              <span key={x.label} className={pill(false)}>
                <x.icon className="h-4 w-4 text-dz-red" aria-hidden /> {x.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={PARTNERS_URL} className="inline-flex items-center rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
              Become a Merchant
            </a>
            <a href={`${PARTNERS_URL}/login`} className="inline-flex items-center rounded-xl bg-black px-[18px] py-3 text-sm font-black text-dz-yellow">
              Merchant Login
            </a>
          </div>
        </div>
        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-5 text-white">
          <p className="text-[11px] font-black uppercase tracking-[1px] text-dz-yellow">Your Delivez Partners dashboard</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DASHBOARD.map((d) => (
              <div key={d.label} className="flex items-center gap-2.5 rounded-xl bg-[#11151D] px-3 py-3">
                <d.icon className="h-5 w-5 shrink-0 text-dz-yellow" aria-hidden />
                <span className="text-[13px] font-bold">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MODULES.map((m) => (
              <span key={m} className="rounded-full border border-white/15 bg-[#11151D] px-3 py-1.5 text-[13px] font-bold">
                {m}
              </span>
            ))}
          </div>
          <p className="text-sm text-neutral-400">Registration is free, with 0% commission during the launch offer. Shops go live after a document and quality check.</p>
        </div>
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Delivery network

export function NetworkBand() {
  const a = useAround();
  const cities = cityList(useOverview().data);
  const open = a.stores.filter((s) => s.open && !s.bookable);
  const etas = open.map((s) => s.etaMinutes).sort((x, y) => x - y);
  const typical = etas.length ? etas[Math.floor(etas.length / 2)] : null;
  const nearest = a.stores[0];
  const chips: { icon: LucideIcon; label: string; soon?: boolean }[] = [
    { icon: Store, label: 'Nearby shops' },
    { icon: Route, label: 'Delivery zones' },
    { icon: Bike, label: 'Rider availability' },
    { icon: MapPin, label: 'Serviceable areas' },
    { icon: Zap, label: 'Dark stores', soon: true },
    { icon: Warehouse, label: 'Micro fulfilment', soon: true },
  ];
  const cells: [string, string, boolean?][] = [
    ['Your area', a.where ?? '—'],
    ['Nearest shop', nearest ? `${nearest.distanceKm < 1 ? `${Math.round(nearest.distanceKm * 1000)} m` : `${nearest.distanceKm.toFixed(1)} km`}` : '—'],
    ['Shops that deliver here', String(a.stores.length), a.stores.length > 0],
    ['Typical delivery', typical ? `${typical} min` : '—'],
    ['Shopping', 'Delivez Now'],
    ['Delivery', 'Delivez riders'],
  ];
  return (
    <NowSection id="network" tag="Local delivery network" title="Local Delivery Powered by Delivez" intro="You shop through Delivez Now; Delivez riders deliver from the shop to your door.">
      <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-4 text-white sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-extrabold ${c.soon ? 'border border-white/15 bg-[#11151D] text-neutral-300' : 'bg-dz-yellow text-black'}`}>
              <c.icon className="h-4 w-4" aria-hidden /> {c.label}
              {c.soon && <span className="text-[10.5px] font-black uppercase text-dz-yellow">soon</span>}
            </span>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-[#0B1220] p-3">
            <ShopMap />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cells.map(([label, value, ok]) => (
              <div key={label} className="rounded-[14px] bg-[#11151D] p-3.5">
                <small className="block text-xs text-neutral-400">{label}</small>
                <b className={`text-[17px] ${ok ? 'text-[#2BD463]' : ''}`}>{value}</b>
              </div>
            ))}
            {cities && <p className="col-span-2 text-sm text-neutral-400">{`Delivez Now is live in ${cities}; more cities soon.`}</p>}
          </div>
        </div>
      </div>
    </NowSection>
  );
}

/** Every shop around the point at its real distance and direction, coloured by kind. */
function ShopMap() {
  const a = useAround();
  const pts = a.stores.slice(0, 60);
  const max = Math.max(0.5, Math.ceil(Math.max(0, ...pts.map((s) => s.distanceKm)) * 2) / 2);
  const R = 150;
  const legend = (['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES'] as Kind[]).filter((k) => pts.some((s) => s.vertical === k));
  return (
    <svg viewBox="0 0 480 360" className="block h-auto w-full" role="img" aria-label={`${pts.length} shops around ${a.where ?? 'you'}`} data-shop-map>
      <rect width="480" height="360" rx="14" fill="#080C14" />
      <path d="M0 250 L 480 120" stroke="#141B29" strokeWidth="18" />
      <path d="M240 0 V 360 M0 180 H 480" stroke="#111827" strokeWidth="10" />
      {[1, 0.5].map((f) => (
        <g key={f}>
          <circle cx="240" cy="180" r={R * f} fill={f === 1 ? 'rgba(255,212,0,.05)' : 'none'} stroke="#FFD400" strokeOpacity=".35" strokeDasharray="5 6" />
          <text x={240 + R * f + 4} y="176" fontSize="11" fontWeight="800" fill="#A5A5A0">
            {max * f < 1 ? `${Math.round(max * f * 1000)} m` : `${(max * f).toFixed(1)} km`}
          </text>
        </g>
      ))}
      {pts.map((s) => {
        const r = Math.max(12, (R * Math.min(s.distanceKm, max)) / max);
        const t = (s.bearing * Math.PI) / 180;
        return <circle key={s.id} cx={240 + r * Math.sin(t)} cy={180 - r * Math.cos(t)} r="5.5" fill={KIND_LOOK[s.vertical].accent} stroke="#080C14" strokeWidth="1.5" opacity={s.open ? 1 : 0.45} />;
      })}
      <rect x="216" y="168" width="48" height="24" rx="8" fill="#E8130F" />
      <text x="240" y="184" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">
        YOU
      </text>
      {legend.map((k, i) => (
        <g key={k} transform={`translate(${14 + i * 92} 338)`}>
          <circle r="5" cx="5" cy="-4" fill={KIND_LOOK[k].accent} />
          <text x="14" y="0" fontSize="11" fill="#A5A5A0">
            {kindOf(k).title.split(' ')[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- Smarter shopping

const SMART: { icon: LucideIcon; label: string; live: boolean; ex: string }[] = [
  { icon: Repeat, label: 'Reorder in one tap', live: true, ex: 'Any past order, rebuilt from the shop’s menu today, straight to checkout.' },
  { icon: Timer, label: 'Delivery time estimates', live: true, ex: 'Every shop shows how long it takes to reach your address before you order.' },
  { icon: Search, label: 'Product search', live: true, ex: 'Search “milk” and see every shop near you that has it in stock.' },
  { icon: Store, label: 'Store recommendations', live: false, ex: 'You often order breakfast on weekday mornings — here is a bakery 400 m away.' },
  { icon: ShoppingBasket, label: 'Product recommendations', live: false, ex: 'People who buy atta here also add rice and toor dal.' },
  { icon: RefreshCw, label: 'Substitute suggestions', live: false, ex: 'Your milk is out of stock? The same size from another brand at the same price.' },
  { icon: ShoppingBag, label: 'Basket suggestions', live: false, ex: 'Making dosa tonight? Add batter, chutney and filter coffee.' },
  { icon: TrendingUp, label: 'Demand forecasting', live: false, ex: 'Shops stock up before the weekend rush, so items stay available.' },
  { icon: Sparkles, label: 'Local trends', live: false, ex: 'Trending near you: mangoes, cold coffee and phone chargers.' },
  { icon: BarChart3, label: 'Merchant insights', live: false, ex: 'For shops: which items to stock more of on match days.' },
];

export function SmartBand() {
  const [i, setI] = useState(0);
  const x = SMART[i];
  return (
    <NowSection id="ai" surface tag="AI & personalisation" title="Smarter Local Shopping" intro="Tap a feature to see what it does. Some are live today; the rest are rolling out step by step.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="Features">
        {SMART.map((s, k) => (
          <button key={s.label} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`grid content-start gap-2 rounded-2xl border p-3.5 text-left text-[13px] font-extrabold transition ${k === i ? 'border-[#1E5BD6] bg-[#1E5BD6] text-white' : 'border-now-line bg-now-card text-now-text hover:border-now-text'}`}>
            <span className="flex items-center justify-between">
              <s.icon className="h-5 w-5" aria-hidden />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${s.live ? 'bg-[#17803A] text-white' : k === i ? 'bg-white/20' : 'bg-now-surface text-now-muted'}`}>{s.live ? 'Live' : 'Soon'}</span>
            </span>
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2.5 rounded-[18px] p-5 text-white" style={{ background: 'linear-gradient(135deg,#1E5BD6,#0E2E6E)' }} aria-live="polite">
        <small className="font-black uppercase tracking-[1px] opacity-85">{x.live ? `Live now · ${x.label}` : `Example · ${x.label}`}</small>
        <b className="flex items-start gap-2 font-display text-[clamp(22px,2.4vw,28px)] leading-tight">
          <x.icon className="mt-1 h-6 w-6 shrink-0" aria-hidden /> {x.ex}
        </b>
        {x.live && (
          <Link to={x.label.startsWith('Reorder') ? '/orders' : '/shops'} className="inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            {x.label.startsWith('Reorder') ? 'See your past orders' : 'Try it'} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Which Delivez

const ECO: { k: string; icon: LucideIcon; need: string; name: string; body: string; bg: string; href?: string; cta: string }[] = [
  { k: 'now', icon: ShoppingBag, need: 'Buy from a nearby store', name: 'Delivez Now', body: 'Shop food, groceries, medicines and more from local merchants; Delivez delivers it.', bg: '#E8130F', cta: 'Start Shopping' },
  { k: 'go', icon: Zap, need: 'Urgent pickup from a specific place', name: 'Delivez Go', body: 'Need something urgently from a specific location? A bike or truck in minutes.', bg: '#C98A00', href: 'https://claude.ai/artifact/CTrSZF548JkrBt8x2zdEtF', cta: 'Book Delivez Go' },
  { k: 'one', icon: Send, need: 'Send my own item', name: 'Delivez One', body: 'Sending your own personal item, documents or luggage? That’s Delivez One.', bg: '#1E5BD6', href: 'https://claude.ai/artifact/6K71f4sGe8wMdQim59bs6Z', cta: 'Send with Delivez One' },
  { k: 'move', icon: Truck, need: 'Move home or office', name: 'Delivez Move', body: 'Relocating? Delivez Move handles packing, moving and storage.', bg: '#7A0209', href: 'https://claude.ai/artifact/QmLvpSayuHtzGtvkkWPjbK', cta: 'Plan a move' },
  { k: 'pro', icon: Building2, need: 'Ship for my business', name: 'Delivez Pro', body: 'Business logistics: freight, fulfilment, distribution and more.', bg: '#111', href: 'https://claude.ai/artifact/7rN8zqzFYXrk9ZQihG6Em4', cta: 'Explore Delivez Pro' },
];

export function EcosystemBand({ onStart }: { onStart: () => void }) {
  const [k, setK] = useState('now');
  const e = ECO.find((x) => x.k === k)!;
  return (
    <NowSection id="ecosystem" tag="One Delivez ecosystem" title="Which Delivez is right for this?" intro="Delivez Now is for buying from nearby merchants. Tap what you need.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="What do you need">
        {ECO.map((x) => (
          <button key={x.k} type="button" role="tab" aria-selected={x.k === k} onClick={() => setK(x.k)} className={`grid content-start gap-2.5 rounded-2xl border p-4 text-left text-[13.5px] font-extrabold transition ${x.k === k ? 'border-dz-yellow bg-[#FFF4C2] text-black' : 'border-now-line bg-now-card text-now-text hover:border-now-text'}`}>
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: x.bg }} aria-hidden>
              <x.icon className="h-5 w-5" />
            </span>
            {x.need}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 rounded-[18px] p-5 text-white" style={{ background: e.bg }} aria-live="polite">
        <small className="font-black uppercase tracking-[1px] opacity-85">Use</small>
        <b className="font-display text-[28px] leading-none">{e.name}</b>
        <span>{e.body}</span>
        {e.href ? (
          <a href={e.href} target="_blank" rel="noopener" className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            {e.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        ) : (
          <button type="button" onClick={onStart} className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            {e.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Why

const WHY: { icon: LucideIcon; label: string; body: string }[] = [
  { icon: Store, label: 'Everything Nearby', body: 'Many kinds of local shops in one place.' },
  { icon: Zap, label: 'Fast Delivery', body: 'Powered by the Delivez local rider network.' },
  { icon: ShieldCheck, label: 'Trusted Stores', body: 'Every shop is checked before it goes live.' },
  { icon: MapPin, label: 'Live Order Status', body: 'Follow your order from shop to doorstep.' },
  { icon: Handshake, label: 'Local Economy', body: 'Your money stays with neighbourhood merchants.' },
  { icon: Globe, label: 'One Delivez Ecosystem', body: 'Connected with Delivez Go and Delivez One when you need them.' },
];

export function WhyBand() {
  return (
    <NowSection id="why" surface tag="Why Delivez Now" title="Shop local, the easy way.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map((w) => (
          <div key={w.label} className="grid gap-2 rounded-[22px] bg-black p-5 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
              <w.icon className="h-6 w-6 text-dz-yellow" aria-hidden />
            </span>
            <b className="font-display text-[22px] text-dz-yellow">{w.label}</b>
            <p className="text-sm text-neutral-300">{w.body}</p>
          </div>
        ))}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Support

const HELP: { t: string; a: string }[] = [
  { t: 'Order issue', a: 'Tell us what went wrong with your order and we will fix it or refund you, as set out in the refund policy.' },
  { t: 'Store issue', a: 'Problems with a shop’s listing, prices or behaviour go to our merchant team for review.' },
  { t: 'Missing item', a: 'Report missing items from your order page. Refunds go back to the way you paid.' },
  { t: 'Wrong item', a: 'Share a photo of what you received from your order page and we will arrange a refund.' },
  { t: 'Refund', a: 'Track your refund on the order page. It goes back to the way you paid.' },
  { t: 'Cancellation', a: 'You can cancel free of charge until the shop accepts your order.' },
  { t: 'Payment', a: 'If money was taken but the order failed, it is refunded automatically to the way you paid.' },
  { t: 'Delayed delivery', a: 'See the live status on your order page. If the shop or rider is late, we keep you updated.' },
  { t: 'Prescription order', a: 'The pharmacist checks your prescription before the order is accepted and contacts you if anything is unclear.' },
];
const HELP_LINKS: { icon: LucideIcon; label: string; to?: string; soon?: boolean }[] = [
  { icon: MessageCircle, label: 'Live chat', soon: true },
  { icon: LifeBuoy, label: 'Help centre', to: '/help' },
  { icon: Ticket, label: 'Raise a ticket', to: '/help/new' },
  { icon: Receipt, label: 'My orders', to: '/orders' },
  { icon: FileText, label: 'Refund policy', to: '/refund-policy' },
  { icon: Phone, label: 'Call support', soon: true },
];

export function SupportBand() {
  const [i, setI] = useState(2);
  return (
    <NowSection id="support" tag="Customer support" title="We’re here to help.">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div>
          <b className="text-now-text">What do you need help with?</b>
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Support topics">
            {HELP.map((h, k) => (
              <button key={h.t} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={pill(k === i)}>
                {h.t}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {HELP_LINKS.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} className={pill(false)}>
                  <l.icon className="h-4 w-4 text-dz-red" aria-hidden /> {l.label}
                </Link>
              ) : (
                <span key={l.label} className={`${pill(false)} opacity-70`}>
                  <l.icon className="h-4 w-4" aria-hidden /> {l.label} <span className="text-[10.5px] font-black uppercase text-now-muted">soon</span>
                </span>
              ),
            )}
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-5 text-white" aria-live="polite">
          <b className="text-xs font-black uppercase tracking-[1px] text-dz-yellow">{HELP[i].t}</b>
          <p className="text-[15px] leading-relaxed text-neutral-300">{HELP[i].a}</p>
          <Link to="/help/new" className="inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            <ClipboardList className="h-4 w-4" aria-hidden /> Get help with an order
          </Link>
        </div>
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- FAQ, call to action, the family

const FAQ: { q: MsgKey; a: MsgKey }[] = [
  { q: 'lc.faq.q1', a: 'lc.faq.a1' },
  { q: 'lc.faq.q2', a: 'lc.faq.a2' },
  { q: 'lc.faq.q3', a: 'lc.faq.a3' },
  { q: 'lc.faq.q4', a: 'lc.faq.a4' },
  { q: 'lc.faq.q5', a: 'lc.faq.a5' },
  { q: 'lc.faq.q6', a: 'lc.faq.a6' },
];

export function FaqBand() {
  const { t } = useI18n();
  const overview = useOverview().data;
  const facts = { fee: rupees(overview?.deliveryFee ?? 3000), n: overview?.doorCheckMinutes ?? 5 };
  return (
    <NowSection id="faq" surface tag={t('lc.site.faqEyebrow')} title={t('lc.site.faqTitle')}>
      <div className="grid max-w-3xl gap-2">
        {FAQ.map((f, k) => (
          <details key={f.q} open={k === 0} className="group rounded-2xl border border-now-line bg-now-card px-5 text-now-text">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold">
              {t(f.q)}
              <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-5 text-now-muted">{t(f.a, facts)}</p>
          </details>
        ))}
      </div>
    </NowSection>
  );
}

export function CtaBand({ onStart }: { onStart: () => void }) {
  return (
    <section className="bg-[#E8130F] px-4 text-white sm:px-6" data-now-cta>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 py-10">
        <div>
          <h2 className="text-[clamp(30px,3.6vw,48px)] leading-none">Everything Around You. One Delivez Now.</h2>
          <p className="mt-2 text-[#FFE0E0]">Shop your neighbourhood for food, groceries, medicines, gifts and everyday essentials — delivered through Delivez.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onStart} className="inline-flex min-h-12 items-center rounded-xl bg-white px-[18px] font-black text-black">
            Start Shopping
          </button>
          <a href={PARTNERS_URL} className="inline-flex min-h-12 items-center rounded-xl bg-black px-[18px] font-black text-white">
            Become a Merchant
          </a>
        </div>
      </div>
    </section>
  );
}

const FAMILY: { k: Kind; name: string; body: string }[] = [
  { k: 'EAT', name: 'Delivez Now Food', body: 'Restaurants and cloud kitchens, delivered hot' },
  { k: 'GROCERY', name: 'Delivez Now Grocery', body: 'Daily essentials and fresh produce' },
  { k: 'PHARMACY', name: 'Delivez Now Pharmacy', body: 'Medicines and healthcare at your door' },
  { k: 'LOCAL_STORES', name: 'Delivez Now Local Shop', body: 'Every neighbourhood store, online' },
  { k: 'RUSH', name: 'Delivez Now Rush Store', body: 'Everyday essentials from the quickest shops near you' },
  { k: 'STREET', name: 'Delivez Now Street Cart', body: 'Street vendors and carts near you, delivered' },
];

export function FamilyBand() {
  const overview = useOverview().data;
  const none = (k: Kind) => k !== 'RUSH' && k !== 'STREET' && !!overview && !overview.verticals[k]?.shops;
  return (
    <NowSection id="now-family" tag="The Delivez Now family" title="Six ways to get it now." intro="Food, groceries, medicines, local shops, quick-commerce and street carts, all on one Delivez Now account.">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {FAMILY.map((f) => (
          <Link key={f.k} to={kindOf(f.k).to} className="group relative overflow-hidden rounded-[22px] border border-now-line bg-now-card text-now-text transition hover:-translate-y-1 hover:shadow-[0_18px_34px_-22px_rgba(0,0,0,.45)]" data-family={f.k}>
            <span className="flex h-[112px] items-center bg-gradient-to-br from-[#FFD400] to-[#F2B100] px-5">
              <NowLogo k={f.k} className="h-[68px] transition duration-300 group-hover:scale-[1.03]" />
            </span>
            <span className="block p-4">
              <b className="block text-[16px]">{f.name}</b>
              <small className="text-[13.5px] text-now-muted">{f.body}</small>
            </span>
            {none(f.k) && (
              <span className="absolute right-3 top-3">
                <Soon />
              </span>
            )}
          </Link>
        ))}
      </div>
    </NowSection>
  );
}
