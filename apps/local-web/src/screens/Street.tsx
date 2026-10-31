import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Store as StoreIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import {
  AroundMap,
  Band,
  CardStepper,
  CatTile,
  AddButton,
  Crumbs,
  FaqDetails,
  FilterChip,
  HeroSearch,
  HitRow,
  HowBand,
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
import { LiveOrders, OrderAgain } from '../components/OrderStrips';
import { Skeleton } from '../components/ui';
import { useAuth } from '../lib/auth-store';
import { simpleLine, useCart } from '../lib/cart';
import { PARTNERS_URL } from '../lib/config';
import { itemEmoji, tintFor, vendorEmoji } from '../lib/emoji';
import { km, opensAtLabel, rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import type { DeliverTo } from '../lib/location';
import { menuQuery, useNearby, useOffers, useOverview } from '../lib/queries';
import type { Menu, StoreCard } from '../lib/types';

const ORANGE = '#C2470B';
/** "Under 1 km". */
const NEAR = 1;
/** "Rated 4+". */
const TOP = 4;
/** Vendors whose menus are read for items. */
const MENUS = 8;
const KIND: Record<string, MsgKey> = { STREET_VENDOR: 'lc.street.t.STREET_VENDOR', SOCIETY_VENDOR: 'lc.street.t.SOCIETY_VENDOR' };
const isVendor = (s: StoreCard) => s.storeType in KIND;
const look = (s: StoreCard) => vendorEmoji(`${s.name} ${s.description ?? ''} ${s.cuisines.join(' ')}`);

/**
 * Kinds of cart, found in what a vendor says about itself and the sections of its menu. A vendor can be more than one
 * (a chaat cart that also sells kulfi).
 */
type CartType = 'fruit' | 'veg' | 'chaat' | 'juice' | 'tea' | 'flower' | 'kulfi' | 'tiffin' | 'corn' | 'dairy';
const TYPES: { k: CartType; label: MsgKey; emoji: string; tint: string; re: RegExp }[] = [
  { k: 'fruit', label: 'lc.street.c.fruit', emoji: '🍉', tint: '#E3F4E8', re: /fruit|mango|banana|papaya|guava|melon|phal\b/i },
  { k: 'veg', label: 'lc.street.c.veg', emoji: '🥬', tint: '#EAF7E1', re: /vegetable|veggie|sabzi|sabji|greens/i },
  { k: 'chaat', label: 'lc.street.c.chaat', emoji: '🥙', tint: '#FFF4C2', re: /chaat|pani ?puri|golgapp|puchka|bhel|tikki|samosa|vada ?pav|pav bhaji|momo|snack/i },
  { k: 'juice', label: 'lc.street.c.juice', emoji: '🥥', tint: '#E5F6F2', re: /juice|coconut|nariyal|sugarcane|ganna|lassi|shake|sherbet|sharbat/i },
  { k: 'tea', label: 'lc.street.c.tea', emoji: '☕', tint: '#F2E9DF', re: /\btea\b|chai|coffee/i },
  { k: 'flower', label: 'lc.street.c.flower', emoji: '🌼', tint: '#FFE8D6', re: /flower|phool|garland|gajra|\bmala\b/i },
  { k: 'kulfi', label: 'lc.street.c.kulfi', emoji: '🍧', tint: '#FDE2E4', re: /kulfi|ice ?cream|falooda|\bgola\b/i },
  { k: 'tiffin', label: 'lc.street.c.tiffin', emoji: '🫓', tint: '#FFF1D6', re: /tiffin|breakfast|idli|dosa|poha|paratha|upma/i },
  { k: 'corn', label: 'lc.street.c.corn', emoji: '🌽', tint: '#F2F2EF', re: /\bcorn\b|bhutta|grill|kebab|tandoor/i },
  { k: 'dairy', label: 'lc.street.c.dairy', emoji: '🥛', tint: '#EEF3FF', re: /dairy|milk|doodh|curd|dahi|paneer/i },
];
const typesOf = (s: StoreCard, m: Menu | undefined) => {
  const text = [s.name, s.description ?? '', ...s.cuisines, ...(m?.categories.map((c) => c.name) ?? [])].join(' ');
  return new Set(TYPES.filter((ty) => ty.re.test(text)).map((ty) => ty.k));
};

type Sort = 'near' | 'rating' | 'time';
interface Filters {
  type: CartType | null;
  kind: string | null;
  open: boolean;
  near: boolean;
  top: boolean;
  sort: Sort;
}
const NO_FILTERS: Filters = { type: null, kind: null, open: false, near: false, top: false, sort: 'near' };

// L1 Street Cart (/shops?v=STREET): the street and society vendors that deliver to the chosen location, what they
// sell and how far each one is. Vendors are shops on Delivez like any other (store type STREET_VENDOR / SOCIETY_VENDOR).
export default function Street({ at }: { at: DeliverTo }) {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  const [params] = useSearchParams();
  const overview = useOverview();
  const offers = useOffers();
  const nearby = useNearby(at, null, '');
  const basket = useBasket();
  const [typed, setTyped] = useState(params.get('q') ?? '');
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const fee = overview.data?.deliveryFee ?? 3000;

  // Vendors that deliver here, nearest first.
  const vendors = useMemo(() => (nearby.data?.stores ?? []).filter((s) => isVendor(s) && s.delivers).sort((a, b) => a.distanceKm - b.distanceKm), [nearby.data]);
  const open = vendors.filter((s) => s.open);
  const kinds = Object.keys(KIND).filter((k) => vendors.some((s) => s.storeType === k));
  const menus = useQueries({ queries: vendors.slice(0, MENUS).map((s) => ({ ...menuQuery(s.slug ?? s.id, at), staleTime: 60_000 })) });
  const byId = new Map(menus.map((q) => q.data).filter((m): m is Menu => !!m).map((m) => [m.store.id, m]));
  const typeOf = new Map(vendors.map((s) => [s.id, typesOf(s, byId.get(s.id))]));
  const types = TYPES.map((ty) => ({ ...ty, n: vendors.filter((s) => typeOf.get(s.id)!.has(ty.k)).length })).filter((ty) => ty.n > 0);
  const shown = vendors
    .filter((s) => (!f.type || typeOf.get(s.id)!.has(f.type)) && (!f.kind || s.storeType === f.kind) && (!f.open || s.open) && (!f.near || s.distanceKm <= NEAR) && (!f.top || (s.rating?.avg ?? 0) >= TOP))
    .sort(f.sort === 'rating' ? (a, b) => (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0) : f.sort === 'time' ? (a, b) => Number(b.open) - Number(a.open) || a.etaMinutes - b.etaMinutes : (a, b) => a.distanceKm - b.distanceKm);

  const aisleOf = (m: Menu, categoryId: string | null) => m.categories.find((c) => c.id === categoryId)?.name ?? '';
  // Items of the open vendors, taking turns so one vendor doesn't fill the row.
  const lists = open.map((s) => byId.get(s.id)).filter((m): m is Menu => !!m && m.store.open).map((m) => m.products.filter((p) => p.available).map((p) => ({ p, m })));
  const items: { p: Menu['products'][number]; m: Menu }[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) lists.forEach((l) => l[i] && items.push(l[i]));

  const needle = typed.trim().toLowerCase();
  const searching = needle.length >= 2;
  const vendorHits = searching ? vendors.filter((s) => `${s.name} ${s.description ?? ''}`.toLowerCase().includes(needle)).slice(0, 4) : [];
  const itemHits = searching ? [...byId.values()].flatMap((m) => m.products.filter((p) => p.available && p.name.toLowerCase().includes(needle)).map((p) => ({ p, m }))).slice(0, 6) : [];

  const avgEta = open.length ? Math.round(open.reduce((n, s) => n + s.etaMinutes, 0) / open.length) : 0;
  const streetOffers = relevantOffers(offers.data ?? [], 'LOCAL_STORES', vendors.map((s) => s.name));
  const storeIds = useMemo(() => vendors.map((s) => s.id), [vendors]);

  const join: [MsgKey, MsgKey][] = [
    ['lc.street.j1', 'lc.street.j1b'],
    ['lc.street.j2', 'lc.street.j2b'],
    ['lc.street.j3', 'lc.street.j3b'],
    ['lc.street.j4', 'lc.street.j4b'],
  ];
  const faq = [
    { q: t('lc.street.fq1'), a: t('lc.street.fa1') },
    { q: t('lc.street.fq2'), a: t('lc.street.fa2', { fee: rupees(fee) }) },
    { q: t('lc.vp.fq1'), a: t('lc.vp.fa1') },
    { q: t('lc.vp.fqOne'), a: t('lc.vp.faOne') },
    { q: t('lc.street.fq3'), a: t('lc.street.fa3') },
    { q: t('lc.faq.q2'), a: t('lc.faq.a2') },
    { q: t('lc.faq.q3'), a: t('lc.faq.a3') },
  ];

  return (
    <div className="min-h-screen bg-white pb-28" data-page="street">
      <AppHeader wide="xl" />

      <section className="relative overflow-hidden text-white" style={{ background: ORANGE }}>
        <div className="mx-auto grid max-w-[1320px] items-center gap-[30px] px-4 pb-10 pt-[34px] sm:px-6 lg:grid-cols-2">
          <div className="min-w-0">
            <Crumbs here={t('lc.v.STREET')} />
            <KindBadge v="STREET" color="#FFB066" />
            <h1 className="vp-tight m-0 text-[clamp(44px,5.6vw,84px)]">
              <span className="block">{t('lc.street.h1a')}</span>
              <span className="block text-dz-yellow">{t('lc.street.h1b')}</span>
            </h1>
            <p className="mb-[18px] mt-3.5 max-w-[540px] text-[17px] text-[#FFE3D2]">{t('lc.street.lede')}</p>
            <ZeroPanel fee={fee} />
            <HeroSearch value={typed} onChange={setTyped} placeholder={t('lc.street.qPh')}>
              {vendorHits.map((s) => (
                <HitRow
                  key={s.id}
                  emoji={look(s)}
                  tint={tintFor(s.id)}
                  title={s.name}
                  sub={[t(KIND[s.storeType]), km(s.distanceKm), s.open ? t('lc.store.mins', { n: s.etaMinutes }) : t('lc.store.closed')].join(' · ')}
                  action={t('lc.vp.menu')}
                  to={`/s/${s.slug ?? s.id}`}
                />
              ))}
              {itemHits.map(({ p, m }) => (
                <HitRow
                  key={p.id}
                  emoji={p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : itemEmoji(p.name, aisleOf(m, p.categoryId))}
                  tint={tintFor(m.store.id)}
                  title={p.name}
                  sub={t('lc.vp.at', { price: rupees(simpleLine(p).unitPrice), store: m.store.name })}
                  action={t('lc.add')}
                  onClick={() => basket.add(m.store, p)}
                />
              ))}
              {!vendorHits.length && !itemHits.length && <NoHits />}
            </HeroSearch>
            <div className="mt-[18px] flex flex-wrap gap-[22px] text-sm font-bold">
              {open.length > 0 && <Stat n={open.length} label={t('lc.street.statOpen')} />}
              {vendors.length > 0 && <Stat n={km(vendors[0].distanceKm)} label={t('lc.street.statNear')} />}
              {avgEta > 0 && <Stat n={avgEta} label={t('lc.vp.statEta')} />}
            </div>
          </div>
          <StreetArt vendors={vendors.slice(0, 4)} />
        </div>
      </section>

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <LiveOrders className="-mt-5 mb-2" />
        </div>
      )}

      <Band id="carts">
        <SectionHead title={t('lc.street.listTitle')} intro={t('lc.street.listIntro')} />
        {types.length > 0 && (
          <div className="dz-scroll-x -mx-4 mb-4 flex gap-2.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0 lg:grid-cols-11" role="group" aria-label={t('lc.street.typesLabel')}>
            <CatTile label={t('lc.street.c.all')} emoji="🛒" tint="#000" on={!f.type} onClick={() => setF({ ...f, type: null })} accent={ORANGE} dark count={vendors.length} />
            {types.map((ty) => (
              <CatTile key={ty.k} label={t(ty.label)} emoji={ty.emoji} tint={ty.tint} on={f.type === ty.k} onClick={() => setF({ ...f, type: f.type === ty.k ? null : ty.k })} accent={ORANGE} count={ty.n} />
            ))}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('lc.vp.filters')}>
          {kinds.length > 1 &&
            kinds.map((k) => (
              <FilterChip key={k} on={f.kind === k} onClick={() => setF({ ...f, kind: f.kind === k ? null : k })}>
                {t(KIND[k])}
              </FilterChip>
            ))}
          <FilterChip on={f.open} onClick={() => setF({ ...f, open: !f.open })}>
            {t('lc.food.fOpen')}
          </FilterChip>
          <FilterChip on={f.near} onClick={() => setF({ ...f, near: !f.near })}>
            {t('lc.street.fNear', { d: km(NEAR) })}
          </FilterChip>
          <FilterChip on={f.top} onClick={() => setF({ ...f, top: !f.top })}>
            {t('lc.food.fTop', { n: TOP })}
          </FilterChip>
          <SortSelect
            value={f.sort}
            onChange={(sort) => setF({ ...f, sort })}
            options={[
              ['near', t('lc.street.s.near')],
              ['rating', t('lc.food.s.rating')],
              ['time', t('lc.food.s.time')],
            ]}
          />
        </div>

        {nearby.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[124px] rounded-[22px]" />
            ))}
          </div>
        ) : nearby.isError ? (
          <p className="rounded-3xl bg-soft p-8 text-center text-ink-2">{t('lc.err.load')}</p>
        ) : !vendors.length ? (
          <div className="rounded-3xl bg-soft p-10 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-dz-yellow-soft">
              <StoreIcon className="h-8 w-8 text-ink-2" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold">{t('lc.street.noneTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{t('lc.street.noneBody')}</p>
          </div>
        ) : !shown.length ? (
          <div className="rounded-3xl bg-soft p-10 text-center text-ink-2">
            {t('lc.street.none')}{' '}
            <button type="button" onClick={() => setF(NO_FILTERS)} className="font-extrabold text-black underline">
              {t('lc.vp.clear')}
            </button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {shown.map((s) => (
              <li key={s.id}>
                <VendorCard s={s} />
              </li>
            ))}
          </ul>
        )}
      </Band>

      {vendors.length > 0 && (
        <Band id="vendors" paper>
          <SectionHead title={t('lc.street.mapTitle')} intro={t('lc.street.mapIntro')} />
          <VendorMap vendors={vendors} menus={byId} basket={basket} centre={at.title} />
        </Band>
      )}

      {items.length > 0 && (
        <Band id="items">
          <SectionHead title={t('lc.street.itemsTitle')} intro={t('lc.street.itemsIntro')} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[73.8125rem]:grid-cols-6">
            {items.slice(0, 18).map(({ p, m }) => (
              <ItemCard key={p.id} p={p} shop={m.store} emoji={itemEmoji(p.name, aisleOf(m, p.categoryId))} tint={tintFor(m.store.id)} tag={t('lc.store.mins', { n: m.store.etaMinutes })} tone="orange" basket={basket} />
            ))}
          </div>
        </Band>
      )}

      <Band id="tools">
        <SectionHead title={t('lc.street.toolsTitle')} intro={t('lc.street.toolsIntro')} />
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeCard />
          <AskCard />
        </div>
      </Band>

      <HowBand art="🛒" awning={ORANGE} steps={['lc.site.t1', 'lc.site.t2', 'lc.site.t3', 'lc.site.t4']} />

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 pb-6 sm:px-6">
          <OrderAgain storeIds={storeIds} />
        </div>
      )}

      <Band id="support" paper>
        <SectionHead title={t('lc.street.impTitle')} intro={t('lc.street.impIntro')} />
        <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ...(vendors.length
              ? [
                  [String(vendors.length), t('lc.street.impNear')],
                  [String(open.length), t('lc.street.impOpen')],
                ]
              : []),
            ['0%', t('lc.street.impComm')],
            [t('lc.street.impWeekly'), t('lc.street.impPay')],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col-reverse gap-1 rounded-[20px] border border-line bg-white p-[18px]">
              <dt className="text-[13.5px] font-bold text-ink-2">{label}</dt>
              <dd className="m-0 font-display text-[clamp(30px,3.4vw,44px)] leading-none text-[#C2470B]">{n}</dd>
            </div>
          ))}
        </dl>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {join.map(([title, body], k) => (
            <li key={title} className="grid content-start gap-1.5 rounded-[20px] bg-black p-[18px] text-white">
              <em className="font-display text-4xl not-italic leading-none text-dz-yellow">{k + 1}</em>
              <b className="font-display text-xl">{t(title)}</b>
              <small className="text-[13.5px] text-[#A5A5A0]">{t(body)}</small>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <a href={PARTNERS_URL} className="rounded-xl bg-dz-yellow px-4 py-3 font-extrabold text-black transition hover:-translate-y-0.5">
            {t('lc.street.impList')}
          </a>
          <Link to="/shops" className="rounded-xl bg-black px-4 py-3 font-extrabold text-white transition hover:-translate-y-0.5">
            {t('lc.street.impShops')}
          </Link>
        </div>
      </Band>

      <Band id="offers">
        <SectionHead title={t('lc.cp.title')} intro={streetOffers.length ? t('lc.vp.offersIntro') : undefined} />
        <OfferTickets offers={streetOffers} />
      </Band>

      <Band id="partner" paper>
        <PartnerTiles emoji="🛒" title={t('lc.street.pTitle')} body={t('lc.street.pBody')} other="EAT" otherEmoji="🍽️" />
      </Band>

      <Band id="faq">
        <SectionHead title={t('lc.site.faqTitle')} />
        <FaqDetails items={faq} />
      </Band>

      {basket.ui}
    </div>
  );
}

function Stat({ n, label }: { n: ReactNode; label: string }) {
  return (
    <span>
      <b className="block font-display text-[30px] leading-none text-dz-yellow">{n}</b>
      {label}
    </span>
  );
}

/** A street of stalls: the nearest real vendors (sign, what they sell, open or not), faded stalls in the empty spots. */
function StreetArt({ vendors }: { vendors: StoreCard[] }) {
  const { t } = useI18n();
  const filler = ['🍉', '🥥', '🌼', '☕'];
  const sign = (s: string) => (s.length > 14 ? `${s.slice(0, 13)}…` : s).toUpperCase();
  return (
    <div className="relative hidden aspect-[1.35] overflow-hidden rounded-3xl sm:block" aria-hidden data-street-art>
      <svg viewBox="0 0 540 400" className="block h-full w-full">
        <rect width="540" height="400" fill="#FFD9A8" />
        <rect y="250" width="540" height="150" fill="#3A3A3A" />
        <rect y="320" width="540" height="6" fill="#FFD400" opacity=".7" />
        {[12, 144, 276, 408].map((x, i) => {
          const v = vendors[i];
          return (
            <g key={x} opacity={v ? 1 : 0.4}>
              <rect x={x} y="70" width="120" height="180" fill={v ? tintFor(v.id) : '#FFF4E6'} stroke="#000" strokeWidth="3" />
              <path d={`M${x - 4} 70 L ${x + 124} 70 L ${x + 112} 46 L ${x + 8} 46 Z`} fill={i % 2 ? '#E8130F' : '#F26B1D'} stroke="#000" strokeWidth="3" />
              {[0, 1, 2, 3, 4].map((k) => (
                <rect key={k} x={x + k * 24} y="70" width="12" height="14" fill="#fff" opacity=".7" />
              ))}
              {v && (
                <>
                  <rect x={x + 8} y="94" width="104" height="22" rx="4" fill="#000" />
                  <text x={x + 60} y="110" textAnchor="middle" fill="#FFD400" fontSize="11" fontWeight="900">
                    {sign(v.name)}
                  </text>
                </>
              )}
              <text x={x + 60} y="182" textAnchor="middle" fontSize="50">
                {v ? look(v) : filler[i]}
              </text>
              {v && (
                <>
                  <rect x={x + 22} y="200" width="76" height="22" rx="4" fill={v.open ? '#17803A' : '#5E5E5A'} />
                  <text x={x + 60} y="215" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">
                    {v.open ? t('lc.street.open') : t('lc.street.closed')}
                  </text>
                </>
              )}
            </g>
          );
        })}
        <g className="vp-ride">
          <g transform="translate(0 285)">
            <rect x="-26" y="-14" width="34" height="22" rx="4" fill="#FFD400" stroke="#000" strokeWidth="2" />
            <text x="-9" y="2" textAnchor="middle" fontSize="8" fontWeight="900">
              DELIVEZ
            </text>
            <text x="16" y="6" fontSize="26">
              🛵
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

function VendorCard({ s }: { s: StoreCard }) {
  const { t, locale } = useI18n();
  const img = s.coverUrl ?? s.logoUrl;
  const when = s.open ? t('lc.store.mins', { n: s.etaMinutes }) : s.opensAt ? t('lc.store.opensAt', { time: opensAtLabel(s.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed');
  return (
    <Link to={`/s/${s.slug ?? s.id}`} className="grid grid-cols-[96px_1fr] items-center gap-3.5 rounded-[22px] border border-line bg-white p-3.5 transition hover:-translate-y-[3px] hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]" data-vendor={s.id}>
      <span className="relative grid h-24 w-24 place-items-center rounded-[20px] text-[48px]" style={{ background: tintFor(s.id) }}>
        {img ? <img src={img} alt="" loading="lazy" className={`absolute inset-0 h-full w-full rounded-[20px] object-cover ${s.open ? '' : 'grayscale'}`} /> : <span className={s.open ? '' : 'grayscale'} aria-hidden>{look(s)}</span>}
        <i className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-black not-italic text-white" style={{ background: s.open ? '#17803A' : '#5E5E5A' }}>
          {s.open ? t('lc.street.open') : t('lc.street.closed')}
        </i>
      </span>
      <span className="min-w-0">
        <b className="block truncate text-[17px]">{s.name}</b>
        <small className="block truncate text-[13px] text-ink-2">{[t(KIND[s.storeType]), s.description].filter(Boolean).join(' · ')}</small>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
          {s.rating && <em className="rounded-[7px] bg-[#17803A] px-[7px] py-px text-xs not-italic text-white">★ {s.rating.avg.toFixed(1)}</em>}
          <span className="rounded-[7px] bg-[#F7F7F5] px-[7px] py-0.5">{km(s.distanceKm)}</span>
          <span className={`rounded-[7px] bg-[#F7F7F5] px-[7px] py-0.5 ${s.open ? '' : 'text-dz-red'}`}>{when}</span>
        </span>
      </span>
    </Link>
  );
}

/** Every vendor on a map around your address, at its real distance and direction; pick one to see what it sells. */
function VendorMap({ vendors, menus, basket, centre }: { vendors: StoreCard[]; menus: Map<string, Menu>; basket: Basket; centre: string }) {
  const { t } = useI18n();
  const [picked, setPicked] = useState(vendors[0].id);
  const sel = vendors.find((v) => v.id === picked) ?? vendors[0];
  const menu = menus.get(sel.id);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="grid content-start gap-2">
        <AroundMap
          points={vendors.map((v) => ({ id: v.id, name: v.name, emoji: look(v), km: v.distanceKm, bearing: v.bearing, open: v.open }))}
          picked={sel.id}
          onPick={setPicked}
          centre={centre}
          accent={ORANGE}
          label={t('lc.street.mapTitle')}
        />
        <small className="text-[13px] text-ink-2">{t('lc.street.mapNote')}</small>
      </div>

      <aside className="grid content-start gap-3 rounded-3xl bg-black p-5 text-white" aria-live="polite" data-vendor-panel>
        <span className="text-sm text-[#A5A5A0]">
          {t(KIND[sel.storeType])} · {km(sel.distanceKm)} · {sel.open ? t('lc.store.mins', { n: sel.etaMinutes }) : t('lc.store.closed')}
        </span>
        <h3 className="vp-tight font-display text-3xl">
          {look(sel)} {sel.name}
        </h3>
        {!menu ? (
          <Skeleton className="h-40 rounded-2xl bg-white/10" />
        ) : (
          <ul className="grid gap-1.5">
            {menu.products
              .filter((p) => p.available)
              .slice(0, 5)
              .map((p) => {
                const qty = basket.qtyOf(menu.store.id, p.id);
                return (
                  <li key={p.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5 rounded-xl bg-[#161616] px-2.5 py-2 text-sm">
                    <span className="text-center text-2xl" aria-hidden>
                      {itemEmoji(p.name, menu.categories.find((c) => c.id === p.categoryId)?.name ?? '')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <small className="text-[#A5A5A0]">{rupees(simpleLine(p).unitPrice)}</small>
                    </span>
                    {!menu.store.open ? null : qty > 0 ? (
                      <CardStepper qty={qty} max={p.maxQty} onChange={(n) => basket.step(menu.store, p, n)} label={p.name} tone="orange" />
                    ) : (
                      <AddButton label={t('lc.addNamed', { name: p.name })} onClick={() => basket.add(menu.store, p)} tone="orange" />
                    )}
                  </li>
                );
              })}
          </ul>
        )}
        <Link to={`/s/${sel.slug ?? sel.id}`} className="justify-self-start rounded-xl bg-dz-yellow px-4 py-2.5 font-extrabold text-black">
          {t('lc.vp.menu')} →
        </Link>
      </aside>
    </div>
  );
}

/** Every order is handed over with a code; the customer sees it on the order page. Collecting at the cart isn't offered yet. */
function CodeCard() {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  return (
    <div className="flex flex-col gap-3.5 rounded-3xl bg-black p-6 text-white" data-code-card>
      <h3 className="vp-tight font-display text-[28px]">🔐 {t('lc.street.codeTitle')}</h3>
      <p className="text-[#CFCFCB]">{t('lc.site.f4b')}</p>
      <div className="flex items-center gap-2" aria-hidden>
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className="grid h-16 w-[52px] place-items-center rounded-2xl bg-[#161616] font-display text-4xl text-dz-yellow ring-1 ring-white/10">
            •
          </span>
        ))}
      </div>
      <small className="text-[#A5A5A0]">{t('lc.street.codeWhere')}</small>
      {token && (
        <Link to="/orders" className="self-start rounded-xl bg-dz-yellow px-4 py-2.5 font-extrabold text-black">
          {t('lc.street.codeOrders')} →
        </Link>
      )}
      <small className="mt-auto border-t border-white/10 pt-3 text-[#A5A5A0]">{t('lc.street.codePickup')}</small>
    </div>
  );
}

const ASKS: MsgKey[] = ['lc.street.ask.s1', 'lc.street.ask.s2', 'lc.street.ask.s3', 'lc.street.ask.s4', 'lc.street.ask.s5'];
const NOTE_MAX = 300;

/** Write how you want it; the note goes to the shop with the order (the checkout's "Note for the shop"). */
function AskCard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const cart = useCart();
  const [note, setNote] = useState('');
  const ready = cart.lines.length > 0 && cart.storeVertical !== 'DIAGNOSTICS';
  const parts = note.split(',').map((x) => x.trim()).filter(Boolean);
  const toggle = (text: string) => setNote((parts.includes(text) ? parts.filter((x) => x !== text) : [...parts, text]).join(', ').slice(0, NOTE_MAX));
  return (
    <div className="grid content-start gap-3.5 rounded-3xl bg-dz-yellow p-6 text-black" data-ask-card>
      <h3 className="vp-tight font-display text-[28px]">✍️ {t('lc.street.askTitle')}</h3>
      <p>{t('lc.street.askBody')}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('lc.street.askIdeas')}>
        {ASKS.map((k) => {
          const text = t(k);
          const on = parts.includes(text);
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => toggle(text)} className={`rounded-full border-[1.5px] border-black px-3 py-1.5 text-[13px] font-bold transition ${on ? 'bg-black text-dz-yellow' : 'bg-white/60 hover:bg-white'}`}>
              {on ? '✓ ' : '+ '}
              {text}
            </button>
          );
        })}
      </div>
      <label className="grid gap-1 text-sm font-bold">
        {t('lc.co.note')}
        <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))} maxLength={NOTE_MAX} rows={2} placeholder={t('lc.co.notePh')} className="min-h-16 rounded-xl border-[1.5px] border-black/20 bg-white px-3 py-2.5 text-[15px] font-normal outline-none focus:border-black" />
      </label>
      {note.trim() && (
        <p className="rounded-xl bg-black/[0.07] px-3 py-2.5 text-sm" aria-live="polite">
          {ready ? t('lc.street.askTo', { store: cart.storeName ?? '' }) : t('lc.street.askPreview')} <b>“{note.trim()}”</b>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" disabled={!ready} onClick={() => navigate('/cart', { state: { note: note.trim() } })} className="rounded-xl bg-black px-4 py-2.5 font-extrabold text-white disabled:opacity-40">
          {t('lc.street.askGo')}
        </button>
        {!ready && <small className="font-semibold">{t('lc.street.askEmpty')}</small>}
      </div>
    </div>
  );
}
