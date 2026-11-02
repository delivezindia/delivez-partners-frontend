import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useI18n } from '../lib/i18n';

/** "Order / booking not found" with the usual page header, so the customer always has a way back. */
export function NotFoundPage({ title, message, backTo, backLabel }: { title: string; message: string; backTo: string; backLabel: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-soft pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to={backTo} className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-2xl">{title}</h1>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-10 text-center" data-not-found>
        <SearchX className="mx-auto h-10 w-10 text-ink-3" aria-hidden />
        <p className="mt-3 text-lg font-bold">{message}</p>
        <Link to={backTo} className="mt-3 inline-block font-bold text-dz-red underline">
          {backLabel}
        </Link>
      </main>
    </div>
  );
}
