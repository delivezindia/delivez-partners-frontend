import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Pause, Phone, Play, Repeat2, Shuffle } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import { CAN, can } from '../../lib/types';
import { Empty, ErrorBox } from '../../components/ui';
import { useMe } from '../Layout';

interface RiderRow {
  id: string;
  code: string;
  name: string | null;
  phone: string;
  isOnline: boolean;
  pausedAt: string | null;
  lastSeenAt: string | null;
  load: number;
  state: 'OFFLINE' | 'OVERLOADED' | 'BUSY' | 'PAUSED' | 'FREE' | 'OFF';
  tasks: { id: string; status: string; orderNumber?: string; store?: string; releasable: boolean }[];
}

const STATE: Record<RiderRow['state'], { label: string; cls: string }> = {
  OFFLINE: { label: 'Offline unexpectedly', cls: 'border-[#d03b3b] bg-[#fbe9e9]' },
  OVERLOADED: { label: 'Overloaded', cls: 'border-[#ec835a] ring-2 ring-[#ec835a]/40' },
  BUSY: { label: 'On orders', cls: 'border-line' },
  PAUSED: { label: 'Paused by ops', cls: 'border-line bg-soft' },
  FREE: { label: 'Free', cls: 'border-[#0ca30c]/50' },
  OFF: { label: 'Off shift', cls: 'border-line opacity-70' },
};

/** Riders on active orders: overloaded (3+ orders) and riders who went offline while carrying orders. */
export default function Riders() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const q = useQuery({ queryKey: ['ops-riders'], queryFn: () => api<{ items: RiderRow[] }>('/admin/ops/riders'), refetchInterval: 10_000 });
  const [msg, setMsg] = useState<Record<string, string>>({});
  const act = useMutation({
    mutationFn: async (a: { id: string; path: string; body?: unknown; ok: string }) => (await api(a.path, { method: 'POST', body: a.body ?? {} }), a),
    onSuccess: (a) => {
      setMsg((m) => ({ ...m, [a.id]: a.ok }));
      void qc.invalidateQueries({ queryKey: ['ops-riders'] });
      void qc.invalidateQueries({ queryKey: ['ops-board'] });
    },
    onError: (e, a) => setMsg((m) => ({ ...m, [a.id]: errorText(e) ?? 'Failed' })),
  });
  const canAct = can(me?.role, CAN.operate);
  const rows = q.data?.items ?? [];
  const btn = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-black/15 bg-white px-2.5 text-xs font-bold hover:border-black disabled:opacity-40';
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Overloaded = 3 or more orders at once. Offline unexpectedly = carrying orders but not paused by ops and not seen for 3 minutes.</p>
      <ErrorBox error={q.error ? errorText(q.error) : null} />
      {q.data && !rows.length && <Empty>No riders on shift in your cities.</Empty>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-riders>
        {rows.map((r) => {
          const s = STATE[r.state];
          return (
            <li key={r.id} className={`rounded-xl border-2 bg-white p-4 ${s.cls}`} data-rider-state={r.state}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate font-extrabold ${r.state === 'OFFLINE' ? 'line-through decoration-[#d03b3b] decoration-2' : ''}`}>{r.name ?? r.code}</p>
                  <p className="text-xs text-ink-3">
                    {r.code} · {r.load} active order{r.load === 1 ? '' : 's'}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${r.state === 'OFFLINE' ? 'bg-[#d03b3b] text-white' : r.state === 'OVERLOADED' ? 'bg-[#ec835a] text-black' : 'bg-soft text-ink-2'}`}
                >
                  {(r.state === 'OFFLINE' || r.state === 'OVERLOADED') && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                  {s.label}
                </span>
              </div>
              {r.tasks.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {r.tasks.map((t) => (
                    <li key={t.id}>
                      {t.orderNumber} · {t.store} · <span className="text-ink-3">{t.status.toLowerCase().replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <a href={`tel:${r.phone}`} className={btn}>
                  <Phone className="h-4 w-4" /> Call
                </a>
                {canAct && r.state === 'OFFLINE' && (
                  <button
                    type="button"
                    className={`${btn} border-[#d03b3b] text-[#b02a2a]`}
                    disabled={act.isPending || !r.tasks.some((t) => t.releasable)}
                    onClick={() => act.mutate({ id: r.id, path: `/admin/ops/riders/${r.id}/reassign`, body: { mode: 'ALL' }, ok: 'Orders sent back to the rider search' })}
                    data-reassign
                  >
                    <Shuffle className="h-4 w-4" /> Reassign orders
                  </button>
                )}
                {canAct && r.state === 'OVERLOADED' && (
                  <button
                    type="button"
                    className={btn}
                    disabled={act.isPending || !r.tasks.some((t) => t.releasable)}
                    onClick={() => act.mutate({ id: r.id, path: `/admin/ops/riders/${r.id}/reassign`, body: { mode: 'ONE' }, ok: 'Latest order sent back to the rider search' })}
                    data-reduce
                  >
                    <Repeat2 className="h-4 w-4" /> Reduce load
                  </button>
                )}
                {canAct && !r.pausedAt && r.state !== 'OFF' && (
                  <button
                    type="button"
                    className={btn}
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: r.id, path: `/admin/ops/riders/${r.id}/pause`, ok: 'Paused — no new orders' })}
                    data-pause
                  >
                    <Pause className="h-4 w-4" /> Pause rider
                  </button>
                )}
                {canAct && r.pausedAt && (
                  <button type="button" className={btn} disabled={act.isPending} onClick={() => act.mutate({ id: r.id, path: `/admin/ops/riders/${r.id}/resume`, ok: 'Back on — can take orders' })}>
                    <Play className="h-4 w-4" /> Resume
                  </button>
                )}
              </div>
              {msg[r.id] && <p className="mt-2 text-xs font-bold text-ink-2">{msg[r.id]}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
