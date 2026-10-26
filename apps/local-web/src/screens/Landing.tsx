import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Banknote, Bike, Check, KeyRound, Languages, LocateFixed, MapPin, PackageCheck, Search, ShieldCheck, Store as StoreIcon, TimerReset } from 'lucide-react';
import { useGps } from '../components/LocationSheet';
import { CheckList, FaqList, Section, ShopCtaBand, SITE_VERTICALS, SiteFooter, SiteNavbar } from '../components/site';
import { useAuth } from '../lib/auth-store';
import { useI18n, type MsgKey } from '../lib/i18n';
import { ADDRESS_LABEL, VERTICAL_EMOJI, VERTICAL_LABEL } from '../lib/labels';
import { fromAddress, useDeliverTo } from '../lib/location';
import { useAddresses } from '../lib/queries';
import type { Vertical } from '../lib/types';

const CATEGORY: Record<Vertical, { blurb: MsgKey; examples: MsgKey; tint: string }> = {
  EAT: { blurb: 'lc.land.v.EAT', examples: 'lc.site.ex.EAT', tint: 'bg-[#fff1e6]' },
  GROCERY: { blurb: 'lc.land.v.GROCERY', examples: 'lc.site.ex.GROCERY', tint: 'bg-dz-green-soft' },
  PHARMACY: { blurb: 'lc.land.v.PHARMACY', examples: 'lc.site.ex.PHARMACY', tint: 'bg-dz-red-soft' },
  DIAGNOSTICS: { blurb: 'lc.land.v.DIAGNOSTICS', examples: 'lc.site.ex.DIAGNOSTICS', tint: 'bg-dz-blue-soft' },
  LOCAL_STORES: { blurb: 'lc.land.v.LOCAL_STORES', examples: 'lc.site.ex.LOCAL_STORES', tint: 'bg-dz-yellow-soft' },
};

/** Facts about how the service works — no invented numbers. */
const HIGHLIGHTS: { value: MsgKey; label: MsgKey }[] = [
  { value: 'lc.site.h1v', label: 'lc.site.h1l' },
  { value: 'lc.site.h2v', label: 'lc.site.h2l' },
  { value: 'lc.site.h3v', label: 'lc.site.h3l' },
  { value: 'lc.site.h4v', label: 'lc.site.h4l' },
];

const STEPS: { title: MsgKey; body: MsgKey }[] = [
  { title: 'lc.land.s1', body: 'lc.land.s1b' },
  { title: 'lc.site.s2', body: 'lc.site.s2b' },
  { title: 'lc.land.s2', body: 'lc.land.s2b' },
  { title: 'lc.land.s3', body: 'lc.land.s3b' },
];

const FEATURES: { icon: typeof Search; title: MsgKey; body: MsgKey }[] = [
  { icon: StoreIcon, title: 'lc.land.w1', body: 'lc.land.w1b' },
  { icon: Banknote, title: 'lc.land.w2', body: 'lc.land.w2b' },
  { icon: PackageCheck, title: 'lc.site.f3', body: 'lc.site.f3b' },
  { icon: KeyRound, title: 'lc.site.f4', body: 'lc.site.f4b' },
  { icon: TimerReset, title: 'lc.site.f5', body: 'lc.site.f5b' },
  { icon: Languages, title: 'lc.land.w3', body: 'lc.land.w3b' },
];

const TRACK: { label: MsgKey; body: MsgKey; colour: string }[] = [
  { label: 'lc.step.placed', body: 'lc.site.t1', colour: 'bg-neutral-400' },
  { label: 'lc.os.ACCEPTED', body: 'lc.site.t2', colour: 'bg-state-preparing' },
  { label: 'lc.step.preparing', body: 'lc.site.t3', colour: 'bg-state-almost' },
  { label: 'lc.step.onTheWay', body: 'lc.site.t4', colour: 'bg-state-picked' },
  { label: 'lc.step.delivered', body: 'lc.site.t5', colour: 'bg-state-ready' },
];

const FAQ: { q: MsgKey; a: MsgKey }[] = [
  { q: 'lc.faq.q1', a: 'lc.faq.a1' },
  { q: 'lc.faq.q2', a: 'lc.faq.a2' },
  { q: 'lc.faq.q3', a: 'lc.faq.a3' },
  { q: 'lc.faq.q4', a: 'lc.faq.a4' },
  { q: 'lc.faq.q5', a: 'lc.faq.a5' },
  { q: 'lc.faq.q6', a: 'lc.faq.a6' },
];

