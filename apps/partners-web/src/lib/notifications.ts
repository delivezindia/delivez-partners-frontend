import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface Notice {
  id: string;
  code: string;
  title: string | null;
  body: string;
  url: string | null;
  storeId: string | null;
  readAt: string | null;
  createdAt: string;
}

export const useNotifications = (limit = 30) =>
  useQuery({ queryKey: ['notifications', limit], queryFn: () => api<{ items: Notice[]; unread: number; nextBefore: string | null }>(`/me/notifications?limit=${limit}`), refetchInterval: 60_000 });

export const markRead = (id?: string) => api<{ unread: number }>(id ? `/me/notifications/${id}/read` : '/me/notifications/read-all', { method: 'POST' });

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// --------------------------------------------------------------------
// Push on this device (Firebase Cloud Messaging, our own service worker)
// --------------------------------------------------------------------

type PushConfig = { webReady: boolean; sending: boolean; web: Record<string, string> | null; vapidKey: string | null };
export type PushState = 'unsupported' | 'not-configured' | 'blocked' | 'off' | 'on';

const TOKEN_KEY = 'dz-push-token';
const store = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (v: string | null) => { try { if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

let configP: Promise<PushConfig> | null = null;
const pushConfig = () => (configP ??= api<PushConfig>('/push/config').catch(() => ({ webReady: false, sending: false, web: null, vapidKey: null })));

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (!(await pushConfig()).webReady) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && store.get() ? 'on' : 'off';
}

async function fcmToken(cfg: PushConfig) {
  const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const app = getApps()[0] ?? initializeApp(cfg.web!);
  const registration = await navigator.serviceWorker.register('/push-sw.js');
  return getToken(getMessaging(app), { vapidKey: cfg.vapidKey!, serviceWorkerRegistration: registration });
}

const CHANGED = 'dz-push-changed';
let enabling: Promise<PushState> | null = null;

/** Asks for permission (must be called from a tap), registers this browser and saves its token.
 *  Single-flight: the background sync and a tap can't register twice at once (Firebase's token store races). */
export function enablePush(): Promise<PushState> {
  enabling ??= doEnable().finally(() => {
    enabling = null;
    window.dispatchEvent(new Event(CHANGED));
  });
  return enabling;
}

async function doEnable(): Promise<PushState> {
  const cfg = await pushConfig();
  if (!pushSupported()) return 'unsupported';
  if (!cfg.webReady) return 'not-configured';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'blocked' : 'off';
  const token = await fcmToken(cfg);
  await api('/me/push-tokens', { method: 'POST', body: { token, platform: 'WEB' } });
  store.set(token);
  return 'on';
}

export async function disablePush() {
  const token = store.get();
  store.set(null);
  window.dispatchEvent(new Event(CHANGED));
  if (!token) return;
  await api('/me/push-tokens', { method: 'DELETE', body: { token } }).catch(() => undefined);
  try {
    const { getApps } = await import('firebase/app');
    const { getMessaging, deleteToken } = await import('firebase/messaging');
    if (getApps()[0]) await deleteToken(getMessaging(getApps()[0]));
  } catch {
    /* already gone */
  }
}

/** On app start: if this browser already allowed alerts, refresh the token (they rotate) for the current user. */
export async function syncPush() {
  try {
    if ((await pushState()) === 'off' && pushSupported() && Notification.permission === 'granted') {
      await enablePush();
    } else if ((await pushState()) === 'on') {
      const token = await fcmToken(await pushConfig());
      await api('/me/push-tokens', { method: 'POST', body: { token, platform: 'WEB' } });
      store.set(token);
    }
  } catch {
    /* push is best-effort; the bell still works */
  }
}

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => {
    const load = () => void pushState().then(setState);
    load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, []);
  return [state, setState] as const;
}

/** Clicking a notification while the app is open routes in-place; also keeps the bell fresh. */
export function usePushBridge() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    void syncPush();
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'dz-open') return;
      if (e.data.notificationId) void markRead(e.data.notificationId).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
      navigate(e.data.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate, qc]);
}
