import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, Laptop, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { errorMessageOf } from '../../lib/onboarding';
import { ago, disablePush, enablePush, markRead, usePushState, type Notice } from '../../lib/notifications';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';

const STATE_TEXT = {
  unsupported: 'This browser can’t show alerts. Use Chrome, Edge or Firefox — or the Delivez Partners app.',
  'not-configured': 'Push alerts aren’t set up on this server yet. You’ll still see everything here and in the bell.',
  blocked: 'Alerts are blocked for this site. Allow notifications in your browser’s site settings, then reload.',
  off: 'Turn on alerts to hear about new orders even when this tab is closed or minimised.',
  on: 'Alerts are on for this device. Keep the browser running to receive them.',
} as const;

// P27 Notifications: everything Delivez told you, plus push alerts for this device.
export default function Notifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);
  const list = useInfiniteQuery({
    queryKey: ['notifications', 'all'],
    queryFn: ({ pageParam }) => api<{ items: Notice[]; unread: number; nextBefore: string | null }>(`/me/notifications?limit=30${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = list.data?.pages[0]?.unread ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const test = useMutation({
    mutationFn: () => api<{ devices: number; sent: number; pushEnabled: boolean }>('/me/notifications/test', { method: 'POST' }),
    onSuccess: (r) => {
      void refresh();
      toast.success(r.devices ? (r.pushEnabled ? `Test sent to ${r.devices} device(s)` : 'Test added (push sending isn’t switched on yet)') : 'Test added — no device has alerts on');
    },
  });

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === 'on') {
        await disablePush();
        setState('off');
        toast.info('Alerts turned off for this device');
      } else {
        const s = await enablePush();
        setState(s);
        if (s === 'on') toast.success('Alerts are on for this device');
      }
    } catch (e) {
      toast.error(errorMessageOf(e) ?? 'Could not change alerts');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">Notifications</h1>
          <p className="text-ink-2">Orders, bookings, documents and messages from Delivez.</p>
        </div>
        {unread > 0 && (
          <Button variant="ghost" className="min-h-10 text-sm" onClick={() => void markRead().then(refresh)}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <section className="dz-card flex flex-wrap items-center gap-4 p-5" aria-label="Alerts on this device">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${state === 'on' ? 'bg-dz-green-soft text-dz-green' : 'bg-soft text-ink-2'}`}>
          {state === 'on' ? <Bell className="h-6 w-6" /> : state === 'off' ? <Laptop className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
        </span>
        <div className="min-w-[14rem] flex-1">
          <b>Alerts on this device</b>
          <p className="text-sm text-ink-2" data-push-state={state ?? ''}>{state ? STATE_TEXT[state] : 'Checking…'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(state === 'on' || state === 'off') && (
            <Button variant={state === 'on' ? 'ghost' : 'primary'} className="min-h-11" disabled={busy} onClick={() => void toggle()}>
              {busy ? (state === 'on' ? 'Turning off…' : 'Turning on…') : state === 'on' ? 'Turn off' : 'Turn on alerts'}
            </Button>
          )}
          <Button variant="ghost" className="min-h-11" disabled={test.isPending} onClick={() => test.mutate()}>
            <Send className="h-4 w-4" /> Send a test
          </Button>
        </div>
        {test.error && <ErrorText>{errorMessageOf(test.error)}</ErrorText>}
      </section>

      {list.isLoading && <SkeletonList rows={5} />}
      {list.data && items.length === 0 && <EmptyState icon={Bell} title="Nothing yet" body="New orders, document updates and messages from Delivez show up here." />}
      {items.length > 0 && (
        <ul className="dz-card divide-y divide-line overflow-hidden">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={async () => {
                  if (!n.readAt) await markRead(n.id).catch(() => undefined);
                  void refresh();
                  if (n.url) navigate(n.url);
                }}
                className={`flex w-full gap-3 px-5 py-4 text-left transition hover:bg-soft ${n.readAt ? '' : 'bg-dz-yellow-soft/40'}`}
              >
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-dz-red'}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <b className="block">{n.title}</b>
                  <span className="block text-sm text-ink-2">{n.body}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-3">{ago(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button variant="ghost" className="w-full" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'Loading…' : 'Show older'}
        </Button>
      )}
    </div>
  );
}
