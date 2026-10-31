import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  useBasket,
  useCycle,
} from '../components/categoryPage';
import { LiveOrders, OrderAgain } from '../components/OrderStrips';
import { Skeleton } from '../components/ui';
import { useAuth } from '../lib/auth-store';
import { simpleLine } from '../lib/cart';
import { aisleLook, isFreshAisle, productEmoji } from '../lib/emoji';
import { km, opensAtLabel, rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import type { DeliverTo } from '../lib/location';
import { menuQuery, useNearby, useOffers, useOverview, type PublicOffer } from '../lib/queries';
import type { Menu, Product, StoreCard } from '../lib/types';

const GREEN = '#17803A';
/** "Under ₹50". */
const CHEAP = 5000;
type Basket = ReturnType<typeof useBasket>;
type Sort = 'rel' | 'low' | 'high' | 'disc';
interface Aisle {
  key: string;
  name: string;
  emoji: string;
  tint: string;
  products: Product[];
}

const off = (p: Product) => (p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
// Simple to add in one tap: in stock, and no add-on that has to be picked.
const oneTap = (p: Product) => p.available && p.addonGroups.every((g) => g.minSelect === 0);

// L1 Grocery (/shops?v=GROCERY): the Delivez Grocery page — one nearby grocery shop's aisles at a time (the cart holds one shop).
export default function Grocery({ at }: { at: DeliverTo }) {
  const { t } = useI18n();
  const token = useAuth((s) => s.accessToken);
  const [params, setParams] = useSearchParams();
  const overview = useOverview();
  const offers = useOffers();
  const nearby = useNearby(at, 'GROCERY', '');
  const basket = useBasket();
  const [typed, setTyped] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(typed);

  useEffect(() => {
    const id = setTimeout(() => setQ(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);
  const needle = q.trim().toLowerCase();
  const searching = needle.length >= 2;
  const found = useNearby(at, 'GROCERY', searching ? q : '');

  // Open shops that deliver here first, then the quickest.
  const shops = useMemo(
    () => [...(nearby.data?.stores ?? [])].sort((a, b) => Number(b.open && b.delivers) - Number(a.open && a.delivers) || a.etaMinutes - b.etaMinutes || a.distanceKm - b.distanceKm),
    [nearby.data],
  );
  const picked = params.get('shop');
  const card = shops.find((s) => (s.slug ?? s.id) === picked) ?? shops[0];
  const menu = useQuery({ ...menuQuery(card ? (card.slug ?? card.id) : '', at), enabled: !!card });
  const data = menu.data;
  const fee = overview.data?.deliveryFee ?? 3000;
  const groceryOffers = relevantOffers(offers.data ?? [], 'GROCERY', shops.map((s) => s.name));
  const pick = (s: StoreCard) => {
    const p = new URLSearchParams(params);
    p.set('shop', s.slug ?? s.id);
    setParams(p, { replace: true });
  };

  const aisles = useMemo<Aisle[]>(() => {
    if (!data) return [];
    return data.categories
      .map((c) => {
        const name = c.id ? c.name : t('lc.store.more');
        return { key: c.id ?? 'more', name, ...aisleLook(name), products: data.products.filter((p) => p.categoryId === c.id) };
      })
      .filter((a) => a.products.length);
  }, [data, t]);
  const aisleOf = useMemo(() => new Map(aisles.flatMap((a) => a.products.map((p) => [p.id, a.name] as const))), [aisles]);
  // The basket in the hero fills with this shop's first items, at their real prices.
  const art = useMemo(() => (data?.products ?? []).filter((p) => p.available).slice(0, 8).map((p) => ({ emoji: productEmoji(p.name, aisleOf.get(p.id) ?? ''), price: simpleLine(p).unitPrice })), [data, aisleOf]);

  const productHits = data && searching ? data.products.filter((p) => oneTap(p) && `${p.name} ${aisleOf.get(p.id) ?? ''}`.toLowerCase().includes(needle)).slice(0, 8) : [];
  const elsewhere = searching ? (found.data?.stores ?? []).filter((s) => s.id !== card?.id).slice(0, 3) : [];
  const canOrder = !!data?.store.open;

  const faq = [
    { q: t('lc.vp.fq1'), a: t('lc.vp.fa1') },
    { q: t('lc.groc.fq2'), a: t('lc.groc.fa2') },
    { q: t('lc.faq.q4'), a: t('lc.faq.a4') },
    { q: t('lc.groc.fq3'), a: t('lc.groc.fa3') },
    { q: t('lc.faq.q1'), a: t('lc.faq.a1', { fee: rupees(fee) }) },
    { q: t('lc.faq.q2'), a: t('lc.faq.a2') },
    { q: t('lc.land.shopTitle'), a: t('lc.site.shopBody') },
  ];

  return (
    <div className="min-h-screen bg-white pb-28" data-page="grocery">
      <AppHeader wide="xl" />

      <section className="relative overflow-hidden bg-[#0E5A28] text-white">
        <div className="mx-auto grid max-w-[1320px] items-center gap-[30px] px-4 pb-11 pt-[34px] sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <Crumbs here={t('lc.v.GROCERY')} />
            <KindBadge v="GROCERY" color="#8BE04E" />
            <h1 className="vp-tight m-0 text-[clamp(46px,6vw,88px)]">
              {t('lc.groc.h1a')} <span className="text-dz-yellow">{t('lc.groc.h1b')}</span>
            </h1>
            <p className="mb-[18px] mt-3.5 max-w-[520px] text-[17px] text-[#D9F2DF]">{t('lc.groc.lede')}</p>
            <ZeroPanel fee={fee} doorCheck />
            {card && <EtaPill card={card} area={at.title} />}
            <HeroSearch value={typed} onChange={setTyped} placeholder={t('lc.groc.qPh')}>
              {productHits.map((p) => (
                <HitRow
                  key={p.id}
                  emoji={p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : productEmoji(p.name, aisleOf.get(p.id) ?? '')}
                  tint={aisleLook(aisleOf.get(p.id) ?? '').tint}
                  title={p.name}
                  sub={t('lc.vp.at', { price: rupees(simpleLine(p).unitPrice), store: data!.store.name })}
                  action={canOrder ? t('lc.add') : ''}
                  onClick={canOrder ? () => basket.add(data!.store, p) : undefined}
                />
              ))}
              {elsewhere.map((s) => (
                <HitRow
                  key={s.id}
                  emoji="🏪"
                  tint="#E3F4E8"
                  title={s.name}
                  sub={[s.open ? t('lc.store.mins', { n: s.etaMinutes }) : t('lc.store.closed'), km(s.distanceKm)].join(' · ')}
                  action={t('lc.groc.switchTo')}
                  onClick={() => {
                    pick(s);
                    scrollTo('shop');
                  }}
                />
              ))}
              {!productHits.length && !elsewhere.length && !found.isFetching && <NoHits />}
            </HeroSearch>
          </div>
          {data && art.length > 0 && <BasketArt key={data.store.id} items={art} />}
        </div>
      </section>

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <LiveOrders className="-mt-5 mb-2" />
        </div>
      )}

      <HowBand art="🛒" awning={GREEN} steps={['lc.site.t1', 'lc.site.t3', 'lc.site.t4', 'lc.site.t5']} />

      {nearby.isLoading || (card && menu.isLoading) ? (
        <Band id="categories">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-[18px]" />
            ))}
          </div>
        </Band>
      ) : nearby.isError || (card && menu.isError) ? (
        <Band id="categories">
          <p className="rounded-3xl bg-soft p-8 text-center text-ink-2">{t('lc.err.load')}</p>
        </Band>
      ) : !card || !data ? (
        <Band id="categories">
          <div className="rounded-3xl bg-soft p-10 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-dz-yellow-soft">
              <StoreIcon className="h-8 w-8 text-ink-2" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold">{t('lc.home.noneTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{t('lc.home.noneBody')}</p>
          </div>
        </Band>
      ) : (
        <>
          <Shelf key={data.store.id} menu={data} aisles={aisles} aisleOf={aisleOf} basket={basket} canOrder={canOrder} picker={shops.length > 1 && <ShopPicker shops={shops} current={card} onPick={pick} />} />
          <Deals menu={data} aisleOf={aisleOf} basket={basket} canOrder={canOrder} offers={groceryOffers} />
          <Monthly key={`m${data.store.id}`} menu={data} aisleOf={aisleOf} basket={basket} canOrder={canOrder} />
          <Recipes menu={data} basket={basket} canOrder={canOrder} />
        </>
      )}

      {token && (
        <div className="mx-auto max-w-[1320px] px-4 pb-6 sm:px-6">
          <OrderAgain vertical="GROCERY" />
        </div>
      )}

      <Journey />

      <Band id="offers" paper>
        <SectionHead title={t('lc.cp.title')} intro={groceryOffers.length ? t('lc.vp.offersIntro') : undefined} />
        <OfferTickets offers={groceryOffers} />
      </Band>

      <Band id="partner">
        <PartnerTiles emoji="🏪" title={t('lc.groc.pTitle')} body={t('lc.groc.pBody')} other="EAT" otherEmoji="🍛" />
      </Band>

      <Band id="faq" paper>
        <SectionHead title={t('lc.site.faqTitle')} />
        <FaqDetails items={faq} />
      </Band>

      {basket.ui}
    </div>
  );
}

