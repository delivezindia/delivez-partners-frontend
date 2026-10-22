import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { CAN, can, type City } from '../lib/types';
import { Button, Card, Empty, ErrorBox, Field, inputCls, Modal, PageHead, Switch } from '../components/ui';
import { useMe } from './Layout';

// Cities, zones and serviceable PIN codes — where Delivez operates.
export default function Cities() {
  const { data: me } = useMe();
  const edit = can(me?.role, CAN.geo);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['cities'], queryFn: () => api<City[]>('/admin/cities') });
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = useMutation({
    mutationFn: (c: City) => api(`/admin/cities/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cities'] }),
  });
  const open = data?.find((c) => c.id === openId) ?? data?.[0];

  return (
    <div className="space-y-5">
      <PageHead
        title="Cities & zones"
        sub="Where partners can register and where we deliver. New cities start switched off."
        actions={
          edit && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add city
            </Button>
          )
        }
      />
      <ErrorBox error={toggle.error ? errorText(toggle.error) : null} />
      {isLoading && <p className="text-ink-3">Loading…</p>}
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2">
          {data?.map((c) => (
            <div key={c.id} className={`flex items-center gap-3 rounded-[14px] border bg-white p-4 ${open?.id === c.id ? 'border-black' : 'border-line'}`}>
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(c.id)}>
                <b className="block">{c.name}</b>
                <span className="text-xs text-ink-3">
                  {c.state} · {c.stores} stores · {c.serviceablePincodes}/{c.pincodes} PINs live
                </span>
              </button>
              <Switch on={c.isActive} label={`${c.name} active`} disabled={!edit || toggle.isPending} onChange={() => toggle.mutate(c)} />
            </div>
          ))}
        </div>
        {open && <CityDetail key={open.id} city={open} edit={edit} />}
      </div>
      {adding && <AddCity onClose={() => setAdding(false)} />}
    </div>
  );
}

function CityDetail({ city, edit }: { city: City; edit: boolean }) {
  const qc = useQueryClient();
  const [zone, setZone] = useState('');
  const [codes, setCodes] = useState('');
  const [zoneId, setZoneId] = useState('');
  const pins = useQuery({ queryKey: ['pincodes', city.id], queryFn: () => api<{ code: string; serviceable: boolean; zone: { id: string; name: string } | null }[]>(`/admin/cities/${city.id}/pincodes`) });
  const refresh = () => (qc.invalidateQueries({ queryKey: ['cities'] }), qc.invalidateQueries({ queryKey: ['pincodes', city.id] }));
  const addZone = useMutation({ mutationFn: () => api(`/admin/cities/${city.id}/zones`, { method: 'POST', body: { name: zone } }), onSuccess: () => (setZone(''), refresh()) });
  const toggleZone = useMutation({ mutationFn: (z: City['zones'][number]) => api(`/admin/zones/${z.id}`, { method: 'PATCH', body: { isActive: !z.isActive } }), onSuccess: refresh });
  const savePins = useMutation({
    mutationFn: (body: { codes: string | string[]; serviceable: boolean; zoneId?: string | null }) => api<{ saved: number }>(`/admin/cities/${city.id}/pincodes`, { method: 'POST', body }),
    onSuccess: () => (setCodes(''), refresh()),
  });
  const err = addZone.error ?? toggleZone.error ?? savePins.error;

  return (
    <div className="space-y-5">
      <Card title={`${city.name}, ${city.state}`}>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          <MapPin className="h-4 w-4" /> Centre {city.centerLat.toFixed(4)}, {city.centerLng.toFixed(4)} · {city.isActive ? 'Active' : 'Switched off'}
        </p>
        <ErrorBox error={err ? errorText(err) : null} />
      </Card>

      <Card title={`Zones (${city.zones.length})`}>
        {city.zones.length === 0 && <Empty>No zones yet. Zones group PIN codes into delivery areas.</Empty>}
        <ul className="divide-y divide-line">
          {city.zones.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <b>{z.name}</b>
                <span className="block text-xs text-ink-3">
                  {z.stores} stores · {z.pincodes} PIN codes
                </span>
              </span>
              <Switch on={z.isActive} label={`${z.name} active`} disabled={!edit} onChange={() => toggleZone.mutate(z)} />
            </li>
          ))}
        </ul>
        {edit && (
          <form className="mt-3 flex gap-2" onSubmit={(e) => (e.preventDefault(), zone.trim() && addZone.mutate())}>
            <input className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)} placeholder="New zone, e.g. Indiranagar" maxLength={60} />
            <Button variant="dark" disabled={!zone.trim() || addZone.isPending}>
              Add zone
            </Button>
          </form>
        )}
      </Card>

      <Card title={`PIN codes (${pins.data?.length ?? 0})`}>
        {edit && (
          <div className="mb-4 space-y-2 rounded-xl bg-soft p-3">
            <Field label="Add PIN codes" hint="Paste one or many, separated by commas, spaces or new lines">
              <textarea className={`${inputCls} h-20 py-2 font-mono`} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="560038, 560008, 560071" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <select className={`${inputCls} w-auto`} value={zoneId} onChange={(e) => setZoneId(e.target.value)} aria-label="Zone for these PIN codes">
                <option value="">No zone</option>
                {city.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <Button variant="green" disabled={!codes.trim() || savePins.isPending} onClick={() => savePins.mutate({ codes, serviceable: true, zoneId: zoneId || null })}>
                Save as serviceable
              </Button>
            </div>
          </div>
        )}
        {pins.data?.length === 0 && <Empty>No PIN codes yet.</Empty>}
        <div className="flex flex-wrap gap-2">
          {pins.data?.map((p) => (
            <button
              key={p.code}
              type="button"
              disabled={!edit || savePins.isPending}
              onClick={() => savePins.mutate({ codes: [p.code], serviceable: !p.serviceable })}
              title={edit ? (p.serviceable ? 'Click to stop serving' : 'Click to start serving') : undefined}
              className={`rounded-lg border px-2.5 py-1 font-mono text-sm ${p.serviceable ? 'border-dz-green bg-dz-green-soft text-dz-green' : 'border-line bg-white text-ink-3 line-through'}`}
            >
              {p.code}
              {p.zone && <span className="ml-1 font-sans text-[11px] opacity-70">{p.zone.name}</span>}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AddCity({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', state: '', centerLat: '', centerLng: '' });
  const save = useMutation({
    mutationFn: () => api('/admin/cities', { method: 'POST', body: { ...f, centerLat: Number(f.centerLat), centerLng: Number(f.centerLng) } }),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['cities'] }), onClose()),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Add city" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input className={inputCls} value={f.name} onChange={set('name')} autoFocus />
          </Field>
          <Field label="State">
            <input className={inputCls} value={f.state} onChange={set('state')} placeholder="Karnataka" />
          </Field>
          <Field label="Centre latitude">
            <input className={inputCls} value={f.centerLat} onChange={set('centerLat')} inputMode="decimal" placeholder="12.9716" />
          </Field>
          <Field label="Centre longitude">
            <input className={inputCls} value={f.centerLng} onChange={set('centerLng')} inputMode="decimal" placeholder="77.5946" />
          </Field>
        </div>
        <p className="text-xs text-ink-3">The city starts switched off. Add zones and PIN codes, then switch it on.</p>
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || !f.name.trim() || !f.state.trim() || !f.centerLat || !f.centerLng} onClick={() => save.mutate()}>
            Add city
          </Button>
        </div>
      </div>
    </Modal>
  );
}
