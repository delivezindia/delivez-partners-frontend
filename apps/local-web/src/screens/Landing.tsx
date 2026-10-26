import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, Bike, Languages, LocateFixed, MapPin, Search, ShoppingBag, Store as StoreIcon } from 'lucide-react';
import { useGps } from '../components/LocationSheet';
import { Brand } from '../components/ui';
import { PARTNERS_URL } from '../lib/config';
import { useAuth } from '../lib/auth-store';
import { useI18n, type MsgKey } from '../lib/i18n';
import { ADDRESS_LABEL, VERTICAL_EMOJI, VERTICAL_LABEL } from '../lib/labels';
import { fromAddress, useDeliverTo } from '../lib/location';
import { useAddresses } from '../lib/queries';
import type { Vertical } from '../lib/types';

const VERTICALS: { v: Vertical; blurb: MsgKey; tint: string }[] = [
  { v: 'EAT', blurb: 'lc.land.v.EAT', tint: 'bg-[#fff1e6]' },
  { v: 'GROCERY', blurb: 'lc.land.v.GROCERY', tint: 'bg-dz-green-soft' },
  { v: 'PHARMACY', blurb: 'lc.land.v.PHARMACY', tint: 'bg-dz-red-soft' },
  { v: 'DIAGNOSTICS', blurb: 'lc.land.v.DIAGNOSTICS', tint: 'bg-dz-blue-soft' },
  { v: 'LOCAL_STORES', blurb: 'lc.land.v.LOCAL_STORES', tint: 'bg-dz-yellow-soft' },
];

const STEPS: { icon: typeof Search; title: MsgKey; body: MsgKey }[] = [
  { icon: MapPin, title: 'lc.land.s1', body: 'lc.land.s1b' },
  { icon: ShoppingBag, title: 'lc.land.s2', body: 'lc.land.s2b' },
  { icon: Bike, title: 'lc.land.s3', body: 'lc.land.s3b' },
];

const WHY: { icon: typeof Search; title: MsgKey; body: MsgKey }[] = [
  { icon: StoreIcon, title: 'lc.land.w1', body: 'lc.land.w1b' },
  { icon: Banknote, title: 'lc.land.w2', body: 'lc.land.w2b' },
  { icon: Languages, title: 'lc.land.w3', body: 'lc.land.w3b' },
];

