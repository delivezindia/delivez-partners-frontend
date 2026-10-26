import { useRef, useState } from 'react';
import { ScanText } from 'lucide-react';
import { extractBankFields, type BankFields } from '../lib/bankFields';
import { readText } from '../lib/docOcr';

/**
 * "Scan your cancelled cheque or passbook": reads the account holder, account number and IFSC
 * (exact text from a PDF, OCR from a photo — in this browser) and hands them to the bank form.
 */
export function ChequeScan({ onRead }: { onRead: (fields: BankFields, file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'reading' | 'done' | 'none' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState('');

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setState('failed');
    setName(file.name);
    setState('reading');
    setProgress(0);
    try {
      const { text } = await readText(file, setProgress);
      const fields = extractBankFields(text);
      setState(fields.confidence === 'NONE' ? 'none' : 'done');
      onRead(fields, file);
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-neutral-300 p-4" data-cheque-scan={state}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} aria-label="Cheque or passbook" />
      <div className="flex flex-wrap items-center gap-3">
        <ScanText className="h-6 w-6 shrink-0" aria-hidden />
        <div className="min-w-[12rem] flex-1">
          <p className="font-semibold">Scan a cancelled cheque or your passbook</p>
          <p className="text-xs text-neutral-500">We fill the account details for you to check. The photo is read on this device and kept as your bank proof.</p>
        </div>
        <button type="button" onClick={() => input.current?.click()} disabled={state === 'reading'} className="h-11 rounded-xl bg-dz-yellow px-4 text-sm font-semibold disabled:opacity-50">
          {state === 'idle' ? 'Choose photo or PDF' : 'Scan another'}
        </button>
      </div>
      {state === 'reading' && <p className="mt-3 text-sm">Reading {name}…{progress > 0 ? ` ${progress}%` : ''}</p>}
      {state === 'done' && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Details filled from {name} — check them against the cheque.</p>}
      {state === 'none' && <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm">We couldn’t read the details from {name}. Type them below — a straight, well-lit photo works best.</p>}
      {state === 'failed' && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-state-delayed">Couldn’t read that file (JPG, PNG or PDF up to 10 MB). Type the details below.</p>}
    </div>
  );
}
