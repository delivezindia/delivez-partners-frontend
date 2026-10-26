import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button, QtyStepper, VegMark } from './ui';
import type { CartLine } from '../lib/cart';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import type { Product } from '../lib/types';

/** Size and add-on choices for one product, then "Add · ₹…". */
export function ProductSheet({ product: p, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (line: Omit<CartLine, 'key' | 'qty'>, qty: number) => void }) {
  const { t } = useI18n();
  const [variantId, setVariantId] = useState<string | null>((p.variants.find((v) => v.isDefault) ?? p.variants[0])?.id ?? null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  const variant = p.variants.find((v) => v.id === variantId) ?? null;
  const addons = p.addonGroups.flatMap((g) => g.addons.filter((a) => picked[g.id]?.includes(a.id)));
  const unitPrice = p.price + (variant?.priceDiff ?? 0) + addons.reduce((n, a) => n + a.price, 0);
  // Groups that still need a choice (e.g. "Pick 1 base").
  const missing = useMemo(() => p.addonGroups.filter((g) => (picked[g.id]?.length ?? 0) < g.minSelect), [p.addonGroups, picked]);

  function toggle(groupId: string, addonId: string, max: number) {
    setPicked((s) => {
      const cur = s[groupId] ?? [];
      if (cur.includes(addonId)) return { ...s, [groupId]: cur.filter((x) => x !== addonId) };
      // Single choice swaps; multi choice stops at the limit.
      if (max === 1) return { ...s, [groupId]: [addonId] };
      return cur.length >= max ? s : { ...s, [groupId]: [...cur, addonId] };
    });
  }

  return (
    <Modal title={p.name} onClose={onClose}>
      {p.imageUrl && <img src={p.imageUrl} alt="" className="-mt-1 mb-3 h-44 w-full rounded-xl object-cover" />}
      {p.description && <p className="text-sm text-ink-2">{p.description}</p>}

      {p.variants.length > 1 && (
        <fieldset className="mt-4">
          <legend className="font-extrabold">{t('lc.opt.size')}</legend>
          <div className="mt-2 space-y-1.5">
            {p.variants.map((v) => (
              <label key={v.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 ${variantId === v.id ? 'border-black' : 'border-line'}`}>
                <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="accent-dz-red" />
                <span className="flex-1">{v.name}</span>
                <span className="text-sm font-semibold">{rupees(p.price + v.priceDiff)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {p.addonGroups
        .filter((g) => g.addons.length)
        .map((g) => {
          const max = Math.max(1, g.maxSelect || g.addons.length);
          return (
            <fieldset key={g.id} className="mt-4">
              <legend className="flex w-full items-baseline justify-between gap-2">
                <b className="font-extrabold">{g.name}</b>
                <span className="text-xs text-ink-3">{g.minSelect > 0 ? t('lc.opt.required', { n: g.minSelect }) : t('lc.opt.upTo', { n: max })}</span>
              </legend>
              <div className="mt-2 space-y-1.5">
                {g.addons.map((a) => {
                  const on = picked[g.id]?.includes(a.id) ?? false;
                  return (
                    <label key={a.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 ${on ? 'border-black' : 'border-line'}`}>
                      <input type={max === 1 ? 'radio' : 'checkbox'} name={g.id} checked={on} onChange={() => toggle(g.id, a.id, max)} onClick={() => max === 1 && on && toggle(g.id, a.id, max)} className="accent-dz-red" />
                      <VegMark veg={a.isVeg} label={a.isVeg ? t('lc.veg') : t('lc.nonVeg')} />
                      <span className="flex-1">{a.name}</span>
                      {a.price > 0 && <span className="text-sm font-semibold">+{rupees(a.price)}</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

      <div className="sticky bottom-0 -mx-6 -mb-6 mt-5 flex items-center gap-3 border-t border-line bg-white px-6 py-4">
        <QtyStepper qty={qty} max={p.maxQty} onChange={(n) => setQty(Math.max(1, n))} label={p.name} />
        <Button
          className="flex-1"
          disabled={missing.length > 0}
          onClick={() =>
            onAdd(
              {
                productId: p.id,
                variantId,
                addonIds: addons.map((a) => a.id),
                name: p.name,
                options: [p.variants.length > 1 ? variant?.name : null, ...addons.map((a) => a.name)].filter(Boolean).join(' · '),
                unitPrice,
                maxQty: p.maxQty,
                isVeg: p.isVeg,
                isRx: p.prescriptionRequired,
              },
              qty,
            )
          }
        >
          {missing.length ? t('lc.opt.choose', { group: missing[0].name }) : t('lc.opt.add', { total: rupees(unitPrice * qty) })}
        </Button>
      </div>
    </Modal>
  );
}
