import { useQuery } from '@tanstack/react-query';
import { api, newIdempotencyKey } from './api';
import type { MsgKey } from './i18n';
import type { Order } from './orders';

export interface Shift {
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
}

export interface Pharmacist {
  id: string;
  name: string;
  registrationNo: string;
  stateCouncil: string;
  consented: boolean;
  login: { userId: string; name: string } | null;
  isMe: boolean;
  shifts: Shift[];
  duty: { onDuty: boolean; source: 'MANUAL' | 'SHIFT' | 'OFF'; nextShift: string | null };
  override: { on: boolean; until: string } | null;
}

export interface PharmacyTeam {
  rxOpen: boolean;
  canManage: boolean;
  pharmacists: Pharmacist[];
  members: { userId: string; name: string; role: string }[];
}

export const usePharmacists = (storeId: string, enabled = true) =>
  useQuery({ queryKey: ['pharmacists', storeId], queryFn: () => api<PharmacyTeam>(`/partners/stores/${storeId}/pharmacists`), refetchInterval: 60_000, enabled });

const base = (storeId: string) => `/partners/stores/${storeId}`;
export const pharmacyApi = {
  add: (storeId: string, body: { name: string; registrationNo: string; stateCouncil: string; shifts: Shift[]; consent: true }) => api<PharmacyTeam>(`${base(storeId)}/pharmacists`, { method: 'POST', body }),
  shifts: (storeId: string, id: string, shifts: Shift[]) => api<PharmacyTeam>(`${base(storeId)}/pharmacists/${id}/shifts`, { method: 'PUT', body: { shifts } }),
  duty: (storeId: string, id: string, mode: 'ON' | 'OFF' | 'SHIFTS') => api<PharmacyTeam>(`${base(storeId)}/pharmacists/${id}/duty`, { method: 'POST', body: { mode } }),
  login: (storeId: string, id: string, userId: string | null) => api<PharmacyTeam>(`${base(storeId)}/pharmacists/${id}/login`, { method: 'PUT', body: { userId } }),
  remove: (storeId: string, id: string) => api<PharmacyTeam>(`${base(storeId)}/pharmacists/${id}`, { method: 'DELETE' }),
  approve: (storeId: string, orderId: string, body: { pharmacistId?: string; doctorName: string; doctorRegNo: string; issuedOn: string; patientName?: string; notes?: string; attest: true }) =>
    api<Order>(`${base(storeId)}/orders/${orderId}/rx-approve`, { method: 'POST', body, idempotencyKey: newIdempotencyKey() }),
  reject: (storeId: string, orderId: string, body: { reason: RxRejectReason; note?: string; pharmacistId?: string }) =>
    api<Order>(`${base(storeId)}/orders/${orderId}/rx-reject`, { method: 'POST', body, idempotencyKey: newIdempotencyKey() }),
  files: (storeId: string, orderId: string) => api<{ files: { url: string; contentType: string }[]; expiresIn: number }>(`${base(storeId)}/orders/${orderId}/prescription`),
};

export type RxRejectReason = 'UNREADABLE' | 'INCOMPLETE' | 'TOO_OLD' | 'NOT_PRESCRIBED' | 'PATIENT_MISMATCH' | 'OTHER';
export const RX_REJECT_REASONS: { value: RxRejectReason; t: MsgKey }[] = [
  { value: 'UNREADABLE', t: 'rx.rr.UNREADABLE' },
  { value: 'INCOMPLETE', t: 'rx.rr.INCOMPLETE' },
  { value: 'TOO_OLD', t: 'rx.rr.TOO_OLD' },
  { value: 'NOT_PRESCRIBED', t: 'rx.rr.NOT_PRESCRIBED' },
  { value: 'PATIENT_MISMATCH', t: 'rx.rr.PATIENT_MISMATCH' },
  { value: 'OTHER', t: 'rx.rr.OTHER' },
];

/** Today in India as YYYY-MM-DD (prescription dates are Indian calendar dates). */
export const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const istClock = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** Today's shift for a pharmacist, e.g. "08:00–22:00". */
export function todaysShift(p: Pharmacist) {
  const day = new Date(Date.now() + 5.5 * 3600_000).getUTCDay();
  const s = p.shifts.find((x) => x.dayOfWeek === day);
  return s ? `${s.startsAt}–${s.endsAt}` : null;
}
