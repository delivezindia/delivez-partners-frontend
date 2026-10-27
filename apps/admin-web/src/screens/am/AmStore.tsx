import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Check, FlaskConical, Flag, MessageCircle, Minus, NotebookPen, Phone, Plus, Send, Sparkles, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { ACTIVITY_LABEL, dueIn, FACTOR_LABEL, ISSUE_LABEL, istDay, istTime, logActivity, useAmQuery, useOutbox, type AmStoreDetail, type Issue } from '../../lib/am';
import { AmHeader, Page, Synced } from './AmShell';
import { Action, BadgeChip, callHref, Card, Empty, mins, pct, Trend, useTestOrder } from './parts';
import { PrepChart, RiderChart } from './charts';
import { TaskSheet } from './AmTasks';

const TABS = [
  { key: 'health', label: 'Health' },
  { key: 'sla', label: 'SLA & prep' },
  { key: 'risk', label: 'Churn risk' },
  { key: 'actions', label: 'Actions' },
  { key: 'issues', label: 'Issues' },
  { key: 'log', label: 'Log' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function AmStore() {
  const { storeId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'health') as Tab;
  const q = useAmQuery<AmStoreDetail>(`store-${storeId}`, `/admin/am/stores/${storeId}`);
  const d = q.data?.data;
  const [script, setScript] = useState(false);
  const [taskFor, setTaskFor] = useState(false);
  const test = useTestOrder(storeId);

  return (
    <>
      <AmHeader
        back={
          <Link to="/am/stores" className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/10" aria-label="Back to restaurants">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
        title={d?.store.name ?? 'Restaurant'}
        sub={
          d ? (
            <span className="capitalize">
              {d.store.category}
              {d.store.area ? ` · ${d.store.area}` : ''}
            </span>
          ) : (
            ' '
          )
        }
      />
      <Synced at={d?.syncedAt} cachedAt={q.data?.cachedAt ?? null} />
      {q.isError && !d && (
        <Page>
          <Empty>{q.error instanceof ApiError ? q.error.message : 'Couldn’t load this restaurant.'}</Empty>
        </Page>
      )}
      {d && (
        <Page>
          <div className="flex gap-2 md:max-w-xl">
            <Action icon={Phone} label="Call" tone="red" href={callHref(d.store.phone)} onClick={() => void logActivity({ storeId, kind: 'CALL' })} />
            <Action icon={NotebookPen} label="Script" onClick={() => setScript(true)} data-script-btn="1" />
            <Action icon={FlaskConical} label="Test order" onClick={test.run} busy={test.busy} />
            <Action icon={CalendarPlus} label="Task" onClick={() => setTaskFor(true)} />
          </div>
          {test.msg && <p className="text-sm font-semibold text-ink-2">{test.msg}</p>}

          <div className="-mx-4 flex gap-1 overflow-x-auto border-b-[1.5px] border-line px-4 [scrollbar-width:none]" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setParams({ tab: t.key }, { replace: true })}
                className={`relative h-11 shrink-0 px-3 text-sm font-bold ${tab === t.key ? 'text-dz-red shadow-[inset_0_-3px_0_var(--color-dz-red)]' : 'text-ink-2'}`}
              >
                {t.label}
                {t.key === 'issues' && d.issues.length > 0 && <span className="ml-1 rounded-full bg-dz-red px-1.5 text-[10px] text-white">{d.issues.length}</span>}
              </button>
            ))}
          </div>

          {tab === 'health' && <HealthTab d={d} />}
          {tab === 'sla' && <SlaTab d={d} storeId={storeId} />}
          {tab === 'risk' && <RiskTab d={d} onScript={() => setScript(true)} />}
          {tab === 'actions' && <ActionsTab d={d} storeId={storeId} />}
          {tab === 'issues' && <IssuesList issues={d.issues} />}
          {tab === 'log' && <LogTab d={d} storeId={storeId} />}
        </Page>
      )}
      {script && d && <ScriptSheet d={d} storeId={storeId} onClose={() => setScript(false)} />}
      {taskFor && d && <TaskSheet storeId={storeId} storeName={d.store.name} onClose={() => setTaskFor(false)} />}
    </>
  );
}

