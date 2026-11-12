import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Clock, FlaskConical, MapPin, Star, type LucideIcon } from 'lucide-react';
import { km, rupees } from '../../lib/format';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { storeLook } from '../../lib/icons';
import { useDeliverTo } from '../../lib/location';
import { nearbyQuery, useNearby, useOffers, useOverview, type Overview, type PublicOffer } from '../../lib/queries';
import type { ShopPage } from '../../lib/labels';
import type { StoreCard, Vertical } from '../../lib/types';

/*
 * Building blocks of the home page (the Delivez Now design): light by default, dark when the device is (see .dz-now in
 * index.css). Honest by rule, like the category pages: shops, counts, times and offers come from the API; what the app
 * can't do yet says so. Copy is in `lc.hm.*`, in every language.
 */

export type Kind = Vertical | ShopPage;
type T = ReturnType<typeof useI18n>['t'];

/** A sentence about a place: the `{where}` form when there is one, the "you" form when there isn't. */
export const placed = (t: T, where: string | null, withWhere: MsgKey, withYou: MsgKey, vars: Record<string, string | number> = {}) =>
  where ? t(withWhere, { ...vars, where }) : t(withYou, vars);

// ---------------------------------------------------------------- Where we are looking

interface Around {
  /** The saved delivery location, or (before one is set) a city centre. */
  at: { lat: number; lng: number } | null;
  /** "Home", or "central Lucknow" before a location is set. */
  where: string | null;
  saved: boolean;
  cities: Overview['cities'];
  cityId: string | null;
  pickCity: (id: string) => void;
  /** Shops that deliver to `at`, nearest first. */
  stores: StoreCard[];
  loading: boolean;
  error: boolean;
  fee: number;
  offers: PublicOffer[];
}
const AroundCtx = createContext<Around | null>(null);

/**
 * One place for every section to get "the shops around you": the saved location, or before one is set, the centre of
 * the live city with the most shops delivering there (each city centre is asked once, and the visitor can switch).
 */
export function AroundProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const saved = useDeliverTo((s) => s.at);
  const overview = useOverview();
  const offers = useOffers();
  const cities = useMemo(() => overview.data?.cities ?? [], [overview.data]);
  const [picked, setPicked] = useState<string | null>(null);
  const centres = useQueries({ queries: saved ? [] : cities.slice(0, 6).map((c) => ({ ...nearbyQuery({ lat: c.lat, lng: c.lng }, null, ''), staleTime: 60_000 })) });
  const ready = centres.every((q) => !q.isLoading);
  // The most kinds of shop first (a centre with only labs is a poor first look), then the most shops.
  const score = (i: number) => {
    const s = centres[i]?.data?.stores.filter((x) => x.delivers) ?? [];
    return new Set(s.map((x) => x.vertical)).size * 1000 + s.length;
  };
  const best = ready && cities.length ? cities.slice(0, 6).reduce((b, _, i) => (score(i) > score(b) ? i : b), 0) : -1;
  const city = cities.find((c) => c.id === picked) ?? (best >= 0 ? cities[best] : undefined);
  const at = saved ? { lat: saved.lat, lng: saved.lng } : city ? { lat: city.lat, lng: city.lng } : null;
  const q = useNearby(at, null, '');
  const stores = useMemo(() => (q.data?.stores ?? []).filter((s) => s.delivers).sort((a, b) => a.distanceKm - b.distanceKm), [q.data]);
  const value: Around = {
    at,
    where: saved ? saved.title : city ? t('lc.hm.central', { city: city.name }) : null,
    saved: !!saved,
    cities,
    cityId: saved ? null : (city?.id ?? null),
    pickCity: setPicked,
    stores: q.isPlaceholderData ? [] : stores,
    loading: overview.isLoading || (!saved && !ready) || q.isLoading || q.isPlaceholderData,
    error: q.isError,
    fee: overview.data?.deliveryFee ?? 3000,
    offers: offers.data ?? [],
  };
  return <AroundCtx.Provider value={value}>{children}</AroundCtx.Provider>;
}
export function useAround() {
  const v = useContext(AroundCtx);
  if (!v) throw new Error('useAround outside AroundProvider');
  return v;
}

