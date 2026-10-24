import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, Phone } from 'lucide-react';
import { api, errorText, useAuth } from '../lib/api';
import { apiUrl } from '../lib/config';
import { rupees } from '../lib/orders';
import { MiniBars } from '../components/MiniBars';
import { Button, Card, Empty, ErrorBox, PageHead } from '../components/ui';

interface WeekRow { week: string; orders: number; sold: number; sales: number; missed: number; missedRate: number; avgPrepMinutes: number | null; storesWithOrders: number }
interface CityReport {
  weeks: string[];
  cities: { cityId: string; name: string; liveStores: number; weeks: WeekRow[]; total: Omit<WeekRow, 'week'> }[];
  all: { weeks: WeekRow[]; total: Omit<WeekRow, 'week'> };
}
type Flag = 'MISSED' | 'REJECTS' | 'SLOW' | 'NO_ORDERS';
interface HealthRow {
  id: string; name: string; city: string | null; vertical: string; status: string; openState: string; phone: string | null;
  orders: number; sold: number; missed: number; missedRate: number; rejected: number; rejectRate: number; cancelled: number;
  avgPrepMinutes: number | null; lateRate: number; lastOrderAt: string | null; flags: Flag[];
}
interface Health { days: number; thresholds: { minOrders: number; missedRate: number; rejectRate: number; lateRate: number }; stores: HealthRow[]; counts: { total: number; flagged: number } }

