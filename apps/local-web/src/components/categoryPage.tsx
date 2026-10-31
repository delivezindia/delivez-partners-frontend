import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { Modal } from './Modal';
import { ProductSheet } from './ProductSheet';
import { offerTitle } from './CouponBox';
import { Button } from './ui';
import { PARTNERS_URL } from '../lib/config';
import { needsOptions, simpleLine, sizedLine, useCart, type CartLine } from '../lib/cart';
import { km, rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import { KIND_LABEL, VERTICAL_LABEL, type ShopPage } from '../lib/labels';
import type { PublicOffer } from '../lib/queries';
import type { Menu, Product, Vertical } from '../lib/types';

/*
 * Building blocks of the Food, Grocery, Rush and Street Cart pages (the Delivez Now design).
 * Honest by rule, like the home page: numbers, shops, dishes and offers come from the API; nothing is made up.
 */

/** 0, 1, 2… every `ms` — stays on the first one for people who prefer less motion. */
export function useCycle(n: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [n, ms]);
  return n ? i % n : 0;
}

const MARK = '\u0001';
/** Draw one placeholder of a translated sentence yourself (highlighted, animated…), whatever the word order. */
export function slot(t: ReturnType<typeof useI18n>['t'], key: MsgKey, name: string, node: ReactNode, vars: Record<string, string | number> = {}) {
  const [before, after = ''] = t(key, { ...vars, [name]: MARK }).split(MARK);
  return { before, after, node };
}

export function Band({ id, paper = false, className = '', children }: { id?: string; paper?: boolean; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-12 sm:px-6 sm:py-[72px] ${paper ? 'bg-[#F7F7F5]' : 'bg-white'} ${className}`}>
      <div className="mx-auto max-w-[1320px]">{children}</div>
    </section>
  );
}

export function SectionHead({ title, intro, className = 'mb-6' }: { title: string; intro?: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6 ${className}`}>
      <h2 className="vp-tight text-[clamp(34px,4vw,54px)]">{title}</h2>
      {intro && <p className="max-w-[440px] text-base text-ink-2">{intro}</p>}
    </div>
  );
}

