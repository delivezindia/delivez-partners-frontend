import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Store as StoreIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import {
  AroundMap,
  Band,
  CatTile,
  Crumbs,
  FaqDetails,
  FilterChip,
  HeroSearch,
  HitRow,
  ItemCard,
  KindBadge,
  NoHits,
  OfferTickets,
  PartnerTiles,
  SectionHead,
  SortSelect,
  ZeroPanel,
  relevantOffers,
  useBasket,
  type Basket,
} from '../components/categoryPage';
import { LocationSheet } from '../components/LocationSheet';
import type { GeocodeResult } from '../components/MapPicker';
import { LiveOrders, OrderAgain } from '../components/OrderStrips';
import { Skeleton } from '../components/ui';
import { VerticalIcon } from '../components/VerticalIcon';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { needsOptions, simpleLine } from '../lib/cart';
import { itemEmoji, tintFor } from '../lib/emoji';
import { clockLabel, km, opensAtLabel, rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import type { DeliverTo } from '../lib/location';
import { menuQuery, useNearby, useOffers, useOverview, type Overview } from '../lib/queries';
import type { Menu, Product, StoreCard, Vertical } from '../lib/types';

const PURPLE = '#7B2FD4';
/** Items come from the menus of this many of the quickest shops. */
const MENUS = 12;
/** Items shown before "Show all". */
const FIRST = 24;
const KINDS: Vertical[] = ['GROCERY', 'PHARMACY', 'LOCAL_STORES'];
/** Local shops that sell everyday needs (not clothes, flowers, gifts or printing). */
const ESSENTIAL_TYPES = new Set(['BAKERY', 'BABY_CARE', 'PET_CARE', 'HOUSEHOLD_LIFESTYLE', 'ELECTRONICS', 'BEAUTY_WELLNESS', 'SOCIETY_VENDOR', 'MEAT_FISH']);
const isRushShop = (s: StoreCard) => s.vertical === 'GROCERY' || s.vertical === 'PHARMACY' || (s.vertical === 'LOCAL_STORES' && ESSENTIAL_TYPES.has(s.storeType));

type Cat = 'staples' | 'fresh' | 'dairy' | 'snacks' | 'personal' | 'home' | 'baby' | 'pet' | 'health' | 'tech';
const LOOK: Record<Cat, { label: MsgKey; emoji: string; tint: string }> = {
  staples: { label: 'lc.rush.c.staples', emoji: '🌾', tint: '#FFF4C2' },
  fresh: { label: 'lc.rush.c.fresh', emoji: '🥦', tint: '#E3F4E8' },
  dairy: { label: 'lc.rush.c.dairy', emoji: '🥛', tint: '#EEF3FF' },
  snacks: { label: 'lc.rush.c.snacks', emoji: '🍿', tint: '#FDE2E4' },
  personal: { label: 'lc.rush.c.personal', emoji: '🧼', tint: '#F3E8FF' },
  home: { label: 'lc.rush.c.home', emoji: '🧽', tint: '#F2F2EF' },
  baby: { label: 'lc.rush.c.baby', emoji: '👶', tint: '#FFF8EC' },
  pet: { label: 'lc.rush.c.pet', emoji: '🐾', tint: '#FFE8D6' },
  health: { label: 'lc.rush.c.health', emoji: '💊', tint: '#EEF3FC' },
  tech: { label: 'lc.rush.c.tech', emoji: '🔌', tint: '#E5EDFF' },
};
/** Tiles in this order. */
const CATS = Object.keys(LOOK) as Cat[];
/**
 * Which category a product belongs to, from its name and aisle; first match wins. Baby and pet come before personal care
 * (baby lotion, pet shampoo), personal care before staples (hair oil). Products that aren't everyday needs match none.
 */
const RULES: [Cat, RegExp][] = [
  ['baby', /baby|diaper|wipes|formula/i],
  ['pet', /\bdog|\bcat\b|\bpets?\b/i],
  ['tech', /cable|charger|power ?bank|earphone|batter(y|ies)|torch|bulb|batten|extension/i],
  ['dairy', /milk|curd|dahi|paneer|butter|ghee|cheese|\beggs?\b|bread|\bpav\b|\bbuns?\b|rusk|dairy/i],
  ['fresh', /fruit|vegetable|tomato|onion|potato|banana|apple|palak|lady ?finger|pomegranate|mango/i],
  ['snacks', /chips|namkeen|bhujia|biscuit|cookie|chocolate|cola|juice|soda|\btea\b|coffee|snack|beverage|cake|pastry/i],
  ['personal', /soap|shampoo|tooth|lotion|sunscreen|shav|hair|skin|groom|personal|aloe|beard/i],
  ['staples', /atta|rice|\bdal\b|\boil\b|salt|sugar|noodle|flour|staple/i],
  ['home', /detergent|cleaner|cleaning|\bmop\b|dish|phenyl|tissue|home care|garbage/i],
];
function catOf(p: Product, aisle: string, v: Vertical): Cat | null {
  if (v === 'PHARMACY') return 'health';
  const text = `${p.name} ${aisle}`;
  return RULES.find(([, re]) => re.test(text))?.[0] ?? null;
}

/** Bundles for sudden moments, each filled from one shop so it arrives together. */
const PACKS: { key: MsgKey; emoji: string; bg: string; slots: RegExp[] }[] = [
  { key: 'lc.rush.p.sick', emoji: '🤒', bg: 'linear-gradient(135deg,#1E5BD6,#0B2A66)', slots: [/paracetamol|fever/i, /\bors\b|electrolyte/i, /thermometer/i, /cetirizine|allerg/i] },
  { key: 'lc.rush.p.breakfast', emoji: '🍳', bg: 'linear-gradient(135deg,#F26B1D,#B03A00)', slots: [/milk/i, /bread|\bpav\b/i, /butter/i, /\beggs?\b/i] },
  { key: 'lc.rush.p.movie', emoji: '🍿', bg: 'linear-gradient(135deg,#7B2FD4,#3A1270)', slots: [/chips/i, /namkeen|bhujia/i, /biscuit|cookie/i, /cola|soda|juice|coffee/i] },
  { key: 'lc.rush.p.baby', emoji: '👶', bg: 'linear-gradient(135deg,#E8130F,#8A0B09)', slots: [/diaper/i, /wipes/i, /formula|cereal|baby food/i, /lotion/i] },
  { key: 'lc.rush.p.power', emoji: '🔦', bg: 'linear-gradient(135deg,#111111,#3A3A3A)', slots: [/torch/i, /power ?bank/i, /bulb|batten/i, /cable|charger/i] },
  { key: 'lc.rush.p.clean', emoji: '🧽', bg: 'linear-gradient(135deg,#17803A,#0B4A20)', slots: [/cleaner/i, /detergent/i, /\bmop\b/i, /dish/i] },
];

interface Item {
  p: Product;
  m: Menu;
  cat: Cat;
  aisle: string;
}
type Sort = 'fast' | 'low' | 'disc';
const offOf = (p: Product) => (p.mrp && p.mrp > p.price ? (p.mrp - p.price) / p.mrp : 0);

/** "Open late": shops whose hours today run to 10 pm or later. */
const LATE = '22:00';
const isLate = (s: StoreCard) => !!s.closesAt && s.closesAt >= LATE;
/** Slots end at 23:59 when a shop is open till midnight. */
const till = (t: ReturnType<typeof useI18n>['t'], hhmm: string, locale: string) => (hhmm === '23:59' ? t('lc.rush.tillMidnight') : t('lc.rush.till', { time: clockLabel(hhmm, locale) }));
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

/** The time now, ticking every half minute. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// L1 Rush (/shops?v=RUSH): everyday essentials from the quickest shops near the chosen location. Delivez's own Rush
// dark stores aren't open yet — the page says so, and until then shows real shops, items and delivery times only.
export default function Rush({ at }: { at: DeliverTo }) {
  const { t, locale } = useI18n();
  const token = useAuth((s) => s.accessToken);
  const [params] = useSearchParams();
  const overview = useOverview();
  const offers = useOffers();
  const nearby = useNearby(at, null, '');
  const basket = useBasket();
  const now = useNow();
  const [typed, setTyped] = useState(params.get('q') ?? '');
  const [cat, setCat] = useState<Cat | 'late' | null>(null);
  const [onOffer, setOnOffer] = useState(false);
  const [sort, setSort] = useState<Sort>('fast');
  const [all, setAll] = useState(false);
  const fee = overview.data?.deliveryFee ?? 3000;

  // Shops that sell everyday needs and deliver here: open ones first, quickest first.
  const shops = useMemo(
    () => (nearby.data?.stores ?? []).filter((s) => isRushShop(s) && s.delivers).sort((a, b) => Number(b.open) - Number(a.open) || a.etaMinutes - b.etaMinutes || a.distanceKm - b.distanceKm),
    [nearby.data],
  );
  const open = shops.filter((s) => s.open);
  const fastest = open[0];
  const nearest = shops.length ? Math.min(...shops.map((s) => s.distanceKm)) : null;

  const menus = useQueries({ queries: open.slice(0, MENUS).map((s) => ({ ...menuQuery(s.slug ?? s.id, at), staleTime: 60_000 })) });
  const loaded = menus.map((q) => q.data).filter((m): m is Menu => !!m && m.store.open && m.store.delivers !== false);
  const loading = nearby.isLoading || (open.length > 0 && menus.some((q) => q.isLoading) && !loaded.length);
  const items: Item[] = [];
  for (const m of loaded) {
    const aisles = new Map(m.categories.map((c) => [c.id, c.name]));
    for (const p of m.products) {
      if (!p.available || p.prescriptionRequired) continue;
      const aisle = aisles.get(p.categoryId) ?? '';
      const c = catOf(p, aisle, m.store.vertical);
      if (c) items.push({ p, m, cat: c, aisle });
    }
  }

  const cats = CATS.filter((c) => items.some((i) => i.cat === c));
  const late = new Set(open.filter(isLate).map((s) => s.id));
  const hasLate = items.some((i) => late.has(i.m.store.id));
  const hour = now.getHours();
  const night = hour >= 22 || hour < 6;
  const price = (i: Item) => simpleLine(i.p).unitPrice;
  const order: Record<Sort, (a: Item, b: Item) => number> = {
    fast: (a, b) => a.m.store.etaMinutes - b.m.store.etaMinutes || price(a) - price(b),
    low: (a, b) => price(a) - price(b),
    disc: (a, b) => offOf(b.p) - offOf(a.p),
  };
  const shown = items.filter((i) => (!cat || (cat === 'late' ? late.has(i.m.store.id) : i.cat === cat)) && (!onOffer || offOf(i.p) > 0)).sort(order[sort]);
  // At night the shops that stay open longest come first.
  const openList = night ? [...open].sort((a, b) => (b.closesAt ?? '').localeCompare(a.closesAt ?? '') || a.etaMinutes - b.etaMinutes) : open;

  const packs = PACKS.map((pk) => {
    let best: { m: Menu; picks: Product[] } | null = null;
    for (const m of loaded) {
      const pool = m.products.filter((p) => p.available && !p.prescriptionRequired && !needsOptions(p));
      const picks: Product[] = [];
      for (const re of pk.slots) {
        const hit = pool.find((p) => re.test(p.name) && !picks.includes(p));
        if (hit) picks.push(hit);
      }
      // Menus are quickest first, so a tie goes to the quicker shop.
      if (picks.length >= 2 && (!best || picks.length > best.picks.length)) best = { m, picks };
    }
    return best ? { ...pk, ...best } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const needle = typed.trim().toLowerCase();
  const shopHits = needle.length >= 2 ? shops.filter((s) => s.name.toLowerCase().includes(needle)).slice(0, 3) : [];
  const itemHits = needle.length >= 2 ? items.filter((i) => i.p.name.toLowerCase().includes(needle) || i.aisle.toLowerCase().includes(needle)).slice(0, 8) : [];
  const rushOffers = relevantOffers(offers.data ?? [], KINDS, shops.map((s) => s.name));
  const storeIds = useMemo(() => shops.map((s) => s.id), [shops]);

  const faq = [
    { q: t('lc.rush.fq1'), a: t('lc.rush.fa1') },
    { q: t('lc.rush.fq2'), a: t('lc.rush.fa2') },
    { q: t('lc.rush.fq3'), a: t('lc.rush.fa3') },
    { q: t('lc.vp.fqOne'), a: t('lc.vp.faOne') },
    { q: t('lc.faq.q1'), a: t('lc.faq.a1', { fee: rupees(fee) }) },
    { q: t('lc.faq.q2'), a: t('lc.faq.a2') },
    { q: t('lc.faq.q3'), a: t('lc.faq.a3') },
  ];

  return (
    <div className="min-h-screen bg-white pb-28" data-page="rush">
      <AppHeader wide="xl" />

      <section className="relative overflow-hidden text-white" style={{ background: '#3A1270' }}>
        <div className="mx-auto grid max-w-[1320px] items-center gap-[30px] px-4 pb-11 pt-[34px] sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <Crumbs here={t('lc.v.RUSH')} />
            <KindBadge v="RUSH" color="#C9A2FF" />
            <h1 className="vp-tight m-0 text-[clamp(46px,6vw,90px)]">
              <span className="block">{t('lc.rush.h1a')}</span>
              <span className="block text-dz-yellow">{t('lc.rush.h1b')}</span>
            </h1>
            <p className="mb-[18px] mt-3.5 max-w-[520px] text-[17px] text-[#E6D8FF]">{t('lc.rush.lede')}</p>
            <ZeroPanel fee={fee} doorCheck />
            <HeroSearch value={typed} onChange={setTyped} placeholder={t('lc.rush.qPh')}>
              {shopHits.map((s) => (
                <HitRow key={s.id} emoji={<VerticalIcon v={s.vertical} size="sm" bare />} tint={tintFor(s.id)} title={s.name} sub={s.open ? t('lc.store.mins', { n: s.etaMinutes }) : t('lc.store.closed')} action={t('lc.site.browse')} to={`/s/${s.slug ?? s.id}`} />
              ))}
              {itemHits.map((i) => (
                <HitRow
                  key={`${i.m.store.id}-${i.p.id}`}
                  emoji={i.p.imageUrl ? <img src={i.p.imageUrl} alt="" className="h-full w-full object-cover" /> : itemEmoji(i.p.name, i.aisle)}
                  tint={LOOK[i.cat].tint}
                  title={i.p.name}
                  sub={`${t('lc.vp.at', { price: rupees(simpleLine(i.p).unitPrice), store: i.m.store.name })} · ${t('lc.store.mins', { n: i.m.store.etaMinutes })}`}
                  action={t('lc.add')}
                  onClick={() => basket.add(i.m.store, i.p)}
                />
              ))}
              {!shopHits.length && !itemHits.length && <NoHits />}
            </HeroSearch>
            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="rounded-full bg-white/[0.12] px-3 py-1.5">📍 {at.title}</span>
              {nearest !== null && <span className="rounded-full bg-white/[0.12] px-3 py-1.5">🏪 {t('lc.rush.zNear', { d: km(nearest) })}</span>}
              {shops.length > 0 && <span className="rounded-full bg-white/[0.12] px-3 py-1.5">⚡ {open.length === 1 ? t('lc.rush.zOpen1') : t('lc.rush.zOpen', { n: open.length })}</span>}
            </div>
          </div>
          <Watch eta={fastest?.etaMinutes ?? null} caption={fastest ? t('lc.rush.watch', { store: fastest.name }) : t('lc.rush.noneOpen')} />
        </div>
      </section>

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <LiveOrders className="-mt-5 mb-2" />
        </div>
      )}

      <Band id="shop">
        <SectionHead title={t('lc.rush.needTitle')} intro={t('lc.rush.needIntro')} />
        {cats.length > 0 && (
          <div className="dz-scroll-x -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0 lg:grid-cols-12" role="group" aria-label={t('lc.groc.catTitle')}>
            <CatTile label={t('lc.home.all')} emoji="⚡" tint="#000" on={!cat} onClick={() => setCat(null)} accent={PURPLE} dark />
            {cats.map((c) => (
              <CatTile key={c} label={t(LOOK[c].label)} emoji={LOOK[c].emoji} tint={LOOK[c].tint} on={cat === c} onClick={() => setCat(cat === c ? null : c)} accent={PURPLE} />
            ))}
            {hasLate && <CatTile label={t('lc.rush.c.late')} emoji="🌙" tint="#2A0F4A" on={cat === 'late'} onClick={() => setCat(cat === 'late' ? null : 'late')} accent={PURPLE} dark />}
          </div>
        )}
        <div className="mb-4 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2.5">
          <h3 className="mr-auto font-display text-[26px] sm:text-3xl">{cat === 'late' ? `🌙 ${t('lc.rush.c.late')}` : cat ? `${LOOK[cat].emoji} ${t(LOOK[cat].label)}` : t('lc.rush.allItems')}</h3>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('lc.vp.filters')}>
            <FilterChip on={onOffer} onClick={() => setOnOffer(!onOffer)}>
              {t('lc.groc.fOffer')}
            </FilterChip>
            <SortSelect
              value={sort}
              onChange={setSort}
              options={[
                ['fast', t('lc.rush.s.fast')],
                ['low', t('lc.groc.s.low')],
                ['disc', t('lc.groc.s.disc')],
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[73.8125rem]:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-[18px]" />
            ))}
          </div>
        ) : nearby.isError ? (
          <p className="rounded-3xl bg-soft p-8 text-center text-ink-2">{t('lc.err.load')}</p>
        ) : !shops.length ? (
          <div className="rounded-3xl bg-soft p-10 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-dz-yellow-soft">
              <StoreIcon className="h-8 w-8 text-ink-2" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold">{t('lc.home.noneTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{t('lc.home.noneBody')}</p>
          </div>
        ) : !open.length ? (
          <p className="rounded-3xl bg-soft p-10 text-center text-ink-2">{t('lc.rush.noneOpen')}</p>
        ) : !shown.length ? (
          <div className="rounded-3xl bg-soft p-10 text-center text-ink-2">
            {t('lc.groc.none')}{' '}
            <button
              type="button"
              onClick={() => {
                setCat(null);
                setOnOffer(false);
              }}
              className="font-extrabold text-black underline"
            >
              {t('lc.vp.clear')}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[73.8125rem]:grid-cols-6" aria-live="polite">
              {(all ? shown : shown.slice(0, FIRST)).map((i) => (
                <ItemCard key={`${i.m.store.id}-${i.p.id}`} p={i.p} shop={i.m.store} emoji={itemEmoji(i.p.name, i.aisle)} tint={LOOK[i.cat].tint} tag={`⚡ ${t('lc.store.mins', { n: i.m.store.etaMinutes })}`} tone="purple" basket={basket} />
              ))}
            </div>
            {!all && shown.length > FIRST && (
              <button type="button" onClick={() => setAll(true)} className="mx-auto mt-6 block rounded-full border-2 border-black px-6 py-3 font-extrabold hover:bg-black hover:text-white">
                {t('lc.rush.showAll', { n: shown.length })}
              </button>
            )}
          </>
        )}
      </Band>

      {packs.length > 0 && (
        <Band id="packs" paper>
          <SectionHead title={t('lc.rush.packTitle')} intro={t('lc.rush.packIntro')} />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pk) => (
              <PackCard key={pk.key} pack={pk} basket={basket} />
            ))}
          </div>
        </Band>
      )}

      <RushHow shop={fastest} />

      <section id="open" className="scroll-mt-20 px-4 pb-12 sm:px-6">
        <div className="mx-auto grid max-w-[1320px] items-center gap-6 rounded-[28px] p-7 text-white lg:grid-cols-[auto_1fr_minmax(0,420px)]" style={{ background: 'linear-gradient(135deg,#0B0626,#2A0F4A)' }}>
          <b className="font-display text-[clamp(54px,6vw,86px)] leading-[0.9] text-dz-yellow tabular-nums">{now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}</b>
          <div className="grid justify-items-start gap-2">
            <h2 className="vp-tight text-[clamp(28px,3vw,40px)]">{night ? t('lc.rush.lateTitle') : t('lc.rush.openTitle')}</h2>
            <p className="text-[#CFC2EA]">
              {open.length ? (open.length === 1 ? t('lc.rush.zOpen1') : t('lc.rush.zOpen', { n: open.length })) : t('lc.rush.noneOpen')}
              {late.size > 0 && ` · ${late.size === 1 ? t('lc.rush.lateN1', { time: clockLabel(LATE, locale) }) : t('lc.rush.lateN', { n: late.size, time: clockLabel(LATE, locale) })}`}
            </p>
            <span className="text-[28px] tracking-[4px]" aria-hidden>
              🍦🍿🔋👶🩹
            </span>
            {open.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCat(night && hasLate ? 'late' : null);
                  scrollTo('shop');
                }}
                className="rounded-xl bg-dz-yellow px-4 py-2.5 font-extrabold text-black transition hover:-translate-y-0.5"
              >
                {night && hasLate ? t('lc.rush.lateGo') : t('lc.rush.openGo')}
              </button>
            )}
          </div>
          {open.length > 0 && (
            <ul className="grid gap-2">
              {openList.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link to={`/s/${s.slug ?? s.id}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.08] px-3 py-2.5 transition hover:bg-white/[0.16]">
                    <VerticalIcon v={s.vertical} size="sm" bare />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{s.name}</span>
                      {s.closesAt && <small className="block text-xs text-[#CFC2EA]">🌙 {till(t, s.closesAt, locale)}</small>}
                    </span>
                    <b className="shrink-0 text-sm text-dz-yellow">⚡ {t('lc.store.mins', { n: s.etaMinutes })}</b>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Band id="zones" paper>
        <SectionHead title={t('lc.rush.zTitle')} intro={t('lc.rush.zIntro')} />
        <AreaCheck at={at} cities={overview.data?.cities ?? []} />
      </Band>

      <Band id="soon">
        <div className="relative grid gap-4 overflow-hidden rounded-[28px] p-7 text-white sm:p-9" style={{ background: 'linear-gradient(150deg,#2A0F4A 0%,#4B1B86 55%,#7B2FD4 100%)' }}>
          <span className="pointer-events-none absolute -bottom-12 -right-4 text-[220px] leading-none opacity-[0.08]" aria-hidden>
            ⚡
          </span>
          <span className="justify-self-start rounded-full bg-dz-yellow px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-black">{t('lc.rush.soonTag')}</span>
          <h2 className="vp-tight max-w-[18ch] text-[clamp(32px,3.8vw,52px)]">{t('lc.rush.soonTitle')}</h2>
          <p className="max-w-[62ch] text-[17px] text-[#E6D8FF]">{t('lc.rush.soonBody')}</p>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <span key={c} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                {LOOK[c].emoji} {t(LOOK[c].label)}
              </span>
            ))}
          </div>
        </div>
      </Band>

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 pb-6 sm:px-6">
          <OrderAgain storeIds={storeIds} />
        </div>
      )}

      <Band id="offers">
        <SectionHead title={t('lc.cp.title')} intro={rushOffers.length ? t('lc.vp.offersIntro') : undefined} />
        <OfferTickets offers={rushOffers} />
      </Band>

      <Band id="partner" paper>
        <PartnerTiles emoji="⚡" title={t('lc.rush.pTitle')} body={t('lc.rush.pBody')} other="GROCERY" otherEmoji="🛒" />
      </Band>

      <Band id="faq">
        <SectionHead title={t('lc.site.faqTitle')} />
        <FaqDetails items={faq} />
      </Band>

      {basket.ui}
    </div>
  );
}

/** The stopwatch: the real delivery time of the quickest open shop, with a dot running round the dial. */
function Watch({ eta, caption }: { eta: number | null; caption: string }) {
  const { t } = useI18n();
  const r = 150;
  const label = eta === null ? '–' : t('lc.store.mins', { n: eta });
  const ring = 2 * Math.PI * r;
  const filled = eta ? Math.min(eta, 60) / 60 : 0;
  return (
    <figure className="relative m-0 mx-auto hidden aspect-square w-full max-w-[400px] sm:block" data-watch>
      <svg viewBox="0 0 400 420" className="block h-full w-full" aria-hidden>
        <rect x="180" y="20" width="40" height="34" rx="8" fill="#FFD400" />
        <rect x="290" y="58" width="30" height="20" rx="6" fill="#FFD400" transform="rotate(40 305 68)" />
        <circle cx="200" cy="225" r="170" fill="#000" />
        <circle cx="200" cy="225" r={r} fill="none" stroke="#2A2A2A" strokeWidth="18" />
        <circle cx="200" cy="225" r={r} fill="none" stroke="#C9A2FF" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${ring * filled} ${ring}`} transform="rotate(-90 200 225)" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 2 * Math.PI;
          return <line key={i} x1={200 + 124 * Math.sin(a)} y1={225 - 124 * Math.cos(a)} x2={200 + 134 * Math.sin(a)} y2={225 - 134 * Math.cos(a)} stroke="#555" strokeWidth="3" />;
        })}
        <g className="vp-spin" style={{ transformOrigin: '200px 225px' }}>
          <circle cx="200" cy="75" r="9" fill="#FFD400" />
        </g>
        <text x="200" y="250" textAnchor="middle" fill="#FFD400" fontSize={Math.min(72, Math.floor(440 / label.length))} fontWeight="900" className="font-display">
          {label}
        </text>
      </svg>
      <figcaption className="absolute inset-x-[10%] bottom-[4%] text-center text-sm font-extrabold text-[#E6D8FF]">{caption}</figcaption>
    </figure>
  );
}

/** The steps every order goes through, the same ones the order page tracks. */
const HOW: { key: MsgKey; icon: string }[] = [
  { key: 'lc.site.t1', icon: '🧾' },
  { key: 'lc.site.t2', icon: '🏪' },
  { key: 'lc.site.t3', icon: '🧺' },
  { key: 'lc.site.t4', icon: '🛵' },
  { key: 'lc.site.t5', icon: '✅' },
];
const LAST = HOW.length - 1;
const SHELVES: [number, number][] = [
  [40, 70],
  [40, 150],
  [40, 230],
  [160, 70],
  [160, 150],
  [160, 230],
];
const ON_SHELF = ['🥛', '🍞', '🍫', '🔌', '🧻', '💊'];

/** "How it works", played out: an order goes from the shop's shelves into a pack and out with a rider, one step at a time. */
function RushHow({ shop }: { shop: StoreCard | undefined }) {
  const { t } = useI18n();
  // -1 before the first play; LAST once delivered.
  const [step, setStep] = useState(-1);
  useEffect(() => {
    if (step < 0 || step >= LAST) return;
    const id = setTimeout(() => setStep(step + 1), 1100);
    return () => clearTimeout(id);
  }, [step]);
  const play = () => setStep(matchMedia('(prefers-reduced-motion: reduce)').matches ? LAST : 0);
  const picker = step === 2 ? 'translate(150px,200px)' : 'translate(300px,300px)';
  const rider = step < 3 ? 'translate(410px,316px)' : step === 3 ? 'translate(470px,316px)' : 'translate(530px,316px)';
  const move = 'transition-transform duration-700 ease-out motion-reduce:transition-none';
  return (
    <Band id="how">
      <SectionHead title={t('lc.rush.howTitle')} intro={t('lc.rush.howIntro')} />
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ol className="grid gap-2" aria-live="polite">
          {HOW.map((h, k) => (
            <li
              key={h.key}
              className={`flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-[15px] font-bold transition duration-300 ${k === step ? 'translate-x-1.5 border-[#7B2FD4] bg-[#F1E6FF]' : k < step ? 'border-line bg-white text-ink-2' : 'border-line bg-white'}`}
              aria-current={k === step ? 'step' : undefined}
            >
              <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] text-lg transition ${k === step ? 'bg-[#7B2FD4]' : k < step ? 'bg-[#E3F4E8]' : 'bg-[#F2F2EF]'}`} aria-hidden>
                {k < step ? '✓' : h.icon}
              </span>
              {t(h.key)}
            </li>
          ))}
        </ol>
        <figure className="m-0 overflow-hidden rounded-[28px] bg-[#111]">
          <svg viewBox="0 0 560 360" className="block h-auto w-full" aria-hidden data-rush-how>
            <text x="20" y="34" fill="#A5A5A0" fontSize="13" fontWeight="700">
              {shop ? `🏪 ${shop.name.length > 34 ? `${shop.name.slice(0, 33)}…` : shop.name} · ${km(shop.distanceKm)}` : '🏪'}
            </text>
            {SHELVES.map(([x, y], i) => (
              <g key={i}>
                <rect x={x} y={y} width="100" height="58" rx="8" fill="#262626" />
                {[0, 1, 2].map((k) => (
                  <text key={k} x={x + 16 + k * 28} y={y + 38} fontSize="20">
                    {ON_SHELF[(i + k) % ON_SHELF.length]}
                  </text>
                ))}
              </g>
            ))}
            {step >= 0 && step <= 1 && (
              <g transform="translate(335 230)">
                <rect x="-34" y="-20" width="68" height="40" rx="10" fill="#FFD400" />
                <text y="7" textAnchor="middle" fontSize="20">
                  {step === 0 ? '🧾' : '👍'}
                </text>
              </g>
            )}
            <rect x="300" y="262" width="70" height="44" rx="8" fill="#7B2FD4" />
            <text x="335" y="291" textAnchor="middle" fontSize="20">
              {step >= 2 ? '🛍️' : '📦'}
            </text>
            <g className={move} style={{ transform: picker }}>
              <circle r="16" fill="#C9A2FF" />
              <text y="6" textAnchor="middle" fontSize="16">
                🧑
              </text>
            </g>
            <path d="M380 316 H 550" stroke="#333" strokeWidth="12" strokeLinecap="round" />
            <path d="M390 316 H 540" stroke="#FFD400" strokeWidth="2" strokeDasharray="10 10" opacity=".6" />
            <g className={move} style={{ transform: rider }}>
              <circle r="18" fill="#FFD400" />
              <text y="6" textAnchor="middle" fontSize="18">
                🛵
              </text>
            </g>
            <text x="530" y="230" textAnchor="middle" fontSize="34">
              🏠
            </text>
            {step === LAST && (
              <text x="548" y="276" textAnchor="end" fill="#2BD463" fontSize="14" fontWeight="900">
                {t('lc.step.delivered')} ✓
              </text>
            )}
          </svg>
        </figure>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={play} className="rounded-xl bg-dz-yellow px-4 py-2.5 font-extrabold text-black transition hover:-translate-y-0.5" data-how-play>
          ▶ {t('lc.rush.howGo')}
        </button>
        {shop && <span className="text-sm font-bold text-ink-2">{t('lc.rush.howEta', { store: shop.name, time: t('lc.store.mins', { n: shop.etaMinutes }) })}</span>}
      </div>
    </Band>
  );
}

