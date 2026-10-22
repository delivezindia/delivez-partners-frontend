import { useState } from 'react';
import { FlaskConical, Home, Store } from 'lucide-react';
import { Card, Field, Select, Stepper, TextArea, TextInput, Toggle } from '../../../components/form';
import { api } from '../../../lib/api';
import { errorMessageOf, rupees, type OnboardingView } from '../../../lib/onboarding';
import { STEP_FORM_ID, toPaise, type StepProps } from './types';

// Diagnostics (LAB_V1) versions of the eligibility, pathologist, catalog and operations steps.

export const SAMPLE_TYPES = [
  { value: 'BLOOD', label: 'Blood' },
  { value: 'URINE', label: 'Urine' },
  { value: 'STOOL', label: 'Stool' },
  { value: 'SWAB', label: 'Swab' },
  { value: 'SALIVA', label: 'Saliva' },
  { value: 'OTHER', label: 'Other' },
] as const;
type SampleType = (typeof SAMPLE_TYPES)[number]['value'];

// ELIGIBILITY
export function LabEligibilityStep({ view, submit, errors }: StepProps) {
  const saved = view.session.stepData.ELIGIBILITY as { pincode?: string; hoursPerDay?: number; homeDelivery?: boolean; hasNablAccreditation?: boolean; hasPathologist?: boolean } | undefined;
  const [pincode, setPincode] = useState(saved?.pincode ?? '');
  const [hours, setHours] = useState(saved?.hoursPerDay ?? 12);
  const [home, setHome] = useState(saved?.homeDelivery ?? true);
  const [nabl, setNabl] = useState(saved?.hasNablAccreditation ?? false);
  const [pathologist, setPathologist] = useState(saved?.hasPathologist ?? false);

  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ pincode, hoursPerDay: hours, homeDelivery: home, hasNablAccreditation: nabl, hasPathologist: pathologist });
      }}
      className="space-y-5"
    >
      <Card title="Before you start, you'll need">
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          <li>NABL accreditation certificate (ISO 15189)</li>
          <li>Clinical establishment registration for your state (KPME in Karnataka)</li>
          <li>A pathologist (MD Pathology / DCP / DNB) who reviews and signs every report, with their medical council registration</li>
          <li>Address proof · GST certificate (optional)</li>
        </ul>
      </Card>
      <Field label="Lab PIN code" error={errors.pincode} hint="We check whether we operate in your area">
        <TextInput inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="560038" />
      </Field>
      <Field label="How many hours a day is the lab open?" error={errors.hoursPerDay} hint="At least 6 hours a day">
        <TextInput type="number" min={0} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </Field>
      <Toggle checked={home} onChange={setHome} label="We can collect samples from customers' homes" hint="Turn off if customers will only visit the lab" />
      <Toggle checked={nabl} onChange={setNabl} label="Our lab is NABL accredited" />
      <Toggle checked={pathologist} onChange={setPathologist} label="A registered pathologist reviews and signs our reports" />
    </form>
  );
}

// PATHOLOGIST
export function PathologistStep({ view, submit, errors }: StepProps) {
  const p = view.pathologist;
  const [form, setForm] = useState({
    name: p?.name ?? '',
    qualification: p?.qualification ?? 'MD Pathology',
    registrationNo: p?.registrationNo ?? '',
    stateCouncil: p?.stateCouncil ?? (view.store.city ? `${view.store.city.state} Medical Council` : ''),
  });
  const [consent, setConsent] = useState(!!p);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ ...form, consent });
      }}
      className="space-y-6"
    >
      <Card title="Pathologist who signs reports">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <TextInput value={form.name} onChange={set('name')} required placeholder="Dr Meera Iyer" />
          </Field>
          <Field label="Qualification" error={errors.qualification}>
            <Select value={form.qualification} onChange={set('qualification')}>
              {['MD Pathology', 'DNB Pathology', 'DCP (Diploma in Clinical Pathology)', 'MD Microbiology', 'MD Biochemistry', 'Other'].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </Select>
          </Field>
          <Field label="Medical council registration number" error={errors.registrationNo}>
            <TextInput value={form.registrationNo} onChange={set('registrationNo')} required placeholder="KMC-12345" />
          </Field>
          <Field label="State medical council" error={errors.stateCouncil}>
            <TextInput value={form.stateCouncil} onChange={set('stateCouncil')} required />
          </Field>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Upload the registration certificate in the Documents step.</p>
      </Card>
      <label className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm">
          I confirm every report released through Delivez will be reviewed and signed by this pathologist, and that tests marked “prescription required” will only be done against a doctor’s prescription.
          {errors.consent && <span className="mt-1 block text-state-delayed">{errors.consent}</span>}
        </span>
      </label>
    </form>
  );
}

