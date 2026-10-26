import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bike, Clock, MapPin, Search, Star, Store as StoreIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { LocationSheet } from '../components/LocationSheet';
import { Button, Skeleton } from '../components/ui';
import { km, opensAtLabel, rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { VERTICAL_EMOJI, VERTICAL_LABEL } from '../lib/labels';
import { useDeliverTo } from '../lib/location';
import { useNearby } from '../lib/queries';
import type { StoreCard, Vertical } from '../lib/types';

const ALL_VERTICALS: Vertical[] = ['EAT', 'GROCERY', 'PHARMACY', 'DIAGNOSTICS', 'LOCAL_STORES'];

// L1 Home: shops that deliver to (or are near) the chosen location.
export default function Home() {
  const { t } = useI18n();
  const at = useDeliverTo((s) => s.at);
  const [params, setParams] = useSearchParams();
  const vertical = (ALL_VERTICALS.find((v) => v === params.get('v')) ?? null) as Vertical | null;
  const [typed, setTyped] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(typed);
  const [picking, setPicking] = useState(false);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const nearby = useNearby(at, vertical, q);
  const stores = nearby.data?.stores ?? [];
  const setVertical = (v: Vertical | null) => {
    const p = new URLSearchParams(params);
    if (v) p.set('v', v);
    else p.delete('v');
    setParams(p, { replace: true });
  };

  return (
    <div className="min-h-screen bg-soft pb-28">
      <AppHeader />
      {!at ? (
        <section className="mx-auto max-w-md px-4 py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-dz-yellow">
            <MapPin className="h-8 w-8 text-dz-red" aria-hidden />
          </span>
          <h1 className="mt-5 text-4xl">{t('lc.home.whereTitle')}</h1>
          <p className="mt-2 text-ink-2">{t('lc.home.whereBody')}</p>
          <Button className="mt-6 w-full" onClick={() => setPicking(true)}>
            {t('lc.loc.choose')}
          </Button>
          {picking && <LocationSheet onClose={() => setPicking(false)} />}
        </section>
      ) : (
        <main className="mx-auto max-w-3xl px-4">
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              type="search"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t('lc.home.search')}
              aria-label={t('lc.home.search')}
              className="h-12 w-full rounded-xl border-[1.5px] border-line bg-white pl-11 pr-3 outline-none focus:border-black"
            />
          </label>

          <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={t('lc.home.categories')}>
            <Chip on={!vertical} onClick={() => setVertical(null)}>
              {t('lc.home.all')}
            </Chip>
            {ALL_VERTICALS.map((v) => (
              <Chip key={v} on={vertical === v} onClick={() => setVertical(v)}>
                <span aria-hidden>{VERTICAL_EMOJI[v]}</span> {t(VERTICAL_LABEL[v])}
              </Chip>
            ))}
          </nav>

          <h2 className="mb-3 mt-5 text-2xl">{q.trim().length >= 2 ? t('lc.home.results', { q: q.trim() }) : vertical ? t(VERTICAL_LABEL[vertical]) : t('lc.home.near')}</h2>
          {nearby.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : nearby.isError ? (
            <p className="rounded-xl bg-white p-6 text-center text-ink-2">{t('lc.err.load')}</p>
          ) : stores.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center">
              <StoreIcon className="mx-auto h-10 w-10 text-ink-3" aria-hidden />
              <p className="mt-3 font-bold">{q ? t('lc.home.noMatch') : t('lc.home.noneTitle')}</p>
              <p className="mt-1 text-sm text-ink-2">{q ? t('lc.home.noMatchBody') : t('lc.home.noneBody')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {stores.map((s) => (
                <li key={s.id}>
                  <StoreRow s={s} />
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-4 text-sm font-bold transition ${on ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white hover:border-black'}`}
    >
      {children}
    </button>
  );
}

function StoreRow({ s }: { s: StoreCard }) {
  const { t, locale } = useI18n();
  const closed = !s.open && !s.bookable;
  return (
    <Link to={`/s/${s.slug ?? s.id}`} className={`flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-line transition hover:ring-black ${closed ? 'opacity-70' : ''}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-dz-yellow-soft">
        {s.coverUrl || s.logoUrl ? (
          <img src={(s.coverUrl ?? s.logoUrl)!} alt="" className={`h-full w-full object-cover ${closed ? 'grayscale' : ''}`} loading="lazy" />
        ) : (
          <span className="grid h-full w-full place-items-center text-4xl" aria-hidden>
            {VERTICAL_EMOJI[s.vertical]}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <b className="line-clamp-2 text-[17px] leading-tight">{s.name}</b>
          {s.rating && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-dz-green px-1.5 py-0.5 text-xs font-extrabold text-white">
              {s.rating.avg.toFixed(1)} <Star className="h-3 w-3 fill-current" aria-hidden />
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-2">{s.cuisines.length ? s.cuisines.slice(0, 3).join(' · ') : t(VERTICAL_LABEL[s.vertical])}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-2">
          {s.bookable ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {t('lc.store.bookSlot')}
            </span>
          ) : s.open ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {t('lc.store.mins', { n: s.etaMinutes })}
            </span>
          ) : (
            <span className="text-dz-red">{s.opensAt ? t('lc.store.opensAt', { time: opensAtLabel(s.opensAt, locale, t('lc.today'), t('lc.tomorrow')) }) : t('lc.store.closed')}</span>
          )}
          <span>{km(s.distanceKm)}</span>
          {s.bookable ? null : s.delivers ? (
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3.5 w-3.5" aria-hidden /> {rupees(s.deliveryFee)}
            </span>
          ) : (
            <span className="rounded bg-dz-yellow-soft px-1.5 text-ink">{t('lc.store.pickupOnly')}</span>
          )}
          {s.busy && <span className="text-[#b45309]">{t('lc.store.busy')}</span>}
        </p>
      </div>
    </Link>
  );
}