const dayRank = (day: string) => (day === 'today' ? 0 : day === 'tomorrow' ? 1 : 2);

interface Spot {
  lat: number;
  lng: number;
  label: string;
}
interface PinInfo {
  code: string;
  serviceable: boolean;
  city: { id: string; name: string } | null;
  zone: { name: string } | null;
}

/**
 * "Is Rush in your area?": the essentials shops that deliver to a place, from the same list as the rest of the page. Pick
 * your location or a city, or type an area or pincode (a pincode says whether Delivez delivers there; looking up a place
 * by name needs a login, as the map search does).
 */
function AreaCheck({ at, cities }: { at: DeliverTo; cities: Overview['cities'] }) {
  const { t, locale } = useI18n();
  const token = useAuth((s) => s.accessToken);
  // null = the delivery location.
  const [spot, setSpot] = useState<Spot | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; login?: boolean } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const where = spot ?? { lat: at.lat, lng: at.lng, label: at.title };
  const nearby = useNearby(where, null, '');
  // While another place loads, show nothing rather than the last place's shops.
  const all = (nearby.isPlaceholderData ? [] : (nearby.data?.stores ?? [])).filter((s) => s.delivers);
  const shops = all.filter(isRushShop).sort((a, b) => Number(b.open) - Number(a.open) || a.etaMinutes - b.etaMinutes || a.distanceKm - b.distanceKm);
  const open = shops.filter((s) => s.open);
  const next = shops.filter((s) => s.opensAt).sort((a, b) => dayRank(a.opensAt!.day) - dayRank(b.opensAt!.day) || a.opensAt!.time.localeCompare(b.opensAt!.time))[0];
  const sel = shops.find((s) => s.id === picked) ?? null;
  const same = (s: Spot) => Math.abs(s.lat - where.lat) < 1e-6 && Math.abs(s.lng - where.lng) < 1e-6;

  const go = (s: Spot | null) => {
    setSpot(s);
    setPicked(null);
    setNote(null);
  };
  const check = async () => {
    const q = typed.trim();
    if (!q || busy) return;
    setBusy(true);
    setNote(null);
    try {
      if (/^\d{6}$/.test(q)) {
        const pin = await api<PinInfo>(`/geo/pincodes/${q}`);
        if (!pin.serviceable || !pin.city) return setNote({ text: t('lc.rush.zPinNo', { pin: q }) });
        const city = cities.find((c) => c.id === pin.city!.id)?.name ?? pin.city.name;
        const place = [pin.zone?.name, city].filter(Boolean).join(', ');
        const hit = token ? (await api<GeocodeResult[]>(`/geo/search?q=${encodeURIComponent(`${q} ${city}`)}`).catch(() => []))[0] : undefined;
        if (hit) return go({ lat: hit.lat, lng: hit.lng, label: place });
        return setNote({ text: token ? t('lc.rush.zPinYes', { pin: q, place }) : `${t('lc.rush.zPinYes', { pin: q, place })} ${t('lc.rush.zPinLogin')}`, login: !token });
      }
      if (!token) return setNote({ text: t('lc.rush.zLogin'), login: true });
      const hit = (await api<GeocodeResult[]>(`/geo/search?q=${encodeURIComponent(q)}`))[0];
      if (!hit) return setNote({ text: t('lc.rush.zNotFound', { q }) });
      go({ lat: hit.lat, lng: hit.lng, label: hit.area || hit.line1 || hit.label });
    } catch {
      setNote({ text: t('lc.err.load') });
    } finally {
      setBusy(false);
    }
  };

  const chips: { key: string; label: string; s: Spot | null }[] = [
    { key: 'here', label: `📍 ${at.title}`, s: null },
    ...cities.map((c) => ({ key: c.id, label: t('lc.rush.zCity', { city: c.name }), s: { lat: c.lat, lng: c.lng, label: t('lc.rush.zCity', { city: c.name }) } })),
  ];
  const result = nearby.isLoading || nearby.isPlaceholderData ? (
    <Skeleton className="h-36 rounded-2xl" />
  ) : nearby.isError ? (
    <p className="rounded-2xl bg-[#F2F2EF] p-5 text-ink-2">{t('lc.err.load')}</p>
  ) : open.length ? (
    <div className="grid justify-items-start gap-2 rounded-2xl bg-[#F1E6FF] p-5">
      <b className="font-display text-[26px] leading-tight text-[#7B2FD4]">⚡ {t('lc.rush.zLive', { place: where.label })}</b>
      <span className="text-[15px]">
        {open.length === 1 ? t('lc.rush.zOpen1') : t('lc.rush.zOpen', { n: open.length })} · {t('lc.rush.zFast', { store: open[0].name, time: t('lc.store.mins', { n: open[0].etaMinutes }) })}
      </span>
      {spot ? (
        <button type="button" onClick={() => setChanging(true)} className="rounded-xl bg-black px-4 py-2.5 font-extrabold text-white">
          {t('lc.loc.change')}
        </button>
      ) : (
        <button type="button" onClick={() => scrollTo('shop')} className="rounded-xl bg-dz-yellow px-4 py-2.5 font-extrabold text-black">
          {t('lc.rush.zShop')}
        </button>
      )}
    </div>
  ) : shops.length ? (
    <div className="grid gap-2 rounded-2xl bg-[#F2F2EF] p-5">
      <b className="font-display text-[24px] leading-tight">{t('lc.rush.zClosed', { place: where.label })}</b>
      {next?.opensAt && <span className="text-[15px]">{`${next.name}: ${t('lc.store.opensAt', { time: opensAtLabel(next.opensAt, locale, t('lc.today'), t('lc.tomorrow')) })}`}</span>}
    </div>
  ) : (
    <div className="grid justify-items-start gap-2 rounded-2xl bg-[#F2F2EF] p-5">
      <b className="font-display text-[24px] leading-tight">{t('lc.rush.zNone', { place: where.label })}</b>
      <span className="text-[15px]">{all.length && !spot ? t('lc.rush.zOthers', { n: all.length }) : t('lc.home.noneBody')}</span>
      {all.length > 0 && !spot && (
        <Link to="/shops" className="rounded-xl bg-black px-4 py-2.5 font-extrabold text-white">
          {t('lc.site.browse')}
        </Link>
      )}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="grid content-start gap-2">
        <AroundMap
          points={shops.slice(0, 24).map((s) => ({ id: s.id, name: s.name, emoji: <VerticalIcon v={s.vertical} size="sm" bare />, km: s.distanceKm, bearing: s.bearing, open: s.open }))}
          picked={picked}
          onPick={(id) => setPicked(id === picked ? null : id)}
          centre={where.label}
          accent={PURPLE}
          label={t('lc.rush.zMap', { place: where.label })}
        />
        {sel ? (
          <Link to={`/s/${sel.slug ?? sel.id}`} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line hover:ring-black" aria-live="polite">
            <VerticalIcon v={sel.vertical} size="sm" bare />
            <span className="min-w-0 flex-1 truncate font-bold">{sel.name}</span>
            <span className={`shrink-0 text-sm font-extrabold ${sel.open ? 'text-[#7B2FD4]' : 'text-dz-red'}`}>{`${km(sel.distanceKm)} · ${sel.open ? t('lc.store.mins', { n: sel.etaMinutes }) : t('lc.store.closed')}`}</span>
          </Link>
        ) : (
          <small className="text-[13px] text-ink-2">{t('lc.rush.zCaption')}</small>
        )}
      </div>
      <div className="grid content-start gap-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t('lc.rush.zPh')}
            aria-label={t('lc.rush.zPh')}
            maxLength={80}
            className="min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-white px-3.5 py-3 text-[15px] outline-none focus:border-black"
          />
          <button type="submit" disabled={busy || !typed.trim()} className="shrink-0 rounded-xl bg-black px-4 font-extrabold text-white disabled:opacity-50">
            {busy ? '…' : t('lc.rush.zGo')}
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const on = c.s ? same(c.s) && !!spot : !spot;
            return (
              <button key={c.key} type="button" aria-pressed={on} onClick={() => go(c.s)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold transition ${on ? 'border-black bg-black text-white' : 'border-line bg-white hover:border-black'}`}>
                {c.label}
              </button>
            );
          })}
        </div>
        {note && (
          <p className="rounded-2xl bg-[#FFF4C2] px-4 py-3 text-[14.5px] font-semibold" role="status">
            {note.text}
            {note.login && (
              <Link to={`/login?next=${encodeURIComponent('/shops?v=RUSH')}`} className="mt-2 block w-fit rounded-lg bg-black px-3 py-1.5 text-sm font-extrabold text-white">
                {t('lc.login')}
              </Link>
            )}
          </p>
        )}
        <div aria-live="polite">{result}</div>
      </div>
      {changing && <LocationSheet onClose={() => setChanging(false)} />}
    </div>
  );
}

function PackCard({ pack, basket }: { pack: { key: MsgKey; emoji: string; bg: string; m: Menu; picks: Product[] }; basket: Basket }) {
  const { t } = useI18n();
  const shop = pack.m.store;
  const total = pack.picks.reduce((n, p) => n + simpleLine(p).unitPrice, 0);
  const inCart = pack.picks.every((p) => basket.qtyOf(shop.id, p.id) > 0);
  const aisles = new Map(pack.m.categories.map((c) => [c.id, c.name]));
  return (
    <div className="relative grid content-start gap-2.5 overflow-hidden rounded-[22px] p-5 text-white" style={{ background: pack.bg }} data-pack={pack.key}>
      <span className="text-[30px] tracking-[2px]" aria-hidden>
        {pack.picks.map((p) => itemEmoji(p.name, aisles.get(p.categoryId) ?? '')).join('')}
      </span>
      <b className="vp-tight font-display text-[28px]">
        {pack.emoji} {t(pack.key)}
      </b>
      <small className="text-[13.5px] opacity-90">{pack.picks.map((p) => p.name).join(', ')}</small>
      <small className="text-[13px] font-bold opacity-90">{t('lc.rush.packFrom', { store: shop.name, time: t('lc.store.mins', { n: shop.etaMinutes }) })}</small>
      <button
        type="button"
        disabled={inCart}
        onClick={() => basket.put(shop, pack.picks.map((p) => ({ line: simpleLine(p), qty: 1 })))}
        className="justify-self-start rounded-xl bg-white px-3.5 py-2.5 font-black text-black transition hover:bg-dz-yellow disabled:cursor-default disabled:bg-white/80"
      >
        {inCart ? `${t('lc.groc.allIn')} ✓` : `${t('lc.groc.addAll', { n: pack.picks.length })} · ${rupees(total)}`}
      </button>
    </div>
  );
}
