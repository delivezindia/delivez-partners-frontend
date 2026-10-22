import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Baby,
  Bike,
  Building,
  Building2,
  CakeSlice,
  Carrot,
  Check,
  ChefHat,
  Clock,
  FileCheck2,
  Fish,
  Flower2,
  Hospital,
  Microscope,
  TestTubes,
  Pill,
  PawPrint,
  Plug,
  Printer,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Sofa,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api, newIdempotencyKey } from '../../lib/api';
import { errorMessageOf, type OnboardingView } from '../../lib/onboarding';
import { Brand, Button, ErrorText } from '../../components/ui';
import { TextInput } from '../../components/form';

interface TypeDef {
  value: string;
  label: string;
  icon: LucideIcon;
}
interface Group {
  key: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  types: TypeDef[];
}

const GROUPS: Group[] = [
  {
    key: 'FOOD',
    title: 'Food',
    blurb: 'Restaurants, kitchens, bakeries',
    icon: UtensilsCrossed,
    types: [
      { value: 'RESTAURANT', label: 'Restaurant', icon: UtensilsCrossed },
      { value: 'CLOUD_KITCHEN', label: 'Cloud kitchen', icon: ChefHat },
      { value: 'BAKERY', label: 'Bakery & sweets', icon: CakeSlice },
      { value: 'MEAT_FISH', label: 'Meat & fish', icon: Fish },
    ],
  },
  {
    key: 'GROCERY',
    title: 'Grocery',
    blurb: 'Kiranas, supermarkets, fresh',
    icon: ShoppingBasket,
    types: [
      { value: 'KIRANA', label: 'Kirana store', icon: ShoppingBasket },
      { value: 'SUPERMARKET', label: 'Supermarket', icon: ShoppingCart },
      { value: 'GROCERY', label: 'Grocery & fresh', icon: Carrot },
    ],
  },
  {
    key: 'PHARMACY',
    title: 'Pharmacy',
    blurb: 'Retail, chain, hospital',
    icon: Pill,
    types: [
      { value: 'PHARMACY_RETAIL', label: 'Retail pharmacy', icon: Pill },
      { value: 'PHARMACY_CHAIN', label: 'Pharmacy chain', icon: Building2 },
      { value: 'PHARMACY_HOSPITAL', label: 'Hospital pharmacy', icon: Hospital },
    ],
  },
  {
    key: 'LAB',
    title: 'Diagnostics',
    blurb: 'Certified pathology labs',
    icon: Microscope,
    types: [
      { value: 'DIAGNOSTIC_LAB', label: 'Diagnostic lab', icon: Microscope },
      { value: 'DIAGNOSTIC_CHAIN', label: 'Lab chain', icon: TestTubes },
      { value: 'HOSPITAL_LAB', label: 'Hospital lab', icon: Hospital },
    ],
  },
  {
    key: 'LOCAL',
    title: 'Local stores',
    blurb: 'Flowers, electronics, fashion…',
    icon: Store,
    types: [
      { value: 'FLOWER', label: 'Flowers', icon: Flower2 },
      { value: 'ELECTRONICS', label: 'Electronics', icon: Plug },
      { value: 'CLOTHING', label: 'Clothing', icon: Shirt },
      { value: 'BEAUTY_WELLNESS', label: 'Beauty & wellness', icon: Sparkles },
      { value: 'HOUSEHOLD_LIFESTYLE', label: 'Home & lifestyle', icon: Sofa },
      { value: 'BABY_CARE', label: 'Baby care', icon: Baby },
      { value: 'PET_CARE', label: 'Pet care', icon: PawPrint },
      { value: 'PRINTING', label: 'Printing', icon: Printer },
      { value: 'OTHER', label: 'Something else', icon: ShoppingBag },
    ],
  },
  {
    key: 'VENDOR',
    title: 'Vendors',
    blurb: 'Street & society sellers',
    icon: Bike,
    types: [
      { value: 'STREET_VENDOR', label: 'Street vendor', icon: Bike },
      { value: 'SOCIETY_VENDOR', label: 'Society vendor', icon: Building },
    ],
  },
];

