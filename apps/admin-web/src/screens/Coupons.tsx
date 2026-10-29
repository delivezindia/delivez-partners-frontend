import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Users } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { rupees } from '../lib/orders';
import { CAN, can, type City, type PipelineStore } from '../lib/types';
import { Button, Card, Empty, ErrorBox, Field, fmtDate, inputCls, Modal, PageHead, Switch } from '../components/ui';
import { useMe } from './Layout';

type Kind = 'FLAT' | 'PERCENT' | 'FREE_DELIVERY';
type State = 'LIVE' | 'SCHEDULED' | 'PAUSED' | 'ENDED';
type Vertical = 'EAT' | 'GROCERY' | 'PHARMACY' | 'LOCAL_STORES';
interface Coupon {
  id: string;
  code: string;
  headline: string;
  description: string | null;
  discountType: Kind;
  discountValue: number;
  maxDiscount: number | null;
  minOrder: number;
  vertical: Vertical | null;
  storeId: string | null;
  cityId: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  firstOrderOnly: boolean;
  isPublic: boolean;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  state: State;
  used: number;
  saved: number;
  city: string | null;
  shop: string | null;
}
interface Redemption {
  id: string;
  at: string;
  saved: number;
  counted: boolean;
  order: { id: string; number: string; status: string; paid: number; shop: string };
  customer: string;
}

const KIND_LABEL: Record<Kind, string> = { FLAT: 'Flat ₹ off', PERCENT: '% off', FREE_DELIVERY: 'Free delivery' };
const VERTICAL_LABEL: Record<Vertical, string> = { EAT: 'Food', GROCERY: 'Grocery', PHARMACY: 'Pharmacy', LOCAL_STORES: 'Local shops' };
const STATE_CHIP: Record<State, string> = {
  LIVE: 'bg-dz-green-soft text-dz-green border-dz-green',
  SCHEDULED: 'bg-dz-blue-soft text-dz-blue border-dz-blue',
  PAUSED: 'bg-orange-50 text-orange-800 border-orange-400',
  ENDED: 'bg-neutral-100 text-neutral-500 border-neutral-300',
};
const FILTERS: (State | 'ALL')[] = ['ALL', 'LIVE', 'SCHEDULED', 'PAUSED', 'ENDED'];

