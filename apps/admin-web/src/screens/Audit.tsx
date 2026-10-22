import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import type { AuditRow } from '../lib/types';
import { Button, Card, Empty, ErrorBox, fmtDate, inputCls, PageHead } from '../components/ui';

const ENTITIES = ['', 'Store', 'PartnerDocument', 'PartnerMember', 'AdminUser', 'City', 'Zone', 'LegalDocumentVersion', 'Product', 'User'];

// Read-only audit trail: who changed what, when, from where.
export default function Audit() {
  const [params, setParams] = useSearchParams();
  const [entityId, setEntityId] = useState(params.get('entityId') ?? '');
  const filters = { entity: params.get('entity') ?? '', entityId: params.get('entityId') ?? '', actorType: params.get('actorType') ?? '' };
  const qs = (before?: string) => new URLSearchParams({ limit: '50', ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), ...(before && { before }) }).toString();

  const q = useInfiniteQuery({
    queryKey: ['audit', filters],
    queryFn: ({ pageParam }) => api<{ items: AuditRow[]; nextBefore: string | null }>(`/admin/audit?${qs(pageParam ?? undefined)}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHead title="Audit log" sub="Every status change, review and setting change — read only." />
      <div className="flex flex-wrap gap-2">
        <select className={`${inputCls} w-auto`} value={filters.entity} onChange={(e) => set('entity', e.target.value)} aria-label="Record type">
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e || 'All records'}
            </option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={filters.actorType} onChange={(e) => set('actorType', e.target.value)} aria-label="Done by">
          <option value="">Anyone</option>
          <option value="ADMIN">Admins</option>
          <option value="USER">Partners</option>
          <option value="SYSTEM">System</option>
        </select>
        <form onSubmit={(e) => (e.preventDefault(), set('entityId', entityId.trim()))} className="flex gap-2">
          <input className={`${inputCls} w-80`} value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Record ID (e.g. a store ID)" />
          <Button variant="dark">Filter</Button>
        </form>
      </div>
      <ErrorBox error={q.error ? errorText(q.error) : null} />
      {q.isLoading && <p className="text-ink-3">Loading…</p>}
      {!q.isLoading && rows.length === 0 && <Empty>No entries match.</Empty>}
      {rows.length > 0 && (
        <Card>
          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <b>{r.action.replace(/_/g, ' ').toLowerCase()}</b> {r.entity}{' '}
                    {r.entity === 'Store' ? (
                      <Link to={`/stores/${r.entityId}`} className="font-mono text-xs underline">
                        {r.entityId.slice(0, 8)}
                      </Link>
                    ) : (
                      <button className="font-mono text-xs text-ink-3 underline" onClick={() => (setEntityId(r.entityId), set('entityId', r.entityId))}>
                        {r.entityId.slice(0, 8)}
                      </button>
                    )}
                  </span>
                  <span className="text-xs text-ink-3">
                    {r.actor ?? r.actorType.toLowerCase()} ({r.actorType.toLowerCase()}) · {fmtDate(r.at)}
                    {r.ip && ` · ${r.ip}`}
                  </span>
                </div>
                <Diff before={r.before} after={r.after} />
              </li>
            ))}
          </ul>
          {q.hasNextPage && (
            <Button variant="outline" className="mt-3" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
              {q.isFetchingNextPage ? 'Loading…' : 'Load older'}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

function Diff({ before, after }: { before: unknown; after: unknown }) {
  const show = (v: unknown) => (v == null ? null : JSON.stringify(v));
  const b = show(before);
  const a = show(after);
  if (!a && !b) return null;
  return (
    <div className="mt-1 space-y-0.5 font-mono text-[11px] leading-snug text-ink-2">
      {b && <p className="break-all">− {b}</p>}
      {a && <p className="break-all">+ {a}</p>}
    </div>
  );
}
