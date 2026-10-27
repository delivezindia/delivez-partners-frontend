import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

// Account manager mobile view: types, offline cache and the offline notes outbox.

export type Badge = 'HIGH' | 'WATCH' | 'STABLE' | 'NO_DATA';
export type Factor = 'SLA' | 'ORDER_DROP' | 'PREP_VARIANCE' | 'CANCELLATIONS' | 'COMPLAINTS';

export interface StoreCard {
  id: string;
  name: string;
  vertical: string;
  category: string;
  phone: string | null;
  area: string | null;
  openState: string;
  slaPct: number | null;
  slaTrend: 'UP' | 'DOWN' | 'FLAT';
  orders7d: number;
  risk: number | null;
  badge: Badge;
  openIssues: number;
}

export interface WindowStats {
  orders: number;
  slaPct: number | null;
  cancelPct: number | null;
  prepVariance: number | null;
  avgPrep: number | null;
  avgPromised: number | null;
  riderWait: number | null;
  foodWait: number | null;
  timed: number;
}

export interface Health {
  current: WindowStats;
  previous: WindowStats;
  ordersPerDay: number;
  orderDropPct: number;
  complaints: number;
  slaTrend: 'UP' | 'DOWN' | 'FLAT';
  risk: number | null;
  badge: Badge;
  breakdown: { factor: Factor; weight: number; severity: number; points: number }[];
  flags: ('PREP_UP' | 'RIDER_WAIT' | 'FOOD_WAIT')[];
}

export type SuggestionKind = 'PREP_UP' | 'PREP_DOWN' | 'ESCALATE_RIDERS' | 'VISIT' | 'CALL_COMPLAINTS' | 'CALL_REJECTIONS';
export interface Issue {
  id: string;
  storeId: string;
  orderId: string | null;
  kind: 'PREP_DELAY' | 'RIDER_DELAY' | 'COMPLAINT' | 'ORDER_DROP' | 'CHURN_RISK';
  title: string;
  status: 'OPEN' | 'ESCALATED' | 'RESOLVED';
  owner: 'AM' | 'OPS';
  dueAt: string;
  note: string | null;
  resolvedAt: string | null;
  createdAt: string;
  store?: { id: string; name: string; phone: string | null };
}
export interface Task {
  id: string;
  storeId: string;
  kind: 'CALL' | 'VISIT' | 'TEST_ORDER' | 'FOLLOW_UP';
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueAt: string;
  doneAt: string | null;
  source: string;
  store?: { id: string; name: string; phone: string | null };
}
export interface Activity {
  id: string;
  kind: string;
  note: string | null;
  meta: unknown;
  at: string;
  by: string | null;
  pending?: boolean;
}

export interface AmHome {
  am: { name: string; zone: string };
  kpis: { assigned: number; active7d: number; avgSla: number | null; highRisk: number; watch: number; ordersToday: number; openIssues: number; tasksDue: number };
  atRisk: StoreCard[];
  syncedAt: string;
}
export interface AmStoreDetail {
  store: StoreCard & { address: string | null; prepMinutes: number; prepLimits: { min: number; max: number } };
  health: Health;
  series: { date: string; orders: number; promised: number | null; actual: number | null; riderVsReady: number | null }[];
  suggestions: { kind: SuggestionKind; title: string; impact: string; minutes?: number }[];
  script: string[];
  issues: Issue[];
  tasks: Task[];
  activity: Activity[];
  syncedAt: string;
}

export const BADGE: Record<Badge, { label: string; dot: string; chip: string }> = {
  HIGH: { label: 'High risk', dot: 'bg-[#d03b3b]', chip: 'bg-dz-red-soft text-dz-red' },
  WATCH: { label: 'Watch', dot: 'bg-[#fab219]', chip: 'bg-dz-yellow-soft text-[#8a5a00]' },
  STABLE: { label: 'Stable', dot: 'bg-[#0ca30c]', chip: 'bg-dz-green-soft text-dz-green' },
  NO_DATA: { label: 'No orders yet', dot: 'bg-neutral-400', chip: 'bg-soft text-ink-2' },
};
export const FACTOR_LABEL: Record<Factor, string> = { SLA: 'SLA breaches', ORDER_DROP: 'Order drop', PREP_VARIANCE: 'Prep variance', CANCELLATIONS: 'Cancellations', COMPLAINTS: 'Complaints' };
export const ISSUE_LABEL: Record<Issue['kind'], string> = { PREP_DELAY: 'Prep delay', RIDER_DELAY: 'Rider delay', COMPLAINT: 'Customer complaint', ORDER_DROP: 'Order drop', CHURN_RISK: 'Churn risk' };
export const ACTIVITY_LABEL: Record<string, string> = {
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  NOTE: 'Note',
  VISIT: 'Visit',
  TEST_ORDER: 'Test order',
  PREP_CHANGED: 'Prep time changed',
  TASK_DONE: 'Task done',
  ISSUE_RESOLVED: 'Issue resolved',
  ISSUE_ESCALATED: 'Escalated to ops',
};

