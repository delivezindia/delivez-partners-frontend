import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, CalendarClock, Clock, LayoutGrid, MapPin, Search, Star, Store as StoreIcon, X } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import Landing from './Landing';
import Food from './Food';
import Grocery from './Grocery';
import Rush from './Rush';
import Street from './Street';
import { LiveOrders, OrderAgain } from '../components/OrderStrips';
import { Skeleton } from '../components/ui';
import { km, opensAtLabel, rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { KIND_LABEL, SHOP_PAGES, VERTICAL_LABEL, type ShopPage } from '../lib/labels';
import { KIND_LOOK, VERTICAL_LOOK, VerticalIcon } from '../components/VerticalIcon';
import { useAuth } from '../lib/auth-store';
import { useDeliverTo } from '../lib/location';
import { useNearby } from '../lib/queries';
import { useOrders } from '../lib/orders';
import type { StoreCard, Vertical } from '../lib/types';

const ALL_VERTICALS: Vertical[] = ['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES'];

// L1 Home: greeting + search, live orders, categories, order again, then shops that deliver to (or are near) the chosen location.
export default function Home() {
  const { t } = useI18n();
  const at = useDeliverTo((s) => s.at);
  const token = useAuth((s) => s.accessToken);
  const [params, setParams] = useSearchParams();
  const vertical = (ALL_VERTICALS.find((v) => v === params.get('v')) ?? null) as Vertical | null;
  const page = SHOP_PAGES.find((v) => v === params.get('v')) ?? null;
  const [typed, setTyped] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(typed);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const nearby = useNearby(at, vertical, q);
  const searching = q.trim().length >= 2;
  // "All": take turns between kinds of shop so one category doesn't fill the screen.
  const stores = useMemo(() => {
    const list = nearby.data?.stores ?? [];
    if (vertical || searching) return list;
    const by = ALL_VERTICALS.map((v) => list.filter((s) => s.vertical === v));
    const mixed: StoreCard[] = [];
    for (let i = 0; mixed.length < list.length; i++) by.forEach((g) => g[i] && mixed.push(g[i]));
    return mixed;
  }, [nearby.data, vertical, searching]);
  const setVertical = (v: Vertical | ShopPage | null) => {
    const p = new URLSearchParams(params);
    if (v) p.set('v', v);
    else p.delete('v');
    setParams(p, { replace: true });
  };

  // No location yet: the welcome page asks for one (a category in ?v= opens once it's set).
  if (!at) return <Landing />;
  // Food, groceries, Rush and Street Cart have their own pages; the other kinds of shop use the list below.
  if (vertical === 'EAT') return <Food at={at} />;
  if (vertical === 'GROCERY') return <Grocery at={at} />;
  if (page === 'RUSH') return <Rush at={at} />;
  if (page === 'STREET') return <Street at={at} />;

  return (
    <div className="min-h-screen bg-soft pb-28">
      <AppHeader wide />
      <Hero typed={typed} setTyped={setTyped} area={at.title} />
      <main className="relative mx-auto -mt-6 max-w-5xl px-4">
        {token && <LiveOrders />}

        <section aria-label={t('lc.home.categories')} className="mt-5">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8 sm:px-0">
            <CategoryTile on={!vertical} onClick={() => setVertical(null)} label={t('lc.home.all')} />
            {ALL_VERTICALS.map((v) => (
              <CategoryTile key={v} v={v} on={vertical === v} onClick={() => setVertical(vertical === v ? null : v)} label={t(VERTICAL_LABEL[v])} />
            ))}
            {SHOP_PAGES.map((v) => (
              <CategoryTile key={v} v={v} on={false} onClick={() => setVertical(v)} label={t(KIND_LABEL[v])} />
            ))}
          </div>
        </section>

        {token && !searching && <RateLast />}
        {token && !searching && <OrderAgain />}

        <div className="mb-4 mt-8 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-dz-red">{searching ? t('lc.dash.search') : t('lc.dash.explore')}</p>
            <h2 className="mt-1 text-2xl sm:text-3xl">{searching ? t('lc.home.results', { q: q.trim() }) : vertical ? t(VERTICAL_LABEL[vertical]) : t('lc.home.near')}</h2>
          </div>
          {!nearby.isLoading && stores.length > 0 && <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-2 ring-1 ring-line">{t('lc.dash.shops', { n: stores.length })}</span>}
        </div>

        {nearby.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        ) : nearby.isError ? (
          <p className="rounded-3xl bg-white p-8 text-center text-ink-2 ring-1 ring-line">{t('lc.err.load')}</p>
        ) : stores.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-line">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-dz-yellow-soft">
              <StoreIcon className="h-8 w-8 text-ink-2" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold">{q ? t('lc.home.noMatch') : t('lc.home.noneTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{q ? t('lc.home.noMatchBody') : t('lc.home.noneBody')}</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <li key={s.id}>
                <StoreTile s={s} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function greetingKey(h: number) {
  if (h < 5) return 'lc.dash.night' as const;
  if (h < 12) return 'lc.dash.morning' as const;
  if (h < 17) return 'lc.dash.afternoon' as const;
  if (h < 22) return 'lc.dash.evening' as const;
  return 'lc.dash.night' as const;
}

/** Black hero: greeting, where we deliver, big search. */
function Hero({ typed, setTyped, area }: { typed: string; setTyped: (v: string) => void; area: string }) {
  const { t } = useI18n();
  const name = useAuth((s) => s.user?.fullName?.trim().split(/\s+/)[0]);
  return (
    <section className="relative overflow-hidden bg-black pb-14 pt-8 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-dz-red/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 top-6 h-64 w-64 rounded-full bg-dz-yellow/25 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 ring-1 ring-white/15">
          <MapPin className="h-3.5 w-3.5 text-dz-yellow" aria-hidden /> {t('lc.dash.deliveringTo', { area })}
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
          {t(greetingKey(new Date().getHours()))}
          {name ? <span className="text-dz-yellow">, {name}</span> : null}
        </h1>
        <p className="mt-1 text-white/70">{t('lc.dash.sub')}</p>
        <label className="relative mt-5 block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            type="search"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t('lc.home.search')}
            aria-label={t('lc.home.search')}
            className="h-14 w-full rounded-2xl bg-white pl-12 pr-12 text-[16px] text-black shadow-[0_12px_40px_-12px_rgba(232,19,15,0.55)] outline-none ring-2 ring-transparent transition focus:ring-dz-yellow [&::-webkit-search-cancel-button]:hidden"
          />
          {typed && (
            <button type="button" onClick={() => setTyped('')} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-neutral-100 text-ink-2 hover:bg-neutral-200" aria-label={t('lc.dash.clear')}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </label>
      </div>
    </section>
  );
}

function CategoryTile({ v, on, onClick, label }: { v?: Vertical | ShopPage; on: boolean; onClick: () => void; label: string }) {
  const look = v ? KIND_LOOK[v] : null;
  const Icon = look?.icon ?? LayoutGrid;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`group flex w-[104px] shrink-0 flex-col items-center gap-2 rounded-3xl p-3 text-center transition sm:w-auto ${on ? 'bg-black text-white shadow-lg ring-2 ring-dz-yellow' : 'bg-white ring-1 ring-line hover:-translate-y-0.5 hover:shadow-md hover:ring-black/30'}`}
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-2xl transition group-hover:scale-105"
        style={on ? { background: look?.accent ?? '#FFD60A', color: look ? '#fff' : '#000' } : { background: look?.tint ?? '#FFF8D6', color: look?.accent ?? '#111' }}
        aria-hidden
      >
        <Icon className="h-7 w-7" strokeWidth={2.2} />
      </span>
      <span className="line-clamp-2 text-[13px] font-extrabold leading-tight">{label}</span>
    </button>
  );
}

/** "How was it?" for the latest delivered order not yet rated (last 3 days): a star opens the rating with it picked. */
function RateLast() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data } = useOrders();
  const o = data?.orders.find((x) => x.canRate && x.deliveredAt && Date.now() - new Date(x.deliveredAt).getTime() < 3 * 86400_000);
  if (!o) return null;
  return (
    <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line" data-rate-last={o.id}>
      <VerticalIcon v={o.store.vertical} size="md" />
      <div className="min-w-0 flex-1">
        <b className="block">{t('lc.rate.title', { store: o.store.name })}</b>
        <span className="block text-xs text-ink-2">
          {o.orderNumber} · {t('lc.rate.tapStar')}
        </span>
      </div>
      <div className="flex w-full justify-between sm:w-auto sm:justify-start" role="group" aria-label={t('lc.rate.stars')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={t('lc.rate.nStars', { n })} onClick={() => navigate(`/orders/${o.id}`, { state: { rate: n } })} className="grid h-11 w-11 place-items-center rounded-full hover:bg-dz-yellow-soft" data-rate-star={n}>
            <Star className="h-8 w-8 text-ink-3 hover:fill-dz-yellow hover:text-[#d4a106]" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}

/** Image-led shop card. */
function StoreTile({ s }: { s: StoreCard }) {
  const { t, locale } = useI18n();
  const closed = !s.open && !s.bookable;
  const look = VERTICAL_LOOK[s.vertical];
  const img = s.coverUrl ?? s.logoUrl;
  return (
    <Link to={`/s/${s.slug ?? s.id}`} className="group block overflow-hidden rounded-3xl bg-white ring-1 ring-line transition hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] hover:ring-black/20">
      <div className="relative aspect-[16/9] overflow-hidden" style={img ? undefined : { background: `linear-gradient(135deg, ${look.tint}, #fff 70%)` }}>
        {img ? (
          <img src={img} alt="" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${closed ? 'grayscale' : ''}`} loading="lazy" />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <VerticalIcon v={s.vertical} size="xl" className="shadow-sm transition duration-500 group-hover:scale-110" />
          </span>
        )}
        {img && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" aria-hidden />}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold shadow-sm" style={{ color: look.accent }}>
          <VerticalIcon v={s.vertical} size="sm" bare /> {t(VERTICAL_LABEL[s.vertical])}
        </span>
        {s.rating && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-dz-green px-2 py-1 text-xs font-extrabold text-white shadow-sm">
            {s.rating.avg.toFixed(1)} <Star className="h-3 w-3 fill-current" aria-hidden />
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur">
          {s.bookable ? (
            <>
              <CalendarClock className="h-3.5 w-3.5 text-dz-yellow" aria-hidden /> {t('lc.store.bookSlot')}
            </>
          ) : s.open ? (
            <>
              <Clock className="h-3.5 w-3.5 text-dz-yellow" aria-hidden /> {t('lc.store.mins', { n: s.etaMinutes })}
            </>
          ) : (
            <span className="text-[#FFB4B2]">{s.opensAt ? t('lc.store.opensAt', { time: opensAtLabel(s.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed')}</span>
          )}
        </span>
        {s.busy && <span className="absolute bottom-3 right-3 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-extrabold text-black">{t('lc.store.busy')}</span>}
      </div>
      <div className="p-4">
        <b className="line-clamp-1 text-[17px] leading-tight">{s.name}</b>
        <p className="mt-0.5 truncate text-sm text-ink-2">{s.cuisines.length ? s.cuisines.slice(0, 3).join(' · ') : (s.area ?? t(VERTICAL_LABEL[s.vertical]))}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {km(s.distanceKm)}
          </span>
          {!s.bookable && s.delivers && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${s.deliveryFee === 0 ? 'bg-[#EDF8F0] text-dz-green' : 'bg-soft'}`}>
              <Bike className="h-3.5 w-3.5" aria-hidden /> {s.deliveryFee === 0 ? t('lc.dash.free') : rupees(s.deliveryFee)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
