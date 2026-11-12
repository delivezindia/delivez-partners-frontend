import { Link } from 'react-router-dom';
import { ArrowRight, Baby, Bike, Croissant, Cpu, HeartPulse, Home, PackageCheck, PawPrint, Pill, Popcorn, ShoppingBasket, ShoppingCart, Smartphone, Sparkles, Store, Warehouse, Wheat, Apple, type LucideIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { Band, Crumbs, FaqDetails, KindBadge, SectionHead } from '../components/categoryPage';
import { useI18n, type MsgKey } from '../lib/i18n';

const PURPLE = '#7B2FD4';

/** What Rush stores will stock. */
const STOCK: { icon: LucideIcon; label: MsgKey }[] = [
  { icon: Wheat, label: 'lc.hm.t.staples' },
  { icon: Apple, label: 'lc.hm.t.fruitVeg' },
  { icon: Croissant, label: 'lc.hm.t.dairyBread' },
  { icon: Popcorn, label: 'lc.hm.t.snacksDrinks' },
  { icon: Sparkles, label: 'lc.hm.t.personalCare' },
  { icon: Home, label: 'lc.hm.t.household' },
  { icon: Baby, label: 'lc.hm.t.baby' },
  { icon: PawPrint, label: 'lc.hm.t.pet' },
  { icon: HeartPulse, label: 'lc.hm.t.health' },
  { icon: Cpu, label: 'lc.hm.t.electronics' },
];

const HOW: { icon: LucideIcon; title: MsgKey; body: MsgKey }[] = [
  { icon: Warehouse, title: 'lc.rush.w1', body: 'lc.rush.w1b' },
  { icon: PackageCheck, title: 'lc.rush.w2', body: 'lc.rush.w2b' },
  { icon: Bike, title: 'lc.rush.w3', body: 'lc.rush.w3b' },
  { icon: Smartphone, title: 'lc.rush.w4', body: 'lc.rush.w4b' },
];

/** Shops already on Delivez that sell what Rush will, for now. */
const MEANWHILE: { icon: LucideIcon; label: MsgKey; to: string; tint: string; accent: string }[] = [
  { icon: ShoppingBasket, label: 'lc.v.GROCERY', to: '/shops?v=GROCERY', tint: '#E3F4E8', accent: '#17803A' },
  { icon: Pill, label: 'lc.v.PHARMACY', to: '/shops?v=PHARMACY', tint: '#E6EEFB', accent: '#1E5BB8' },
  { icon: ShoppingCart, label: 'lc.v.STREET', to: '/shops?v=STREET', tint: '#FFE8D6', accent: '#C2470B' },
  { icon: Store, label: 'lc.v.LOCAL_STORES', to: '/shops?v=LOCAL_STORES', tint: '#F4EEFC', accent: '#7A3FC0' },
];

// L1 Rush (/shops?v=RUSH): Delivez's own quick-commerce stores, stocked from Delivez warehouses. Not open yet, so this
// page says what Rush will be and sends people to the shops that already deliver the same things.
export default function Rush() {
  const { t } = useI18n();
  const faq = [
    { q: t('lc.rush.fq1'), a: t('lc.rush.fa1') },
    { q: t('lc.rush.fq2'), a: t('lc.rush.fa2') },
    { q: t('lc.rush.fq3'), a: t('lc.rush.fa3') },
  ];
  return (
    <div className="min-h-screen bg-white pb-28" data-page="rush">
      <AppHeader wide="xl" />

      <section className="relative overflow-hidden text-white" style={{ background: `linear-gradient(150deg,#2A0F4A 0%,#4B1B86 55%,${PURPLE} 100%)` }}>
        <div className="mx-auto grid max-w-[1320px] items-center gap-[30px] px-4 pb-12 pt-[34px] sm:px-6 lg:grid-cols-2">
          <div className="min-w-0">
            <Crumbs here={t('lc.v.RUSH')} />
            <KindBadge v="RUSH" color="#FFE08A" />
            <p className="mb-3 inline-flex rounded-full bg-dz-yellow px-3 py-1 text-xs font-black uppercase tracking-wide text-black" data-rush-soon>
              {t('lc.rush.soonTag')}
            </p>
            <h1 className="vp-tight m-0 text-[clamp(44px,5.6vw,84px)]">
              <span className="block">{t('lc.rush.h1a')}</span>
              <span className="block text-dz-yellow">{t('lc.rush.h1b')}</span>
            </h1>
            <p className="mb-4 mt-3.5 max-w-[560px] text-[17px] text-[#DCCFF2]">{t('lc.rush.lede')}</p>
            <p className="mb-5 max-w-[560px] rounded-2xl bg-white/10 px-4 py-3 text-[15px] font-semibold">{t('lc.rush.note')}</p>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/shops?v=GROCERY" className="inline-flex items-center gap-1.5 rounded-xl bg-dz-yellow px-[18px] py-3 text-sm font-black text-black transition hover:-translate-y-0.5">
                {t('lc.rush.ctaGrocery')} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/shops?v=STREET" className="inline-flex items-center rounded-xl border-[1.5px] border-white/30 px-[18px] py-3 text-sm font-black text-white transition hover:border-white">
                {t('lc.rush.ctaStreet')}
              </Link>
            </div>
          </div>
          <WarehouseArt />
        </div>
      </section>

      <Band id="stock">
        <SectionHead title={t('lc.rush.stockTitle')} intro={t('lc.rush.stockIntro')} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STOCK.map((x) => (
            <li key={x.label} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-4 font-bold">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: '#F1E6FF', color: PURPLE }} aria-hidden>
                <x.icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              {t(x.label)}
            </li>
          ))}
        </ul>
      </Band>

      <Band id="how" paper>
        <SectionHead title={t('lc.rush.howTitle')} />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((x, k) => (
            <li key={x.title} className="grid content-start gap-2 rounded-[20px] bg-black p-5 text-white">
              <span className="flex items-center justify-between">
                <em className="font-display text-4xl not-italic leading-none text-dz-yellow">{k + 1}</em>
                <x.icon className="h-7 w-7 text-[#B98BF0]" aria-hidden />
              </span>
              <b className="font-display text-xl">{t(x.title)}</b>
              <small className="text-[13.5px] text-[#A5A5A0]">{t(x.body)}</small>
            </li>
          ))}
        </ol>
      </Band>

      <Band id="meanwhile">
        <SectionHead title={t('lc.rush.meanTitle')} intro={t('lc.rush.meanIntro')} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {MEANWHILE.map((x) => (
            <Link key={x.to} to={x.to} className="group flex items-center gap-3 rounded-[20px] border border-line bg-white p-4 font-extrabold transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: x.tint, color: x.accent }} aria-hidden>
                <x.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">{t(x.label)}</span>
              <ArrowRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden />
            </Link>
          ))}
        </div>
      </Band>

      <Band id="faq" paper>
        <SectionHead title={t('lc.site.faqTitle')} />
        <FaqDetails items={faq} />
      </Band>
    </div>
  );
}

