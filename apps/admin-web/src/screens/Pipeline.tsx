import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { PipelineStore, StoreStatus } from '../lib/types';
import { ago, StatusChip } from '../components/ui';

const TABS: { status: StoreStatus | 'ALL'; label: string }[] = [
  { status: 'SUBMITTED', label: 'Submitted' },
  { status: 'UNDER_REVIEW', label: 'Under review' },
  { status: 'DRAFT', label: 'In progress' },
  { status: 'LIMITED', label: 'Limited' },
  { status: 'LIVE', label: 'Live' },
  { status: 'PAUSED', label: 'Paused' },
  { status: 'SUSPENDED', label: 'Suspended' },
  { status: 'REJECTED', label: 'Rejected' },
  { status: 'ALL', label: 'All' },
];

const VERTICALS = [
  { v: '', l: 'All verticals' },
  { v: 'EAT', l: 'Eat' },
  { v: 'GROCERY', l: 'Grocery' },
  { v: 'PHARMACY', l: 'Pharmacy' },
  { v: 'DIAGNOSTICS', l: 'Diagnostics' },
  { v: 'LOCAL_STORES', l: 'Local stores' },
];

// Onboarding pipeline (plan §7 "Onboarding & compliance")
export default function Pipeline() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? 'SUBMITTED') as StoreStatus | 'ALL';
  const vertical = params.get('vertical') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const query = new URLSearchParams({ ...(status !== 'ALL' && { status }), ...(vertical && { vertical }), ...(params.get('q') && { q: params.get('q')! }) });

  const { data, isLoading, error } = useQuery({
    queryKey: ['pipeline', query.toString()],
    queryFn: () => api<{ counts: Record<StoreStatus, number>; stores: PipelineStore[] }>(`/admin/onboarding/pipeline?${query}`),
    refetchInterval: 30_000,
  });
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(32px,4vw,46px)]">Stores</h1>
          <p className="text-ink-2">Review submitted stores, verify documents and take partners live.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set('q', q.trim());
          }}
          className="flex gap-2"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, PIN" className="h-10 w-64 rounded-[9px] border-[1.5px] border-line bg-white px-3 outline-none focus:border-black" />
          <select value={vertical} onChange={(e) => set('vertical', e.target.value)} className="h-10 rounded-[9px] border-[1.5px] border-line bg-white px-2">
            {VERTICALS.map((x) => (
              <option key={x.v} value={x.v}>
                {x.l}
              </option>
            ))}
          </select>
        </form>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {TABS.map((t) => {
          const n = t.status === 'ALL' ? total : data?.counts[t.status];
          const active = status === t.status;
          return (
            <button
              key={t.label}
              role="tab"
              aria-selected={active}
              onClick={() => set('status', t.status)}
              className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold ${active ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}
            >
              {t.label} {n !== undefined && <span className="ml-1 rounded-full bg-soft px-1.5 text-xs text-ink-2">{n}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="font-semibold text-dz-red">Could not load the pipeline.</p>}
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {data && data.stores.length === 0 && <p className="rounded-[14px] border border-dashed border-line bg-white p-10 text-center text-ink-3">Nothing here right now.</p>}
      {data && data.stores.length > 0 && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-soft text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Readiness</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.stores.map((s) => (
                <tr key={s.id} className="hover:bg-dz-yellow-soft/40">
                  <td className="px-4 py-3">
                    <Link to={`/stores/${s.id}`} className="font-bold hover:text-dz-red">
                      {s.name}
                    </Link>
                    <span className="block text-xs text-ink-3">
                      {s.storeType.replace(/_/g, ' ').toLowerCase()} · {s.onboarding?.channel.toLowerCase() ?? '—'} · {s.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{[s.zone?.name, s.city?.name].filter(Boolean).join(', ') || <span className="text-ink-3">Not set</span>}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-extrabold ${s.readinessScore >= 80 ? 'text-dz-green' : s.readinessScore >= 60 ? 'text-amber-700' : 'text-dz-red'}`}>{s.readinessScore}</span>
                    <span className="text-ink-3">/100</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.docs.required > 0 ? (
                      <span className={s.docs.verified === s.docs.required ? 'font-bold text-dz-green' : ''}>
                        {s.docs.verified}/{s.docs.required} verified
                      </span>
                    ) : (
                      <span className="text-ink-3">None required</span>
                    )}
                    {s.docs.pending > 0 && <span className="ml-2 rounded-full bg-dz-yellow-soft px-1.5 text-xs font-bold">{s.docs.pending} to review</span>}
                    {s.docs.rejected > 0 && <span className="ml-2 rounded-full bg-dz-red-soft px-1.5 text-xs font-bold text-dz-red">{s.docs.rejected} rejected</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {s.onboarding ? (
                      s.onboarding.submittedAt && s.status !== 'DRAFT' ? (
                        <>Submitted {ago(s.onboarding.submittedAt)}</>
                      ) : (
                        <>At {s.onboarding.currentStep.replace(/_/g, ' ').toLowerCase()}</>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-3">{ago(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
