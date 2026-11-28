import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { LEVEL_NAME, type GeoArea, type GeoCity, type GeoDistrict, type GeoPin, type GeoStateNode, type GeoTree, type GeoZone } from '../lib/types';
import { Button, Card, ErrorBox, Field, inputCls, Modal, PageHead, Switch } from '../components/ui';
import { useMe } from './Layout';

type Adding =
  | { kind: 'zone' }
  | { kind: 'state'; parent: GeoZone }
  | { kind: 'district'; parent: GeoStateNode }
  | { kind: 'city'; parent: GeoDistrict }
  | { kind: 'area'; parent: GeoCity }
  | { kind: 'pins'; city: GeoCity; area?: GeoArea };

/**
 * The map behind areas of work: Zone → State → District → City → Area → PIN code.
 * Each row shows what it holds; you can add or switch off only places below your own level, inside your area.
 */
export default function GeoMap() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const tree = useQuery({ queryKey: ['geo-tree'], queryFn: () => api<GeoTree>('/admin/geo/tree') });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Adding | null>(null);
  const refresh = () => (qc.invalidateQueries({ queryKey: ['geo-tree'] }), qc.invalidateQueries({ queryKey: ['cities'] }));
  const toggle = useMutation({ mutationFn: ({ url, isActive }: { url: string; isActive: boolean }) => api(url, { method: 'PATCH', body: { isActive } }), onSuccess: refresh });
  const flip = (id: string) => setOpen((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));
  const expandAll = () => {
    const ids = new Set<string>();
    for (const z of tree.data?.zones ?? []) {
      ids.add(z.id);
      for (const s of z.states) {
        ids.add(s.id);
        for (const d of s.districts) {
          ids.add(d.id);
          for (const c of d.cities) ids.add(c.id);
        }
      }
    }
    setOpen(ids);
  };

  const row = (p: { id: string; level: keyof typeof LEVEL_NAME; name: ReactNode; meta: string; covered: boolean; isActive: boolean; canEdit: boolean; url?: string; depth: number; hasKids: boolean; add?: ReactNode }) => (
    <div className={`flex flex-wrap items-center gap-2 border-b border-line py-2 ${p.covered ? '' : 'opacity-60'}`} style={{ paddingLeft: p.depth * 22 }} data-node={p.level} data-name={typeof p.name === 'string' ? p.name : undefined}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => p.hasKids && flip(p.id)} aria-expanded={p.hasKids ? open.has(p.id) : undefined}>
        {p.hasKids ? open.has(p.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
        <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-2">{LEVEL_NAME[p.level]}</span>
        <b className="truncate">{p.name}</b>
        <span className="truncate text-xs text-ink-3">{p.meta}</span>
        {!p.covered && <span className="text-xs text-ink-3">· above your area</span>}
      </button>
      {p.add}
      {p.url && <Switch on={p.isActive} label={`${typeof p.name === 'string' ? p.name : ''} on`} disabled={!p.canEdit || toggle.isPending} onChange={(v) => toggle.mutate({ url: p.url!, isActive: v })} />}
    </div>
  );
  const addBtn = (label: string, a: Adding, show: boolean) =>
    show && (
      <button type="button" className="rounded-md border border-line px-2 py-1 text-xs font-bold hover:border-black" onClick={() => setAdding(a)} data-add={a.kind}>
        <Plus className="inline h-3 w-3" /> {label}
      </button>
    );
  const pinList = (pins: GeoPin[], depth: number) =>
    pins.length > 0 && (
      <div className="flex flex-wrap gap-1 border-b border-line py-2" style={{ paddingLeft: depth * 22 + 22 }}>
        {pins.map((p) => (
          <span key={p.code} className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${p.serviceable ? 'border-dz-green text-dz-green' : 'border-line text-ink-3 line-through'} ${p.covered ? '' : 'opacity-60'}`} title={`${p.serviceable ? 'Delivering' : 'Not delivering'}${p.team ? ` · ${p.team} in the team` : ''}`}>
            {p.code}
          </span>
        ))}
      </div>
    );
  const count = (n: { stores: number; riders?: number; team: number }) => `${n.stores} shops${n.riders !== undefined ? ` · ${n.riders} riders` : ''}${n.team ? ` · ${n.team} in the team` : ''}`;

  const city = (c: GeoCity, depth: number) => (
    <div key={c.id}>
      {row({ id: c.id, level: 'CITY', name: c.name, meta: count(c), covered: c.covered, isActive: c.isActive, canEdit: c.canEdit, url: `/admin/cities/${c.id}`, depth, hasKids: c.areas.length > 0 || c.pincodes.length > 0, add: <>{addBtn('Area', { kind: 'area', parent: c }, c.canAddAreas)}{addBtn('PIN codes', { kind: 'pins', city: c }, c.canAddAreas)}</> })}
      {open.has(c.id) && (
        <>
          {c.areas.map((a) => (
            <div key={a.id}>
              {row({ id: a.id, level: 'AREA', name: a.name, meta: `${a.stores} shops · ${a.pincodes.length} PIN codes${a.team ? ` · ${a.team} in the team` : ''}`, covered: a.covered, isActive: a.isActive, canEdit: a.canEdit, url: `/admin/zones/${a.id}`, depth: depth + 1, hasKids: false, add: addBtn('PIN codes', { kind: 'pins', city: c, area: a }, a.canAddPincodes) })}
              {pinList(a.pincodes, depth + 1)}
            </div>
          ))}
          {c.pincodes.length > 0 && (
            <>
              <p className="pt-2 text-xs font-bold text-ink-3" style={{ paddingLeft: (depth + 1) * 22 + 22 }}>
                PIN codes not in an area yet
              </p>
              {pinList(c.pincodes, depth + 1)}
            </>
          )}
        </>
      )}
    </div>
  );

  const err = toggle.error;
  return (
    <div className="space-y-5">
      <PageHead
        title="Map & areas"
        sub={me?.scope.level === 'NATIONAL' ? 'Zones → states → districts → cities → areas → PIN codes. Give people an area of work on the Team page.' : `Your area: ${me?.scope.label}. You can add and switch off places below your level inside it.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={expandAll}>
              Open all
            </Button>
            {tree.data?.me.canAddZones && (
              <Button onClick={() => setAdding({ kind: 'zone' })} data-add="zone">
                <Plus className="h-4 w-4" /> Add zone
              </Button>
            )}
          </div>
        }
      />
      <ErrorBox error={err ? errorText(err) : tree.error ? errorText(tree.error) : null} />
      <Card>
        {tree.isLoading && <p className="text-ink-3">Loading…</p>}
        {tree.data?.zones.map((z) => (
          <div key={z.id}>
            {row({ id: z.id, level: 'ZONE', name: z.name, meta: `${z.states.length} states · ${count(z)}`, covered: z.covered, isActive: z.isActive, canEdit: z.canEdit, url: `/admin/geo/zones/${z.id}`, depth: 0, hasKids: z.states.length > 0, add: addBtn('State', { kind: 'state', parent: z }, z.canAddStates) })}
            {open.has(z.id) &&
              z.states.map((s) => (
                <div key={s.id}>
                  {row({ id: s.id, level: 'STATE', name: `${s.name} (${s.code})`, meta: `${s.districts.length} districts · ${count(s)}`, covered: s.covered, isActive: s.isActive, canEdit: s.canEdit, url: `/admin/geo/states/${s.id}`, depth: 1, hasKids: s.districts.length > 0, add: addBtn('District', { kind: 'district', parent: s }, s.canAddDistricts) })}
                  {open.has(s.id) &&
                    s.districts.map((d) => (
                      <div key={d.id}>
                        {row({ id: d.id, level: 'DISTRICT', name: d.name, meta: `${d.cities.length} cities · ${count(d)}`, covered: d.covered, isActive: d.isActive, canEdit: d.canEdit, url: `/admin/geo/districts/${d.id}`, depth: 2, hasKids: d.cities.length > 0, add: addBtn('City', { kind: 'city', parent: d }, d.canAddCities) })}
                        {open.has(d.id) && d.cities.map((c) => city(c, 3))}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ))}
        {!!tree.data?.unplacedCities.length && (
          <>
            <p className="pt-4 text-sm font-bold">Cities not in a district yet</p>
            {tree.data.unplacedCities.map((c) => city(c, 0))}
          </>
        )}
      </Card>
      {adding && <AddPlace adding={adding} onClose={() => setAdding(null)} onDone={refresh} />}
    </div>
  );
}

function AddPlace({ adding, onClose, onDone }: { adding: Adding; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [pins, setPins] = useState('');
  const save = useMutation({
    mutationFn: () => {
      switch (adding.kind) {
        case 'zone':
          return api('/admin/geo/zones', { method: 'POST', body: { name } });
        case 'state':
          return api('/admin/geo/states', { method: 'POST', body: { name, code, regionId: adding.parent.id } });
        case 'district':
          return api('/admin/geo/districts', { method: 'POST', body: { name, stateId: adding.parent.id } });
        case 'city':
          return api('/admin/cities', { method: 'POST', body: { name, districtId: adding.parent.id, centerLat: Number(lat), centerLng: Number(lng) } });
        case 'area':
          return api(`/admin/cities/${adding.parent.id}/zones`, { method: 'POST', body: { name } });
        case 'pins':
          return api(`/admin/cities/${adding.city.id}/pincodes`, { method: 'POST', body: { codes: pins, zoneId: adding.area?.id ?? null, serviceable: true } });
      }
    },
    onSuccess: () => (onDone(), onClose()),
  });
  const title =
    adding.kind === 'zone' ? 'Add zone' : adding.kind === 'state' ? `Add state to ${adding.parent.name} zone` : adding.kind === 'district' ? `Add district to ${adding.parent.name}` : adding.kind === 'city' ? `Add city to ${adding.parent.name} district` : adding.kind === 'area' ? `Add area to ${adding.parent.name}` : `Add PIN codes to ${adding.area ? `${adding.area.name}, ` : ''}${adding.city.name}`;
  const ready = adding.kind === 'pins' ? pins.trim().length >= 6 : name.trim().length >= 2 && (adding.kind !== 'state' || code.trim().length >= 2) && (adding.kind !== 'city' || (lat && lng));

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        {adding.kind !== 'pins' && (
          <Field label="Name" hint={adding.kind === 'area' ? 'A neighbourhood, e.g. Indiranagar' : adding.kind === 'zone' ? 'e.g. South' : undefined}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus data-place-name />
          </Field>
        )}
        {adding.kind === 'state' && (
          <Field label="State code" hint="2–3 letters, as on number plates (KA, TN, DL)">
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={3} />
          </Field>
        )}
        {adding.kind === 'city' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Centre latitude">
              <input className={inputCls} inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="12.97" />
            </Field>
            <Field label="Centre longitude">
              <input className={inputCls} inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="77.59" />
            </Field>
            <p className="col-span-2 text-xs text-ink-3">New cities start switched off, so nothing goes live there by accident.</p>
          </div>
        )}
        {adding.kind === 'pins' && (
          <Field label="PIN codes" hint="Paste several: separated by commas, spaces or new lines">
            <textarea className={`${inputCls} h-28 py-2`} value={pins} onChange={(e) => setPins(e.target.value)} placeholder="560038, 560008" autoFocus data-pins />
          </Field>
        )}
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()} data-save-place>
            {save.isPending ? 'Saving…' : 'Add'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
