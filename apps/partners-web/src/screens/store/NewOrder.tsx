import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bike, Minus, Plus, Search, ShoppingBag } from 'lucide-react';
import { api, newIdempotencyKey } from '../../lib/api';
import { inr, useProducts, type Product } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import type { Order } from '../../lib/orders';
import { Field, TextInput } from '../../components/form';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { toast } from '../../components/feedback';
import { MapPicker } from '../../components/MapPicker';
import { useAddressAutofill } from '../../lib/addressAutofill';
import { useI18n } from '../../lib/i18n';
import { useStoreContext } from './StoreLayout';

type Line = { productId: string; variantId?: string; qty: number };
const lineKey = (l: Pick<Line, 'productId' | 'variantId'>) => `${l.productId}:${l.variantId ?? ''}`;

/** Phone / counter orders entered by the store. They start accepted (plan Step 10). */
export default function NewOrder({ onClose }: { onClose: () => void }) {
  const { storeId, detail } = useStoreContext();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const products = useProducts(storeId);
  const s = detail.store;
  const [f, setF] = useState({ phone: '', name: '', type: (s.supportsPickup ? 'PICKUP' : 'DELIVERY') as 'PICKUP' | 'DELIVERY', line1: '', landmark: '', pincode: s.pincode ?? '', pay: 'COD' as 'COD' | 'UPI', prep: s.defaultPrepMinutes, note: '' });
  const [q, setQ] = useState('');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  // The map fills the address fields unless staff have typed their own text since.
  const autofill = useAddressAutofill<'line1' | 'landmark' | 'pincode'>({ pincode: s.pincode ?? undefined });
  const [lines, setLines] = useState<Line[]>([]);
  const [rxSeen, setRxSeen] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const sellable = useMemo(() => (products.data?.products ?? []).filter((p) => p.status === 'AVAILABLE'), [products.data]);
  const shown = sellable.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  const byId = useMemo(() => new Map(sellable.map((p) => [p.id, p])), [sellable]);
  const priceOf = (l: Line) => {
    const p = byId.get(l.productId);
    if (!p) return 0;
    return (p.price + (p.variants.find((v) => v.id === l.variantId)?.priceDiff ?? 0)) * l.qty;
  };
  const total = lines.reduce((n, l) => n + priceOf(l), 0);
  const needsRx = s.vertical === 'PHARMACY' && lines.some((l) => byId.get(l.productId)?.prescriptionRequired);

  const bump = (productId: string, variantId: string | undefined, d: number) =>
    setLines((ls) => {
      const k = lineKey({ productId, variantId });
      const max = byId.get(productId)?.maxQtyPerOrder ?? 50;
      const hit = ls.find((l) => lineKey(l) === k);
      if (!hit) return d > 0 ? [...ls, { productId, variantId, qty: 1 }] : ls;
      return ls.map((l) => (lineKey(l) === k ? { ...l, qty: Math.min(max, l.qty + d) } : l)).filter((l) => l.qty > 0);
    });

  const save = useMutation({
    mutationFn: () =>
      api<Order>(`/partners/stores/${storeId}/orders`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: {
          customer: { phone: f.phone, name: f.name || undefined },
          fulfilmentType: f.type,
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
          paymentMode: f.pay,
          prepMinutes: f.prep,
          note: f.note || undefined,
          rxSeenByStore: needsRx ? rxSeen : undefined,
          // Until address search lands here, the map pin is the store's own location.
          address: f.type === 'DELIVERY' && pin ? { line1: f.line1, landmark: f.landmark || undefined, pincode: f.pincode, lat: pin.lat, lng: pin.lng } : undefined,
        },
      }),
    onSuccess: (o) => {
      void qc.invalidateQueries({ queryKey: ['orders', storeId] });
      toast.success(t('no.created', { no: o.orderNumber }));
      onClose();
      navigate(`/stores/${storeId}/orders/${o.orderNumber}`);
    },
  });

  const phoneOk = f.phone.replace(/\D/g, '').length >= 10;
  const addressOk = f.type === 'PICKUP' || (!!pin && f.line1.trim().length >= 3 && /^\d{6}$/.test(f.pincode));

  return (
    <Modal title={t('ord.newOrder')} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('no.mobile')}><TextInput inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98450 12345" /></Field>
          <Field label={t('no.name')}><TextInput value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['PICKUP', 'DELIVERY'] as const).map((ft) => (
            <button key={ft} type="button" disabled={ft === 'PICKUP' ? !s.supportsPickup : !s.supportsDelivery} onClick={() => set('type', ft)} className={`flex h-11 items-center gap-2 rounded-xl border-[1.5px] px-3 text-sm font-semibold disabled:opacity-40 ${f.type === ft ? 'border-black bg-dz-yellow-soft' : 'border-line'}`}>
              {ft === 'PICKUP' ? <ShoppingBag className="h-4 w-4" /> : <Bike className="h-4 w-4" />} {ft === 'PICKUP' ? t('no.picksUp') : t('ord.delivery')}
            </button>
          ))}
        </div>
        {f.type === 'DELIVERY' && (
          <MapPicker
            lat={pin?.lat ?? null}
            lng={pin?.lng ?? null}
            fallbackCenter={[s.lat ?? 12.9716, s.lng ?? 77.5946]}
            height="h-56"
            placeholder={t('no.searchAddress')}
            hint={t('no.pinHint')}
            onChange={(lat, lng) => setPin({ lat, lng })}
            onAddress={(r) => setF((x) => autofill(x, { line1: r.line1, landmark: r.landmark, pincode: r.pincode && /^\d{6}$/.test(r.pincode) ? r.pincode : null }))}
          />
        )}
        {f.type === 'DELIVERY' && (
          <div className="grid gap-3 sm:grid-cols-[2fr_1.4fr_1fr]">
            <Field label={t('no.address')}><TextInput value={f.line1} onChange={(e) => set('line1', e.target.value)} placeholder={t('no.addressPh')} /></Field>
            <Field label={t('no.landmark')}><TextInput value={f.landmark} onChange={(e) => set('landmark', e.target.value)} /></Field>
            <Field label={t('no.pincode')}><TextInput inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} /></Field>
          </div>
        )}

        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <TextInput className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('no.searchItems', { n: sellable.length })} aria-label={t('no.searchItemsAria')} />
          </div>
          <ul className="mt-2 max-h-64 divide-y divide-line overflow-auto rounded-xl border border-line">
            {products.isLoading && <li className="p-3 text-sm text-ink-3">{t('no.loadingMenu')}</li>}
            {!products.isLoading && shown.length === 0 && <li className="p-3 text-sm text-ink-3">{t('no.noMatch')}</li>}
            {shown.map((p) => <PickerRow key={p.id} p={p} lines={lines} bump={bump} />)}
          </ul>
        </div>

        {lines.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-soft p-3 text-sm">
            {lines.map((l) => {
              const p = byId.get(l.productId);
              const v = p?.variants.find((x) => x.id === l.variantId);
              return (
                <li key={lineKey(l)} className="flex justify-between gap-2">
                  <span>{l.qty} × {p?.name}{v ? ` (${v.name})` : ''}</span>
                  <b className="tabular-nums">{inr(priceOf(l))}</b>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('no.note')}><TextInput value={f.note} maxLength={300} onChange={(e) => set('note', e.target.value)} placeholder={t('no.notePh')} /></Field>
          <Field label={t('no.readyIn')}>
            <TextInput inputMode="numeric" value={String(f.prep)} onChange={(e) => set('prep', Math.min(120, Number(e.target.value.replace(/\D/g, '')) || 0))} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex gap-2">
            {(['COD', 'UPI'] as const).map((m) => (
              <button key={m} type="button" onClick={() => set('pay', m)} className={`rounded-lg border-[1.5px] px-3 py-1.5 text-sm font-bold ${f.pay === m ? 'border-black bg-black text-white' : 'border-line'}`}>{m === 'COD' ? t('ord.cash') : t('no.paidUpi')}</button>
            ))}
          </div>
          <span className="text-right"><b className="text-lg">{inr(total)}</b>{f.type === 'DELIVERY' && <span className="block text-xs text-ink-3">{t('no.plusDelivery')}</span>}</span>
        </div>
        {needsRx && (
          <label className="flex items-start gap-2 rounded-xl bg-dz-red-soft p-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={rxSeen} onChange={(e) => setRxSeen(e.target.checked)} />
            {t('rx.counterCheck')}
          </label>
        )}
        {save.error && <ErrorText>{errorMessageOf(save.error)}</ErrorText>}
        <Button className="w-full" disabled={save.isPending || !phoneOk || !addressOk || !lines.length || f.prep < 5 || (needsRx && !rxSeen)} onClick={() => save.mutate()}>
          {save.isPending ? t('no.creating') : t('no.create')}
        </Button>
      </div>
    </Modal>
  );
}

function PickerRow({ p, lines, bump }: { p: Product; lines: Line[]; bump: (productId: string, variantId: string | undefined, d: number) => void }) {
  const { t } = useI18n();
  const [variantId, setVariantId] = useState(p.variants.find((v) => v.isDefault)?.id ?? p.variants[0]?.id);
  const qty = lines.find((l) => lineKey(l) === lineKey({ productId: p.id, variantId }))?.qty ?? 0;
  const price = p.price + (p.variants.find((v) => v.id === variantId)?.priceDiff ?? 0);
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {p.isVeg != null && <span className={`grid h-4 w-4 shrink-0 place-items-center border-[1.5px] ${p.isVeg ? 'border-dz-green' : 'border-dz-red'}`} aria-label={p.isVeg ? 'Veg' : 'Non-veg'}><span className={`h-2 w-2 rounded-full ${p.isVeg ? 'bg-dz-green' : 'bg-dz-red'}`} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{p.name}{p.prescriptionRequired && <b className="ml-1 text-dz-red">Rx</b>}</span>
        <span className="text-xs text-ink-3">{inr(price)}{p.inventory?.available != null && ` · ${p.inventory.available} in stock`}</span>
      </span>
      {p.variants.length > 1 && (
        <select className="h-9 rounded-lg border border-line bg-white px-2 text-sm" value={variantId} onChange={(e) => setVariantId(e.target.value)} aria-label={t('no.sizeAria', { name: p.name })}>
          {p.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      {qty === 0 ? (
        <button type="button" onClick={() => bump(p.id, variantId, 1)} className="h-9 rounded-lg border-[1.5px] border-black px-3 text-sm font-extrabold" aria-label={t('no.addAria', { name: p.name })}>{t('no.add')}</button>
      ) : (
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => bump(p.id, variantId, -1)} className="grid h-9 w-9 place-items-center rounded-lg border-[1.5px] border-line" aria-label={t('no.lessAria', { name: p.name })}><Minus className="h-4 w-4" /></button>
          <b className="w-6 text-center tabular-nums">{qty}</b>
          <button type="button" onClick={() => bump(p.id, variantId, 1)} className="grid h-9 w-9 place-items-center rounded-lg border-[1.5px] border-black" aria-label={t('no.moreAria', { name: p.name })}><Plus className="h-4 w-4" /></button>
        </span>
      )}
    </li>
  );
}