// Home before a location is chosen: what Delivez is, and the way in (location → shops).
export default function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const token = useAuth((s) => s.accessToken);
  const set = useDeliverTo((s) => s.set);
  const addresses = useAddresses();
  const [message, setMessage] = useState('');
  // A category tapped before the location is known is remembered and opened once it is.
  const [want, setWant] = useState<Vertical | null>(null);
  const gps = useGps(() => navigate(want ? `/?v=${want}` : '/', { replace: true }), setMessage);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b-[3px] border-dz-red bg-dz-yellow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Brand />
          {token ? (
            <Link to="/account" className="rounded-full bg-white px-4 py-2 text-sm font-extrabold ring-1 ring-black/10">
              {t('lc.acc.title')}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-full px-3 py-2 text-sm font-extrabold hover:bg-black/5">
                {t('lc.login')}
              </Link>
              <Link to="/signup" className="rounded-full bg-black px-4 py-2 text-sm font-extrabold text-dz-yellow">
                {t('lc.auth.signup')}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero: the one thing to do here is say where you are */}
      <section className="relative overflow-hidden bg-dz-yellow">
        <span className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border-[18px] border-dz-red/90" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-white/40" aria-hidden />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-4 pb-12 pt-10 md:grid-cols-[1.15fr_1fr] md:items-center md:pb-16 md:pt-14">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-dz-red">{t('lc.land.eyebrow')}</p>
            <h1 className="mt-3 text-[clamp(40px,8vw,64px)] leading-[1.02] [html:lang(en)_&]:leading-[0.95]">{t('lc.land.title')}</h1>
            <p className="mt-4 max-w-md text-lg text-ink-2">{t('lc.land.sub')}</p>
          </div>

          <div className="rounded-[20px] bg-white p-5 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.45)] sm:p-6">
            <h2 className="text-2xl">{t('lc.home.whereTitle')}</h2>
            <div className="mt-4 space-y-2.5">
              <button type="button" onClick={gps} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-dz-red px-4 py-3.5 font-extrabold text-white hover:bg-dz-red-deep">
                <LocateFixed className="h-5 w-5" aria-hidden /> {t('lc.loc.useGps')}
              </button>
              <Link to={want ? `/addresses/new?next=${encodeURIComponent(`/?v=${want}`)}` : '/addresses/new'} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-black px-4 py-3.5 font-extrabold hover:bg-soft">
                <Search className="h-5 w-5" aria-hidden /> {t('lc.land.searchMap')}
              </Link>
              {message && <p className="text-sm text-ink-2" role="status">{message}</p>}
            </div>
            {token && (addresses.data?.length ?? 0) > 0 && (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {addresses.data!.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => set(fromAddress(a, t(ADDRESS_LABEL[a.label])))} className="flex w-full items-start gap-2 py-3 text-left hover:text-dz-red">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <b className="block text-sm">{t(ADDRESS_LABEL[a.label])}</b>
                        <span className="block truncate text-xs text-ink-2">{[a.line1, a.landmark, a.cityName].filter(Boolean).join(', ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!token && (
              <p className="mt-4 border-t border-line pt-4 text-center text-sm text-ink-2">
                {t('lc.land.haveAccount')}{' '}
                <Link to="/login" className="font-extrabold text-dz-red underline-offset-2 hover:underline">
                  {t('lc.login')}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* What you can order */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl">{t('lc.land.whatTitle')}</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {VERTICALS.map(({ v, blurb, tint }) => (
            <li key={v} className={v === 'LOCAL_STORES' ? 'col-span-2 sm:col-span-1' : ''}>
              <button
                type="button"
                onClick={() => {
                  setWant(v);
                  setMessage(t('lc.land.pickFirst'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`h-full w-full rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tint}`}
              >
                <span className="text-4xl" aria-hidden>
                  {VERTICAL_EMOJI[v]}
                </span>
                <b className="mt-2 block text-lg">{t(VERTICAL_LABEL[v])}</b>
                <span className="block text-sm text-ink-2">{t(blurb)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="bg-soft">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-3xl">{t('lc.land.howTitle')}</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-black font-black text-dz-yellow">{i + 1}</span>
                  <s.icon className="h-5 w-5 text-dz-red" aria-hidden />
                </span>
                <b className="mt-3 block text-lg">{t(s.title)}</b>
                <span className="text-sm text-ink-2">{t(s.body)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Delivez */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl">{t('lc.land.whyTitle')}</h2>
        <ul className="mt-5 grid gap-5 md:grid-cols-3">
          {WHY.map((w) => (
            <li key={w.title} className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-dz-yellow">
                <w.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <b className="block">{t(w.title)}</b>
                <span className="text-sm text-ink-2">{t(w.body)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* For shop owners */}
      <section className="px-4 pb-12">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 rounded-[20px] bg-black p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-3xl text-dz-yellow">{t('lc.land.shopTitle')}</h2>
            <p className="mt-1 text-white/70">{t('lc.land.shopBody')}</p>
          </div>
          <a href={PARTNERS_URL} className="shrink-0 rounded-[10px] bg-dz-yellow px-5 py-3 font-extrabold text-black hover:bg-dz-yellow-strong">
            {t('lc.land.shopCta')} →
          </a>
        </div>
      </section>

      <footer className="border-t border-line bg-soft">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            <Link to={token ? '/orders' : '/login?next=/orders'}>{t('lc.ord.all')}</Link>
            <Link to={token ? '/account' : '/signup'}>{token ? t('lc.acc.title') : t('lc.auth.signup')}</Link>
            <a href={PARTNERS_URL}>{t('lc.land.shopCta')}</a>
          </nav>
          <span>© {new Date().getFullYear()} Delivez</span>
        </div>
      </footer>
    </div>
  );
}
