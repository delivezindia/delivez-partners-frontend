import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useCart, type CartLine } from './cart';
import { useDeliverTo } from './location';
import type { CustomerOrder } from './orders';
import type { Menu } from './types';

/** What changed since the last order; shown once on the basket / lab booking page. */
export interface ReorderNote {
  added: number;
  /** Not on the shop's menu any more, or out of stock today. */
  missing: string[];
  /** Fewer than last time (stock), or an option that's gone. */
  changed: string[];
}

/**
 * Rebuilds a past order from the shop's menu as it is now: today's prices, current stock, same sizes and add-ons
 * where they still exist. The basket's quote re-checks everything on the server before payment.
 */
export function rebuild(order: CustomerOrder, menu: Menu): { lines: { line: Omit<CartLine, 'key' | 'qty'>; qty: number }[]; note: ReorderNote } {
  const products = new Map(menu.products.map((p) => [p.id, p]));
  const lines: { line: Omit<CartLine, 'key' | 'qty'>; qty: number }[] = [];
  const missing: string[] = [];
  const changed: string[] = [];
  for (const item of order.items) {
    const qty = item.qty - item.returnedQty;
    // Items the shop ran out of last time are tried again: the customer still wanted them.
    if (qty <= 0) continue;
    const p = products.get(item.productId);
    if (!p || !p.available || p.maxQty < 1) {
      missing.push(item.name);
      continue;
    }
    const variant = (item.variant ? p.variants.find((v) => v.name === item.variant) : null) ?? p.variants.find((v) => v.isDefault) ?? null;
    const allAddons = p.addonGroups.flatMap((g) => g.addons);
    const addons = item.addons.map((a) => allAddons.find((x) => x.name === a.name)).filter((a) => !!a);
    const optionLost = (!!item.variant && variant?.name !== item.variant) || addons.length < item.addons.length;
    const n = Math.min(qty, p.maxQty);
    if (optionLost || n < qty) changed.push(item.name);
    lines.push({
      qty: n,
      line: {
        productId: p.id,
        variantId: variant?.id ?? null,
        addonIds: addons.map((a) => a.id),
        name: p.name,
        options: [p.variants.length > 1 ? variant?.name : null, ...addons.map((a) => a.name)].filter(Boolean).join(' · '),
        unitPrice: p.price + (variant?.priceDiff ?? 0) + addons.reduce((s, a) => s + a.price, 0),
        maxQty: p.maxQty,
        isVeg: p.isVeg,
        isRx: p.prescriptionRequired,
      },
    });
  }
  return { lines, note: { added: lines.length, missing, changed } };
}

/** One tap: replace the basket with a past order and open checkout (or the lab booking page). */
export function useReorder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const at = useDeliverTo((s) => s.at);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function run(order: CustomerOrder) {
    setBusy(order.id);
    setFailed(null);
    try {
      const idOrSlug = order.store.slug ?? order.store.id;
      const menu = await qc.fetchQuery({
        queryKey: ['menu', idOrSlug, at?.lat, at?.lng],
        queryFn: () => api<Menu>(`/local/stores/${encodeURIComponent(idOrSlug)}${at ? `?lat=${at.lat}&lng=${at.lng}` : ''}`),
        staleTime: 0,
      });
      const { lines, note } = rebuild(order, menu);
      if (!lines.length) {
        // Nothing left to add: show the shop so the customer can pick something else.
        navigate(`/s/${idOrSlug}`, { state: { reorder: note } });
        return;
      }
      const cart = useCart.getState();
      cart.clear();
      for (const l of lines) cart.add(menu.store, l.line, l.qty);
      navigate(menu.store.vertical === 'DIAGNOSTICS' ? '/book-lab' : '/cart', { state: { reorder: note } });
    } catch {
      setFailed(order.id);
    } finally {
      setBusy(null);
    }
  }

  return { run, busy, failed };
}