/**
 * What each business type goes through — mirrors core-api onboarding/flows.ts
 * (FLOWS step counts and requiredDocuments). Keep in sync when flows change.
 */
function requirements(type: string): { steps: number; minutes: string; needs: string[]; later: string } {
  if (type === 'STREET_VENDOR' || type === 'SOCIETY_VENDOR') {
    return { steps: 6, minutes: 'about 5 min', needs: ['Your name and where you sell', 'What you sell and prices', 'A UPI ID for payouts'], later: 'No licence needed to start.' };
  }
  if (type.startsWith('PHARMACY')) {
    return {
      steps: 12,
      minutes: 'about 25 min',
      needs: ['Drug licences (Form 20 and Form 21)', 'Registered pharmacist and their registration', 'Address proof for the pharmacy', 'Bank account for settlement'],
      later: 'Licences must be verified before you can go live.',
    };
  }
  if (['DIAGNOSTIC_LAB', 'DIAGNOSTIC_CHAIN', 'HOSPITAL_LAB'].includes(type)) {
    return {
      steps: 11,
      minutes: 'about 20 min',
      needs: ['NABL accreditation certificate', 'Clinical establishment registration (state)', 'Pathologist and their medical council registration', 'Your tests with prices, fasting and report times'],
      later: 'Licences must be verified before you can go live. Tests can be marked “doctor’s prescription required”.',
    };
  }
  if (type === 'RESTAURANT' || type === 'CLOUD_KITCHEN') {
    return { steps: 9, minutes: 'about 15 min', needs: ['FSSAI licence', 'Your menu with prices', 'Opening hours and prep time', 'Bank account or UPI'], later: 'Documents and menu can come later — save and continue any time.' };
  }
  if (type === 'BAKERY' || type === 'MEAT_FISH' || ['KIRANA', 'SUPERMARKET', 'GROCERY'].includes(type)) {
    return { steps: 11, minutes: 'about 15 min', needs: ['FSSAI licence', 'Your products and prices', 'Opening hours', 'Bank account or UPI'], later: 'Documents and products can come later — save and continue any time.' };
  }
  return { steps: 11, minutes: 'about 15 min', needs: ['Your products and prices', 'Opening hours', 'Bank account or UPI', 'GST or shop licence (optional)'], later: 'No licence is required for this type of store.' };
}

