import { useState } from 'react';
import { Card, Field, Select, Stepper, TextArea, TextInput, Toggle } from '../../../components/form';
import { api } from '../../../lib/api';
import { errorMessageOf, rupees, type OnboardingView } from '../../../lib/onboarding';
import { STEP_FORM_ID, toPaise, type StepProps } from './types';

interface DraftItem {
  name: string;
  price: number; // paise
  category?: string;
  isVeg?: boolean;
  stock?: number;
  prescriptionRequired?: boolean;
  drugSchedule?: 'OTC' | 'H' | 'H1';
}

const MIN_ITEMS: Record<OnboardingView['session']['flowVersion'], number> = { RESTAURANT_V1: 5, STORE_V1: 10, PHARMACY_V1: 1, LAB_V1: 5, VENDOR_V1: 3 };

// CATALOG — quick add during onboarding; the full catalog manager is Step 9.
export function CatalogStep({ view, storeId, submit, errors, refresh }: StepProps) {
  const vertical = view.store.vertical;
  const eat = vertical === 'EAT';
  const pharmacy = vertical === 'PHARMACY';
  const tracksStock = vertical === 'GROCERY' || pharmacy || vertical === 'LOCAL_STORES';
  const [pending, setPending] = useState<DraftItem[]>([]);
  const [row, setRow] = useState({ name: '', price: '', category: '', isVeg: true, stock: '', rx: false, schedule: 'OTC' as 'OTC' | 'H' | 'H1' });
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState(view.catalog.products);

  const total = products.length + pending.length;
  const min = view.store.vertical === 'GROCERY' ? 50 : MIN_ITEMS[view.session.flowVersion];

  function addRow() {
    if (row.name.trim().length < 2 || !(Number(row.price) > 0)) return setMessage('Enter an item name and a price');
    setMessage('');
    setPending((p) => [
      ...p,
      {
        name: row.name.trim(),
        price: toPaise(row.price),
        category: row.category.trim() || undefined,
        isVeg: eat ? row.isVeg : undefined,
        stock: tracksStock && row.stock !== '' ? Number(row.stock) : undefined,
        prescriptionRequired: pharmacy ? row.rx || row.schedule !== 'OTC' : undefined,
        drugSchedule: pharmacy ? row.schedule : undefined,
      },
    ]);
    setRow((r) => ({ ...r, name: '', price: '', stock: '' }));
  }

  // Paste rows from Excel/Sheets: name, price[, category[, stock]]
  function importPaste() {
    const items: DraftItem[] = [];
    const bad: number[] = [];
    paste
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line, i) => {
        const [name, price, category, stock] = line.split(/\t|,/).map((s) => s.trim());
        if (!name || !(Number(price) > 0)) return bad.push(i + 1);
        items.push({ name, price: toPaise(price), category: category || undefined, stock: tracksStock && stock ? Number(stock) || 0 : undefined, isVeg: eat ? true : undefined });
      });
    setPending((p) => [...p, ...items]);
    setMessage(`${items.length} rows added${bad.length ? ` · skipped lines ${bad.join(', ')} (need a name and a price)` : ''}`);
    if (items.length) {
      setPaste('');
      setShowPaste(false);
    }
  }

  async function remove(productId: string) {
    try {
      const view = await api<OnboardingView>(`/partners/stores/${storeId}/onboarding/products/${productId}`, { method: 'DELETE' });
      setProducts(view.catalog.products);
      refresh();
    } catch (err) {
      setMessage(errorMessageOf(err) ?? 'Could not remove');
    }
  }

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({ items: pending }); }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200">
        <span className="text-sm">
          <b>{total}</b> {eat ? 'menu items' : 'products'} · aim for at least <b>{min}</b> to go live
        </span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full bg-state-ready transition-all" style={{ width: `${Math.min(100, (total / min) * 100)}%` }} />
        </div>
      </div>

      <Card title={eat ? 'Add a dish' : pharmacy ? 'Add a medicine' : 'Add a product'}>
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="Name" className="sm:col-span-3">
            <TextInput value={row.name} onChange={(e) => setRow((r) => ({ ...r, name: e.target.value }))} placeholder={eat ? 'Chicken Biryani' : pharmacy ? 'Paracetamol 500 mg (10 tabs)' : 'Toor Dal 1 kg'} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRow())} />
          </Field>
          <Field label="Price (₹)" className="sm:col-span-1">
            <TextInput inputMode="decimal" value={row.price} onChange={(e) => setRow((r) => ({ ...r, price: e.target.value.replace(/[^\d.]/g, '') }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRow())} />
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <TextInput value={row.category} onChange={(e) => setRow((r) => ({ ...r, category: e.target.value }))} placeholder={eat ? 'Biryani' : 'Groceries'} />
          </Field>
          {eat && (
            <div className="flex items-end gap-2 sm:col-span-2">
              {[true, false].map((veg) => (
                <button key={String(veg)} type="button" onClick={() => setRow((r) => ({ ...r, isVeg: veg }))} className={`h-12 flex-1 rounded-xl border text-sm font-semibold ${row.isVeg === veg ? (veg ? 'border-state-ready bg-green-50 text-green-800' : 'border-dz-red bg-red-50 text-dz-red') : 'border-neutral-300'}`}>
                  {veg ? '● Veg' : '▲ Non-veg'}
                </button>
              ))}
            </div>
          )}
          {tracksStock && (
            <Field label="Stock" className="sm:col-span-1">
              <TextInput inputMode="numeric" value={row.stock} onChange={(e) => setRow((r) => ({ ...r, stock: e.target.value.replace(/\D/g, '') }))} placeholder="0" />
            </Field>
          )}
          {pharmacy && (
            <Field label="Schedule" className="sm:col-span-2">
              <Select value={row.schedule} onChange={(e) => setRow((r) => ({ ...r, schedule: e.target.value as 'OTC' | 'H' | 'H1' }))}>
                <option value="OTC">OTC — no prescription</option>
                <option value="H">Schedule H — Rx required</option>
                <option value="H1">Schedule H1 — Rx required</option>
              </Select>
            </Field>
          )}
          <div className="flex items-end sm:col-span-1">
            <button type="button" onClick={addRow} className="h-12 w-full rounded-xl bg-dz-black font-semibold text-dz-yellow">
              Add
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setShowPaste((s) => !s)}>
            Paste many from Excel
          </button>
          {message && <span className="text-neutral-600">{message}</span>}
        </div>
        {showPaste && (
          <div className="mt-3 space-y-2">
            <TextArea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'One item per line: name, price, category, stock\nVeg Biryani, 180, Biryani\nRaita, 40, Sides'} />
            <button type="button" onClick={importPaste} className="h-11 rounded-xl bg-dz-yellow px-4 text-sm font-semibold">
              Add rows
            </button>
          </div>
        )}
        {pharmacy && <p className="mt-3 text-xs text-neutral-500">Schedule X medicines can't be sold on Delivez.</p>}
      </Card>

      {pending.length > 0 && (
        <Card title={`New — saved when you continue (${pending.length})`}>
          <ul className="divide-y divide-neutral-100 text-sm">
            {pending.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {p.isVeg !== undefined && <VegMark veg={p.isVeg} />} {p.name}
                  {p.category && <span className="text-neutral-400"> · {p.category}</span>}
                  {p.prescriptionRequired && <span className="ml-1 rounded bg-red-50 px-1 text-xs text-dz-red">Rx</span>}
                </span>
                <span className="flex items-center gap-3">
                  {p.stock !== undefined && <span className="text-neutral-500">stock {p.stock}</span>}
                  <b>{rupees(p.price)}</b>
                  <button type="button" aria-label="Remove" className="text-neutral-400 hover:text-dz-red" onClick={() => setPending((x) => x.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {products.length > 0 && (
        <Card title={`Saved (${products.length})`}>
          <ul className="divide-y divide-neutral-100 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {p.isVeg !== null && <VegMark veg={p.isVeg} />} {p.name}
                  {p.category && <span className="text-neutral-400"> · {p.category.name}</span>}
                  {p.prescriptionRequired && <span className="ml-1 rounded bg-red-50 px-1 text-xs text-dz-red">Rx</span>}
                </span>
                <span className="flex items-center gap-3">
                  {p.inventory?.trackStock && <span className="text-neutral-500">stock {p.inventory.stockQty}</span>}
                  <b>{rupees(p.price)}</b>
                  <button type="button" aria-label="Remove" className="text-neutral-400 hover:text-dz-red" onClick={() => void remove(p.id)}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {errors.items && <p className="text-sm text-state-delayed">{errors.items}</p>}
    </form>
  );
}

function VegMark({ veg }: { veg: boolean }) {
  return (
    <span className={`inline-flex h-3.5 w-3.5 items-center justify-center border ${veg ? 'border-green-700' : 'border-dz-red'}`} title={veg ? 'Veg' : 'Non-veg'}>
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-green-700' : 'bg-dz-red'}`} />
    </span>
  );
}

// OPERATIONS — prep time, capacity, delivery/pickup, pharmacy Rx rules (plan §5.5)
export function OperationsStep({ view, submit, errors }: StepProps) {
  const s = view.store;
  const eat = s.vertical === 'EAT';
  const pharmacy = s.vertical === 'PHARMACY';
  const grocery = s.vertical === 'GROCERY' || s.vertical === 'LOCAL_STORES';
  const [o, setO] = useState({
    defaultPrepMinutes: s.defaultPrepMinutes,
    peakPrepMinutes: s.peakPrepMinutes,
    aiPrepEnabled: s.aiPrepEnabled,
    supportsDelivery: s.supportsDelivery,
    supportsPickup: s.supportsPickup,
    deliveryRadiusKm: s.deliveryRadiusKm,
    acceptMultipleOrders: s.acceptMultipleOrders,
    allowSubstitutions: s.allowSubstitutions,
    maxOrdersPerHour: s.maxOrdersPerHour,
    autoPauseOverloaded: s.autoPauseOverloaded,
    packagingFee: s.packagingFee,
    allowGenericSubstitution: s.allowGenericSubstitution,
    contactIfRxUnclear: s.contactIfRxUnclear,
    selfPackagingConfirmed: s.selfPackagingConfirmed,
  });
  const set = <K extends keyof typeof o>(k: K) => (v: (typeof o)[K]) => setO((x) => ({ ...x, [k]: v }));

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit(o); }} className="space-y-6">
      <Card title={eat ? 'How long does an order take to prepare?' : 'How long to pack an order?'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Normal" error={errors.defaultPrepMinutes}>
            <Stepper value={o.defaultPrepMinutes} onChange={set('defaultPrepMinutes')} min={5} max={90} step={5} unit="min" />
          </Field>
          <Field label="At peak hours" error={errors.peakPrepMinutes}>
            <Stepper value={o.peakPrepMinutes} onChange={set('peakPrepMinutes')} min={5} max={120} step={5} unit="min" />
          </Field>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Be realistic — this is what customers are promised. You can adjust it per order.</p>
        <div className="mt-4">
          <Toggle checked={o.aiPrepEnabled} onChange={set('aiPrepEnabled')} label="Allow AI prep-time suggestions" hint="Suggestions only — you always choose" />
        </div>
      </Card>

      <Card title="Delivery & pickup">
        <div className="space-y-3">
          <Toggle checked={o.supportsDelivery} onChange={set('supportsDelivery')} label="Delivery by Delivez riders" />
          <Toggle checked={o.supportsPickup} onChange={set('supportsPickup')} label="Customer pickup from your shop" />
          {errors.supportsDelivery && <p className="text-sm text-state-delayed">{errors.supportsDelivery}</p>}
          {o.supportsDelivery && (
            <Field label="Delivery radius" hint="New stores start at 2 km during soft launch">
              <Stepper value={o.deliveryRadiusKm} onChange={set('deliveryRadiusKm')} min={1} max={15} unit="km" />
            </Field>
          )}
        </div>
      </Card>

      <Card title="Capacity">
        <div className="space-y-3">
          <Toggle checked={o.acceptMultipleOrders} onChange={set('acceptMultipleOrders')} label="Accept several orders at once" />
          <Field label="Max orders per hour (optional)" hint="We switch you to Busy when you reach it">
            <TextInput inputMode="numeric" value={o.maxOrdersPerHour ?? ''} onChange={(e) => set('maxOrdersPerHour')(e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null)} placeholder="No limit" />
          </Field>
          <Toggle checked={o.autoPauseOverloaded} onChange={set('autoPauseOverloaded')} label="Pause new orders for 15 min when overloaded" />
          {grocery && <Toggle checked={o.allowSubstitutions} onChange={set('allowSubstitutions')} label="Offer substitutes when an item is out of stock" hint="The customer approves each substitute" />}
          {eat && (
            <Field label="Packaging charge per order (₹)" error={errors.packagingFee}>
              <TextInput inputMode="decimal" value={o.packagingFee / 100} onChange={(e) => set('packagingFee')(Math.round(Number(e.target.value.replace(/[^\d.]/g, '') || 0) * 100))} />
            </Field>
          )}
        </div>
      </Card>

      {pharmacy && (
        <Card title="Prescription rules">
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>Schedule H and H1 medicines always need a valid prescription</li>
            <li>Schedule X medicines are never sold on Delivez</li>
          </ul>
          <div className="space-y-3">
            <Toggle checked={o.allowGenericSubstitution} onChange={set('allowGenericSubstitution')} label="Allow generic substitutes" hint="Only with the customer's approval" />
            <Toggle checked={o.contactIfRxUnclear} onChange={set('contactIfRxUnclear')} label="Contact the customer if a prescription is unclear" />
            <Toggle checked={o.selfPackagingConfirmed} onChange={set('selfPackagingConfirmed')} label="We seal and package medicines ourselves" />
          </div>
        </Card>
      )}
    </form>
  );
}

// TRAINING — 2-minute guide + practice order (+ pharmacy quiz)
const PRACTICE_FLOW = ['NEW', 'PREPARING', 'READY_SOON', 'READY'] as const;

export function TrainingStep({ view, submit, errors }: StepProps) {
  const done = view.session.trainingDone;
  const [watched, setWatched] = useState(done);
  const [stage, setStage] = useState<number>(done ? PRACTICE_FLOW.length - 1 : 0);
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const practiceDone = stage === PRACTICE_FLOW.length - 1;

  const tips = [
    ['New order', 'Your tablet rings. Accept within 3 minutes and set the prep time.'],
    ['Preparing', 'Cook or pack. Tap Delay if something holds you up — it protects your rating.'],
    ['Ready soon', 'Tell the rider to start coming. No waiting charges while this is on.'],
    ['Order ready', 'Packed, sealed, at the counter. The rider shows an OTP or QR to collect.'],
  ];

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({ videoWatched: watched, practiceOrderDone: practiceDone, quizAnswers: view.quiz ? answers.map((a) => a ?? -1) : undefined }); }} className="space-y-6">
      <Card title="How orders work (2 minutes)">
        <ol className="grid gap-3 sm:grid-cols-2">
          {tips.map(([t, d], i) => (
            <li key={t} className="rounded-xl bg-neutral-50 p-3 text-sm">
              <b>
                {i + 1}. {t}
              </b>
              <p className="text-neutral-600">{d}</p>
            </li>
          ))}
        </ol>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={watched} onChange={(e) => setWatched(e.target.checked)} className="h-5 w-5" />
          I've gone through the guide
        </label>
      </Card>

      <Card title="Practice order">
        <div className={`rounded-xl border-l-8 bg-neutral-50 p-4 ${['border-white', 'border-state-preparing', 'border-state-almost', 'border-state-ready'][stage]}`}>
          <div className="flex justify-between text-sm">
            <b>#PRACTICE-001</b>
            <span>{PRACTICE_FLOW[stage].replace('_', ' ')}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">Test customer · 2 items · not a real order</p>
          <div className="mt-3 flex gap-2">
            {stage === 0 && <PracticeButton onClick={() => setStage(1)}>✓ Accept · 25 min</PracticeButton>}
            {stage === 1 && <PracticeButton onClick={() => setStage(2)}>Ready soon · 5–10 min</PracticeButton>}
            {stage === 2 && <PracticeButton onClick={() => setStage(3)} green>ORDER READY</PracticeButton>}
            {stage === 3 && <span className="text-sm font-semibold text-state-ready">Done! That's the whole flow. 🎉</span>}
          </div>
        </div>
      </Card>

      {view.quiz && (
        <Card title="Prescription compliance quiz">
          <div className="space-y-5">
            {view.quiz.map((q, qi) => (
              <fieldset key={qi}>
                <legend className="text-sm font-semibold">
                  {qi + 1}. {q.question}
                </legend>
                <div className="mt-2 space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-3 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50">
                      <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n; })} className="h-4 w-4" />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {view.session.quizScore != null && <p className="text-sm text-state-ready">Passed with {view.session.quizScore}/{view.quiz.length}</p>}
          </div>
        </Card>
      )}
      {errors.quizAnswers && <p className="text-sm text-state-delayed">{errors.quizAnswers}</p>}
    </form>
  );
}

function PracticeButton({ children, onClick, green }: { children: React.ReactNode; onClick: () => void; green?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`h-12 rounded-xl px-5 font-bold ${green ? 'bg-state-ready text-white' : 'bg-dz-yellow text-dz-black'}`}>
      {children}
    </button>
  );
}
