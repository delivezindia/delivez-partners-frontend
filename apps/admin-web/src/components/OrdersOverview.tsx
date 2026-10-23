import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { rupees } from '../lib/orders';
import type { Dashboard } from '../lib/types';
import { Card, Empty } from './ui';
import { MiniBars } from './MiniBars';

const short = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Dashboard "Orders" block: today, the last 7 days, busiest stores and stores missing the most orders. */
export function OrdersOverview({ data }: { data: NonNullable<Dashboard['orders']> }) {
  const t = data.today;
  return (
    <section className="space-y-4" aria-label="Orders" data-orders-overview>
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Orders</h2>
        <Link to="/orders" className="text-sm font-bold underline">All orders</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Orders today" value={String(t.orders)} />
        <Tile label="Completed today" value={String(t.sold)} />
        <Tile label="Sales today" value={rupees(t.revenue)} />
        <Tile label="Missed today" value={String(t.missed)} note={`${data.missedRate7d}% missed over 7 days`} warn={t.missed > 0 || data.missedRate7d >= 5} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card title="Orders per day (last 7 days)">
          <MiniBars
            label="Orders per day, last 7 days"
            height={140}
            bars={data.last7Days.map((d) => ({ label: short(d.date), value: d.orders, tip: [`${d.orders} orders`, `${d.sold} completed · ${d.missed} missed`, rupees(d.revenue)] }))}
          />
        </Card>
        <div className="space-y-5">
          <Card title="Busiest stores (7 days)">
            {data.busiestStores.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {data.busiestStores.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <Link to={`/stores/${s.id}`} className="truncate font-semibold hover:underline">{s.name}</Link>
                    <span className="shrink-0 tabular-nums text-ink-2">{s.orders} orders · {s.sold} done</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Missing the most orders (7 days)">
            {data.mostMissed.length === 0 ? (
              <Empty>No store is missing orders.</Empty>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {data.mostMissed.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <Link to={`/stores/${s.id}`} className="flex min-w-0 items-center gap-1 font-semibold hover:underline">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
                      <span className="truncate">{s.name}</span>
                    </Link>
                    <span className="shrink-0 tabular-nums text-ink-2">{s.missed} of {s.orders} · {s.missedRate}%</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className={`rounded-[14px] border px-4 py-3 ${warn ? 'border-amber-400 bg-amber-50' : 'border-line bg-white'}`}>
      <span className="flex items-center gap-1 text-xs font-semibold text-ink-3">
        {warn && <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-label="Attention" />}
        {label}
      </span>
      <b className="block text-2xl tabular-nums">{value}</b>
      {note && <span className="block text-[11px] text-ink-3">{note}</span>}
    </div>
  );
}
