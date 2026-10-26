import { useState, useEffect } from 'react';
import { Card, Field, TextInput } from '../../../components/form';
import { DocumentUpload } from '../../../components/DocumentUpload';
import { DAYS, TimingsEditor, type DaySlot } from '../../../components/TimingsEditor';
import { api } from '../../../lib/api';
import { errorMessageOf, fieldErrorsOf, type OnboardingView, uploadDocument } from '../../../lib/onboarding';
import { STEP_FORM_ID, type StepProps } from './types';
import { ChequeScan } from '../../../components/ChequeScan';
import { useAddressAutofill } from '../../../lib/addressAutofill';

// DOCUMENTS — upload never blocks; compliance reviews in parallel (plan §5.2)
export function DocumentsStep({ view, storeId, submit, refresh }: StepProps) {
  const latest = (type: string) => view.documents.uploaded.find((d) => d.type === type);
  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({}); }} className="space-y-6">
      <p className="text-sm text-neutral-600">
        Clear photos or PDFs work best. Our compliance team verifies them — you can keep setting up while they do.
      </p>
      {view.documents.required.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Required</h3>
          {view.documents.required.map((d) => (
            <DocumentUpload key={d.type} storeId={storeId} type={d.type} label={d.label} required current={latest(d.type)} onUploaded={refresh} />
          ))}
        </div>
      )}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Optional</h3>
        {view.documents.optional.map((d) => (
          <DocumentUpload key={d.type} storeId={storeId} type={d.type} label={d.label} required={false} current={latest(d.type)} onUploaded={refresh} />
        ))}
      </div>
    </form>
  );
}

// PHARMACIST (PHARMACY_V1)
export function PharmacistStep({ view, submit, errors }: StepProps) {
  const p = view.pharmacist;
  const [form, setForm] = useState({
    name: p?.name ?? '',
    registrationNo: p?.registrationNo ?? '',
    stateCouncil: p?.stateCouncil ?? (view.store.city ? `${view.store.city.state} State Pharmacy Council` : ''),
  });
  const [slots, setSlots] = useState<DaySlot[]>(
    DAYS.map((_, d) => {
      const s = p?.shifts.find((x) => x.dayOfWeek === d);
      return { dayOfWeek: d, open: !p || !!s, opensAt: s?.startsAt ?? '09:00', closesAt: s?.endsAt ?? '21:00' };
    }),
  );
  const [consent, setConsent] = useState(!!p);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      id={STEP_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        submit({
          ...form,
          shifts: slots.filter((s) => s.open).map((s) => ({ dayOfWeek: s.dayOfWeek, startsAt: s.opensAt, endsAt: s.closesAt })),
          consent,
        });
      }}
      className="space-y-6"
    >
      <Card title="Registered pharmacist">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <TextInput value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Registration number" error={errors.registrationNo}>
            <TextInput value={form.registrationNo} onChange={set('registrationNo')} required placeholder="KA-12345" />
          </Field>
          <Field label="State pharmacy council" error={errors.stateCouncil} className="sm:col-span-2">
            <TextInput value={form.stateCouncil} onChange={set('stateCouncil')} required />
          </Field>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Upload the registration certificate in the Documents step.</p>
      </Card>
      <Card title="On-duty hours">
        <p className="mb-3 text-sm text-neutral-600">Prescription orders are only routed to you while a pharmacist is on duty.</p>
        <TimingsEditor value={slots} onChange={setSlots} labels={{ open: 'On duty', closed: 'Off' }} />
        {errors.shifts && <p className="mt-2 text-sm text-state-delayed">{errors.shifts}</p>}
      </Card>
      <label className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm">
          I confirm every prescription will be checked by a registered pharmacist before medicines are dispatched.
          {errors.consent && <span className="mt-1 block text-state-delayed">{errors.consent}</span>}
        </span>
      </label>
    </form>
  );
}

const BANK_STATUS: Record<NonNullable<OnboardingView['bank']>['verificationStatus'], { label: string; cls: string }> = {
  VERIFIED: { label: 'Verified', cls: 'bg-green-100 text-green-800' },
  PENNY_DROP_PENDING: { label: 'Under review', cls: 'bg-amber-100 text-amber-800' },
  UNVERIFIED: { label: 'Not verified', cls: 'bg-neutral-100 text-neutral-700' },
  FAILED: { label: 'Verification failed', cls: 'bg-red-100 text-red-800' },
};