interface DraftTest {
  name: string;
  price: number; // paise
  category?: string;
  sampleType: SampleType;
  fastingHours: number;
  reportHours: number;
  homeCollection: boolean;
  walkIn: boolean;
  prescriptionRequired: boolean;
  parameters?: number;
}

const blank = { name: '', price: '', category: '', sampleType: 'BLOOD' as SampleType, fastingHours: '0', reportHours: '24', homeCollection: true, walkIn: true, rx: false, parameters: '' };

// CATALOG — tests & packages
export function LabCatalogStep({ view, storeId, submit, errors, refresh }: StepProps) {
  const [pending, setPending] = useState<DraftTest[]>([]);
  const [row, setRow] = useState(blank);
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState(view.catalog.products);
  const total = products.length + pending.length;
  const min = 5;
  const homeOk = view.store.supportsDelivery;

  function addRow() {
    if (row.name.trim().length < 2 || !(Number(row.price) > 0)) return setMessage('Enter a test name and a price');
    if (!row.homeCollection && !row.walkIn) return setMessage('Offer the test by home collection, walk-in or both');
    setMessage('');
    setPending((p) => [
      ...p,
      {
        name: row.name.trim(),
        price: toPaise(row.price),
        category: row.category.trim() || undefined,
        sampleType: row.sampleType,
        fastingHours: Number(row.fastingHours) || 0,
        reportHours: Math.max(1, Number(row.reportHours) || 24),
        homeCollection: row.homeCollection,
        walkIn: row.walkIn,
        prescriptionRequired: row.rx,
        parameters: row.parameters ? Number(row.parameters) : undefined,
      },
    ]);
    setRow((r) => ({ ...blank, category: r.category, sampleType: r.sampleType }));
  }

  // Paste: name, price, category, fasting hours, report hours
  function importPaste() {
    const items: DraftTest[] = [];
    const bad: number[] = [];
    paste
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line, i) => {
        const [name, price, category, fasting, report] = line.split(/\t|,/).map((s) => s.trim());
        if (!name || !(Number(price) > 0)) return bad.push(i + 1);
        items.push({ name, price: toPaise(price), category: category || undefined, sampleType: 'BLOOD', fastingHours: Number(fasting) || 0, reportHours: Number(report) || 24, homeCollection: true, walkIn: true, prescriptionRequired: false });
      });
    setPending((p) => [...p, ...items]);
    setMessage(`${items.length} tests added${bad.length ? ` · skipped lines ${bad.join(', ')} (need a name and a price)` : ''}`);
    if (items.length) (setPaste(''), setShowPaste(false));
  }

  async function remove(productId: string) {
    try {
      const v = await api<OnboardingView>(`/partners/stores/${storeId}/onboarding/products/${productId}`, { method: 'DELETE' });
      setProducts(v.catalog.products);
      refresh();
    } catch (err) {
      setMessage(errorMessageOf(err) ?? 'Could not remove');
    }
  }

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => (e.preventDefault(), submit({ items: pending }))} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200">
        <span className="text-sm">
          <b>{total}</b> tests & packages · aim for at least <b>{min}</b> to go live
        </span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full bg-state-ready transition-all" style={{ width: `${Math.min(100, (total / min) * 100)}%` }} />
        </div>
      </div>

      <Card title="Add a test or package">
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="Test name" className="sm:col-span-3">
            <TextInput value={row.name} onChange={(e) => setRow((r) => ({ ...r, name: e.target.value }))} placeholder="Complete Blood Count (CBC)" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRow())} />
          </Field>
          <Field label="Price (₹)" className="sm:col-span-1">
            <TextInput inputMode="decimal" value={row.price} onChange={(e) => setRow((r) => ({ ...r, price: e.target.value.replace(/[^\d.]/g, '') }))} />
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <TextInput value={row.category} onChange={(e) => setRow((r) => ({ ...r, category: e.target.value }))} placeholder="Blood tests" />
          </Field>
          <Field label="Sample" className="sm:col-span-2">
            <Select value={row.sampleType} onChange={(e) => setRow((r) => ({ ...r, sampleType: e.target.value as SampleType }))}>
              {SAMPLE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fasting (hours)" className="sm:col-span-1">
            <TextInput inputMode="numeric" value={row.fastingHours} onChange={(e) => setRow((r) => ({ ...r, fastingHours: e.target.value.replace(/\D/g, '') }))} />
          </Field>
          <Field label="Report in (hours)" className="sm:col-span-1">
            <TextInput inputMode="numeric" value={row.reportHours} onChange={(e) => setRow((r) => ({ ...r, reportHours: e.target.value.replace(/\D/g, '') }))} />
          </Field>
          <Field label="Tests included" className="sm:col-span-2" hint="For packages (optional)">
            <TextInput inputMode="numeric" value={row.parameters} onChange={(e) => setRow((r) => ({ ...r, parameters: e.target.value.replace(/\D/g, '') }))} placeholder="e.g. 24" />
          </Field>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-5">
            {[
              { k: 'homeCollection' as const, label: 'Home collection', icon: Home, disabled: !homeOk },
              { k: 'walkIn' as const, label: 'Walk-in', icon: Store, disabled: false },
            ].map((o) => (
              <button
                key={o.k}
                type="button"
                disabled={o.disabled}
                onClick={() => setRow((r) => ({ ...r, [o.k]: !r[o.k] }))}
                aria-pressed={row[o.k]}
                className={`flex h-11 items-center gap-2 rounded-xl border-[1.5px] px-3 text-sm font-semibold disabled:opacity-40 ${row[o.k] ? 'border-black bg-dz-yellow-soft' : 'border-neutral-300'}`}
              >
                <o.icon className="h-4 w-4" aria-hidden /> {o.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRow((r) => ({ ...r, rx: !r.rx }))}
              aria-pressed={row.rx}
              className={`flex h-11 items-center gap-2 rounded-xl border-[1.5px] px-3 text-sm font-semibold ${row.rx ? 'border-dz-red bg-red-50 text-dz-red' : 'border-neutral-300'}`}
            >
              Rx · Doctor’s prescription required
            </button>
          </div>
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
            <TextArea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'One test per line: name, price, category, fasting hours, report hours\nLipid Profile, 600, Heart, 12, 24\nUrine Routine, 200, Urine tests, 0, 12'} />
            <button type="button" onClick={importPaste} className="h-11 rounded-xl bg-dz-yellow px-4 text-sm font-semibold">
              Add rows
            </button>
          </div>
        )}
        {!homeOk && <p className="mt-3 text-xs text-neutral-500">Home collection is off for your lab — turn it on in the Sample collection step to offer it per test.</p>}
      </Card>

      {pending.length > 0 && (
        <Card title={`New — saved when you continue (${pending.length})`}>
          <TestList
            rows={pending.map((p, i) => ({ key: `${p.name}-${i}`, name: p.name, category: p.category, price: p.price, rx: p.prescriptionRequired, sample: p.sampleType, fasting: p.fastingHours, report: p.reportHours, home: p.homeCollection, walk: p.walkIn }))}
            onRemove={(i) => setPending((x) => x.filter((_, j) => j !== i))}
          />
        </Card>
      )}
      {products.length > 0 && (
        <Card title={`Saved (${products.length})`}>
          <TestList
            rows={products.map((p) => ({ key: p.id, name: p.name, category: p.category?.name, price: p.price, rx: p.prescriptionRequired, sample: p.lab?.sampleType ?? undefined, fasting: p.lab?.fastingHours ?? undefined, report: p.lab?.reportHours ?? undefined, home: p.lab?.homeCollection ?? undefined, walk: p.lab?.walkIn ?? undefined }))}
            onRemove={(i) => void remove(products[i].id)}
          />
        </Card>
      )}
      {errors.items && <p className="text-sm text-state-delayed">{errors.items}</p>}
    </form>
  );
}

