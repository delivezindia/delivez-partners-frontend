import { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, ShieldCheck, X } from 'lucide-react';
import { ErrorText } from './ui';
import { useI18n } from '../lib/i18n';
import { MAX_UPLOAD_MB, UPLOAD_TYPES, uploadFile } from '../lib/upload';
import { messageOf } from '../screens/Login';

export interface RxFile {
  key: string;
  name: string;
}

/**
 * Doctor's prescription: photo or PDF, up to 3 pages. Files go straight to private storage — only the
 * pharmacy / lab and Delivez can open them.
 */
export function RxUpload({ presignPath, files, onChange, items }: { presignPath: string; files: RxFile[]; onChange: (f: RxFile[]) => void; items?: string[] }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    setError('');
    const room = 3 - files.length;
    const chosen = [...list].slice(0, room);
    const bad = chosen.find((f) => !UPLOAD_TYPES.includes(f.type) || f.size > MAX_UPLOAD_MB * 1024 * 1024);
    if (bad) return setError(t('lc.rxu.bad', { mb: MAX_UPLOAD_MB }));
    setBusy(true);
    try {
      const added: RxFile[] = [];
      for (const f of chosen) added.push({ key: await uploadFile(presignPath, f), name: f.name });
      onChange([...files, ...added]);
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-dz-blue/30" data-rx-upload>
      <h2 className="flex items-center gap-2 text-xl">
        <FileText className="h-5 w-5 text-dz-blue" aria-hidden /> {t('lc.rxu.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-2">{items?.length ? t('lc.rxu.bodyFor', { items: items.join(', ') }) : t('lc.rxu.body')}</p>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li key={f.key} className="flex items-center gap-2 rounded-xl bg-dz-blue-soft px-3 py-2 text-sm font-semibold">
              <Paperclip className="h-4 w-4 shrink-0 text-dz-blue" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button type="button" onClick={() => onChange(files.filter((x) => x.key !== f.key))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white" aria-label={t('lc.rxu.remove', { name: f.name })}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < 3 && (
        <label className={`mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-dz-blue/50 px-4 text-sm font-extrabold text-dz-blue hover:bg-dz-blue-soft ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Paperclip className="h-4 w-4" aria-hidden />}
          {busy ? t('lc.rxu.uploading') : files.length ? t('lc.rxu.addPage') : t('lc.rxu.add')}
          <input ref={input} type="file" accept={UPLOAD_TYPES.join(',')} multiple className="sr-only" onChange={(e) => void pick(e.target.files)} data-rx-input />
        </label>
      )}
      <ErrorText>{error}</ErrorText>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t('lc.rxu.private')}
      </p>
    </section>
  );
}