// BANK — penny-drop verification (plan §5.3)
export function BankStep({ view, storeId, submit, refresh }: StepProps) {
  const vendor = view.session.flowVersion === 'VENDOR_V1';
  const bank = view.bank;
  const [editing, setEditing] = useState(!bank || bank.verificationStatus === 'FAILED');
  const [form, setForm] = useState({
    accountHolderName: bank?.accountHolderName ?? view.partnerAccount.legalName,
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: bank?.ifsc ?? '',
    bankName: bank?.bankName ?? '',
    upiId: bank?.upiId ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Scanned cheque/passbook: fills fields the partner hasn't typed into (the default business name counts as untouched).
  const autofill = useAddressAutofill<'accountHolderName' | 'accountNumber' | 'ifsc' | 'bankName'>({ accountHolderName: view.partnerAccount.legalName, bankName: bank?.bankName ?? undefined });
  const [cheque, setCheque] = useState<File | null>(null);
  const [scanned, setScanned] = useState(false);
  const [branch, setBranch] = useState<{ bank: string; branch: string | null; city: string | null } | null>(null);
  const [ifscError, setIfscError] = useState('');

  // Show the bank and branch for a complete IFSC, and fill the bank name from it.
  useEffect(() => {
    const code = form.ifsc.trim().toUpperCase();
    setBranch(null);
    setIfscError('');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return;
    let live = true;
    api<{ bank: string; branch: string | null; city: string | null }>(`/partners/stores/${storeId}/ifsc/${code}`)
      .then((b) => {
        if (!live) return;
        setBranch(b);
        setForm((f) => autofill(f, { bankName: b.bank }));
      })
      .catch((e) => live && (e as { status?: number }).status === 404 && setIfscError('No bank branch has this IFSC — check it on your cheque'));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ifsc, storeId]);

  async function verify() {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      await api(`/partners/stores/${storeId}/bank-account`, {
        method: 'PUT',
        body: vendor ? { accountHolderName: form.accountHolderName, upiId: form.upiId } : form,
      });
      // Keep the scanned cheque/passbook as the bank proof document (best effort).
      if (cheque) await uploadDocument(storeId, cheque, { type: 'BANK_PROOF' }).catch(() => undefined);
      setEditing(false);
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setError(errorMessageOf(err) ?? 'Could not save');
    } finally {
      setBusy(false);
      refresh();
    }
  }

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({}); }} className="space-y-6">
      {bank && !editing && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{bank.accountHolderName}</p>
              <p className="text-sm text-neutral-500">
                {bank.accountNumberLast4 ? `${bank.bankName ?? 'Account'} ••••${bank.accountNumberLast4} · ${bank.ifsc}` : bank.upiId}
              </p>
              {bank.verificationStatus === 'PENNY_DROP_PENDING' && (
                <p className="mt-1 text-xs text-amber-700">The name on the account didn't fully match your business name. Our finance team will verify it — payouts are not delayed.</p>
              )}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BANK_STATUS[bank.verificationStatus].cls}`}>{BANK_STATUS[bank.verificationStatus].label}</span>
          </div>
          {bank.verificationStatus !== 'VERIFIED' && (
            <button type="button" className="mt-3 text-sm font-semibold underline underline-offset-2" onClick={() => setEditing(true)}>
              Change account
            </button>
          )}
        </Card>
      )}

      {editing && (
        <Card title={vendor ? 'UPI ID for payouts' : 'Bank account for payouts'}>
          {!vendor && (
            <div className="mb-4">
              <ChequeScan
                onRead={(r, file) => {
                  setCheque(file);
                  setScanned(r.confidence !== 'NONE');
                  setForm((f) => ({ ...autofill(f, { accountHolderName: r.holderName, accountNumber: r.accountNumber, ifsc: r.ifsc, bankName: r.bankName }), confirmAccountNumber: r.accountNumber ? '' : f.confirmAccountNumber }));
                }}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account holder name" error={fieldErrors.accountHolderName} className="sm:col-span-2">
              <TextInput value={form.accountHolderName} onChange={set('accountHolderName')} />
            </Field>
            {vendor ? (
              <Field label="UPI ID" error={fieldErrors.upiId} className="sm:col-span-2">
                <TextInput value={form.upiId} onChange={set('upiId')} placeholder="name@okhdfcbank" />
              </Field>
            ) : (
              <>
                <Field label="Account number" error={fieldErrors.accountNumber}>
                  <TextInput inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))} />
                </Field>
                <Field label="Re-enter account number" error={fieldErrors.confirmAccountNumber} hint={scanned && form.accountNumber && !form.confirmAccountNumber ? 'Type it again from the cheque — this double-checks the digits we read' : undefined}>
                  <TextInput inputMode="numeric" autoComplete="off" onPaste={(e) => e.preventDefault()} value={form.confirmAccountNumber} onChange={(e) => setForm((f) => ({ ...f, confirmAccountNumber: e.target.value.replace(/\D/g, '') }))} />
                </Field>
                <Field label="IFSC" error={fieldErrors.ifsc || ifscError} hint={branch ? `${branch.bank}${branch.branch ? ` · ${branch.branch}` : ''}${branch.city ? `, ${branch.city}` : ''}` : undefined}>
                  <TextInput value={form.ifsc} maxLength={11} onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))} placeholder="HDFC0001234" />
                </Field>
                <Field label="Bank name (optional)" error={fieldErrors.bankName}>
                  <TextInput value={form.bankName} onChange={set('bankName')} />
                </Field>
              </>
            )}
          </div>
          {error && <p className="mt-3 whitespace-pre-line text-sm text-state-delayed">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button type="button" disabled={busy} onClick={verify} className="h-12 rounded-xl bg-dz-black px-5 font-semibold text-dz-yellow disabled:opacity-50">
              {busy ? 'Verifying…' : vendor ? 'Save UPI ID' : 'Verify account'}
            </button>
            <span className="text-xs text-neutral-500">{vendor ? '' : 'We send ₹1 to confirm the account. '}Only the last 4 digits are ever shown.</span>
          </div>
        </Card>
      )}
    </form>
  );
}

// COMMERCIALS — shown, not negotiated (plan §5.1.1)
export function CommercialsStep({ view, submit, errors }: StepProps) {
  const [ok, setOk] = useState(!!view.session.stepData.COMMERCIALS);
  const eat = view.store.vertical === 'EAT';
  const rows = [
    { k: 'Commission', v: `${view.store.commissionPct}% — launch offer`, note: 'No commission on your sales while the offer runs' },
    { k: 'Payouts', v: view.store.vertical === 'PHARMACY' ? 'Weekly (T+1 available)' : 'Weekly, every Monday', note: 'Straight to your verified bank account, with a statement' },
    { k: 'Delivery fee', v: 'Paid by the customer', note: 'You can choose to sponsor it later' },
    ...(eat ? [{ k: 'Packaging charge', v: 'Set by you', note: 'Added to the customer bill and paid to you' }] : []),
    { k: 'Taxes', v: 'GST as applicable', note: 'Shown separately on every invoice' },
    { k: 'Penalties', v: 'Only for repeated hard delays', note: 'Waived for your first 100 orders; always explained and disputable' },
  ];
  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({ acknowledged: ok }); }} className="space-y-5">
      <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        {rows.map((r) => (
          <div key={r.k} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
            <span className="font-medium">{r.k}</span>
            <span className="text-right">
              <span className="block font-semibold">{r.v}</span>
              <span className="block text-xs text-neutral-500">{r.note}</span>
            </span>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm">
          I understand these commercials.
          {errors.acknowledged && <span className="mt-1 block text-state-delayed">{errors.acknowledged}</span>}
        </span>
      </label>
    </form>
  );
}

// LEGAL — versioned click-wrap (plan §5.2)
export function LegalStep({ view, submit }: StepProps) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set(view.legal.required.filter((d) => d.accepted).map((d) => d.id)));
  const all = view.legal.required.length > 0 && view.legal.required.every((d) => accepted.has(d.id));
  const toggle = (id: string) => setAccepted((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <form id={STEP_FORM_ID} onSubmit={(e) => { e.preventDefault(); submit({ acceptedDocIds: [...accepted] }); }} className="space-y-4">
      {!view.legal.stateKnown && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Set your outlet location first — it decides which state terms apply.</p>
      )}
      {view.legal.required.map((d) => (
        <label key={d.id} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
          <input type="checkbox" checked={accepted.has(d.id)} disabled={d.accepted} onChange={() => toggle(d.id)} className="mt-1 h-5 w-5" />
          <span className="flex-1 text-sm">
            <span className="block font-semibold">
              {d.title}
              {d.state ? ` — ${d.state}` : ''}
            </span>
            <span className="text-neutral-500">
              Version {d.version} ·{' '}
              <a href={d.contentUrl} target="_blank" rel="noreferrer" className="underline">
                read
              </a>
              {d.accepted && ' · accepted'}
            </span>
          </span>
        </label>
      ))}
      {view.legal.required.length > 1 && !all && (
        <button type="button" className="text-sm font-semibold underline underline-offset-2" onClick={() => setAccepted(new Set(view.legal.required.map((d) => d.id)))}>
          I have read and accept all
        </button>
      )}
      <p className="text-xs text-neutral-500">Your acceptance is recorded with the time, your IP address and the document version.</p>
    </form>
  );
}
