import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { QueueDoc } from '../lib/types';
import { DocReview } from '../components/DocReview';
import { DocMatrix } from '../components/DocMatrix';
import { ago, StatusChip } from '../components/ui';
import { useMe } from './Layout';

const TABS = [
  { s: 'PENDING', l: 'To review' },
  { s: 'VERIFIED', l: 'Verified' },
  { s: 'REJECTED', l: 'Rejected' },
  { s: 'EXPIRING', l: 'Expiring soon' },
];

// Document verification queue — oldest first (plan §5.2: verification runs in parallel, never blocks setup).
export default function Documents() {
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  // Links that pick a status (e.g. the dashboard's "Licences expiring") open the one-by-one list.
  const view = params.get('view') === 'list' || params.has('status') ? 'list' : 'shops';
  const status = params.get('status') ?? 'PENDING';
  const { data, isLoading } = useQuery({ queryKey: ['documents', status], queryFn: () => api<QueueDoc[]>(`/admin/documents?status=${status}`), refetchInterval: 30_000, enabled: view === 'list' });
  const docs = (data ?? []).filter((d) => status !== 'PENDING' || !d.superseded);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(32px,4vw,46px)]">Documents</h1>
          <p className="text-ink-2">Verify licences and certificates. Partners see rejections and reasons instantly.</p>
        </div>
        <div className="flex rounded-[10px] border-[1.5px] border-black bg-white p-0.5 text-sm font-bold" role="tablist" aria-label="View">
          {(['shops', 'list'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setParams(v === 'list' ? { view: 'list' } : {}, { replace: true })} className={`rounded-lg px-3 py-1.5 ${view === v ? 'bg-black text-white' : 'text-ink-2'}`}>
              {v === 'shops' ? 'By shop' : 'One by one'}
            </button>
          ))}
        </div>
      </div>
      {view === 'shops' ? (
        <DocMatrix role={me?.role} />
      ) : (
        <>
      <div className="flex gap-1 border-b-[1.5px] border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.s}
            role="tab"
            aria-selected={status === t.s}
            onClick={() => setParams({ view: 'list', status: t.s }, { replace: true })}
            className={`-mb-[1.5px] border-b-[3px] px-3 py-2.5 text-sm font-bold ${status === t.s ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}
          >
            {t.l}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {!isLoading && docs.length === 0 && <p className="rounded-[14px] border border-dashed border-line bg-white p-10 text-center text-ink-3">{status === 'EXPIRING' ? 'No licences expire in the next 30 days.' : 'All caught up.'}</p>}
      <div className="space-y-6">
        {docs.map((d) => (
          <div key={d.id}>
            {d.store && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/stores/${d.store.id}`} className="font-extrabold hover:text-dz-red">
                  {d.store.name}
                </Link>
                <span className="text-ink-3">
                  {d.store.legalName} · {d.store.city ?? 'city not set'} ·{' '}
                  {status === 'EXPIRING' && d.expiresAt ? (
                    <b className={new Date(d.expiresAt) < new Date() ? 'text-dz-red' : 'text-amber-700'}>
                      {new Date(d.expiresAt) < new Date() ? 'expired' : 'expires'} {new Date(d.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </b>
                  ) : (
                    `waiting ${ago(d.createdAt)}`
                  )}
                </span>
                <StatusChip status={d.store.status} />
              </div>
            )}
            <DocReview doc={d} role={me?.role} />
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  );
}