// ---------------------------------------------------------------------------
// Offline: last good response per screen is kept on the phone and shown when the network is gone.
// ---------------------------------------------------------------------------

const CACHE = 'dz-am-cache:';
const read = <T>(k: string): { data: T; at: string } | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE + k) ?? 'null');
  } catch {
    return null;
  }
};
const write = (k: string, data: unknown) => {
  try {
    localStorage.setItem(CACHE + k, JSON.stringify({ data, at: new Date().toISOString() }));
  } catch {
    /* storage full / private mode: just no offline copy */
  }
};
const isNetwork = (e: unknown) => !(e instanceof ApiError);

/** Fetch with a phone-side copy: offline → last synced data (and when it was synced). */
export function useAmQuery<T>(key: string, path: string, opts: { refetchInterval?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['am', key],
    queryFn: async (): Promise<{ data: T; cachedAt: string | null }> => {
      try {
        const data = await api<T>(path);
        write(key, data);
        return { data, cachedAt: null };
      } catch (e) {
        const c = read<T>(key);
        if (c && isNetwork(e)) return { data: c.data, cachedAt: c.at };
        throw e;
      }
    },
    refetchInterval: opts.refetchInterval ?? 60_000,
    enabled: opts.enabled ?? true,
    retry: (n, e) => isNetwork(e) && n < 1,
  });
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// Notes / calls logged without a network wait here and are sent when the phone is back online.
const OUTBOX = 'dz-am-outbox';
export interface OutboxItem {
  clientId: string;
  storeId: string;
  kind: 'CALL' | 'WHATSAPP' | 'NOTE' | 'VISIT';
  note?: string;
  at: string;
}
export const outbox = {
  all(): OutboxItem[] {
    try {
      return JSON.parse(localStorage.getItem(OUTBOX) ?? '[]');
    } catch {
      return [];
    }
  },
  save(items: OutboxItem[]) {
    try {
      localStorage.setItem(OUTBOX, JSON.stringify(items));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('dz-am-outbox'));
  },
};

/** Log an activity; if the network is down it is queued and synced later (same clientId, so never twice). */
export async function logActivity(item: Omit<OutboxItem, 'clientId' | 'at'>) {
  const full: OutboxItem = { ...item, clientId: crypto.randomUUID(), at: new Date().toISOString() };
  try {
    await api(`/admin/am/stores/${item.storeId}/log`, { method: 'POST', body: { kind: full.kind, note: full.note, clientId: full.clientId, at: full.at } });
    return 'sent' as const;
  } catch (e) {
    if (!isNetwork(e)) throw e;
    outbox.save([...outbox.all(), full]);
    return 'queued' as const;
  }
}

export async function flushOutbox() {
  const items = outbox.all();
  if (!items.length) return 0;
  const left: OutboxItem[] = [];
  for (const it of items) {
    try {
      await api(`/admin/am/stores/${it.storeId}/log`, { method: 'POST', body: { kind: it.kind, note: it.note, clientId: it.clientId, at: it.at } });
    } catch (e) {
      // A store that was un-assigned meanwhile can't take the note — drop it rather than retry forever.
      if (isNetwork(e)) left.push(it);
    }
  }
  outbox.save(left);
  return items.length - left.length;
}

/** Pending outbox count, kept in sync across screens; flushes when the phone comes back online. */
export function useOutbox() {
  const qc = useQueryClient();
  const online = useOnline();
  const [items, setItems] = useState(outbox.all);
  useEffect(() => {
    const upd = () => setItems(outbox.all());
    window.addEventListener('dz-am-outbox', upd);
    return () => window.removeEventListener('dz-am-outbox', upd);
  }, []);
  useEffect(() => {
    if (online && outbox.all().length) void flushOutbox().then((n) => {
        if (n) void qc.invalidateQueries({ queryKey: ['am'] });
      });
  }, [online, qc]);
  return items;
}

export const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
/** "in 12 min" / "8 min overdue". */
export function dueIn(iso: string, now = Date.now()) {
  const m = Math.round((new Date(iso).getTime() - now) / 60_000);
  const f = (x: number) => (x >= 120 ? `${Math.round(x / 60)} h` : `${x} min`);
  return m >= 0 ? { text: `in ${f(m)}`, late: false } : { text: `${f(-m)} overdue`, late: true };
}
