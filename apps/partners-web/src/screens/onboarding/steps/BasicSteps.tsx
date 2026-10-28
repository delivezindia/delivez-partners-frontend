import { useRef, useState } from 'react';
import { Card, Chips, CuisinePicker, Field, Select, TextArea, TextInput, Toggle } from '../../../components/form';
import { MapPicker } from '../../../components/MapPicker';
import { useAddressAutofill } from '../../../lib/addressAutofill';
import { slotsFrom, slotsToTimings, TimingsEditor } from '../../../components/TimingsEditor';
import { STEP_FORM_ID, type StepProps } from './types';

const BENGALURU: [number, number] = [12.9716, 77.5946];

// ELIGIBILITY (STORE_V1 / PHARMACY_V1)
export function EligibilityStep({ view, submit, errors }: StepProps) {
  const saved = view.session.stepData.ELIGIBILITY as { pincode?: string; hoursPerDay?: number; homeDelivery?: boolean; hasDrugLicense?: boolean; hasPharmacist?: boolean } | undefined;
  const pharmacy = view.store.vertical === 'PHARMACY';
  const [pincode, setPincode] = useState(saved?.pincode ?? '');
  const [hours, setHours] = useState(saved?.hoursPerDay ?? 12);
  const [delivery, setDelivery] = useState(saved?.homeDelivery ?? true);
  const [license, setLicense] = useState(saved?.hasDrugLicense ?? false);
  const [pharmacist, setPharmacist] = useState(saved?.hasPharmacist ?? false);

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({ pincode, hoursPerDay: hours, homeDelivery: delivery, ...(pharmacy ? { hasDrugLicense: license, hasPharmacist: pharmacist } : {}) }); }} className="space-y-5">
      {pharmacy && (
        <Card title="Before you start, you'll need">
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>Drug licences — Form 20 and Form 21</li>
            <li>A registered pharmacist (registration number and state council)</li>
            <li>Address proof · GST certificate (optional)</li>
          </ul>
        </Card>
      )}
      <Field label="Shop PIN code" error={errors.pincode} hint="We check whether we deliver in your area">
        <TextInput inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="560038" />
      </Field>
      <Field label="How many hours a day are you open?" error={errors.hoursPerDay} hint="Stores need at least 6 hours a day">
        <TextInput type="number" min={0} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </Field>
      <Toggle checked={delivery} onChange={setDelivery} label="Home delivery" hint="Turn off if customers will only pick up from your shop" />
      {pharmacy && (
        <>
          <Toggle checked={license} onChange={setLicense} label="I have valid drug licences (Form 20 & 21)" />
          <Toggle checked={pharmacist} onChange={setPharmacist} label="A registered pharmacist works at my pharmacy" />
        </>
      )}
    </form>
  );
}

const PARTNER_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'PROPRIETORSHIP', label: 'Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'PVT_LTD', label: 'Private limited' },
  { value: 'LLP', label: 'LLP' },
  { value: 'OTHER', label: 'Other' },
];

// BASIC_DETAILS
export function BasicDetailsStep({ view, submit, errors }: StepProps) {
  const saved = view.session.stepData.BASIC_DETAILS as Record<string, unknown> | undefined;
  const eat = view.store.vertical === 'EAT';
  const vendor = view.session.flowVersion === 'VENDOR_V1';
  const [form, setForm] = useState({
    storeName: view.store.name,
    ownerName: (saved?.ownerName as string) ?? '',
    legalName: (saved?.legalName as string) ?? '',
    partnerType: (saved?.partnerType as string) ?? view.partnerAccount.partnerType,
    email: view.store.email ?? '',
    whatsappPhone: view.store.whatsappPhone ?? '',
    gstin: view.partnerAccount.gstin ?? '',
    description: view.store.description ?? '',
  });
  const [cuisines, setCuisines] = useState<string[]>(view.store.cuisines);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ ...form, cuisines: eat ? cuisines : undefined, partnerType: vendor ? 'INDIVIDUAL' : form.partnerType });
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={eat ? 'Restaurant name' : vendor ? 'Stall / shop name' : 'Store name'} error={errors.storeName}>
          <TextInput value={form.storeName} onChange={set('storeName')} required />
        </Field>
        <Field label="Owner's full name" error={errors.ownerName}>
          <TextInput value={form.ownerName} onChange={set('ownerName')} required autoComplete="name" />
        </Field>
        <Field label="Phone" hint="Your login number — customers and riders never see it directly">
          <TextInput value={view.store.phone ?? ''} disabled />
        </Field>
        <Field label="WhatsApp number" hint="If different from your phone" error={errors.whatsappPhone}>
          <TextInput inputMode="tel" value={form.whatsappPhone} onChange={set('whatsappPhone')} />
        </Field>
        <Field label="Email (optional)" error={errors.email}>
          <TextInput type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        {!vendor && (
          <Field label="Business type" error={errors.partnerType}>
            <Select value={form.partnerType} onChange={set('partnerType')}>
              {PARTNER_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!vendor && (
          <Field label="Registered business name (optional)" hint="As on GST / bank account" error={errors.legalName}>
            <TextInput value={form.legalName} onChange={set('legalName')} />
          </Field>
        )}
        {!vendor && (
          <Field label="GSTIN (optional)" error={errors.gstin}>
            <TextInput value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} maxLength={15} placeholder="29ABCDE1234F1Z5" />
          </Field>
        )}
      </div>
      {eat && (
        <Field label="Cuisines" hint="Pick up to 10" error={errors.cuisines}>
          <CuisinePicker value={cuisines} onChange={setCuisines} />
        </Field>
      )}
      <Field label="Short description (optional)" error={errors.description}>
        <TextArea value={form.description} onChange={set('description')} maxLength={300} placeholder={eat ? 'Famous for Andhra-style biryani since 2006' : 'What customers can buy from you'} />
      </Field>
    </form>
  );
}

