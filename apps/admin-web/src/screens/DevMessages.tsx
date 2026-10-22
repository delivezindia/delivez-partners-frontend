import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, MessageSquareText, Smartphone } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { Empty, ErrorBox, inputCls, PageHead } from '../components/ui';

interface Message {
  id: string;
  channel: 'SMS' | 'WHATSAPP';
  toPhone: string;
  templateCode: string;
  body: string;
  provider: string;
  status: string;
  error: string | null;
  createdAt: string;
}

const time = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' });
const pretty = (p: string) => (p.startsWith('+91') ? `${p.slice(3, 8)} ${p.slice(8)}` : p);
// Make links in message text clickable (invite links, order links).
const linkify = (text: string) => text.split(/(https?:\/\/\S+)/g).map((part, i) => (/^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all font-semibold underline">{part}</a> : part));

/** Local "dev phone": every SMS and WhatsApp the platform sent while running without a real gateway. */
export default function DevMessages() {
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'' | 'SMS' | 'WHATSAPP'>('');
  const qs = new URLSearchParams({ limit: '150', ...(phone.replace(/\D/g, '').length >= 4 ? { phone } : {}), ...(channel ? { channel } : {}) }).toString();
  const q = useQuery({ queryKey: ['dev-messages', qs], queryFn: () => api<{ providers: Record<string, string>; messages: Message[] }>(`/admin/dev/messages?${qs}`), refetchInterval: 3000 });
  const byPhone = useMemo(() => {
    const m = new Map<string, Message[]>();
    for (const msg of q.data?.messages ?? []) m.set(msg.toPhone, [...(m.get(msg.toPhone) ?? []), msg]);
    return [...m.entries()];
  }, [q.data]);

  return (
    <div className="space-y-5">
      <PageHead title="Messages (dev)" sub="SMS and WhatsApp the platform sent while running locally. Nothing here reaches a real phone." />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-60">
          <input className={inputCls} placeholder="Filter by mobile number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Filter by mobile number" />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Channel">
          {(['', 'SMS', 'WHATSAPP'] as const).map((c) => (
            <button key={c || 'all'} type="button" onClick={() => setChannel(c)} className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-bold ${channel === c ? 'border-black bg-black text-white' : 'border-line bg-white'}`}>
              {c === '' ? 'All' : c === 'SMS' ? 'SMS' : 'WhatsApp'}
            </button>
          ))}
        </div>
        {q.data && (
          <span className="ml-auto text-xs text-ink-3">
            Gateway: SMS → <b>{q.data.providers.SMS}</b> · WhatsApp → <b>{q.data.providers.WHATSAPP}</b> · refreshes every 3 s
          </span>
        )}
      </div>
      <ErrorBox error={q.error ? errorText(q.error) : null} />
      {q.data && byPhone.length === 0 && <Empty>No messages yet. Log in to the Partners app or invite a staff member to see one here.</Empty>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {byPhone.map(([to, msgs]) => (
          <section key={to} className="flex max-h-[32rem] flex-col overflow-hidden rounded-[28px] border-[6px] border-black bg-[#ece5dd]" aria-label={`Phone ${to}`}>
            <header className="flex items-center gap-2 bg-black px-4 py-2.5 text-white">
              <Smartphone className="h-4 w-4" />
              <b className="font-mono tracking-wide">{pretty(to)}</b>
              <span className="ml-auto text-xs text-white/60">{msgs.length} message{msgs.length === 1 ? '' : 's'}</span>
            </header>
            <ol className="flex flex-1 flex-col-reverse gap-2 overflow-auto p-3">
              {msgs.map((m) => (
                <li key={m.id} className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.channel === 'WHATSAPP' ? 'self-end rounded-br-sm bg-[#dcf8c6]' : 'self-start rounded-bl-sm bg-white'}`} data-template={m.templateCode}>
                  <span className="mb-0.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-ink-3">
                    {m.channel === 'WHATSAPP' ? <MessageCircle className="h-3 w-3 text-[#128c7e]" /> : <MessageSquareText className="h-3 w-3" />}
                    {m.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} · {m.templateCode.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="whitespace-pre-wrap break-words">{linkify(m.body)}</span>
                  <span className="mt-1 block text-right text-[10px] text-ink-3">{time(m.createdAt)}{m.provider !== 'DEV' ? ` · via ${m.provider}${m.status === 'ACCEPTED' ? ' (accepted)' : ''}` : ''}{m.status === 'FAILED' ? ` · failed${m.error ? `: ${m.error}` : ''}` : ''}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
