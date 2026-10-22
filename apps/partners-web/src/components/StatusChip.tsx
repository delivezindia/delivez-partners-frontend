import type { OpenState, StoreStatus } from '../lib/types';

const STATUS_STYLE: Record<StoreStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  LIVE: 'bg-green-100 text-green-800',
  LIMITED: 'bg-yellow-100 text-yellow-800',
  PAUSED: 'bg-orange-100 text-orange-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-neutral-100 text-neutral-500',
};

export function StoreStatusChip({ status }: { status: StoreStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export const OPEN_STATE_DOT: Record<OpenState, string> = {
  OPEN: 'bg-state-ready',
  BUSY: 'bg-state-almost',
  CLOSED: 'bg-neutral-400',
};
