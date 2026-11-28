import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { ALL_ROLES, AREA_ROLES, FIELD_ROLES, LEVEL_NAME, LEVELS, ROLE_LEVEL, type AdminRole, type AreaRole, type GeoLevel, type GeoTree, type TeamMember } from '../lib/types';
import { Button, Card, ErrorBox, Field, fmtDate, inputCls, Modal, PageHead, Switch } from '../components/ui';
import { useMe } from './Layout';

export const ROLE_HELP: Record<AdminRole, string> = {
  FOUNDER: 'Everything, including the team and legal',
  HEAD_OF_OPS: 'Everything except legal; manages the team',
  ZONE_HEAD: 'One zone (e.g. South): approve, suspend, reinstate shops; riders; documents; adds state heads and below',
  STATE_HEAD: 'One state: approve and suspend shops; riders; documents; adds district managers and below',
  DISTRICT_MANAGER: 'One district: approve shops, riders, driver assignment; adds area managers and below',
  AREA_MANAGER: 'Areas of a city: pause / resume shops, orders, drivers, support; adds PIN-code executives',
  PINCODE_EXECUTIVE: 'A few PIN codes: watch orders, pause / resume shops, assign drivers, support',
  REGIONAL_HEAD: 'Approve, suspend, reinstate stores; cities',
  CITY_OPS: 'Approve stores, pause/resume, notices',
  COMPLIANCE: 'Verify documents, approve, suspend; audit log',
  FINANCE: 'View only (payouts later)',
  LEGAL: 'Publish legal versions; audit log',
  SUPPORT: 'View; switch partner staff logins on/off',
  SALES_AGENT: 'No console access yet',
  AUDITOR: 'View; audit log',
  ACCOUNT_MANAGER: 'Mobile view of assigned stores only: health, churn risk, calls, tasks; can adjust prep time',
  DISPATCHER: 'Driver assignment only: logs in and sees nothing but Driver assignment (assign, change, remove drivers) inside their area of work',
};
export const roleName = (r: AdminRole) => (r === 'DISPATCHER' ? 'driver assignment only' : r === 'PINCODE_EXECUTIVE' ? 'PIN-code executive' : r.replace(/_/g, ' ').toLowerCase());
const SENIOR: AdminRole[] = ['FOUNDER', 'HEAD_OF_OPS'];
const rank = (l: GeoLevel) => LEVELS.indexOf(l);

