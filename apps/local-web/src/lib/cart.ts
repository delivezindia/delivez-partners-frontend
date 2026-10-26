import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Menu, Product } from './types';

/** One line in the basket. The same dish with different options is a separate line. */
export interface CartLine {
  key: string;
  productId: string;
  variantId: string | null;
  addonIds: string[];
  name: string;
  /** e.g. "Large · Extra cheese" */
  options: string;
  /** Price of one, options included (paise). */
  unitPrice: number;
  qty: number;
  maxQty: number;
  isVeg: boolean | null;
  isRx: boolean;
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  lines: CartLine[];
  add: (store: Menu['store'], line: Omit<CartLine, 'key' | 'qty'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

export const lineKey = (productId: string, variantId: string | null, addonIds: string[]) => [productId, variantId ?? '-', ...[...addonIds].sort()].join('|');

/** The basket holds one shop at a time (a different shop asks to start over). Kept on this device. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      storeId: null,
      storeName: null,
      storeSlug: null,
      lines: [],
      add: (store, line, qty = 1) =>
        set((s) => {
          const key = lineKey(line.productId, line.variantId, line.addonIds);
          const base = s.storeId === store.id ? s.lines : [];
          const found = base.find((l) => l.key === key);
          const lines = found
            ? base.map((l) => (l.key === key ? { ...l, qty: Math.min(l.maxQty, l.qty + qty) } : l))
            : [...base, { ...line, key, qty: Math.min(line.maxQty, qty) }];
          return { storeId: store.id, storeName: store.name, storeSlug: store.slug, lines };
        }),
      setQty: (key, qty) =>
        set((s) => {
          const lines = qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(l.maxQty, qty) } : l));
          return lines.length ? { lines } : { lines, storeId: null, storeName: null, storeSlug: null };
        }),
      clear: () => set({ storeId: null, storeName: null, storeSlug: null, lines: [] }),
    }),
    { name: 'dz-local-cart', storage: createJSONStorage(() => localStorage) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);

/** Plain add (no options): the product's default variant and no add-ons. */
export function simpleLine(p: Product): Omit<CartLine, 'key' | 'qty'> {
  const v = p.variants.find((x) => x.isDefault) ?? null;
  return {
    productId: p.id,
    variantId: v?.id ?? null,
    addonIds: [],
    name: p.name,
    options: p.variants.length > 1 && v ? v.name : '',
    unitPrice: p.price + (v?.priceDiff ?? 0),
    maxQty: p.maxQty,
    isVeg: p.isVeg,
    isRx: p.prescriptionRequired,
  };
}

/** Products with a choice to make open the options sheet instead of adding straight away. */
export const needsOptions = (p: Product) => p.variants.length > 1 || p.addonGroups.some((g) => g.addons.length > 0);
