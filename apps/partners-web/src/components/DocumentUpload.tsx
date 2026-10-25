import { useRef, useState } from 'react';
import { ScanText } from 'lucide-react';
import { readDocument, type DocReading } from '../lib/docOcr';
import { errorMessageOf, uploadDocument, type UploadedDocument } from '../lib/onboarding';

const STATUS: Record<UploadedDocument['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Pending review', cls: 'bg-yellow-100 text-yellow-800' },
  UNDER_REVIEW: { label: 'Under review', cls: 'bg-amber-100 text-amber-800' },
  VERIFIED: { label: 'Verified', cls: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Expired', cls: 'bg-red-100 text-red-800' },
};

const HAS_NUMBER = new Set(['FSSAI', 'GSTIN', 'PAN', 'DRUG_LICENSE_DL20', 'DRUG_LICENSE_DL21', 'PHARMACIST_REGISTRATION', 'TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'NABL_CERTIFICATE', 'CLINICAL_ESTABLISHMENT_REG', 'PATHOLOGIST_REGISTRATION']);
const HAS_EXPIRY = new Set(['FSSAI', 'DRUG_LICENSE_DL20', 'DRUG_LICENSE_DL21', 'TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'NABL_CERTIFICATE', 'CLINICAL_ESTABLISHMENT_REG']);
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const nice = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Camera or file → pre-signed upload → status chip (plan §16.4 DocumentUpload).
export function DocumentUpload({
  storeId,
  type,
  label,
  required,
  current,
  onUploaded,
}: {
  storeId: string;
  type: string;
  label: string;
  required: boolean;
  current?: UploadedDocument;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Reading the document (PDF text or OCR) to fill the number and dates for the partner to check.
  const [reading, setReading] = useState<DocReading | null>(null);
  const [readState, setReadState] = useState<'idle' | 'reading' | 'done' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [issued, setIssued] = useState('');
  const filledFrom = useRef<{ number: string; expiry: string }>({ number: '', expiry: '' });
  const readable = HAS_NUMBER.has(type) || HAS_EXPIRY.has(type);

  async function choose(f: File | null) {
    setFile(f);
    setReading(null);
    setReadState('idle');
    if (!f || !readable) return;
    setReadState('reading');
    setProgress(0);
    try {
      const r = await readDocument(f, type, setProgress);
      setReading(r);
      setReadState('done');
      // Fill what we read unless the partner already typed something different.
      if (r.documentNumber && HAS_NUMBER.has(type)) setNumber((cur) => (!cur || cur === filledFrom.current.number ? r.documentNumber! : cur));
      if (r.expiresAt && HAS_EXPIRY.has(type)) setExpiry((cur) => (!cur || cur === filledFrom.current.expiry ? r.expiresAt! : cur));
      if (r.issuedAt) setIssued(r.issuedAt);
      filledFrom.current = { number: r.documentNumber ?? '', expiry: r.expiresAt ?? '' };
    } catch {
      setReadState('failed');
    }
  }
  const [editing, setEditing] = useState(!current || current.status === 'REJECTED' || current.status === 'EXPIRED');

  async function upload() {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError('Files must be 10 MB or smaller');
    setBusy(true);
    setError('');
    try {
      await uploadDocument(storeId, file, { type, documentNumber: number, issuedAt: issued, expiresAt: expiry, reading: reading ?? undefined });
      setFile(null);
      setNumber('');
      setExpiry('');
      setIssued('');
      setReading(null);
      setReadState('idle');
      setEditing(false);
      onUploaded();
    } catch (err) {
      setError(errorMessageOf(err) ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {label} {required && <span className="ml-1 rounded bg-dz-red/10 px-1.5 py-0.5 text-[11px] font-semibold text-dz-red">Required</span>}
          </p>
          {current && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {current.documentNumber ? `No. ${current.documentNumber} · ` : ''}
              uploaded {new Date(current.createdAt).toLocaleDateString()} ·{' '}
              <a href={current.viewUrl} target="_blank" rel="noreferrer" className="underline">
                view
              </a>
            </p>
          )}
        </div>
        {current && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[current.status].cls}`}>{STATUS[current.status].label}</span>}
      </div>

      {current?.status === 'REJECTED' && current.rejectionReason && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-state-delayed">Rejected: {current.rejectionReason}</p>
      )}

      {!editing ? (
        <button type="button" className="mt-3 text-sm font-semibold underline underline-offset-2" onClick={() => setEditing(true)}>
          Replace file
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => void choose(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void choose(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex min-h-20 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-600 hover:border-dz-black"
          >
            {file ? (
              <span className="font-medium text-dz-black">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </span>
            ) : (
              <>
                <span className="font-medium">Take a photo or choose a file</span>
                <span className="text-xs text-neutral-400">JPG, PNG or PDF · up to 10 MB · or drop it here</span>
              </>
            )}
          </button>
          {readState === 'reading' && (
            <p className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2 text-sm" data-reading="busy">
              <ScanText className="h-4 w-4 animate-pulse" aria-hidden /> Reading your document…{progress > 0 ? ` ${progress}%` : ''}
            </p>
          )}
          {readState === 'done' && reading && (
            reading.confidence === 'NONE' ? (
              <p className="rounded-lg bg-dz-yellow-soft px-3 py-2 text-sm" data-reading="none">We couldn’t read the details from this file — please type them below. A clearer, straight photo helps.</p>
            ) : (
              <div className="rounded-lg bg-dz-green-soft px-3 py-2 text-sm" data-reading="done">
                <p className="flex items-center gap-1.5 font-semibold"><ScanText className="h-4 w-4" aria-hidden /> Read from your document — please check:</p>
                <p className="mt-0.5 text-xs">
                  {[reading.documentNumber && `No. ${reading.documentNumber}`, reading.issuedAt && `issued ${nice(reading.issuedAt)}`, reading.expiresAt && `valid till ${nice(reading.expiresAt)}`].filter(Boolean).join(' · ')}
                  {reading.confidence === 'LOW' && ' (not sure — compare with the document)'}
                </p>
              </div>
            )
          )}
          {readState === 'failed' && <p className="rounded-lg bg-soft px-3 py-2 text-sm">Couldn’t read this file automatically — type the details below.</p>}
          {expiry && expiry < today() && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-state-delayed" data-expired-doc>This document expired on {nice(expiry)}. Upload the renewed one.</p>}
          {(HAS_NUMBER.has(type) || HAS_EXPIRY.has(type)) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {HAS_NUMBER.has(type) && (
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Document number (optional)" aria-label="Document number" className="h-11 rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-dz-black" />
              )}
              {HAS_EXPIRY.has(type) && (
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  Valid till
                  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-11 flex-1 rounded-xl border border-neutral-300 px-2" />
                </label>
              )}
            </div>
          )}
          {error && <p className="text-sm text-state-delayed">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={!file || busy || readState === 'reading' || (!!expiry && expiry < today())} onClick={upload} className="h-11 rounded-xl bg-dz-yellow px-5 text-sm font-semibold disabled:opacity-50">
              {busy ? 'Uploading…' : 'Upload'}
            </button>
            {current && (
              <button type="button" className="h-11 px-3 text-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
