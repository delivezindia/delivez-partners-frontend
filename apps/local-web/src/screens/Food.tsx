import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Store as StoreIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import {
  AddButton,
  Band,
  CardStepper,
  Crumbs,
  FaqDetails,
  FilterChip,
  HeroSearch,
  HitRow,
  HowBand,
  KindBadge,
  NoHits,
  OfferTickets,
  PartnerTiles,
  SectionHead,
  SortSelect,
  ZeroPanel,
  relevantOffers,
  slot,
  useBasket,
  useCycle,
} from '../components/categoryPage';
import { offerTitle } from '../components/CouponBox';
import { LiveOrders, OrderAgain } from '../components/OrderStrips';
import { Skeleton, VegMark } from '../components/ui';
import { useAuth } from '../lib/auth-store';
import { needsOptions, simpleLine } from '../lib/cart';
import { foodEmoji, tintFor } from '../lib/emoji';
import { km, opensAtLabel, rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import type { DeliverTo } from '../lib/location';
import { menuQuery, useNearby, useOffers, useOverview, type PublicOffer } from '../lib/queries';
import type { Menu, Product, StoreCard } from '../lib/types';

const RED = '#E8130F';
/** "Under 30 min" and the ⚡ badge. */
const FAST = 30;
/** "Rated 4+". */
const TOP = 4;
/** Dishes come from the menus of this many open restaurants. */
const MENUS = 6;
const KITCHENS: Record<string, MsgKey> = {
  RESTAURANT: 'lc.food.t.RESTAURANT',
  CLOUD_KITCHEN: 'lc.food.t.CLOUD_KITCHEN',
  BAKERY: 'lc.food.t.BAKERY',
  STREET_VENDOR: 'lc.food.t.STREET_VENDOR',
};

type Sort = 'rel' | 'rating' | 'time' | 'dist';
interface Filters {
  cuisine: string | null;
  open: boolean;
  fast: boolean;
  top: boolean;
  kitchen: string | null;
  sort: Sort;
}
const NO_FILTERS: Filters = { cuisine: null, open: false, fast: false, top: false, kitchen: null, sort: 'rel' };

const isFast = (s: StoreCard) => s.open && s.etaMinutes <= FAST;
const isTop = (s: StoreCard) => (s.rating?.avg ?? 0) >= TOP;
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

// L1 Food (/shops?v=EAT): the Delivez Food page — restaurants near the chosen location, their dishes, live offers.
export default function Food({ at }: { at: DeliverTo }) {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  const [params] = useSearchParams();
  const overview = useOverview();
  const offers = useOffers();
  const nearby = useNearby(at, 'EAT', '');
  const basket = useBasket();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [typed, setTyped] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(typed);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);
  const needle = q.trim().toLowerCase();
  const searching = needle.length >= 2;
  // The server matches restaurant names, cuisines and dishes on every menu.
  const found = useNearby(at, 'EAT', searching ? q : '');

  const stores = useMemo(() => nearby.data?.stores ?? [], [nearby.data]);
  const open = useMemo(() => stores.filter((s) => s.open && s.delivers), [stores]);
  const fee = overview.data?.deliveryFee ?? 3000;
  const eatOffers = relevantOffers(offers.data ?? [], 'EAT', stores.map((s) => s.name));

  // Cuisines near you, the most common first.
  const cuisines = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of stores) for (const c of s.cuisines) n.set(c, (n.get(c) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
  }, [stores]);
  const words = cuisines.length ? cuisines.slice(0, 7) : (overview.data?.verticals.EAT.types.map((x) => x.name).slice(0, 7) ?? []);
  const w = useCycle(words.length, 2200);
  const word = words[w] ?? t('lc.food.craveAny');
  const crave = slot(t, 'lc.food.crave', 'what', null);

  const kitchens = Object.keys(KITCHENS).filter((k) => stores.some((s) => s.storeType === k));
  const shown = useMemo(() => {
    const list = stores.filter((s) => (!f.cuisine || s.cuisines.includes(f.cuisine)) && (!f.open || s.open) && (!f.fast || isFast(s)) && (!f.top || isTop(s)) && (!f.kitchen || s.storeType === f.kitchen));
    if (f.sort === 'rating') return [...list].sort((a, b) => (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0));
    if (f.sort === 'time') return [...list].sort((a, b) => Number(b.open) - Number(a.open) || a.etaMinutes - b.etaMinutes);
    if (f.sort === 'dist') return [...list].sort((a, b) => a.distanceKm - b.distanceKm);
    return list;
  }, [stores, f]);

  // Dishes: the menus of the first open restaurants (same cache as the shop page).
  const menus = useQueries({ queries: open.slice(0, MENUS).map((s) => ({ ...menuQuery(s.slug ?? s.id, at), staleTime: 60_000 })) });
  const loaded = menus.map((m) => m.data).filter((m): m is Menu => !!m && m.store.open);
  const dishes: { p: Product; m: Menu }[] = [];
  const firsts = loaded.map((m) => m.products.filter((p) => p.available).slice(0, 3));
  for (let i = 0; i < 3; i++) firsts.forEach((list, k) => list[i] && dishes.push({ p: list[i], m: loaded[k] }));

  const shopHits = searching ? (found.data?.stores ?? []).slice(0, 5) : [];
  const dishHits = searching ? loaded.flatMap((m) => m.products.filter((p) => p.available && p.name.toLowerCase().includes(needle)).map((p) => ({ p, m }))).slice(0, 6) : [];

  const avgEta = open.length ? Math.round(open.reduce((n, s) => n + s.etaMinutes, 0) / open.length) : 0;
  const fastest = [...open].sort((a, b) => a.etaMinutes - b.etaMinutes)[0];
  const best = stores.filter((s) => s.rating).sort((a, b) => b.rating!.avg - a.rating!.avg)[0];

  const collections = [
    { title: t('lc.food.c.fast'), bg: RED, e: '⚡', n: stores.filter(isFast).length, set: { fast: true, sort: 'time' as Sort } },
    { title: t('lc.food.c.top'), bg: '#17803A', e: '⭐', n: stores.filter(isTop).length, set: { top: true, sort: 'rating' as Sort } },
    { title: t('lc.food.t.CLOUD_KITCHEN'), bg: '#2A0F4A', e: '🍱', n: stores.filter((s) => s.storeType === 'CLOUD_KITCHEN').length, set: { kitchen: 'CLOUD_KITCHEN' } },
    { title: t('lc.food.fOpen'), bg: '#F26B1D', e: '🔥', n: stores.filter((s) => s.open).length, set: { open: true } },
  ].filter((c) => c.n > 0);

  const faq = [
    { q: t('lc.vp.fq1'), a: t('lc.vp.fa1') },
    { q: t('lc.food.fq2'), a: t('lc.food.fa2') },
    { q: t('lc.faq.q1'), a: t('lc.faq.a1', { fee: rupees(fee) }) },
    { q: t('lc.faq.q2'), a: t('lc.faq.a2') },
    { q: t('lc.faq.q3'), a: t('lc.faq.a3') },
    { q: t('lc.faq.q5'), a: t('lc.faq.a5') },
    { q: t('lc.land.shopTitle'), a: t('lc.site.shopBody') },
  ];

  return (
    <div className="min-h-screen bg-white pb-28" data-page="food">
      <AppHeader wide="xl" />

      <section className="relative overflow-hidden text-white" style={{ background: RED }}>
        <div className="mx-auto grid max-w-[1320px] items-center gap-[30px] px-4 pb-[46px] pt-[34px] sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <Crumbs here={t('lc.v.EAT')} />
            <KindBadge v="EAT" color="var(--color-dz-yellow)" />
            <h1 className="vp-tight m-0 text-[clamp(46px,6vw,88px)]">
              {crave.before.trim() && <span className="block">{crave.before.trim()}</span>}
              <span className="block min-h-[1em] text-dz-yellow">
                <i key={w} className="vp-up inline-block not-italic">
                  {word}
                  {crave.after}
                </i>
              </span>
            </h1>
            <p className="mb-[18px] mt-3.5 max-w-[520px] text-[17px] text-[#FFE5E7]">{t('lc.food.lede')}</p>
            <ZeroPanel fee={fee} />
            <HeroSearch value={typed} onChange={setTyped} placeholder={t('lc.food.qPh')}>
              {shopHits.map((s) => (
                <HitRow
                  key={s.id}
                  emoji={foodEmoji(`${s.cuisines[0] ?? ''} ${s.name}`)}
                  tint={tintFor(s.id)}
                  title={s.name}
                  sub={[s.cuisines.slice(0, 2).join(', '), s.rating && `★ ${s.rating.avg.toFixed(1)}`, s.open ? t('lc.store.mins', { n: s.etaMinutes }) : t('lc.store.closed')].filter(Boolean).join(' · ')}
                  action={t('lc.vp.menu')}
                  to={`/s/${s.slug ?? s.id}`}
                />
              ))}
              {dishHits.map(({ p, m }) => (
                <HitRow
                  key={p.id}
                  emoji={p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : foodEmoji(p.name)}
                  tint={tintFor(m.store.id)}
                  title={p.name}
                  sub={t('lc.vp.at', { price: rupees(simpleLine(p).unitPrice), store: m.store.name })}
                  action={t('lc.add')}
                  onClick={() => basket.add(m.store, p)}
                />
              ))}
              {!shopHits.length && !dishHits.length && !found.isFetching && <NoHits />}
            </HeroSearch>
            <div className="mt-[18px] flex flex-wrap gap-[18px] text-sm font-bold">
              {open.length > 0 && <Stat n={open.length} label={t('lc.food.statOpen')} />}
              {avgEta > 0 && <Stat n={avgEta} label={t('lc.vp.statEta')} />}
              <Stat n={t('lc.site.h2v', { fee: rupees(fee) })} label={t('lc.site.h2l')} />
            </div>
          </div>
          <Plate
            emoji={foodEmoji(word)}
            chips={[
              fastest && (
                <>
                  🛵 <b className="font-display text-xl">{t('lc.store.mins', { n: fastest.etaMinutes })}</b> {fastest.name}
                </>
              ),
              best?.rating && (
                <>
                  ⭐ <b className="font-display text-xl">{best.rating.avg.toFixed(1)}</b> {best.name}
                </>
              ),
              <>🧾 {t('lc.site.c2')}</>,
            ]}
          />
        </div>
      </section>

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <LiveOrders className="-mt-5 mb-2" />
        </div>
      )}

      <HowBand art="🍱" awning={RED} steps={['lc.site.t1', 'lc.site.t2', 'lc.site.t3', 'lc.site.t4']} />

      <Band id="restaurants" className="pt-10 sm:pt-10">
        <SectionHead title={t('lc.food.mindTitle')} intro={t('lc.food.mindIntro')} />
        {cuisines.length > 0 && (
          <div className="dz-scroll-x -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 pt-1" role="group" aria-label={t('lc.food.cuisines')}>
            <Cuisine label={t('lc.home.all')} emoji="🍽️" on={!f.cuisine} onClick={() => setF({ ...f, cuisine: null })} />
            {cuisines.map((c) => (
              <Cuisine key={c} label={c} emoji={foodEmoji(c)} on={f.cuisine === c} onClick={() => setF({ ...f, cuisine: f.cuisine === c ? null : c })} />
            ))}
          </div>
        )}
        <div className="mb-4 mt-1.5 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('lc.vp.filters')}>
          <FilterChip on={f.open} onClick={() => setF({ ...f, open: !f.open })}>
            {t('lc.food.fOpen')}
          </FilterChip>
          <FilterChip on={f.fast} onClick={() => setF({ ...f, fast: !f.fast })}>
            {t('lc.food.fFast', { n: FAST })}
          </FilterChip>
          <FilterChip on={f.top} onClick={() => setF({ ...f, top: !f.top })}>
            {t('lc.food.fTop', { n: TOP })}
          </FilterChip>
          {kitchens.length > 1 &&
            kitchens.map((k) => (
              <FilterChip key={k} on={f.kitchen === k} onClick={() => setF({ ...f, kitchen: f.kitchen === k ? null : k })}>
                {t(KITCHENS[k])}
              </FilterChip>
            ))}
          <SortSelect
            value={f.sort}
            onChange={(sort) => setF({ ...f, sort })}
            options={[
              ['rel', t('lc.vp.s.rel')],
              ['rating', t('lc.food.s.rating')],
              ['time', t('lc.food.s.time')],
              ['dist', t('lc.food.s.dist')],
            ]}
          />
        </div>

        {nearby.isLoading ? (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 min-[73.8125rem]:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-[20px]" />
            ))}
          </div>
        ) : nearby.isError ? (
          <p className="rounded-3xl bg-soft p-8 text-center text-ink-2">{t('lc.err.load')}</p>
        ) : !stores.length ? (
          <div className="rounded-3xl bg-soft p-10 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-dz-yellow-soft">
              <StoreIcon className="h-8 w-8 text-ink-2" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold">{t('lc.home.noneTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{t('lc.home.noneBody')}</p>
          </div>
        ) : !shown.length ? (
          <div className="rounded-3xl bg-soft p-10 text-center text-ink-2">
            <div className="text-[52px]" aria-hidden>
              🍽️
            </div>
            {t('lc.food.none')}{' '}
            <button type="button" onClick={() => setF(NO_FILTERS)} className="font-extrabold text-black underline">
              {t('lc.vp.clear')}
            </button>
          </div>
        ) : (
          <ul className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 min-[73.8125rem]:grid-cols-4" aria-live="polite">
            {shown.map((s) => (
              <li key={s.id}>
                <RestaurantCard s={s} offer={eatOffers.find((o) => o.shop === s.name)} />
              </li>
            ))}
          </ul>
        )}
      </Band>

      {collections.length > 0 && (
        <Band id="collections" paper>
          <SectionHead title={t('lc.food.colTitle')} intro={t('lc.food.colIntro')} />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((c) => (
              <button
                key={c.title}
                type="button"
                onClick={() => {
                  setF({ ...NO_FILTERS, ...c.set });
                  scrollTo('restaurants');
                }}
                className="relative grid min-h-[170px] content-between overflow-hidden rounded-[22px] p-5 text-left text-white transition hover:-translate-y-1"
                style={{ background: c.bg }}
              >
                <b className="vp-tight relative max-w-[70%] font-display text-[28px]">{c.title}</b>
                <small className="relative text-[13.5px] font-bold">{c.n === 1 ? t('lc.vp.place1') : t('lc.vp.places', { n: c.n })} →</small>
                <span className="absolute bottom-0 right-2 text-[84px] leading-none" aria-hidden>
                  {c.e}
                </span>
              </button>
            ))}
          </div>
        </Band>
      )}

      {dishes.length > 0 && (
        <Band id="dishes">
          <SectionHead title={t('lc.food.dishTitle')} intro={t('lc.food.dishIntro')} />
          <div className="dz-scroll-x -mx-4 grid auto-cols-[220px] grid-flow-col gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {dishes.map(({ p, m }) => (
              <DishCard key={p.id} p={p} shop={m.store} basket={basket} />
            ))}
          </div>
        </Band>
      )}

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 pb-6 sm:px-6">
          <OrderAgain vertical="EAT" />
        </div>
      )}

      <Band id="offers" paper>
        <SectionHead title={t('lc.cp.title')} intro={eatOffers.length ? t('lc.vp.offersIntro') : undefined} />
        <OfferTickets offers={eatOffers} />
      </Band>

      <Band id="partner">
        <PartnerTiles emoji="👨‍🍳" title={t('lc.food.pTitle')} body={t('lc.food.pBody')} other="GROCERY" otherEmoji="🛒" />
      </Band>

      <Band id="faq" paper>
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
      <b className="block font-display text-[28px] leading-none text-dz-yellow">{n}</b>
      {label}
    </span>
  );
}

