import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { CAN, can } from '../lib/types';
import { Button, Card, Empty, ErrorBox, Field, fmtDate, inputCls, Modal, PageHead } from '../components/ui';
import { VEHICLE } from './RiderReview';
import { useMe } from './Layout';

type VStatus = 'ACTIVE' | 'IN_REPAIR' | 'RETIRED';
interface Vehicle {
  id: string;
  registration: string;
  category: string;
  description: string;
  hubName: string | null;
  status: VStatus;
  lastOdometerKm: number | null;
  assignedAt: string | null;
  rider: { id: string; code: string; name: string | null; phone: string; online: boolean } | null;
  inUse: { shiftId: string; since: string } | null;
}
interface RiderRow {
  riderId: string;
  riderCode: string;
  name: string | null;
  phone: string;
  vehicleProvider: string | null;
  vehicleCategory: string | null;
}

const CATS = ['BIKE', 'THREE_WHEELER', 'FOUR_WHEELER', 'TRUCK'];
const STATUS: Record<VStatus, { l: string; c: string }> = {
  ACTIVE: { l: 'In service', c: 'bg-dz-green-soft text-dz-green border-dz-green' },
  IN_REPAIR: { l: 'In repair', c: 'bg-amber-50 text-amber-800 border-amber-400' },
  RETIRED: { l: 'Retired', c: 'bg-neutral-100 text-neutral-500 border-neutral-300' },
};
const plate = (r: string) => r.replace(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/, '$1 $2 $3 $4').replace(/\s+/g, ' ');

