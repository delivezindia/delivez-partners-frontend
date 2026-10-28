import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { MsgKey } from './i18n';

export const TICKET_CATEGORIES = ['ORDER_ISSUE', 'MISSING_ITEM', 'PAYMENT_REFUND', 'MEDICINE', 'LAB_BOOKING', 'ACCOUNT', 'OTHER'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED';

export interface Ticket {
  id: string;
  number: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  order: { id: string; orderNumber: string } | null;
  store: { name: string } | null;
  createdAt: string;
  lastMessageAt: string;
  lastFromAdmin: boolean;
  messages: number;
  thread?: { id: string; body: string; fromAdmin: boolean; author: string; at: string }[];
}

export const CATEGORY_LABEL: Record<TicketCategory, MsgKey> = {
  ORDER_ISSUE: 'lc.help.c.ORDER_ISSUE',
  MISSING_ITEM: 'lc.help.c.MISSING_ITEM',
  PAYMENT_REFUND: 'lc.help.c.PAYMENT_REFUND',
  MEDICINE: 'lc.help.c.MEDICINE',
  LAB_BOOKING: 'lc.help.c.LAB_BOOKING',
  ACCOUNT: 'lc.help.c.ACCOUNT',
  OTHER: 'lc.help.c.OTHER',
};

export const TICKET_STATUS: Record<TicketStatus, MsgKey> = {
  OPEN: 'lc.help.s.OPEN',
  IN_PROGRESS: 'lc.help.s.OPEN',
  WAITING_ON_USER: 'lc.help.s.WAITING_ON_USER',
  RESOLVED: 'lc.help.s.RESOLVED',
  CLOSED: 'lc.help.s.RESOLVED',
};

export function useTickets() {
  return useQuery({ queryKey: ['tickets'], queryFn: () => api<{ tickets: Ticket[] }>('/local/support') });
}

/** Refreshes every 15 s so support's answer shows up without reloading. */
export function useTicket(id: string) {
  return useQuery({ queryKey: ['ticket', id], queryFn: () => api<Ticket>(`/local/support/${encodeURIComponent(id)}`), refetchInterval: 15_000 });
}
