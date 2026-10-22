import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-store';
import { errorMessageOf, fieldErrorsOf, rupees, type OnboardingView } from '../../lib/onboarding';
import type { PartnerRole } from '../../lib/types';
import { Card, Chips, Field, Stepper, TextArea, TextInput, Toggle } from '../../components/form';
import { DocumentUpload } from '../../components/DocumentUpload';
import { Button, ErrorText } from '../../components/ui';
import { useStoreContext } from './StoreLayout';
import { toast } from '../../components/feedback';
import { useI18n, type LanguageCode } from '../../lib/i18n';
import { PinForm } from './SwitchUser';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CUISINES = ['North Indian', 'South Indian', 'Biryani', 'Chinese', 'Andhra', 'Chettinad', 'Kerala', 'Street food', 'Pizza', 'Burgers', 'Desserts', 'Bakery', 'Beverages', 'Healthy'];

interface Timing {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}
interface SettingsResponse {
  store: Record<string, unknown> & {
    vertical: string;
    name: string;
    phone: string | null;
    addressLine1: string | null;
    description: string | null;
    cuisines: string[];
    whatsappPhone: string | null;
    email: string | null;
    timings: Timing[];
    holidays: { id: string; date: string; reason: string | null }[];
  };
  hours: { openNow: boolean; nextOpening: string | null };
}

const ALL: PartnerRole[] = ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST', 'ACCOUNTANT'];
const SECTIONS: { key: string; label: string; roles: PartnerRole[] }[] = [
  { key: 'profile', label: 'Store profile', roles: ['OWNER', 'MANAGER'] },
  { key: 'hours', label: 'Hours & holidays', roles: ['OWNER', 'MANAGER'] },
  { key: 'operations', label: 'Delivery & operations', roles: ['OWNER', 'MANAGER'] },
  { key: 'ai', label: 'AI controls', roles: ['OWNER', 'MANAGER'] },
  { key: 'documents', label: 'Documents', roles: ['OWNER', 'MANAGER'] },
  { key: 'bank', label: 'Bank & payouts', roles: ['OWNER', 'ACCOUNTANT'] },
  { key: 'legal', label: 'Agreements', roles: ALL },
  { key: 'me', label: 'My PIN & language', roles: ALL },
];

