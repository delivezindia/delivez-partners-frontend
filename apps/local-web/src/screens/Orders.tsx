import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FlaskConical, Receipt } from 'lucide-react';
import { Skeleton } from '../components/ui';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { LAB_STATUS, useLabBookings } from '../lib/labs';
import { STATUS_LABEL, useOrders } from '../lib/orders';

// Order history (ongoing first — they're newest) and lab test bookings.
export default function Orders() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'labs' ? 'labs' : 'orders';
  return (
    <div className="min-h-screen bg-soft pb-12">
      <header className="sticky top-0 z-30 border-b border-line bg-white px-4 pt-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl">{t('lc.ord.all')}</h1>
        </div>
        <nav className="mx-auto mt-2 flex max-w-xl gap-1" role="tablist">
          {(
            [
              ['orders', t('lc.ord.tabOrders')],
              ['labs', t('lc.ord.tabLabs')],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams(k === 'labs' ? { tab: 'labs' } : {}, { replace: true })} className={`flex-1 border-b-[3px] pb-2.5 pt-1 text-sm font-extrabold ${tab === k ? 'border-dz-red text-ink' : 'border-transparent text-ink-3'}`}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">{tab === 'labs' ? <LabList /> : <OrderList />}</main>
    </div>
  );
}

function OrderList() {
  const { t, locale } = useI18n();
  const orders = useOrders();
  const list = orders.data?.orders ?? [];
  return (
    <>
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
              {o.canRate && <span className="ml-1 font-bold text-dz-red">· {t('lc.rate.cta')}</span>}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        </Link>
      ))}
    </>
  );
}

function LabList() {
  const { t, locale } = useI18n();
  const q = useLabBookings();
  const list = q.data?.bookings ?? [];
  return (
    <>
      {q.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
      {!q.isLoading && list.length === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
          <FlaskConical className="mx-auto h-10 w-10 text-ink-3" aria-hidden />
          <p className="mt-3 font-bold">{t('lc.lb.none')}</p>
          <Link to="/?v=DIAGNOSTICS" className="mt-3 inline-block font-bold text-dz-red underline">
            {t('lc.lb.find')}
          </Link>
        </div>
      )}
      {list.map((b) => (
        <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line hover:ring-black">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <b className="truncate">{b.lab.name}</b>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${b.status === 'REPORT_READY' ? 'bg-dz-green-soft text-dz-green' : b.active ? 'bg-dz-yellow text-black' : 'bg-dz-red-soft text-dz-red'}`}>{t(LAB_STATUS[b.status])}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-ink-2">{b.tests.map((x) => x.name).join(', ')}</p>
            <p className="mt-0.5 text-xs text-ink-3">
              {new Date(b.slotStart).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} · {b.collectionType === 'HOME' ? t('lc.lb.home') : t('lc.lb.walkIn')}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        </Link>
      ))}
    </>
  );
}
