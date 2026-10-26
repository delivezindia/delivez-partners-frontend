import type { MsgKey } from './i18n';
import type { AddressLabel, Vertical } from './types';

export const VERTICAL_LABEL: Record<Vertical, MsgKey> = {
  EAT: 'lc.v.EAT',
  GROCERY: 'lc.v.GROCERY',
  PHARMACY: 'lc.v.PHARMACY',
  DIAGNOSTICS: 'lc.v.DIAGNOSTICS',
  LOCAL_STORES: 'lc.v.LOCAL_STORES',
};

export const VERTICAL_EMOJI: Record<Vertical, string> = {
  EAT: '🍛',
  GROCERY: '🛒',
  PHARMACY: '💊',
  DIAGNOSTICS: '🧪',
  LOCAL_STORES: '🏪',
};

export const ADDRESS_LABEL: Record<AddressLabel, MsgKey> = {
  HOME: 'lc.addr.HOME',
  WORK: 'lc.addr.WORK',
  OTHER: 'lc.addr.OTHER',
};
