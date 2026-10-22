import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { apiUrl } from '../lib/config';
import { inr, toPaise, toRupees, uploadProductImage, type AddonGroup, type Category, type Product, type Variant } from '../lib/catalog';
import { errorMessageOf, fieldErrorsOf } from '../lib/onboarding';
import { Card, Chips, Field, Select, TextArea, TextInput, Toggle } from './form';
import { Modal } from './Modal';
import { Button, ErrorText } from './ui';
import { toast } from './feedback';
import { SAMPLE_TYPES } from '../screens/onboarding/steps/LabSteps';

type Vertical = 'EAT' | 'GROCERY' | 'PHARMACY' | 'LOCAL_STORES' | string;
const UNITS = ['piece', 'plate', 'kg', 'g', 'litre', 'ml', 'pack', 'dozen', 'strip', 'bottle', 'box'];

/** Add / edit an item (P18 editor): basics, price, sizes, add-ons, vertical fields and stock. */
export function ProductEditor({ storeId, vertical, categories, product, defaultCategoryId, onClose }: { storeId: string; vertical: Vertical; categories: Category[]; product?: Product; defaultCategoryId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const eat = vertical === 'EAT';
  const pharmacy = vertical === 'PHARMACY';
  const lab = vertical === 'DIAGNOSTICS';
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    categoryId: product?.category?.id ?? defaultCategoryId ?? '',
    price: toRupees(product?.price),
    mrp: toRupees(product?.mrp),
    taxRatePct: String(product?.taxRatePct ?? (eat ? 5 : 0)),
    unit: product?.unit ?? (eat ? 'plate' : pharmacy ? 'strip' : lab ? 'test' : 'piece'),
    unitSize: product?.unitSize != null ? String(product.unitSize) : '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    isVeg: product?.isVeg ?? true,
    spiceLevel: product?.spiceLevel ?? 0,
    prepMinutes: product?.prepMinutes != null ? String(product.prepMinutes) : '',
    isComplex: product?.isComplex ?? false,
    maxQtyPerOrder: product?.maxQtyPerOrder != null ? String(product.maxQtyPerOrder) : '',
    drugSchedule: product?.drugSchedule && product.drugSchedule !== 'NONE' ? product.drugSchedule : 'OTC',
    prescriptionRequired: product?.prescriptionRequired ?? false,
    saltComposition: product?.saltComposition ?? '',
    manufacturer: product?.manufacturer ?? '',
    substitutionAllowed: product?.substitutionAllowed ?? false,
    tags: (product?.tags ?? []).join(', '),
    isAvailable: product?.isAvailable ?? true,
  });
  const [labF, setLabF] = useState({
    sampleType: product?.lab?.sampleType ?? 'BLOOD',
    fastingHours: String(product?.lab?.fastingHours ?? 0),
    reportHours: String(product?.lab?.reportHours ?? 24),
    homeCollection: product?.lab?.homeCollection ?? true,
    walkIn: product?.lab?.walkIn ?? true,
    parameters: product?.lab?.parameters != null ? String(product.lab.parameters) : '',
    preparation: product?.lab?.preparation ?? '',
  });
  const [images, setImages] = useState(product?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [groups, setGroups] = useState<AddonGroup[]>(product?.addonGroups ?? []);
  const [stock, setStock] = useState({
    trackStock: product?.inventory?.trackStock ?? !eat,
    stockQty: String(product?.inventory?.stockQty ?? 0),
    lowStockThreshold: String(product?.inventory?.lowStockThreshold ?? 5),
    batchNo: product?.inventory?.batchNo ?? '',
    expiryDate: product?.inventory?.expiryDate?.slice(0, 10) ?? '',
  });
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const rxAuto = pharmacy && (f.drugSchedule === 'H' || f.drugSchedule === 'H1');

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name,
        description: f.description || null,
        categoryId: f.categoryId || null,
        images: images.map((i) => i.key),
        price: toPaise(f.price),
        mrp: f.mrp ? toPaise(f.mrp) : null,
        taxRatePct: Number(f.taxRatePct || 0),
        unit: f.unit,
        unitSize: f.unitSize ? Number(f.unitSize) : null,
        sku: f.sku || null,
        barcode: f.barcode || null,
        isAvailable: f.isAvailable,
        maxQtyPerOrder: f.maxQtyPerOrder ? Number(f.maxQtyPerOrder) : null,
        tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
        ...(eat ? { isVeg: f.isVeg, spiceLevel: f.spiceLevel, prepMinutes: f.prepMinutes ? Number(f.prepMinutes) : null, isComplex: f.isComplex, variants, addonGroups: groups } : {}),
        ...(pharmacy ? { drugSchedule: f.drugSchedule, prescriptionRequired: rxAuto || f.prescriptionRequired, saltComposition: f.saltComposition || null, manufacturer: f.manufacturer || null, substitutionAllowed: f.substitutionAllowed } : {}),
        ...(lab
          ? {
              prescriptionRequired: f.prescriptionRequired,
              labSampleType: labF.sampleType,
              labFastingHours: Number(labF.fastingHours || 0),
              labReportHours: Math.max(1, Number(labF.reportHours || 24)),
              labHomeCollection: labF.homeCollection,
              labWalkIn: labF.walkIn,
              labParameters: labF.parameters ? Number(labF.parameters) : null,
              labPreparation: labF.preparation || null,
            }
          : {}),
        ...(lab ? {} : { stock: {
          trackStock: stock.trackStock,
          ...(product?.inventory ? {} : { stockQty: Number(stock.stockQty || 0) }),
          lowStockThreshold: Number(stock.lowStockThreshold || 0),
          batchNo: stock.batchNo || null,
          expiryDate: stock.expiryDate || null,
        } }),
      };
      return product ? api<Product>(`/partners/stores/${storeId}/products/${product.id}`, { method: 'PATCH', body }) : api<Product>(`/partners/stores/${storeId}/products`, { method: 'POST', body });
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['products', storeId] });
      void qc.invalidateQueries({ queryKey: ['categories', storeId] });
      void qc.invalidateQueries({ queryKey: ['inventory', storeId] });
      toast.success(product ? `${saved.name} saved` : `${saved.name} added`);
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/partners/stores/${storeId}/products/${product!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products', storeId] });
      void qc.invalidateQueries({ queryKey: ['categories', storeId] });
      toast.success(`${product!.name} deleted`);
      onClose();
    },
  });
  const errors = fieldErrorsOf(save.error);

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setImageError('');
    try {
      for (const file of Array.from(files).slice(0, 6 - images.length)) {
        const key = await uploadProductImage(storeId, file);
        setImages((x) => [...x, { key, url: apiUrl(`/v1/files/public/${key}`) }]);
      }
    } catch (err) {
      setImageError(errorMessageOf(err) ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title={product ? `Edit ${product.name}` : eat ? 'Add a dish' : pharmacy ? 'Add a medicine' : 'Add a product'} onClose={onClose} wide>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name} className="sm:col-span-2">
              <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus required maxLength={120} />
            </Field>
            <Field label="Category">
              <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            {!lab && (
              <Field label="Unit">
                <div className="flex gap-2">
                  <TextInput className="w-24" inputMode="decimal" placeholder="1" value={f.unitSize} onChange={(e) => set('unitSize', e.target.value.replace(/[^\d.]/g, ''))} aria-label="Unit size" />
                  <Select value={f.unit} onChange={(e) => set('unit', e.target.value)}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </Select>
                </div>
              </Field>
            )}
            <Field label="Description (optional)" className="sm:col-span-2">
              <TextArea value={f.description} maxLength={500} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Photos</p>
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.key} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages((x) => x.filter((i) => i.key !== img.key))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white" aria-label="Remove photo">
                    ✕
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed border-line text-sm font-bold text-ink-3 hover:border-black">
                  {uploading ? '…' : '+ Photo'}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void addImages(e.target.files)} />
            </div>
            {imageError && <ErrorText>{imageError}</ErrorText>}
          </div>
        </Card>

        <Card title="Price">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Selling price (₹)" error={errors.price}>
              <TextInput inputMode="decimal" required value={f.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
            <Field label="MRP (₹, optional)" error={errors.mrp} hint="Shown struck through when higher">
              <TextInput inputMode="decimal" value={f.mrp} onChange={(e) => set('mrp', e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
            <Field label="GST %">
              <Select value={f.taxRatePct} onChange={(e) => set('taxRatePct', e.target.value)}>
                {['0', '5', '12', '18', '28'].map((t) => (
                  <option key={t} value={t}>
                    {t}%
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {eat && (
          <>
            <Card title="Food details">
              <div className="space-y-4">
                <Chips options={[{ value: 'veg', label: '● Veg' }, { value: 'nonveg', label: '▲ Non-veg' }]} value={[f.isVeg ? 'veg' : 'nonveg']} onChange={(v) => set('isVeg', v[0] === 'veg')} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Spice level">
                    <Chips options={['None', 'Mild', 'Medium', 'Hot'].map((l, i) => ({ value: String(i), label: l }))} value={[String(f.spiceLevel)]} onChange={(v) => set('spiceLevel', Number(v[0]))} />
                  </Field>
                  <Field label="Prep time for this item (min)" hint="Leave empty to use the store default">
                    <TextInput inputMode="numeric" value={f.prepMinutes} onChange={(e) => set('prepMinutes', e.target.value.replace(/\D/g, ''))} />
                  </Field>
                </div>
                <Toggle checked={f.isComplex} onChange={(v) => set('isComplex', v)} label="Complex item" hint="Takes long to make — can be paused automatically when the kitchen is overloaded" />
              </div>
            </Card>
            <VariantsEditor value={variants} onChange={setVariants} basePrice={toPaise(f.price)} />
            <AddonsEditor value={groups} onChange={setGroups} />
          </>
        )}

        {!eat && (
          <Card title="Identifiers">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU / item code (optional)">
                <TextInput value={f.sku} onChange={(e) => set('sku', e.target.value)} />
              </Field>
              <Field label="Barcode (optional)">
                <TextInput value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
              </Field>
            </div>
          </Card>
        )}

        {pharmacy && (
          <Card title="Medicine details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Schedule">
                <Select value={f.drugSchedule} onChange={(e) => set('drugSchedule', e.target.value as typeof f.drugSchedule)}>
                  <option value="OTC">OTC — no prescription</option>
                  <option value="H">Schedule H — prescription required</option>
                  <option value="H1">Schedule H1 — prescription required</option>
                </Select>
              </Field>
              <Field label="Salt / composition">
                <TextInput value={f.saltComposition} onChange={(e) => set('saltComposition', e.target.value)} placeholder="Paracetamol 650 mg" />
              </Field>
              <Field label="Manufacturer">
                <TextInput value={f.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 space-y-3">
              <Toggle checked={rxAuto || f.prescriptionRequired} disabled={rxAuto} onChange={(v) => set('prescriptionRequired', v)} label="Prescription required" hint={rxAuto ? 'Always required for Schedule H and H1' : undefined} />
              <Toggle checked={f.substitutionAllowed} onChange={(v) => set('substitutionAllowed', v)} label="Generic substitute allowed" />
            </div>
            <p className="mt-3 text-xs text-ink-3">Schedule X medicines can't be listed on Delivez.</p>
          </Card>
        )}

        {lab && (
          <Card title="Test details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sample">
                <Select value={labF.sampleType} onChange={(e) => setLabF({ ...labF, sampleType: e.target.value as typeof labF.sampleType })}>
                  {SAMPLE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tests included" hint="For packages (optional)">
                <TextInput inputMode="numeric" value={labF.parameters} onChange={(e) => setLabF({ ...labF, parameters: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Fasting (hours)" hint="0 if no fasting is needed">
                <TextInput inputMode="numeric" value={labF.fastingHours} onChange={(e) => setLabF({ ...labF, fastingHours: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Report ready in (hours)">
                <TextInput inputMode="numeric" value={labF.reportHours} onChange={(e) => setLabF({ ...labF, reportHours: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Preparation shown to customers (optional)" className="sm:col-span-2">
                <TextArea rows={2} value={labF.preparation} maxLength={300} onChange={(e) => setLabF({ ...labF, preparation: e.target.value })} placeholder="e.g. Avoid alcohol 24 hours before. Water is allowed." />
              </Field>
            </div>
            <div className="mt-4 space-y-3">
              <Toggle checked={labF.homeCollection} onChange={(v) => setLabF({ ...labF, homeCollection: v })} label="Home sample collection" />
              <Toggle checked={labF.walkIn} onChange={(v) => setLabF({ ...labF, walkIn: v })} label="Walk-in at the lab" />
              {!labF.homeCollection && !labF.walkIn && <p className="text-sm font-semibold text-dz-red">Choose home collection, walk-in or both.</p>}
              <Toggle checked={f.prescriptionRequired} onChange={(v) => set('prescriptionRequired', v)} label="Doctor’s prescription required" hint="Customers must upload a prescription to book this test; you check it before collecting the sample" />
            </div>
          </Card>
        )}

        {!lab && (
        <Card title="Stock">
          <Toggle checked={stock.trackStock} onChange={(v) => setStock({ ...stock, trackStock: v })} label="Track stock" hint={eat ? 'Usually off for cooked food' : 'Customers only see the item while it is in stock'} />
          {stock.trackStock && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {!product?.inventory && (
                <Field label="Opening stock">
                  <TextInput inputMode="numeric" value={stock.stockQty} onChange={(e) => setStock({ ...stock, stockQty: e.target.value.replace(/\D/g, '') })} />
                </Field>
              )}
              {product?.inventory && (
                <Field label="In stock" hint="Change quantities from Inventory so every change is logged">
                  <TextInput value={`${product.inventory.stockQty} (${product.inventory.reservedQty} reserved)`} disabled />
                </Field>
              )}
              <Field label="Low-stock alert at">
                <TextInput inputMode="numeric" value={stock.lowStockThreshold} onChange={(e) => setStock({ ...stock, lowStockThreshold: e.target.value.replace(/\D/g, '') })} />
              </Field>
              {(pharmacy || vertical === 'GROCERY') && (
                <>
                  <Field label="Batch no. (optional)">
                    <TextInput value={stock.batchNo} onChange={(e) => setStock({ ...stock, batchNo: e.target.value })} />
                  </Field>
                  <Field label="Expiry date (optional)">
                    <TextInput type="date" value={stock.expiryDate} onChange={(e) => setStock({ ...stock, expiryDate: e.target.value })} />
                  </Field>
                </>
              )}
            </div>
          )}
        </Card>
        )}

        <Card title="More">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max per order (optional)">
              <TextInput inputMode="numeric" value={f.maxQtyPerOrder} onChange={(e) => set('maxQtyPerOrder', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Tags (comma separated)" hint="e.g. bestseller, new">
              <TextInput value={f.tags} onChange={(e) => set('tags', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Toggle checked={f.isAvailable} onChange={(v) => set('isAvailable', v)} label="Available to customers" />
          </div>
        </Card>

        {save.error && Object.keys(errors).length === 0 && <ErrorText>{errorMessageOf(save.error)}</ErrorText>}
        {Object.keys(errors).length > 0 && <ErrorText>Please fix the highlighted fields{errors.variants || errors.addonGroups ? ` — ${errors.variants ?? errors.addonGroups}` : ''}.</ErrorText>}
        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center gap-3 border-t border-line bg-white px-6 py-4">
          <Button type="submit" disabled={save.isPending || !f.name || !f.price}>
            {save.isPending ? 'Saving…' : product ? 'Save item' : 'Add item'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {product && (
            <button type="button" className="ml-auto text-sm font-bold text-ink-3 hover:text-dz-red" onClick={() => window.confirm(`Delete ${product.name}? Past orders keep their record.`) && remove.mutate()}>
              Delete item
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function VariantsEditor({ value, onChange, basePrice }: { value: Variant[]; onChange: (v: Variant[]) => void; basePrice: number }) {
  const update = (i: number, patch: Partial<Variant>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : patch.isDefault ? { ...v, isDefault: false } : v)));
  return (
    <Card title="Sizes / portions (optional)">
      <p className="mb-3 text-sm text-ink-2">e.g. Half and Full. The price difference is added to the selling price.</p>
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <TextInput className="w-40" value={v.name} placeholder="Full" onChange={(e) => update(i, { name: e.target.value })} aria-label="Size name" />
            <span className="text-sm text-ink-3">+ ₹</span>
            <TextInput className="w-24" inputMode="decimal" value={toRupees(v.priceDiff)} onChange={(e) => update(i, { priceDiff: toPaise(e.target.value) })} aria-label="Extra price" />
            <span className="text-sm text-ink-3">= {inr(basePrice + v.priceDiff)}</span>
            <label className="flex items-center gap-1 text-sm">
              <input type="radio" checked={v.isDefault} onChange={() => update(i, { isDefault: true })} className="accent-[var(--color-dz-red)]" /> default
            </label>
            <button type="button" className="px-2 font-bold text-ink-3 hover:text-dz-red" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove size">
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="mt-3 text-sm font-bold text-dz-red" onClick={() => onChange([...value, { name: '', priceDiff: 0, isDefault: value.length === 0 }])}>
        + Add size
      </button>
    </Card>
  );
}

function AddonsEditor({ value, onChange }: { value: AddonGroup[]; onChange: (v: AddonGroup[]) => void }) {
  const setGroup = (i: number, patch: Partial<AddonGroup>) => onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <Card title="Add-ons (optional)">
      <p className="mb-3 text-sm text-ink-2">Groups like “Choose bread” or “Extras”, each with its own options and limits.</p>
      <div className="space-y-4">
        {value.map((g, i) => (
          <div key={i} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <TextInput className="flex-1" value={g.name} placeholder="Extras" onChange={(e) => setGroup(i, { name: e.target.value })} aria-label="Group name" />
              <label className="text-xs font-bold">
                Min
                <input type="number" min={0} max={20} value={g.minSelect} onChange={(e) => setGroup(i, { minSelect: Number(e.target.value) })} className="ml-1 h-10 w-14 rounded-lg border border-line px-2" />
              </label>
              <label className="text-xs font-bold">
                Max
                <input type="number" min={1} max={20} value={g.maxSelect} onChange={(e) => setGroup(i, { maxSelect: Number(e.target.value) })} className="ml-1 h-10 w-14 rounded-lg border border-line px-2" />
              </label>
              <button type="button" className="px-2 font-bold text-ink-3 hover:text-dz-red" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove group">
                ✕
              </button>
            </div>
            <div className="mt-2 space-y-2 pl-2">
              {g.addons.map((a, k) => (
                <div key={k} className="flex flex-wrap items-center gap-2">
                  <TextInput className="flex-1" value={a.name} placeholder="Extra raita" onChange={(e) => setGroup(i, { addons: g.addons.map((x, m) => (m === k ? { ...x, name: e.target.value } : x)) })} aria-label="Option name" />
                  <span className="text-sm text-ink-3">₹</span>
                  <TextInput className="w-24" inputMode="decimal" value={toRupees(a.price)} onChange={(e) => setGroup(i, { addons: g.addons.map((x, m) => (m === k ? { ...x, price: toPaise(e.target.value) } : x)) })} aria-label="Option price" />
                  <button type="button" className="px-2 font-bold text-ink-3 hover:text-dz-red" onClick={() => setGroup(i, { addons: g.addons.filter((_, m) => m !== k) })} aria-label="Remove option">
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="text-sm font-bold text-dz-red" onClick={() => setGroup(i, { addons: [...g.addons, { name: '', price: 0, isVeg: null }] })}>
                + Add option
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="mt-3 text-sm font-bold text-dz-red" onClick={() => onChange([...value, { name: '', minSelect: 0, maxSelect: 1, addons: [{ name: '', price: 0, isVeg: null }] }])}>
        + Add group
      </button>
    </Card>
  );
}
