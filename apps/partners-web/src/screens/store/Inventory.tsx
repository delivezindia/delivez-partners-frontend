import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { inr, type Product } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { Field, TextInput } from '../../components/form';
import { Modal } from '../../components/Modal';
import { CalendarX, Download, History, PackageCheck, PackageOpen, Search, SlidersHorizontal } from 'lucide-react';
import { downloadFile } from '../../lib/download';
import { useI18n } from '../../lib/i18n';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';

type Item = Product & { expiringSoon: boolean; expired: boolean; daysLeft: number | null };
const WINDOWS = [30, 60, 90] as const;
type Filter = 'ALL' | 'LOW' | 'OUT' | 'EXPIRING';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All tracked' },
  { key: 'LOW', label: 'Low stock' },
  { key: 'OUT', label: 'Out of stock' },
  { key: 'EXPIRING', label: 'Expiring' },
];
const MODES = {
  RECEIVE: { label: 'Receive stock', hint: 'Add a delivery from your supplier', mode: 'ADJUST', type: 'PURCHASE', sign: 1 },
  COUNT: { label: 'Set counted stock', hint: 'After counting the shelf', mode: 'SET', type: 'ADJUSTMENT', sign: 1 },
  WRITE_OFF: { label: 'Write off', hint: 'Expired, damaged or lost', mode: 'ADJUST', type: 'EXPIRY_WRITEOFF', sign: -1 },
  RETURN: { label: 'Customer return', hint: 'Back on the shelf', mode: 'ADJUST', type: 'RETURN', sign: 1 },
} as const;
type ModeKey = keyof typeof MODES;

