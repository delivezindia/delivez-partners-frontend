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
import { KIND_LABEL } from '../../lib/labels';
import { cityList, useOverview } from '../../lib/queries';
import { KIND_LOOK } from '../VerticalIcon';
import { COMING_SOON, NowLogo, NowSection, Soon, fit, kindOf, pill, placed, useAround, type Kind } from './kit';
import type { Vertical } from '../../lib/types';

// ---------------------------------------------------------------- Merchants

const BENEFITS: MsgKey[] = ['lc.hm.m.b1', 'lc.hm.m.b2', 'lc.hm.m.b3', 'lc.hm.m.b4', 'lc.hm.m.b5', 'lc.hm.m.b6', 'lc.hm.m.b7', 'lc.hm.m.b8'];
const ONBOARDING: MsgKey[] = ['lc.hm.m.o1', 'lc.hm.m.o2', 'lc.hm.m.o3', 'lc.hm.m.o4', 'lc.hm.m.o5', 'lc.hm.m.o6', 'lc.hm.m.o7'];
const MERCHANT_TYPES: { icon: LucideIcon; label: MsgKey }[] = [
  { icon: UtensilsCrossed, label: 'lc.hm.t.restaurant' },
  { icon: ShoppingBasket, label: 'lc.hm.t.grocery' },
  { icon: Pill, label: 'lc.hm.t.pharmacy' },
  { icon: FlaskConical, label: 'lc.hm.t.lab' },
  { icon: Smartphone, label: 'lc.hm.t.electronics' },
  { icon: ShoppingBag, label: 'lc.hm.t.fashion' },
  { icon: Sparkles, label: 'lc.hm.t.beauty' },
  { icon: Store, label: 'lc.hm.t.otherShops' },
];
/** What a shop sees on its Delivez Partners dashboard (labels only: these are each shop's own numbers). */
const DASHBOARD: { icon: LucideIcon; label: MsgKey }[] = [
  { icon: Receipt, label: 'lc.hm.m.d1' },
  { icon: BadgeIndianRupee, label: 'lc.hm.m.d2' },
  { icon: Wallet, label: 'lc.hm.m.d3' },
  { icon: Timer, label: 'lc.hm.m.d4' },
  { icon: PackageCheck, label: 'lc.hm.m.d5' },
  { icon: Truck, label: 'lc.hm.app.fl2' },
  { icon: XCircle, label: 'lc.hm.m.d7' },
  { icon: Star, label: 'lc.hm.s.rating' },
  { icon: TriangleAlert, label: 'lc.hm.m.d9' },
];
const MODULES: MsgKey[] = ['lc.hm.app.orders', 'lc.hm.s.products', 'lc.hm.m.b5', 'lc.hm.m.b6', 'lc.hm.n.delivery', 'lc.hm.m.b7', 'lc.hm.m.analytics', 'lc.hm.m.settings'];

