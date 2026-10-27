import { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Eye, Timer, type LucideIcon } from 'lucide-react';
import type { OrderStatus } from './orders';

// Live ops board: alert levels, their look, and the alert sound.

export type AlertLevel = 'NORMAL' | 'AT_RISK' | 'LIKELY' | 'BREACHED';
export type AlertKind = 'ACCEPT' | 'RX_REVIEW' | 'PREP' | 'NO_RIDER' | 'RIDER_TO_STORE' | 'DELIVERY' | 'DOOR';
export type RowAction = 'VIEW' | 'CALL_STORE' | 'CALL_RIDER' | 'UPDATE_PREP' | 'ESCALATE' | 'SWAP_RIDER' | 'APOLOGY';

export interface BoardItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfilmentType: 'DELIVERY' | 'PICKUP';
  isTestOrder: boolean;
  placedAt: string;
  store: { id: string; name: string; phone: string | null; city: string | null };
  task: { id: string; status: string } | null;
  rider: { id: string; name: string | null; phone: string } | null;
  alert: { level: AlertLevel; kind: AlertKind | null; reason: string; deadline: string | null; progress: number; behind: number };
  record: {
    id: string;
    level: AlertLevel;
    detectedAt: string;
    acknowledgedAt: string | null;
    acknowledgedBy: string | null;
    action: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
  } | null;
  actions: RowAction[];
}
export interface Board {
  items: BoardItem[];
  summary: { active: number; normal: number; atRisk: number; likely: number; breached: number; breachedLast5m: number; unackedBreached: string[] };
  serverTime: string;
}

// Status palette (reserved for state): good / warning / serious / critical — always shown with an icon + a word.
export const LEVEL: Record<AlertLevel, { label: string; bar: string; text: string; row: string; icon: LucideIcon; emoji: string }> = {
  NORMAL: { label: 'On track', bar: '#0ca30c', text: 'text-[#0a7a0a]', row: 'bg-white', icon: CheckCircle2, emoji: '🟢' },
  AT_RISK: { label: 'At risk', bar: '#fab219', text: 'text-[#8a5a00]', row: 'bg-white', icon: Timer, emoji: '🟡' },
  LIKELY: { label: 'Likely breach', bar: '#ec835a', text: 'text-[#b4471a]', row: 'bg-[#fdf0ea]', icon: AlertTriangle, emoji: '🟠' },
  BREACHED: { label: 'Breached', bar: '#d03b3b', text: 'text-[#b02a2a]', row: 'bg-[#fbe9e9]', icon: BellRing, emoji: '🔴' },
};
export const ACK_ICON = Eye;

export const KIND_LABEL: Record<AlertKind, string> = {
  ACCEPT: 'Accept',
  RX_REVIEW: 'Prescription',
  PREP: 'Prep',
  NO_RIDER: 'No rider',
  RIDER_TO_STORE: 'Rider to shop',
  DELIVERY: 'Delivery',
  DOOR: 'At the door',
};
export const ACTION_LABEL: Record<string, string> = {
  VIEWED: 'Viewed',
  CALLED_STORE: 'Called restaurant',
  CALLED_RIDER: 'Called rider',
  PREP_UPDATED: 'Updated prep time',
  ESCALATED: 'Escalated',
  RIDER_SWAPPED: 'Swapped rider',
  APOLOGY_SENT: 'Sent apology',
};

/** Ticks every second so timers count live. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** "4:12 left" / "+2:05 over". */
export function clock(deadline: string | null, now: number) {
  if (!deadline) return null;
  const s = Math.round((new Date(deadline).getTime() - now) / 1000);
  const a = Math.abs(s);
  const t = a >= 2 * 86_400 ? `${Math.floor(a / 86_400)} d ${Math.floor((a % 86_400) / 3600)} h` : a >= 3600 ? `${Math.floor(a / 3600)} h ${Math.floor((a % 3600) / 60)} m` : `${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
  return s >= 0 ? { text: `${t} left`, over: false } : { text: `+${t} over`, over: true };
}

// ---------------------------------------------------------------------------
// Sound: red alerts only, once per alert, never more than 3 a minute.
// ---------------------------------------------------------------------------

const SOUND_KEY = 'dz-ops-sound';
const played: number[] = [];
let ctx: AudioContext | null = null;

export const soundPref = {
  get: () => {
    try {
      return localStorage.getItem(SOUND_KEY) === 'on';
    } catch {
      return false;
    }
  },
  set: (on: boolean) => {
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      /* private mode */
    }
  },
};

/** Must be called from a click (browsers only allow audio after a user gesture). */
export async function unlockSound() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx.state === 'running';
}

/** Two short tones. Returns false when muted by the 3-per-minute limit. */
export function playBreach(): boolean {
  const now = Date.now();
  while (played.length && now - played[0] > 60_000) played.shift();
  if (played.length >= 3 || !ctx || ctx.state !== 'running') return false;
  played.push(now);
  [880, 660].forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.frequency.value = f;
    o.connect(g).connect(ctx!.destination);
    const t = ctx!.currentTime + i * 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.start(t);
    o.stop(t + 0.17);
  });
  return true;
}
