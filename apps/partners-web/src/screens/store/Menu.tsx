import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { inr, pausedText, STATUS_LABEL, useCategories, useProducts, type Category, type Product, type ProductStatus } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { ProductEditor } from '../../components/ProductEditor';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, MoreHorizontal, Pause, Pencil, Plus, Search, SearchX, Trash2, Upload, UtensilsCrossed } from 'lucide-react';
import { Button, ErrorText } from '../../components/ui';
import { Dropdown, EmptyState, SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';

type Filter = 'ALL' | ProductStatus | 'LOW_STOCK';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'AVAILABLE', label: 'Available' },
  { key: 'HIDDEN', label: 'Unavailable' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'OUT_OF_STOCK', label: 'Out of stock' },
  { key: 'LOW_STOCK', label: 'Low stock' },
];
const BULK_DONE: Record<string, string> = { MAKE_AVAILABLE: 'made available', MAKE_UNAVAILABLE: 'switched off', DELETE: 'deleted', MOVE: 'moved', PRICE_PERCENT: 're-priced' };
const PAUSES = [
  { m: 30, l: '30 min' },
  { m: 60, l: '1 hour' },
  { m: 120, l: '2 hours' },
];

// P18 Menu & pricing (plan §5.4.2)
export default function Menu() {
  const { storeId, role, detail } = useStoreContext();
  const vertical = detail.store.vertical;
  const canEdit = role === 'OWNER' || role === 'MANAGER';
  const qc = useQueryClient();
  const cats = useCategories(storeId);
  const prods = useProducts(storeId);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState<string | 'ALL' | 'NONE'>('ALL');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [newCat, setNewCat] = useState('');
  const [manageCats, setManageCats] = useState(false); // phone: full category panel is opt-in
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['products', storeId] });
    void qc.invalidateQueries({ queryKey: ['categories', storeId] });
  };

  const toggle = useMutation({
    mutationFn: (p: Product) => api(`/partners/stores/${storeId}/products/${p.id}/availability`, { method: 'PUT', body: { isAvailable: !(p.isAvailable && !p.pausedUntil) } }),
    onSuccess: (_r, p) => (refresh(), toast.success(p.isAvailable && !p.pausedUntil ? `${p.name} switched off` : `${p.name} is available`)),
  });
  const pause = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number | null; name: string }) => api(`/partners/stores/${storeId}/products/${id}/pause`, { method: 'PUT', body: { minutes } }),
    onSuccess: (_r, v) => (refresh(), toast.success(v.minutes ? `${v.name} paused for ${v.minutes >= 60 ? `${v.minutes / 60} h` : `${v.minutes} min`}` : `${v.name} is back on`)),
  });
  const bulk = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/partners/stores/${storeId}/products/bulk`, { method: 'POST', body: { ids: [...selected], ...body } }),
    onSuccess: (_r, body) => {
      toast.success(`${selected.size} item${selected.size > 1 ? 's' : ''} ${BULK_DONE[body.action as string] ?? 'updated'}`);
      setSelected(new Set());
      refresh();
    },
  });
  const addCat = useMutation({ mutationFn: () => api(`/partners/stores/${storeId}/categories`, { method: 'POST', body: { name: newCat.trim() } }), onSuccess: () => (toast.success(`Category “${newCat.trim()}” added`), setNewCat(''), refresh()) });
  const catAction = useMutation({
    mutationFn: ({ c, action, name }: { c: Category; action: 'rename' | 'toggle' | 'delete' | 'up' | 'down'; name?: string }) => {
      const list = cats.data!.categories;
      if (action === 'delete') return api(`/partners/stores/${storeId}/categories/${c.id}`, { method: 'DELETE' });
      if (action === 'rename') return api(`/partners/stores/${storeId}/categories/${c.id}`, { method: 'PATCH', body: { name } });
      if (action === 'toggle') return api(`/partners/stores/${storeId}/categories/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } });
      const ids = list.map((x) => x.id);
      const i = ids.indexOf(c.id);
      const j = action === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return Promise.resolve();
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return api(`/partners/stores/${storeId}/categories/order`, { method: 'PUT', body: { ids } });
    },
    onSuccess: refresh,
  });

  const products = useMemo(() => {
    const all = prods.data?.products ?? [];
    const term = q.trim().toLowerCase();
    return all.filter(
      (p) =>
        (filter === 'ALL' || (filter === 'LOW_STOCK' ? p.inventory?.isLow : p.status === filter)) &&
        (category === 'ALL' || (category === 'NONE' ? !p.category : p.category?.id === category)) &&
        (!term || p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term) || p.barcode === term),
    );
  }, [prods.data, filter, category, q]);

  const groups = useMemo(() => {
    const order = new Map((cats.data?.categories ?? []).map((c, i) => [c.id, i]));
    const map = new Map<string, { name: string; items: Product[]; rank: number }>();
    for (const p of products) {
      const key = p.category?.id ?? 'NONE';
      if (!map.has(key)) map.set(key, { name: p.category?.name ?? 'Uncategorised', items: [], rank: p.category ? (order.get(p.category.id) ?? 999) : 1000 });
      map.get(key)!.items.push(p);
    }
    return [...map.values()].sort((a, b) => a.rank - b.rank);
  }, [products, cats.data]);

  const summary = prods.data?.summary;
  const noun = vertical === 'EAT' ? 'Menu' : vertical === 'PHARMACY' ? 'Medicines' : vertical === 'DIAGNOSTICS' ? 'Tests & packages' : 'Products';
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const error = toggle.error ?? pause.error ?? bulk.error ?? addCat.error ?? catAction.error;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">{noun}</h1>
          <p className="text-ink-2">{canEdit ? 'Add items, set prices and switch things off when you run out.' : 'Switch items off when you run out — customers stop seeing them instantly.'}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="relative block w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or barcode" aria-label="Search items" className="h-11 w-full rounded-[10px] border-[1.5px] border-line bg-white pl-9 pr-3 outline-none transition focus:border-black" />
          </label>
          {canEdit && (
            <>
              <Link to="import" className="dz-btn-outline min-h-11 px-4 text-sm">
                <Upload className="h-4 w-4" aria-hidden /> Import
              </Link>
              <Button className="min-h-11" onClick={() => setEditing('new')}>
                <Plus className="h-4 w-4" aria-hidden /> Add item
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="dz-scroll-x flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {FILTERS.filter((x) => x.key !== 'LOW_STOCK' || (summary?.LOW_STOCK ?? 0) > 0).map((x) => (
          <button key={x.key} role="tab" aria-selected={filter === x.key} onClick={() => setFilter(x.key)} className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold ${filter === x.key ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {x.label}
            {summary && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${filter === x.key ? 'bg-dz-red text-white' : 'bg-white text-ink-2'}`}>{x.key === 'ALL' ? summary.total : summary[x.key]}</span>}
          </button>
        ))}
      </div>
      {error && <ErrorText>{errorMessageOf(error)}</ErrorText>}

      {/* Phone/tablet: categories as a chip row; the full panel opens on demand */}
      <div className="dz-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {[{ id: 'ALL', name: 'All', n: summary?.total }, ...(cats.data?.categories ?? []).map((c) => ({ id: c.id, name: c.name, n: c.productCount })), ...((cats.data?.uncategorized ?? 0) > 0 ? [{ id: 'NONE', name: 'Uncategorised', n: cats.data!.uncategorized }] : [])].map((c) => (
          <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-bold transition ${category === c.id ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white text-ink-2'}`}>
            {c.name}
            {c.n !== undefined && <span className="ml-1.5 text-xs opacity-70">{c.n}</span>}
          </button>
        ))}
        {canEdit && (
          <button type="button" onClick={() => setManageCats((v) => !v)} aria-expanded={manageCats} className="flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-dashed border-ink-3 px-3.5 py-1.5 text-sm font-bold text-ink-2">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {manageCats ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Categories */}
        <aside className={`space-y-1 ${manageCats ? 'dz-fade block' : 'hidden'} lg:block`}>
          <CatButton active={category === 'ALL'} onClick={() => setCategory('ALL')} label="All items" count={summary?.total} />
          {cats.data?.categories.map((c) => (
            <div key={c.id} className="group relative">
              <CatButton active={category === c.id} onClick={() => setCategory(c.id)} label={c.name} count={c.productCount} muted={!c.isActive} />
              {canEdit && (
                <div className="absolute right-1 top-1">
                  <Dropdown
                    label={`${c.name} options`}
                    triggerClass="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-soft hover:text-ink"
                    trigger={<MoreHorizontal className="h-4 w-4" />}
                    items={[
                      { label: 'Rename', icon: Pencil, onSelect: () => { const name = window.prompt('Category name', c.name); if (name?.trim()) catAction.mutate({ c, action: 'rename', name: name.trim() }); } },
                      { label: c.isActive ? 'Hide from customers' : 'Show to customers', icon: c.isActive ? EyeOff : Eye, onSelect: () => catAction.mutate({ c, action: 'toggle' }) },
                      { label: 'Move up', icon: ArrowUp, onSelect: () => catAction.mutate({ c, action: 'up' }) },
                      { label: 'Move down', icon: ArrowDown, onSelect: () => catAction.mutate({ c, action: 'down' }) },
                      null,
                      { label: 'Delete', icon: Trash2, danger: true, onSelect: () => window.confirm(`Delete “${c.name}”? Its items move to Uncategorised.`) && catAction.mutate({ c, action: 'delete' }) },
                    ]}
                  />
                </div>
              )}
            </div>
          ))}
          {(cats.data?.uncategorized ?? 0) > 0 && <CatButton active={category === 'NONE'} onClick={() => setCategory('NONE')} label="Uncategorised" count={cats.data!.uncategorized} />}
          {canEdit && (
            <form
              className="flex gap-1 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newCat.trim()) addCat.mutate();
              }}
            >
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" aria-label="New category" maxLength={60} className="h-10 min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line bg-white px-3 text-sm outline-none transition focus:border-black" />
              <button type="submit" className="grid h-10 w-10 place-items-center rounded-[9px] bg-black text-white transition hover:bg-neutral-800 disabled:opacity-40" disabled={!newCat.trim()} aria-label="Add category">
                <Plus className="h-4 w-4" />
              </button>
            </form>
          )}
        </aside>

        {/* Items */}
        <div className="min-w-0 space-y-4">
          {canEdit && selected.size > 0 && (
            <div className="dz-pop sticky top-[112px] z-10 shadow-lg flex flex-wrap items-center gap-2 rounded-[12px] border-[1.5px] border-black bg-dz-yellow p-3 text-sm">
              <b>{selected.size} selected</b>
              <Button variant="ghost" className="min-h-9 text-xs" onClick={() => bulk.mutate({ action: 'MAKE_AVAILABLE' })}>
                Make available
              </Button>
              <Button variant="ghost" className="min-h-9 text-xs" onClick={() => bulk.mutate({ action: 'MAKE_UNAVAILABLE' })}>
                Make unavailable
              </Button>
              <select className="h-9 rounded-lg border-[1.5px] border-black bg-white px-2 text-xs font-bold" value="" onChange={(e) => e.target.value && bulk.mutate({ action: 'MOVE', categoryId: e.target.value === 'NONE' ? null : e.target.value })}>
                <option value="">Move to…</option>
                {cats.data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="NONE">Uncategorised</option>
              </select>
              <Button
                variant="ghost"
                className="min-h-9 text-xs"
                onClick={() => {
                  const v = window.prompt('Change prices by what percent? (e.g. 10 or -5)');
                  if (v && Number(v)) bulk.mutate({ action: 'PRICE_PERCENT', percent: Number(v) });
                }}
              >
                Change price %
              </Button>
              <Button variant="ghost" className="min-h-9 text-xs" onClick={() => window.confirm(`Delete ${selected.size} items?`) && bulk.mutate({ action: 'DELETE' })}>
                Delete
              </Button>
              <button className="ml-auto font-bold" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
          )}

          {prods.isLoading && <SkeletonList rows={5} />}
          {prods.data && products.length === 0 && (
            prods.data.products.length === 0 ? (
              <EmptyState icon={UtensilsCrossed} title={vertical === 'EAT' ? 'Your menu is empty' : 'No products yet'} body={canEdit ? 'Add items one by one, or import your whole list from a spreadsheet in one go.' : 'Ask the owner or a manager to add items.'}>
                {canEdit && (
                  <>
                    <Button onClick={() => setEditing('new')}>
                      <Plus className="h-4 w-4" aria-hidden /> Add your first item
                    </Button>
                    <Link to="import" className="dz-btn-outline min-h-12">
                      <Upload className="h-4 w-4" aria-hidden /> Import from CSV
                    </Link>
                  </>
                )}
              </EmptyState>
            ) : (
              <EmptyState icon={SearchX} title="Nothing matches" body="Try a different search, filter or category.">
                <Button variant="ghost" onClick={() => (setQ(''), setFilter('ALL'), setCategory('ALL'))}>
                  Clear filters
                </Button>
              </EmptyState>
            )
          )}

          {canEdit && products.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))} className="h-4 w-4 accent-[var(--color-dz-red)]" />
              Select all {products.length}
            </label>
          )}

          {groups.map((g) => (
            <section key={g.name} className="dz-card">
              <h2 className="flex items-baseline gap-2 rounded-t-[14px] border-b border-line bg-soft/70 px-4 py-2.5 text-lg">
                {g.name} <span className="font-sans text-xs font-bold text-ink-3" style={{ fontStretch: '100%' }}>{g.items.length} {g.items.length === 1 ? 'item' : 'items'}</span>
              </h2>
              <ul className="divide-y divide-line">
                {g.items.map((p) => (
                  <ItemRow
                    key={p.id}
                    p={p}
                    canEdit={canEdit}
                    selected={selected.has(p.id)}
                    onSelect={() => setSelected((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                    onToggle={() => toggle.mutate(p)}
                    onPause={(minutes) => pause.mutate({ id: p.id, minutes, name: p.name })}
                    onEdit={() => setEditing(p)}
                    busy={toggle.isPending || pause.isPending}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {editing && (
        <ProductEditor
          storeId={storeId}
          vertical={vertical}
          categories={cats.data?.categories ?? []}
          product={editing === 'new' ? undefined : editing}
          defaultCategoryId={category !== 'ALL' && category !== 'NONE' ? category : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CatButton({ active, onClick, label, count, muted }: { active: boolean; onClick: () => void; label: string; count?: number; muted?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 pr-9 text-left text-sm font-bold transition ${active ? 'bg-white text-dz-red shadow-sm ring-1 ring-line' : 'text-ink-2 hover:bg-white'} ${muted ? 'line-through opacity-60' : ''}`}>
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="text-xs text-ink-3">{count}</span>}
    </button>
  );
}

function ItemRow({ p, canEdit, selected, onSelect, onToggle, onPause, onEdit, busy }: { p: Product; canEdit: boolean; selected: boolean; onSelect: () => void; onToggle: () => void; onPause: (m: number | null) => void; onEdit: () => void; busy: boolean }) {
  const on = p.status === 'AVAILABLE' || p.status === 'OUT_OF_STOCK';
  const switchedOn = p.isAvailable && !p.pausedUntil;
  const details = p.lab
    ? [p.lab.sampleType?.toLowerCase(), p.lab.fastingHours ? `${p.lab.fastingHours} h fasting` : 'no fasting', p.lab.reportHours ? `report in ${p.lab.reportHours} h` : null, [p.lab.homeCollection && 'home', p.lab.walkIn && 'walk-in'].filter(Boolean).join(' + '), p.lab.parameters ? `${p.lab.parameters} tests` : null].filter(Boolean).join(' · ')
    : [p.variants.length ? `${p.variants.length} sizes` : null, p.addonGroups.length ? `${p.addonGroups.length} add-on groups` : null, p.unitSize ? `${p.unitSize} ${p.unit}` : null, p.sku].filter(Boolean).join(' · ');
  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors ${selected ? 'bg-dz-yellow-soft' : 'hover:bg-neutral-50'} ${switchedOn ? '' : 'opacity-[0.85]'}`}>
      {canEdit && <input type="checkbox" checked={selected} onChange={onSelect} className="h-4 w-4 accent-[var(--color-dz-red)]" aria-label={`Select ${p.name}`} />}
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-soft text-neutral-400">
        {p.images[0] ? <img src={p.images[0].url} alt="" loading="lazy" className={`h-full w-full object-cover ${switchedOn ? '' : 'grayscale'}`} /> : <ImageIcon className="h-5 w-5" aria-hidden />}
      </div>
      <button type="button" onClick={canEdit ? onEdit : undefined} className={`group min-w-[8rem] flex-1 text-left ${canEdit ? '' : 'cursor-default'}`}>
        <span className="flex items-center gap-2 font-bold">
          {p.isVeg !== null && (
            <span className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] ${p.isVeg ? 'border-green-700' : 'border-dz-red'}`} title={p.isVeg ? 'Veg' : 'Non-veg'}>
              <span className={`h-1.5 w-1.5 rounded-full ${p.isVeg ? 'bg-green-700' : 'bg-dz-red'}`} />
            </span>
          )}
          <span className={`truncate ${canEdit ? 'group-hover:text-dz-red' : ''}`}>{p.name}</span>
          {p.prescriptionRequired && <span className="rounded bg-dz-red-soft px-1 text-[11px] font-bold text-dz-red">Rx{p.drugSchedule !== 'NONE' ? ` ${p.drugSchedule}` : ''}</span>}
          {p.isComplex && <span className="rounded bg-soft px-1 text-[11px] font-bold text-ink-2">Complex</span>}
          {canEdit && <Pencil className="h-3.5 w-3.5 shrink-0 text-ink-3 opacity-0 transition group-hover:opacity-100" aria-hidden />}
        </span>
        {details && <span className="block truncate text-xs text-ink-3">{details}</span>}
      </button>
      <div className="text-right">
        <b className="tabular-nums">{inr(p.price)}</b>
        {p.mrp && p.mrp > p.price && <span className="block text-xs tabular-nums text-ink-3 line-through">{inr(p.mrp)}</span>}
      </div>
      <div className={`flex w-full items-center gap-2 sm:w-auto ${canEdit ? 'pl-7' : ''} sm:pl-0`}>
        {p.inventory?.trackStock && (
          <span className={`whitespace-nowrap text-xs ${p.inventory.isLow ? 'font-bold text-dz-red' : 'text-ink-2'}`}>
            <b className="tabular-nums">{p.inventory.available}</b> in stock
          </span>
        )}
        <span className="sm:w-28">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].label}</span>
          {p.pausedUntil && <span className="block text-[11px] text-ink-3">{pausedText(p.pausedUntil)}</span>}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {switchedOn && on && (
            <Dropdown
              label={`Pause ${p.name}`}
              triggerClass="flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2 text-xs font-bold transition hover:border-black"
              trigger={
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden /> Pause
                </>
              }
              items={PAUSES.map((x) => ({ label: `For ${x.l}`, onSelect: () => onPause(x.m) }))}
            />
          )}
          <button
            type="button"
            role="switch"
            aria-checked={switchedOn}
            aria-label={`${p.name} available`}
            disabled={busy}
            onClick={p.pausedUntil ? () => onPause(null) : onToggle}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${switchedOn ? 'bg-dz-green' : 'bg-neutral-300'}`}
            title={p.pausedUntil ? 'Resume now' : switchedOn ? 'Mark unavailable' : 'Mark available'}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${switchedOn ? 'left-7' : 'left-1'}`} />
          </button>
        </span>
      </div>
    </li>
  );
}