export function MerchantsBand() {
  const { t } = useI18n();
  return (
    <NowSection id="merchants" surface tag={t('lc.hm.m.tag')} title={t('lc.hm.m.title')} intro={t('lc.hm.m.intro')}>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-3.5">
          <div className="flex flex-wrap gap-1.5">
            {BENEFITS.map((b) => (
              <span key={b} className={pill(false)}>
                <Check className="h-4 w-4 text-[#17803A]" aria-hidden /> {t(b)}
              </span>
            ))}
          </div>
          <b className="text-now-text">{t('lc.hm.m.onb')}</b>
          <ol className="flex flex-wrap items-center gap-1.5">
            {ONBOARDING.map((s, i) => (
              <li key={s} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="h-4 w-4 text-now-muted" aria-hidden />}
                <span className="rounded-xl border-[1.5px] border-now-line bg-now-card px-3 py-2 text-[13px] font-extrabold text-now-text">
                  {i + 1}. {t(s)}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-1.5">
            {MERCHANT_TYPES.map((x) => (
              <span key={x.label} className={pill(false)}>
                <x.icon className="h-4 w-4 text-dz-red" aria-hidden /> {t(x.label)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={PARTNERS_URL} className="inline-flex items-center rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
              {t('lc.hm.m.become')}
            </a>
            <a href={`${PARTNERS_URL}/login`} className="inline-flex items-center rounded-xl bg-black px-[18px] py-3 text-sm font-black text-dz-yellow">
              {t('lc.hm.m.login')}
            </a>
          </div>
        </div>
        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-5 text-white">
          <p className="text-[11px] font-black uppercase tracking-[1px] text-dz-yellow">{t('lc.hm.m.dash')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DASHBOARD.map((d) => (
              <div key={d.label} className="flex items-center gap-2.5 rounded-xl bg-[#11151D] px-3 py-3">
                <d.icon className="h-5 w-5 shrink-0 text-dz-yellow" aria-hidden />
                <span className="text-[13px] font-bold">{t(d.label)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MODULES.map((m) => (
              <span key={m} className="rounded-full border border-white/15 bg-[#11151D] px-3 py-1.5 text-[13px] font-bold">
                {t(m)}
              </span>
            ))}
          </div>
          <p className="text-sm text-neutral-400">{t('lc.hm.m.note')}</p>
        </div>
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Delivery network

export function NetworkBand() {
  const { t } = useI18n();
  const a = useAround();
  const cities = cityList(useOverview().data);
  const open = a.stores.filter((s) => s.open && !s.bookable);
  const etas = open.map((s) => s.etaMinutes).sort((x, y) => x - y);
  const typical = etas.length ? etas[Math.floor(etas.length / 2)] : null;
  const nearest = a.stores[0];
  const chips: { icon: LucideIcon; label: MsgKey; soon?: boolean }[] = [
    { icon: Store, label: 'lc.hm.n.c1' },
    { icon: Route, label: 'lc.hm.n.c2' },
    { icon: Bike, label: 'lc.hm.n.c3' },
    { icon: MapPin, label: 'lc.hm.n.c4' },
    { icon: Zap, label: 'lc.hm.n.c5', soon: true },
    { icon: Warehouse, label: 'lc.hm.n.c6', soon: true },
  ];
  const cells: [string, string, boolean?][] = [
    [t('lc.hm.yourArea'), a.where ?? '—'],
    [t('lc.hm.n.nearest'), nearest ? `${nearest.distanceKm < 1 ? `${Math.round(nearest.distanceKm * 1000)} m` : `${nearest.distanceKm.toFixed(1)} km`}` : '—'],
    [t('lc.hm.n.deliverHere'), String(a.stores.length), a.stores.length > 0],
    [t('lc.hm.n.typical'), typical ? t('lc.store.mins', { n: typical }) : '—'],
    [t('lc.hm.n.shopping'), 'Delivez Now'],
    [t('lc.hm.n.delivery'), t('lc.hm.n.riders')],
  ];
  return (
    <NowSection id="network" tag={t('lc.hm.n.tag')} title={t('lc.hm.n.title')} intro={t('lc.hm.n.intro')}>
      <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-4 text-white sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-extrabold ${c.soon ? 'border border-white/15 bg-[#11151D] text-neutral-300' : 'bg-dz-yellow text-black'}`}>
              <c.icon className="h-4 w-4" aria-hidden /> {t(c.label)}
              {c.soon && <span className="text-[10.5px] font-black uppercase text-dz-yellow">{t('lc.hm.soonSmall')}</span>}
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
            {cities && <p className="col-span-2 text-sm text-neutral-400">{t('lc.hm.n.liveIn', { cities })}</p>}
          </div>
        </div>
      </div>
    </NowSection>
  );
}

/** Every shop around the point at its real distance and direction, coloured by kind. */
function ShopMap() {
  const { t } = useI18n();
  const a = useAround();
  const pts = a.stores.slice(0, 60);
  const max = Math.max(0.5, Math.ceil(Math.max(0, ...pts.map((s) => s.distanceKm)) * 2) / 2);
  const R = 150;
  const legend = (['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES'] as Kind[]).filter((k) => pts.some((s) => s.vertical === k));
  return (
    <svg viewBox="0 0 480 360" className="block h-auto w-full" role="img" aria-label={placed(t, a.where, 'lc.hm.n.map', 'lc.hm.n.mapYou', { n: pts.length })} data-shop-map>
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
      {/* No direction (an older API): leave the pin out rather than draw it at NaN. */}
      {pts.filter((s) => Number.isFinite(s.bearing)).map((s) => {
        const r = Math.max(12, (R * Math.min(s.distanceKm, max)) / max);
        const t = (s.bearing * Math.PI) / 180;
        return <circle key={s.id} cx={240 + r * Math.sin(t)} cy={180 - r * Math.cos(t)} r="5.5" fill={KIND_LOOK[s.vertical].accent} stroke="#080C14" strokeWidth="1.5" opacity={s.open ? 1 : 0.45} />;
      })}
      <rect x="208" y="168" width="64" height="24" rx="8" fill="#E8130F" />
      <text x="240" y="184" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" {...fit(t('lc.hm.n.you'), 6, 56)}>
        {t('lc.hm.n.you')}
      </text>
      {legend.map((k, i) => (
        <g key={k} transform={`translate(${14 + i * 92} 338)`}>
          <circle r="5" cx="5" cy="-4" fill={KIND_LOOK[k].accent} />
          <text x="14" y="0" fontSize="11" fill="#A5A5A0">
            {t(KIND_LABEL[k])}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- Smarter shopping

/** `to`: where a live feature can be tried. */
const SMART: { icon: LucideIcon; label: MsgKey; ex: MsgKey; to?: string; try?: MsgKey }[] = [
  { icon: Repeat, label: 'lc.hm.app.f4', ex: 'lc.hm.ai.e1', to: '/orders', try: 'lc.hm.ai.past' },
  { icon: Timer, label: 'lc.hm.ai.l2', ex: 'lc.hm.ai.e2', to: '/shops', try: 'lc.hm.ai.try' },
  { icon: Search, label: 'lc.hm.ai.l3', ex: 'lc.hm.ai.e3', to: '/shops', try: 'lc.hm.ai.try' },
  { icon: Store, label: 'lc.hm.ai.l4', ex: 'lc.hm.ai.e4' },
  { icon: ShoppingBasket, label: 'lc.hm.ai.l5', ex: 'lc.hm.ai.e5' },
  { icon: RefreshCw, label: 'lc.hm.ai.l6', ex: 'lc.hm.ai.e6' },
  { icon: ShoppingBag, label: 'lc.hm.ai.l7', ex: 'lc.hm.ai.e7' },
  { icon: TrendingUp, label: 'lc.hm.ai.l8', ex: 'lc.hm.ai.e8' },
  { icon: Sparkles, label: 'lc.hm.ai.l9', ex: 'lc.hm.ai.e9' },
  { icon: BarChart3, label: 'lc.hm.ai.l10', ex: 'lc.hm.ai.e10' },
];

export function SmartBand() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const x = SMART[i];
  return (
    <NowSection id="ai" surface tag={t('lc.hm.ai.tag')} title={t('lc.hm.ai.title')} intro={t('lc.hm.ai.intro')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label={t('lc.hm.ph.features')}>
        {SMART.map((s, k) => (
          <button key={s.label} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`grid content-start gap-2 rounded-2xl border p-3.5 text-left text-[13px] font-extrabold transition ${k === i ? 'border-[#1E5BD6] bg-[#1E5BD6] text-white' : 'border-now-line bg-now-card text-now-text hover:border-now-text'}`}>
            <span className="flex items-center justify-between">
              <s.icon className="h-5 w-5" aria-hidden />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${s.to ? 'bg-[#17803A] text-white' : k === i ? 'bg-white/20' : 'bg-now-surface text-now-muted'}`}>{t(s.to ? 'lc.hm.ai.live' : 'lc.hm.ai.soon')}</span>
            </span>
            {t(s.label)}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2.5 rounded-[18px] p-5 text-white" style={{ background: 'linear-gradient(135deg,#1E5BD6,#0E2E6E)' }} aria-live="polite">
        <small className="font-black uppercase tracking-[1px] opacity-85">{t(x.to ? 'lc.hm.ai.liveNow' : 'lc.hm.ai.example', { name: t(x.label) })}</small>
        <b className="flex items-start gap-2 font-display text-[clamp(22px,2.4vw,28px)] leading-tight">
          <x.icon className="mt-1 h-6 w-6 shrink-0" aria-hidden /> {t(x.ex)}
        </b>
        {x.to && (
          <Link to={x.to} className="inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            {t(x.try!)} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Which Delivez

const ECO: { k: string; icon: LucideIcon; need: MsgKey; name: string; body: MsgKey; bg: string; href?: string; cta: MsgKey }[] = [
  { k: 'now', icon: ShoppingBag, need: 'lc.hm.eco.now.need', name: 'Delivez Now', body: 'lc.hm.eco.now.body', bg: '#E8130F', cta: 'lc.hm.startShopping' },
  { k: 'go', icon: Zap, need: 'lc.hm.eco.go.need', name: 'Delivez Go', body: 'lc.hm.eco.go.body', bg: '#C98A00', href: 'https://claude.ai/artifact/CTrSZF548JkrBt8x2zdEtF', cta: 'lc.hm.eco.go.cta' },
  { k: 'one', icon: Send, need: 'lc.hm.eco.one.need', name: 'Delivez One', body: 'lc.hm.eco.one.body', bg: '#1E5BD6', href: 'https://claude.ai/artifact/6K71f4sGe8wMdQim59bs6Z', cta: 'lc.hm.eco.one.cta' },
  { k: 'move', icon: Truck, need: 'lc.hm.eco.move.need', name: 'Delivez Move', body: 'lc.hm.eco.move.body', bg: '#7A0209', href: 'https://claude.ai/artifact/QmLvpSayuHtzGtvkkWPjbK', cta: 'lc.hm.eco.move.cta' },
  { k: 'pro', icon: Building2, need: 'lc.hm.eco.pro.need', name: 'Delivez Pro', body: 'lc.hm.eco.pro.body', bg: '#111', href: 'https://claude.ai/artifact/7rN8zqzFYXrk9ZQihG6Em4', cta: 'lc.hm.eco.pro.cta' },
];

export function EcosystemBand({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const [k, setK] = useState('now');
  const e = ECO.find((x) => x.k === k)!;
  return (
    <NowSection id="ecosystem" tag={t('lc.hm.eco.tag')} title={t('lc.hm.eco.title')} intro={t('lc.hm.eco.intro')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label={t('lc.hm.eco.aria')}>
        {ECO.map((x) => (
          <button key={x.k} type="button" role="tab" aria-selected={x.k === k} onClick={() => setK(x.k)} className={`grid content-start gap-2.5 rounded-2xl border p-4 text-left text-[13.5px] font-extrabold transition ${x.k === k ? 'border-dz-yellow bg-[#FFF4C2] text-black' : 'border-now-line bg-now-card text-now-text hover:border-now-text'}`}>
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: x.bg }} aria-hidden>
              <x.icon className="h-5 w-5" />
            </span>
            {t(x.need)}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 rounded-[18px] p-5 text-white" style={{ background: e.bg }} aria-live="polite">
        <small className="font-black uppercase tracking-[1px] opacity-85">{t('lc.hm.eco.use')}</small>
        <b className="font-display text-[28px] leading-none">{e.name}</b>
        <span>{t(e.body)}</span>
        {e.href ? (
          <a href={e.href} target="_blank" rel="noopener" className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            {t(e.cta)} <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        ) : (
          <button type="button" onClick={onStart} className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            {t(e.cta)} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Why

const WHY: { icon: LucideIcon; n: number }[] = [
  { icon: Store, n: 1 },
  { icon: Zap, n: 2 },
  { icon: ShieldCheck, n: 3 },
  { icon: MapPin, n: 4 },
  { icon: Handshake, n: 5 },
  { icon: Globe, n: 6 },
];

export function WhyBand() {
  const { t } = useI18n();
  return (
    <NowSection id="why" surface tag={t('lc.hm.why.tag')} title={t('lc.hm.why.title')}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map((w) => (
          <div key={w.n} className="grid gap-2 rounded-[22px] bg-black p-5 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
              <w.icon className="h-6 w-6 text-dz-yellow" aria-hidden />
            </span>
            <b className="font-display text-[22px] text-dz-yellow">{t(`lc.hm.why.l${w.n}` as MsgKey)}</b>
            <p className="text-sm text-neutral-300">{t(`lc.hm.why.b${w.n}` as MsgKey)}</p>
          </div>
        ))}
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Support

/** Help topics: `lc.hm.help.t<n>` and its answer `lc.hm.help.a<n>`. */
const HELP = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const HELP_LINKS: { icon: LucideIcon; label: MsgKey; to?: string; soon?: boolean }[] = [
  { icon: MessageCircle, label: 'lc.hm.help.l1', soon: true },
  { icon: LifeBuoy, label: 'lc.hm.help.l2', to: '/help' },
  { icon: Ticket, label: 'lc.hm.help.l3', to: '/help/new' },
  { icon: Receipt, label: 'lc.hm.help.l4', to: '/orders' },
  { icon: FileText, label: 'lc.hm.help.l5', to: '/refund-policy' },
  { icon: Phone, label: 'lc.hm.help.l6', soon: true },
];

export function SupportBand() {
  const { t } = useI18n();
  const [i, setI] = useState(2);
  const topic = (n: number) => t(`lc.hm.help.t${n}` as MsgKey);
  return (
    <NowSection id="support" tag={t('lc.hm.help.tag')} title={t('lc.hm.help.title')}>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div>
          <b className="text-now-text">{t('lc.hm.help.ask')}</b>
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t('lc.hm.help.topics')}>
            {HELP.map((h, k) => (
              <button key={h} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={pill(k === i)}>
                {topic(h)}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {HELP_LINKS.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} className={pill(false)}>
                  <l.icon className="h-4 w-4 text-dz-red" aria-hidden /> {t(l.label)}
                </Link>
              ) : (
                <span key={l.label} className={`${pill(false)} opacity-70`}>
                  <l.icon className="h-4 w-4" aria-hidden /> {t(l.label)} <span className="text-[10.5px] font-black uppercase text-now-muted">{t('lc.hm.soonSmall')}</span>
                </span>
              ),
            )}
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-5 text-white" aria-live="polite">
          <b className="text-xs font-black uppercase tracking-[1px] text-dz-yellow">{topic(HELP[i])}</b>
          <p className="text-[15px] leading-relaxed text-neutral-300">{t(`lc.hm.help.a${HELP[i]}` as MsgKey)}</p>
          <Link to="/help/new" className="inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-4 py-2.5 text-sm font-black text-black">
            <ClipboardList className="h-4 w-4" aria-hidden /> {t('lc.hm.help.cta')}
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
  const { t } = useI18n();
  return (
    <section className="bg-[#E8130F] px-4 text-white sm:px-6" data-now-cta>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 py-10">
        <div>
          <h2 className="text-[clamp(30px,3.6vw,48px)] leading-none">{t('lc.hm.cta.title')}</h2>
          <p className="mt-2 text-[#FFE0E0]">{t('lc.hm.cta.body')}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onStart} className="inline-flex min-h-12 items-center rounded-xl bg-white px-[18px] font-black text-black">
            {t('lc.hm.startShopping')}
          </button>
          <a href={PARTNERS_URL} className="inline-flex min-h-12 items-center rounded-xl bg-black px-[18px] font-black text-white">
            {t('lc.hm.m.become')}
          </a>
        </div>
      </div>
    </section>
  );
}

/** Names are the product names (brand), so they stay as they are in every language. */
const FAMILY: { k: Kind; name: string }[] = [
  { k: 'EAT', name: 'Delivez Now Food' },
  { k: 'GROCERY', name: 'Delivez Now Grocery' },
  { k: 'PHARMACY', name: 'Delivez Now Pharmacy' },
  { k: 'LOCAL_STORES', name: 'Delivez Now Local Shop' },
  { k: 'STREET', name: 'Delivez Now Street Cart' },
  { k: 'RUSH', name: 'Delivez Now Rush Store' },
];

export function FamilyBand() {
  const { t } = useI18n();
  const overview = useOverview().data;
  const none = (k: Kind) => COMING_SOON.includes(k) || (k !== 'STREET' && !!overview && !overview.verticals[k as Vertical]?.shops);
  return (
    <NowSection id="now-family" tag={t('lc.hm.fam.tag')} title={t('lc.hm.fam.title')} intro={t('lc.hm.fam.intro')}>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {FAMILY.map((f) => (
          <Link key={f.k} to={kindOf(f.k).to} className="group relative overflow-hidden rounded-[22px] border border-now-line bg-now-card text-now-text transition hover:-translate-y-1 hover:shadow-[0_18px_34px_-22px_rgba(0,0,0,.45)]" data-family={f.k}>
            <span className="flex h-[112px] items-center bg-gradient-to-br from-[#FFD400] to-[#F2B100] px-5">
              <NowLogo k={f.k} className="h-[68px] transition duration-300 group-hover:scale-[1.03]" />
            </span>
            <span className="block p-4">
              <b className="block text-[16px]">{f.name}</b>
              <small className="text-[13.5px] text-now-muted">{t(`lc.hm.fam.${f.k}` as MsgKey)}</small>
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
