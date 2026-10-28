import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgePercent, Banknote, Bike, KeyRound, Languages, LayoutGrid, LocateFixed, MapPin, PackageCheck, Search, ShieldCheck, ShoppingCart, Store as StoreIcon, TimerReset, Truck, type LucideIcon } from 'lucide-react';
import { useGps } from '../components/LocationSheet';
import { CheckList, FaqList, Section, ShopCtaBand, SITE_VERTICALS, SiteFooter, SiteNavbar } from '../components/site';
import { useAuth } from '../lib/auth-store';
import { useI18n, type MsgKey } from '../lib/i18n';
import { ADDRESS_LABEL, VERTICAL_LABEL } from '../lib/labels';
import { VERTICAL_LOOK, VerticalIcon } from '../components/VerticalIcon';
import { AiSection, AppSection, AreaCheck, NearbyStores, EcosystemSection, FamilySection, FoodSection, GiftsSection, LocalSection, MerchantsSection, NetworkSection, OffersSection, PharmacySection, RushSection, SearchSection, ShopByType, SpecialtySection, SupportSection, WhyNowSection } from '../components/NowSections';
import { fromAddress, useDeliverTo } from '../lib/location';
import { useAddresses } from '../lib/queries';
import type { Vertical } from '../lib/types';

const CATEGORY: Record<Vertical, { blurb: MsgKey; examples: MsgKey }> = {
  EAT: { blurb: 'lc.land.v.EAT', examples: 'lc.site.ex.EAT' },
  GROCERY: { blurb: 'lc.land.v.GROCERY', examples: 'lc.site.ex.GROCERY' },
  PHARMACY: { blurb: 'lc.land.v.PHARMACY', examples: 'lc.site.ex.PHARMACY' },
  DIAGNOSTICS: { blurb: 'lc.land.v.DIAGNOSTICS', examples: 'lc.site.ex.DIAGNOSTICS' },
  LOCAL_STORES: { blurb: 'lc.land.v.LOCAL_STORES', examples: 'lc.site.ex.LOCAL_STORES' },
};

/** Facts about how the service works — no invented numbers. */
const HIGHLIGHTS: { icon: LucideIcon; value: MsgKey; label: MsgKey }[] = [
  { icon: LayoutGrid, value: 'lc.site.h1v', label: 'lc.site.h1l' },
  { icon: Truck, value: 'lc.site.h2v', label: 'lc.site.h2l' },
  { icon: Languages, value: 'lc.site.h3v', label: 'lc.site.h3l' },
  { icon: PackageCheck, value: 'lc.site.h4v', label: 'lc.site.h4l' },
];

const PERKS: { icon: LucideIcon; key: MsgKey }[] = [
  { icon: KeyRound, key: 'lc.site.c1' },
  { icon: BadgePercent, key: 'lc.site.c2' },
  { icon: TimerReset, key: 'lc.site.c3' },
];

const STEPS: { icon: LucideIcon; title: MsgKey; body: MsgKey }[] = [
  { icon: MapPin, title: 'lc.land.s1', body: 'lc.land.s1b' },
  { icon: StoreIcon, title: 'lc.site.s2', body: 'lc.site.s2b' },
  { icon: ShoppingCart, title: 'lc.land.s2', body: 'lc.land.s2b' },
  { icon: Bike, title: 'lc.land.s3', body: 'lc.land.s3b' },
];

