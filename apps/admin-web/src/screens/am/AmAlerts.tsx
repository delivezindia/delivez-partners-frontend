import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { istDay, istTime, useAmQuery, type Issue } from '../../lib/am';
import { AmHeader, Page, Synced } from './AmShell';
import { IssuesList } from './AmStore';
import { Empty } from './parts';

interface Notice {
  id: string;
  title: string | null;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Issues to handle (with SLA timers) and the alerts that were pushed to this phone. */
export default function AmAlerts() {
  const [tab, setTab] = useState<'issues' | 'alerts'>('issues');
  const issues = useAmQuery<{ issues: Issue[] }>('issues-open', '/admin/am/issues?status=open', { refetchInterval: 30_000 });
  const notices = useQuery({ queryKey: ['notifications'], queryFn: () => api<{ items: Notice[]; unread: number }>('/me/notifications?limit=30'), refetchInterval: 30_000, enabled: tab === 'alerts' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function open(n: Notice) {
    if (!n.readAt) await api(`/me/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    if (n.url) navigate(n.url);
  }
  const list = issues.data?.data.issues ?? [];
  return (
    <>
      <AmHeader title="Alerts" sub={`${list.length} open issue${list.length === 1 ? '' : 's'}`} />
      <Synced at={undefined} cachedAt={issues.data?.cachedAt ?? null} />
      <Page>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-line md:max-w-md" role="tablist">
          {(
            [
              ['issues', 'Issues & escalations'],
              ['alerts', 'Notifications'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`h-10 rounded-lg text-sm font-bold ${tab === k ? 'bg-black text-dz-yellow' : 'text-ink-2'}`}
            >
              {l}
              {k === 'alerts' && (notices.data?.unread ?? 0) > 0 && <span className="ml-1 rounded-full bg-dz-red px-1.5 text-[10px] text-white">{notices.data?.unread}</span>}
            </button>
          ))}
        </div>
        {tab === 'issues' ? (
          issues.isLoading ? (
            <div className="h-32 animate-pulse rounded-2xl bg-white" />
          ) : (
            <IssuesList issues={list} showStore />
          )
        ) : !notices.data?.items.length ? (
          <Empty>No alerts yet. You’ll get one for churn risk over 70, SLA breaches and sudden order drops at your restaurants.</Empty>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2" data-notices>
            {notices.data.items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => void open(n)} className={`w-full rounded-2xl p-4 text-left ring-1 ring-line ${n.readAt ? 'bg-white' : 'bg-dz-yellow-soft'}`}>
                  <p className="font-extrabold">{n.title}</p>
                  <p className="text-sm text-ink-2">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {istDay(n.createdAt)} {istTime(n.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Page>
    </>
  );
}