function Stat({ label, value, sub, tone = '' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-soft p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{label}</p>
      <p className={`mt-1 font-display text-2xl leading-none ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-2">{sub}</p>}
    </div>
  );
}

function HealthTab({ d }: { d: AmStoreDetail }) {
  const h = d.health;
  const score = h.risk == null ? null : 100 - h.risk;
  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Health snapshot</h2>
          <BadgeChip badge={h.badge} risk={h.risk} />
        </div>
        <div className="mt-3" data-health-bar>
          <div className="relative h-3 rounded-full bg-gradient-to-r from-[#d03b3b] via-[#fab219] to-[#0ca30c]" aria-hidden>
            {score != null && <span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-black shadow" style={{ left: `${score}%` }} />}
          </div>
          <p className="mt-1.5 flex justify-between text-[11px] font-bold text-ink-3">
            <span>Action needed</span>
            <span>{score == null ? 'No orders yet' : `Health ${score}/100`}</span>
            <span>Healthy</span>
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat
            label="SLA (7D)"
            value={
              <>
                {pct(h.current.slaPct)} <Trend t={h.slaTrend} />
              </>
            }
            sub={h.previous.slaPct != null ? `Last week ${h.previous.slaPct}%` : 'No data last week'}
          />
          <Stat label="Orders / day" value={h.ordersPerDay} sub={`${h.current.orders} in 7 days${h.orderDropPct ? ` · ↓${h.orderDropPct}%` : ''}`} tone={h.orderDropPct >= 30 ? 'text-dz-red' : ''} />
          <Stat label="Cancellation %" value={pct(h.current.cancelPct)} sub="Ended by the store" tone={(h.current.cancelPct ?? 0) >= 10 ? 'text-dz-red' : ''} />
          <Stat label="Prep variance" value={mins(h.current.prepVariance, true)} sub="vs promised time" tone={(h.current.prepVariance ?? 0) > 3 ? 'text-dz-red' : ''} />
        </div>
        <p className="mt-3 text-xs text-ink-3">
          {h.complaints} complaint{h.complaints === 1 ? '' : 's'} in 7 days (ratings ≤ 2, doorstep returns, customer tickets).
        </p>
      </Card>
      {d.store.phone && (
        <p className="text-center text-sm text-ink-2">
          {d.store.address ?? ''} ·{' '}
          <a className="font-bold text-dz-red" href={`tel:${d.store.phone}`}>
            {d.store.phone}
          </a>
        </p>
      )}
    </>
  );
}

function SlaTab({ d, storeId }: { d: AmStoreDetail; storeId: string }) {
  const h = d.health;
  const qc = useQueryClient();
  const [val, setVal] = useState(d.store.prepMinutes);
  const [msg, setMsg] = useState('');
  const save = useMutation({
    mutationFn: () => api<{ prepMinutes: number }>(`/admin/am/stores/${storeId}/prep`, { method: 'PUT', body: { minutes: val, reason: 'Adjusted by account manager' } }),
    onSuccess: (r) => {
      setMsg(`Saved — default prep is now ${r.prepMinutes} min. The shop has been told.`);
      void qc.invalidateQueries({ queryKey: ['am'] });
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'No network — try again when online'),
  });
  const { min, max } = d.store.prepLimits;
  return (
    <>
      {h.flags.length > 0 && (
        <div className="space-y-2" data-flags>
          {h.flags.includes('PREP_UP') && (
            <p className="rounded-xl bg-dz-red-soft px-3 py-2 text-sm font-bold text-dz-red">
              🚩 Prep time up {Math.round(((h.current.avgPrep ?? 0) - (h.previous.avgPrep ?? 0)) * 10) / 10} min on last week
            </p>
          )}
          {h.flags.includes('RIDER_WAIT') && <p className="rounded-xl bg-dz-red-soft px-3 py-2 text-sm font-bold text-dz-red">🚩 Riders wait {h.current.riderWait} min for food on average</p>}
          {h.flags.includes('FOOD_WAIT') && <p className="rounded-xl bg-dz-yellow-soft px-3 py-2 text-sm font-bold text-[#8a5a00]">🚩 Ready food waits {h.current.foodWait} min for a rider</p>}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Prep time: promised vs actual</h2>
          <p className="mb-2 text-xs text-ink-3">
            Avg {mins(h.current.avgPrep)} actual vs {mins(h.current.avgPromised)} promised · {h.current.timed} timed orders
          </p>
          <PrepChart series={d.series} />
        </Card>
        <Card>
          <h2 className="text-lg">Rider arrival vs ready time</h2>
          <p className="mb-2 text-xs text-ink-3">Minutes between food ready and the rider reaching the shop.</p>
          <RiderChart series={d.series} />
        </Card>
      </div>
      <Card className="md:max-w-md">
        <h2 className="text-lg">✏️ Adjust prep time</h2>
        <p className="text-xs text-ink-3">
          Default prep is {d.store.prepMinutes} min. You can change it by up to 10 min at a time ({min}–{max} min).
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setVal((v) => Math.max(min, v - 1))}
            disabled={val <= min}
            className="grid h-12 w-12 place-items-center rounded-full bg-soft disabled:opacity-40"
            aria-label="One minute less"
          >
            <Minus className="h-5 w-5" />
          </button>
          <p className="w-24 text-center font-display text-4xl" data-prep-value>
            {val}
            <span className="text-base"> min</span>
          </p>
          <button
            type="button"
            onClick={() => setVal((v) => Math.min(max, v + 1))}
            disabled={val >= max}
            className="grid h-12 w-12 place-items-center rounded-full bg-soft disabled:opacity-40"
            aria-label="One minute more"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          disabled={val === d.store.prepMinutes || save.isPending}
          onClick={() => save.mutate()}
          className="mt-3 h-12 w-full rounded-xl bg-black font-extrabold text-dz-yellow disabled:opacity-40"
          data-save-prep
        >
          Save prep time
        </button>
        {msg && <p className="mt-2 text-sm font-semibold text-ink-2">{msg}</p>}
      </Card>
    </>
  );
}

function RiskTab({ d, onScript }: { d: AmStoreDetail; onScript: () => void }) {
  const h = d.health;
  const sorted = [...h.breakdown].sort((a, b) => b.points - a.points);
  return (
    <Card className="lg:max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Why this restaurant is at risk</h2>
      </div>
      <p className="mt-1 text-sm text-ink-2">
        Churn risk <b className="text-ink">{h.risk ?? '—'}/100</b> — each factor can add up to its weight.
      </p>
      <ul className="mt-3 space-y-3" data-breakdown>
        {sorted.map((b) => (
          <li key={b.factor}>
            <div className="flex justify-between text-sm">
              <span className="font-bold">
                {FACTOR_LABEL[b.factor]} <span className="font-semibold text-ink-3">· weight {b.weight}%</span>
              </span>
              <span className="font-extrabold">{b.points} pts</span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-soft" aria-hidden>
              <div className="h-2.5 rounded-full bg-black" style={{ width: `${(b.points / b.weight) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-3">Bars show how much of each factor’s weight this restaurant uses up.</p>
      <button type="button" onClick={onScript} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-dz-red font-extrabold text-white">
        <Phone className="h-5 w-5" aria-hidden /> Call with suggested script
      </button>
    </Card>
  );
}

function ActionsTab({ d, storeId }: { d: AmStoreDetail; storeId: string }) {
  const qc = useQueryClient();
  const [done, setDone] = useState<Record<string, string>>({});
  const apply = useMutation({
    mutationFn: (kind: string) => api<{ done: string; prepMinutes?: number }>(`/admin/am/stores/${storeId}/apply`, { method: 'POST', body: { kind } }),
    onSuccess: (r, kind) => {
      setDone((x) => ({ ...x, [kind]: r.done === 'PREP' ? `Applied — prep is now ${r.prepMinutes} min` : r.done === 'ESCALATED' ? 'Escalated to city ops' : 'Added to your tasks' }));
      void qc.invalidateQueries({ queryKey: ['am'] });
    },
    onError: (e, kind) => setDone((x) => ({ ...x, [kind]: e instanceof ApiError ? e.message : 'No network — try again' })),
  });
  if (!d.suggestions.length) return <Empty>No suggested actions — this restaurant’s numbers are within limits.</Empty>;
  return (
    <ul className="grid gap-3 md:grid-cols-2" data-suggestions>
      {d.suggestions.map((s) => (
        <li key={s.kind}>
          <Card>
            <p className="flex items-center gap-2 font-extrabold">
              <Sparkles className="h-5 w-5 text-ai-accent" aria-hidden /> {s.title}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              <b className="text-ink">Expected impact:</b> {s.impact}
            </p>
            {done[s.kind] ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-dz-green">
                <Check className="h-4 w-4" /> {done[s.kind]}
              </p>
            ) : (
              <button
                type="button"
                disabled={apply.isPending}
                onClick={() => apply.mutate(s.kind)}
                className="mt-3 h-12 w-full rounded-xl bg-black font-extrabold text-dz-yellow disabled:opacity-50"
                data-apply={s.kind}
              >
                {s.kind.startsWith('PREP') ? 'Apply' : s.kind === 'ESCALATE_RIDERS' ? 'Escalate' : 'Add task'}
              </button>
            )}
          </Card>
        </li>
      ))}
      <p className="text-xs text-ink-3">Suggestions come from rules on this restaurant’s last 7 days. Rider pools, pickup offsets and incentives aren’t in the system yet, so they aren’t offered.</p>
    </ul>
  );
}

export function IssuesList({ issues, showStore = false }: { issues: Issue[]; showStore?: boolean }) {
  const qc = useQueryClient();
  const [err, setErr] = useState('');
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'escalate' | 'resolve' }) => api(`/admin/am/issues/${id}/${action}`, { method: 'POST', body: {} }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['am'] }),
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'No network — try again'),
  });
  if (!issues.length) return <Empty>No open issues. 🎉</Empty>;
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-issues>
      {err && <p className="text-sm font-bold text-dz-red">{err}</p>}
      {issues.map((i) => {
        const due = dueIn(i.dueAt);
        return (
          <li key={i.id}>
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-3">{ISSUE_LABEL[i.kind]}</p>
                  <p className="font-extrabold">{i.title}</p>
                  {showStore && i.store && (
                    <Link to={`/am/stores/${i.store.id}?tab=issues`} className="text-sm font-bold text-dz-red">
                      {i.store.name}
                    </Link>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold ${i.status === 'ESCALATED' ? 'bg-dz-blue-soft text-dz-blue' : due.late ? 'bg-dz-red-soft text-dz-red' : 'bg-soft text-ink-2'}`}
                >
                  {i.status === 'ESCALATED' ? 'With ops' : `⏱ ${due.text}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-3">
                Owner: {i.owner === 'OPS' ? 'City ops' : 'You'} · raised {istDay(i.createdAt)} {istTime(i.createdAt)}
                {i.note ? ` · ${i.note}` : ''}
              </p>
              <div className="mt-3 flex gap-2">
                {i.status === 'OPEN' && (
                  <button
                    type="button"
                    onClick={() => act.mutate({ id: i.id, action: 'escalate' })}
                    disabled={act.isPending}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-soft text-sm font-extrabold"
                    data-escalate={i.id}
                  >
                    <Flag className="h-4 w-4" /> Escalate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => act.mutate({ id: i.id, action: 'resolve' })}
                  disabled={act.isPending}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-dz-green text-sm font-extrabold text-white"
                  data-resolve={i.id}
                >
                  <Check className="h-4 w-4" /> Resolve
                </button>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function LogTab({ d, storeId }: { d: AmStoreDetail; storeId: string }) {
  const qc = useQueryClient();
  const pending = useOutbox().filter((p) => p.storeId === storeId);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  async function add(kind: 'NOTE' | 'VISIT') {
    if (!note.trim()) return;
    const r = await logActivity({ storeId, kind, note: note.trim() }).catch((e) => (setMsg(e instanceof ApiError ? e.message : 'Failed'), null));
    if (!r) return;
    setNote('');
    setMsg(r === 'queued' ? 'Saved on this phone — it will sync when you’re back online.' : 'Saved');
    void qc.invalidateQueries({ queryKey: ['am'] });
  }
  const wa = d.store.phone ? `https://wa.me/${d.store.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, this is your Delivez account manager about ${d.store.name}.`)}` : undefined;
  const items = [...pending.map((p) => ({ id: p.clientId, kind: p.kind, note: p.note ?? null, at: p.at, by: 'You', pending: true })), ...d.activity];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start">
      <Card>
        <label htmlFor="am-note" className="text-sm font-bold">
          Add a note
        </label>
        <textarea
          id="am-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="What was discussed, what’s promised…"
          className="mt-1 w-full rounded-xl border-[1.5px] border-line p-3 outline-none focus:border-black"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void add('NOTE')}
            disabled={!note.trim()}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-black text-sm font-extrabold text-dz-yellow disabled:opacity-40"
            data-add-note
          >
            <Send className="h-4 w-4" /> Save note
          </button>
          <button type="button" onClick={() => void add('VISIT')} disabled={!note.trim()} className="h-11 flex-1 rounded-xl bg-soft text-sm font-extrabold disabled:opacity-40">
            Log a visit
          </button>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              onClick={() => void logActivity({ storeId, kind: 'WHATSAPP' })}
              className="grid h-11 w-12 place-items-center rounded-xl bg-[#25d366] text-white"
              aria-label="WhatsApp the restaurant"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
        </div>
        {msg && <p className="mt-2 text-xs font-semibold text-ink-2">{msg}</p>}
      </Card>
      {!items.length ? (
        <Empty>No calls or notes yet.</Empty>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-line pl-4" data-log>
          {items.map((a) => (
            <li key={a.id} className="relative">
              <span className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${a.pending ? 'bg-[#fab219]' : 'bg-black'}`} aria-hidden />
              <p className="text-sm font-extrabold">
                {ACTIVITY_LABEL[a.kind] ?? a.kind} {a.pending && <span className="text-xs font-bold text-[#8a5a00]">· waiting to sync</span>}
              </p>
              {a.note && <p className="text-sm text-ink-2">{a.note}</p>}
              <p className="text-[11px] text-ink-3">
                {istDay(a.at)} {istTime(a.at)}
                {a.by ? ` · ${a.by}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ScriptSheet({ d, storeId, onClose }: { d: AmStoreDetail; storeId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Call script" className="max-h-[85vh] w-full overflow-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl" data-script>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl">Suggested call script</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-soft" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-3">
          {d.script.map((l, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-soft p-3 text-[15px]">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-xs font-extrabold text-dz-yellow">{i + 1}</span>
              {l}
            </li>
          ))}
        </ol>
        {d.store.phone ? (
          <a
            href={`tel:${d.store.phone}`}
            onClick={() => void logActivity({ storeId, kind: 'CALL', note: 'Called with the suggested script' })}
            className="mt-4 flex h-14 items-center justify-center gap-2 rounded-xl bg-dz-red text-lg font-extrabold text-white"
          >
            <Phone className="h-5 w-5" /> Call {d.store.phone}
          </a>
        ) : (
          <p className="mt-4 text-sm text-ink-2">No phone number on file for this restaurant.</p>
        )}
      </div>
    </div>
  );
}
