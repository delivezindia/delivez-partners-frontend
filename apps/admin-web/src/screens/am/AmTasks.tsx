import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Phone, Plus, X } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { dueIn, istDay, istTime, useAmQuery, type StoreCard, type Task } from '../../lib/am';
import { AmHeader, Page, Synced } from './AmShell';
import { Empty } from './parts';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'done', label: 'Done' },
] as const;
const KIND_LABEL: Record<Task['kind'], string> = { CALL: '📞 Call restaurant', VISIT: '📍 Visit', TEST_ORDER: '🧪 Run test order', FOLLOW_UP: '↩ Follow up' };
const PRIORITY: Record<Task['priority'], string> = { HIGH: 'bg-dz-red-soft text-dz-red', MEDIUM: 'bg-dz-yellow-soft text-[#8a5a00]', LOW: 'bg-soft text-ink-2' };

/** Today / overdue follow-ups with priority and due time; tick off in one tap. */
export default function AmTasks() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('today');
  const [adding, setAdding] = useState(false);
  const q = useAmQuery<{ tasks: Task[]; counts: { today: number; overdue: number } }>(`tasks-${tab}`, `/admin/am/tasks?tab=${tab}`);
  const qc = useQueryClient();
  const done = useMutation({
    mutationFn: (id: string) => api(`/admin/am/tasks/${id}/done`, { method: 'POST', body: {} }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['am'] }),
  });
  const data = q.data?.data;
  return (
    <>
      <AmHeader
        title="Tasks"
        sub={data ? `${data.counts.today} today · ${data.counts.overdue} overdue` : ' '}
        right={
          <button type="button" onClick={() => setAdding(true)} className="mt-1 grid h-11 w-11 place-items-center rounded-full bg-black text-dz-yellow" aria-label="New task" data-new-task>
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <Synced at={undefined} cachedAt={q.data?.cachedAt ?? null} />
      <Page>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1 ring-1 ring-line md:max-w-lg" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`h-10 rounded-lg text-sm font-bold ${tab === t.key ? 'bg-black text-dz-yellow' : 'text-ink-2'}`}
            >
              {t.label}
              {t.key === 'overdue' && (data?.counts.overdue ?? 0) > 0 && <span className="ml-1 text-dz-red">•</span>}
            </button>
          ))}
        </div>
        {q.isLoading && <div className="h-32 animate-pulse rounded-2xl bg-white" />}
        {data && !data.tasks.length && <Empty>{tab === 'done' ? 'Nothing completed yet.' : 'No tasks here.'}</Empty>}
        <ul className="grid gap-3 md:grid-cols-2" data-tasks>
          {data?.tasks.map((t) => {
            const due = dueIn(t.dueAt);
            return (
              <li key={t.id} className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
                {tab !== 'done' ? (
                  <button
                    type="button"
                    onClick={() => done.mutate(t.id)}
                    disabled={done.isPending}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-black"
                    aria-label={`Mark done: ${t.title}`}
                    data-done={t.id}
                  >
                    <Check className="h-5 w-5" />
                  </button>
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-dz-green text-white">
                    <Check className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-3">{KIND_LABEL[t.kind]}</p>
                  <p className="font-extrabold">{t.title}</p>
                  {t.store && (
                    <Link to={`/am/stores/${t.store.id}`} className="text-sm font-bold text-dz-red">
                      {t.store.name}
                    </Link>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-extrabold ${PRIORITY[t.priority]}`}>{t.priority.toLowerCase()}</span>
                    <span className={due.late && !t.doneAt ? 'font-bold text-dz-red' : 'text-ink-3'}>
                      {t.doneAt ? `Done ${istDay(t.doneAt)} ${istTime(t.doneAt)}` : `Due ${istDay(t.dueAt)} ${istTime(t.dueAt)} · ${due.text}`}
                    </span>
                  </p>
                </div>
                {t.store?.phone && t.kind === 'CALL' && !t.doneAt && (
                  <a href={`tel:${t.store.phone}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-dz-red text-white" aria-label={`Call ${t.store.name}`}>
                    <Phone className="h-5 w-5" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </Page>
      {adding && <TaskSheet onClose={() => setAdding(false)} />}
    </>
  );
}

/** New task: pick a restaurant (or fixed from a store page), kind, priority and when. */
export function TaskSheet({ storeId, storeName, onClose }: { storeId?: string; storeName?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const stores = useAmQuery<{ stores: StoreCard[] }>('stores-name', '/admin/am/stores?sort=name', { enabled: !storeId });
  const [form, setForm] = useState({ storeId: storeId ?? '', kind: 'CALL' as Task['kind'], title: '', priority: 'MEDIUM' as Task['priority'], when: 'today' as 'now' | 'today' | 'tomorrow' | 'week' });
  const [err, setErr] = useState('');
  const dueAt = () => {
    const d = new Date();
    if (form.when === 'now') return new Date(d.getTime() + 60 * 60_000);
    if (form.when === 'today') return new Date(Math.max(d.getTime() + 60 * 60_000, new Date(d.toDateString()).getTime() + 18 * 3_600_000));
    if (form.when === 'tomorrow') return new Date(new Date(d.toDateString()).getTime() + 24 * 3_600_000 + 11 * 3_600_000);
    return new Date(new Date(d.toDateString()).getTime() + 7 * 24 * 3_600_000 + 11 * 3_600_000);
  };
  const save = useMutation({
    mutationFn: () =>
      api('/admin/am/tasks', {
        method: 'POST',
        body: { storeId: form.storeId, kind: form.kind, title: form.title.trim() || KIND_LABEL[form.kind].slice(2).trim(), priority: form.priority, dueAt: dueAt().toISOString() },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['am'] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'No network — try again when online'),
  });
  const pill = (on: boolean) => `h-11 rounded-xl px-3 text-sm font-bold ring-1 ${on ? 'bg-black text-dz-yellow ring-black' : 'bg-white text-ink-2 ring-line'}`;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="New task" className="max-h-[90vh] w-full overflow-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl" data-task-sheet>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl">New task</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-soft" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          {storeId ? (
            <p className="font-bold">{storeName}</p>
          ) : (
            <label className="block text-sm font-bold">
              Restaurant
              <select
                value={form.storeId}
                onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                className="mt-1 h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-3"
                data-task-store
              >
                <option value="">Choose…</option>
                {stores.data?.data.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(KIND_LABEL) as Task['kind'][]).map((k) => (
              <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })} className={pill(form.kind === k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={140}
            placeholder="What exactly? (optional)"
            className="h-12 w-full rounded-xl border-[1.5px] border-line px-3"
          />
          <div>
            <p className="mb-1 text-sm font-bold">Priority</p>
            <div className="grid grid-cols-3 gap-2">
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })} className={pill(form.priority === p)}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-bold">Due</p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['now', 'In 1 h'],
                  ['today', 'Today'],
                  ['tomorrow', 'Tomorrow'],
                  ['week', 'Next week'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, when: k })} className={pill(form.when === k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-sm font-bold text-dz-red">{err}</p>}
          <button
            type="button"
            disabled={!form.storeId || save.isPending}
            onClick={() => save.mutate()}
            className="h-14 w-full rounded-xl bg-dz-red text-lg font-extrabold text-white disabled:opacity-40"
            data-save-task
          >
            Add task
          </button>
        </div>
      </div>
    </div>
  );
}
