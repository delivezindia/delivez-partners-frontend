import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { STATUS_LABEL, useOrders, type CustomerOrder } from '../lib/orders';
import { useReorder } from '../lib/reorder';
import type { Vertical } from '../lib/types';
import { VerticalIcon } from './VerticalIcon';

/** Orders in progress — one tap to track. */
export function LiveOrders({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const { data } = useOrders();
  const live = (data?.orders ?? []).filter((o) => o.active).slice(0, 2);
  if (!live.length) return null;
  return (
    <section aria-label={t('lc.dash.live')} className={`relative z-10 space-y-3 ${className}`}>
      {live.map((o) => (
        <LiveOrderCard key={o.id} o={o} />
      ))}
    </section>
  );
}

function LiveOrderCard({ o }: { o: CustomerOrder }) {
  const { t, locale } = useI18n();
  const eta = o.etaAt ? new Date(o.etaAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : null;
  const unpaid = o.status === 'DRAFT';
  return (
    <Link to={`/orders/${o.id}`} className="group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)] ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-black">
      <span className="relative">
        <VerticalIcon v={o.store.vertical} size="lg" />
        <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${unpaid ? 'bg-amber-500' : 'bg-dz-green'}`}>
          <span className={`absolute inset-0 animate-ping rounded-full ${unpaid ? 'bg-amber-500' : 'bg-dz-green'} opacity-60`} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold uppercase tracking-wider text-dz-red">{t(STATUS_LABEL[o.status])}</span>
        <b className="block truncate text-[17px]">{o.store.name}</b>
        <span className="block truncate text-sm text-ink-2">{eta ? t('lc.ord.arrivesBy', { time: eta }) : `#${o.orderNumber} · ${rupees(o.totals.grandTotal)}`}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-extrabold text-dz-yellow transition group-hover:gap-2">
        {unpaid ? t('lc.dash.pay') : t('lc.dash.track')} <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}

/** One tap rebuilds the last order from the shop's menu today and opens checkout. `vertical` keeps to one kind of shop. */
/** Shops you had delivered from: of one kind (`vertical`), or only some shops (`storeIds`). */
export function OrderAgain({ vertical, storeIds }: { vertical?: Vertical; storeIds?: string[] }) {
  const { t } = useI18n();
  const { data } = useOrders();
  const reorder = useReorder();
  const shops = useMemo(() => {
    const seen = new Map<string, CustomerOrder>();
    for (const o of data?.orders ?? []) if (['DELIVERED', 'COMPLETED'].includes(o.status) && (!vertical || o.store.vertical === vertical) && (!storeIds || storeIds.includes(o.store.id)) && !seen.has(o.store.id)) seen.set(o.store.id, o);
    return [...seen.values()].slice(0, 8);
  }, [data, vertical, storeIds]);
  if (!shops.length) return null;
  return (
    <section className="mt-8" aria-label={t('lc.dash.again')}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
        <RotateCcw className="h-5 w-5 text-dz-red" aria-hidden /> {t('lc.dash.again')}
      </h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {shops.map((o) => (
          <div key={o.store.id} className="flex w-64 shrink-0 flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
            <Link to={`/s/${o.store.slug ?? o.store.id}`} className="flex min-w-0 items-center gap-3 hover:text-dz-red">
              <VerticalIcon v={o.store.vertical} size="md" />
              <span className="min-w-0">
                <b className="block truncate text-sm">{o.store.name}</b>
                <span className="block truncate text-xs text-ink-2">{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void reorder.run(o)}
              disabled={!!reorder.busy}
              data-reorder={o.id}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-black px-3 text-sm font-bold text-dz-yellow transition hover:bg-ink-2 disabled:opacity-60"
            >
              <RotateCcw className={`h-4 w-4 ${reorder.busy === o.id ? 'animate-spin' : ''}`} aria-hidden />
              {reorder.busy === o.id ? t('lc.ro.busy') : t('lc.ro.cta')}
            </button>
            {reorder.failed === o.id && <p className="text-xs font-semibold text-dz-red">{t('lc.ro.fail')}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