// P19 Inventory (plan §5.4.2): stock, reserved, low-stock and expiry, with a full movement history.
export default function Inventory() {
  const { storeId } = useStoreContext();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [params] = useSearchParams();
  // The morning expiry alert opens this screen straight on the expiring list.
  const [filter, setFilter] = useState<Filter>(params.get('filter') === 'EXPIRING' ? 'EXPIRING' : 'ALL');
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [downloading, setDownloading] = useState(false);
  const [q, setQ] = useState('');
  const [adjusting, setAdjusting] = useState<Item | null>(null);
  const [history, setHistory] = useState<Item | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', storeId, filter, days],
    queryFn: () => api<{ items: Item[]; counts: Record<Filter | 'EXPIRED', number>; untracked: number }>(`/partners/stores/${storeId}/inventory?filter=${filter}&days=${days}`),
  });
  const quick = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number; name: string }) => api(`/partners/stores/${storeId}/products/${id}/stock`, { method: 'POST', body: { mode: 'ADJUST', qty, type: qty > 0 ? 'PURCHASE' : 'ADJUSTMENT', note: 'Quick adjust' } }),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: ['inventory', storeId] });
      void qc.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success(`${v.name}: ${v.qty > 0 ? `+${v.qty}` : v.qty}`);
    },
  });
  const items = (data?.items ?? []).filter((i) => !q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()) || i.sku?.toLowerCase().includes(q.trim().toLowerCase()) || i.barcode === q.trim());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">Inventory</h1>
          <p className="text-ink-2">Stock held by open orders is reserved; customers only see what is left.</p>
        </div>
        <label className="relative block w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or scan a barcode" aria-label="Search stock" className="h-11 w-full rounded-[10px] border-[1.5px] border-line bg-white pl-9 pr-3 outline-none transition focus:border-black" />
        </label>
      </div>

      <div className="dz-scroll-x flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold ${filter === f.key ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {f.key === 'EXPIRING' ? t('inv.expiringTab', { n: days }) : f.label}
            {data && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${f.key !== 'ALL' && data.counts[f.key] > 0 ? 'bg-dz-red text-white' : 'bg-white text-ink-2'}`}>{data.counts[f.key]}</span>}
          </button>
        ))}
      </div>
      {filter === 'EXPIRING' && (
        <div className="flex flex-wrap items-center gap-2" data-expiry-bar>
          <span className="text-sm font-semibold text-ink-2">{t('inv.within')}</span>
          {WINDOWS.map((w) => (
            <button key={w} type="button" aria-pressed={days === w} onClick={() => setDays(w)} className={`h-9 rounded-full border-[1.5px] px-3 text-sm font-bold ${days === w ? 'border-black bg-black text-white' : 'border-line bg-white'}`}>
              {t('inv.days', { n: w })}
            </button>
          ))}
          {!!data?.counts.EXPIRED && <span className="rounded-full bg-dz-red px-2.5 py-1 text-xs font-bold text-white" data-expired-count>{t('inv.expiredCount', { n: data.counts.EXPIRED })}</span>}
          <Button
            variant="ghost"
            className="min-h-9 text-sm sm:ml-auto"
            disabled={downloading || !data?.items.length}
            onClick={() => {
              setDownloading(true);
              downloadFile(`/partners/stores/${storeId}/inventory/expiry.csv?days=${days}`, `delivez-expiry-${days}-days.csv`, t('sales.downloadFailed'))
                .then((n) => toast.success(t('sales.downloaded', { n })))
                .catch((e: Error) => toast.error(e.message))
                .finally(() => setDownloading(false));
            }}
          >
            <Download className="h-4 w-4" aria-hidden /> {t('inv.downloadList')}
          </Button>
        </div>
      )}
      {(error || quick.error) && <ErrorText>{errorMessageOf(error ?? quick.error)}</ErrorText>}
      {isLoading && <SkeletonList rows={4} />}
      {data && items.length === 0 && (
        filter === 'ALL' ? (
          <EmptyState icon={PackageOpen} title="No items track stock yet" body="Turn on “Track stock” in an item’s details, or add a stock column when you import.">
            <Link to="../menu" relative="path" className="dz-btn-outline min-h-11">
              Open the menu
            </Link>
          </EmptyState>
        ) : (
          <EmptyState icon={PackageCheck} title="Nothing here — good news" body="No items match this filter right now." />
        )
      )}
      {items.length > 0 && (
        <div className="dz-card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-soft text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">In stock</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3">Batch / expiry</th>
                <th className="px-4 py-3">Quick</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => {
                const inv = i.inventory!;
                return (
                  <tr key={i.id} className={inv.available! <= 0 ? 'bg-dz-red-soft/40' : inv.isLow ? 'bg-dz-yellow-soft/50' : ''}>
                    <td className="px-4 py-3">
                      <b className="block">{i.name}</b>
                      <span className="text-xs text-ink-3">{[i.category?.name, i.sku, inr(i.price)].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{inv.stockQty}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{inv.reservedQty}</td>
                    <td className={`px-4 py-3 text-right font-extrabold ${inv.available! <= 0 ? 'text-dz-red' : inv.isLow ? 'text-amber-700' : 'text-dz-green'}`}>
                      {inv.available}
                      {inv.isLow && <span className="block text-[11px] font-semibold">alert at {inv.lowStockThreshold}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {inv.batchNo ?? '—'}
                      {inv.expiryDate && <span className={`block text-xs ${i.expiringSoon ? 'font-bold text-dz-red' : 'text-ink-3'}`}>exp {new Date(inv.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>}
                      {i.expired ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-dz-red px-1.5 text-[11px] font-bold text-white" data-expired><CalendarX className="h-3 w-3" aria-hidden /> {t('inv.expired')}</span>
                      ) : i.expiringSoon && i.daysLeft != null ? (
                        <span className="block text-[11px] font-semibold text-amber-800">{i.daysLeft === 0 ? t('inv.today') : t('inv.daysLeft', { n: i.daysLeft })}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {[-1, 1, 10].map((d) => (
                          <button key={d} type="button" disabled={quick.isPending || (d < 0 && inv.stockQty <= 0)} onClick={() => quick.mutate({ id: i.id, qty: d, name: i.name })} className="h-9 min-w-10 rounded-lg border-[1.5px] border-line bg-white px-2 font-bold hover:border-black disabled:opacity-40">
                            {d > 0 ? `+${d}` : d}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 font-bold">
                        <button className="inline-flex items-center gap-1 hover:text-dz-red" onClick={() => setAdjusting(i)}>
                          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Update
                        </button>
                        <button className="inline-flex items-center gap-1 text-ink-3 hover:text-dz-red" onClick={() => setHistory(i)}>
                          <History className="h-4 w-4" aria-hidden /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.untracked > 0 && items.length > 0 && (
        <p className="text-sm text-ink-3">
          {data.untracked} items don't track stock. <Link to="../menu" relative="path" className="font-bold underline">Open the menu</Link> to turn it on per item.
        </p>
      )}

      {adjusting && <AdjustModal storeId={storeId} item={adjusting} onClose={() => setAdjusting(null)} />}
      {history && <HistoryModal storeId={storeId} item={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function AdjustModal({ storeId, item, onClose }: { storeId: string; item: Item; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<ModeKey>('RECEIVE');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const m = MODES[mode];
  const n = Number(qty || 0);
  const resulting = m.mode === 'SET' ? n : item.inventory!.stockQty + m.sign * n;
  const save = useMutation({
    mutationFn: () => api(`/partners/stores/${storeId}/products/${item.id}/stock`, { method: 'POST', body: { mode: m.mode, qty: m.sign * n, type: m.type, note: note || undefined } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory', storeId] });
      void qc.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success(`${item.name}: stock is now ${resulting}`);
      onClose();
    },
  });
  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MODES) as ModeKey[]).map((k) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-xl border-[1.5px] p-3 text-left ${mode === k ? 'border-black bg-dz-yellow-soft' : 'border-line hover:border-black'}`}>
              <b className="block text-sm">{MODES[k].label}</b>
              <span className="text-xs text-ink-3">{MODES[k].hint}</span>
            </button>
          ))}
        </div>
        <Field label={m.mode === 'SET' ? 'Counted quantity' : 'Quantity'}>
          <TextInput inputMode="numeric" autoFocus value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="Note (optional)">
          <TextInput value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'RECEIVE' ? 'Invoice no. / supplier' : ''} />
        </Field>
        <p className="text-sm text-ink-2">
          In stock: <b>{item.inventory!.stockQty}</b> → <b className={resulting < 0 ? 'text-dz-red' : ''}>{qty ? resulting : '…'}</b>
        </p>
        {save.error && <ErrorText>{errorMessageOf(save.error)}</ErrorText>}
        <Button className="w-full" disabled={!qty || (m.mode !== 'SET' && n === 0) || resulting < 0 || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}

function HistoryModal({ storeId, item, onClose }: { storeId: string; item: Item; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['movements', item.id],
    queryFn: () => api<{ id: string; type: string; qtyDelta: number; note: string | null; by: string | null; at: string; orderId: string | null }[]>(`/partners/stores/${storeId}/products/${item.id}/stock/movements`),
  });
  return (
    <Modal title={`Stock history — ${item.name}`} onClose={onClose} wide>
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {data?.length === 0 && <p className="text-ink-3">No changes yet.</p>}
      <ul className="divide-y divide-line text-sm">
        {data?.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span>
              <b className={m.qtyDelta > 0 ? 'text-dz-green' : 'text-dz-red'}>{m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}</b> · {m.type.replace(/_/g, ' ').toLowerCase()}
              {m.note && <span className="text-ink-3"> — {m.note}</span>}
            </span>
            <span className="text-xs text-ink-3">
              {m.by ?? 'System'} · {new Date(m.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
