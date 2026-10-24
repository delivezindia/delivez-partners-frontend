import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, LifeBuoy, MessageSquarePlus, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { errorMessageOf } from '../../lib/onboarding';
import { Field, TextArea, TextInput } from '../../components/form';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';

type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED';
interface TicketSummary {
  id: string;
  number: string;
  category: string;
  subject: string;
  status: Status;
  order: { id: string; orderNumber: string } | null;
  createdAt: string;
  lastMessageAt: string;
  lastFromAdmin: boolean;
}
interface Ticket extends TicketSummary {
  thread: { id: string; body: string; fromAdmin: boolean; author: string; at: string }[];
}

const CATEGORIES: { value: string; t: MsgKey }[] = [
  { value: 'ORDER_ISSUE', t: 'help.cat.ORDER_ISSUE' },
  { value: 'PAYOUT', t: 'help.cat.PAYOUT' },
  { value: 'MENU', t: 'help.cat.MENU' },
  { value: 'ACCOUNT', t: 'help.cat.ACCOUNT' },
  { value: 'TECH', t: 'help.cat.TECH' },
  { value: 'OTHER', t: 'help.cat.OTHER' },
];
const STATUS: Record<Status, { t: MsgKey; cls: string }> = {
  OPEN: { t: 'help.st.OPEN', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
  IN_PROGRESS: { t: 'help.st.IN_PROGRESS', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink' },
  WAITING_ON_USER: { t: 'help.st.WAITING_ON_USER', cls: 'border-dz-red bg-dz-red-soft text-dz-red' },
  RESOLVED: { t: 'help.st.RESOLVED', cls: 'border-dz-green bg-dz-green-soft text-dz-green' },
  CLOSED: { t: 'help.st.CLOSED', cls: 'border-line bg-soft text-ink-3' },
};
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

// P26 Help & support: raise a request with Delivez and follow the replies.
export default function Help() {
  const { storeId } = useStoreContext();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const openId = params.get('ticket');
  const fromOrder = params.get('order');
  const [creating, setCreating] = useState(!!fromOrder);
  const list = useQuery({ queryKey: ['support', storeId], queryFn: () => api<{ tickets: TicketSummary[] }>(`/partners/stores/${storeId}/support/tickets`), refetchInterval: 30_000 });
  const open = (id: string | null) => {
    setCreating(false);
    setParams(id ? { ticket: id } : {});
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">{t('help.title')}</h1>
          <p className="text-ink-2">{t('help.subtitle')}</p>
        </div>
        {!creating && (
          <Button className="min-h-11" onClick={() => (setParams({}), setCreating(true))}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden /> {t('help.new')}
          </Button>
        )}
      </div>

      {creating ? (
        <NewTicket storeId={storeId} orderNumber={fromOrder ?? ''} onCancel={() => (setCreating(false), setParams({}))} onCreated={(id) => open(id)} />
      ) : openId ? (
        <TicketView storeId={storeId} id={openId} onBack={() => open(null)} />
      ) : (
        <>
          {list.error && <ErrorText>{errorMessageOf(list.error)}</ErrorText>}
          {list.isLoading && <SkeletonList rows={3} />}
          {list.data && list.data.tickets.length === 0 && <EmptyState icon={LifeBuoy} title={t('help.emptyTitle')} body={t('help.emptyBody')} />}
          {!!list.data?.tickets.length && (
            <ul className="dz-card divide-y divide-line" aria-label={t('help.yourRequests')}>
              {list.data.tickets.map((tk) => (
                <li key={tk.id}>
                  <button type="button" onClick={() => open(tk.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-soft" data-ticket={tk.number}>
                    <span className="min-w-[12rem] flex-1">
                      <b className="block">{tk.subject}</b>
                      <span className="text-xs text-ink-3">{tk.number} · {t(CATEGORIES.find((c) => c.value === tk.category)?.t ?? 'help.cat.OTHER')}{tk.order ? ` · ${tk.order.orderNumber}` : ''} · {when(tk.lastMessageAt)}</span>
                    </span>
                    {tk.lastFromAdmin && tk.status === 'WAITING_ON_USER' && <span className="rounded-full bg-dz-red px-2 py-0.5 text-xs font-bold text-white">{t('help.newReply')}</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS[tk.status].cls}`}>{t(STATUS[tk.status].t)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function NewTicket({ storeId, orderNumber, onCancel, onCreated }: { storeId: string; orderNumber: string; onCancel: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({ category: orderNumber ? 'ORDER_ISSUE' : '', subject: '', message: '', orderNumber });
  const create = useMutation({
    mutationFn: () => api<Ticket>(`/partners/stores/${storeId}/support/tickets`, { method: 'POST', body: { category: f.category, subject: f.subject, message: f.message, orderNumber: f.orderNumber.trim() || undefined } }),
    onSuccess: (tk) => (void qc.invalidateQueries({ queryKey: ['support', storeId] }), toast.success(t('help.sent', { no: tk.number })), onCreated(tk.id)),
  });
  const ok = !!f.category && f.subject.trim().length >= 5 && f.message.trim().length >= 10;
  return (
    <section className="dz-card max-w-2xl space-y-4 p-5" aria-label={t('help.new')}>
      <Field label={t('help.category')}>
        <select className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label={t('help.category')}>
          <option value="">{t('help.pick')}</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(c.t)}</option>)}
        </select>
      </Field>
      <Field label={t('help.subject')}><TextInput value={f.subject} maxLength={120} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder={t('help.subjectPh')} /></Field>
      <Field label={t('help.message')}><TextArea rows={5} value={f.message} maxLength={2000} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder={t('help.messagePh')} /></Field>
      <Field label={t('help.order')} hint={t('help.orderHint')}><TextInput value={f.orderNumber} onChange={(e) => setF({ ...f, orderNumber: e.target.value.toUpperCase() })} placeholder="DEL-123456" /></Field>
      {create.error && <ErrorText>{errorMessageOf(create.error)}</ErrorText>}
      <div className="flex gap-2">
        <Button className="min-h-11" disabled={!ok || create.isPending} onClick={() => create.mutate()}><Send className="h-4 w-4" aria-hidden /> {t('help.send')}</Button>
        <Button variant="ghost" className="min-h-11" onClick={onCancel}>{t('lb.back')}</Button>
      </div>
    </section>
  );
}

function TicketView({ storeId, id, onBack }: { storeId: string; id: string; onBack: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const tk = useQuery({ queryKey: ['support', storeId, id], queryFn: () => api<Ticket>(`/partners/stores/${storeId}/support/tickets/${id}`), refetchInterval: 20_000 });
  const refresh = (r: Ticket) => (qc.setQueryData(['support', storeId, id], r), void qc.invalidateQueries({ queryKey: ['support', storeId] }));
  const send = useMutation({ mutationFn: () => api<Ticket>(`/partners/stores/${storeId}/support/tickets/${id}/messages`, { method: 'POST', body: { body: reply } }), onSuccess: (r) => (refresh(r), setReply('')) });
  const solve = useMutation({ mutationFn: () => api<Ticket>(`/partners/stores/${storeId}/support/tickets/${id}/resolve`, { method: 'POST' }), onSuccess: (r) => (refresh(r), toast.success(t('help.solvedToast'))) });
  useEffect(() => window.scrollTo({ top: 0 }), [id]);
  if (tk.error) return <ErrorText>{errorMessageOf(tk.error)}</ErrorText>;
  if (!tk.data) return <SkeletonList rows={2} />;
  const d = tk.data;
  const open = d.status !== 'RESOLVED' && d.status !== 'CLOSED';
  return (
    <section className="max-w-3xl space-y-4" aria-label={d.subject}>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 font-bold text-ink-2 hover:text-ink"><ArrowLeft className="h-4 w-4" /> {t('help.allRequests')}</button>
      <div className="dz-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl">{d.subject}</h2>
            <p className="text-sm text-ink-3">
              {d.number} · {t(CATEGORIES.find((c) => c.value === d.category)?.t ?? 'help.cat.OTHER')}
              {d.order && <> · <Link className="underline" to={`/stores/${storeId}/orders/${d.order.orderNumber}`}>{d.order.orderNumber}</Link></>}
            </p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS[d.status].cls}`} data-status={d.status}>{t(STATUS[d.status].t)}</span>
        </div>
        <ol className="mt-4 space-y-3">
          {d.thread.map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.fromAdmin ? 'bg-dz-blue-soft' : 'ml-auto bg-dz-yellow-soft'}`} data-from={m.fromAdmin ? 'delivez' : 'shop'}>
              <span className="block text-xs font-bold text-ink-2">{m.fromAdmin ? t('help.delivez') : m.author} · {when(m.at)}</span>
              <span className="whitespace-pre-wrap">{m.body}</span>
            </li>
          ))}
        </ol>
      </div>
      {d.status !== 'CLOSED' && (
        <div className="dz-card space-y-2 p-4">
          <TextArea rows={3} value={reply} maxLength={2000} onChange={(e) => setReply(e.target.value)} placeholder={open ? t('help.replyPh') : t('help.reopenPh')} aria-label={t('help.reply')} />
          {(send.error || solve.error) && <ErrorText>{errorMessageOf(send.error ?? solve.error)}</ErrorText>}
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={!reply.trim() || send.isPending} onClick={() => send.mutate()}><Send className="h-4 w-4" aria-hidden /> {t('help.reply')}</Button>
            {open && <Button variant="ghost" className="min-h-11" disabled={solve.isPending} onClick={() => solve.mutate()}><CheckCircle2 className="h-4 w-4" aria-hidden /> {t('help.solved')}</Button>}
          </div>
        </div>
      )}
    </section>
  );
}