/** A Delivez warehouse: shelves of stock, a packing table and a rider leaving. Illustration only. */
function WarehouseArt() {
  const boxes = ['🍚', '🥛', '🍞', '🍪', '🧴', '🧻', '🍼', '🦴', '🩹', '🔋', '🍎', '🥤'];
  return (
    <div className="relative hidden aspect-[1.35] overflow-hidden rounded-3xl sm:block" aria-hidden data-rush-art>
      <svg viewBox="0 0 540 400" className="block h-full w-full">
        <rect width="540" height="400" fill="#EFE4FF" />
        <path d="M0 110 L270 30 L540 110 Z" fill="#4B1B86" />
        <rect y="110" width="540" height="12" fill="#2A0F4A" />
        <rect x="200" y="58" width="140" height="30" rx="6" fill="#FFD400" stroke="#000" strokeWidth="3" />
        <text x="270" y="79" textAnchor="middle" fontSize="15" fontWeight="900" fill="#000">
          DELIVEZ RUSH
        </text>
        {[0, 1].map((row) => (
          <g key={row} transform={`translate(28 ${140 + row * 82})`}>
            <rect width="484" height="8" y="66" fill="#2A0F4A" />
            {boxes.slice(row * 6, row * 6 + 6).map((b, i) => (
              <g key={b} transform={`translate(${i * 81} 0)`}>
                <rect width="70" height="64" rx="8" fill="#fff" stroke="#000" strokeWidth="2.5" />
                <text x="35" y="44" textAnchor="middle" fontSize="30">
                  {b}
                </text>
              </g>
            ))}
          </g>
        ))}
        <rect y="318" width="540" height="82" fill="#3A3A3A" />
        <rect y="356" width="540" height="5" fill="#FFD400" opacity=".7" />
        <g className="vp-ride">
          <g transform="translate(0 340)">
            <rect x="-26" y="-14" width="34" height="22" rx="4" fill="#FFD400" stroke="#000" strokeWidth="2" />
            <text x="-9" y="2" textAnchor="middle" fontSize="8" fontWeight="900">
              RUSH
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
