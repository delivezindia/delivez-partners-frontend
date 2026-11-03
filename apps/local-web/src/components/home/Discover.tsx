import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  Bike,
  Check,
  CircleUserRound,
  Gift,
  Globe,
  Home,
  LayoutGrid,
  MapPin,
  Pill,
  Receipt,
  Repeat,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Star,
  Store,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import en from '@delivez/i18n/locales/en.json';
import { api, ApiError } from '../../lib/api';
import { rupees } from '../../lib/format';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { itemIcon, storeLook } from '../../lib/icons';
import { useOverview } from '../../lib/queries';
import type { Vertical } from '../../lib/types';
import { KIND_LOOK } from '../VerticalIcon';
import { KINDS, NowLogo, NowSection, Soon, inKind, kindOf, placed, useAround, type Kind } from './kit';

// ---------------------------------------------------------------- The app

const PHONE_TILES: { icon: LucideIcon; label: MsgKey; color: string }[] = [
  { icon: Store, label: 'lc.hm.app.nearby', color: '#7A3FC0' },
  { icon: BadgePercent, label: 'lc.hm.offers', color: '#E8130F' },
  { icon: ShoppingBasket, label: 'lc.hm.t.grocery', color: '#17803A' },
  { icon: UtensilsCrossed, label: 'lc.v.EAT', color: '#E8130F' },
  { icon: Pill, label: 'lc.hm.t.pharmacy', color: '#1E5BB8' },
  { icon: Store, label: 'lc.v.LOCAL_STORES', color: '#7A3FC0' },
  { icon: Gift, label: 'lc.hm.t.gifts', color: '#BE185D' },
  { icon: Zap, label: 'lc.v.RUSH', color: '#7B2FD4' },
];
const APP_FEATURES: { icon: LucideIcon; label: MsgKey; body: MsgKey }[] = [
  { icon: ShoppingBag, label: 'lc.hm.app.f1', body: 'lc.hm.app.f1b' },
  { icon: MapPin, label: 'lc.hm.app.f2', body: 'lc.hm.app.f2b' },
  { icon: Zap, label: 'lc.hm.app.f3', body: 'lc.hm.app.f3b' },
  { icon: Repeat, label: 'lc.hm.app.f4', body: 'lc.hm.app.f4b' },
];
const PHONE_NAV: [LucideIcon, MsgKey][] = [
  [Home, 'lc.hm.app.home'],
  [LayoutGrid, 'lc.home.categories'],
  [Search, 'lc.dash.search'],
  [ShoppingCart, 'lc.hm.app.cart'],
  [Receipt, 'lc.hm.app.orders'],
  [CircleUserRound, 'lc.hm.app.account'],
];

