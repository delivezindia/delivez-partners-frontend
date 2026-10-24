import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Send, UserCheck } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { CAN, can } from '../lib/types';
import { Button, Card, Empty, ErrorBox, inputCls, PageHead } from '../components/ui';
import { useMe } from './Layout';

type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED';
interface Row {
  id: string;
  number: string;
  category: string;
  subject: string;
  status: Status;
  priority: string;
  order: { id: string; orderNumber: string } | null;
  lastMessageAt: string;
  lastFromAdmin: boolean;
  store: { id: string; name: string; city: string | null } | null;
  assignedTo: string | null;
}
interface Ticket extends Omit<Row, 'store'> {
  thread: { id: string; body: string; fromAdmin: boolean; author: string; at: string }[];
  store: { id: string; name: string; city: string | null; phone: string | null } | null;
  raisedBy: { name: string | null; phone: string };
  mine: boolean;
}

const STATUS_LABEL: Record<Status, { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
  IN_PROGRESS: { label: 'In progress', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink' },
  WAITING_ON_USER: { label: 'Waiting on shop', cls: 'border-line bg-soft text-ink-2' },
  RESOLVED: { label: 'Resolved', cls: 'border-dz-green bg-dz-green-soft text-dz-green' },
  CLOSED: { label: 'Closed', cls: 'border-line bg-soft text-ink-3' },
};
const CATEGORY: Record<string, string> = { ORDER_ISSUE: 'Order', PAYOUT: 'Payments', MENU: 'Menu', ACCOUNT: 'Account', TECH: 'App problem', OTHER: 'Other' };
const FILTERS = [
  { value: 'ACTIVE', label: 'Needs work' },
  { value: 'OPEN', label: 'Open' },
  { value: 'WAITING_ON_USER', label: 'Waiting on shop' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' },
];
const SUPPORT = ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'SUPPORT'] as typeof CAN.orderOps;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

// Help requests from shops (P26). City-scoped like everything else.
export default function Support() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('ticket');
  const [filter, setFilter] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const list = useQuery({
    queryKey: ['support', filter, q],
    queryFn: () => api<{ tickets: Row[]; counts: Partial<Record<Status, number>> }>(`/admin/support/tickets?status=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`),
    refetchInterval: 30_000,
  });
  const active = (list.data?.counts.OPEN ?? 0) + (list.data?.counts.IN_PROGRESS ?? 0);
  return (
    <div className="space-y-5">
      <PageHead title="Support" sub={`Requests from shops · ${active} need work`} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select className={`${inputCls} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status">
              {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input className={`${inputCls} flex-1`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticket no., subject or store" aria-label="Search tickets" />
          </div>
          <ErrorBox error={list.error ? errorText(list.error) : null} />
          {list.data && list.data.tickets.length === 0 && <Empty>No tickets here.</Empty>}
          <ul className="space-y-2" aria-label="Tickets">
            {list.data?.tickets.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setParams({ ticket: t.id })} className={`w-full rounded-2xl border-[1.5px] bg-white p-3 text-left transition hover:border-black ${openId === t.id ? 'border-black' : 'border-line'}`} data-ticket={t.number}>
                  <div className="flex items-start justify-between gap-2">
                    <b>{t.subject}</b>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_LABEL[t.status].cls}`}>{STATUS_LABEL[t.status].label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {t.number} · {CATEGORY[t.category] ?? t.category} · {t.store?.name}{t.store?.city ? `, ${t.store.city}` : ''} · {when(t.lastMessageAt)}
                    {t.priority === 'HIGH' && <b className="ml-1 text-dz-red">· High</b>}
                    {!t.lastFromAdmin && t.status !== 'RESOLVED' && t.status !== 'CLOSED' && <b className="ml-1 text-dz-blue">· Shop waiting</b>}
                  </p>
                  {t.assignedTo && <p className="text-xs text-ink-3">With {t.assignedTo}</p>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>{openId ? <TicketPanel id={openId} /> : <Empty>Pick a ticket to read and reply.</Empty>}</div>
      </div>
    </div>
  );
}

function TicketPanel({ id }: { id: string }) {
  const me = useMe().data;
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [after, setAfter] = useState<'WAITING_ON_USER' | 'RESOLVED' | 'IN_PROGRESS'>('WAITING_ON_USER');
  const t = useQuery({ queryKey: ['support', 'ticket', id], queryFn: () => api<Ticket>(`/admin/support/tickets/${id}`), refetchInterval: 20_000 });
  const canAct = can(me?.role, SUPPORT);
  const update = (r: Ticket) => (qc.setQueryData(['support', 'ticket', id], r), void qc.invalidateQueries({ queryKey: ['support'] }));
  const send = useMutation({ mutationFn: () => api<Ticket>(`/admin/support/tickets/${id}/messages`, { method: 'POST', body: { body: reply, status: after } }), onSuccess: (r) => (update(r), setReply('')) });
  const status = useMutation({ mutationFn: (s: Status) => api<Ticket>(`/admin/support/tickets/${id}/status`, { method: 'POST', body: { status: s } }), onSuccess: update });
  const assign = useMutation({ mutationFn: () => api<Ticket>(`/admin/support/tickets/${id}/assign`, { method: 'POST' }), onSuccess: update });
  if (t.error) return <ErrorBox error={errorText(t.error)} />;
  if (!t.data) return <Empty>Loading…</Empty>;
  const d = t.data;
  return (
    <Card
      title={`${d.number} · ${d.subject}`}
      actions={<span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_LABEL[d.status].cls}`} data-status={d.status}>{STATUS_LABEL[d.status].label}</span>}
    >
      <div className="space-y-4">
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-ink-3">Store</dt><dd>{d.store ? <Link className="font-bold underline" to={`/stores/${d.store.id}`}>{d.store.name}</Link> : '—'}{d.store?.city ? `, ${d.store.city}` : ''}</dd></div>
          <div><dt className="text-xs text-ink-3">Raised by</dt><dd>{d.raisedBy.name ?? '—'} · <a className="inline-flex items-center gap-1 underline" href={`tel:${d.raisedBy.phone}`}><Phone className="h-3 w-3" aria-hidden />{d.raisedBy.phone}</a></dd></div>
          <div><dt className="text-xs text-ink-3">About</dt><dd>{CATEGORY[d.category] ?? d.category}{d.order && <> · <Link className="underline" to="/orders">{d.order.orderNumber}</Link></>}</dd></div>
          <div><dt className="text-xs text-ink-3">Handled by</dt><dd>{d.assignedTo ?? 'Nobody yet'}</dd></div>
        </dl>
        <ol className="space-y-3" aria-label="Conversation">
          {d.thread.map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.fromAdmin ? 'ml-auto bg-dz-blue-soft' : 'bg-soft'}`}>
              <span className="block text-xs font-bold text-ink-2">{m.fromAdmin ? `${m.author} (Delivez)` : m.author} · {when(m.at)}</span>
              <span className="whitespace-pre-wrap">{m.body}</span>
            </li>
          ))}
        </ol>
        {canAct && d.status !== 'CLOSED' && (
          <div className="space-y-2 border-t border-line pt-3">
            <textarea className={`${inputCls} h-auto min-h-24 py-2`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the shop (they see “Delivez support”)" aria-label="Reply" />
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${inputCls} w-auto`} value={after} onChange={(e) => setAfter(e.target.value as typeof after)} aria-label="After replying">
                <option value="WAITING_ON_USER">…and wait for the shop</option>
                <option value="IN_PROGRESS">…and keep working on it</option>
                <option value="RESOLVED">…and mark resolved</option>
              </select>
              <Button disabled={!reply.trim() || send.isPending} onClick={() => send.mutate()}><Send className="h-4 w-4" aria-hidden /> Send reply</Button>
              {!d.mine && <Button variant="outline" disabled={assign.isPending} onClick={() => assign.mutate()}><UserCheck className="h-4 w-4" aria-hidden /> Take it</Button>}
              {d.status !== 'RESOLVED' && <Button variant="outline" disabled={status.isPending} onClick={() => status.mutate('RESOLVED')}>Resolve</Button>}
              {d.status === 'RESOLVED' && <Button variant="outline" disabled={status.isPending} onClick={() => status.mutate('CLOSED')}>Close</Button>}
            </div>
            <ErrorBox error={send.error || status.error || assign.error ? errorText(send.error ?? status.error ?? assign.error) : null} />
          </div>
        )}
      </div>
    </Card>
  );
}
