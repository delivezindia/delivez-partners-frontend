import type { MsgKey } from './i18n';
import type { AddressLabel, Vertical } from './types';

export const VERTICAL_LABEL: Record<Vertical, MsgKey> = {
  EAT: 'lc.v.EAT',
  GROCERY: 'lc.v.GROCERY',
  PHARMACY: 'lc.v.PHARMACY',
  DIAGNOSTICS: 'lc.v.DIAGNOSTICS',
  LOCAL_STORES: 'lc.v.LOCAL_STORES',
};

export const ADDRESS_LABEL: Record<AddressLabel, MsgKey> = {
  HOME: 'lc.addr.HOME',
  WORK: 'lc.addr.WORK',
  OTHER: 'lc.addr.OTHER',
};

/**
 * Pages that aren't one kind of shop: Street Cart (street and society vendors) and Rush (Delivez's own quick-commerce
 * stores, stocked from Delivez warehouses; coming soon).
 */
export type ShopPage = 'STREET' | 'RUSH';
export const SHOP_PAGES: ShopPage[] = ['STREET', 'RUSH'];
export const PAGE_LABEL: Record<ShopPage, MsgKey> = { STREET: 'lc.v.STREET', RUSH: 'lc.v.RUSH' };
/** Label for a kind of shop or one of those pages. */
export const KIND_LABEL: Record<Vertical | ShopPage, MsgKey> = { ...VERTICAL_LABEL, ...PAGE_LABEL };
