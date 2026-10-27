import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Activity, Bike, ClipboardList, ScrollText, ShoppingBag } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { FILTERS, istTime, rupees, type AdminOrderList } from '../lib/orders';
import { Button, Card, Empty, ErrorBox, inputCls, PageHead } from '../components/ui';
import { SlaGuide } from '../components/SlaGuide';
import { Chip, OrderPanel } from './ops/OrderPanel';
import LiveBoard from './ops/LiveBoard';
import Riders from './ops/Riders';
import AlertLog from './ops/AlertLog';

const VIEWS = [
  { key: 'live', label: 'Live board', icon: Activity },
  { key: 'all', label: 'All orders', icon: ClipboardList },
  { key: 'riders', label: 'Riders', icon: Bike },
  { key: 'log', label: 'Alert log', icon: ScrollText },
] as const;

/** Food ops: the live board (SLA alerts, worst first), every order, riders, and the alert audit log. */
export default function Orders() {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v.key === params.get('view'))?.key ?? (params.get('q') ? 'all' : 'live');
  const [guide, setGuide] = useState(false);
  return (
    <div className="space-y-5">
      <PageHead
        title="Orders"
        sub="Live ops: SLA risk at a glance, the next action on every alert."
        actions={
          <Button variant="outline" onClick={() => setGuide(true)} data-sla-btn>
            Order SLA guide
          </Button>
        }
      />
      {guide && <SlaGuide onClose={() => setGuide(false)} />}
      <div className="flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setParams({ view: v.key }, { replace: true })}
            className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-bold ${view === v.key ? 'text-dz-red shadow-[inset_0_-3px_0_var(--color-dz-red)]' : 'text-ink-2 hover:text-ink'}`}
            data-view={v.key}
          >
            <v.icon className="h-4 w-4" aria-hidden /> {v.label}
          </button>
        ))}
      </div>
      {view === 'live' && <LiveBoard />}
      {view === 'all' && <AllOrders initialQ={params.get('q') ?? ''} />}
      {view === 'riders' && <Riders />}
      {view === 'log' && <AlertLog />}
    </div>
  );
}

/** Every order across the admin's cities: find, inspect, cancel, and (in development) play the rider. */
function AllOrders({ initialQ }: { initialQ: string }) {
  const [status, setStatus] = useState(initialQ ? '' : 'ACTIVE');
  const [q, setQ] = useState(initialQ);
  const [openId, setOpenId] = useState<string | null>(null);
  const search = q.trim().replace(/^#/, '');
  const list = useInfiniteQuery({
    queryKey: ['admin-orders', status, search],
    queryFn: ({ pageParam }) =>
      api<AdminOrderList>(
        `/admin/orders?${new URLSearchParams({ limit: '50', ...(status ? { status } : {}), ...(search.length >= 3 ? { q: search } : {}), ...(pageParam ? { before: pageParam } : {}) })}`,
      ),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    refetchInterval: 20_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const counts = list.data?.pages[0]?.counts;

  return (
    <div className="space-y-5">
      {counts && (
        <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
          <Stat label="Active now" value={counts.active} />
          <Stat label="Placed today" value={counts.today} />
          <Stat label="Missed today" value={counts.missedToday} warn={counts.missedToday > 0} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setStatus(f.value)}
            aria-pressed={status === f.value}
            className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-bold ${status === f.value ? 'border-black bg-black text-white' : 'border-line bg-white'}`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto w-56">
          <input className={inputCls} placeholder="Order number, e.g. DEL-123" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by order number" />
        </div>
      </div>
      <ErrorBox error={list.error ? errorText(list.error) : null} />
      <Card className="overflow-x-auto p-0">
        {list.data && rows.length === 0 ? (
          <div className="p-5">
            <Empty>No orders match.</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Store</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Placed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-soft" data-order={o.orderNumber}>
                  <td className="px-4 py-2.5">
                    <button type="button" className="font-bold hover:underline" onClick={() => setOpenId(o.id)}>
                      {o.orderNumber}
                    </button>
                    {o.isTestOrder && <span className="ml-1.5 rounded bg-soft px-1 text-[10px] font-bold uppercase text-ink-3">test</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {o.store.name}
                    {o.store.city && <span className="block text-xs text-ink-3">{o.store.city}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Chip status={o.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      {o.fulfilmentType === 'PICKUP' ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
                      {o.fulfilmentType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {rupees(o.grandTotal)}
                    <span className="block text-xs text-ink-3">{o.paymentMode}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{istTime(o.placedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {list.hasNextPage && (
        <Button variant="outline" className="w-full" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Load older orders'}
        </Button>
      )}
      {openId && <OrderPanel id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-[14px] border px-4 py-3 ${warn ? 'border-amber-400 bg-amber-50' : 'border-line bg-white'}`}>
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <b className="block text-2xl tabular-nums">{value}</b>
    </div>
  );
}
