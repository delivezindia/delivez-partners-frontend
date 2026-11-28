import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../lib/api';
import { CAN, can } from '../lib/types';
import { Button, Card, Empty, ErrorBox, Field, fmtDate, inputCls, Modal, PageHead } from '../components/ui';
import { useMe } from './Layout';

type Status = 'SHIFT_ACTIVE' | 'ON_BREAK' | 'SHIFT_COMPLETED';
interface Row {
  id: string;
  rider: { id: string; code: string; name: string | null; phone: string; hub: string | null; online: boolean };
  status: Status;
  punchInAt: string;
  punchOutAt: string | null;
  workedMinutes: number;
  breakMinutes: number;
  breaks: number;
  vehicle: string | null;
  damageReported: boolean;
  endedBy: string | null;
  overdue: boolean;
}
interface List {
  date: string;
  summary: { shifts: number; onShift: number; onBreak: number; damageReports: number };
  items: Row[];
}
type Photo = { url: string | null; capturedAt: string | null } | null;
type Loc = { lat: number; lng: number; accuracyM: number | null; address: string | null } | null;
interface Detail {
  id: string;
  rider: { name: string | null; code: string; phone: string };
  status: Status;
  punchInAt: string;
  punchOutAt: string | null;
  selfie: Photo;
  location: Loc;
  punchOutSelfie: Photo;
  punchOutLocation: Loc;
  breaks: { id: string; startedAt: string; endedAt: string | null }[];
  workedMinutes: number;
  breakMinutes: number;
  vehicle: { registration: string } | null;
  vehicleVerification: { photoUrl: string | null; checks: { id: string; label: string }[] } | null;
  vehicleReturn: { photoUrl: string | null; newDamage: boolean; issueNote: string; closingOdometerKm: number | null } | null;
  endedBy: string | null;
  endNote: string | null;
}