// P25 Settings
export default function Settings() {
  const { storeId, role } = useStoreContext();
  const [params, setParams] = useSearchParams();
  const allowed = SECTIONS.filter((s) => s.roles.includes(role));
  const tab = allowed.find((s) => s.key === params.get('tab'))?.key ?? allowed[0].key;
  const canEdit = role === 'OWNER' || role === 'MANAGER';
  const settings = useQuery({ queryKey: ['settings', storeId], queryFn: () => api<SettingsResponse>(`/partners/stores/${storeId}/settings`), enabled: canEdit });

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings sections">
        {allowed.map((s) => (
          <button
            key={s.key}
            onClick={() => setParams({ tab: s.key }, { replace: true })}
            className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${tab === s.key ? 'bg-white text-dz-red shadow-sm ring-1 ring-line' : 'text-ink-2 hover:bg-white'}`}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        <h1 className="mb-5 text-[clamp(28px,3.5vw,40px)]">{SECTIONS.find((s) => s.key === tab)?.label}</h1>
        {canEdit && settings.isLoading && ['profile', 'hours', 'operations', 'ai'].includes(tab) && <p className="text-ink-3">Loading…</p>}
        {settings.data && tab === 'profile' && <ProfileSection s={settings.data.store} />}
        {settings.data && tab === 'hours' && <HoursSection data={settings.data} />}
        {settings.data && tab === 'operations' && <OperationsSection s={settings.data.store} />}
        {settings.data && tab === 'ai' && <AiSection s={settings.data.store} />}
        {tab === 'documents' && <DocumentsSection />}
        {tab === 'bank' && <BankSection />}
        {tab === 'legal' && <LegalSection />}
        {tab === 'me' && <MeSection />}
      </div>
    </div>
  );
}

/** PATCH /settings with a saved/error line. */
function useSaveSettings() {
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => api<SettingsResponse>(`/partners/stores/${storeId}/settings`, { method: 'PATCH', body: patch }),
    onSuccess: (data) => {
      qc.setQueryData(['settings', storeId], data);
      void qc.invalidateQueries({ queryKey: ['store', storeId] });
    },
  });
}

function SaveBar({ m, onSave, children }: { m: ReturnType<typeof useSaveSettings>; onSave: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button onClick={onSave} disabled={m.isPending}>
        {m.isPending ? 'Saving…' : 'Save changes'}
      </Button>
      {m.isSuccess && !m.isPending && <span className="text-sm font-bold text-dz-green">✓ Saved</span>}
      {m.error && <ErrorText>{errorMessageOf(m.error)}</ErrorText>}
      {children}
    </div>
  );
}

function ProfileSection({ s }: { s: SettingsResponse['store'] }) {
  const save = useSaveSettings();
  const [f, setF] = useState({ description: s.description ?? '', whatsappPhone: s.whatsappPhone ?? '', email: s.email ?? '' });
  const [cuisines, setCuisines] = useState<string[]>(s.cuisines);
  const errors = fieldErrorsOf(save.error);
  return (
    <div className="space-y-5">
      <Card title="Shown to customers">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" hint="Contact support to rename a live store">
            <TextInput value={s.name} disabled />
          </Field>
          <Field label="Address" hint="Contact support to move your store">
            <TextInput value={s.addressLine1 ?? ''} disabled />
          </Field>
          <Field label="Description" error={errors.description} className="sm:col-span-2">
            <TextArea value={f.description} maxLength={300} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
        </div>
        {s.vertical === 'EAT' && (
          <Field label="Cuisines" className="mt-4">
            <Chips multiple options={CUISINES.map((c) => ({ value: c, label: c }))} value={cuisines} onChange={(v) => setCuisines(v.slice(0, 10))} />
          </Field>
        )}
      </Card>
      <Card title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone (login)" hint="Your login number">
            <TextInput value={s.phone ?? ''} disabled />
          </Field>
          <Field label="WhatsApp number" error={errors.whatsappPhone}>
            <TextInput value={f.whatsappPhone} onChange={(e) => setF({ ...f, whatsappPhone: e.target.value })} />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
        </div>
      </Card>
      <SaveBar m={save} onSave={() => save.mutate({ ...f, ...(s.vertical === 'EAT' ? { cuisines } : {}) })} />
    </div>
  );
}

function HoursSection({ data }: { data: SettingsResponse }) {
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  const [slots, setSlots] = useState<Timing[]>(data.store.timings.map(({ dayOfWeek, opensAt, closesAt }) => ({ dayOfWeek, opensAt, closesAt })));
  const [holiday, setHoliday] = useState({ date: '', reason: '' });
  const put = (d: SettingsResponse) => qc.setQueryData(['settings', storeId], d);
  const saveHours = useMutation({ mutationFn: () => api<SettingsResponse>(`/partners/stores/${storeId}/timings`, { method: 'PUT', body: { timings: slots } }), onSuccess: (d) => (put(d), void qc.invalidateQueries({ queryKey: ['store', storeId] })) });
  const addHoliday = useMutation({ mutationFn: () => api<SettingsResponse>(`/partners/stores/${storeId}/holidays`, { method: 'POST', body: { date: holiday.date, reason: holiday.reason || undefined } }), onSuccess: (d) => (put(d), setHoliday({ date: '', reason: '' })) });
  const removeHoliday = useMutation({ mutationFn: (id: string) => api<SettingsResponse>(`/partners/stores/${storeId}/holidays/${id}`, { method: 'DELETE' }), onSuccess: put });

  const update = (i: number, patch: Partial<Timing>) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${data.hours.openNow ? 'bg-dz-green-soft text-dz-green' : 'bg-soft text-ink-2'}`}>
        {data.hours.openNow ? 'Within opening hours now.' : `Outside opening hours now${data.hours.nextOpening ? ` — next opening ${data.hours.nextOpening}` : ''}.`} Your store closes and reopens automatically on this schedule.
      </p>
      <Card title="Weekly hours">
        <div className="space-y-4">
          {DAYS.map((day, d) => {
            const daySlots = slots.map((s, i) => ({ ...s, i })).filter((s) => s.dayOfWeek === d);
            return (
              <div key={day} className="flex flex-wrap items-start gap-3 border-b border-line pb-3 last:border-0">
                <span className="w-24 pt-2.5 font-bold">{day}</span>
                <div className="flex-1 space-y-2">
                  {daySlots.length === 0 && <p className="pt-2.5 text-sm text-ink-3">Closed</p>}
                  {daySlots.map((s) => (
                    <div key={s.i} className="flex flex-wrap items-center gap-2">
                      <input type="time" value={s.opensAt} onChange={(e) => update(s.i, { opensAt: e.target.value })} className="h-11 rounded-[9px] border-[1.5px] border-line px-2" aria-label={`${day} opens`} />
                      <span className="text-ink-3">to</span>
                      <input type="time" value={s.closesAt} onChange={(e) => update(s.i, { closesAt: e.target.value })} className="h-11 rounded-[9px] border-[1.5px] border-line px-2" aria-label={`${day} closes`} />
                      <button type="button" onClick={() => setSlots((x) => x.filter((_, j) => j !== s.i))} className="px-2 text-sm font-bold text-ink-3 hover:text-dz-red" aria-label="Remove slot">
                        ✕
                      </button>
                      {s.closesAt <= s.opensAt && <span className="text-xs font-semibold text-dz-red">Closing must be after opening</span>}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setSlots((x) => [...x, { dayOfWeek: d, opensAt: daySlots.at(-1)?.closesAt && daySlots.at(-1)!.closesAt < '22:00' ? '18:00' : '10:00', closesAt: '22:00' }])} className="pt-2.5 text-sm font-bold text-dz-red">
                  + Add {daySlots.length ? 'shift' : 'hours'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => saveHours.mutate()} disabled={saveHours.isPending}>
            {saveHours.isPending ? 'Saving…' : 'Save hours'}
          </Button>
          {saveHours.isSuccess && <span className="text-sm font-bold text-dz-green">✓ Saved</span>}
          {saveHours.error && <ErrorText>{errorMessageOf(saveHours.error)}</ErrorText>}
        </div>
      </Card>

      <Card title="Holidays">
        <p className="mb-3 text-sm text-ink-2">On these dates you're closed all day.</p>
        <ul className="mb-4 divide-y divide-line">
          {data.store.holidays.length === 0 && <li className="py-2 text-sm text-ink-3">No upcoming holidays.</li>}
          {data.store.holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <b>{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</b>
                {h.reason && <span className="text-ink-3"> · {h.reason}</span>}
              </span>
              <button type="button" className="font-bold text-ink-3 hover:text-dz-red" onClick={() => removeHoliday.mutate(h.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Date">
            <TextInput type="date" min={today} value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} />
          </Field>
          <Field label="Reason (optional)" className="min-w-48 flex-1">
            <TextInput value={holiday.reason} maxLength={120} onChange={(e) => setHoliday({ ...holiday, reason: e.target.value })} placeholder="Diwali" />
          </Field>
          <Button variant="dark" disabled={!holiday.date || addHoliday.isPending} onClick={() => addHoliday.mutate()}>
            Add holiday
          </Button>
        </div>
        {addHoliday.error && <ErrorText>{errorMessageOf(addHoliday.error)}</ErrorText>}
      </Card>
    </div>
  );
}

function OperationsSection({ s }: { s: SettingsResponse['store'] }) {
  const save = useSaveSettings();
  const v = s as unknown as Record<string, number | boolean | null>;
  const [o, setO] = useState({
    supportsDelivery: v.supportsDelivery as boolean,
    supportsPickup: v.supportsPickup as boolean,
    deliveryRadiusKm: v.deliveryRadiusKm as number,
    defaultPrepMinutes: v.defaultPrepMinutes as number,
    peakPrepMinutes: v.peakPrepMinutes as number,
    acceptMultipleOrders: v.acceptMultipleOrders as boolean,
    maxOrdersPerHour: v.maxOrdersPerHour as number | null,
    autoPauseOverloaded: v.autoPauseOverloaded as boolean,
    autoAcceptOrders: v.autoAcceptOrders as boolean,
    allowSubstitutions: v.allowSubstitutions as boolean,
    minOrderAmount: v.minOrderAmount as number,
    packagingFee: v.packagingFee as number,
    collectionFee: (v.collectionFee as number) ?? 0,
    allowGenericSubstitution: v.allowGenericSubstitution as boolean,
    contactIfRxUnclear: v.contactIfRxUnclear as boolean,
  });
  const set = <K extends keyof typeof o>(k: K) => (val: (typeof o)[K]) => setO((x) => ({ ...x, [k]: val }));
  const errors = fieldErrorsOf(save.error);
  const eat = s.vertical === 'EAT';
  const pharmacy = s.vertical === 'PHARMACY';
  const lab = s.vertical === 'DIAGNOSTICS';

  return (
    <div className="space-y-5">
      <Card title={lab ? 'Sample collection' : 'Delivery & pickup'}>
        <div className="space-y-3">
          <Toggle checked={o.supportsDelivery} onChange={set('supportsDelivery')} label={lab ? 'Home sample collection' : 'Delivery by Delivez riders'} />
          <Toggle checked={o.supportsPickup} onChange={set('supportsPickup')} label={lab ? 'Walk-in at the lab' : 'Customer pickup'} />
          {errors.supportsDelivery && <ErrorText>{errors.supportsDelivery}</ErrorText>}
          {o.supportsDelivery && (
            <Field label={lab ? 'Collection radius' : 'Delivery radius'} hint={lab ? undefined : 'Soft-launch (LIMITED) stores are capped at 2 km'}>
              <Stepper value={o.deliveryRadiusKm} onChange={set('deliveryRadiusKm')} min={1} max={15} unit="km" />
            </Field>
          )}
          {lab && o.supportsDelivery && (
            <Field label="Home collection fee (₹)" hint="0 for free collection">
              <TextInput inputMode="decimal" value={o.collectionFee / 100} onChange={(e) => set('collectionFee')(Math.round(Number(e.target.value.replace(/[^\d.]/g, '') || 0) * 100))} />
            </Field>
          )}
          <Field label="Minimum order (₹)">
            <TextInput inputMode="decimal" value={o.minOrderAmount / 100} onChange={(e) => set('minOrderAmount')(Math.round(Number(e.target.value.replace(/[^\d.]/g, '') || 0) * 100))} />
          </Field>
        </div>
      </Card>
      {!lab && (
      <Card title="Prep time">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Normal" error={errors.defaultPrepMinutes}>
            <Stepper value={o.defaultPrepMinutes} onChange={set('defaultPrepMinutes')} min={5} max={90} step={5} unit="min" />
          </Field>
          <Field label="At peak hours" error={errors.peakPrepMinutes}>
            <Stepper value={o.peakPrepMinutes} onChange={set('peakPrepMinutes')} min={5} max={120} step={5} unit="min" />
          </Field>
        </div>
      </Card>
      )}
      <Card title="Capacity">
        <div className="space-y-3">
          <Toggle checked={o.acceptMultipleOrders} onChange={set('acceptMultipleOrders')} label="Accept several orders at once" />
          <Toggle checked={o.autoAcceptOrders} onChange={set('autoAcceptOrders')} label="Auto-accept new orders" hint="Orders are accepted with your normal prep time — use only if someone always watches the screen" />
          <Field label="Max orders per hour" hint="We switch you to Busy when you reach it. Leave empty for no limit.">
            <TextInput inputMode="numeric" value={o.maxOrdersPerHour ?? ''} onChange={(e) => set('maxOrdersPerHour')(e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null)} placeholder="No limit" />
          </Field>
          <Toggle checked={o.autoPauseOverloaded} onChange={set('autoPauseOverloaded')} label="Pause new orders for 15 min when overloaded" />
          {!eat && !pharmacy && !lab && <Toggle checked={o.allowSubstitutions} onChange={set('allowSubstitutions')} label="Offer substitutes for out-of-stock items" hint="The customer approves each substitute" />}
          {eat && (
            <Field label="Packaging charge per order (₹)" error={errors.packagingFee}>
              <TextInput inputMode="decimal" value={o.packagingFee / 100} onChange={(e) => set('packagingFee')(Math.round(Number(e.target.value.replace(/[^\d.]/g, '') || 0) * 100))} />
            </Field>
          )}
        </div>
      </Card>
      {pharmacy && (
        <Card title="Prescription rules">
          <div className="space-y-3">
            <Toggle checked={o.allowGenericSubstitution} onChange={set('allowGenericSubstitution')} label="Allow generic substitutes (with customer approval)" />
            <Toggle checked={o.contactIfRxUnclear} onChange={set('contactIfRxUnclear')} label="Contact the customer if a prescription is unclear" />
          </div>
        </Card>
      )}
      <SaveBar m={save} onSave={() => save.mutate(o)} />
    </div>
  );
}

function AiSection({ s }: { s: SettingsResponse['store'] }) {
  const save = useSaveSettings();
  const v = s as unknown as Record<string, number | boolean>;
  const [o, setO] = useState({
    aiPrepEnabled: v.aiPrepEnabled as boolean,
    aiAlertsEnabled: v.aiAlertsEnabled as boolean,
    aiAutoExtendEta: v.aiAutoExtendEta as boolean,
    aiMenuAutoPause: v.aiMenuAutoPause as boolean,
    aiAggressiveness: v.aiAggressiveness as number,
  });
  const set = <K extends keyof typeof o>(k: K) => (val: (typeof o)[K]) => setO((x) => ({ ...x, [k]: val }));
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-ai-bg px-4 py-3 text-sm text-ai-accent">
        AI features are advisory and arrive in a later phase. Nothing runs without your switch — these settings are saved now so they apply the day the features go live.
      </p>
      <Card>
        <div className="space-y-3">
          <Toggle checked={o.aiPrepEnabled} onChange={set('aiPrepEnabled')} label="Prep-time suggestions" hint="Suggests a prep time for each order; you always choose" />
          <Toggle checked={o.aiAlertsEnabled} onChange={set('aiAlertsEnabled')} label="Delay risk alerts" hint="Warns you before an order is likely to run late" />
          <Toggle checked={o.aiAutoExtendEta} onChange={set('aiAutoExtendEta')} label="Auto-extend customer ETA" hint="Gives the customer an honest ETA when you're running behind" />
          <Toggle checked={o.aiMenuAutoPause} onChange={set('aiMenuAutoPause')} label="Pause complex items at peak" hint="Temporarily hides items marked complex when the kitchen is overloaded" />
          <Field label={`How proactive should suggestions be? (${o.aiAggressiveness})`}>
            <input type="range" min={0} max={100} step={10} value={o.aiAggressiveness} onChange={(e) => set('aiAggressiveness')(Number(e.target.value))} className="w-full accent-[var(--color-dz-red)]" />
            <div className="flex justify-between text-xs text-ink-3">
              <span>Cautious</span>
              <span>Proactive</span>
            </div>
          </Field>
        </div>
      </Card>
      <SaveBar m={save} onSave={() => save.mutate(o)} />
    </div>
  );
}

function DocumentsSection() {
  const { storeId } = useStoreContext();
  const { data: documents, refetch, isLoading, error } = useQuery({
    queryKey: ['documents', storeId],
    queryFn: () => api<OnboardingView['documents']>(`/partners/stores/${storeId}/documents`),
  });
  if (error) return <ErrorText>{errorMessageOf(error)}</ErrorText>;
  if (isLoading || !documents) return <p className="text-ink-3">Loading…</p>;
  const data = { documents };
  const latest = (type: string) => data.documents.uploaded.find((d) => d.type === type);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Keep licences up to date — an expired FSSAI or drug licence limits or suspends your store. Re-uploads are reviewed by our compliance team.</p>
      {[...data.documents.required.map((d) => ({ ...d, required: true })), ...data.documents.optional.map((d) => ({ ...d, required: false }))].map((d) => (
        <DocumentUpload key={d.type} storeId={storeId} type={d.type} label={d.label} required={d.required} current={latest(d.type)} onUploaded={() => void refetch()} />
      ))}
    </div>
  );
}

function BankSection() {
  const { storeId } = useStoreContext();
  const { data, isLoading, error } = useQuery({
    queryKey: ['bank', storeId],
    queryFn: () => api<{ settlementCycle: string; commissionPct: number; account: { accountHolderName: string; accountNumberLast4: string | null; ifsc: string | null; bankName: string | null; upiId: string | null; verificationStatus: string } | null }>(`/partners/stores/${storeId}/bank-account`),
  });
  if (isLoading) return <p className="text-ink-3">Loading…</p>;
  if (error || !data) return <ErrorText>{errorMessageOf(error)}</ErrorText>;
  return (
    <div className="space-y-5">
      <Card title="Payout account">
        {data.account ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-extrabold">{data.account.accountHolderName}</p>
              <p className="text-sm text-ink-2">{data.account.accountNumberLast4 ? `${data.account.bankName ?? 'Account'} ••••${data.account.accountNumberLast4} · ${data.account.ifsc}` : data.account.upiId}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${data.account.verificationStatus === 'VERIFIED' ? 'border-dz-green bg-dz-green-soft text-dz-green' : 'border-dz-yellow-strong bg-dz-yellow-soft'}`}>
              {data.account.verificationStatus.replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>
        ) : (
          <p className="text-ink-3">No payout account yet.</p>
        )}
        <p className="mt-4 text-sm text-ink-2">To change your payout account, contact partner support. For your safety, a change needs OTP re-verification and holds settlements for 48 hours.</p>
      </Card>
      <Card title="Commercials">
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
          <dt className="text-ink-3">Commission</dt>
          <dd className="font-bold">{data.commissionPct}%</dd>
          <dt className="text-ink-3">Settlement</dt>
          <dd className="font-bold">{data.settlementCycle.replace(/_/g, ' ').toLowerCase()}</dd>
          <dt className="text-ink-3">Example</dt>
          <dd>On a {rupees(50000)} order you receive {rupees(50000 * (1 - data.commissionPct / 100))} (before any refunds or penalties).</dd>
        </dl>
      </Card>
    </div>
  );
}

function LegalSection() {
  const { storeId, role } = useStoreContext();
  const qc = useQueryClient();
  type Legal = { required: { id: string; title: string; version: string; state: string | null; contentUrl: string; accepted: boolean; acceptedAt: string | null }[]; complete: boolean };
  const { data, isLoading } = useQuery({ queryKey: ['legal', storeId], queryFn: () => api<Legal>(`/partners/stores/${storeId}/legal`) });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const accept = useMutation({
    mutationFn: (ids: string[]) => api<Legal>(`/partners/stores/${storeId}/legal/accept`, { method: 'POST', body: { acceptedDocIds: ids } }),
    onSuccess: (d) => {
      qc.setQueryData(['legal', storeId], d);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
  if (isLoading || !data) return <p className="text-ink-3">Loading…</p>;
  const pending = data.required.filter((d) => !d.accepted);
  return (
    <div className="space-y-4">
      {data.required.map((d) => (
        <label key={d.id} className="flex items-start gap-3 rounded-[14px] border border-line bg-white p-4">
          {!d.accepted && role === 'OWNER' ? (
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-dz-red)]" checked={checked.has(d.id)} onChange={(e) => setChecked((s) => { const n = new Set(s); e.target.checked ? n.add(d.id) : n.delete(d.id); return n; })} />
          ) : (
            <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${d.accepted ? 'bg-dz-green text-white' : 'bg-dz-yellow-soft'}`}>{d.accepted ? '✓' : '!'}</span>
          )}
          <span className="flex-1 text-sm">
            <b className="block">
              {d.title}
              {d.state ? ` — ${d.state}` : ''}
            </b>
            <span className="text-ink-3">
              Version {d.version} ·{' '}
              <a href={d.contentUrl} target="_blank" rel="noreferrer" className="underline">
                read
              </a>
              {d.acceptedAt ? ` · accepted ${new Date(d.acceptedAt).toLocaleDateString()}` : ' · not yet accepted'}
            </span>
          </span>
        </label>
      ))}
      {pending.length > 0 && role === 'OWNER' && (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending.some((p) => !checked.has(p.id)) || accept.isPending} onClick={() => accept.mutate(pending.map((p) => p.id))}>
            Accept updated agreements
          </Button>
          {accept.error && <ErrorText>{errorMessageOf(accept.error)}</ErrorText>}
        </div>
      )}
      {pending.length > 0 && role !== 'OWNER' && <p className="text-sm text-ink-2">The store owner needs to accept the updated agreements.</p>}
      {pending.length === 0 && <p className="text-sm font-bold text-dz-green">All agreements are up to date.</p>}
    </div>
  );
}

function MeSection() {
  const { t, lang, languages, setLanguage, loading } = useI18n();
  // Confirm in the new language, once its translations have loaded.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (justSaved && !loading) {
      toast.success(t('settings.languageSaved'));
      setJustSaved(false);
    }
  }, [justSaved, loading, t]);
  return (
    <div className="space-y-5">
      <Card title="My PIN for shared tablets">
        <p className="mb-4 text-sm text-ink-2">With a PIN, you can switch to your account on the store tablet without an OTP.</p>
        <PinForm />
      </Card>
      <Card title={t('settings.languageTitle')}>
        <Chips
          options={languages.map((l) => ({ value: l.code, label: l.label }))}
          value={[lang]}
          onChange={(v) => v[0] && v[0] !== lang && void setLanguage(v[0] as LanguageCode).then(() => setJustSaved(true))}
        />
        <p className="mt-3 text-xs text-ink-3">{t('settings.languageHint')}</p>
      </Card>
    </div>
  );
}