// OUTLET — map pin, address and hours
export function OutletStep({ view, submit, errors }: StepProps) {
  const saved = view.session.stepData.OUTLET as { seatingType?: string; placeId?: string } | undefined;
  const elig = view.session.stepData.ELIGIBILITY as { pincode?: string } | undefined;
  const [lat, setLat] = useState<number | null>(view.store.lat);
  const [lng, setLng] = useState<number | null>(view.store.lng);
  const [address, setAddress] = useState({
    addressLine1: view.store.addressLine1 ?? '',
    addressLine2: view.store.addressLine2 ?? '',
    landmark: view.store.landmark ?? '',
    pincode: view.store.pincode ?? elig?.pincode ?? '',
  });
  const [placeId, setPlaceId] = useState(saved?.placeId);
  // The address follows the pin until the partner edits a field themselves. The eligibility PIN code counts as
  // map-filled, so the pin's real PIN code replaces it.
  const autofill = useAddressAutofill<'addressLine1' | 'addressLine2' | 'landmark' | 'pincode'>({ pincode: view.store.pincode ? undefined : elig?.pincode });
  const [filled, setFilled] = useState(false);
  const [seating, setSeating] = useState(saved?.seatingType ?? 'DINE_IN');
  const [slots, setSlots] = useState(slotsFrom(view.store.timings, view.store.vertical === 'EAT' ? { opensAt: '11:00', closesAt: '23:00' } : undefined));
  const [pinError, setPinError] = useState('');
  const eat = view.store.vertical === 'EAT';

  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        if (lat == null || lng == null) return setPinError('Drop the pin on your shop');
        setPinError('');
        submit({ ...address, lat, lng, placeId, timings: slotsToTimings(slots), seatingType: eat ? seating : undefined });
      }}
      className="space-y-6"
    >
      <Card title="Where is your shop?">
        <MapPicker
          lat={lat}
          lng={lng}
          fallbackCenter={BENGALURU}
          onChange={(a, b) => {
            setLat(a);
            setLng(b);
            setPinError('');
          }}
          onAddress={(r) => {
            setPlaceId(r.placeId);
            setFilled(true);
            setAddress((cur) =>
              autofill(cur, {
                addressLine1: r.street ?? r.line1,
                addressLine2: r.street ? r.area : null,
                landmark: r.landmark,
                pincode: r.pincode && /^\d{6}$/.test(r.pincode) ? r.pincode : null,
              }),
            );
          }}
        />
        {(pinError || errors.lat) && <p className="mt-2 text-sm text-state-delayed">{pinError || errors.lat}</p>}
        {filled && <p className="mt-2 rounded-lg bg-dz-yellow-soft px-3 py-2 text-xs font-semibold" data-autofilled>Address filled from the pin — check it and correct anything that’s wrong.</p>}
        {view.store.addressConfidence && view.store.lat === lat && (
          <p className="mt-2 text-xs text-neutral-500">
            Address confidence: <b>{view.store.addressConfidence}</b>
            {view.store.zone ? ` · ${view.store.zone.name}, ${view.store.city?.name}` : view.store.city ? ` · ${view.store.city.name}` : ''}
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Shop no. / building / street" error={errors.addressLine1} className="sm:col-span-2">
            <TextInput value={address.addressLine1} onChange={(e) => setAddress((a) => ({ ...a, addressLine1: e.target.value }))} required />
          </Field>
          <Field label="Area / locality (optional)" error={errors.addressLine2}>
            <TextInput value={address.addressLine2} onChange={(e) => setAddress((a) => ({ ...a, addressLine2: e.target.value }))} />
          </Field>
          <Field label="Landmark" hint="Helps riders find you" error={errors.landmark}>
            <TextInput value={address.landmark} onChange={(e) => setAddress((a) => ({ ...a, landmark: e.target.value }))} placeholder="Opp. metro station" />
          </Field>
          <Field label="PIN code" error={errors.pincode}>
            <TextInput
              inputMode="numeric"
              maxLength={6}
              value={address.pincode}
              onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, '') }))}
              required
            />
          </Field>
        </div>
      </Card>

      {eat && (
        <Card title="Seating">
          <Chips
            options={[
              { value: 'DINE_IN', label: 'Dine-in restaurant' },
              { value: 'TAKEAWAY', label: 'Takeaway counter' },
              { value: 'CLOUD', label: 'Cloud kitchen' },
            ]}
            value={[seating]}
            onChange={(v) => setSeating(v[0])}
          />
        </Card>
      )}

      <Card title="Opening hours">
        <TimingsEditor value={slots} onChange={setSlots} />
        {errors.timings && <p className="mt-2 text-sm text-state-delayed">{errors.timings}</p>}
      </Card>
    </form>
  );
}
