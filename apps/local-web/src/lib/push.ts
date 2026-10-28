import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth-store';

// --------------------------------------------------------------------
// Order alerts on this device (Firebase Cloud Messaging, /push-sw.js) — same flow as partners-web.
// --------------------------------------------------------------------

type PushConfig = { webReady: boolean; sending: boolean; web: Record<string, string> | null; vapidKey: string | null };
export type PushState = 'unsupported' | 'not-configured' | 'blocked' | 'off' | 'on';

const TOKEN_KEY = 'dz-local-push-token';
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

/** Asks for permission (call from a tap), registers this browser and saves its token. Single-flight. */
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

/** On sign-out: stop alerts for this account on this browser. */
export async function disablePush() {
  const token = store.get();
  store.set(null);
  window.dispatchEvent(new Event(CHANGED));
  if (token) await api('/me/push-tokens', { method: 'DELETE', body: { token } }).catch(() => undefined);
}

/** On app start (signed in): if this browser already allowed alerts, refresh the token (they rotate). */
async function syncPush() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    if ((await pushState()) === 'off') return void (await enablePush());
    const token = await fcmToken(await pushConfig());
    await api('/me/push-tokens', { method: 'POST', body: { token, platform: 'WEB' } });
    store.set(token);
  } catch {
    /* push is best-effort; the order page still refreshes itself */
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
  return state;
}

/** Keeps the token fresh while signed in, and routes in-place when an alert is tapped with the app open. */
export function usePushBridge() {
  const navigate = useNavigate();
  const signedIn = useAuth((s) => !!s.accessToken);
  useEffect(() => {
    if (signedIn) void syncPush();
  }, [signedIn]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'dz-open' && typeof e.data.url === 'string') navigate(e.data.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);
}