/** Yellow "🛵 Delivering to Home · 19 min · from Ravi SuperMart". */
function EtaPill({ card, area }: { card: StoreCard; area: string }) {
  const { t, locale } = useI18n();
  return (
    <div className="mb-3.5 inline-flex items-center gap-3 rounded-2xl bg-dz-yellow px-4 py-2.5 text-black" data-eta>
      <span className="text-[28px]" aria-hidden>
        🛵
      </span>
      <span>
        <small className="block text-[13px] font-extrabold">{t('lc.dash.deliveringTo', { area })}</small>
        <b className="block font-display text-[34px] leading-none tabular-nums">{card.open ? t('lc.store.mins', { n: card.etaMinutes }) : card.opensAt ? t('lc.store.opensAt', { time: opensAtLabel(card.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed')}</b>
        <small className="block text-xs font-semibold">{t('lc.cart.from', { store: card.name })}</small>
      </span>
    </div>
  );
}

const SPOTS: [number, number][] = [
  [8, 28],
  [30, 18],
  [52, 8],
  [66, 26],
  [20, 46],
  [44, 38],
  [64, 48],
  [34, 54],
];

/** Items drop into the basket one by one and the total ticks up. */
function BasketArt({ items }: { items: { emoji: string; price: number }[] }) {
  const { t } = useI18n();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(items.length);
    const id = setInterval(() => setN((x) => Math.min(items.length, x + 1)), 700);
    const stop = setTimeout(() => clearInterval(id), 700 * items.length + 50);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [items.length]);
  const total = items.slice(0, n).reduce((s, it) => s + it.price, 0);
  return (
    <div className="relative mx-auto hidden aspect-[1.1] w-full max-w-[300px] sm:block lg:max-w-[440px]" aria-hidden>
      <div className="absolute inset-x-[8%] bottom-[6%] h-[52%] rounded-[20px_20px_60px_60px] bg-gradient-to-b from-[#C9A26B] to-[#8A6A3B] shadow-[0_30px_60px_rgba(0,0,0,0.35)] before:absolute before:inset-x-[-4%] before:top-[-10px] before:h-[22px] before:rounded-xl before:bg-[#A7834E] before:content-['']" />
      {items.slice(0, n).map((it, i) => (
        <span key={i} className="vp-drop absolute leading-none [text-shadow:0_10px_14px_rgba(0,0,0,0.3)]" style={{ left: `${SPOTS[i][0]}%`, top: `${SPOTS[i][1]}%`, fontSize: 'clamp(46px, 6vw, 74px)' }}>
          {it.emoji}
        </span>
      ))}
      <div className="absolute right-0 top-[4%] rounded-[14px] bg-white px-3 py-2.5 text-[13px] font-extrabold text-black shadow-[0_14px_30px_rgba(0,0,0,0.25)]">
        {t('lc.groc.bTotal')}
        <b className="block font-display text-2xl text-[#17803A]">{rupees(total)}</b>
      </div>
    </div>
  );
}

/** "Shopping from" — the grocery shops near you, one at a time. */
function ShopPicker({ shops, current, onPick }: { shops: StoreCard[]; current: StoreCard; onPick: (s: StoreCard) => void }) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label={t('lc.groc.shopAt')}>
      <span className="mr-1 text-sm font-extrabold text-ink-2">{t('lc.groc.shopAt')}</span>
      {shops.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={s.id === current.id}
          onClick={() => onPick(s)}
          className={`inline-flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-sm font-bold transition ${s.id === current.id ? 'border-[#17803A] bg-[#E3F4E8] text-[#0E4F23]' : 'border-line bg-white hover:border-neutral-400'}`}
          data-shop={s.id}
        >
          {s.name}
          <span className="text-xs font-semibold text-ink-3">{s.open ? t('lc.store.mins', { n: s.etaMinutes }) : t('lc.store.closed')}</span>
        </button>
      ))}
    </div>
  );
}