/** Before a location is set: which city the shops are from, and the others to switch to. */
export function CityNote() {
  const { t } = useI18n();
  const a = useAround();
  if (a.saved || a.cities.length < 2) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-now-muted">
      {t('lc.hm.showingAround')}
      {a.cities.map((c) => (
        <button key={c.id} type="button" aria-pressed={c.id === a.cityId} onClick={() => a.pickCity(c.id)} className={pill(c.id === a.cityId)}>
          {c.name}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Kinds of shop

/** `tag` is part of the logo artwork, so it stays as drawn (English) in every language. */
export const KINDS: { k: Kind; title: MsgKey; blurb: MsgKey; logo: string | null; tag: string; to: string }[] = [
  { k: 'EAT', title: 'lc.hm.kind.EAT', blurb: 'lc.hm.kindBlurb.EAT', logo: 'food', tag: 'FOOD', to: '/shops?v=EAT' },
  { k: 'GROCERY', title: 'lc.hm.kind.GROCERY', blurb: 'lc.hm.kindBlurb.GROCERY', logo: 'grocery', tag: 'GROCERY', to: '/shops?v=GROCERY' },
  { k: 'PHARMACY', title: 'lc.hm.kind.PHARMACY', blurb: 'lc.hm.kindBlurb.PHARMACY', logo: 'pharmacy', tag: 'PHARMACY', to: '/shops?v=PHARMACY' },
  { k: 'DIAGNOSTICS', title: 'lc.hm.kind.DIAGNOSTICS', blurb: 'lc.hm.kindBlurb.DIAGNOSTICS', logo: null, tag: 'LAB TESTS', to: '/shops?v=DIAGNOSTICS' },
  { k: 'LOCAL_STORES', title: 'lc.hm.kind.LOCAL_STORES', blurb: 'lc.hm.kindBlurb.LOCAL_STORES', logo: 'local-shop', tag: 'LOCAL SHOP', to: '/shops?v=LOCAL_STORES' },
  { k: 'STREET', title: 'lc.hm.kind.STREET', blurb: 'lc.hm.kindBlurb.STREET', logo: 'street-cart', tag: 'STREET CART', to: '/shops?v=STREET' },
  { k: 'RUSH', title: 'lc.hm.kind.RUSH', blurb: 'lc.hm.kindBlurb.RUSH', logo: 'rush-store', tag: 'RUSH STORE', to: '/shops?v=RUSH' },
];
export const kindOf = (k: Kind) => KINDS.find((x) => x.k === k)!;

/** Street carts and society vendors: the Street Cart page's list. */
const VENDOR_TYPES = new Set(['STREET_VENDOR', 'SOCIETY_VENDOR']);
/** Kinds with no shops of their own yet: Rush will be Delivez's own stores, so no partner shop is ever listed there. */
export const COMING_SOON: Kind[] = ['RUSH'];
/** The same rules as the Street Cart page and the shop lists, so counts here match what they list: vendors only under Street Cart. */
export const inKind = (s: StoreCard, k: Kind) =>
  k === 'RUSH' ? false : k === 'STREET' ? VENDOR_TYPES.has(s.storeType) : s.vertical === k && !(k === 'LOCAL_STORES' && VENDOR_TYPES.has(s.storeType));

const TYPES = ['RESTAURANT', 'CLOUD_KITCHEN', 'CAFE', 'BAKERY', 'SWEETS', 'SUPERMARKET', 'KIRANA', 'GROCERY', 'PHARMACY_RETAIL', 'DIAGNOSTIC_LAB', 'BABY_CARE', 'PET_CARE', 'ELECTRONICS', 'BEAUTY_WELLNESS', 'MEAT_FISH', 'CLOTHING', 'FLOWER', 'PRINTING', 'HOUSEHOLD_LIFESTYLE', 'STREET_VENDOR', 'SOCIETY_VENDOR', 'OTHER'] as const;
export const TYPE_LABEL: Record<string, MsgKey> = Object.fromEntries(TYPES.map((x) => [x, `lc.hm.type.${x}` as MsgKey]));

/** Delivez Now logo with the kind's tag (the design's files); lab tests have none yet, so their mark is drawn here. */
export function NowLogo({ k, className = 'h-[46px]' }: { k: Kind; className?: string }) {
  const { t } = useI18n();
  const kind = kindOf(k);
  if (kind.logo) return <img src={`/brand/now-${kind.logo}.svg`} alt={t('lc.hm.logoAlt', { kind: t(kind.title) })} className={`block w-auto ${className}`} />;
  return <NowMark tag={kind.tag} icon={FlaskConical} className={className} />;
}
function NowMark({ tag, icon: Icon, className }: { tag: string; icon: LucideIcon; className: string }) {
  return (
    <svg viewBox="532 708 4007 958" className={`block w-auto ${className}`} role="img" aria-label={`Delivez Now ${tag.toLowerCase()}`}>
      <path d="M552 856Q552 820 580.4 842.1L899.6 1089.9Q928 1112 899.7 1134.3L580.3 1385.7Q552 1408 552 1372Z" fill="#E8130F" />
      <path d="M720 752Q720 712 750.7 737.6L1169.3 1086.4Q1200 1112 1169 1137.3L751 1478.7Q720 1504 720 1464Z" fill="#FFD400" fillOpacity=".82" />
      <path d="M952 792Q952 752 984.7 775L1431.3 1089Q1464 1112 1431.8 1135.7L984.2 1464.3Q952 1488 952 1448Z" fill="#111" />
      <text x="1560" y="1110" fontSize="430" fontWeight="900" fill="#111" style={{ fontStretch: '90%' }}>
        DELIVEZ
      </text>
      <text x="1560" y="1560" fontSize="430" fontWeight="900" fontStyle="italic" fill="#E8130F" style={{ fontStretch: '90%' }}>
        NOW
      </text>
      <rect x="2860" y="1270" width="1640" height="300" rx="40" fill="#111" />
      <rect x="2890" y="1300" width="240" height="240" rx="30" fill="#E8130F" />
      <Icon x={2920} y={1330} width={180} height={180} color="#fff" strokeWidth={2.4} />
      <text x="3820" y="1490" textAnchor="middle" fontSize="180" fontWeight="900" letterSpacing="20" fill="#FFD400">
        {tag}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- Page furniture

/** Pill buttons and chips, as in the design: black with yellow text when on. */
export const pill = (on: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold transition ${on ? 'border-black bg-black text-dz-yellow' : 'border-now-line bg-now-surface text-now-text hover:border-now-text'}`;
export const chip = 'inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-now-line bg-now-surface px-3.5 py-2 text-[13px] font-extrabold text-now-text';
export function Soon({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${dark ? 'bg-white/10 text-dz-yellow' : 'bg-dz-yellow-soft text-black'}`}>{t('lc.rush.soonTag')}</span>;
}

/** Text drawn in an SVG: squeezed into `width` when longer than `max` characters (some languages' words run long). */
export const fit = (s: string, max: number, width: number) => (s.length > max ? { textLength: width, lengthAdjust: 'spacingAndGlyphs' as const } : {});

export const scrollToId =(id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

/** A home-page section: page or surface background, red tag, big title and the intro on the right. */
export function NowSection({ id, surface = false, tag, title, intro, children, className = '' }: { id?: string; surface?: boolean; tag?: string; title?: ReactNode; intro?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-28 px-4 py-[52px] sm:px-6 ${surface ? 'bg-now-surface' : 'bg-now-bg'} ${className}`}>
      <div className="mx-auto max-w-[1280px]">
        {(tag || title) && (
          <div className="mb-[30px] flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              {tag && <p className="mb-2 text-[13.5px] font-extrabold uppercase tracking-[1.4px] text-dz-red">{tag}</p>}
              {title && <h2 className="max-w-[20ch] text-[clamp(34px,4vw,54px)] leading-[0.95] text-now-text">{title}</h2>}
            </div>
            {intro && <p className="max-w-[50ch] text-now-muted">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** The boxed section heading with the red-to-yellow edge and the kind's logo on the right (Food, Pharmacy, Local…). */
export function BrandHead({ k, tag, title, intro }: { k: Kind; tag: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <div className="group relative mb-[22px] flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[22px] border border-now-line bg-[linear-gradient(120deg,var(--now-card),rgba(255,212,0,0.10))] px-[22px] py-[18px] max-sm:p-4">
      <span className="absolute bottom-[18px] left-0 top-[18px] w-[5px] rounded-r bg-gradient-to-b from-dz-red to-dz-yellow" aria-hidden />
      <div className="min-w-0 flex-[1_1_420px]">
        <p className="mb-2 text-[13.5px] font-extrabold uppercase tracking-[1.4px] text-dz-red">{tag}</p>
        <h2 className="max-w-[20ch] text-[clamp(34px,4vw,54px)] leading-[0.95] text-now-text">{title}</h2>
        {intro && <p className="mt-2 max-w-[50ch] text-now-muted">{intro}</p>}
      </div>
      <span className="shrink-0 rounded-[18px] border border-[#F0ECE2] bg-white px-4 py-3 shadow-[0_18px_34px_-26px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-[3px] group-hover:-rotate-1">
        <NowLogo k={k} className="h-[46px] max-sm:h-[34px]" />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Store card

/** An offer that names this shop, or this kind of shop (a general offer would tag every card). */
export const offerAt = (s: StoreCard, offers: PublicOffer[]) => offers.find((o) => (o.shop ? o.shop === s.name : o.vertical === s.vertical))?.headline ?? null;

/** Store card from the design: a coloured band with the shop's photo or icon, then name, rating, distance, time and fees. */
export function StoreTile({ s, offer }: { s: StoreCard; offer?: string | null }) {
  const { t } = useI18n();
  const look = storeLook(s);
  const img = s.coverUrl ?? s.logoUrl;
  const closed = !s.open && !s.bookable;
  const kind = s.cuisines.length ? s.cuisines.slice(0, 2).join(' · ') : t(TYPE_LABEL[s.storeType] ?? kindOf(s.vertical).title);
  return (
    <Link
      to={`/s/${s.slug ?? s.id}`}
      data-store={s.id}
      className={`group grid overflow-hidden rounded-[18px] border border-now-line bg-now-card text-now-text transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_-22px_rgba(0,0,0,0.45)] ${closed ? 'opacity-70' : ''}`}
    >
      <div className="relative grid h-24 place-items-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 130%, rgba(255,255,255,.22), transparent 62%), ${look.bg}` }}>
        {img ? (
          <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 transition duration-300 group-hover:scale-110" aria-hidden>
            <look.icon className="h-7 w-7 text-white" strokeWidth={2} />
          </span>
        )}
        {offer && <span className="absolute left-2 top-2 max-w-[62%] truncate rounded-md bg-dz-red px-2 py-0.5 text-[11px] font-black text-white">{offer}</span>}
        <span className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-black ${closed ? 'bg-[#2A0A0E] text-[#FF7D84]' : 'bg-[#0F2418] text-[#2BD463]'}`}>{s.bookable ? t('lc.store.bookSlot') : closed ? t('lc.hm.closed') : t('lc.hm.open')}</span>
      </div>
      <div className="grid gap-1 p-3.5">
        <b className="truncate text-[15.5px]">{s.name}</b>
        <small className="truncate text-xs text-now-muted">{kind}</small>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-extrabold">
          {s.rating && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-dz-yellow text-dz-yellow" aria-hidden /> {s.rating.avg.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-dz-red" aria-hidden /> {km(s.distanceKm)}
          </span>
          {!s.bookable && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-now-muted" aria-hidden /> {t('lc.store.mins', { n: s.etaMinutes })}
            </span>
          )}
        </span>
        {!s.bookable && <small className="text-xs text-now-muted">{`${s.minOrderAmount ? t('lc.store.min', { amount: rupees(s.minOrderAmount) }) : t('lc.hm.noMin')} · ${s.deliveryFee ? t('lc.store.fee', { fee: rupees(s.deliveryFee) }) : t('lc.dash.free')}`}</small>}
      </div>
    </Link>
  );
}

/** A grid of store cards with loading and empty states. */
export function StoreGrid({ stores, empty, offers }: { stores: StoreCard[]; empty: string; offers: PublicOffer[] }) {
  const { t } = useI18n();
  const a = useAround();
  if (a.loading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-[18px] bg-now-card" />)}</div>;
  if (a.error) return <p className="rounded-2xl bg-now-card p-6 text-now-muted">{t('lc.hm.loadFail')}</p>;
  if (!stores.length) return <p className="rounded-2xl border border-now-line bg-now-card p-6 text-now-muted">{empty}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-store-grid>
      {stores.map((s) => (
        <StoreTile key={s.id} s={s} offer={offerAt(s, offers)} />
      ))}
    </div>
  );
}