// Home before a location is chosen: the Delivez Local public page (same look as the Partners site).
export default function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useAuth((s) => s.accessToken);
  const set = useDeliverTo((s) => s.set);
  const addresses = useAddresses();
  const [message, setMessage] = useState('');
  const card = useRef<HTMLDivElement>(null);
  // A category picked before the location is known (?v=…) opens once the location is set.
  const want = SITE_VERTICALS.find((v) => v === params.get('v')) ?? null;
  const gps = useGps(() => navigate(want ? `/?v=${want}` : '/', { replace: true }), setMessage);

  useEffect(() => {
    document.title = 'Delivez — food, groceries and medicines from shops near you';
  }, []);

  function askLocation() {
    setMessage(t('lc.land.pickFirst'));
    card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  useEffect(() => {
    if (want) askLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);

  const mapHref = want ? `/addresses/new?next=${encodeURIComponent(`/?v=${want}`)}` : '/addresses/new';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNavbar onCategory={() => askLocation()} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-dz-yellow-soft via-dz-yellow-soft/50 to-white px-4 sm:px-6">
          <div className="mx-auto grid max-w-7xl items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="dz-badge">{t('lc.site.badge')}</p>
              <h1 className="mt-5 text-[clamp(42px,6.5vw,76px)]">
                {t('lc.site.heroA')} <span className="text-dz-red">{t('lc.site.heroB')}</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-2">{t('lc.land.sub')}</p>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                {(['lc.site.c1', 'lc.site.c2', 'lc.site.c3'] as const).map((k) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <Check className="h-[18px] w-[18px] text-dz-red" aria-hidden /> {t(k)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-dz-yellow/40" aria-hidden />
              <div ref={card} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
                <h2 className="text-[28px] leading-none">{t('lc.home.whereTitle')}</h2>
                <p className="mt-2 text-sm text-ink-2">{t('lc.site.whereSub')}</p>
                <div className="mt-5 space-y-2.5">
                  <button type="button" onClick={gps} className="dz-btn-red w-full">
                    <LocateFixed className="h-5 w-5" aria-hidden /> {t('lc.loc.useGps')}
                  </button>
                  <Link to={mapHref} className="dz-btn-outline w-full">
                    <Search className="h-5 w-5" aria-hidden /> {t('lc.land.searchMap')}
                  </Link>
                  {message && (
                    <p className="rounded-lg bg-dz-yellow-soft px-3 py-2 text-sm font-semibold" role="status">
                      {message}
                    </p>
                  )}
                </div>
                {token && (addresses.data?.length ?? 0) > 0 && (
                  <>
                    <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-ink-3">{t('lc.loc.saved')}</p>
                    <ul className="mt-1 divide-y divide-line">
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
                  </>
                )}
                {!token && (
                  <p className="mt-5 border-t border-line pt-4 text-center text-sm text-ink-2">
                    {t('lc.land.haveAccount')}{' '}
                    <Link to="/login" className="font-extrabold text-dz-red underline-offset-2 hover:underline">
                      {t('lc.login')}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="border-b border-neutral-200 px-4 sm:px-6">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 py-8 md:grid-cols-4">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label}>
                <p className="text-3xl font-extrabold text-dz-red">{t(h.value)}</p>
                <p className="text-sm text-neutral-600">{t(h.label)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <Section id="categories" eyebrow={t('lc.site.catEyebrow')} title={t('lc.land.whatTitle')} intro={t('lc.site.catIntro')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SITE_VERTICALS.map((v) => (
              <Link key={v} to={`/?v=${v}`} className="group flex flex-col rounded-2xl bg-white p-6 ring-1 ring-neutral-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-neutral-300">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${CATEGORY[v].tint}`} aria-hidden>
                  {VERTICAL_EMOJI[v]}
                </span>
                <h3 className="mt-4 text-lg font-bold">{t(VERTICAL_LABEL[v])}</h3>
                <p className="mt-1 text-sm text-neutral-600">{t(CATEGORY[v].blurb)}</p>
                <p className="mt-3 text-xs text-neutral-500">{t(CATEGORY[v].examples)}</p>
                <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-bold text-dz-red">
                  {t('lc.site.browse')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            ))}
            <div className="flex flex-col justify-between rounded-2xl bg-dz-black p-6 text-white">
              <div>
                <h3 className="text-lg font-bold">{t('lc.site.missingTitle')}</h3>
                <p className="mt-1 text-sm text-neutral-300">{t('lc.site.missingBody')}</p>
              </div>
              <a href="#categories" onClick={(e) => (e.preventDefault(), askLocation())} className="dz-btn-yellow mt-5 w-full">
                {t('lc.loc.choose')}
              </a>
            </div>
          </div>
        </Section>

        {/* Features */}
        <Section className="bg-neutral-50" eyebrow={t('lc.site.whyEyebrow')} title={t('lc.site.whyTitle')} center>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-dz-yellow">
                  <f.icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{t(f.title)}</h3>
                <p className="mt-1 text-sm text-neutral-600">{t(f.body)}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Tracking */}
        <Section eyebrow={t('lc.site.trackEyebrow')} title={t('lc.site.trackTitle')} intro={t('lc.site.trackIntro')}>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <ol className="relative space-y-5 border-l-2 border-neutral-200 pl-6">
              {TRACK.map((s) => (
                <li key={s.label} className="relative">
                  <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ${s.colour}`} />
                  <p className="font-bold">{t(s.label)}</p>
                  <p className="text-sm text-neutral-600">{t(s.body)}</p>
                </li>
              ))}
            </ol>
            <div className="flex justify-center rounded-3xl bg-neutral-100 p-8">
              <TrackingCardMock />
            </div>
          </div>
        </Section>

        {/* How it works */}
        <Section id="how" className="bg-dz-black text-white" eyebrow={t('lc.site.howEyebrow')} title={t('lc.land.howTitle')}>
          <ol className="grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dz-yellow font-extrabold text-dz-black">{i + 1}</span>
                <p className="mt-4 font-bold">{t(s.title)}</p>
                <p className="mt-1 text-sm text-neutral-400">{t(s.body)}</p>
              </li>
            ))}
          </ol>
          <button type="button" onClick={askLocation} className="dz-btn-red mt-8">
            {t('lc.site.startNow')}
          </button>
        </Section>

        {/* Medicines and lab tests */}
        <Section eyebrow={t('lc.site.healthEyebrow')} title={t('lc.site.healthTitle')} intro={t('lc.site.healthIntro')}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl p-6 ring-1 ring-neutral-200">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dz-red-soft text-2xl" aria-hidden>
                💊
              </span>
              <h3 className="mt-4 text-lg font-bold">{t('lc.v.PHARMACY')}</h3>
              <div className="mt-4">
                <CheckList items={[t('lc.site.rx1'), t('lc.site.rx2'), t('lc.site.rx3')]} />
              </div>
            </div>
            <div className="rounded-2xl p-6 ring-1 ring-neutral-200">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dz-blue-soft text-2xl" aria-hidden>
                🧪
              </span>
              <h3 className="mt-4 text-lg font-bold">{t('lc.v.DIAGNOSTICS')}</h3>
              <div className="mt-4">
                <CheckList items={[t('lc.site.lab1'), t('lc.site.lab2'), t('lc.site.lab3')]} />
              </div>
            </div>
          </div>
          <p className="mt-6 flex items-start gap-2 text-sm text-ink-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-dz-green" aria-hidden /> {t('lc.site.healthNote')}
          </p>
        </Section>

        {/* FAQ */}
        <Section id="faq" className="bg-neutral-50" eyebrow={t('lc.site.faqEyebrow')} title={t('lc.site.faqTitle')}>
          <div className="max-w-3xl">
            <FaqList items={FAQ.map((f) => ({ q: t(f.q), a: t(f.a) }))} />
          </div>
        </Section>

        <div className="pt-20">
          <ShopCtaBand />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Illustrative order-tracking card (not live data), like the Partners site's order card. */
function TrackingCardMock() {
  const { t } = useI18n();
  return (
    <div className="w-full max-w-sm rounded-2xl border-l-8 border-state-picked bg-white p-5 shadow-2xl ring-1 ring-black/5" aria-label={t('lc.site.example')}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">#DEL-482913</span>
        <span className="rounded-full bg-dz-blue-soft px-2 py-0.5 text-xs font-bold text-dz-blue">{t('lc.os.PICKED_UP')}</span>
      </div>
      <p className="mt-2 text-sm text-neutral-500">{t('lc.site.mockShop')}</p>
      <ul className="mt-3 space-y-1 text-sm">
        <li>2 × {t('lc.site.mockItem1')}</li>
        <li>1 × {t('lc.site.mockItem2')}</li>
      </ul>
      <div className="mt-4 rounded-xl bg-dz-yellow p-3 text-center">
        <p className="text-xs font-bold">{t('lc.ord.codeDelivery')}</p>
        <p className="font-display text-3xl tracking-[0.3em]">4 7 1 9</p>
      </div>
      <p className="mt-3 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
        <Bike className="h-4 w-4" aria-hidden /> {t('lc.site.mockRider')}
      </p>
      <p className="mt-2 text-[11px] text-ink-3">{t('lc.site.example')}</p>
    </div>
  );
}