// Admin team: who can use the console, with what role and in which part of the map.
export default function Team() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ['team'], queryFn: () => api<TeamMember[]>('/admin/team') });
  const tree = useQuery({ queryKey: ['geo-tree'], queryFn: () => api<GeoTree>('/admin/geo/tree') });
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);
  const toggle = useMutation({
    mutationFn: (m: TeamMember) => api(`/admin/team/${m.id}`, { method: 'PATCH', body: { isActive: !m.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
  const myLevel = me?.scope.level ?? 'NATIONAL';
  // Same rules as the API: national admins give any role (only a founder gives senior roles);
  // an area manager gives only area roles below their level, or a field role, inside their area.
  const canGrant = (r: AdminRole) => {
    if (SENIOR.includes(r)) return me?.role === 'FOUNDER';
    if (myLevel === 'NATIONAL') return true;
    const l = ROLE_LEVEL[r as AreaRole];
    return l ? rank(l) > rank(myLevel) : FIELD_ROLES.includes(r);
  };

  return (
    <div className="space-y-5">
      <PageHead
        title="Admin team"
        sub={myLevel === 'NATIONAL' ? 'Everyone logs in with their own phone. Changes apply immediately.' : `Your area: ${me?.scope.label}. You see and add only people inside it, below your level.`}
        actions={
          <div className="flex gap-2">
            <Link to="/permissions" className="rounded-lg border-[1.5px] border-black px-3 py-2 text-sm font-bold hover:bg-black/5">
              Roles &amp; permissions
            </Link>
            <Button onClick={() => setEditing('new')} data-add-admin>
              <Plus className="h-4 w-4" /> Add admin
            </Button>
          </div>
        }
      />
      <ErrorBox error={toggle.error ? errorText(toggle.error) : null} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="pb-2">Person</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Area of work</th>
                <th className="pb-2">Last login</th>
                <th className="pb-2">Access</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.data?.map((m) => {
                const self = m.phone === me?.user.phone;
                const locked = self || !canGrant(m.role);
                return (
                  <tr key={m.id} className={m.isActive ? '' : 'opacity-50'} data-member={m.phone}>
                    <td className="py-3">
                      <b className="block">{m.fullName ?? '—'}</b>
                      <span className="text-xs text-ink-3">{m.phone}</span>
                    </td>
                    <td className="py-3">
                      <b>{roleName(m.role)}</b>
                      <span className="block text-xs text-ink-3">{ROLE_HELP[m.role]}</span>
                    </td>
                    <td className="py-3" data-scope>
                      <span className="mr-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold">{LEVEL_NAME[m.scope.level]}</span>
                      {m.scope.level !== 'NATIONAL' && m.scope.label}
                    </td>
                    <td className="py-3 text-ink-2">{fmtDate(m.lastLoginAt)}</td>
                    <td className="py-3">
                      <Switch on={m.isActive} label={`${m.fullName ?? m.phone} access`} disabled={locked || toggle.isPending} onChange={() => toggle.mutate(m)} />
                    </td>
                    <td className="py-3 text-right">
                      {self ? (
                        <span className="text-xs text-ink-3">You</span>
                      ) : (
                        !locked && (
                          <button className="font-bold underline" onClick={() => setEditing(m)}>
                            Edit
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && tree.data && <AdminForm member={editing === 'new' ? null : editing} tree={tree.data} myLevel={myLevel} roles={ALL_ROLES.filter(canGrant)} onClose={() => setEditing(null)} />}
    </div>
  );
}

type Option = { id: string; label: string; sub: string };

/** Every place you may give access to, by level (only what lies inside your own area). */
function placesByLevel(tree: GeoTree): Record<GeoLevel, Option[]> {
  const out: Record<GeoLevel, Option[]> = { NATIONAL: [], ZONE: [], STATE: [], DISTRICT: [], CITY: [], AREA: [], PINCODE: [] };
  for (const z of tree.zones) {
    if (z.covered) out.ZONE.push({ id: z.id, label: `${z.name} zone`, sub: `${z.states.length} states` });
    for (const s of z.states) {
      if (s.covered) out.STATE.push({ id: s.id, label: s.name, sub: `${z.name} zone` });
      for (const d of s.districts) {
        if (d.covered) out.DISTRICT.push({ id: d.id, label: d.name, sub: s.name });
        for (const c of d.cities) {
          if (c.covered) out.CITY.push({ id: c.id, label: c.name, sub: `${d.name} district` });
          for (const a of c.areas) {
            if (a.covered) out.AREA.push({ id: a.id, label: a.name, sub: c.name });
            for (const p of a.pincodes) if (p.covered) out.PINCODE.push({ id: p.code, label: p.code, sub: `${a.name}, ${c.name}` });
          }
          for (const p of c.pincodes) if (p.covered) out.PINCODE.push({ id: p.code, label: p.code, sub: c.name });
        }
      }
    }
  }
  return out;
}

function AdminForm({ member, tree, myLevel, roles, onClose }: { member: TeamMember | null; tree: GeoTree; myLevel: GeoLevel; roles: AdminRole[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>(member?.role ?? roles.find((r) => AREA_ROLES.includes(r as AreaRole)) ?? roles[0]);
  const fixed = ROLE_LEVEL[role as AreaRole] as GeoLevel | undefined;
  // Levels this role may work at: area roles are fixed; others any level you cover (national admins: all of India too).
  const levels = fixed ? [fixed] : LEVELS.filter((l) => (myLevel === 'NATIONAL' ? true : l !== 'NATIONAL' && rank(l) >= rank(myLevel)));
  const [levelPick, setLevel] = useState<GeoLevel>(member?.scope.level ?? levels[0]);
  const level = levels.includes(levelPick) ? levelPick : levels[0];
  const [ids, setIds] = useState<string[]>(member?.scope.ids ?? []);
  const [q, setQ] = useState('');
  const places = useMemo(() => placesByLevel(tree), [tree]);
  const options = places[level].filter((o) => !q || `${o.label} ${o.sub}`.toLowerCase().includes(q.toLowerCase()));
  const chosen = level === 'NATIONAL' ? [] : ids.filter((id) => places[level].some((o) => o.id === id));

  const body = { role, scopeLevel: level, scopeIds: chosen };
  const save = useMutation({
    mutationFn: () => (member ? api(`/admin/team/${member.id}`, { method: 'PATCH', body }) : api('/admin/team', { method: 'POST', body: { phone, fullName: name, ...body } })),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['team'] }), qc.invalidateQueries({ queryKey: ['geo-tree'] }), onClose()),
  });
  const flip = (id: string) => setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const missing = level !== 'NATIONAL' && chosen.length === 0;

  return (
    <Modal title={member ? `Edit ${member.fullName ?? member.phone}` : 'Add admin'} onClose={onClose}>
      <div className="space-y-4">
        {!member && (
          <>
            <Field label="Mobile number" hint="They log in with this number and an OTP">
              <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98450 12345" autoFocus data-phone />
            </Field>
            <Field label="Full name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} data-name />
            </Field>
          </>
        )}
        <Field label="Role" hint={ROLE_HELP[role]}>
          <select
            className={inputCls}
            value={role}
            onChange={(e) => {
              const r = e.target.value as AdminRole;
              setRole(r);
              // Start the new role on its own level (area roles) or the widest level you can give.
              setLevel((ROLE_LEVEL[r as AreaRole] as GeoLevel | undefined) ?? (myLevel === 'NATIONAL' ? 'NATIONAL' : myLevel));
              setIds([]);
            }}
            data-role
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleName(r)}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="text-sm font-bold">Area of work</p>
          <p className="text-xs text-ink-3">
            {fixed
              ? `A ${roleName(role)} works on ${LEVEL_NAME[fixed].toLowerCase()} level: tick the ${fixed === 'PINCODE' ? 'PIN codes' : `${LEVEL_NAME[fixed].toLowerCase()}(s)`} they look after.`
              : 'They see and act only inside the places you tick.'}
          </p>
          {levels.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Level">
              {levels.map((l) => (
                <button
                  type="button"
                  key={l}
                  role="radio"
                  aria-checked={level === l}
                  onClick={() => (setLevel(l), setIds([]))}
                  className={`rounded-full border-[1.5px] px-3 py-1 text-xs font-bold ${level === l ? 'border-black bg-black text-white' : 'border-line'}`}
                  data-level={l}
                >
                  {LEVEL_NAME[l]}
                </button>
              ))}
            </div>
          )}
          {level !== 'NATIONAL' && (
            <>
              {places[level].length > 12 && <input className={`${inputCls} mt-2`} placeholder={`Search ${LEVEL_NAME[level].toLowerCase()}s`} value={q} onChange={(e) => setQ(e.target.value)} />}
              <div className="mt-2 flex max-h-60 flex-wrap gap-2 overflow-y-auto">
                {options.length === 0 && <p className="text-sm text-ink-3">Nothing at this level inside your area yet. Add it on the Map page first.</p>}
                {options.map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold ${chosen.includes(o.id) ? 'border-black bg-dz-yellow-soft' : 'border-line'}`} data-place={o.label}>
                    <input type="checkbox" checked={chosen.includes(o.id)} onChange={() => flip(o.id)} className="accent-[var(--color-dz-red)]" />
                    {o.label}
                    <span className="text-xs font-normal text-ink-3">{o.sub}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || missing || (!member && (!phone.trim() || name.trim().length < 2))} onClick={() => save.mutate()} data-save-admin>
            {save.isPending ? 'Saving…' : member ? 'Save' : 'Add admin'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
