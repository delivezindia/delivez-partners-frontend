import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Receipt } from 'lucide-react';
import { Skeleton } from '../components/ui';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { STATUS_LABEL, useOrders } from '../lib/orders';

// Order history: ongoing first (they're newest), then past orders.
export default function Orders() {
  const { t, locale } = useI18n();
  const orders = useOrders();
  const list = orders.data?.orders ?? [];
  return (
    <div className="min-h-screen bg-soft pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl">{t('lc.ord.all')}</h1>
      </header>
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">
        {orders.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        {!orders.isLoading && list.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
            <Receipt className="mx-auto h-10 w-10 text-ink-3" aria-hidden />
            <p className="mt-3 font-bold">{t('lc.ord.none')}</p>
            <Link to="/" className="mt-3 inline-block font-bold text-dz-red underline">
              {t('lc.cart.browse')}
            </Link>
          </div>
        )}
        {list.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line hover:ring-black">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <b className="truncate">{o.store.name}</b>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${o.active ? 'bg-dz-yellow text-black' : ['DELIVERED', 'COMPLETED'].includes(o.status) ? 'bg-dz-green-soft text-dz-green' : 'bg-dz-red-soft text-dz-red'}`}>{t(STATUS_LABEL[o.status])}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-ink-2">{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</p>
              <p className="mt-0.5 text-xs text-ink-3">
                {new Date(o.placedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} · {rupees(o.totals.grandTotal)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
          </Link>
        ))}
      </main>
    </div>
  );
}
