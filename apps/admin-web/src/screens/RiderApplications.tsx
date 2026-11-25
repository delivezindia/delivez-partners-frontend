import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, Empty, fmtDate, inputCls, PageHead } from '../components/ui';
import { APP_STATUS, AppChip, VEHICLE, type RiderAppStatus } from './RiderReview';

interface Row {
  id: string;
  riderCode: string;
  riderStatus: string;
  status: RiderAppStatus;
  name: string | null;
  phone: string;
  pincode: string | null;
  vehicleCategory: string | null;
  vehicleProvider: string | null;
  vehicleRegistration: string | null;
  documents: { total: number; verified: number; rejected: number };
  submittedAt: string | null;
}
interface List {
  total: number;
  counts: Partial<Record<RiderAppStatus, number>>;
  items: Row[];
}

const TABS: { s: RiderAppStatus | ''; l: string }[] = [
  { s: 'SUBMITTED', l: 'New' },
  { s: 'UNDER_REVIEW', l: 'In review' },
  { s: 'CHANGES_REQUESTED', l: 'Sent back' },
  { s: 'APPROVED', l: 'Approved' },
  { s: 'REJECTED', l: 'Rejected' },
  { s: '', l: 'All' },
];

/** Rider sign-ups from the Delivez Agent app: oldest first. Approved riders start getting orders when they go online. */
export default function RiderApplications() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? 'SUBMITTED') as RiderAppStatus | '';
  const [search, setSearch] = useState('');
  const q = new URLSearchParams({ pageSize: '100', ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ['rider-apps', status, search], queryFn: () => api<List>(`/admin/riders/applications?${q}`), refetchInterval: 30_000 });

  return (
    <div className="space-y-5">
      <PageHead title="Riders" sub="Delivery partners who signed up in the rider app. Check their documents, then approve so they can go online and get orders." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.l}
              role="tab"
              aria-selected={status === t.s}
              onClick={() => setParams({ status: t.s }, { replace: true })}
              className={`-mb-[1.5px] shrink-0 border-b-[3px] px-3 py-2.5 text-sm font-bold ${status === t.s ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}
            >
              {t.l}
              {t.s && data?.counts[t.s] ? <span className="ml-1.5 rounded-full bg-soft px-1.5 text-xs">{data.counts[t.s]}</span> : null}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or rider code" className={`${inputCls} max-w-xs`} aria-label="Search riders" />
      </div>
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {!isLoading && !data?.items.length && (
        <Empty>
          {status === 'SUBMITTED' ? 'No new sign-ups. Riders sign up in the rider app (Delivez Agent).' : `No ${APP_STATUS[status as RiderAppStatus]?.toLowerCase() ?? ''} applications.`}
        </Empty>
      )}
      {!!data?.items.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Pincode</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-soft">
                  <td className="px-4 py-3">
                    <Link to={`/riders/${r.id}`} className="font-extrabold hover:text-dz-red" data-rider-app={r.id}>
                      {r.name ?? 'No name yet'}
                    </Link>
                    <div className="text-xs text-ink-3">
                      {r.riderCode} · {r.phone.replace(/^\+91/, '')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.vehicleCategory ? `${VEHICLE[r.vehicleCategory] ?? r.vehicleCategory}${r.vehicleProvider === 'COMPANY_PROVIDED' ? ' · company' : ''}` : '—'}
                    {r.vehicleRegistration && <div className="text-xs text-ink-3">{r.vehicleRegistration}</div>}
                  </td>
                  <td className="px-4 py-3">{r.pincode ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.documents.verified}/{r.documents.total} verified
                    {r.documents.rejected > 0 && <span className="ml-1 font-bold text-dz-red">· {r.documents.rejected} rejected</span>}
                  </td>
                  <td className="px-4 py-3">{fmtDate(r.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <AppChip status={r.status} suspended={r.riderStatus === 'SUSPENDED'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