function TestList({ rows, onRemove }: { rows: { key: string; name: string; category?: string; price: number; rx: boolean; sample?: string; fasting?: number; report?: number; home?: boolean; walk?: boolean }[]; onRemove: (i: number) => void }) {
  return (
    <ul className="divide-y divide-neutral-100 text-sm">
      {rows.map((t, i) => (
        <li key={t.key} className="flex items-center justify-between gap-2 py-2">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-ink-3" aria-hidden />
              <b className="font-semibold">{t.name}</b>
              {t.rx && <span className="rounded bg-red-50 px-1 text-xs font-bold text-dz-red">Rx</span>}
            </span>
            <span className="block text-xs text-neutral-500">
              {[t.category, t.sample && t.sample.toLowerCase(), t.fasting ? `${t.fasting} h fasting` : t.fasting === 0 ? 'no fasting' : null, t.report ? `report in ${t.report} h` : null, [t.home && 'home', t.walk && 'walk-in'].filter(Boolean).join(' + ')].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <b>{rupees(t.price)}</b>
            <button type="button" aria-label="Remove" className="text-neutral-400 hover:text-dz-red" onClick={() => onRemove(i)}>
              ✕
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

// OPERATIONS — sample collection
export function LabOperationsStep({ view, submit, errors }: StepProps) {
  const s = view.store;
  const [o, setO] = useState({
    supportsDelivery: s.supportsDelivery,
    supportsPickup: s.supportsPickup,
    deliveryRadiusKm: s.deliveryRadiusKm,
    collectionFee: s.collectionFee ?? 0,
    maxOrdersPerHour: s.maxOrdersPerHour,
  });
  const set = <K extends keyof typeof o>(k: K) => (v: (typeof o)[K]) => setO((x) => ({ ...x, [k]: v }));

  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        // Prep-time fields don't apply to labs; the server still expects them.
        submit({ ...o, defaultPrepMinutes: 30, peakPrepMinutes: 45, aiPrepEnabled: false });
      }}
      className="space-y-6"
    >
      <Card title="How do customers give samples?">
        <div className="space-y-3">
          <Toggle checked={o.supportsDelivery} onChange={set('supportsDelivery')} label="Home sample collection" hint="Your phlebotomist visits the customer at the booked slot" />
          <Toggle checked={o.supportsPickup} onChange={set('supportsPickup')} label="Walk-in at the lab" hint="Customers book a slot and visit you" />
          {errors.supportsDelivery && <p className="text-sm text-state-delayed">{errors.supportsDelivery}</p>}
          {o.supportsDelivery && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Collection radius">
                <Stepper value={o.deliveryRadiusKm} onChange={set('deliveryRadiusKm')} min={1} max={15} unit="km" />
              </Field>
              <Field label="Home collection fee (₹)" error={errors.collectionFee} hint="0 for free collection">
                <TextInput inputMode="decimal" value={o.collectionFee / 100} onChange={(e) => set('collectionFee')(Math.round(Number(e.target.value.replace(/[^\d.]/g, '') || 0) * 100))} />
              </Field>
            </div>
          )}
        </div>
      </Card>
      <Card title="Capacity">
        <Field label="Max bookings per hour (optional)" hint="We stop offering slots when you reach it">
          <TextInput inputMode="numeric" value={o.maxOrdersPerHour ?? ''} onChange={(e) => set('maxOrdersPerHour')(e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null)} placeholder="No limit" />
        </Field>
      </Card>
      <Card title="Prescriptions & reports">
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          <li>Tests marked “Rx” can only be booked with a doctor’s prescription — you check it before collecting the sample.</li>
          <li>Reports are released only after your pathologist signs them, and are shared securely with the customer.</li>
        </ul>
      </Card>
    </form>
  );
}
