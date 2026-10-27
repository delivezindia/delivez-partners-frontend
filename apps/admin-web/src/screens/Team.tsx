import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { ALL_ROLES, type AdminRole, type City, type TeamMember } from '../lib/types';
import { Button, Card, ErrorBox, Field, fmtDate, inputCls, Modal, PageHead, Switch } from '../components/ui';
import { useMe } from './Layout';

const ROLE_HELP: Record<AdminRole, string> = {
  FOUNDER: 'Everything, including the team and legal',
  HEAD_OF_OPS: 'Everything except legal; manages the team',
  REGIONAL_HEAD: 'Approve, suspend, reinstate stores; cities',
  CITY_OPS: 'Approve stores, pause/resume, notices',
  COMPLIANCE: 'Verify documents, approve, suspend; audit log',
  FINANCE: 'View only (payouts later)',
  LEGAL: 'Publish legal versions; audit log',
  SUPPORT: 'View; switch partner staff logins on/off',
  SALES_AGENT: 'No console access yet',
  AUDITOR: 'View; audit log',
  ACCOUNT_MANAGER: 'Mobile view of assigned stores only: health, churn risk, calls, tasks; can adjust prep time',
};
const SENIOR: AdminRole[] = ['FOUNDER', 'HEAD_OF_OPS'];

// Admin team: who can use the console, with what role and in which cities.
export default function Team() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ['team'], queryFn: () => api<TeamMember[]>('/admin/team') });
  const cities = useQuery({ queryKey: ['cities'], queryFn: () => api<City[]>('/admin/cities') });
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);
  const toggle = useMutation({
    mutationFn: (m: TeamMember) => api(`/admin/team/${m.id}`, { method: 'PATCH', body: { isActive: !m.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
  const canGrant = (r: AdminRole) => me?.role === 'FOUNDER' || !SENIOR.includes(r);

  return (
    <div className="space-y-5">
      <PageHead
        title="Admin team"
        sub="Everyone logs in with their own phone. Changes apply immediately."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Add admin
          </Button>
        }
      />
      <ErrorBox error={toggle.error ? errorText(toggle.error) : null} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="pb-2">Person</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Cities</th>
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
                  <tr key={m.id} className={m.isActive ? '' : 'opacity-50'}>
                    <td className="py-3">
                      <b className="block">{m.fullName ?? '—'}</b>
                      <span className="text-xs text-ink-3">{m.phone}</span>
                    </td>
                    <td className="py-3">
                      <b>{m.role.replace(/_/g, ' ').toLowerCase()}</b>
                      <span className="block text-xs text-ink-3">{ROLE_HELP[m.role]}</span>
                    </td>
                    <td className="py-3">{m.cities.length ? m.cities.join(', ') : 'All cities'}</td>
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
      {editing && <AdminForm member={editing === 'new' ? null : editing} cities={cities.data ?? []} roles={ALL_ROLES.filter(canGrant)} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AdminForm({ member, cities, roles, onClose }: { member: TeamMember | null; cities: City[]; roles: AdminRole[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>(member?.role ?? 'CITY_OPS');
  const [cityIds, setCityIds] = useState<string[]>(member?.cityIds ?? []);
  const save = useMutation({
    mutationFn: () => (member ? api(`/admin/team/${member.id}`, { method: 'PATCH', body: { role, cityIds } }) : api('/admin/team', { method: 'POST', body: { phone, fullName: name, role, cityIds } })),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['team'] }), onClose()),
  });
  const flip = (id: string) => setCityIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <Modal title={member ? `Edit ${member.fullName ?? member.phone}` : 'Add admin'} onClose={onClose}>
      <div className="space-y-4">
        {!member && (
          <>
            <Field label="Mobile number" hint="They log in with this number and an OTP">
              <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98450 12345" autoFocus />
            </Field>
            <Field label="Full name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
          </>
        )}
        <Field label="Role" hint={ROLE_HELP[role]}>
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ').toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="text-sm font-bold">Cities</p>
          <p className="text-xs text-ink-3">Leave all unticked for access to every city.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cities.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold ${cityIds.includes(c.id) ? 'border-black bg-dz-yellow-soft' : 'border-line'}`}>
                <input type="checkbox" checked={cityIds.includes(c.id)} onChange={() => flip(c.id)} className="accent-[var(--color-dz-red)]" />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || (!member && (!phone.trim() || name.trim().length < 2))} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : member ? 'Save' : 'Add admin'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
