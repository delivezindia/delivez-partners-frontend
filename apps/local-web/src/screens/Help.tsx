import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, LifeBuoy, MessageCircle, Plus, Send } from 'lucide-react';
import { Field, TextArea, TextInput } from '../components/form';
import { Button, ErrorText, Skeleton } from '../components/ui';
import { api, newIdempotencyKey } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useOrder } from '../lib/orders';
import { CATEGORY_LABEL, TICKET_CATEGORIES, TICKET_STATUS, useTicket, useTickets, type Ticket, type TicketCategory } from '../lib/support';
import { messageOf } from './Login';

function Shell({ title, back, children }: { title: string; back: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-soft pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to={back} className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-2xl">{title}</h1>
      </header>
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">{children}</main>
    </div>
  );
}

const statusTone = (s: Ticket['status']) => (s === 'WAITING_ON_USER' ? 'bg-dz-yellow text-black' : s === 'RESOLVED' || s === 'CLOSED' ? 'bg-dz-green-soft text-dz-green' : 'bg-soft text-ink-2');

/** /help — the customer's tickets with Delivez support. */
export function HelpList() {
  const { t, locale } = useI18n();
  const tickets = useTickets();
  const list = tickets.data?.tickets ?? [];
  return (
    <Shell title={t('lc.help.title')} back="/account">
      <section className="rounded-2xl bg-black p-5 text-white">
        <LifeBuoy className="h-7 w-7 text-dz-yellow" aria-hidden />
        <h2 className="mt-2 text-2xl">{t('lc.help.heroTitle')}</h2>
        <p className="mt-1 text-sm text-white/70">{t('lc.help.heroBody')}</p>
        <Link to="/help/new" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-dz-yellow px-4 font-extrabold text-black">
          <Plus className="h-4 w-4" aria-hidden /> {t('lc.help.new')}
        </Link>
      </section>
      {tickets.isLoading && <Skeleton className="h-20" />}
      {!tickets.isLoading && list.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink-2 ring-1 ring-line">{t('lc.help.none')}</p>}
      {list.map((k) => (
        <Link key={k.id} to={`/help/${k.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line hover:ring-black">
          <MessageCircle className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <b className="truncate">{k.subject}</b>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${statusTone(k.status)}`}>{t(TICKET_STATUS[k.status])}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-3">
              {k.number} · {t(CATEGORY_LABEL[k.category])}
              {k.order ? ` · ${k.order.orderNumber}` : ''} · {new Date(k.lastMessageAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        </Link>
      ))}
    </Shell>
  );
}

/** /help/new?order=<id> | ?booking=<LAB-…> — raise a ticket. */
export function HelpNew() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const orderId = params.get('order') ?? '';
  const booking = params.get('booking');
  const order = useOrder(orderId);
  const o = orderId ? order.data : undefined;
  const [category, setCategory] = useState<TicketCategory>(booking ? 'LAB_BOOKING' : o?.store.vertical === 'PHARMACY' ? 'MEDICINE' : 'ORDER_ISSUE');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const attempt = useRef(newIdempotencyKey());

  async function send(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const tk = await api<Ticket>('/local/support', {
        method: 'POST',
        body: { category, subject: subject.trim(), message: booking ? `[${booking}] ${message.trim()}` : message.trim(), orderId: o?.id },
        idempotencyKey: attempt.current,
      });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/help/${tk.id}?sent=1`, { replace: true });
    } catch (err) {
      attempt.current = newIdempotencyKey();
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={t('lc.help.new')} back={o ? `/orders/${o.id}` : '/help'}>
      <form onSubmit={send} className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-line">
        {(o || booking) && (
          <p className="rounded-xl bg-soft px-3 py-2 text-sm">
            {t('lc.help.about')} <b>{o ? `${o.orderNumber} · ${o.store.name}` : booking}</b>
          </p>
        )}
        <Field label={t('lc.help.what')}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('lc.help.what')}>
            {TICKET_CATEGORIES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)} className={`min-h-10 rounded-full px-3.5 text-sm font-bold ring-1 ${category === c ? 'bg-black text-dz-yellow ring-black' : 'bg-white ring-line hover:ring-black'}`}>
                {t(CATEGORY_LABEL[c])}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('lc.help.subject')}>
          <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder={t('lc.help.subjectPh')} data-ticket-subject />
        </Field>
        <Field label={t('lc.help.message')}>
          <TextArea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} className="min-h-32" placeholder={t('lc.help.messagePh')} data-ticket-message />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={busy || subject.trim().length < 3 || message.trim().length < 5}>
          <Send className="h-4 w-4" aria-hidden /> {busy ? t('lc.help.sending') : t('lc.help.send')}
        </Button>
        <p className="text-center text-xs text-ink-3">{t('lc.help.sla')}</p>
      </form>
    </Shell>
  );
}

/** /help/:id — the conversation. */
export function HelpTicket() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const q = useTicket(id);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const k = q.data;

  async function post(path: string, b?: unknown) {
    setError('');
    setBusy(true);
    try {
      const updated = await api<Ticket>(`/local/support/${id}/${path}`, { method: 'POST', body: b, idempotencyKey: newIdempotencyKey() });
      qc.setQueryData(['ticket', id], updated);
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setBody('');
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading) return <Skeleton className="m-4 h-48" />;
  if (!k)
    return (
      <Shell title={t('lc.help.title')} back="/help">
        <p className="text-center font-bold">{t('lc.help.notFound')}</p>
      </Shell>
    );
  const open = !['RESOLVED', 'CLOSED'].includes(k.status);
  return (
    <Shell title={k.subject} back="/help">
      {params.get('sent') && (
        <p className="dz-rise rounded-2xl bg-dz-green px-4 py-3 text-sm font-bold text-white" role="status">
          {t('lc.help.sent', { n: k.number })}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <span className={`rounded-full px-2 py-0.5 font-extrabold ${statusTone(k.status)}`}>{t(TICKET_STATUS[k.status])}</span>
        {k.number} · {t(CATEGORY_LABEL[k.category])}
        {k.order && (
          <Link to={`/orders/${k.order.id}`} className="font-bold text-dz-red underline">
            {k.order.orderNumber}
          </Link>
        )}
      </p>
      <ol className="space-y-2" aria-live="polite">
        {k.thread?.map((m) => (
          <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.fromAdmin ? 'bg-white ring-1 ring-line' : 'ml-auto bg-black text-white'}`}>
            <p className={`text-[11px] font-extrabold ${m.fromAdmin ? 'text-dz-red' : 'text-dz-yellow'}`}>{m.fromAdmin ? t('lc.help.support') : t('lc.help.you')}</p>
            <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
            <p className={`mt-1 text-[10px] ${m.fromAdmin ? 'text-ink-3' : 'text-white/60'}`}>{new Date(m.at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p>
          </li>
        ))}
      </ol>
      {k.status === 'WAITING_ON_USER' && <p className="rounded-xl bg-dz-yellow-soft px-3 py-2 text-sm font-semibold">{t('lc.help.yourTurn')}</p>}
      {k.status !== 'CLOSED' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) void post('reply', { body: body.trim() });
          }}
          className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-line"
        >
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} className="min-h-20" placeholder={open ? t('lc.help.replyPh') : t('lc.help.reopenPh')} aria-label={t('lc.help.reply')} data-ticket-reply />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            {open && (
              <Button type="button" variant="ghost" className="flex-1" disabled={busy} onClick={() => void post('resolve')}>
                {t('lc.help.solved')}
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={busy || !body.trim()}>
              <Send className="h-4 w-4" aria-hidden /> {t('lc.help.reply')}
            </Button>
          </div>
        </form>
      )}
    </Shell>
  );
}
