import { useState } from 'react';
import { useAmQuery, type StoreCard } from '../../lib/am';
import { AmHeader, Page, Synced } from './AmShell';
import { Empty, StoreRow } from './parts';

const SORTS = [
  { key: 'risk', label: 'Risk' },
  { key: 'sla', label: 'Lowest SLA' },
  { key: 'orders', label: 'Orders' },
  { key: 'name', label: 'A–Z' },
] as const;
const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'HIGH', label: '🔴 High' },
  { key: 'WATCH', label: '🟡 Watch' },
  { key: 'STABLE', label: '🟢 Stable' },
] as const;

/** My restaurants: sortable cards with SLA, orders, churn risk and one-tap call / test order / issues. */
export default function AmStores() {
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('risk');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL');
  const [q, setQ] = useState('');
  const res = useAmQuery<{ stores: StoreCard[]; syncedAt: string }>(`stores-${sort}`, `/admin/am/stores?sort=${sort}`);
  const all = res.data?.data.stores ?? [];
  const rows = all.filter((s) => (filter === 'ALL' || s.badge === filter) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <>
      <AmHeader title="Restaurants" sub={`${all.length} assigned to you`} />
      <Synced at={res.data?.data.syncedAt} cachedAt={res.data?.cachedAt ?? null} />
      <Page>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your restaurants"
          aria-label="Search"
          className="h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-4 outline-none focus:border-black"
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold ring-1 ${filter === f.key ? 'bg-black text-dz-yellow ring-black' : 'bg-white text-ink-2 ring-line'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-lg border-[1.5px] border-line bg-white px-2 font-bold text-ink" data-sort>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {res.isLoading && <div className="h-40 animate-pulse rounded-2xl bg-white" />}
        {res.data && !rows.length && <Empty>{all.length ? 'No restaurants match.' : 'No restaurants are assigned to you yet.'}</Empty>}
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <StoreRow key={s.id} s={s} />
          ))}
        </ul>
      </Page>
    </>
  );
}