const FEATURES: { icon: LucideIcon; title: MsgKey; body: MsgKey }[] = [
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

// Home before a location is chosen: the customer app public page (same look as the Partners site).
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

  // "How it works": light up one step at a time (off for reduced motion).
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setStep((n) => (n + 1) % STEPS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const mapHref = want ? `/addresses/new?next=${encodeURIComponent(`/?v=${want}`)}` : '/addresses/new';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNavbar onCategory={() => askLocation()} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-black px-4 text-white sm:px-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(800px 460px at 85% 100%, rgba(255,212,0,.22), transparent 62%), radial-gradient(520px 320px at 8% 0%, rgba(232,19,15,.22), transparent 60%)' }}
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em] text-dz-yellow">
                <MapPin className="h-4 w-4" aria-hidden /> {t('lc.site.badge')}
              </p>
              <h1 className="mt-4 text-[clamp(42px,6.4vw,84px)] leading-[0.92]">
                {t('lc.site.heroA')} <span className="text-dz-yellow">{t('lc.site.heroB')}</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-neutral-300">{t('lc.land.sub')}</p>
              <div className="mt-6 flex flex-wrap gap-2" data-hero-cats>
                {SITE_VERTICALS.map((v) => {
                  const L = VERTICAL_LOOK[v];
                  return (
                    <Link key={v} to={`/?v=${v}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-1.5 pr-3.5 text-sm font-bold text-white transition hover:border-dz-yellow hover:text-dz-yellow">
                      <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: L.accent }} aria-hidden>
                        <L.icon className="h-4 w-4 text-white" />
                      </span>
                      {t(VERTICAL_LABEL[v])}
                    </Link>
                  );
                })}
              </div>
              <ul className="mt-5 flex flex-wrap gap-2">
                {PERKS.map((p) => (
                  <li key={p.key} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121212] px-3 py-1.5 text-[13px] font-semibold text-neutral-200">
                    <p.icon className="h-4 w-4 text-dz-yellow" aria-hidden /> {t(p.key)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div ref={card} className="relative w-full max-w-md rounded-[20px] bg-white p-6 text-ink shadow-[0_30px_60px_rgba(0,0,0,.5)]">
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
        <section className="bg-dz-yellow px-4 sm:px-6">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 py-7 md:grid-cols-4">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-dz-yellow">
                  <h.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[clamp(24px,3vw,36px)] leading-none">{t(h.value)}</p>
                  <p className="text-[13px] font-semibold">{t(h.label)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <AppSection />
        <AreaCheck onStart={askLocation} />

        {/* Categories */}
        <Section id="categories" eyebrow={t('lc.site.catEyebrow')} title={t('lc.land.whatTitle')} intro={t('lc.site.catIntro')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SITE_VERTICALS.map((v) => {
              const L = VERTICAL_LOOK[v];
              return (
                <Link
                  key={v}
                  to={`/?v=${v}`}
                  data-cat={v}
                  className="group relative isolate flex min-h-[230px] flex-col overflow-hidden rounded-3xl border-[1.5px] border-[#ECE8DF] p-5 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_50px_-34px_rgba(0,0,0,.45)]"
                  style={{ background: `linear-gradient(165deg, ${L.tint} 0%, #fff 62%)` }}
                >
                  <span className="absolute inset-x-0 top-0 h-[5px] origin-left scale-x-0 transition duration-300 group-hover:scale-x-100" style={{ background: L.accent }} aria-hidden />
                  <L.icon className="absolute -bottom-6 -right-4 -z-10 h-32 w-32 -rotate-12 opacity-[0.08] transition duration-500 group-hover:rotate-0 group-hover:scale-110" style={{ color: L.accent }} aria-hidden />
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-[0_10px_20px_-12px_rgba(0,0,0,.35)] transition duration-300 group-hover:-rotate-6" style={{ color: L.accent }} aria-hidden>
                    <L.icon className="h-7 w-7" strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-4 text-[22px] leading-tight">{t(VERTICAL_LABEL[v])}</h3>
                  <p className="mt-1 text-sm text-ink-2">{t(CATEGORY[v].blurb)}</p>
                  <p className="mt-2 text-xs text-ink-3">{t(CATEGORY[v].examples)}</p>
                  <span className="mt-auto flex items-center justify-between pt-4 text-sm font-extrabold" style={{ color: L.accent }}>
                    {t('lc.site.browse')}
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-white transition duration-300 group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </span>
                </Link>
              );
            })}
            <div className="flex min-h-[230px] flex-col justify-between rounded-3xl p-6 text-white" style={{ background: 'radial-gradient(420px 260px at 100% 0%, rgba(255,212,0,.3), transparent 60%), radial-gradient(360px 300px at 0% 100%, rgba(232,19,15,.45), transparent 65%), #111' }}>
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

        <ShopByType />
        <NearbyStores onStart={askLocation} />
        <RushSection />
        <FoodSection />
        <PharmacySection />
        <LocalSection />
        <GiftsSection />
        <SpecialtySection />

        {/* Features */}
        <Section className="bg-neutral-50" eyebrow={t('lc.site.whyEyebrow')} title={t('lc.site.whyTitle')} center>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-[20px] bg-black p-6 text-white">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-dz-yellow text-black">
                  <f.icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-4 text-xl text-dz-yellow">{t(f.title)}</h3>
                <p className="mt-1 text-sm text-neutral-300">{t(f.body)}</p>
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
          <ol className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {STEPS.map((s, i) => {
              const on = i === step;
              return (
                <li key={s.title} data-step={i} aria-current={on ? 'step' : undefined} className={`rounded-[20px] p-5 ring-1 transition duration-300 ${on ? 'bg-dz-yellow text-black ring-dz-yellow' : 'bg-white/5 ring-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-display text-4xl leading-none ${on ? 'text-dz-red' : 'text-dz-yellow'}`}>{i + 1}</span>
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${on ? 'bg-black text-dz-yellow' : 'bg-white/10 text-white'}`}>
                      <s.icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <p className="mt-4 font-bold">{t(s.title)}</p>
                  <p className={`mt-1 text-sm ${on ? 'text-black/75' : 'text-neutral-400'}`}>{t(s.body)}</p>
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={askLocation} className="dz-btn-red mt-8">
            {t('lc.site.startNow')}
          </button>
        </Section>

        <SearchSection onStart={askLocation} />
        <OffersSection />

        {/* Medicines and lab tests */}
        <Section eyebrow={t('lc.site.healthEyebrow')} title={t('lc.site.healthTitle')} intro={t('lc.site.healthIntro')}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl p-6 ring-1 ring-neutral-200">
              <VerticalIcon v="PHARMACY" size="lg" />
              <h3 className="mt-4 text-lg font-bold">{t('lc.v.PHARMACY')}</h3>
              <div className="mt-4">
                <CheckList items={[t('lc.site.rx1'), t('lc.site.rx2'), t('lc.site.rx3')]} />
              </div>
            </div>
            <div className="rounded-2xl p-6 ring-1 ring-neutral-200">
              <VerticalIcon v="DIAGNOSTICS" size="lg" />
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

        <MerchantsSection />
        <NetworkSection />
        <AiSection />
        <EcosystemSection />
        <WhyNowSection />
        <SupportSection />

        {/* FAQ */}
        <Section id="faq" className="bg-neutral-50" eyebrow={t('lc.site.faqEyebrow')} title={t('lc.site.faqTitle')}>
          <div className="max-w-3xl">
            <FaqList items={FAQ.map((f) => ({ q: t(f.q), a: t(f.a) }))} />
          </div>
        </Section>

        <FamilySection />

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
