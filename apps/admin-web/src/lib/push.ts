import { api } from './api';

// Push for the admin console — same Firebase project and service worker as the Partners app.
type PushConfig = { webReady: boolean; sending: boolean; web: Record<string, string> | null; vapidKey: string | null };
export type PushState = 'unsupported' | 'not-configured' | 'blocked' | 'off' | 'on';

const TOKEN_KEY = 'dz-admin-push-token';
const saved = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (v: string | null) => { try { if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};
let configP: Promise<PushConfig> | null = null;
const pushConfig = () => (configP ??= api<PushConfig>('/push/config').catch(() => ({ webReady: false, sending: false, web: null, vapidKey: null })));
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (!(await pushConfig()).webReady) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && saved.get() ? 'on' : 'off';
}

async function token(cfg: PushConfig) {
  const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const app = getApps()[0] ?? initializeApp(cfg.web!);
  return getToken(getMessaging(app), { vapidKey: cfg.vapidKey!, serviceWorkerRegistration: await navigator.serviceWorker.register('/push-sw.js') });
}

let enabling: Promise<PushState> | null = null;
/** Single-flight: the background sync and a click can't register twice at once (Firebase's token store races). */
export function enablePush(): Promise<PushState> {
  enabling ??= doEnable().finally(() => (enabling = null));
  return enabling;
}

async function doEnable(): Promise<PushState> {
  const cfg = await pushConfig();
  if (!supported()) return 'unsupported';
  if (!cfg.webReady) return 'not-configured';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'blocked' : 'off';
  const t = await token(cfg);
  await api('/me/push-tokens', { method: 'POST', body: { token: t, platform: 'WEB' } });
  saved.set(t);
  return 'on';
}

export async function disablePush() {
  const t = saved.get();
  saved.set(null);
  if (t) await api('/me/push-tokens', { method: 'DELETE', body: { token: t } }).catch(() => undefined);
}

export async function syncPush() {
  try {
    if (supported() && Notification.permission === 'granted' && (await pushConfig()).webReady) await enablePush();
  } catch {
    /* best-effort */
  }
}