const LABEL: Record<Status, { l: string; c: string }> = {
  SHIFT_ACTIVE: { l: 'On shift', c: 'bg-dz-green-soft text-dz-green border-dz-green' },
  ON_BREAK: { l: 'On break', c: 'bg-dz-yellow-soft text-ink border-dz-yellow-strong' },
  SHIFT_COMPLETED: { l: 'Punched out', c: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
};
const hm = (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`;
const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const time = (d: string | null) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

/** Rider punch in / punch out from the Delivez Agent app: who is working now, hours, breaks, vehicle checks. */
export default function Attendance() {
  const [date, setDate] = useState(today());
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['attendance', date], queryFn: () => api<List>(`/admin/attendance?date=${date}`), refetchInterval: 30_000 });

  return (
    <div className="space-y-5">
      <PageHead
        title="Attendance"
        sub="Riders punch in with a selfie and GPS (and check their company vehicle), take breaks, and punch out. Shifts still open from earlier days are listed too."
        actions={<input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} className={`${inputCls} w-44`} aria-label="Day" />}
      />
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Shifts', data.summary.shifts],
            ['On shift now', data.summary.onShift],
            ['On break', data.summary.onBreak],
            ['Vehicle damage reports', data.summary.damageReports],
          ].map(([l, n]) => (
            <Card key={l as string} className="p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-3">{l}</div>
              <div className="text-3xl font-black">{n}</div>
            </Card>
          ))}
        </div>
      )}
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {!isLoading && !data?.items.length && <Empty>No one punched in on this day.</Empty>}
      {!!data?.items.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">In</th>
                <th className="px-4 py-3">Out</th>
                <th className="px-4 py-3">Worked</th>
                <th className="px-4 py-3">Breaks</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-soft" onClick={() => setOpenId(r.id)} data-shift={r.id}>
                  <td className="px-4 py-3">
                    <button type="button" className="font-extrabold hover:text-dz-red">{r.rider.name ?? r.rider.code}</button>
                    <div className="text-xs text-ink-3">{[r.rider.code, r.rider.hub].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="px-4 py-3">{r.overdue ? fmtDate(r.punchInAt) : time(r.punchInAt)}</td>
                  <td className="px-4 py-3">{r.punchOutAt ? `${time(r.punchOutAt)}${r.endedBy === 'ADMIN' ? ' (by ops)' : ''}` : '—'}</td>
                  <td className="px-4 py-3">{hm(r.workedMinutes)}</td>
                  <td className="px-4 py-3">{r.breaks ? `${r.breaks} · ${hm(r.breakMinutes)}` : '—'}</td>
                  <td className="px-4 py-3">
                    {r.vehicle ?? 'Own vehicle'}
                    {r.damageReported && <div className="text-xs font-bold text-dz-red">Damage reported</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${LABEL[r.status].c}`}>{LABEL[r.status].l}</span>
                    {r.overdue && <div className="text-xs font-bold text-dz-red">Open since an earlier day</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {openId && <ShiftDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Pic({ label, p }: { label: string; p: Photo | { url: string | null } | null }) {
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-bold uppercase tracking-wide text-ink-3">{label}</figcaption>
      {p?.url ? (
        <a href={p.url} target="_blank" rel="noreferrer">
          <img src={p.url} alt={label} className="h-36 w-full rounded-lg border border-line bg-soft object-cover" />
        </a>
      ) : (
        <div className="grid h-36 place-items-center rounded-lg border border-dashed border-line text-xs text-ink-3">None</div>
      )}
    </figure>
  );
}
const where = (l: Loc) => (l ? `${l.address ?? `${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}`}${l.accuracyM != null ? ` (±${Math.round(l.accuracyM)} m)` : ''}` : '—');

function ShiftDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const { data: s, error } = useQuery({ queryKey: ['shift', id], queryFn: () => api<Detail>(`/admin/attendance/${id}`) });
  const end = useMutation({
    mutationFn: () => api(`/admin/attendance/${id}/end`, { method: 'POST', body: { note } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['shift', id] }); },
  });
  return (
    <Modal title={s ? `${s.rider.name ?? s.rider.code} · ${fmtDate(s.punchInAt)}` : 'Shift'} onClose={onClose} wide>
      <ErrorBox error={error ? errorText(error) : null} />
      {s && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">
            {LABEL[s.status].l} · worked {hm(s.workedMinutes)} · breaks {hm(s.breakMinutes)}
            {s.endedBy === 'ADMIN' && ` · ended by ops: ${s.endNote}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Pic label="Punch-in selfie" p={s.selfie} />
            <Pic label="Vehicle at punch-in" p={s.vehicleVerification ? { url: s.vehicleVerification.photoUrl } : null} />
            <Pic label="Punch-out selfie" p={s.punchOutSelfie} />
            <Pic label="Vehicle at return" p={s.vehicleReturn ? { url: s.vehicleReturn.photoUrl } : null} />
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="font-bold">Punched in at</dt><dd>{time(s.punchInAt)} · {where(s.location)}</dd></div>
            <div><dt className="font-bold">Punched out at</dt><dd>{s.punchOutAt ? `${time(s.punchOutAt)} · ${where(s.punchOutLocation)}` : 'Still on shift'}</dd></div>
            <div><dt className="font-bold">Vehicle</dt><dd>{s.vehicle?.registration ?? 'Own vehicle'}{s.vehicleVerification && ` · ${s.vehicleVerification.checks.length} checks confirmed`}</dd></div>
            <div>
              <dt className="font-bold">Vehicle return</dt>
              <dd>
                {s.vehicleReturn ? (
                  <>
                    {s.vehicleReturn.newDamage ? <b className="text-dz-red">Damage: {s.vehicleReturn.issueNote}</b> : 'No new damage'}
                    {s.vehicleReturn.closingOdometerKm != null && ` · ${s.vehicleReturn.closingOdometerKm.toLocaleString('en-IN')} km`}
                  </>
                ) : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2"><dt className="font-bold">Breaks</dt><dd>{s.breaks.length ? s.breaks.map((b) => `${time(b.startedAt)}–${b.endedAt ? time(b.endedAt) : 'now'}`).join(', ') : 'None'}</dd></div>
          </dl>
          {!s.punchOutAt && can(me?.role, CAN.riders) && (
            <form className="space-y-2 rounded-xl bg-soft p-4" onSubmit={(e) => { e.preventDefault(); end.mutate(); }}>
              <Field label="End this shift for the rider" hint="Only when they forgot to punch out. They go offline. Not possible while they carry an order.">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why, e.g. forgot to punch out" className={inputCls} />
              </Field>
              <ErrorBox error={end.error ? errorText(end.error) : null} />
              <Button type="submit" variant="dark" disabled={end.isPending || note.trim().length < 5}>End shift</Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
