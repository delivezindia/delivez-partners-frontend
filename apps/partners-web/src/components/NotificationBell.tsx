import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, CheckCheck, X } from 'lucide-react';
import { ago, enablePush, markRead, usePushState, useNotifications, type Notice } from '../lib/notifications';
import { useI18n } from '../lib/i18n';
import { Button } from './ui';
import { toast } from './feedback';

/** Header bell: unread badge + latest notifications (P27 lives at /stores/:id/notifications). */
export function NotificationBell({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useNotifications(8);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => (document.removeEventListener('mousedown', close), document.removeEventListener('keydown', esc));
  }, [open]);

  const go = async (n: Notice) => {
    setOpen(false);
    if (!n.readAt) await markRead(n.id).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    if (n.url) navigate(n.url);
  };
  const readAll = async () => {
    await markRead();
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={unread ? t('nt.bellAriaUnread', { n: unread }) : t('nt.bellAria')} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/5">
        {unread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-dz-yellow bg-dz-red px-1 text-[10px] font-extrabold text-white" data-unread>{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label={t('nt.bellAria')} className="dz-pop fixed inset-x-2 top-[64px] z-50 max-h-[75vh] overflow-auto rounded-2xl border-[1.5px] border-black bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-4 py-3">
            <b>{t('shell.notifications')}</b>
            <span className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={() => void readAll()} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-ink-2 hover:bg-soft">
                  <CheckCheck className="h-3.5 w-3.5" /> {t('nt.markAllRead')}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft sm:hidden" aria-label={t('nt.close')}><X className="h-4 w-4" /></button>
            </span>
          </div>
          <PushNudge />
          {data?.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-3">{t('nt.caughtUp')}</p>}
          <ul className="divide-y divide-line">
            {data?.items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => void go(n)} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-soft ${n.readAt ? '' : 'bg-dz-yellow-soft/40'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-dz-red'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm">{n.title}</b>
                    <span className="block text-sm text-ink-2">{n.body}</span>
                    <span className="text-xs text-ink-3">{ago(n.createdAt, t)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => (setOpen(false), navigate(`/stores/${storeId}/notifications`))} className="sticky bottom-0 w-full border-t border-line bg-white py-3 text-sm font-bold text-dz-red hover:bg-soft">
            {t('nt.seeAll')}
          </button>
        </div>
      )}
    </div>
  );
}

function PushNudge() {
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  if (state !== 'off') return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-dz-blue-soft px-4 py-2.5 text-sm">
      <span>{t('nt.nudge')}</span>
      <Button
        variant="dark"
        className="min-h-8 px-3 text-xs"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const s = await enablePush().catch(() => 'off' as const);
          setState(s);
          setBusy(false);
          if (s === 'on') toast.success(t('nt.turnedOn'));
          if (s === 'blocked') toast.error(t('nt.blockedToast'));
        }}
      >
        {t('nt.turnOn')}
      </Button>
    </div>
  );
}
