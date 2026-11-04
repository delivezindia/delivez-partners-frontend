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

/** The shop-list page that isn't one kind of shop: Rush (street carts and society vendors). */
export type ShopPage = 'RUSH';
export const SHOP_PAGES: ShopPage[] = ['RUSH'];
export const PAGE_LABEL: Record<ShopPage, MsgKey> = { RUSH: 'lc.v.RUSH' };
/** Label for a kind of shop or one of those pages. */
export const KIND_LABEL: Record<Vertical | ShopPage, MsgKey> = { ...VERTICAL_LABEL, ...PAGE_LABEL };