/** Round toggle in a filter row (black when on). */
export function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13.5px] font-bold transition ${on ? 'border-black bg-black text-white' : 'border-line bg-white hover:border-neutral-400'}`}>
      {children}
    </button>
  );
}

export function SortSelect<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  const { t } = useI18n();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={t('lc.vp.sort')} className="ml-auto rounded-full border-[1.5px] border-line bg-white px-3.5 py-2 text-[13.5px] font-bold">
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** All shops / Food */
export function Crumbs({ here }: { here: string }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('lc.vp.crumbs')} className="flex flex-wrap items-center gap-2 text-[13.5px] text-white">
      <Link to="/shops" className="hover:text-dz-yellow hover:underline">
        {t('lc.vp.allShops')}
      </Link>
      <span aria-hidden>/</span>
      <b className="font-semibold" aria-current="page">
        {here}
      </b>
    </nav>
  );
}

/** Black "DELIVEZ FOOD" pill. */
export function KindBadge({ v, color }: { v: Vertical | ShopPage; color: string }) {
  const { t } = useI18n();
  return (
    <span className="mb-3.5 mt-2.5 inline-flex items-center gap-2 rounded-full bg-black px-3.5 py-1.5 font-display text-xl uppercase italic text-white">
      DELIVEZ <span style={{ color }}>{t(KIND_LABEL[v])}</span>
    </span>
  );
}

const TICKER: MsgKey[] = ['lc.site.c2', 'lc.site.c3', 'lc.site.f4', 'lc.land.s3'];
const ZEROS: [MsgKey, MsgKey][] = [
  ['lc.vp.z.platform', 'lc.vp.z.platformB'],
  ['lc.vp.z.pack', 'lc.vp.z.packB'],
  ['lc.vp.z.comm', 'lc.vp.z.commB'],
  ['lc.vp.z.list', 'lc.vp.z.listB'],
];

/**
 * Black "₹0" panel. Only fees that really are zero: no platform or packaging fee on any bill, 0% commission in the
 * shops' launch offer, free registration. Delivery isn't free — the flat fee is spelled out below the tiles.
 */
export function ZeroPanel({ fee, doorCheck = false }: { fee: number; doorCheck?: boolean }) {
  const { t } = useI18n();
  const lines = doorCheck ? [...TICKER, 'lc.site.f3' as MsgKey] : TICKER;
  const i = useCycle(lines.length, 2600);
  // The ₹0s pop in again every 13 s.
  const round = useCycle(1000, 13_000);
  const plus = slot(t, 'lc.vp.plus', 'fee', <b className="text-dz-yellow">{rupees(fee)}</b>);
  return (
    <div className="vp-zero relative mb-[18px] mt-1.5 max-w-[620px] overflow-hidden rounded-[20px] bg-[#111] px-4 pb-3 pt-3.5 text-white shadow-[0_24px_50px_rgba(0,0,0,0.3)]" aria-label={t('lc.site.c2')} data-zero-panel>
      <div className="relative mb-2.5 flex flex-col items-start gap-1 text-xs font-extrabold tracking-[1.2px] sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
        <span className="inline-flex items-center gap-[7px] uppercase text-dz-yellow">
          <i className="vp-ping h-2 w-2 rounded-full bg-[#E8130F]" aria-hidden />
          {t('lc.vp.zeroHead')}
        </span>
        <span className="min-h-[1em] font-bold tracking-[0.4px] text-[#CFCFCB] sm:text-right" aria-live="polite">
          <span key={i} className="vp-up inline-block">
            {t(lines[i])}
          </span>
        </span>
      </div>
      <ul key={round} className="relative grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
        {ZEROS.map(([label, note], k) => (
          <li key={label} className="flex flex-col gap-0.5 rounded-[14px] border border-white/10 bg-white/[0.06] px-2.5 pb-[9px] pt-2.5 transition hover:-translate-y-[3px] hover:border-dz-yellow hover:bg-dz-yellow/10">
            <b className="vp-pop flex items-baseline gap-1 font-display text-[30px] italic leading-[0.9] text-dz-yellow sm:text-4xl" style={{ animationDelay: `${k * 0.15}s` }}>
              <span className="text-lg not-italic text-white/80">₹</span>0
            </b>
            <span className="text-[13.5px] font-extrabold leading-tight">{t(label)}</span>
            <small className="hidden text-[11px] leading-snug text-[#B9B9B4] sm:block">{t(note)}</small>
          </li>
        ))}
      </ul>
      <div className="relative mt-2.5 flex items-start gap-2.5 border-t border-dashed border-white/20 pt-2.5">
        <span className="shrink-0 rounded-full bg-[#E8130F] px-[9px] py-1 font-display text-xs italic tracking-[1px]">{t('lc.vp.plusTag')}</span>
        <p className="text-[13.5px] leading-[1.4] text-[#EDEDEA]">
          {plus.before}
          {plus.node}
          {plus.after}
        </p>
      </div>
    </div>
  );
}

/** Search box with a drop-down of hits under it (closes on Escape or a tap outside). */
export function HeroSearch({ value, onChange, placeholder, children }: { value: string; onChange: (v: string) => void; placeholder: string; children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  return (
    <div ref={ref} className="relative max-w-[560px]" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <Search className="pointer-events-none absolute left-[18px] top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-black" strokeWidth={2.4} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="w-full rounded-2xl bg-white py-4 pl-[52px] pr-12 text-[17px] text-black outline-none ring-2 ring-transparent transition focus:ring-dz-yellow [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-neutral-100 text-ink-2 hover:bg-neutral-200" aria-label={t('lc.dash.clear')}>
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      {open && value.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-[340px] overflow-auto rounded-2xl bg-white p-1.5 text-black shadow-[0_24px_50px_rgba(0,0,0,0.3)]" data-search-hits>
          {children}
        </div>
      )}
    </div>
  );
}

/** One line in the search drop-down: a link (open the shop) or a button (add it). */
export function HitRow({ emoji, tint, title, sub, action, to, onClick }: { emoji: ReactNode; tint: string; title: string; sub: string; action: string; to?: string; onClick?: () => void }) {
  const cls = 'grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-[14.5px] text-black hover:bg-[#F7F7F5] focus-visible:bg-[#F7F7F5]';
  const body = (
    <>
      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-[10px] text-[22px]" style={{ background: tint }} aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{title}</span>
        <small className="block truncate text-[#5E5E5A]">{sub}</small>
      </span>
      <b className="text-[13px]">{action}</b>
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export function NoHits() {
  const { t } = useI18n();
  return (
    <p className="m-0 p-3.5 text-[#5E5E5A]">
      <b className="block text-black">{t('lc.home.noMatch')}</b>
      {t('lc.home.noMatchBody')}
    </p>
  );
}

const PILLS: { key: MsgKey; icon: string; bg: string; fg: string }[] = [
  { key: 'lc.step.placed', icon: '🔔', bg: '#111111', fg: '#FFD400' },
  { key: 'lc.step.preparing', icon: '📦', bg: '#17803A', fg: '#ffffff' },
  { key: 'lc.step.onTheWay', icon: '🛵', bg: '#E8130F', fg: '#ffffff' },
  { key: 'lc.step.delivered', icon: '✓', bg: '#FFD400', fg: '#111111' },
];

/** "How it works": a little shop that keeps getting orders, next to the steps every order goes through. */
export function HowBand({ art, awning, steps }: { art: string; awning: string; steps: MsgKey[] }) {
  const { t } = useI18n();
  const on = useCycle(steps.length, 2400);
  const bg = `vp-bg${useId().replace(/:/g, '')}`;
  return (
    <section className="bg-gradient-to-b from-white to-[#F6F6F4] px-4 py-14 sm:px-6" data-how-band>
      <div className="mx-auto grid max-w-[1280px] items-center gap-[22px] min-[56.3125rem]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] min-[56.3125rem]:gap-9">
        <figure className="relative m-0 overflow-hidden rounded-[28px] border border-black/5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.5)]" style={{ containerType: 'inline-size' }}>
          <svg viewBox="0 0 640 360" className="block h-auto w-full" aria-hidden>
            <defs>
              <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFFDF4" />
                <stop offset="1" stopColor="#FFF1C2" />
              </linearGradient>
            </defs>
            <rect width="640" height="360" rx="28" fill={`url(#${bg})`} />
            <rect x="40" y="130" width="220" height="170" rx="10" fill="#fff" stroke="#111" strokeWidth="3" />
            <path d="M30 130h240l-20-46H50z" fill={awning} />
            <path d="M30 130h240" stroke="#FFD400" strokeWidth="10" strokeDasharray="24 24" />
            <rect x="120" y="210" width="60" height="90" fill="#FFD400" />
            <text x="150" y="190" textAnchor="middle" fontSize="40">
              {art}
            </text>
          </svg>
          {PILLS.map((p, k) => (
            <span
              key={p.key}
              className="vp-pill absolute left-1/2 whitespace-nowrap rounded-full px-[1.1em] py-[0.45em] font-extrabold leading-none"
              style={{ top: `${19.4 + k * 16.7}%`, background: p.bg, color: p.fg, fontSize: 'max(10px, 2.05cqw)', animationDelay: `${k * 0.9}s` }}
              aria-hidden
            >
              {p.icon} {t(p.key)}
            </span>
          ))}
        </figure>
        <div>
          <span className="inline-flex items-center gap-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-[#E8130F]">
            <span className="h-1 w-6 rounded-sm bg-dz-yellow" aria-hidden />
            {t('lc.site.trackEyebrow')}
          </span>
          <h2 className="mb-[18px] mt-2.5 vp-tight text-[clamp(28px,3.2vw,42px)]">{t('lc.land.howTitle')}</h2>
          <ol className="grid gap-2.5">
            {steps.map((s, k) => (
              <li key={s} className={`flex items-center gap-3.5 rounded-2xl border-[1.5px] bg-white px-4 py-3.5 text-[15.5px] font-bold transition duration-300 ${k === on ? 'translate-x-1.5 border-[#E8130F] shadow-[0_16px_30px_-24px_rgba(232,19,15,0.7)]' : 'border-line'}`}>
                <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] font-black transition ${k === on ? 'bg-[#E8130F] text-white' : 'bg-[#FFF3B0] text-[#111]'}`}>{k + 1}</span>
                {t(s)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Offers that belong on this page: for these kinds of shop or any shop, or at one of the shops listed here. */
export function relevantOffers(all: PublicOffer[], v: Vertical | Vertical[], shopNames: string[]) {
  const here = new Set(shopNames);
  const kinds = Array.isArray(v) ? v : [v];
  return all.filter((o) => (o.shop ? here.has(o.shop) : !o.vertical || kinds.includes(o.vertical)));
}

const TICKET_BG = ['#FFD400', '#FDE2E4', '#FFE8D6', '#E3F4E8'];

/** Live coupons as tear-off tickets; the code copies with one tap. */
export function OfferTickets({ offers }: { offers: PublicOffer[] }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  if (!offers.length) return <p className="rounded-[18px] border-[1.5px] border-dashed border-neutral-300 bg-white p-6 text-center text-ink-2">{t('lc.vp.noOffers')}</p>;
  return (
    <div className="dz-scroll-x -mx-4 grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-[minmax(300px,1fr)] sm:px-0">
      {offers.map((o, i) => {
        const ends = new Date(o.endsAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
        const terms = [o.shop && o.city ? `${o.shop}, ${o.city}` : (o.shop ?? o.city), o.minOrder > 0 && t('lc.cp.min', { amount: rupees(o.minOrder) }), o.firstOrderOnly && t('lc.cp.first'), t('lc.vp.ends', { date: ends })].filter(Boolean).join(' · ');
        return (
          <div key={o.code} className="grid min-h-[150px] grid-cols-[1fr_112px] overflow-hidden rounded-[18px] border-[1.5px] border-black bg-white" data-offer={o.code}>
            <div className="grid content-start gap-1.5 px-[18px] py-4">
              <b className="vp-tight font-display text-[34px]">{offerTitle(t, o)}</b>
              {o.description && <span className="text-sm text-[#3A3A3A]">{o.description}</span>}
              <small className="text-xs text-ink-3">{terms}</small>
            </div>
            <div className="grid place-items-center content-center gap-2 border-l-2 border-dashed border-black p-2.5 text-center" style={{ background: TICKET_BG[i % TICKET_BG.length] }}>
              <code className="font-display text-[17px] tracking-[0.5px] [transform:rotate(180deg)] [writing-mode:vertical-rl]">{o.code}</code>
              <button
                type="button"
                className="rounded-[10px] bg-black px-2.5 py-[7px] text-[12.5px] font-extrabold text-white"
                onClick={() => void navigator.clipboard?.writeText(o.code).then(() => setCopied(o.code), () => undefined)}
              >
                {copied === o.code ? t('lc.vp.copied') : t('lc.vp.copy')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** For shop owners: the big black tile, then the partner site, pricing, login and the other page. */
export function PartnerTiles({ emoji, title, body, other, otherEmoji }: { emoji: string; title: string; body: string; other: Vertical; otherEmoji: string }) {
  const { t } = useI18n();
  const small: { href: string; e: string; b: string; u: string; bg: string; inApp?: boolean }[] = [
    { href: `${PARTNERS_URL}/how-it-works`, e: '📈', b: t('lc.vp.p.how'), u: t('lc.vp.p.howCta'), bg: '#FDE2E4' },
    { href: `${PARTNERS_URL}/pricing`, e: '🏷️', b: t('lc.site.partnerPricing'), u: t('lc.vp.p.priceCta'), bg: '#FFF4C2' },
    { href: `${PARTNERS_URL}/login`, e: '🔑', b: t('lc.site.partnerLogin'), u: t('lc.vp.p.loginCta'), bg: '#E3F4E8' },
    { href: `/shops?v=${other}`, e: otherEmoji, b: t(VERTICAL_LABEL[other]), u: t('lc.site.browse'), bg: '#E5EDFF', inApp: true },
  ];
  const tile = 'grid min-h-[180px] content-between gap-2.5 rounded-3xl p-6 text-black transition hover:-translate-y-1';
  return (
    <div className="grid gap-3.5 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2" data-partner-tiles>
      <a href={PARTNERS_URL} className="grid min-h-[300px] content-between gap-2.5 rounded-3xl bg-black p-6 text-white md:row-span-2 md:min-h-[374px]">
        <span className="text-[44px]" aria-hidden>
          {emoji}
        </span>
        <b className="vp-tight font-display text-[clamp(40px,4.4vw,64px)] text-dz-yellow">{title}</b>
        <span className="max-w-[440px] text-base text-[#CFCFCB]">{body}</span>
        <u className="justify-self-start border-b-2 border-current font-extrabold no-underline">{t('lc.land.shopCta')}</u>
      </a>
      {small.map((s) => {
        const inner = (
          <>
            <span className="text-[44px]" aria-hidden>
              {s.e}
            </span>
            <b className="vp-tight font-display text-3xl">{s.b}</b>
            <u className="justify-self-start border-b-2 border-current font-extrabold no-underline">{s.u}</u>
          </>
        );
        return s.inApp ? (
          <Link key={s.href} to={s.href} className={tile} style={{ background: s.bg }}>
            {inner}
          </Link>
        ) : (
          <a key={s.href} href={s.href} className={tile} style={{ background: s.bg }}>
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export function FaqDetails({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="max-w-[900px]" data-faq>
      {items.map((f) => (
        <details key={f.q} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[22px] [&::-webkit-details-marker]:hidden">
            {f.q}
            <Plus className="h-5 w-5 shrink-0 transition group-open:rotate-45 group-open:text-[#E8130F]" aria-hidden />
          </summary>
          <p className="mb-5 max-w-[70ch] text-base text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Card colour per page: black on Food, green on Grocery, purple on Rush, orange on Street Cart. */
export type Tone = 'black' | 'green' | 'purple' | 'orange';
const STEPPER_BG: Record<Tone, string> = { black: 'bg-black', green: 'bg-[#17803A]', purple: 'bg-[#7B2FD4]', orange: 'bg-[#C2470B]' };
const ADD_CLS: Record<Tone, string> = {
  black: 'border-2 border-black bg-white text-black hover:bg-black hover:text-white',
  green: 'border-[1.5px] border-[#17803A] bg-[#E3F4E8] text-[#17803A] hover:bg-[#17803A] hover:text-white',
  purple: 'border-[1.5px] border-[#7B2FD4] bg-[#F1E6FF] text-[#7B2FD4] hover:bg-[#7B2FD4] hover:text-white',
  orange: 'border-[1.5px] border-[#C2470B] bg-[#FFE8D6] text-[#C2470B] hover:bg-[#C2470B] hover:text-white',
};

/** − 2 + on a card. */
export function CardStepper({ qty, max, onChange, label, tone }: { qty: number; max: number; onChange: (n: number) => void; label: string; tone: Tone }) {
  return (
    <span className={`inline-flex shrink-0 items-center overflow-hidden rounded-xl text-white ${STEPPER_BG[tone]}`} role="group" aria-label={label}>
      <button type="button" className="h-[34px] w-8 text-[17px] font-black hover:bg-white/15" onClick={() => onChange(qty - 1)} aria-label={`− ${label}`}>
        −
      </button>
      <b className="min-w-5 text-center text-sm tabular-nums" aria-live="polite">
        {qty}
      </b>
      <button type="button" className="h-[34px] w-8 text-[17px] font-black hover:bg-white/15 disabled:opacity-40" disabled={qty >= max} onClick={() => onChange(qty + 1)} aria-label={`+ ${label}`}>
        +
      </button>
    </span>
  );
}

export function AddButton({ label, onClick, tone }: { label: string; onClick: () => void; tone: Tone }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`shrink-0 rounded-xl px-4 py-[7px] text-sm font-black transition ${ADD_CLS[tone]}`}>
      {t('lc.add')}
    </button>
  );
}

type Line = Omit<CartLine, 'key' | 'qty'>;
type Shop = Menu['store'];

/**
 * The one-shop cart, from pages that show dishes or items of several shops: the options sheet when there's a choice,
 * "start a new cart?" when the cart holds another shop, and − / + on the cards. Render `ui` once on the page.
 */
export function useBasket() {
  const { t } = useI18n();
  const cart = useCart();
  const [options, setOptions] = useState<{ shop: Shop; product: Product } | null>(null);
  const [switching, setSwitching] = useState<{ shop: Shop; lines: { line: Line; qty: number }[] } | null>(null);

  function put(shop: Shop, lines: { line: Line; qty: number }[]) {
    if (!lines.length) return;
    if (cart.storeId && cart.storeId !== shop.id && cart.lines.length) return setSwitching({ shop, lines });
    lines.forEach((l) => cart.add(shop, l.line, l.qty));
  }
  /** ADD: straight in, or the sheet first when there's a choice to make (a size picked on the card counts as made). */
  function add(shop: Shop, p: Product, variantId?: string | null) {
    const addons = p.addonGroups.some((g) => g.addons.length > 0);
    if (variantId !== undefined && !addons) return put(shop, [{ line: sizedLine(p, variantId), qty: 1 }]);
    if (needsOptions(p)) return setOptions({ shop, product: p });
    put(shop, [{ line: simpleLine(p), qty: 1 }]);
  }
  // A size picked on the card means that size without add-ons; otherwise every line of the product counts.
  const own = (shopId: string, productId: string, variantId?: string | null) =>
    cart.storeId === shopId ? cart.lines.filter((l) => l.productId === productId && (variantId === undefined || (l.variantId === variantId && !l.addonIds.length))) : [];
  const qtyOf = (shopId: string, productId: string, variantId?: string | null) => own(shopId, productId, variantId).reduce((n, l) => n + l.qty, 0);
  /** − / +: changes the one matching line, or opens the sheet when the product is in the cart with different options. */
  function step(shop: Shop, p: Product, qty: number, variantId?: string | null) {
    const lines = own(shop.id, p.id, variantId);
    if (lines.length === 1) cart.setQty(lines[0].key, qty);
    else setOptions({ shop, product: p });
  }

  const ui = (
    <>
      {options && (
        <ProductSheet
          product={options.product}
          onClose={() => setOptions(null)}
          onAdd={(line, qty) => {
            put(options.shop, [{ line, qty }]);
            setOptions(null);
          }}
        />
      )}
      {switching && (
        <Modal title={t('lc.cart.switchTitle')} onClose={() => setSwitching(null)}>
          <p className="text-ink-2">{t('lc.cart.switchBody', { old: cart.storeName ?? '', store: switching.shop.name })}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setSwitching(null)}>
              {t('lc.cancel')}
            </Button>
            <Button
              onClick={() => {
                cart.clear();
                switching.lines.forEach((l) => cart.add(switching.shop, l.line, l.qty));
                setSwitching(null);
              }}
            >
              {t('lc.cart.startNew')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
  return { add, put, step, qtyOf, ui };
}

export type Basket = ReturnType<typeof useBasket>;

/** A big emoji tile that filters the page (Rush categories, Street Cart cart types). */
export function CatTile({ label, emoji, tint, on, onClick, accent, dark = false, count }: { label: string; emoji: string; tint: string; on: boolean; onClick: () => void; accent: string; dark?: boolean; count?: number }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="group grid w-[92px] shrink-0 justify-items-center gap-2 text-center text-[12.5px] font-extrabold leading-tight sm:w-auto">
      <span className={`grid aspect-square w-full place-items-center rounded-[20px] text-[38px] transition group-hover:-translate-y-1 ${dark ? 'text-dz-yellow' : ''}`} style={{ background: tint, boxShadow: on ? `0 0 0 3px ${accent}` : undefined }} aria-hidden>
        {emoji}
      </span>
      <span className="line-clamp-2">{label}</span>
      {count !== undefined && <small className="-mt-1.5 text-[11.5px] font-bold text-ink-3">{count}</small>}
    </button>
  );
}

export interface AroundPoint {
  id: string;
  name: string;
  emoji: ReactNode;
  km: number;
  /** Degrees from north, as the API gives it. */
  bearing: number;
  open: boolean;
}

/** Map units: 640 × 400, the centre in the middle, the outer ring this far out. */
const RING = 165;
/** Pins closer than this are moved apart; on a phone-wide map it is about one pin across. */
const GAP = 46;

/**
 * What's around an address: streets behind, rings at even distances, and each shop at its real distance and direction
 * from the centre. Pins that would sit on top of each other are turned a little round the centre so each can be tapped.
 */
export function AroundMap({ points, picked, onPick, centre, accent, label }: { points: AroundPoint[]; picked: string | null; onPick: (id: string) => void; centre: string; accent: string; label: string }) {
  const max = Math.max(0.5, Math.ceil(Math.max(0, ...points.map((p) => p.km)) * 2) / 2);
  const placed: { p: AroundPoint; x: number; y: number }[] = [];
  for (const p of points) {
    const r = Math.max(26, (RING * Math.min(p.km, max)) / max);
    let deg = p.bearing;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 24; tries++, deg += 15) {
      x = 320 + r * Math.sin((deg * Math.PI) / 180);
      y = 200 - r * Math.cos((deg * Math.PI) / 180);
      if (!placed.some((o) => Math.hypot(o.x - x, o.y - y) < GAP)) break;
    }
    placed.push({ p, x, y });
  }
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-[#F2F3EE]" role="group" aria-label={label} data-around-map>
      <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`h${i}`} d={`M0 ${30 + i * 50} C 200 ${10 + i * 50},420 ${60 + i * 50},640 ${25 + i * 50}`} stroke="#fff" strokeWidth={i % 3 ? 5 : 10} fill="none" />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`v${i}`} d={`M${40 + i * 82} 0 L ${70 + i * 82} 400`} stroke="#fff" strokeWidth={i % 2 ? 5 : 9} />
        ))}
        <circle cx="320" cy="200" r={RING} fill={accent} fillOpacity="0.07" stroke={accent} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="5 6" />
        <circle cx="320" cy="200" r={RING / 2} fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 6" />
        <text x={320 + RING / 2 + 5} y="195" fontSize="12" fontWeight="800" fill="#5E5E5A">
          {km(max / 2)}
        </text>
        <text x={320 + RING + 5} y="195" fontSize="12" fontWeight="800" fill="#5E5E5A">
          {km(max)}
        </text>
        <g transform="translate(606 34)">
          <circle r="15" fill="#fff" stroke="#111" strokeWidth="1.5" />
          <path d="M0 -10 L6 5 L0 1 L-6 5Z" fill="#111" />
          <text y="31" textAnchor="middle" fontSize="11" fontWeight="900">
            N
          </text>
        </g>
      </svg>
      <span className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 justify-items-center" aria-hidden>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black ring-4 ring-white">
          <i className="h-3 w-3 rounded-full bg-dz-yellow" />
        </span>
        <b className="absolute top-[calc(100%+4px)] max-w-[160px] truncate whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11.5px] shadow">{centre}</b>
      </span>
      {placed.map(({ p, x, y }, k) => {
        const on = p.id === picked;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            aria-pressed={on}
            aria-label={`${p.name}, ${km(p.km)}`}
            className="absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center"
            style={{ left: `${(x / 640) * 100}%`, top: `${(y / 400) * 100}%`, zIndex: on ? 3 : 2 }}
            data-pin={p.id}
          >
            <span
              className={`grid place-items-center rounded-full bg-white transition ${on ? 'h-10 w-10 text-xl sm:h-12 sm:w-12 sm:text-2xl' : 'vp-bob h-7 w-7 text-base hover:scale-110 sm:h-9 sm:w-9 sm:text-lg'} ${p.open ? '' : 'opacity-60 grayscale'}`}
              style={{ boxShadow: `0 0 0 ${on ? 4 : 2.5}px ${accent}`, animationDelay: `${(k % 5) * 0.45}s` }}
              aria-hidden
            >
              {p.emoji}
            </span>
            {on && <small className="absolute top-[calc(100%+6px)] whitespace-nowrap rounded-full bg-black px-2 py-0.5 text-[11.5px] font-extrabold text-white">{`${p.name} · ${km(p.km)}`}</small>}
          </button>
        );
      })}
    </div>
  );
}

/** A product on a page that mixes shops (Rush, Street Cart): picture or emoji with a tag on it, the shop, price and ADD. */
export function ItemCard({ p, shop, emoji, tint, tag, tone, basket }: { p: Product; shop: Shop; emoji: string; tint: string; tag?: string; tone: Tone; basket: Basket }) {
  const { t } = useI18n();
  const qty = basket.qtyOf(shop.id, p.id);
  const price = simpleLine(p).unitPrice;
  const off = p.mrp && p.mrp > price ? Math.round(((p.mrp - price) / p.mrp) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-white p-2.5" data-item={p.id}>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[14px] text-[50px]" style={{ background: tint }}>
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span aria-hidden>{emoji}</span>}
        {tag && <span className={`absolute bottom-2 left-2 rounded-[7px] px-[7px] py-0.5 text-[10.5px] font-extrabold text-white ${STEPPER_BG[tone]}`}>{tag}</span>}
        {off > 0 && <span className="absolute right-2 top-2 rounded-[7px] bg-black px-[7px] py-0.5 text-[10.5px] font-extrabold text-dz-yellow">{t('lc.off', { n: off })}</span>}
      </div>
      <b className="line-clamp-2 min-h-[34px] text-[13.5px] leading-tight">{p.name}</b>
      <Link to={`/s/${shop.slug ?? shop.id}`} className="truncate text-xs text-ink-2 hover:text-black hover:underline">
        {[p.unitSize && [p.unitSize, p.unit].filter(Boolean).join(' '), shop.name].filter(Boolean).join(' · ')}
      </Link>
      <div className="mt-auto flex items-center justify-between gap-1.5 pt-0.5">
        <span className="min-w-0 font-black">
          {rupees(price)}
          {off > 0 && <s className="ml-1 text-xs font-medium text-ink-3">{rupees(p.mrp!)}</s>}
        </span>
        {qty > 0 ? (
          <CardStepper qty={qty} max={p.maxQty} onChange={(n) => basket.step(shop, p, n)} label={p.name} tone={tone} />
        ) : (
          <AddButton label={t('lc.addNamed', { name: p.name })} onClick={() => basket.add(shop, p)} tone={tone} />
        )}
      </div>
    </div>
  );
}
