import { useRef, useState } from 'react';
import { errorMessageOf, uploadDocument, type UploadedDocument } from '../lib/onboarding';

const STATUS: Record<UploadedDocument['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Pending review', cls: 'bg-yellow-100 text-yellow-800' },
  UNDER_REVIEW: { label: 'Under review', cls: 'bg-amber-100 text-amber-800' },
  VERIFIED: { label: 'Verified', cls: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Expired', cls: 'bg-red-100 text-red-800' },
};

const HAS_NUMBER = new Set(['FSSAI', 'GSTIN', 'PAN', 'DRUG_LICENSE_DL20', 'DRUG_LICENSE_DL21', 'PHARMACIST_REGISTRATION', 'TRADE_LICENSE', 'SHOP_ESTABLISHMENT']);
const HAS_EXPIRY = new Set(['FSSAI', 'DRUG_LICENSE_DL20', 'DRUG_LICENSE_DL21', 'TRADE_LICENSE', 'SHOP_ESTABLISHMENT']);

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
  const [editing, setEditing] = useState(!current || current.status === 'REJECTED' || current.status === 'EXPIRED');

  async function upload() {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError('Files must be 10 MB or smaller');
    setBusy(true);
    setError('');
    try {
      await uploadDocument(storeId, file, { type, documentNumber: number, expiresAt: expiry });
      setFile(null);
      setNumber('');
      setExpiry('');
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
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setFile(e.dataTransfer.files?.[0] ?? null);
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
          {(HAS_NUMBER.has(type) || HAS_EXPIRY.has(type)) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {HAS_NUMBER.has(type) && (
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Document number (optional)" className="h-11 rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-dz-black" />
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
            <button type="button" disabled={!file || busy} onClick={upload} className="h-11 rounded-xl bg-dz-yellow px-5 text-sm font-semibold disabled:opacity-50">
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
