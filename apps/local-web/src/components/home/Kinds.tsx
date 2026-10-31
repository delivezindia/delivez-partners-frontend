import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gift, Pill, Repeat, RotateCcw, Search, Stethoscope, Upload, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth-store';
import { km } from '../../lib/format';
import { storeLook } from '../../lib/icons';
import { useOrders } from '../../lib/orders';
import { useOverview } from '../../lib/queries';
import { useReorder } from '../../lib/reorder';
import type { StoreCard } from '../../lib/types';
import { BrandHead, Soon, TYPE_LABEL, chip, pill, useAround } from './kit';

const Section = ({ id, surface = false, children }: { id: string; surface?: boolean; children: React.ReactNode }) => (
  <section id={id} className={`scroll-mt-28 px-4 py-[52px] sm:px-6 ${surface ? 'bg-now-surface' : 'bg-now-bg'}`}>
    <div className="mx-auto max-w-[1280px]">{children}</div>
  </section>
);

/** A shop as one line: its icon, name, distance and whether it is open. */
function ShopLine({ s, dark = false }: { s: StoreCard; dark?: boolean }) {
  const L = storeLook(s);
  return (
    <Link to={`/s/${s.slug ?? s.id}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${dark ? 'bg-white/[0.06] hover:bg-white/[0.12]' : 'bg-[#F6F6F4] hover:bg-[#EDEDE8]'}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: L.bg }} aria-hidden>
        <L.icon className="h-[18px] w-[18px] text-white" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</span>
      <small className={`shrink-0 text-xs font-extrabold ${s.open ? 'text-[#17803A]' : 'text-dz-red'}`}>{`${km(s.distanceKm)} · ${s.open ? 'Open' : 'Closed'}`}</small>
    </Link>
  );
}

// ---------------------------------------------------------------- Pharmacy

const PHARMA_FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Upload, label: 'Prescription upload' },
  { icon: Stethoscope, label: 'Pharmacist check' },
  { icon: Search, label: 'Medicine search' },
  { icon: Repeat, label: 'Repeat orders' },
];

export function PharmacyBand() {
  const a = useAround();
  const token = useAuth((s) => s.accessToken);
  const needs = useOverview().data?.verticals.PHARMACY.types.map((t) => t.name) ?? [];
  const near = a.stores.filter((s) => s.vertical === 'PHARMACY').slice(0, 2);
  return (
    <Section id="pharmacy" surface>
      <BrandHead k="PHARMACY" tag="Pharmacy & wellness" title="Medicines and wellness, delivered safely." intro="Prescription upload, a pharmacist’s check where a prescription is needed, and one-tap repeat orders." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-3.5 rounded-[24px] bg-white p-6 text-[#161616] ring-1 ring-black/5">
          <h3 className="flex items-center gap-2 font-display text-2xl">
            <Pill className="h-6 w-6 text-[#1E5BB8]" aria-hidden /> Shop by need
          </h3>
          {needs.length ? (
            <div className="flex flex-wrap gap-1.5">
              {needs.map((n) => (
                <Link key={n} to="/shops?v=PHARMACY" className="rounded-full bg-[#111] px-3.5 py-2 text-[13px] font-extrabold text-white transition hover:bg-[#1E5BB8]">
                  {n}
                </Link>
              ))}
            </div>
          ) : (
            <Soon />
          )}
          <h3 className="font-display text-xl text-[#5E5E5A]">Features</h3>
          <div className="flex flex-wrap gap-1.5">
            {PHARMA_FEATURES.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-3.5 py-2 text-[13px] font-extrabold text-white">
                <f.icon className="h-4 w-4 text-dz-yellow" aria-hidden /> {f.label}
              </span>
            ))}
          </div>
          <Link to="/shops?v=PHARMACY" className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
            Shop Pharmacy <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid content-start gap-3 rounded-[24px] border border-white/10 bg-[#07090D] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[1px] text-dz-yellow">Upload a prescription</p>
          <p className="text-[15px] text-neutral-300">Add medicines from a pharmacy near you, then upload a photo of your prescription at checkout. The pharmacist checks it before your order is accepted.</p>
          {near.map((s) => (
            <ShopLine key={s.id} s={s} dark />
          ))}
          <Link to="/shops?v=PHARMACY" className="inline-flex w-fit items-center gap-2 rounded-xl bg-dz-yellow px-[18px] py-3 text-sm font-black text-black">
            <Upload className="h-4 w-4" aria-hidden /> Choose a pharmacy
          </Link>
          <p className="mt-3 text-xs font-black uppercase tracking-[1px] text-dz-yellow">Repeat last order</p>
          {token ? <RepeatPharmacy /> : <p className="text-sm text-neutral-400">Log in to reorder your past pharmacy orders in one tap.</p>}
        </div>
      </div>
    </Section>
  );
}

/** The latest delivered pharmacy order, rebuilt from the pharmacy's stock today. */
function RepeatPharmacy() {
  const { data } = useOrders();
  const reorder = useReorder();
  const last = (data?.orders ?? []).find((o) => o.store.vertical === 'PHARMACY' && ['DELIVERED', 'COMPLETED'].includes(o.status));
  if (!last) return <p className="text-sm text-neutral-400">Your past pharmacy orders show here, to reorder in one tap.</p>;
  return (
    <>
      <button type="button" onClick={() => void reorder.run(last)} disabled={!!reorder.busy} className="flex w-full items-center gap-2 rounded-xl bg-dz-yellow px-4 py-3 text-left text-sm font-black text-black disabled:opacity-60">
        <RotateCcw className={`h-4 w-4 shrink-0 ${reorder.busy ? 'animate-spin' : ''}`} aria-hidden />
        <span className="truncate">Reorder {last.items.map((i) => i.name).join(' + ')}</span>
      </button>
      {reorder.failed === last.id && <p className="text-sm font-bold text-[#FF7D84]">Couldn’t rebuild that order from today’s stock.</p>}
    </>
  );
}

// ---------------------------------------------------------------- Local stores

const LOCAL_PLANNED = ['Electronics', 'Fashion', 'Beauty', 'Home & Kitchen', 'Stationery', 'Optical', 'Sports', 'Pet Supplies', 'Hardware', 'Gardening'];

export function LocalBand() {
  const a = useAround();
  // The kinds of local shop that really deliver here, with how many; the planned kinds until there are any.
  const kinds = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of a.stores) if (s.vertical === 'LOCAL_STORES') n.set(s.storeType, (n.get(s.storeType) ?? 0) + 1);
    return [...n.entries()].sort((x, y) => y[1] - x[1]);
  }, [a.stores]);
  return (
    <Section id="localstores">
      <BrandHead k="LOCAL_STORES" tag="Local stores" title="Your neighbourhood shops, online." intro={kinds.length ? `The kinds of shop that deliver ${a.saved ? `to ${a.where}` : `around ${a.where}`}.` : undefined} />
      <div className="flex flex-wrap gap-1.5">
        {kinds.length
          ? kinds.map(([type, n]) => (
              <Link key={type} to="/shops?v=LOCAL_STORES" className={`${chip} hover:border-now-text`}>
                {TYPE_LABEL[type] ?? type} <span className="rounded-full bg-now-line px-1.5 text-[11px] tabular-nums">{n}</span>
              </Link>
            ))
          : LOCAL_PLANNED.map((x) => (
              <span key={x} className={chip}>
                {x}
              </span>
            ))}
      </div>
      <Link to="/shops?v=LOCAL_STORES" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
        Explore Local Stores <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Section>
  );
}

// ---------------------------------------------------------------- Gifts

const GIFTS: { k: string; label: string; test: (s: StoreCard) => boolean }[] = [
  { k: 'flowers', label: 'Flowers', test: (s) => s.storeType === 'FLOWER' || /flower|bouquet|florist/i.test(s.name) },
  { k: 'cakes', label: 'Cakes', test: (s) => s.storeType === 'BAKERY' || /cake|bakers?\b|bakery/i.test(s.name) },
  { k: 'gifts', label: 'Gifts', test: (s) => s.storeType === 'OTHER' || /gift|hamper/i.test(s.name) },
];

export function GiftsBand() {
  const a = useAround();
  const [k, setK] = useState('');
  const pool = a.stores.filter((s) => GIFTS.some((g) => g.test(s)));
  const shops = pool.filter((s) => !k || GIFTS.find((g) => g.k === k)!.test(s)).slice(0, 3);
  return (
    <Section id="gifts" surface>
      <BrandHead k="LOCAL_STORES" tag="Gifts & occasions" title="Make every moment special." intro="Flowers, cakes and gifts from the shops near you, delivered now." />
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_minmax(0,540px)]">
        <div className="grid gap-3">
          <b className="text-now-text">Choose a gift</b>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Gift type">
            <button type="button" aria-pressed={!k} onClick={() => setK('')} className={pill(!k)}>
              All
            </button>
            {GIFTS.map((g) => (
              <button key={g.k} type="button" aria-pressed={k === g.k} onClick={() => setK(k === g.k ? '' : g.k)} className={pill(k === g.k)}>
                {g.label}
              </button>
            ))}
          </div>
          <b className="mt-2 text-now-text">Delivery option</b>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={pill(true)}>Now</span>
            {['Scheduled', 'Surprise delivery'].map((x) => (
              <span key={x} className={`${pill(false)} opacity-70`}>
                {x} <span className="text-[10.5px] font-black uppercase text-now-muted">soon</span>
              </span>
            ))}
          </div>
          <Link to="/shops?v=LOCAL_STORES" className={`${pill(false)} mt-2 w-fit`}>
            Browse gifts <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid gap-3 rounded-[22px] bg-white p-5 text-[#161616] shadow-[0_24px_50px_-30px_rgba(0,0,0,.35)] ring-1 ring-black/5">
          <h3 className="flex items-center gap-2 font-display text-2xl">
            <Gift className="h-6 w-6 text-dz-red" aria-hidden /> Send a gift
          </h3>
          <ol className="grid gap-3 text-sm">
            <li>
              <b>1. Pick a shop near you</b>
              <div className="mt-2 grid gap-1.5">
                {a.loading ? <div className="h-12 animate-pulse rounded-xl bg-[#F6F6F4]" /> : shops.length ? shops.map((s) => <ShopLine key={s.id} s={s} />) : <p className="text-[#5E5E5A]">{`No gift shops deliver to ${a.where ?? 'you'} yet.`}</p>}
              </div>
            </li>
            <li>
              <b>2. Add the recipient’s address at checkout</b>
              <p className="text-[#5E5E5A]">Any address you add is saved for next time.</p>
            </li>
            <li>
              <b>3. Write your card message</b>
              <p className="text-[#5E5E5A]">Put it in the note for the shop. It goes with the order.</p>
            </li>
          </ol>
          <Link to={shops[0] ? `/s/${shops[0].slug ?? shops[0].id}` : '/shops?v=LOCAL_STORES'} className="inline-flex w-fit items-center gap-2 rounded-xl bg-dz-red px-[18px] py-3 text-sm font-black text-white">
            Send a Gift <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Specialty

const SPECIAL = ['Organic Stores', 'Gourmet Foods', 'Regional Specialties', 'Sports', 'Optical', 'Gardening', 'Religious Products', 'Local Artisans', 'Home Décor', 'Books', 'Toys', 'Pet Stores', 'Local Fashion', 'Niche Retailers'];

export function SpecialtyBand() {
  return (
    <Section id="specialty">
      <BrandHead k="LOCAL_STORES" tag="Specialty & local stores" title="Discover what only your city has." intro="Organic stores, regional specialties, local artisans and niche retailers you won’t find on big marketplaces." />
      <div className="flex flex-wrap gap-1.5">
        {SPECIAL.map((x) => (
          <span key={x} className={chip}>
            {x}
          </span>
        ))}
      </div>
      <Link to="/shops?v=LOCAL_STORES" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-black px-[18px] py-3 text-sm font-black text-dz-yellow">
        Discover Specialty Stores <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Section>
  );
}