export function AppBand() {
  const { t } = useI18n();
  const overview = useOverview().data;
  const a = useAround();
  // The phone shows real shops: two restaurants near you (or the two nearest shops of any kind).
  const eats = a.stores.filter((s) => s.vertical === 'EAT');
  const rows = (eats.length >= 2 ? eats : a.stores).slice(0, 2);
  const kinds = overview ? Object.values(overview.verticals).filter((v) => v.shops > 0).length : 0;
  return (
    <section id="app" className="relative scroll-mt-28 overflow-hidden bg-now-bg px-4 py-[52px] sm:px-6">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(900px 420px at 90% 0%, rgba(255,212,0,.35), transparent 60%), radial-gradient(700px 380px at 0% 100%, rgba(232,19,15,.12), transparent 60%)' }} aria-hidden />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative grid place-items-center py-5">
          <span className="vp-spin absolute aspect-square w-[78%] rounded-full opacity-35 blur-[42px]" style={{ background: 'conic-gradient(from 0deg,#FFD400,#E8130F,#FFD400)' }} aria-hidden />
          <div className="relative w-[288px] -rotate-[4deg] rounded-[40px] bg-black p-2.5 shadow-[0_50px_80px_-40px_rgba(0,0,0,.6)] transition duration-500 hover:rotate-0 hover:-translate-y-1.5" aria-hidden>
            <div className="overflow-hidden rounded-[32px] bg-white text-[#161616]">
              <div className="space-y-2 bg-[#E8130F] p-4 pb-3 text-white">
                <b className="block font-display text-lg italic">DELIVEZ NOW</b>
                <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-[#7C7C77]">
                  <Search className="h-3.5 w-3.5" /> {t('lc.hm.searchPh')}
                </span>
              </div>
              <p className="flex items-center gap-1.5 px-3.5 pt-3 text-xs font-extrabold">
                <MapPin className="h-3.5 w-3.5 text-[#E8130F]" /> {a.where ?? t('lc.hm.yourArea')}
              </p>
              <div className="grid grid-cols-4 gap-1.5 p-3">
                {PHONE_TILES.map((x) => (
                  <span key={x.label} className="grid justify-items-center gap-1 rounded-xl bg-[#F6F6F4] px-0.5 py-2 text-center text-[9.5px] font-extrabold leading-tight">
                    <x.icon className="h-[18px] w-[18px]" style={{ color: x.color }} strokeWidth={2.2} />
                    {t(x.label)}
                  </span>
                ))}
              </div>
              <p className="mx-3 flex items-center gap-1.5 rounded-xl bg-[#E8130F] px-3 py-2.5 text-[11px] font-extrabold text-white">
                <Zap className="h-3.5 w-3.5" /> {t('lc.hm.kindBlurb.RUSH')}
              </p>
              <ul className="space-y-1 px-3 pb-2 pt-2">
                {rows.map((s) => {
                  const L = storeLook(s);
                  return (
                    <li key={s.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: L.bg }}>
                        <L.icon className="h-4 w-4 text-white" />
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-[12px]">{s.name}</b>
                        <small className="flex items-center gap-1 text-[10.5px] text-[#5E5E5A]">
                          {s.rating && (
                            <>
                              <Star className="h-3 w-3 fill-[#FFD400] text-[#FFD400]" /> {s.rating.avg.toFixed(1)} ·
                            </>
                          )}{' '}
                          {t('lc.store.mins', { n: s.etaMinutes })}
                        </small>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="grid grid-cols-6 border-t border-[#E4E4E0] px-1 py-2 text-[8.5px] font-bold text-[#7C7C77]">
                {PHONE_NAV.map(([I, l], i) => (
                  <span key={l} className={`grid justify-items-center gap-0.5 ${i === 0 ? 'text-[#E8130F]' : ''}`}>
                    <I className="h-4 w-4" /> {t(l)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Float className="left-0 top-[18%]" icon={Bike} title={t('lc.hm.rush.s4')} sub={t('lc.hm.app.fl1b')} />
          <Float className="bottom-[22%] right-0" icon={ShieldCheck} title={t('lc.hm.app.fl2')} sub={t('lc.hm.app.fl2b')} delay="1.2s" />
          <Float className="bottom-[8%] left-[4%]" icon={BadgePercent} title={t('lc.hm.app.fl3')} sub={t('lc.hm.app.fl3b')} delay="2.2s" />
        </div>
        <div>
          <p className="text-[13.5px] font-extrabold uppercase tracking-[1.4px] text-dz-red">{t('lc.hm.app.tag')}</p>
          <h2 className="mb-3.5 mt-2.5 text-[clamp(34px,4.4vw,58px)] leading-[0.98] text-now-text">
            {t('lc.hm.app.title1')} <span className="text-dz-red">{t('lc.hm.app.title2')}</span>
          </h2>
          <p className="mb-[22px] max-w-[54ch] text-[17px] text-now-muted">{t('lc.hm.app.body')}</p>
          <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
            {APP_FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3 rounded-2xl border border-now-line bg-now-card px-3.5 py-3">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-[#FFF3B0] text-black">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <b className="block text-[14.5px] text-now-text">{t(f.label)}</b>
                  <small className="text-[13px] text-now-muted">{t(f.body)}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {[t('lc.hm.app.android'), t('lc.hm.app.iphone')].map((x) => (
              <span key={x} className="inline-flex items-center gap-2.5 rounded-[14px] bg-[#111] px-[18px] py-2.5 leading-[1.05] text-white">
                <Smartphone className="h-6 w-6" aria-hidden />
                <span>
                  <small className="block text-[10.5px] font-semibold opacity-80">{x}</small>
                  <b className="text-[15px]">{t('lc.rush.soonTag')}</b>
                </span>
              </span>
            ))}
            <a href="#categories" className="inline-flex items-center gap-2 rounded-[14px] border-[1.5px] border-now-line px-[18px] py-3 font-extrabold text-now-text transition hover:border-now-text">
              <Globe className="h-5 w-5" aria-hidden /> {t('lc.hm.app.web')} <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
          {overview && (
            <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[14.5px] text-now-muted" data-app-stats>
              <span>
                <b className="text-[17px] text-now-text">{overview.shops}</b> {t('lc.hm.app.shopsLive')}
              </span>
              <span>
                <b className="text-[17px] text-now-text">{overview.cities.length}</b> {t(overview.cities.length === 1 ? 'lc.hm.app.city' : 'lc.hm.app.cities')}
              </span>
              <span>
                <b className="text-[17px] text-now-text">{kinds}</b> {t('lc.hm.app.kinds')}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Float({ className, icon: Icon, title, sub, delay = '0s' }: { className: string; icon: LucideIcon; title: string; sub: string; delay?: string }) {
  return (
    <span className={`vp-bob absolute z-[2] flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[13px] font-extrabold text-[#161616] shadow-[0_18px_36px_-22px_rgba(0,0,0,.5)] max-sm:hidden ${className}`} style={{ animationDuration: '3.6s', animationDelay: delay }} aria-hidden>
      <Icon className="h-4 w-4 text-[#E8130F]" />
      <span>
        {title}
        <small className="block text-[11.5px] font-semibold text-[#5E5E5A]">{sub}</small>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- Check your area

type AreaAnswer = { pincode: string; live: boolean; city: string | null; liveCities: string[] };
type PinInfo = { serviceable: boolean; zone: { name: string } | null };

export function AreaCheck({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const overview = useOverview().data;
  const { fee } = useAround();
  const [pin, setPin] = useState('');
  const [state, setState] = useState<null | 'bad' | 'error' | 'busy'>(null);
  const [answer, setAnswer] = useState<(AreaAnswer & { zone: string | null }) | null>(null);
  async function check(e: FormEvent) {
    e.preventDefault();
    const p = pin.trim();
    if (!/^[1-9]\d{5}$/.test(p)) return setState('bad');
    setState('busy');
    try {
      const [a, z] = await Promise.all([api<AreaAnswer>(`/local/serviceable/${p}`), api<PinInfo>(`/geo/pincodes/${p}`).catch(() => null)]);
      setAnswer({ ...a, zone: z?.zone?.name ?? null });
      setState(null);
    } catch (err) {
      setState(err instanceof ApiError && err.status === 400 ? 'bad' : 'error');
    }
  }
  const cityShops = answer?.city ? overview?.cities.find((c) => c.name.toLowerCase() === answer.city!.toLowerCase())?.shops : undefined;
  const cells: [string, ReactNode, boolean?][] = answer
    ? [
        ['Delivez Now', answer.live ? t('lc.hm.area.yes') : t('lc.hm.area.no'), answer.live],
        [t('lc.hm.area.city'), answer.city ?? '—'],
        [t('lc.hm.area.area'), answer.zone ?? '—'],
        [answer.city ? t('lc.hm.area.shopsIn', { city: answer.city }) : t('lc.hm.area.shops'), cityShops ?? (answer.live ? '—' : 0)],
        [t('lc.hm.area.fee'), t('lc.hm.area.flat', { fee: rupees(fee) })],
        [t('lc.hm.area.liveIn'), answer.liveCities.join(', ') || '—'],
      ]
    : [];
  return (
    <NowSection id="serviceability" surface tag={t('lc.hm.area.tag')} title={t('lc.hm.area.title')}>
      <div className="grid gap-3 rounded-[22px] border border-white/10 bg-[#07090D] p-4 text-white sm:p-5">
        <form onSubmit={check} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="pin">
            {t('lc.hm.area.pin')}
          </label>
          <input
            id="pin"
            value={pin}
            onChange={(e) => (setPin(e.target.value.replace(/\D/g, '').slice(0, 6)), setState(null))}
            inputMode="numeric"
            placeholder={t('lc.hm.area.pinPh')}
            className="min-h-12 w-full rounded-[10px] border-[1.5px] border-[#2A3140] bg-[#11151D] px-3.5 font-mono text-white placeholder:text-neutral-500 sm:w-[180px]"
            data-pin
          />
          <button type="submit" disabled={state === 'busy'} className="min-h-12 rounded-xl bg-dz-yellow px-[18px] font-black text-black disabled:opacity-60">
            {state === 'busy' ? t('lc.hm.area.checking') : t('lc.hm.area.title')}
          </button>
        </form>
        <div aria-live="polite" data-pin-result={answer ? (answer.live ? 'yes' : 'soon') : (state ?? '')}>
          {state === 'bad' && <p className="font-bold text-[#FF7D84]">{t('lc.hm.area.bad')}</p>}
          {state === 'error' && <p className="font-bold text-[#FF7D84]">{t('lc.hm.area.err')}</p>}
          {!answer && !state && <p className="text-sm text-neutral-400">{t('lc.hm.area.hint')}</p>}
          {answer && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cells.map(([label, value, ok]) => (
                <div key={label} className="rounded-[10px] bg-[#11151D] px-3 py-2.5">
                  <small className="block text-xs text-neutral-400">{label}</small>
                  <b className={`flex items-center gap-1 ${ok === true ? 'text-[#2BD463]' : ok === false ? 'text-dz-yellow' : ''}`}>
                    {ok === true && <Check className="h-4 w-4" aria-hidden />}
                    {value}
                  </b>
                </div>
              ))}
            </div>
          )}
          {answer?.live && (
            <button type="button" onClick={onStart} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
              <MapPin className="h-4 w-4" aria-hidden /> {t('lc.hm.area.exact')}
            </button>
          )}
        </div>
      </div>
    </NowSection>
  );
}

// ---------------------------------------------------------------- Shop by category

/** What each kind's page offers, by type: the Rush page's categories and the Street Cart page's cart types. */
const PAGE_TYPES: Record<'RUSH' | 'STREET', MsgKey[]> = {
  RUSH: ['lc.hm.t.staples', 'lc.hm.t.fruitVeg', 'lc.hm.t.dairyBread', 'lc.hm.t.snacksDrinks', 'lc.hm.t.personalCare', 'lc.hm.t.household', 'lc.hm.t.baby', 'lc.hm.t.pet', 'lc.hm.t.health', 'lc.hm.t.electronics'],
  STREET: ['lc.hm.t.fruit', 'lc.hm.t.vegetables', 'lc.hm.t.chaat', 'lc.hm.t.juice', 'lc.hm.t.tea', 'lc.hm.t.flowers', 'lc.hm.t.iceCream', 'lc.hm.t.tiffin', 'lc.hm.t.corn', 'lc.hm.t.milkDairy'],
};
/** Until shops of a kind are live, the kinds of shop it will have. */
const PLANNED: Record<Vertical, MsgKey[]> = {
  EAT: ['lc.hm.t.restaurants', 'lc.hm.t.cafes', 'lc.hm.t.bakeries', 'lc.hm.t.desserts', 'lc.hm.t.fastFood', 'lc.hm.t.localKitchens', 'lc.hm.t.breakfast', 'lc.hm.t.healthyFood'],
  GROCERY: ['lc.hm.t.fruitsVeg', 'lc.hm.t.dairy', 'lc.hm.t.staples', 'lc.hm.t.snacks', 'lc.hm.t.beverages', 'lc.hm.t.householdEss'],
  PHARMACY: ['lc.hm.t.medicines', 'lc.hm.t.healthcare', 'lc.hm.t.medSupplies', 'lc.hm.t.babyCare', 'lc.hm.t.firstAid', 'lc.hm.t.devices'],
  DIAGNOSTICS: ['lc.hm.t.bloodTests', 'lc.hm.t.packages', 'lc.hm.t.homeCollection', 'lc.hm.t.walkIn'],
  LOCAL_STORES: ['lc.hm.t.electronics', 'lc.hm.t.fashion', 'lc.hm.t.beauty', 'lc.hm.t.homeKitchen', 'lc.hm.t.stationery', 'lc.hm.t.petSupplies'],
};
const LONG = (k: Kind) => `lc.hm.long.${k}` as MsgKey;

export function Categories() {
  const { t } = useI18n();
  const overview = useOverview().data;
  const a = useAround();
  const [on, setOn] = useState<Kind>('EAT');
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setOn((k) => KINDS[(KINDS.findIndex((x) => x.k === k) + 1) % KINDS.length].k), 6000);
    return () => clearInterval(id);
  }, [auto]);
  const count = (k: Kind) => (k === 'RUSH' || k === 'STREET' ? null : (overview?.verticals[k]?.shops ?? null));
  const pick = (k: Kind) => (setAuto(false), setOn(k));
  return (
    <NowSection id="categories" tag={t('lc.hm.cats.tag')} title={t('lc.hm.cats.title')}>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4" data-cats>
        {KINDS.map((x) => {
          const L = KIND_LOOK[x.k];
          const n = count(x.k);
          const near = a.stores.filter((s) => inKind(s, x.k)).length;
          const active = on === x.k;
          return (
            <Link
              key={x.k}
              to={x.to}
              data-cat={x.k}
              onMouseEnter={() => pick(x.k)}
              onFocus={() => pick(x.k)}
              className={`group relative isolate flex min-h-[222px] flex-col overflow-hidden rounded-[24px] border-[1.5px] p-5 text-[#161616] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_50px_-34px_rgba(0,0,0,.45)] ${active ? 'shadow-[0_24px_44px_-30px_rgba(232,19,15,.6)]' : 'border-[#ECE8DF]'}`}
              style={{ background: `linear-gradient(165deg, ${L.tint} 0%, #fff 62%)`, borderColor: active ? L.accent : undefined }}
            >
              <L.icon className="absolute -bottom-5 -right-3 -z-10 h-32 w-32 -rotate-12 opacity-[0.09] transition duration-500 group-hover:rotate-0 group-hover:scale-110" style={{ color: L.accent }} aria-hidden />
              <NowLogo k={x.k} className="h-[42px]" />
              <h3 className="mt-3 font-display text-[23px] leading-tight">{t(x.title)}</h3>
              <p className="mt-1 text-[13.5px] text-[#5E5E5A]">{t(x.blurb)}</p>
              <span className="mt-auto flex items-center gap-2 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE8DF] bg-white px-2.5 py-1 text-xs font-extrabold">
                  <i className="h-2 w-2 rounded-full bg-[#17803A]" aria-hidden />
                  {n === null ? placed(t, a.where, 'lc.hm.cats.near', 'lc.hm.cats.nearYou', { n: near }) : n ? t('lc.hm.nShopsLive', { n }) : t('lc.rush.soonTag')}
                </span>
                <span className="ml-auto grid h-9 w-9 place-items-center rounded-full text-white transition group-hover:translate-x-1" style={{ background: active ? L.accent : '#111' }}>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </span>
              {active && auto && <span key={on} className="absolute inset-x-5 bottom-2 h-[3px] origin-left rounded bg-current" style={{ color: L.accent, animation: 'now-grow 6s linear' }} aria-hidden />}
            </Link>
          );
        })}
        <div className="flex min-h-[222px] flex-col justify-between rounded-[24px] p-6 text-white" style={{ background: 'radial-gradient(420px 260px at 100% 0%, rgba(255,212,0,.3), transparent 60%), radial-gradient(360px 300px at 0% 100%, rgba(232,19,15,.45), transparent 65%), #111' }}>
          <div>
            <h3 className="font-display text-2xl">{t('lc.hm.cats.start')}</h3>
            <p className="mt-1 text-sm text-neutral-300">{t('lc.hm.cats.startBody')}</p>
          </div>
          <a href="#hero-location" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-dz-yellow font-black text-black">
            {t('lc.hm.cats.choose')}
          </a>
        </div>
      </div>
      <KindPanel k={on} onPick={pick} />
    </NowSection>
  );
}

/** The kind picked above: the nearest shop of that kind, how quick and how many, and what it sells by type. */
function KindPanel({ k, onPick }: { k: Kind; onPick: (k: Kind) => void }) {
  const { t } = useI18n();
  const overview = useOverview().data;
  const a = useAround();
  const x = kindOf(k);
  const L = KIND_LOOK[k];
  const near = a.stores.filter((s) => inKind(s, k));
  const open = near.filter((s) => s.open);
  const first = [...open].sort((p, q) => p.etaMinutes - q.etaMinutes)[0];
  // Shown in the reader's language; the icon is picked from the English name.
  const keyed = (key: MsgKey) => ({ name: t(key), en: en[key] });
  const types = k === 'RUSH' || k === 'STREET' ? PAGE_TYPES[k].map(keyed) : overview?.verticals[k]?.types.length ? overview.verticals[k].types.map((x) => ({ name: x.name, en: x.name })) : PLANNED[k].map(keyed);
  const title = t(x.title);
  return (
    <div key={k} className="vp-up mt-3.5 grid overflow-hidden rounded-[24px] border border-now-line bg-now-card lg:grid-cols-[0.9fr_1.1fr]" data-kind-panel={k}>
      <div className="flex flex-col gap-3.5 border-now-line p-6 lg:border-r" style={{ background: `linear-gradient(160deg, ${L.tint}22, transparent 80%)` }}>
        <span className="w-fit rounded-2xl bg-white px-3 py-2">
          <NowLogo k={k} className="h-[40px]" />
        </span>
        <p className="text-[15.5px] text-now-muted">{t(LONG(k))}</p>
        <div className="rounded-2xl border border-now-line bg-now-bg p-4">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[1px] text-now-muted">
            <i className={`h-2 w-2 rounded-full ${first ? 'bg-[#17803A]' : 'bg-neutral-400'}`} aria-hidden /> {placed(t, a.where, 'lc.hm.kp.quickest', 'lc.hm.kp.quickestYou')}
          </p>
          {a.loading ? (
            <div className="mt-3 h-10 animate-pulse rounded-lg bg-now-surface" />
          ) : first ? (
            <>
              <div className="relative mt-4 h-1.5 rounded-full bg-now-line">
                <span className="absolute inset-y-0 left-0 w-[72%] rounded-full" style={{ background: `linear-gradient(90deg, ${L.accent}, #FFD400)` }} />
                <span className="absolute -top-[11px] left-[72%] grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-dz-yellow text-black">
                  <Bike className="h-4 w-4" aria-hidden />
                </span>
                <Home className="absolute -right-1 -top-[9px] h-6 w-6 text-dz-red" aria-hidden />
              </div>
              <p className="mt-4 flex items-baseline justify-between gap-3 text-sm text-now-muted">
                <Link to={`/s/${first.slug ?? first.id}`} className="truncate font-bold text-now-text hover:underline">
                  {first.name}
                </Link>
                <b className="shrink-0 text-dz-red">{t('lc.store.mins', { n: first.etaMinutes })}</b>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-now-muted">{near.length ? t('lc.hm.kp.closed') : placed(t, a.where, 'lc.hm.kp.none', 'lc.hm.kp.noneYou', { kind: title.toLowerCase() })}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-now-line bg-now-bg p-3.5">
            <b className="block font-display text-[26px] leading-none text-now-text">{first ? t('lc.store.mins', { n: first.etaMinutes }) : '—'}</b>
            <small className="text-xs text-now-muted">{t('lc.hm.quickestNow')}</small>
          </div>
          <div className="rounded-2xl border border-now-line bg-now-bg p-3.5">
            <b className="block font-display text-[26px] leading-none text-now-text">{near.length}</b>
            <small className="text-xs text-now-muted">{placed(t, a.where, 'lc.hm.shopsNear', 'lc.hm.shopsNearYou')}</small>
          </div>
        </div>
        <Link to={x.to} className="inline-flex w-fit items-center gap-2 rounded-xl px-[18px] py-3 text-sm font-black text-white" style={{ background: L.accent }}>
          {t('lc.hm.kp.shop', { kind: title })} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-xs font-extrabold uppercase tracking-[1px] text-now-muted">{t('lc.hm.kp.byType', { kind: title })}</p>
          {overview && liveShops(k, overview) === 0 && <Soon />}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {types.map((y) => {
            const I = itemIcon(y.en, '', L.icon);
            return (
              <Link key={y.en} to={x.to} className="group flex items-center gap-2.5 rounded-2xl border border-now-line bg-now-surface px-3 py-3 text-sm font-bold text-now-text transition hover:-translate-y-0.5 hover:border-now-text">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: L.tint, color: L.accent }} aria-hidden>
                  <I className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 truncate">{y.name}</span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" aria-hidden />
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={t('lc.hm.kp.kinds')}>
          {KINDS.map((y) => (
            <button key={y.k} type="button" aria-pressed={y.k === k} onClick={() => onPick(y.k)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-extrabold transition ${y.k === k ? 'border-black bg-black text-dz-yellow' : 'border-now-line text-now-text hover:border-now-text'}`}>
              {t(y.title)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
const liveShops = (k: Kind, o: NonNullable<ReturnType<typeof useOverview>['data']>) => (k === 'RUSH' || k === 'STREET' ? null : (o.verticals[k]?.shops ?? 0));