/** Company vehicles for riders who signed up with "Company-Provided Vehicle". The rider checks the vehicle at punch-in. */
export default function Fleet() {
  const { data: me } = useMe();
  const canEdit = can(me?.role, CAN.riders);
  const qc = useQueryClient();
  const [status, setStatus] = useState<VStatus | ''>('ACTIVE');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<Vehicle | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const q = new URLSearchParams({ ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ['fleet', status, search], queryFn: () => api<{ items: Vehicle[] }>(`/admin/fleet/vehicles?${q}`), refetchInterval: 30_000 });
  const done = () => { setErr(null); qc.invalidateQueries({ queryKey: ['fleet'] }); };
  const act = useMutation({
    mutationFn: ({ v, path, body, method = 'POST' }: { v: Vehicle; path: string; body?: unknown; method?: string }) => api(`/admin/fleet/vehicles/${v.id}${path}`, { method, body: body ?? {} }),
    onSuccess: done,
    onError: (e) => setErr(errorText(e)),
  });

  return (
    <div className="space-y-5">
      <PageHead
        title="Vehicles"
        sub="Company vehicles. Give one to a rider who signed up for a company vehicle; they check it with a photo when they punch in and return it when they punch out."
        actions={canEdit && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Add vehicle</Button>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b-[1.5px] border-line" role="tablist">
          {(['ACTIVE', 'IN_REPAIR', 'RETIRED', ''] as const).map((s) => (
            <button key={s || 'all'} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`-mb-[1.5px] border-b-[3px] px-3 py-2.5 text-sm font-bold ${status === s ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {s ? STATUS[s].l : 'All'}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Number plate, rider or note" className={`${inputCls} max-w-xs`} aria-label="Search vehicles" />
      </div>
      <ErrorBox error={err} />
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {!isLoading && !data?.items.length && <Empty>No vehicles here yet.{canEdit && ' Add one with "Add vehicle".'}</Empty>}
      {!!data?.items.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Right now</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {data.items.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0 hover:bg-soft" data-vehicle={v.registration}>
                  <td className="px-4 py-3">
                    <b className="font-extrabold">{plate(v.registration)}</b>
                    <div className="text-xs text-ink-3">{[VEHICLE[v.category] ?? v.category, v.description, v.hubName].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="px-4 py-3">
                    {v.rider ? (
                      <>
                        {v.rider.name ?? v.rider.code}
                        <div className="text-xs text-ink-3">{v.rider.code} · since {fmtDate(v.assignedAt)}</div>
                      </>
                    ) : (
                      <span className="text-ink-3">Not given to anyone</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{v.inUse ? <span className="font-bold text-dz-green">Out on a shift since {fmtDate(v.inUse.since)}</span> : <span className="text-ink-3">At the hub</span>}</td>
                  <td className="px-4 py-3">{v.lastOdometerKm != null ? `${v.lastOdometerKm.toLocaleString('en-IN')} km` : '—'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS[v.status].c}`}>{STATUS[v.status].l}</span></td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {v.status === 'ACTIVE' && <Button variant="outline" className="min-h-8 px-3" onClick={() => setAssigning(v)}>{v.rider ? 'Change rider' : 'Give to rider'}</Button>}
                        {v.rider && !v.inUse && <Button variant="outline" className="min-h-8 px-3" disabled={act.isPending} onClick={() => act.mutate({ v, path: '/unassign' })}>Take back</Button>}
                        {v.status === 'ACTIVE' && !v.inUse && <Button variant="outline" className="min-h-8 px-3" disabled={act.isPending} onClick={() => act.mutate({ v, path: '', method: 'PATCH', body: { status: 'IN_REPAIR' } })}>In repair</Button>}
                        {v.status === 'IN_REPAIR' && <Button variant="outline" className="min-h-8 px-3" disabled={act.isPending} onClick={() => act.mutate({ v, path: '', method: 'PATCH', body: { status: 'ACTIVE' } })}>Back in service</Button>}
                        {v.status !== 'RETIRED' && !v.inUse && (
                          <Button variant="outline" className="min-h-8 px-3" disabled={act.isPending} onClick={() => window.confirm(`Retire ${plate(v.registration)}? It is taken off its rider.`) && act.mutate({ v, path: '', method: 'PATCH', body: { status: 'RETIRED' } })}>Retire</Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {adding && <AddVehicle onClose={() => setAdding(false)} onDone={() => { setAdding(false); done(); }} />}
      {assigning && <AssignRider v={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); done(); }} />}
    </div>
  );
}

function AddVehicle({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ registration: '', category: 'BIKE', description: '', hubName: '' });
  const save = useMutation({ mutationFn: () => api('/admin/fleet/vehicles', { method: 'POST', body: { ...f, description: f.description || undefined, hubName: f.hubName || undefined } }), onSuccess: onDone });
  return (
    <Modal title="Add vehicle" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Number plate" hint="As on the RC, e.g. KA 51 AB 1234"><input required value={f.registration} onChange={(e) => setF({ ...f, registration: e.target.value })} className={inputCls} /></Field>
        <Field label="Type">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputCls}>
            {CATS.map((c) => <option key={c} value={c}>{VEHICLE[c] ?? c}</option>)}
          </select>
        </Field>
        <Field label="Make / model or note (optional)"><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></Field>
        <Field label="Hub (optional)"><input value={f.hubName} onChange={(e) => setF({ ...f, hubName: e.target.value })} className={inputCls} /></Field>
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <Button type="submit" disabled={save.isPending || !f.registration.trim()}>Add vehicle</Button>
      </form>
    </Modal>
  );
}

function AssignRider({ v, onClose, onDone }: { v: Vehicle; onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState('');
  const q = new URLSearchParams({ status: 'APPROVED', pageSize: '100', ...(search.trim() ? { search: search.trim() } : {}) });
  const { data } = useQuery({ queryKey: ['rider-apps', 'APPROVED', search], queryFn: () => api<{ items: RiderRow[] }>(`/admin/riders/applications?${q}`) });
  const riders = (data?.items ?? []).filter((r) => r.vehicleProvider === 'COMPANY_PROVIDED');
  const save = useMutation({ mutationFn: (riderId: string) => api(`/admin/fleet/vehicles/${v.id}/assign`, { method: 'POST', body: { riderId } }), onSuccess: onDone });
  return (
    <Modal title={`Give ${plate(v.registration)} to`} onClose={onClose}>
      <p className="mb-3 text-sm text-ink-2">Approved riders who signed up for a company vehicle. A rider can have one vehicle; giving them this one takes back the other.</p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or rider code" className={`${inputCls} mb-3`} aria-label="Search riders" />
      <ErrorBox error={save.error ? errorText(save.error) : null} />
      <ul className="divide-y divide-line">
        {riders.map((r) => {
          const same = r.vehicleCategory === v.category;
          return (
            <li key={r.riderId} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <b>{r.name ?? r.riderCode}</b>
                <div className="text-xs text-ink-3">{r.riderCode} · company {(VEHICLE[r.vehicleCategory ?? ''] ?? r.vehicleCategory ?? '').toLowerCase()}{!same && ' · different vehicle type'}</div>
              </div>
              <Button variant={same ? 'red' : 'outline'} className="min-h-8 px-3" disabled={save.isPending || !same || v.rider?.id === r.riderId} onClick={() => save.mutate(r.riderId)}>
                {v.rider?.id === r.riderId ? 'Has it' : 'Give'}
              </Button>
            </li>
          );
        })}
        {!riders.length && <li className="py-6 text-center text-ink-3">No approved company-vehicle riders{search ? ' match' : ' yet'}.</li>}
      </ul>
    </Modal>
  );
}