const FLAG: Record<Flag, { label: string; cls: string }> = {
  MISSED: { label: 'Misses orders', cls: 'bg-dz-red text-white' },
  REJECTS: { label: 'Rejects a lot', cls: 'bg-dz-red-soft text-dz-red' },
  SLOW: { label: 'Often late', cls: 'bg-amber-100 text-amber-900' },
  NO_ORDERS: { label: 'No orders', cls: 'bg-soft text-ink-2' },
};
const wk = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Items 16 & 17: city numbers by week, and the stores ops should call.
export default function Reports() {
  const [tab, setTab] = useState<'cities' | 'health'>('cities');
  return (
    <div className="space-y-5">
      <PageHead title="Reports" sub="Your cities only" />
      <div className="flex gap-1 border-b-[1.5px] border-line" role="tablist">
        {(['cities', 'health'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-[1.5px] border-b-[3px] px-3 py-2.5 text-sm font-bold ${tab === k ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {k === 'cities' ? 'Cities by week' : 'Store health'}
          </button>
        ))}
      </div>
      {tab === 'cities' ? <Cities /> : <StoreHealth />}
    </div>
  );
}

function Cities() {
  const [weeks, setWeeks] = useState(8);
  const [busy, setBusy] = useState(false);
  const r = useQuery({ queryKey: ['reports', 'cities', weeks], queryFn: () => api<CityReport>(`/admin/reports/cities?weeks=${weeks}`) });
  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/v1/admin/reports/cities.csv?weeks=${weeks}`), { headers: { authorization: `Bearer ${useAuth.getState().accessToken ?? ''}` } });
      if (!res.ok) throw new Error('Download failed');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await res.blob());
      a.download = `delivez-cities-${weeks}-weeks.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[4, 8, 12].map((w) => (
          <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)} className={`h-9 rounded-full border-[1.5px] px-3 text-sm font-bold ${weeks === w ? 'border-black bg-black text-white' : 'border-line bg-white'}`}>{w} weeks</button>
        ))}
        <Button variant="outline" className="ml-auto" disabled={busy} onClick={() => void download()}><Download className="h-4 w-4" aria-hidden /> Download CSV</Button>
      </div>
      <ErrorBox error={r.error ? errorText(r.error) : null} />
      {r.data && r.data.cities.length === 0 && <Empty>No orders in these weeks.</Empty>}
      {r.data?.cities.map((c) => (
        <Card key={c.cityId} title={`${c.name} · ${c.liveStores} running store${c.liveStores === 1 ? '' : 's'}`} actions={<span className="text-sm font-bold">{c.total.orders} orders · {rupees(c.total.sales)} · {c.total.missedRate}% missed</span>}>
          <MiniBars label={`Orders per week, ${c.name}`} height={110} bars={c.weeks.map((w) => ({ label: wk(w.week), value: w.orders, tip: [`Week of ${wk(w.week)}`, `${w.orders} orders · ${w.sold} completed`, `${rupees(w.sales)} sales`, `${w.missed} missed (${w.missedRate}%)`] }))} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" data-city={c.name}>
              <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
                <tr><th className="py-2">Week of</th><th className="text-right">Orders</th><th className="text-right">Completed</th><th className="text-right">Sales</th><th className="text-right">Missed</th><th className="text-right">Avg prep</th><th className="text-right">Stores with orders</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...c.weeks].reverse().map((w) => (
                  <tr key={w.week}>
                    <td className="py-2">{wk(w.week)}</td>
                    <td className="text-right font-bold tabular-nums">{w.orders}</td>
                    <td className="text-right tabular-nums">{w.sold}</td>
                    <td className="text-right tabular-nums">{rupees(w.sales)}</td>
                    <td className={`text-right tabular-nums ${w.missedRate >= 10 ? 'font-bold text-dz-red' : ''}`}>{w.missed} ({w.missedRate}%)</td>
                    <td className="text-right tabular-nums">{w.avgPrepMinutes != null ? `${w.avgPrepMinutes} min` : '—'}</td>
                    <td className="text-right tabular-nums">{w.storesWithOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StoreHealth() {
  const [days, setDays] = useState(7);
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const r = useQuery({ queryKey: ['reports', 'health', days], queryFn: () => api<Health>(`/admin/reports/store-health?days=${days}`) });
  const rows = (r.data?.stores ?? []).filter((s) => !onlyFlagged || s.flags.length);
  const th = r.data?.thresholds;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 14, 30].map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={`h-9 rounded-full border-[1.5px] px-3 text-sm font-bold ${days === d ? 'border-black bg-black text-white' : 'border-line bg-white'}`}>Last {d} days</button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} className="h-4 w-4" /> Only stores that need a call
        </label>
      </div>
      {r.data && (
        <p className="text-sm text-ink-2" data-health-summary>
          <b>{r.data.counts.flagged}</b> of {r.data.counts.total} running stores need attention.
          {th && <span className="text-ink-3"> Flags: missed ≥ {th.missedRate}%, rejected ≥ {th.rejectRate}%, late ≥ {th.lateRate}% (min {th.minOrders} orders), or live with no orders.</span>}
        </p>
      )}
      <ErrorBox error={r.error ? errorText(r.error) : null} />
      {r.data && rows.length === 0 && <Empty>{onlyFlagged ? 'No store needs a call right now.' : 'No running stores.'}</Empty>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border-[1.5px] border-line bg-white">
          <table className="w-full min-w-[900px] text-sm" aria-label="Store health">
            <thead className="bg-soft text-left text-xs uppercase tracking-wide text-ink-3">
              <tr><th className="px-3 py-2">Store</th><th className="px-3">Needs</th><th className="px-3 text-right">Orders</th><th className="px-3 text-right">Missed</th><th className="px-3 text-right">Rejected</th><th className="px-3 text-right">Late</th><th className="px-3 text-right">Avg prep</th><th className="px-3">Last order</th><th className="px-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id} data-store={s.name}>
                  <td className="px-3 py-2.5">
                    <Link to={`/stores/${s.id}`} className="font-bold hover:underline">{s.name}</Link>
                    <span className="block text-xs text-ink-3">{[s.city, s.vertical.toLowerCase().replace('_', ' '), s.status === 'LIVE' ? s.openState.toLowerCase() : s.status.toLowerCase()].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="px-3">
                    <span className="flex flex-wrap gap-1">
                      {s.flags.length ? s.flags.map((f) => <span key={f} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${FLAG[f].cls}`}>{FLAG[f].label}</span>) : <span className="text-xs text-dz-green">OK</span>}
                    </span>
                  </td>
                  <td className="px-3 text-right tabular-nums">{s.orders}</td>
                  <td className={`px-3 text-right tabular-nums ${s.flags.includes('MISSED') ? 'font-bold text-dz-red' : ''}`}>{s.missed} ({s.missedRate}%)</td>
                  <td className={`px-3 text-right tabular-nums ${s.flags.includes('REJECTS') ? 'font-bold text-dz-red' : ''}`}>{s.rejected} ({s.rejectRate}%)</td>
                  <td className={`px-3 text-right tabular-nums ${s.flags.includes('SLOW') ? 'font-bold text-amber-800' : ''}`}>{s.lateRate}%</td>
                  <td className="px-3 text-right tabular-nums">{s.avgPrepMinutes != null ? `${s.avgPrepMinutes} min` : '—'}</td>
                  <td className="px-3 text-xs">{s.lastOrderAt ? new Date(s.lastOrderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never'}</td>
                  <td className="px-3 text-right">
                    {s.phone && (
                      <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 font-bold underline">
                        <Phone className="h-3.5 w-3.5" aria-hidden /> Call
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.data && !r.data.counts.flagged && <p className="flex items-center gap-2 text-sm text-ink-3"><AlertTriangle className="h-4 w-4" aria-hidden /> Flags need at least {th?.minOrders} orders in the period, so new or quiet stores aren’t judged on one bad order.</p>}
    </div>
  );
}
