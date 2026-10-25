import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarClock, CheckCircle2, CircleDashed, Clock, FileText, Search, XCircle, type LucideIcon } from 'lucide-react';
import { api, errorText } from '../lib/api';
import type { AdminRole, DocStatus, QueueDoc, ShopDocs, ShopDocSlot } from '../lib/types';
import { DocReview } from './DocReview';
import { Empty, ErrorBox, fmtDate, Modal, StatusChip } from './ui';

type Filter = 'NEEDS_REVIEW' | 'MISSING' | 'COMPLETE' | 'ALL';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'NEEDS_REVIEW', label: 'To review' },
  { key: 'MISSING', label: 'Missing documents' },
  { key: 'COMPLETE', label: 'All verified' },
  { key: 'ALL', label: 'All shops' },
];
const VERTICALS = [
  { v: '', l: 'All verticals' },
  { v: 'EAT', l: 'Eat' },
  { v: 'GROCERY', l: 'Grocery' },
  { v: 'PHARMACY', l: 'Pharmacy' },
  { v: 'DIAGNOSTICS', l: 'Diagnostics' },
  { v: 'LOCAL_STORES', l: 'Local stores' },
];

/** How a document slot looks in the table. */
function look(slot: ShopDocSlot): { icon: LucideIcon; text: string; cls: string } {
  const d = slot.doc;
  if (!d) return { icon: CircleDashed, text: 'Missing', cls: slot.required ? 'border-dashed border-dz-red/60 bg-white text-dz-red' : 'border-dashed border-line bg-white text-ink-3' };
  if (d.expiringSoon) return { icon: CalendarClock, text: new Date(d.expiresAt!) < new Date() ? 'Expired' : 'Expiring', cls: 'border-amber-400 bg-amber-50 text-amber-800' };
  const by: Record<DocStatus, { icon: LucideIcon; text: string; cls: string }> = {
    PENDING: { icon: Clock, text: 'To review', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink' },
    UNDER_REVIEW: { icon: Clock, text: 'In review', cls: 'border-dz-blue bg-dz-blue-soft text-dz-blue' },
    VERIFIED: { icon: CheckCircle2, text: 'Verified', cls: 'border-dz-green bg-dz-green-soft text-dz-green' },
    REJECTED: { icon: XCircle, text: 'Rejected', cls: 'border-dz-red bg-dz-red-soft text-dz-red' },
    EXPIRED: { icon: XCircle, text: 'Expired', cls: 'border-dz-red bg-dz-red-soft text-dz-red' },
  };
  return by[d.status];
}

const toQueueDoc = (shop: ShopDocs, slot: ShopDocSlot): QueueDoc & { rejectionReason: string | null; reviewedAt: string | null } => ({
  id: slot.doc!.id,
  type: slot.type,
  label: slot.label,
  status: slot.doc!.status,
  required: slot.required,
  superseded: false,
  documentNumber: slot.doc!.documentNumber,
  expiresAt: slot.doc!.expiresAt,
  reading: slot.doc!.reading ?? null,
  createdAt: slot.doc!.createdAt,
  viewUrl: slot.doc!.viewUrl,
  contentType: slot.doc!.contentType,
  rejectionReason: slot.doc!.rejectionReason,
  reviewedAt: slot.doc!.reviewedAt,
  store: { id: shop.id, name: shop.name, status: shop.status, city: shop.city, legalName: shop.legalName },
});

// Documents by shop: every store on one row, each required document as a chip.
// Hover a chip to preview the file; click to verify or reject without leaving the table.
export function DocMatrix({ role }: { role?: AdminRole }) {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') ?? 'NEEDS_REVIEW') as Filter;
  const vertical = params.get('vertical') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const qs = new URLSearchParams({ filter, ...(vertical && { vertical }), ...(params.get('q') && { q: params.get('q')! }) }).toString();
  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', 'by-store', qs],
    queryFn: () => api<{ counts: Record<Filter, number>; stores: ShopDocs[] }>(`/admin/documents/by-store?${qs}`),
    refetchInterval: 30_000,
  });
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  // Hover preview (desktop) — positioned next to the chip, never steals focus.
  const [hover, setHover] = useState<{ shop: ShopDocs; slot: ShopDocSlot; x: number; y: number } | null>(null);
  const timer = useRef<number>();
  const showPreview = (shop: ShopDocs, slot: ShopDocSlot, el: HTMLElement) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      const w = 380;
      const x = r.right + w + 16 < window.innerWidth ? r.right + 8 : Math.max(8, r.left - w - 8);
      const y = Math.min(Math.max(8, r.top - 40), window.innerHeight - 470);
      setHover({ shop, slot, x, y });
    }, 180);
  };
  const hidePreview = () => (window.clearTimeout(timer.current), setHover(null));

  // Review modal, with "next to review" so a whole queue can be cleared from here.
  const [open, setOpen] = useState<{ shopId: string; type: string } | null>(null);
  const pendingOrder = useMemo(
    () => (data?.stores ?? []).flatMap((s) => s.slots.filter((x) => x.doc && ['PENDING', 'UNDER_REVIEW'].includes(x.doc.status)).map((x) => ({ shopId: s.id, type: x.type }))),
    [data],
  );
  const openShop = open && data?.stores.find((s) => s.id === open.shopId);
  const openSlot = openShop && openShop.slots.find((x) => x.type === open!.type);
  const goNext = () => {
    const i = pendingOrder.findIndex((p) => p.shopId === open?.shopId && p.type === open?.type);
    const rest = [...pendingOrder.slice(i + 1), ...pendingOrder.slice(0, Math.max(0, i))].filter((p) => !(p.shopId === open?.shopId && p.type === open?.type));
    setOpen(rest[0] ?? null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto border-b-[1.5px] border-line [scrollbar-width:none]" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => set('filter', f.key === 'NEEDS_REVIEW' ? '' : f.key)}
              className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold ${filter === f.key ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}
            >
              {f.label}
              {data && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${filter === f.key ? 'bg-dz-red text-white' : 'bg-white text-ink-2'}`}>{data.counts[f.key]}</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <form onSubmit={(e) => (e.preventDefault(), set('q', q.trim()))} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Shop, owner or phone" aria-label="Search shops" className="h-10 w-60 rounded-[9px] border-[1.5px] border-line bg-white pl-9 pr-3 outline-none focus:border-black" />
          </form>
          <select value={vertical} onChange={(e) => set('vertical', e.target.value)} aria-label="Vertical" className="h-10 rounded-[9px] border-[1.5px] border-line bg-white px-3 font-semibold">
            {VERTICALS.map((v) => (
              <option key={v.v} value={v.v}>
                {v.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ErrorBox error={error ? errorText(error) : null} />
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {data && data.stores.length === 0 && <Empty>{filter === 'NEEDS_REVIEW' ? 'Nothing to review — all caught up.' : 'No shops match.'}</Empty>}

      {data && data.stores.length > 0 && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-soft text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Required documents</th>
                <th className="px-4 py-3">Other uploads</th>
                <th className="px-4 py-3 text-right">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.stores.map((shop) => {
                const req = shop.slots.filter((x) => x.required);
                const other = shop.slots.filter((x) => !x.required);
                const pct = shop.summary.required ? Math.round((shop.summary.verified / shop.summary.required) * 100) : 100;
                return (
                  <tr key={shop.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link to={`/stores/${shop.id}`} className="font-extrabold hover:text-dz-red">
                        {shop.name}
                      </Link>
                      <span className="block text-xs text-ink-3">
                        {shop.legalName} · {shop.storeType.replace(/_/g, ' ').toLowerCase()} · {shop.city ?? 'no city'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={shop.status} />
                    </td>
                    <td className="px-4 py-3">
                      {req.length === 0 ? <span className="text-xs text-ink-3">None required for this shop type</span> : <Chips shop={shop} slots={req} onHover={showPreview} onLeave={hidePreview} onOpen={(s) => (hidePreview(), setOpen({ shopId: shop.id, type: s.type }))} />}
                    </td>
                    <td className="px-4 py-3">
                      {other.length === 0 ? <span className="text-xs text-ink-3">—</span> : <Chips shop={shop} slots={other} onHover={showPreview} onLeave={hidePreview} onOpen={(s) => (hidePreview(), setOpen({ shopId: shop.id, type: s.type }))} />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <b className="tabular-nums">
                        {shop.summary.verified}/{shop.summary.required}
                      </b>
                      <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
                        <div className={`h-full ${pct === 100 ? 'bg-dz-green' : pct > 0 ? 'bg-amber-500' : 'bg-transparent'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-3">Hover a document to preview it. Click it to verify or reject — the next one to review opens automatically.</p>

      {hover && hover.slot.doc && <Preview shop={hover.shop} slot={hover.slot} x={hover.x} y={hover.y} />}

      {open && openShop && openSlot?.doc && (
        <Modal title={`${openShop.name} — ${openSlot.label}`} onClose={() => setOpen(null)} wide>
          <DocReview key={openSlot.doc.id} doc={toQueueDoc(openShop, openSlot)} role={role} onDecided={goNext} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link to={`/stores/${openShop.id}`} className="font-bold underline">
              Open full store review
            </Link>
            <span className="text-ink-3">{Math.max(0, pendingOrder.length - (['PENDING', 'UNDER_REVIEW'].includes(openSlot.doc.status) ? 1 : 0))} more waiting in this view</span>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Chips({ shop, slots, onHover, onLeave, onOpen }: { shop: ShopDocs; slots: ShopDocSlot[]; onHover: (shop: ShopDocs, slot: ShopDocSlot, el: HTMLElement) => void; onLeave: () => void; onOpen: (slot: ShopDocSlot) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((slot) => {
        const l = look(slot);
        const has = !!slot.doc;
        return (
          <button
            key={slot.type}
            type="button"
            disabled={!has}
            onMouseEnter={(e) => has && onHover(shop, slot, e.currentTarget)}
            onMouseLeave={onLeave}
            onFocus={(e) => has && onHover(shop, slot, e.currentTarget)}
            onBlur={onLeave}
            onClick={() => has && onOpen(slot)}
            title={has ? undefined : `${slot.label}: not uploaded yet`}
            aria-label={`${slot.label}: ${l.text}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold transition ${l.cls} ${has ? 'cursor-pointer hover:-translate-y-px hover:shadow' : 'cursor-default'}`}
          >
            <l.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="max-w-[11rem] truncate">{slot.label}</span>
            <span className="font-semibold opacity-75">· {l.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function Preview({ shop, slot, x, y }: { shop: ShopDocs; slot: ShopDocSlot; x: number; y: number }) {
  const d = slot.doc!;
  const l = look(slot);
  return (
    <div role="tooltip" className="pointer-events-none fixed z-50 w-[380px] overflow-hidden rounded-xl border border-line bg-white shadow-2xl" style={{ left: x, top: y }}>
      <div className="h-[300px] bg-soft">
        {d.contentType === 'application/pdf' ? (
          <iframe title={slot.label} src={`${d.viewUrl}#toolbar=0&navpanes=0&view=FitH`} tabIndex={-1} className="h-full w-full" />
        ) : (
          <img src={d.viewUrl} alt={slot.label} className="h-full w-full object-contain" />
        )}
      </div>
      <div className="space-y-1 p-3 text-xs">
        <p className="flex items-center justify-between gap-2">
          <b className="flex items-center gap-1.5 text-sm">
            <FileText className="h-4 w-4" /> {slot.label}
          </b>
          <span className={`rounded-full border px-2 py-0.5 font-bold ${l.cls}`}>{l.text}</span>
        </p>
        <p className="text-ink-3">
          {shop.name} · uploaded {fmtDate(d.createdAt)}
          {slot.uploads > 1 && ` · ${slot.uploads} uploads`}
        </p>
        {d.documentNumber && <p>No. {d.documentNumber}</p>}
        {d.expiresAt && <p>Valid till {new Date(d.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
        {d.rejectionReason && <p className="font-semibold text-dz-red">Rejected: {d.rejectionReason}</p>}
        <p className="pt-1 font-bold text-ink-2">Click to review</p>
      </div>
    </div>
  );
}