// Entry to onboarding: business type + name → creates the DRAFT store and session.
export default function StartOnboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [groupKey, setGroupKey] = useState(GROUPS[0].key);
  const [storeType, setStoreType] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [idemKey] = useState(newIdempotencyKey);
  const nameRef = useRef<HTMLInputElement>(null);

  const group = GROUPS.find((g) => g.key === groupKey)!;
  const selected = GROUPS.flatMap((g) => g.types.map((t) => ({ ...t, group: g }))).find((t) => t.value === storeType);
  const req = selected ? requirements(selected.value) : null;
  const ready = !!storeType && name.trim().length >= 2;

  async function start() {
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      const view = await api<OnboardingView>('/partners/onboarding', {
        method: 'POST',
        body: { storeType, businessName: name.trim(), channel: 'WEB' },
        idempotencyKey: idemKey,
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
      navigate(`/onboarding/${view.store.id}`, { replace: true });
    } catch (err) {
      setError(errorMessageOf(err) ?? 'Could not start');
      setBusy(false);
    }
  }

  const pick = (value: string) => {
    setStoreType(value);
    // On phones the form sits below the list — bring it into view once a type is chosen.
    if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  return (
    <main className="min-h-screen bg-soft">
      <header className="dz-header sticky top-0 z-30">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <button type="button" onClick={() => navigate('/accounts')} className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-black px-3 py-1.5 text-sm font-bold transition hover:bg-black/5">
            <X className="h-4 w-4" aria-hidden /> Exit
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-br from-dz-yellow-soft via-white to-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-dz-red">Register your business · Step 1</p>
          <h1 className="mt-2 text-[clamp(34px,5vw,56px)]">What kind of business do you run?</h1>
          <p className="mt-2 max-w-2xl text-ink-2">We'll tailor the setup to your business — the steps, the documents and the way you list products.</p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            {[
              [Wallet, 'Free to register'],
              [Clock, 'Save and continue any time'],
              [FileCheck2, 'Most documents can come later'],
            ].map(([Icon, t]) => {
              const I = Icon as LucideIcon;
              return (
                <li key={t as string} className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-dz-green text-white">
                    <I className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {t as string}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
        {/* Categories + types */}
        <section aria-label="Business type" className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="tablist" aria-label="Category">
            {GROUPS.map((g) => {
              const active = g.key === groupKey;
              const chosenHere = g.types.some((t) => t.value === storeType);
              return (
                <button
                  key={g.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroupKey(g.key)}
                  className={`relative flex flex-col items-start gap-2 rounded-[14px] border-[1.5px] p-3.5 text-left transition ${active ? 'border-black bg-dz-yellow shadow-[0_6px_20px_-12px_rgb(0_0_0/0.5)]' : 'border-line bg-white hover:-translate-y-px hover:border-neutral-400'}`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-black text-dz-yellow' : 'bg-dz-yellow-soft text-black'}`}>
                    <g.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <b className="block leading-tight">{g.title}</b>
                    <span className={`text-xs ${active ? 'text-black/70' : 'text-ink-3'}`}>{g.blurb}</span>
                  </span>
                  {chosenHere && (
                    <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-dz-red text-white" aria-label="Selected here">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="dz-card p-4 sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="text-2xl">{group.title}</h2>
              <span className="text-xs font-semibold text-ink-3">Pick the closest match</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={`${group.title} types`}>
              {group.types.map((t) => {
                const on = storeType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(t.value)}
                    className={`group flex min-h-[64px] items-center gap-3 rounded-xl border-[1.5px] px-3.5 text-left transition ${on ? 'border-black bg-dz-yellow-soft' : 'border-line bg-white hover:border-neutral-400'}`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition ${on ? 'bg-dz-red text-white' : 'bg-soft text-ink group-hover:bg-dz-yellow-soft'}`}>
                      <t.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="flex-1 font-bold">{t.label}</span>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${on ? 'border-dz-red bg-dz-red text-white' : 'border-neutral-300'}`}>{on && <Check className="h-3 w-3" />}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Summary + name + start */}
        <aside className="lg:sticky lg:top-[84px] lg:self-start">
          <form
            className="dz-card overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              void start();
            }}
          >
            <div className="border-b border-line bg-black px-5 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-dz-yellow">Your registration</p>
              {selected ? (
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-dz-yellow text-black">
                    <selected.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span>
                    <b className="block text-lg leading-tight">{selected.label}</b>
                    <span className="text-xs text-white/70">
                      {selected.group.title} · {req!.steps} steps · {req!.minutes}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/80">Choose your business type to see what you'll need.</p>
              )}
            </div>

            <div className="space-y-4 p-5">
              {req && (
                <div className="dz-fade">
                  <p className="text-sm font-bold">Keep these handy</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {req.needs.map((n) => (
                      <li key={n} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-dz-green" aria-hidden />
                        {n}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 rounded-lg bg-soft px-3 py-2 text-xs text-ink-2">{req.later}</p>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-bold">Business name</span>
                <TextInput ref={nameRef} className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meghana Foods" maxLength={80} autoComplete="organization" />
                <span className="mt-1 block text-xs text-ink-3">As customers know it. You can change it before you go live.</span>
              </label>

              <ErrorText>{error}</ErrorText>
              <Button type="submit" className="w-full" disabled={!ready || busy}>
                {busy ? 'Starting…' : 'Start registration'}
                {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
              </Button>
              {!ready && <p className="text-center text-xs text-ink-3">{!storeType ? 'Pick your business type first' : 'Enter your business name to continue'}</p>}
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
