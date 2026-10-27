import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Eye, Megaphone, MessageSquareHeart, Pencil, Phone, Repeat2, Siren, Volume2, VolumeX } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import { ACK_ICON, clock, LEVEL, playBreach, soundPref, unlockSound, useNow, type AlertLevel, type Board, type BoardItem, type RowAction } from '../../lib/ops';
import { CAN, can } from '../../lib/types';
import { Button, Empty, ErrorBox } from '../../components/ui';
import { useMe } from '../Layout';
import { Chip, OrderPanel } from './OrderPanel';

const RELEASABLE = ['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'WAITING_AT_PICKUP'];
const FILTERS: { key: AlertLevel | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'BREACHED', label: '🔴 Breached' },
  { key: 'LIKELY', label: '🟠 Likely breach' },
  { key: 'AT_RISK', label: '🟡 At risk' },
  { key: 'NORMAL', label: '🟢 On track' },
];

/** Live ops board: every active order with its SLA state, worst first; actions inline. */
export default function LiveBoard() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const q = useQuery({ queryKey: ['ops-board'], queryFn: () => api<Board>('/admin/ops/board'), refetchInterval: 5_000 });
  const [filter, setFilter] = useState<AlertLevel | 'ALL'>('ALL');
  const [openItem, setOpenItem] = useState<BoardItem | null>(null);
  const [sound, setSound] = useState(soundPref.get);
  const heard = useRef(new Set<string>());
  const listRef = useRef<HTMLDivElement>(null);
  const b = q.data;
  const s = b?.summary;

  // Red alerts: one sound per new breach (the 3-a-minute cap lives in playBreach), none once acknowledged.
  useEffect(() => {
    if (!b) return;
    for (const i of b.items) {
      const r = i.record;
      if (!r || r.level !== 'BREACHED' || r.acknowledgedAt || r.resolvedAt) continue;
      const key = `${r.id}:${r.level}`;
      if (heard.current.has(key)) continue;
      heard.current.add(key);
      if (sound) playBreach();
    }
  }, [b, sound]);

  const ackAll = useMutation({ mutationFn: () => api('/admin/ops/alerts/ack-all', { method: 'POST', body: {} }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['ops-board'] }) });
  const rows = (b?.items ?? []).filter((i) => filter === 'ALL' || i.alert.level === filter);
  const live = openItem ? (b?.items.find((i) => i.id === openItem.id) ?? openItem) : null;

  async function toggleSound() {
    if (sound) {
      setSound(false);
      soundPref.set(false);
    } else if (await unlockSound()) {
      setSound(true);
      soundPref.set(true);
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky banners: red stays until acknowledged; amber slides in while orders are likely to breach. */}
      {s && (s.unackedBreached.length > 0 || s.likely > 0) && (
        <div className="sticky top-[100px] z-30 space-y-2">
          {s.unackedBreached.length > 0 && (
            <div role="alert" className="dz-slide-down flex flex-wrap items-center gap-3 rounded-xl bg-[#d03b3b] px-4 py-3 text-white shadow-lg" data-banner="breach">
              <Siren className="h-6 w-6 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold uppercase tracking-wide">🚨 SLA breach detected</p>
                <p className="text-sm font-semibold">
                  {s.breachedLast5m} order{s.breachedLast5m === 1 ? '' : 's'} breached in the last 5 mins · {s.unackedBreached.length} waiting for acknowledgement
                </p>
              </div>
              <Button variant="yellow" className="min-h-10 px-3 text-sm" onClick={() => (setFilter('BREACHED'), listRef.current?.scrollIntoView({ behavior: 'smooth' }))}>
                Open control panel
              </Button>
              {can(me?.role, CAN.orderOps) && (
                <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border-[1.5px] border-white px-3 text-sm font-extrabold text-white hover:bg-white/10 disabled:opacity-50" disabled={ackAll.isPending} onClick={() => ackAll.mutate()} data-ack-all>
                  <Eye className="h-4 w-4" /> Acknowledge all
                </button>
              )}
            </div>
          )}
          {s.likely > 0 && (
            <div role="status" className="dz-slide-down flex flex-wrap items-center gap-3 rounded-xl bg-[#fab219] px-4 py-2.5 text-black shadow" data-banner="likely">
              <span className="font-extrabold">
                ⚠️ {s.likely} order{s.likely === 1 ? '' : 's'} likely to breach SLA
              </span>
              <button
                type="button"
                onClick={() => (setFilter('LIKELY'), listRef.current?.scrollIntoView({ behavior: 'smooth' }))}
                className="ml-auto rounded-lg bg-black px-3 py-1.5 text-sm font-bold text-dz-yellow"
              >
                View orders
              </button>
            </div>
          )}
        </div>
      )}

      {s && <Kpis s={s} />}

      <div ref={listRef} className="flex scroll-mt-[180px] flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const n = !s ? 0 : f.key === 'ALL' ? s.active : f.key === 'BREACHED' ? s.breached : f.key === 'LIKELY' ? s.likely : f.key === 'AT_RISK' ? s.atRisk : s.normal;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-bold ${filter === f.key ? 'border-black bg-black text-white' : 'border-line bg-white'}`}
              data-filter={f.key}
            >
              {f.label} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void toggleSound()}
          aria-pressed={sound}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-3 py-1.5 text-sm font-bold"
          data-sound
        >
          {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {sound ? 'Breach sound on' : 'Turn on breach sound'}
        </button>
      </div>

      <ErrorBox error={q.error ? errorText(q.error) : null} />
      {b && !rows.length && <Empty>{filter === 'ALL' ? 'No active orders right now.' : 'No orders in this state.'}</Empty>}
      <ul className="space-y-2" data-board>
        {rows.map((i) => (
          <Row key={`${i.id}:${i.alert.level}:${i.record?.acknowledgedAt || i.record?.resolvedAt ? 'ack' : ''}`} i={i} onOpen={() => setOpenItem(i)} />
        ))}
      </ul>
      {live && <OrderPanel id={live.id} live={live} onClose={() => setOpenItem(null)} />}
    </div>
  );
}

