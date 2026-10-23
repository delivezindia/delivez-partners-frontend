import { useQuery } from '@tanstack/react-query';
import { api, newIdempotencyKey } from './api';
import type { MsgKey } from './i18n';

export type LabStatus = 'BOOKED' | 'RX_REVIEW' | 'CONFIRMED' | 'COLLECTOR_ASSIGNED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'REPORT_READY' | 'CANCELLED' | 'REJECTED';
export type BookingTab = 'TO_CONFIRM' | 'UPCOMING' | 'IN_LAB' | 'REPORTS' | 'CANCELLED';

export interface LabBooking {
  id: string;
  bookingNumber: string;
  status: LabStatus;
  channel: string;
  collectionType: 'HOME' | 'WALK_IN';
  slotStart: string;
  slotMinutes: number;
  isTestBooking: boolean;
  patient: { name: string; age: number | null; gender: string | null };
  customerPhone: string;
  address: { line1?: string; landmark?: string; pincode?: string; lat?: number; lng?: number } | null;
  distanceKm: number | null;
  note: string | null;
  tests: { id: string; name: string; price: number; isRx: boolean; sampleType: string | null; fastingHours: number | null; reportHours: number | null }[];
  fastingHours: number;
  totals: { tests: number; collectionFee: number; grandTotal: number; refund: number };
  payment: { mode: string; status: string; collectCash: number };
  rx: { required: true; seenByStore: boolean; prescription: { id: string; status: string; files: number; doctorName: string | null; doctorRegNo: string | null; notes: string | null; rejectionReason: string | null } | null } | null;
  collector: { name: string; phone: string; assignedAt: string } | null;
  reports: { id: string; version: number; summary: string | null; amendReason: string | null; pathologist: { name: string; qualification: string; registrationNo: string }; superseded: boolean; releasedAt: string }[];
  times: Record<string, string | null>;
  cancelReason: string | null;
  timeline?: { from: LabStatus | null; to: LabStatus; actorType: string; reason: string | null; meta: Record<string, unknown> | null; at: string }[];
}

export const TABS: { key: BookingTab; t: MsgKey; states: LabStatus[] }[] = [
  { key: 'TO_CONFIRM', t: 'lb.tab.TO_CONFIRM', states: ['BOOKED', 'RX_REVIEW'] },
  { key: 'UPCOMING', t: 'lb.tab.UPCOMING', states: ['CONFIRMED', 'COLLECTOR_ASSIGNED'] },
  { key: 'IN_LAB', t: 'lb.tab.IN_LAB', states: ['SAMPLE_COLLECTED', 'PROCESSING'] },
  { key: 'REPORTS', t: 'lb.tab.REPORTS', states: ['REPORT_READY'] },
  { key: 'CANCELLED', t: 'lb.tab.CANCELLED', states: ['CANCELLED', 'REJECTED'] },
];

export const STATUS: Record<LabStatus, { t: MsgKey; cls: string }> = {
  BOOKED: { t: 'lb.st.BOOKED', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink' },
  RX_REVIEW: { t: 'lb.st.RX_REVIEW', cls: 'border-dz-red bg-dz-red-soft text-dz-red' },
  CONFIRMED: { t: 'lb.st.CONFIRMED', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
  COLLECTOR_ASSIGNED: { t: 'lb.st.COLLECTOR_ASSIGNED', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
  SAMPLE_COLLECTED: { t: 'lb.st.SAMPLE_COLLECTED', cls: 'border-teal-600 bg-teal-50 text-teal-800' },
  PROCESSING: { t: 'lb.st.PROCESSING', cls: 'border-teal-600 bg-teal-50 text-teal-800' },
  REPORT_READY: { t: 'lb.st.REPORT_READY', cls: 'border-dz-green bg-dz-green-soft text-dz-green' },
  CANCELLED: { t: 'lb.st.CANCELLED', cls: 'border-line bg-soft text-ink-3' },
  REJECTED: { t: 'lb.st.REJECTED', cls: 'border-line bg-soft text-ink-3' },
};

export const useLabBookings = (storeId: string, tab: BookingTab, enabled = true) =>
  useQuery({
    queryKey: ['lab-bookings', storeId, tab],
    queryFn: () => api<{ bookings: LabBooking[]; counts: Record<'TO_CONFIRM' | 'UPCOMING' | 'IN_LAB', number> }>(`/partners/stores/${storeId}/lab-bookings?tab=${tab}`),
    refetchInterval: 30_000,
    enabled,
  });

export const useLabBooking = (storeId: string, id: string | null) =>
  useQuery({ queryKey: ['lab-booking', storeId, id], queryFn: () => api<LabBooking>(`/partners/stores/${storeId}/lab-bookings/${id}`), enabled: !!id });

/** POST an action on a booking with a fresh idempotency key. */
export const labAction = (storeId: string, id: string, action: string, body: unknown = {}) =>
  api<LabBooking>(`/partners/stores/${storeId}/lab-bookings/${id}/${action}`, { method: 'POST', body, idempotencyKey: newIdempotencyKey() });

/** Opens a short-lived, logged link to a report or prescription in a new tab. */
export async function openHealthFile(path: string) {
  const win = window.open('', '_blank');
  try {
    const r = await api<{ url?: string; files?: { url: string }[] }>(path);
    const url = r.url ?? r.files?.[0]?.url;
    if (win && url) win.location.href = url;
    else win?.close();
  } catch (e) {
    win?.close();
    throw e;
  }
}

export const slotLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
