import { useLocation } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { ReorderNote } from '../lib/reorder';

/** After "Order again": what was added, and what couldn't be (out of stock, fewer left, an option gone). */
export function ReorderNotice() {
  const { t } = useI18n();
  const note = (useLocation().state as { reorder?: ReorderNote } | null)?.reorder;
  if (!note) return null;
  return (
    <div className="rounded-2xl bg-dz-yellow-soft p-4 text-sm ring-1 ring-dz-yellow" role="status" data-reorder-note>
      <p className="flex items-center gap-2 font-bold">
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden /> {note.added ? t('lc.ro.added', { n: note.added }) : t('lc.ro.none')}
      </p>
      {note.missing.length > 0 && <p className="mt-1.5 text-ink-2" data-reorder-missing>{t('lc.ro.missing', { names: note.missing.join(', ') })}</p>}
      {note.changed.length > 0 && <p className="mt-1 text-ink-2">{t('lc.ro.changed', { names: note.changed.join(', ') })}</p>}
    </div>
  );
}