/** The spinning plate, with three facts from the restaurants near you. */
function Plate({ emoji, chips }: { emoji: string; chips: ReactNode[] }) {
  const spots = ['left-[-2%] top-[12%]', 'right-[-4%] top-[40%]', 'left-[6%] bottom-[6%]'];
  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-[320px] sm:block lg:max-w-[460px]" aria-hidden>
      <div
        className="absolute inset-[8%] grid place-items-center rounded-full shadow-[0_40px_80px_rgba(0,0,0,0.35)]"
        style={{ background: 'radial-gradient(circle at 50% 45%, #fff 0 56%, #F2F2EF 57% 64%, #fff 65%)', fontSize: 'clamp(110px, 14vw, 190px)' }}
      >
        <span className="vp-spin inline-block leading-none">{emoji}</span>
      </div>
      {chips.map(
        (c, i) =>
          c && (
            <div key={i} className={`absolute flex max-w-[78%] items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-[13px] font-bold text-black shadow-[0_14px_30px_rgba(0,0,0,0.25)] ${spots[i]}`}>
              <span className="truncate">{c}</span>
            </div>
          ),
      )}
    </div>
  );
}

function Cuisine({ label, emoji, on, onClick }: { label: string; emoji: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="group grid w-[104px] shrink-0 justify-items-center gap-2 text-center text-[13.5px] font-extrabold">
      <span className={`grid h-[88px] w-[88px] place-items-center rounded-full border-[3px] text-[44px] transition group-hover:scale-105 ${on ? 'border-[#E8130F] bg-[#FDE2E4]' : 'border-transparent bg-[#F7F7F5]'}`} aria-hidden>
        {emoji}
      </span>
      <span className="line-clamp-2 leading-tight">{label}</span>
    </button>
  );
}

