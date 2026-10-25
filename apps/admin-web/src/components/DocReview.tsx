import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../lib/api';
import { CAN, type AdminRole, type DocReading, type QueueDoc } from '../lib/types';
import { Button, DocChip, fmtDate } from './ui';

/** Side-by-side document review: the file on the left, extracted fields + decision on the right (plan §7). */
export function DocReview({ doc, role, compact = false, onDecided }: { doc: QueueDoc & { rejectionReason?: string | null; reviewedBy?: string | null; reviewedAt?: string | null }; role?: AdminRole; compact?: boolean; onDecided?: (status: "VERIFIED" | "REJECTED") => void }) {
  const qc = useQueryClient();
  // Each refetch signs a fresh URL; keep the first one so the preview doesn't reload (a reloading PDF viewer steals keyboard focus).
  const [previewUrl] = useState(doc.viewUrl);
  const [number, setNumber] = useState(doc.documentNumber ?? '');
  const [expiry, setExpiry] = useState(doc.expiresAt?.slice(0, 10) ?? '');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const canAct = !!role && CAN.verify.includes(role) && !doc.superseded;
  const open = doc.status === 'PENDING' || doc.status === 'UNDER_REVIEW';

  const decide = useMutation({
    mutationFn: (verify: boolean) =>
      api(`/admin/documents/${doc.id}/${verify ? 'verify' : 'reject'}`, {
        method: 'POST',
        body: verify ? { documentNumber: number || undefined, expiresAt: expiry || undefined } : { reason },
      }),
    onSuccess: (_r, verify) => {
      setRejecting(false);
      onDecided?.(verify ? "VERIFIED" : "REJECTED");
      void qc.invalidateQueries({ queryKey: ['documents'] });
      void qc.invalidateQueries({ queryKey: ['store'] });
      void qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });

  return (
    <div className={`grid gap-4 rounded-[14px] border border-line bg-white p-4 ${compact ? '' : 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]'}`}>
      <div className="overflow-hidden rounded-xl border border-line bg-soft">
        {doc.contentType === 'application/pdf' ? (
          <iframe title={doc.label} src={previewUrl} className="h-80 w-full" tabIndex={-1} />
        ) : (
          <a href={doc.viewUrl} target="_blank" rel="noreferrer">
            <img src={previewUrl} alt={doc.label} className="h-80 w-full object-contain" />
          </a>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-extrabold">
              {doc.label} {doc.required && <span className="ml-1 rounded bg-dz-red-soft px-1.5 py-0.5 text-[11px] font-bold text-dz-red">Required</span>}
            </p>
            <p className="text-xs text-ink-3">
              Uploaded {fmtDate(doc.createdAt)} ·{' '}
              <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="underline">
                open file
              </a>
            </p>
          </div>
          <DocChip status={doc.status} />
        </div>
        {doc.superseded && <p className="rounded-lg bg-soft px-3 py-2 text-xs text-ink-2">A newer upload of this document exists — review that one instead.</p>}
        {doc.status === 'REJECTED' && doc.rejectionReason && <p className="rounded-lg bg-dz-red-soft px-3 py-2 text-sm text-dz-red">Rejected: {doc.rejectionReason}</p>}
        {doc.status === 'VERIFIED' && doc.reviewedBy && (
          <p className="text-xs text-ink-3">
            Verified by {doc.reviewedBy} · {fmtDate(doc.reviewedAt)}
          </p>
        )}

        {doc.reading && <ReadingBox reading={doc.reading} />}

        <label className="text-xs font-bold">
          Document number
          <input value={number} onChange={(e) => setNumber(e.target.value)} disabled={!canAct || !open} className="mt-1 h-10 w-full rounded-[9px] border-[1.5px] border-line px-3 font-normal disabled:bg-soft" />
        </label>
        <label className="text-xs font-bold">
          Valid till
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} disabled={!canAct || !open} className="mt-1 h-10 w-full rounded-[9px] border-[1.5px] border-line px-3 font-normal disabled:bg-soft" />
        </label>
        <p className="text-xs text-ink-3">Check the name matches the business, the number is legible and the licence is valid.</p>

        {canAct && (open || doc.status === 'VERIFIED') && (
          <div className="mt-auto space-y-2">
            {rejecting ? (
              <>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} autoFocus placeholder="What should the partner fix? They will see this." className="w-full rounded-[9px] border-[1.5px] border-line p-2 text-sm" />
                <div className="flex gap-2">
                  <Button variant="red" disabled={reason.trim().length < 5 || decide.isPending} onClick={() => decide.mutate(false)}>
                    Reject document
                  </Button>
                  <Button variant="outline" onClick={() => setRejecting(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {open && (
                  <Button variant="green" disabled={decide.isPending} onClick={() => decide.mutate(true)}>
                    ✓ Verify
                  </Button>
                )}
                <Button variant="outline" onClick={() => setRejecting(true)}>
                  {doc.status === 'VERIFIED' ? 'Revoke & reject' : 'Reject'}
                </Button>
              </div>
            )}
            {decide.error && <p className="text-sm font-semibold text-dz-red">{errorText(decide.error)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const FLAG_TEXT: Record<DocReading['flags'][number], string> = {
  NOT_READ: 'Nothing could be read from the file — check it by eye.',
  LOW_QUALITY: 'Blurry or low-quality scan.',
  NUMBER_CHANGED: 'The partner changed the number that was read from the file.',
  EXPIRY_CHANGED: 'The partner changed the expiry date that was read from the file.',
  GSTIN_MISMATCH: 'GSTIN does not match the GSTIN given for the business.',
  PAN_MISMATCH: 'PAN is not the PAN inside the business GSTIN.',
};
const day = (d: string | null) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** What was read automatically, so the reviewer can compare it with the file and the typed values. */
function ReadingBox({ reading }: { reading: DocReading }) {
  return (
    <div className="rounded-xl border border-line bg-soft p-3 text-xs" data-reading>
      <p className="font-bold">
        Read automatically {reading.method === 'pdf-text' ? '(digital PDF — exact text)' : `(photo/scan${reading.engineConfidence != null ? `, ${reading.engineConfidence}% clear` : ''})`}
      </p>
      {reading.read && reading.confidence !== 'NONE' && (
        <p className="mt-1">
          No. <b>{reading.read.documentNumber ?? '—'}</b> · issued {day(reading.read.issuedAt)} · valid till <b>{day(reading.read.expiresAt)}</b>
          {reading.confidence === 'HIGH' ? <span className="ml-1 text-dz-green">✓ number format checks out</span> : <span className="ml-1 text-amber-700">(unsure)</span>}
        </p>
      )}
      {reading.flags.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {reading.flags.map((f) => (
            <li key={f} className={`font-semibold ${f === 'GSTIN_MISMATCH' || f === 'PAN_MISMATCH' || f.endsWith('_CHANGED') ? 'text-dz-red' : 'text-amber-800'}`} data-flag={f}>⚠ {FLAG_TEXT[f]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
