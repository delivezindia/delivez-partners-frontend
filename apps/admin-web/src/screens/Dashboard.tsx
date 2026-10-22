import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, FileClock, Store, TrendingUp, Zap, type LucideIcon } from 'lucide-react';
import { api, errorText } from '../lib/api';
import type { Dashboard as Data, StoreStatus } from '../lib/types';
import { ago, Card, Empty, fmtDate, PageHead, StatusChip } from '../components/ui';
import { useMe } from './Layout';

const VERTICAL: Record<string, string> = { EAT: 'Eat', GROCERY: 'Grocery', PHARMACY: 'Pharmacy', DIAGNOSTICS: 'Diagnostics', LOCAL_STORES: 'Local stores' };
const ACTION: Record<string, string> = {
  APPROVE_STORE: 'Approved',
  REJECT_STORE: 'Rejected',
  SUSPEND_STORE: 'Suspended',
  PAUSE_NEW_ORDERS: 'Paused',
  RESUME_ORDERS: 'Resumed',
  SEND_WARNING: 'Notice sent',
};

// Admin home: what needs attention right now (plan §7).
export default function Dashboard() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Data>('/admin/dashboard'), refetchInterval: 30_000 });

  if (isLoading) return <p className="text-ink-3">Loading…</p>;
  if (error || !data) return <p className="font-semibold text-dz-red">{errorText(error)}</p>;
  const c = data.statusCounts;
  const toReview = c.SUBMITTED + c.UNDER_REVIEW;

  return (
    <div className="space-y-6">
      <PageHead title="Dashboard" sub={`${me?.allCities === false ? me.cities.map((x) => x.name).join(', ') : 'All cities'} · updates every 30 seconds`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat to="/stores?status=LIVE" icon={Store} label="Live stores" value={c.LIVE + c.LIMITED} note={c.LIMITED ? `${c.LIMITED} on soft launch` : undefined} tone="green" />
        <Stat to="/stores?status=LIVE" icon={Zap} label="Open right now" value={data.openNow} />
        <Stat to="/stores?status=SUBMITTED" icon={Clock} label="Waiting for review" value={toReview} tone={toReview ? 'yellow' : undefined} />
        <Stat to="/documents" icon={FileClock} label="Documents to verify" value={data.docsPending} tone={data.docsPending ? 'yellow' : undefined} />
        <Stat to="/stores?status=DRAFT" icon={TrendingUp} label="New sign-ups (7 days)" value={data.newThisWeek} note={`${c.DRAFT} still registering`} />
        <Stat to="/stores?status=LIVE" icon={CheckCircle2} label="Went live (7 days)" value={data.liveThisWeek} tone="green" />
        <Stat to="/documents?status=EXPIRING" icon={CalendarClock} label="Licences expiring (30 days)" value={data.docsExpiring} tone={data.docsExpiring ? 'red' : undefined} />
        <Stat to="/stores?status=SUSPENDED" icon={AlertTriangle} label="Paused / suspended" value={c.PAUSED + c.SUSPENDED} tone={c.PAUSED + c.SUSPENDED ? 'red' : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Waiting longest for review" actions={<Link to="/stores?status=SUBMITTED" className="text-sm font-bold underline">All</Link>}>
          {data.waitingReview.length === 0 ? (
            <Empty>Nobody is waiting. 🎉</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.waitingReview.map((s) => (
                <li key={s.id}>
                  <Link to={`/stores/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-dz-red">
                    <span className="min-w-0">
                      <b className="block truncate">{s.name}</b>
                      <span className="text-xs text-ink-3">
                        {VERTICAL[s.vertical] ?? s.vertical} · {s.city ?? 'no city'} · readiness {s.readinessScore}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusChip status={s.status} />
                      {s.submittedAt && <span className={`text-xs ${Date.now() - new Date(s.submittedAt).getTime() > 864e5 ? 'font-bold text-dz-red' : 'text-ink-3'}`}>{ago(s.submittedAt)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Oldest documents to verify" actions={<Link to="/documents" className="text-sm font-bold underline">Queue</Link>}>
          {data.oldestDocuments.length === 0 ? (
            <Empty>All documents reviewed.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.oldestDocuments.map((d) => (
                <li key={d.id}>
                  <Link to={d.store ? `/stores/${d.store.id}` : '/documents'} className="flex items-center justify-between gap-3 py-2.5 hover:text-dz-red">
                    <span>
                      <b>{d.label}</b>
                      <span className="block text-xs text-ink-3">{d.store?.name ?? 'No store'}</span>
                    </span>
                    <span className="text-xs text-ink-3">{ago(d.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Licences expiring soon" actions={<Link to="/documents?status=EXPIRING" className="text-sm font-bold underline">All</Link>}>
          {data.expiringDocuments.length === 0 ? (
            <Empty>Nothing expires in the next 30 days.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.expiringDocuments.map((d) => {
                const past = new Date(d.expiresAt) < new Date();
                return (
                  <li key={d.id}>
                    <Link to={d.store ? `/stores/${d.store.id}` : '/documents'} className="flex items-center justify-between gap-3 py-2.5 hover:text-dz-red">
                      <span>
                        <b>{d.label}</b>
                        <span className="block text-xs text-ink-3">{d.store?.name}</span>
                      </span>
                      <span className={`text-xs font-bold ${past ? 'text-dz-red' : 'text-amber-700'}`}>
                        {past ? 'Expired' : 'Expires'} {new Date(d.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Recent admin actions">
          {data.recentActions.length === 0 ? (
            <Empty>No actions yet.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.recentActions.map((a) => (
                <li key={a.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span>
                      <b>{ACTION[a.type] ?? a.type.replace(/_/g, ' ').toLowerCase()}</b>
                      {a.store && (
                        <>
                          {' · '}
                          <Link to={`/stores/${a.store.id}`} className="font-semibold underline">
                            {a.store.name}
                          </Link>
                        </>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-ink-3">{fmtDate(a.at)}</span>
                  </div>
                  <span className="text-xs text-ink-3">
                    by {a.by}
                    {a.reason && <> — “{a.reason}”</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Stores by status">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(c) as StoreStatus[]).map((s) => (
            <Link key={s} to={`/stores?status=${s}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 hover:border-black">
              <StatusChip status={s} />
              <b className="tabular-nums">{c[s]}</b>
            </Link>
          ))}
        </div>
        {Object.keys(data.liveByVertical).length > 0 && (
          <p className="mt-4 text-sm text-ink-2">
            Live by vertical:{' '}
            {Object.entries(data.liveByVertical)
              .map(([v, n]) => `${VERTICAL[v] ?? v} ${n}`)
              .join(' · ')}
          </p>
        )}
      </Card>
    </div>
  );
}

const TONE = { green: 'text-dz-green', yellow: 'text-amber-700', red: 'text-dz-red' };

function Stat({ to, icon: Icon, label, value, note, tone }: { to: string; icon: LucideIcon; label: string; value: number; note?: string; tone?: keyof typeof TONE }) {
  return (
    <Link to={to} className="flex items-start justify-between gap-2 rounded-[14px] border border-line bg-white p-4 transition hover:-translate-y-px hover:border-neutral-400 hover:shadow-md">
      <span>
        <span className="block text-[30px] font-black leading-none tabular-nums" style={{ fontStretch: '80%' }}>
          {value}
        </span>
        <span className="mt-1 block text-xs font-bold text-ink-2">{label}</span>
        {note && <span className="block text-xs text-ink-3">{note}</span>}
      </span>
      <Icon className={`h-6 w-6 shrink-0 ${tone ? TONE[tone] : 'text-ink-3'}`} aria-hidden />
    </Link>
  );
}