function Kpis({ s }: { s: Board['summary'] }) {
  // Critical card shakes once each time the breached count goes up.
  const prev = useRef(s.breached);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (s.breached > prev.current) setShake((n) => n + 1);
    prev.current = s.breached;
  }, [s.breached]);
  const cards: { label: string; value: number; state: 'normal' | 'risk' | 'critical'; key?: number }[] = [
    { label: 'Active orders', value: s.active, state: s.breached ? 'critical' : s.likely || s.atRisk ? 'risk' : 'normal' },
    { label: 'At risk', value: s.atRisk, state: s.atRisk ? 'risk' : 'normal' },
    { label: 'Likely breach', value: s.likely, state: s.likely ? 'risk' : 'normal' },
    { label: 'Breached now', value: s.breached, state: s.breached ? 'critical' : 'normal', key: shake },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-kpis>
      {cards.map((c) => (
        <div
          key={`${c.label}:${c.key ?? 0}`}
          className={`relative rounded-[14px] border-2 bg-white px-4 py-3 ${c.state === 'critical' ? `border-[#d03b3b] ${c.key ? 'dz-shake-once' : ''}` : c.state === 'risk' ? 'border-[#fab219]' : 'border-[#0ca30c]'}`}
          data-kpi={c.state}
        >
          {c.state !== 'normal' && (
            <span
              className={`absolute right-2 top-2 rounded-full px-1.5 text-xs font-extrabold ${c.state === 'critical' ? 'bg-[#d03b3b] text-white' : 'bg-[#fab219] text-black'}`}
              aria-label={c.state === 'critical' ? 'critical' : 'at risk'}
            >
              ⚠️
            </span>
          )}
          <span className="text-xs font-semibold text-ink-3">{c.label}</span>
          <b className="block text-3xl tabular-nums">{c.value}</b>
        </div>
      ))}
    </div>
  );
}

function Row({ i, onOpen }: { i: BoardItem; onOpen: () => void }) {
  const now = useNow();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const L = LEVEL[i.alert.level];
  const resolved = !!i.record?.resolvedAt;
  const acked = !!i.record?.acknowledgedAt || resolved;
  const t = clock(i.alert.deadline, now);
  const [msg, setMsg] = useState('');
  const [prepOpen, setPrepOpen] = useState(false);
  const done = (text: string) => {
    setMsg(text);
    void qc.invalidateQueries({ queryKey: ['ops-board'] });
  };
  const run = useMutation({
    mutationFn: async (a: { path: string; body?: unknown; ok: string }) => (await api(a.path, { method: 'POST', body: a.body ?? {} }), a.ok),
    onSuccess: done,
    onError: (e) => setMsg(errorText(e) ?? 'Failed'),
  });
  const ack = (action?: string) => i.record && !i.record.acknowledgedAt && void api(`/admin/ops/alerts/${i.record.id}/ack`, { method: 'POST', body: action ? { action } : {} }).then(() => done(''));
  const ackAction = (action: string) =>
    i.record && void api(`/admin/ops/alerts/${i.record.id}/ack`, { method: 'POST', body: { action } }).then(() => void qc.invalidateQueries({ queryKey: ['ops-board'] }));
  const canOps = can(me?.role, CAN.orderOps);
  const canOperate = can(me?.role, CAN.operate);
  const motion = !acked;
  const swappable = !!i.task && RELEASABLE.includes(i.task.status);

  const btn = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-black/15 bg-white px-2.5 text-xs font-bold hover:border-black disabled:opacity-40';
  const A: Record<RowAction, JSX.Element | null> = {
    VIEW: (
      <button key="v" type="button" className={btn} onClick={() => (onOpen(), ack('VIEWED'))}>
        <Eye className="h-4 w-4" /> View
      </button>
    ),
    CALL_STORE: i.store.phone ? (
      <a key="cs" href={`tel:${i.store.phone}`} className={btn} onClick={() => ackAction('CALLED_STORE')} data-act="call-store">
        <Phone className="h-4 w-4" /> Call restaurant
      </a>
    ) : null,
    CALL_RIDER: i.rider ? (
      <a key="cr" href={`tel:${i.rider.phone}`} className={btn} onClick={() => ackAction('CALLED_RIDER')} data-act="call-rider">
        <Bike className="h-4 w-4" /> Call rider
      </a>
    ) : (
      <button key="cr" type="button" className={btn} disabled title="No rider assigned yet">
        <Bike className="h-4 w-4" /> Call rider
      </button>
    ),
    UPDATE_PREP:
      canOperate && ['ACCEPTED', 'PREPARING', 'READY_SOON'].includes(i.status) ? (
        <span key="up" className="relative">
          <button type="button" className={btn} onClick={() => setPrepOpen((v) => !v)} aria-expanded={prepOpen} data-act="prep">
            <Pencil className="h-4 w-4" /> Update prep time
          </button>
          {prepOpen && (
            <span className="absolute right-0 top-10 z-20 flex gap-1 rounded-lg border border-line bg-white p-1.5 shadow-lg">
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  className="rounded-md bg-soft px-2.5 py-1.5 text-xs font-bold hover:bg-black hover:text-white"
                  onClick={() => (setPrepOpen(false), run.mutate({ path: `/admin/ops/orders/${i.id}/prep`, body: { minutes: m }, ok: `Prep time +${m} min — customer and rider see the new time` }))}
                  data-prep={m}
                >
                  +{m} min
                </button>
              ))}
            </span>
          )}
        </span>
      ) : null,
    ESCALATE: canOps ? (
      <button
        key="es"
        type="button"
        className={`${btn} border-[#d03b3b] text-[#b02a2a]`}
        disabled={run.isPending}
        onClick={() => run.mutate({ path: `/admin/ops/orders/${i.id}/escalate`, ok: 'Escalated to the city lead / head of ops' })}
        data-act="escalate"
      >
        <Megaphone className="h-4 w-4" /> Escalate
      </button>
    ) : null,
    SWAP_RIDER:
      canOperate && i.fulfilmentType === 'DELIVERY' ? (
        <button
          key="sw"
          type="button"
          className={btn}
          disabled={!swappable || run.isPending}
          title={swappable ? 'Send this order back to the rider search' : 'Only before pickup, with a rider assigned'}
          onClick={() => run.mutate({ path: `/admin/ops/tasks/${i.task!.id}/release`, ok: 'Rider released — assign the next rider' })}
          data-act="swap"
        >
          <Repeat2 className="h-4 w-4" /> Swap rider
        </button>
      ) : null,
    APOLOGY: canOps ? (
      <button
        key="ap"
        type="button"
        className={btn}
        disabled={run.isPending}
        onClick={() => run.mutate({ path: `/admin/ops/orders/${i.id}/apology`, ok: 'Apology sent to the customer' })}
        data-act="apology"
      >
        <MessageSquareHeart className="h-4 w-4" /> Send apology
      </button>
    ) : null,
  };

  return (
    <li
      className={`rounded-xl border border-line ${L.row} ${acked ? 'opacity-70' : ''} ${i.alert.level === 'AT_RISK' && motion ? 'dz-alert-glow' : ''}`}
      data-live={i.orderNumber}
      data-level={i.alert.level}
      data-acked={acked ? '1' : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <div className="w-[190px] shrink-0">
          <p className={`flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide ${L.text}`}>
            {acked ? <ACK_ICON className="h-4 w-4" aria-label="acknowledged" /> : <L.icon className="h-4 w-4" aria-hidden />} {L.label}
          </p>
          {t && (
            <p
              className={`text-lg font-extrabold tabular-nums ${t.over || i.alert.level === 'BREACHED' ? 'text-[#b02a2a]' : ''} ${i.alert.level === 'LIKELY' && motion ? 'dz-alert-blink' : ''}`}
              data-timer
            >
              ⏱ {t.text}
            </p>
          )}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden>
            <div
              className={`h-full rounded-full ${i.alert.level === 'BREACHED' && motion ? 'dz-alert-pulse' : ''}`}
              style={{ width: `${Math.max(6, i.alert.progress * 100)}%`, background: L.bar }}
              data-sla-bar
            />
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <button type="button" onClick={onOpen} className="font-extrabold hover:underline">
            {i.orderNumber}
          </button>
          {i.isTestOrder && <span className="ml-1.5 rounded bg-soft px-1 text-[10px] font-bold uppercase text-ink-3">test</span>}
          <span className="text-ink-3"> · {i.store.name}</span>
          <p className="text-sm font-semibold">{i.alert.reason}</p>
          {resolved ? (
            <p className="text-xs font-bold text-dz-green" data-resolved>
              ✓ Resolved by {i.record!.resolvedBy}
            </p>
          ) : (
            i.record?.acknowledgedAt && (
              <p className="text-xs text-ink-3">
                👁 {i.record.acknowledgedBy}
                {i.record.action ? ` · ${i.record.action.toLowerCase().replace(/_/g, ' ')}` : ''}
              </p>
            )
          )}
          {msg && <p className="text-xs font-bold text-dz-green">{msg}</p>}
        </div>
        <div className="w-[150px] shrink-0 text-xs">
          <Chip status={i.status} />
          <p className="mt-1 truncate text-ink-2">{i.fulfilmentType === 'PICKUP' ? 'Pickup' : i.rider ? `🚴 ${i.rider.name ?? 'Rider'}` : 'No rider yet'}</p>
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-1.5">
          {i.actions.map((a) => A[a])}
          {i.record && !acked && canOps && (
            <button type="button" className={btn} onClick={() => ack()} title="Acknowledge — stops the motion and sound" data-ack>
              <ACK_ICON className="h-4 w-4" /> Ack
            </button>
          )}
          {i.record && acked && !resolved && canOps && (
            <Button variant="outline" className="min-h-9 px-2.5 text-xs" onClick={() => run.mutate({ path: `/admin/ops/alerts/${i.record!.id}/resolve`, ok: 'Resolved' })} data-resolve>
              Resolve
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
