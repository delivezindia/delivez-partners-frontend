import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorText } from '../../lib/api';
import { istTime } from '../../lib/orders';
import { ACTION_LABEL, KIND_LABEL, LEVEL, type AlertKind, type AlertLevel } from '../../lib/ops';
import { Card, Empty, ErrorBox } from '../../components/ui';

interface LogRow {
  id: string;
  orderNumber: string | null;
  store: string | null;
  kind: AlertKind;
  level: AlertLevel;
  reason: string;
  detectedAt: string;
  breachedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  ackSeconds: number | null;
  action: string | null;
  actionAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

const RANGES = [
  { key: '1h', label: 'Last hour', ms: 3_600_000 },
  { key: 'today', label: 'Last 24 h', ms: 86_400_000 },
  { key: '7d', label: '7 days', ms: 7 * 86_400_000 },
] as const;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const secs = (s: number | null) => (s == null ? '' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

/** Every recorded alert for ops reviews: detected → acknowledged (and how fast) → action → resolved, and by whom. */
export default function AlertLog() {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('today');
  const [level, setLevel] = useState<'' | 'LIKELY' | 'BREACHED'>('');
  const from = new Date(Math.floor((Date.now() - RANGES.find((r) => r.key === range)!.ms) / 60_000) * 60_000).toISOString();
  const q = useQuery({
    queryKey: ['ops-log', range, level],
    queryFn: () => api<{ items: LogRow[] }>(`/admin/ops/alerts/log?${new URLSearchParams({ from, ...(level ? { level } : {}) })}`),
    refetchInterval: 30_000,
  });
  const rows = q.data?.items ?? [];
  const acked = rows.filter((r) => r.ackSeconds != null);
  const avgAck = acked.length ? Math.round(acked.reduce((s, r) => s + r.ackSeconds!, 0) / acked.length) : null;
  const pill = (on: boolean) => `rounded-full border-[1.5px] px-3 py-1.5 text-sm font-bold ${on ? 'border-black bg-black text-white' : 'border-line bg-white'}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button key={r.key} type="button" className={pill(range === r.key)} onClick={() => setRange(r.key)}>
            {r.label}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-line" />
        {(['', 'BREACHED', 'LIKELY'] as const).map((l) => (
          <button key={l || 'all'} type="button" className={pill(level === l)} onClick={() => setLevel(l)}>
            {l ? `${LEVEL[l].emoji} ${LEVEL[l].label}` : 'All levels'}
          </button>
        ))}
        {q.data && (
          <span className="ml-auto text-sm text-ink-2" data-log-summary>
            {rows.length} alert{rows.length === 1 ? '' : 's'} · {rows.filter((r) => r.level === 'BREACHED').length} breached{avgAck != null ? ` · avg time to acknowledge ${secs(avgAck)}` : ''}
          </span>
        )}
      </div>
      <ErrorBox error={q.error ? errorText(q.error) : null} />
      <Card className="overflow-x-auto p-0">
        {!q.data ? (
          <div className="h-40 animate-pulse bg-soft" aria-label="Loading" />
        ) : !rows.length ? (
          <div className="p-5">
            <Empty>No alerts in this period.</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm" data-alert-log>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2.5">Detected</th>
                <th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5">Alert</th>
                <th className="px-3 py-2.5">Acknowledged</th>
                <th className="px-3 py-2.5">Action taken</th>
                <th className="px-3 py-2.5">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const L = LEVEL[r.level];
                return (
                  <tr key={r.id} className="border-b border-line align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {day(r.detectedAt)} {istTime(r.detectedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <b>{r.orderNumber}</b>
                      <span className="block text-xs text-ink-3">{r.store}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-extrabold uppercase ${L.text}`}>
                        <L.icon className="h-3.5 w-3.5" aria-hidden /> {L.label} · {KIND_LABEL[r.kind]}
                      </span>
                      <span className="block text-xs text-ink-2">{r.reason}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.acknowledgedAt ? (
                        <>
                          {istTime(r.acknowledgedAt)} · {r.acknowledgedBy}
                          <span className="block text-xs text-ink-3">after {secs(r.ackSeconds)}</span>
                        </>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.action ? (
                        <>
                          {ACTION_LABEL[r.action] ?? r.action}
                          {r.actionAt && <span className="block text-xs text-ink-3">{istTime(r.actionAt)}</span>}
                        </>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.resolvedAt ? (
                        <>
                          {istTime(r.resolvedAt)} · {r.resolvedBy}
                        </>
                      ) : (
                        <span className="font-bold text-[#b02a2a]">Open</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