/** Category tiles, then the shop: aisles down the side, filters and the product grid. */
function Shelf({ menu, aisles, aisleOf, basket, canOrder, picker }: { menu: Menu; aisles: Aisle[]; aisleOf: Map<string, string>; basket: Basket; canOrder: boolean; picker: React.ReactNode }) {
  const { t, locale } = useI18n();
  const shop = menu.store;
  const all: Aisle = { key: 'all', name: t('lc.home.all'), emoji: '🛒', tint: '#FFF4C2', products: menu.products };
  const [on, setOn] = useState('all');
  const [only, setOnly] = useState({ offer: false, cheap: false, fresh: false });
  const [sort, setSort] = useState<Sort>('rel');
  const current = aisles.find((a) => a.key === on) ?? all;
  const hasMonthly = menu.products.filter((p) => oneTap(p) && STAPLE.test(p.name)).length >= 3;

  const list = useMemo(() => {
    const priced = (p: Product) => simpleLine(p).unitPrice;
    const l = current.products.filter((p) => (!only.offer || off(p) > 0) && (!only.cheap || priced(p) <= CHEAP) && (!only.fresh || isFreshAisle(aisleOf.get(p.id) ?? '')));
    if (sort === 'low') return [...l].sort((a, b) => priced(a) - priced(b));
    if (sort === 'high') return [...l].sort((a, b) => priced(b) - priced(a));
    if (sort === 'disc') return [...l].sort((a, b) => off(b) - off(a));
    return l;
  }, [current, only, sort, aisleOf]);

  const tile = (a: Aisle, onClick: () => void, pressed?: boolean) => (
    <button key={a.key} type="button" aria-pressed={pressed} onClick={onClick} className="group grid justify-items-center gap-2 text-center text-[12.5px] font-extrabold leading-tight">
      <span className={`grid aspect-square w-full place-items-center rounded-[20px] text-[40px] transition group-hover:-translate-y-1 ${pressed ? 'shadow-[0_0_0_3px_#17803A]' : ''}`} style={{ background: a.tint }} aria-hidden>
        {a.emoji}
      </span>
      {a.name}
    </button>
  );

  return (
    <>
      <Band id="categories" className="pb-[30px] sm:pb-[30px]">
        <SectionHead title={t('lc.groc.catTitle')} intro={t('lc.groc.catIntro')} />
        {picker}
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 min-[73.8125rem]:grid-cols-10" role="group" aria-label={t('lc.home.categories')}>
          {[all, ...aisles].map((a) =>
            tile(
              a,
              () => {
                setOn(a.key);
                scrollTo('shop');
              },
              on === a.key,
            ),
          )}
          {hasMonthly && tile({ key: 'monthly', name: t('lc.groc.monthly'), emoji: '🗓️', tint: '#FFD400', products: [] }, () => scrollTo('monthly'))}
        </div>
      </Band>

      <Band id="shop" className="pt-5 sm:pt-5">
        <div className="grid items-start gap-5 lg:grid-cols-[220px_1fr]">
          <nav aria-label={t('lc.home.categories')} className="dz-scroll-x flex gap-1 overflow-x-auto rounded-[18px] border border-line bg-white p-2 lg:sticky lg:top-[84px] lg:grid lg:overflow-visible">
            {[all, ...aisles].map((a) => (
              <button
                key={a.key}
                type="button"
                aria-pressed={on === a.key}
                onClick={() => setOn(a.key)}
                className={`grid w-[180px] shrink-0 grid-cols-[36px_1fr] items-center gap-2.5 rounded-xl p-2 text-left text-[13.5px] font-bold lg:w-auto ${on === a.key ? 'bg-[#E3F4E8] text-[#0E4F23] shadow-[inset_4px_0_0_#17803A]' : 'hover:bg-soft'}`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-[10px] text-xl" style={{ background: a.tint }} aria-hidden>
                  {a.emoji}
                </span>
                <span className="min-w-0 truncate">
                  {a.name} <span className="font-semibold text-ink-3">{a.products.length}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="min-w-0">
            {!shop.open && (
              <p className="mb-4 rounded-xl bg-dz-red-soft px-4 py-3 text-sm font-bold text-dz-red">
                {shop.opensAt ? t('lc.store.closedOpens', { time: opensAtLabel(shop.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed')}
              </p>
            )}
            <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('lc.vp.filters')}>
              <h3 className="vp-tight mr-auto font-display text-[30px]">
                {current.emoji} {current.name}
              </h3>
              <FilterChip on={only.offer} onClick={() => setOnly({ ...only, offer: !only.offer })}>
                {t('lc.groc.fOffer')}
              </FilterChip>
              <FilterChip on={only.cheap} onClick={() => setOnly({ ...only, cheap: !only.cheap })}>
                {t('lc.groc.fUnder', { amount: rupees(CHEAP) })}
              </FilterChip>
              <FilterChip on={only.fresh} onClick={() => setOnly({ ...only, fresh: !only.fresh })}>
                {t('lc.groc.fFresh')}
              </FilterChip>
              <SortSelect
                value={sort}
                onChange={setSort}
                options={[
                  ['rel', t('lc.vp.s.rel')],
                  ['low', t('lc.groc.s.low')],
                  ['high', t('lc.groc.s.high')],
                  ['disc', t('lc.groc.s.disc')],
                ]}
              />
            </div>
            {shop.minOrderAmount > 0 && <p className="mb-3 text-sm font-semibold text-ink-2">{t('lc.store.min', { amount: rupees(shop.minOrderAmount) })}</p>}
            {list.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 min-[73.8125rem]:grid-cols-5" aria-live="polite">
                {list.map((p) => (
                  <GroceryCard key={p.id} p={p} shop={shop} aisle={aisleOf.get(p.id) ?? ''} basket={basket} canOrder={canOrder} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-soft p-10 text-center text-ink-2">{t('lc.groc.none')}</p>
            )}
          </div>
        </div>
      </Band>
    </>
  );
}

function GroceryCard({ p, shop, aisle, basket, canOrder }: { p: Product; shop: Menu['store']; aisle: string; basket: Basket; canOrder: boolean }) {
  const { t } = useI18n();
  const [vid, setVid] = useState<string | null>((p.variants.find((v) => v.isDefault) ?? p.variants[0])?.id ?? null);
  const v = p.variants.find((x) => x.id === vid) ?? null;
  const price = p.price + (v?.priceDiff ?? 0);
  // MRP is for the base pack.
  const mrp = p.mrp && !v?.priceDiff ? p.mrp : null;
  const qty = basket.qtyOf(shop.id, p.id, vid);
  const look = aisleLook(aisle);
  return (
    <div className={`flex flex-col gap-1.5 rounded-[18px] border border-line bg-white p-2.5 ${p.available ? '' : 'opacity-70'}`} data-grocery={p.id}>
      <div className={`relative grid aspect-square place-items-center overflow-hidden rounded-[14px] text-[56px] ${p.available ? '' : 'grayscale'}`} style={{ background: look.tint }} aria-hidden>
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : productEmoji(p.name, aisle)}
        {mrp && off(p) > 0 && <span className="absolute left-0 top-2.5 rounded-r-lg bg-[#17803A] px-2 py-[3px] text-[11px] font-extrabold text-white">{t('lc.off', { n: off(p) })}</span>}
        {isFreshAisle(aisle) && <span className="absolute right-2 top-2 rounded-[7px] bg-dz-yellow px-[7px] py-0.5 text-[10.5px] font-extrabold text-black">{t('lc.groc.fresh')}</span>}
        <span className="absolute bottom-2 left-2 rounded-[7px] bg-white px-[7px] py-0.5 text-[10.5px] font-extrabold text-black">⏱ {t('lc.store.mins', { n: shop.etaMinutes })}</span>
      </div>
      <b className="line-clamp-2 min-h-[35px] text-sm leading-tight">{p.name}</b>
      {p.variants.length > 1 ? (
        <select value={vid ?? ''} onChange={(e) => setVid(e.target.value)} aria-label={t('lc.groc.size', { name: p.name })} className="rounded-lg border-[1.5px] border-line bg-white px-1.5 py-[5px] text-[12.5px]">
          {p.variants.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {rupees(p.price + x.priceDiff)}
            </option>
          ))}
        </select>
      ) : (
        <small className="min-h-[18px] text-[12.5px] text-ink-2">{p.unitSize && [p.unitSize, p.unit].filter(Boolean).join(' ')}</small>
      )}
      {p.fewLeft && <small className="text-[11.5px] font-bold text-dz-red">{t('lc.fewLeft', { n: p.fewLeft })}</small>}
      <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
        <span className="text-[15px] font-black">
          {rupees(price)}
          {mrp && mrp > price && <s className="ml-1 text-xs font-medium text-ink-3">{rupees(mrp)}</s>}
        </span>
        {!p.available ? (
          <span className="text-xs font-bold text-ink-3">{t('lc.soldOut')}</span>
        ) : !canOrder ? null : qty > 0 ? (
          <CardStepper qty={qty} max={p.maxQty} onChange={(n) => basket.step(shop, p, n, vid)} label={p.name} tone="green" />
        ) : (
          <AddButton label={t('lc.addNamed', { name: p.name })} onClick={() => basket.add(shop, p, vid)} tone="green" />
        )}
      </div>
    </div>
  );
}

/** Items below MRP, with a countdown when a grocery coupon ends within two days. */
function Deals({ menu, aisleOf, basket, canOrder, offers }: { menu: Menu; aisleOf: Map<string, string>; basket: Basket; canOrder: boolean; offers: PublicOffer[] }) {
  const { t } = useI18n();
  const deals = menu.products.filter((p) => p.available && off(p) > 0).sort((a, b) => off(b) - off(a)).slice(0, 10);
  if (!deals.length) return null;
  const soon = offers.filter((o) => new Date(o.endsAt).getTime() - Date.now() < 48 * 3600_000).sort((a, b) => a.endsAt.localeCompare(b.endsAt))[0];
  return (
    <Band id="deals" paper>
      <div className="mb-4 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        {soon ? <Countdown to={soon.endsAt} label={t('lc.groc.endsIn', { code: soon.code })} /> : <div className="vp-tight justify-self-start rounded-[18px] bg-black px-[18px] py-3.5 font-display text-[42px] text-dz-yellow">{t('lc.groc.upTo', { n: off(deals[0]) })}</div>}
        <SectionHead title={t('lc.groc.dealTitle')} intro={t('lc.groc.dealIntro')} className="m-0" />
      </div>
      <div className="dz-scroll-x -mx-4 grid auto-cols-[200px] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {deals.map((p) => (
          <GroceryCard key={p.id} p={p} shop={menu.store} aisle={aisleOf.get(p.id) ?? ''} basket={basket} canOrder={canOrder} />
        ))}
      </div>
    </Band>
  );
}

function Countdown({ to, label }: { to: string; label: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, new Date(to).getTime() - now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="justify-self-start rounded-[18px] bg-black px-[18px] py-3.5 font-display text-[42px] leading-none tabular-nums text-dz-yellow" role="timer">
      {pad(Math.floor(left / 3600_000))}:{pad(Math.floor((left % 3600_000) / 60_000))}:{pad(Math.floor((left % 60_000) / 1000))}
      <small className="mt-1 block font-sans text-xs font-bold text-[#A5A5A0]">{label}</small>
    </div>
  );
}

const STAPLE = /atta|flour|\brice\b|basmati|\bdal\b|toor|moong|chana|\boil\b|ghee|\bsalt\b|sugar|\btea\b|coffee|milk|detergent|soap|toothpaste|shampoo|masala|biscuit|poha|suji|besan/i;

/** The staples this shop sells, as a list to add in one tap (repeat delivery isn't built yet — it says so). */
function Monthly({ menu, aisleOf, basket, canOrder }: { menu: Menu; aisleOf: Map<string, string>; basket: Basket; canOrder: boolean }) {
  const { t } = useI18n();
  const items = useMemo(() => menu.products.filter((p) => oneTap(p) && STAPLE.test(p.name)).slice(0, 10), [menu]);
  const [rows, setRows] = useState<Record<string, { qty: number; on: boolean }>>({});
  if (items.length < 3) return null;
  const row = (id: string) => rows[id] ?? { qty: 1, on: true };
  const set = (id: string, r: { qty: number; on: boolean }) => setRows({ ...rows, [id]: r });
  const chosen = items.filter((p) => row(p.id).on);
  const count = chosen.reduce((n, p) => n + row(p.id).qty, 0);
  const total = chosen.reduce((n, p) => n + simpleLine(p).unitPrice * row(p.id).qty, 0);
  return (
    <Band id="monthly">
      <SectionHead title={t('lc.groc.monTitle')} intro={t('lc.groc.monIntro')} />
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-1.5">
          {items.map((p) => {
            const r = row(p.id);
            const aisle = aisleOf.get(p.id) ?? '';
            return (
              <div key={p.id} className={`grid grid-cols-[44px_1fr_auto_auto] items-center gap-3 rounded-[14px] border border-line bg-white px-3 py-2 text-sm transition ${r.on ? '' : 'opacity-45'}`} data-monthly={p.id}>
                <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: aisleLook(aisle).tint }} aria-hidden>
                  {productEmoji(p.name, aisle)}
                </span>
                <span className="min-w-0">
                  <b className="block truncate">{p.name}</b>
                  <small className="text-ink-2">{t('lc.groc.each', { price: rupees(simpleLine(p).unitPrice) })}</small>
                </span>
                <CardStepper qty={r.qty} max={p.maxQty} onChange={(n) => set(p.id, { ...r, qty: Math.max(1, n) })} label={p.name} tone="green" />
                <input type="checkbox" checked={r.on} onChange={(e) => set(p.id, { ...r, on: e.target.checked })} aria-label={t('lc.groc.include', { name: p.name })} className="h-5 w-5 accent-[#17803A]" />
              </div>
            );
          })}
        </div>
        <aside className="grid gap-3 rounded-3xl bg-[#0E5A28] p-[22px] text-white lg:sticky lg:top-[84px]" aria-live="polite">
          <h3 className="vp-tight font-display text-3xl">{t('lc.groc.monCard')}</h3>
          <b className="vp-tight font-display text-5xl text-dz-yellow">{rupees(total)}</b>
          <button
            type="button"
            disabled={!count || !canOrder}
            onClick={() => basket.put(menu.store, chosen.map((p) => ({ line: simpleLine(p), qty: row(p.id).qty })))}
            className="min-h-12 rounded-xl bg-dz-yellow px-5 font-black text-black transition hover:bg-dz-yellow-strong disabled:opacity-50"
            data-monthly-add
          >
            {t('lc.groc.monAdd', { n: count, total: rupees(total) })}
          </button>
          <small className="text-[13px] text-[#D9F2DF]">{t('lc.groc.monSoon')}</small>
        </aside>
      </div>
    </Band>
  );
}

/** Dishes and the items this shop has for them; the first ingredient is the one the dish can't do without. */
const RECIPES: { name: MsgKey; e: string; need: RegExp[]; any?: boolean }[] = [
  { name: 'lc.groc.r.chai', e: '🫖', need: [/\btea\b|chai patti/i, /milk/i, /sugar/i, /ginger/i] },
  { name: 'lc.groc.r.dal', e: '🍲', need: [/toor|arhar|moong|masoor|\bdal\b/i, /onion/i, /tomato/i, /ghee|\boil\b/i, /\bsalt\b/i] },
  { name: 'lc.groc.r.paratha', e: '🫓', need: [/atta|wheat flour/i, /potato|aloo/i, /butter|ghee/i, /onion/i] },
  { name: 'lc.groc.r.pulao', e: '🍚', need: [/basmati|\brice\b/i, /onion/i, /tomato/i, /\boil\b|ghee/i, /\bsalt\b/i] },
  { name: 'lc.groc.r.omelette', e: '🍳', need: [/\beggs?\b/i, /bread/i, /butter/i, /onion/i] },
  { name: 'lc.groc.r.bhindi', e: '🥘', need: [/lady ?finger|bhindi|okra/i, /onion/i, /\boil\b/i, /\bsalt\b/i] },
  { name: 'lc.groc.r.fruit', e: '🥗', need: [/banana/i, /apple/i, /pomegranate|anar/i, /papaya|mango|grape|orange/i], any: true },
];

function Recipes({ menu, basket, canOrder }: { menu: Menu; basket: Basket; canOrder: boolean }) {
  const { t } = useI18n();
  const shop = menu.store;
  const cards = RECIPES.map((r) => {
    const items = r.need.map((re) => menu.products.find((p) => oneTap(p) && re.test(p.name))).filter((p, i, all): p is Product => !!p && all.indexOf(p) === i);
    const ok = items.length >= 2 && (r.any || r.need[0].test(items[0].name));
    return ok ? { ...r, items } : null;
  })
    .filter((r) => r !== null)
    .slice(0, 4);
  if (!cards.length) return null;
  return (
    <Band id="recipes" paper>
      <SectionHead title={t('lc.groc.recTitle')} intro={t('lc.groc.recIntro')} />
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((r) => {
          const missing = r.items.filter((p) => !basket.qtyOf(shop.id, p.id));
          return (
            <div key={r.name} className="grid content-start gap-2.5 rounded-[22px] border-[1.5px] border-line bg-white p-[18px]" data-recipe={r.name}>
              <span className="text-[56px] leading-none" aria-hidden>
                {r.e}
              </span>
              <b className="vp-tight font-display text-2xl">{t(r.name)}</b>
              <ul className="grid gap-1 text-[13.5px]">
                {r.items.map((p) => {
                  const have = basket.qtyOf(shop.id, p.id) > 0;
                  return (
                    <li key={p.id} className={`flex justify-between gap-2 ${have ? 'font-bold text-[#17803A]' : ''}`}>
                      <span>
                        {have ? '✓ ' : ''}
                        {p.name}
                      </span>
                      <span>{rupees(simpleLine(p).unitPrice)}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                disabled={!missing.length || !canOrder}
                onClick={() => basket.put(shop, missing.map((p) => ({ line: simpleLine(p), qty: 1 })))}
                className="justify-self-start rounded-xl border-[1.5px] border-[#17803A] bg-[#E3F4E8] px-3.5 py-[7px] text-[13.5px] font-black text-[#17803A] transition hover:bg-[#17803A] hover:text-white disabled:opacity-60 disabled:hover:bg-[#E3F4E8] disabled:hover:text-[#17803A]"
              >
                {!missing.length ? t('lc.groc.allIn') : missing.length < r.items.length ? t('lc.groc.addMissing', { n: missing.length }) : t('lc.groc.addAll', { n: r.items.length })}
              </button>
            </div>
          );
        })}
      </div>
    </Band>
  );
}

/** How a grocery order really goes: order, packing, swaps you approve, the rider, the check at the door. */
const JOURNEY: { e: string; title: MsgKey; body: MsgKey }[] = [
  { e: '🧾', title: 'lc.groc.j1', body: 'lc.site.t1' },
  { e: '🛍️', title: 'lc.groc.j2', body: 'lc.groc.j2b' },
  { e: '🔁', title: 'lc.groc.j3', body: 'lc.groc.j3b' },
  { e: '🛵', title: 'lc.groc.j4', body: 'lc.site.t4' },
  { e: '🤝', title: 'lc.site.f3', body: 'lc.ret.body' },
];

function Journey() {
  const { t } = useI18n();
  const on = useCycle(JOURNEY.length, 2200);
  return (
    <Band id="journey">
      <SectionHead title={t('lc.groc.frTitle')} intro={t('lc.groc.frIntro')} />
      <ol className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
        {JOURNEY.map((j, i) => (
          <li key={j.title} className={`grid content-start gap-2 p-5 transition-colors duration-300 ${i === on ? 'bg-[#E3F4E8]' : 'bg-white'}`}>
            <em className="font-display text-[13px] uppercase not-italic text-[#17803A]">{t('lc.groc.step', { n: i + 1 })}</em>
            <span className="text-[40px] leading-none" aria-hidden>
              {j.e}
            </span>
            <b className="font-display text-[21px]">{t(j.title)}</b>
            <small className="text-[13.5px] text-ink-2">{t(j.body)}</small>
          </li>
        ))}
      </ol>
    </Band>
  );
}