function RestaurantCard({ s, offer }: { s: StoreCard; offer?: PublicOffer }) {
  const { t, locale } = useI18n();
  const img = s.coverUrl ?? s.logoUrl;
  // The shop's own coupon; for a closed shop, when it opens.
  const band = offer ? offerTitle(t, offer) : !s.open ? (s.opensAt ? t('lc.store.opensAt', { time: opensAtLabel(s.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed')) : null;
  return (
    <Link to={`/s/${s.slug ?? s.id}`} className="group grid content-start gap-2.5 rounded-[20px] transition hover:-translate-y-1" data-restaurant={s.id}>
      <span className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[20px] text-[76px]" style={{ background: tintFor(s.id) }}>
        {img ? (
          <img src={img} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 ${s.open ? '' : 'grayscale'}`} />
        ) : (
          <span className={`transition duration-500 group-hover:scale-110 ${s.open ? '' : 'grayscale'}`} aria-hidden>
            {foodEmoji(`${s.cuisines[0] ?? ''} ${s.name}`)}
          </span>
        )}
        {s.busy && <span className="absolute left-2.5 top-2.5 rounded-lg bg-amber-400 px-2 py-[3px] text-[11px] font-extrabold text-black">{t('lc.store.busy')}</span>}
        {isFast(s) && <span className="absolute right-2.5 top-2.5 rounded-lg bg-dz-yellow px-2 py-[3px] text-[11px] font-extrabold text-black">⚡ {t('lc.food.fast')}</span>}
        {band && <span className="vp-tight absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-black/80 px-3.5 pb-2.5 pt-[26px] text-left font-display text-[21px] text-white">{band}</span>}
      </span>
      <span className="min-w-0">
        <b className="block truncate text-[17.5px]">{s.name}</b>
        <span className="mt-0.5 flex items-center gap-2 text-sm font-bold">
          {s.rating && <em className="rounded-[7px] bg-[#17803A] px-[7px] py-px text-[12.5px] not-italic text-white">★ {s.rating.avg.toFixed(1)}</em>}
          {s.open ? t('lc.store.mins', { n: s.etaMinutes }) : <span className="text-dz-red">{t('lc.store.closed')}</span>}
        </span>
        <small className="block truncate text-[13.5px] text-ink-2">{s.cuisines.join(' · ') || t('lc.v.EAT')}</small>
        <small className="block truncate text-[13.5px] text-ink-2">{[s.area, km(s.distanceKm)].filter(Boolean).join(' · ')}</small>
      </span>
    </Link>
  );
}

function DishCard({ p, shop, basket }: { p: Product; shop: Menu['store']; basket: ReturnType<typeof useBasket> }) {
  const { t } = useI18n();
  const qty = basket.qtyOf(shop.id, p.id);
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] border border-line bg-white p-2.5" data-dish={p.id}>
      <div className="grid aspect-[1.3] place-items-center overflow-hidden rounded-[14px] text-[62px]" style={{ background: tintFor(shop.id) }} aria-hidden>
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : foodEmoji(p.name)}
      </div>
      <span className="flex items-start gap-1.5">
        <span className="mt-0.5">
          <VegMark veg={p.isVeg} label={p.isVeg ? t('lc.veg') : t('lc.nonVeg')} />
        </span>
        <b className="line-clamp-2 text-[15px] leading-snug">{p.name}</b>
      </span>
      <Link to={`/s/${shop.slug ?? shop.id}`} className="truncate text-[12.5px] text-ink-2 hover:text-black hover:underline">
        {shop.name}
        {shop.rating ? ` · ★ ${shop.rating.avg.toFixed(1)}` : ''}
      </Link>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="font-black">{rupees(simpleLine(p).unitPrice)}</span>
        {qty > 0 ? (
          <CardStepper qty={qty} max={p.maxQty} onChange={(n) => basket.step(shop, p, n)} label={p.name} tone="black" />
        ) : (
          <AddButton label={t('lc.addNamed', { name: p.name })} onClick={() => basket.add(shop, p)} tone="black" />
        )}
      </div>
      {needsOptions(p) && <small className="text-[10.5px] text-ink-3">{t('lc.customisable')}</small>}
    </div>
  );
}