/** Customer coupons. Delivez pays for them: shops are paid the full price; the customer pays less. */
export default function Coupons() {
  const { data: me } = useMe();
  const edit = can(me?.role, CAN.coupons);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['coupons'], queryFn: () => api<Coupon[]>('/admin/coupons') });
  const [filter, setFilter] = useState<State | 'ALL'>('ALL');
  const [form, setForm] = useState<Coupon | 'new' | null>(null);
  const [usedBy, setUsedBy] = useState<Coupon | null>(null);
  const toggle = useMutation({
    mutationFn: (c: Coupon) => api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
  const all = data ?? [];
  const list = filter === 'ALL' ? all : all.filter((c) => c.state === filter);
  const live = all.filter((c) => c.state === 'LIVE');

  return (
    <div className="space-y-5">
      <PageHead
        title="Coupons"
        sub="Codes customers use at checkout. Delivez pays for every coupon — shops are still paid the full price of the items."
        actions={
          edit && (
            <Button onClick={() => setForm('new')} data-new-coupon>
              <Plus className="h-4 w-4" /> New coupon
            </Button>
          )
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Live now" value={String(live.length)} />
        <Stat label="Times used" value={all.reduce((n, c) => n + c.used, 0).toLocaleString('en-IN')} />
        <Stat label="Customers saved" value={rupees(all.reduce((n, c) => n + c.saved, 0))} hint="Paid by Delivez" />
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter coupons">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-bold ${filter === f ? 'border-black bg-black text-white' : 'border-line bg-white'}`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} {f === 'ALL' ? all.length : all.filter((c) => c.state === f).length}
          </button>
        ))}
      </div>
      <ErrorBox error={error ? errorText(error) : toggle.error ? errorText(toggle.error) : null} />
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {!isLoading && !list.length && <Empty>{all.length ? 'No coupons here.' : 'No coupons yet. Make one with “New coupon” — it shows in the customer app straight away.'}</Empty>}
      {list.length > 0 && (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3" data-coupon-row={c.code}>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="rounded-md border border-dashed border-black px-2 py-0.5 tracking-wider">{c.code}</b>
                    <b>{c.headline}</b>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATE_CHIP[c.state]}`}>{c.state.charAt(0) + c.state.slice(1).toLowerCase()}</span>
                    {!c.isPublic && <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-bold text-ink-2">Code only</span>}
                  </div>
                  {c.description && <p className="mt-0.5 text-sm text-ink-2">{c.description}</p>}
                  <p className="mt-0.5 text-xs text-ink-3">{terms(c)}</p>
                  <p className="text-xs text-ink-3">
                    {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <b className="block tabular-nums">
                    {c.used}
                    {c.usageLimit != null && <span className="font-normal text-ink-3"> / {c.usageLimit}</span>} used
                  </b>
                  <span className="text-xs text-ink-3">{rupees(c.saved)} saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setUsedBy(c)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft" aria-label={`Who used ${c.code}`} title="Who used it">
                    <Users className="h-4 w-4" />
                  </button>
                  {edit && (
                    <button type="button" onClick={() => setForm(c)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft" aria-label={`Edit ${c.code}`} title="Edit" data-edit-coupon>
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <Switch on={c.isActive} label={`${c.code} on`} disabled={!edit || toggle.isPending} onChange={() => toggle.mutate(c)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {form && <CouponForm coupon={form === 'new' ? null : form} onClose={() => setForm(null)} />}
      {usedBy && <UsedBy coupon={usedBy} onClose={() => setUsedBy(null)} />}
    </div>
  );
}

function terms(c: Coupon) {
  return [
    c.shop ? `At ${c.shop}` : c.vertical ? `${VERTICAL_LABEL[c.vertical]} shops` : 'All shops',
    c.city ? c.city : 'all cities',
    c.minOrder > 0 && `min ${rupees(c.minOrder)}`,
    c.firstOrderOnly && 'first order only',
    c.perUserLimit === 1 ? 'once per customer' : `${c.perUserLimit}× per customer`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-3">{label}</span>
      <b className="block text-2xl tabular-nums">{value}</b>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

// datetime-local wants local "YYYY-MM-DDTHH:mm"
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const toRs = (p: number | null | undefined) => (p == null ? '' : String(p / 100));
const toPaise = (rs: string) => Math.round(Number(rs || 0) * 100);

function CouponForm({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const qc = useQueryClient();
  const locked = !!coupon && coupon.used > 0;
  const now = new Date();
  const [f, setF] = useState({
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    discountType: coupon?.discountType ?? ('FLAT' as Kind),
    value: coupon ? (coupon.discountType === 'PERCENT' ? String(coupon.discountValue) : toRs(coupon.discountValue)) : '',
    maxDiscount: toRs(coupon?.maxDiscount),
    minOrder: toRs(coupon?.minOrder ?? 0),
    scope: coupon?.storeId ? 'SHOP' : coupon?.vertical ? 'KIND' : 'ALL',
    vertical: coupon?.vertical ?? ('EAT' as Vertical),
    storeId: coupon?.storeId ?? '',
    storeName: coupon?.shop ?? '',
    cityId: coupon?.cityId ?? '',
    usageLimit: coupon?.usageLimit != null ? String(coupon.usageLimit) : '',
    perUserLimit: String(coupon?.perUserLimit ?? 1),
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    isPublic: coupon?.isPublic ?? true,
    startsAt: local(coupon ? new Date(coupon.startsAt) : now),
    endsAt: local(coupon ? new Date(coupon.endsAt) : new Date(now.getTime() + 30 * 86_400_000)),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const cities = useQuery({ queryKey: ['cities'], queryFn: () => api<City[]>('/admin/cities') });
  const [shopQ, setShopQ] = useState('');
  const shops = useQuery({
    queryKey: ['coupon-shops', shopQ],
    queryFn: () => api<{ stores: PipelineStore[] }>(`/admin/onboarding/pipeline?q=${encodeURIComponent(shopQ)}`),
    enabled: f.scope === 'SHOP' && shopQ.trim().length >= 2,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: f.code,
        description: f.description.trim() || null,
        discountType: f.discountType,
        discountValue: f.discountType === 'PERCENT' ? Math.round(Number(f.value || 0)) : f.discountType === 'FLAT' ? toPaise(f.value) : 0,
        maxDiscount: f.discountType === 'PERCENT' && f.maxDiscount ? toPaise(f.maxDiscount) : null,
        minOrder: toPaise(f.minOrder),
        vertical: f.scope === 'KIND' ? f.vertical : null,
        storeId: f.scope === 'SHOP' ? f.storeId || null : null,
        cityId: f.cityId || null,
        usageLimit: f.usageLimit ? Math.round(Number(f.usageLimit)) : null,
        perUserLimit: Math.max(1, Math.round(Number(f.perUserLimit || 1))),
        firstOrderOnly: f.firstOrderOnly,
        isPublic: f.isPublic,
        startsAt: new Date(f.startsAt).toISOString(),
        endsAt: new Date(f.endsAt).toISOString(),
      };
      // An edited coupon that customers already used keeps its code and discount (the API refuses changes to them).
      const patch = locked ? (({ code: _c, discountType: _t, discountValue: _v, maxDiscount: _m, ...rest }) => rest)(body) : body;
      return coupon ? api(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body: patch }) : api('/admin/coupons', { method: 'POST', body });
    },
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['coupons'] }), onClose()),
  });
  const valueOk = f.discountType === 'FREE_DELIVERY' || Number(f.value) > 0;
  const ready = f.code.length >= 3 && valueOk && (f.scope !== 'SHOP' || !!f.storeId) && !!f.startsAt && !!f.endsAt;

  return (
    <Modal title={coupon ? `Edit ${coupon.code}` : 'New coupon'} onClose={onClose} wide>
      <div className="space-y-3">
        {locked && <p className="rounded-lg bg-dz-yellow-soft p-3 text-xs">Customers have used this coupon {coupon!.used} times, so its code and discount are fixed. You can still change who can use it, the dates and limits — or pause it and make a new one.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code" hint="Letters and numbers, e.g. WELCOME50">
            <input className={`${inputCls} font-bold uppercase tracking-wider`} value={f.code} disabled={locked} maxLength={20} onChange={(e) => set('code', e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())} data-f="code" />
          </Field>
          <Field label="What customers read" hint="Optional, e.g. “On your first order”">
            <input className={inputCls} value={f.description} maxLength={120} onChange={(e) => set('description', e.target.value)} data-f="description" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Discount">
            <select className={inputCls} value={f.discountType} disabled={locked} onChange={(e) => set('discountType', e.target.value as Kind)} data-f="type">
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          {f.discountType !== 'FREE_DELIVERY' && (
            <Field label={f.discountType === 'PERCENT' ? 'Percent off' : 'Amount off (₹)'} hint={f.discountType === 'PERCENT' ? '1 to 90' : undefined}>
              <input className={inputCls} inputMode="decimal" value={f.value} disabled={locked} onChange={(e) => set('value', e.target.value.replace(/[^0-9.]/g, ''))} data-f="value" />
            </Field>
          )}
          {f.discountType === 'PERCENT' && (
            <Field label="Up to (₹)" hint="Leave empty for no cap">
              <input className={inputCls} inputMode="decimal" value={f.maxDiscount} disabled={locked} onChange={(e) => set('maxDiscount', e.target.value.replace(/[^0-9.]/g, ''))} data-f="max" />
            </Field>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Minimum items total (₹)" hint="0 = any order">
            <input className={inputCls} inputMode="decimal" value={f.minOrder} onChange={(e) => set('minOrder', e.target.value.replace(/[^0-9.]/g, ''))} data-f="min" />
          </Field>
          <Field label="Uses in total" hint="Empty = no limit">
            <input className={inputCls} inputMode="numeric" value={f.usageLimit} onChange={(e) => set('usageLimit', e.target.value.replace(/\D/g, ''))} data-f="limit" />
          </Field>
          <Field label="Uses per customer">
            <input className={inputCls} inputMode="numeric" value={f.perUserLimit} onChange={(e) => set('perUserLimit', e.target.value.replace(/\D/g, ''))} data-f="perUser" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Where it works">
            <select className={inputCls} value={f.scope} onChange={(e) => set('scope', e.target.value)} data-f="scope">
              <option value="ALL">Every shop</option>
              <option value="KIND">One kind of shop</option>
              <option value="SHOP">One shop</option>
            </select>
          </Field>
          {f.scope === 'KIND' && (
            <Field label="Kind of shop">
              <select className={inputCls} value={f.vertical} onChange={(e) => set('vertical', e.target.value as Vertical)}>
                {(Object.keys(VERTICAL_LABEL) as Vertical[]).map((v) => (
                  <option key={v} value={v}>
                    {VERTICAL_LABEL[v]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {f.scope === 'SHOP' && (
            <Field label="Shop" hint={f.storeId ? `Chosen: ${f.storeName}` : 'Type 2+ letters of the shop name'}>
              <input className={inputCls} value={shopQ} onChange={(e) => setShopQ(e.target.value)} placeholder={f.storeName || 'Search shops'} data-f="shop" />
              {!!shops.data?.stores.length && (
                <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-line bg-white text-sm">
                  {shops.data.stores.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <button type="button" className={`w-full px-3 py-2 text-left hover:bg-soft ${s.id === f.storeId ? 'font-bold' : ''}`} onClick={() => (setF((x) => ({ ...x, storeId: s.id, storeName: s.name })), setShopQ(''))}>
                        {s.name} <span className="text-xs text-ink-3">· {s.status.toLowerCase()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          )}
          <Field label="City">
            <select className={inputCls} value={f.cityId} onChange={(e) => set('cityId', e.target.value)} data-f="city">
              <option value="">All cities</option>
              {(cities.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Starts">
            <input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} data-f="starts" />
          </Field>
          <Field label="Ends">
            <input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} data-f="ends" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={f.firstOrderOnly} onChange={(e) => set('firstOrderOnly', e.target.checked)} className="h-4 w-4" data-f="first" /> First order only
        </label>
        <label className="flex items-start gap-2 text-sm font-bold">
          <input type="checkbox" checked={f.isPublic} onChange={(e) => set('isPublic', e.target.checked)} className="mt-0.5 h-4 w-4" data-f="public" />
          <span>
            Show in the app
            <span className="block text-xs font-normal text-ink-3">On the welcome page and in the cart’s offers. Untick for a code you share yourself (SMS, flyers, a partner).</span>
          </span>
        </label>
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || !ready} onClick={() => save.mutate()} data-save-coupon>
            {coupon ? 'Save' : 'Create coupon'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function UsedBy({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['coupon-used', coupon.id], queryFn: () => api<Redemption[]>(`/admin/coupons/${coupon.id}/redemptions`) });
  return (
    <Modal title={`Who used ${coupon.code}`} onClose={onClose} wide>
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {data && !data.length && <Empty>Nobody has used it yet.</Empty>}
      {!!data?.length && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-3">
            <tr>
              <th className="py-1.5">When</th>
              <th>Customer</th>
              <th>Order</th>
              <th className="text-right">Saved</th>
              <th className="text-right">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((r) => (
              <tr key={r.id} className={r.counted ? '' : 'text-ink-3'}>
                <td className="py-2">{fmtDate(r.at)}</td>
                <td>{r.customer}</td>
                <td>
                  {r.order.number} <span className="text-xs text-ink-3">· {r.order.shop}</span>
                  {!r.counted && <span className="block text-xs">{r.order.status.toLowerCase().replace('_', ' ')} — not counted</span>}
                </td>
                <td className="text-right tabular-nums">{rupees(r.saved)}</td>
                <td className="text-right tabular-nums">{rupees(r.order.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
