import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing } from 'lucide-react';
import { api } from '../lib/api';
import { enablePush, pushState, syncPush, type PushState } from '../lib/push';

interface Notice {
  id: string;
  title: string | null;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** New applications to review and document re-uploads on running stores. */
export function AdminBell() {
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<PushState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api<{ items: Notice[]; unread: number }>('/me/notifications?limit=20'), refetchInterval: 30_000 });
  const unread = data?.unread ?? 0;

  useEffect(() => {
    void syncPush().then(() => pushState().then(setPush));
    const onMessage = (e: MessageEvent) => e.data?.type === 'dz-open' && navigate(e.data.url);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [navigate]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const go = async (n: Notice) => {
    setOpen(false);
    if (!n.readAt) await api(`/me/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    if (n.url) navigate(n.url);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-black/5">
        {unread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-dz-yellow bg-dz-red px-1 text-[10px] font-extrabold text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-11 z-50 max-h-[70vh] w-[22rem] overflow-auto rounded-2xl border-[1.5px] border-black bg-white text-left shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-4 py-3">
            <b>Notifications</b>
            {unread > 0 && (
              <button type="button" className="text-xs font-bold text-ink-2 hover:underline" onClick={() => void api('/me/notifications/read-all', { method: 'POST' }).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))}>
                Mark all read
              </button>
            )}
          </div>
          {push === 'off' && (
            <div className="flex items-center justify-between gap-2 border-b border-line bg-dz-blue-soft px-4 py-2 text-xs">
              <span>Alert me about new applications.</span>
              <button type="button" className="rounded-lg bg-black px-2.5 py-1 font-bold text-white" onClick={() => void enablePush().then(setPush)}>Turn on</button>
            </div>
          )}
          {push === 'blocked' && <p className="border-b border-line px-4 py-2 text-xs text-ink-2">Alerts are blocked in this browser’s site settings.</p>}
          {data?.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-3">Nothing new.</p>}
          <ul className="divide-y divide-line">
            {data?.items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => void go(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-soft ${n.readAt ? '' : 'bg-dz-yellow-soft/40'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? '' : 'bg-dz-red'}`} />
                  <span className="min-w-0">
                    <b className="block text-sm">{n.title}</b>
                    <span className="block text-sm text-ink-2">{n.body}</span>
                    <span className="text-xs text-ink-3">{ago(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
