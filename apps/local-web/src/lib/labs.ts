import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useLiveRoom } from './live';
import type { MsgKey } from './i18n';

export type LabStatus = 'BOOKED' | 'RX_REVIEW' | 'CONFIRMED' | 'COLLECTOR_ASSIGNED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'REPORT_READY' | 'CANCELLED' | 'REJECTED';
export type CollectionType = 'HOME' | 'WALK_IN';

/** GET /v1/local/lab-bookings/:id — the patient's view (includes their booking code). */
export interface LabBooking {
  id: string;
  bookingNumber: string;
  status: LabStatus;
  active: boolean;
  collectionType: CollectionType;
  slotStart: string;
  slotMinutes: number;
  lab: { id: string; name: string; slug: string | null; phone: string | null; address: string | null };
  patient: { name: string; age: number | null; gender: 'F' | 'M' | 'O' | null };
  address: string | null;
  tests: { id: string; name: string; price: number; sampleType: string | null; fastingHours: number | null; reportHours: number | null }[];
  fastingHours: number;
  totals: { tests: number; collectionFee: number; grandTotal: number };
  payment: { mode: string; status: string };
  code: string | null;
  collector: { name: string; phone: string | null } | null;
  rx: { status: string | null; rejectionReason: string | null } | null;
  reports: { id: string; version: number; summary: string | null; releasedAt: string }[];
  canCancel: boolean;
  cancelReason: string | null;
  createdAt: string;
  timeline?: { status: LabStatus; at: string }[];
}

export interface SlotDay {
  date: string;
  offered: boolean;
  slots: { start: string; left: number; available: boolean }[];
}

export const LAB_STATUS: Record<LabStatus, MsgKey> = {
  BOOKED: 'lc.lb.s.BOOKED',
  RX_REVIEW: 'lc.lb.s.RX_REVIEW',
  CONFIRMED: 'lc.lb.s.CONFIRMED',
  COLLECTOR_ASSIGNED: 'lc.lb.s.COLLECTOR_ASSIGNED',
  SAMPLE_COLLECTED: 'lc.lb.s.SAMPLE_COLLECTED',
  PROCESSING: 'lc.lb.s.PROCESSING',
  REPORT_READY: 'lc.lb.s.REPORT_READY',
  CANCELLED: 'lc.lb.s.CANCELLED',
  REJECTED: 'lc.lb.s.REJECTED',
};

/** Progress steps on the booking screen. */
export const LAB_STEPS: { key: MsgKey; states: LabStatus[] }[] = [
  { key: 'lc.lb.step.booked', states: ['BOOKED', 'RX_REVIEW'] },
  { key: 'lc.lb.step.confirmed', states: ['CONFIRMED', 'COLLECTOR_ASSIGNED'] },
  { key: 'lc.lb.step.collected', states: ['SAMPLE_COLLECTED', 'PROCESSING'] },
  { key: 'lc.lb.step.report', states: ['REPORT_READY'] },
];

/** The next 7 days (IST) as YYYY-MM-DD. */
export function nextDays(n = 7) {
  const base = Date.now() + 5.5 * 3600_000;
  return Array.from({ length: n }, (_, i) => new Date(base + i * 86_400_000).toISOString().slice(0, 10));
}

export function useLabSlots(store: string | null, date: string, type: CollectionType) {
  return useQuery({
    queryKey: ['lab-slots', store, date, type],
    queryFn: () => api<SlotDay>(`/local/stores/${encodeURIComponent(store!)}/lab-slots?date=${date}&type=${type}`),
    enabled: !!store,
    staleTime: 20_000,
  });
}

export function useLabBooking(id: string) {
  // Read by refetchInterval, so it is set before the query runs (the socket state comes after).
  const live = useRef(false);
  const q = useQuery({
    queryKey: ['lab-booking', id],
    queryFn: () => api<LabBooking>(`/local/lab-bookings/${encodeURIComponent(id)}`),
    refetchInterval: (q) => (q.state.data && !q.state.data.active ? false : live.current ? 60_000 : 15_000),
  });
  const bookingId = q.data?.active ? q.data.id : null;
  live.current = useLiveRoom(bookingId && `booking:${bookingId}`, ['lab-booking', id]);
  return q;
}

export function useLabBookings() {
  return useQuery({ queryKey: ['lab-bookings'], queryFn: () => api<{ bookings: LabBooking[] }>('/local/lab-bookings') });
}
