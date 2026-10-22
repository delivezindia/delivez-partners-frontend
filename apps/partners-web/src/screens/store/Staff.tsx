import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errorMessageOf, fieldErrorsOf } from '../../lib/onboarding';
import type { PartnerRole } from '../../lib/types';
import { Field, Select, TextInput } from '../../components/form';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { useStoreContext } from './StoreLayout';

interface Member {
  id: string;
  userId: string;
  name: string | null;
  phone: string;
  role: PartnerRole;
  storeIds: string[];
  status: 'ACTIVE' | 'INVITED' | 'DEACTIVATED';
  hasPin: boolean;
  lastLoginAt: string | null;
}
interface StaffResponse {
  canManage: PartnerRole[];
  stores: { id: string; name: string }[];
  members: Member[];
}

const ROLE_INFO: Record<PartnerRole, { label: string; does: string }> = {
  OWNER: { label: 'Owner', does: 'Everything, including bank and staff' },
  MANAGER: { label: 'Manager', does: 'Orders, menu, stock, settings, reviews' },
  KITCHEN_LEAD: { label: 'Kitchen lead', does: 'Accept and prepare orders, delays, item availability' },
  COUNTER_STAFF: { label: 'Counter staff', does: 'Ready, handover to rider, mark items unavailable' },
  PHARMACIST: { label: 'Pharmacist', does: 'Prescription review and Rx orders' },
  ACCOUNTANT: { label: 'Accountant', does: 'Payouts, statements and penalties (view)' },
};

const STATUS_CHIP: Record<Member['status'], string> = {
  ACTIVE: 'border-dz-green bg-dz-green-soft text-dz-green',
  INVITED: 'border-dz-yellow-strong bg-dz-yellow-soft',
  DEACTIVATED: 'border-line bg-soft text-ink-3',
};

// P24 Staff & roles (plan §4.3)
export default function Staff() {
  const { storeId, role } = useStoreContext();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['staff', storeId], queryFn: () => api<StaffResponse>(`/partners/stores/${storeId}/staff`) });
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['staff', storeId] });

  const toggle = useMutation({ mutationFn: (m: Member) => api(`/partners/stores/${storeId}/staff/${m.id}`, { method: 'PATCH', body: { isActive: m.status !== 'ACTIVE' } }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (m: Member) => api(`/partners/stores/${storeId}/staff/${m.id}`, { method: 'DELETE' }), onSuccess: refresh });

  if (isLoading) return <p className="text-ink-3">Loading…</p>;
  if (error || !data) return <ErrorText>{errorMessageOf(error)}</ErrorText>;
  const storeName = (id: string) => data.stores.find((s) => s.id === id)?.name ?? 'Unknown outlet';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">Staff & roles</h1>
          <p className="text-ink-2">Everyone logs in with their own phone. Shared tablets switch between people with a 4-digit PIN.</p>
        </div>
        {data.canManage.length > 0 && <Button onClick={() => setInviting(true)}>+ Invite</Button>}
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-soft text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Outlets</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.members.map((m) => {
              const manageable = data.canManage.includes(m.role);
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <b className="block">{m.name ?? 'Not set yet'}</b>
                    <span className="text-xs text-ink-3">{m.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <b>{ROLE_INFO[m.role].label}</b>
                    {m.hasPin && <span className="ml-2 rounded bg-soft px-1.5 text-[11px] font-bold">PIN</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{m.storeIds.length === 0 ? 'All outlets' : m.storeIds.map(storeName).join(', ')}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_CHIP[m.status]}`}>{m.status === 'INVITED' ? 'Invited' : m.status === 'ACTIVE' ? 'Active' : 'Deactivated'}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-3">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {manageable && (
                      <div className="flex justify-end gap-3 text-sm font-bold">
                        <button className="hover:text-dz-red" onClick={() => setEditing(m)}>
                          Edit
                        </button>
                        {m.status !== 'INVITED' && (
                          <button className="hover:text-dz-red" disabled={toggle.isPending} onClick={() => toggle.mutate(m)}>
                            {m.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                        <button
                          className="text-ink-3 hover:text-dz-red"
                          onClick={() => window.confirm(`Remove ${m.name ?? m.phone} from your team? They lose access immediately.`) && remove.mutate(m)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(toggle.error || remove.error) && <ErrorText>{errorMessageOf(toggle.error ?? remove.error)}</ErrorText>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(ROLE_INFO) as PartnerRole[]).map((r) => (
          <div key={r} className="rounded-[14px] border border-line bg-white p-4">
            <p className="font-extrabold">{ROLE_INFO[r].label}</p>
            <p className="text-sm text-ink-2">{ROLE_INFO[r].does}</p>
          </div>
        ))}
      </div>

      {inviting && <InviteModal data={data} storeId={storeId} isOwner={role === 'OWNER'} onClose={() => setInviting(false)} onDone={refresh} />}
      {editing && <EditModal member={editing} data={data} storeId={storeId} isOwner={role === 'OWNER'} onClose={() => setEditing(null)} onDone={refresh} />}
    </div>
  );
}

function OutletPicker({ stores, value, onChange, currentId }: { stores: StaffResponse['stores']; value: string[] | 'ALL'; onChange: (v: string[] | 'ALL') => void; currentId: string }) {
  const selected = value === 'ALL' ? [] : value;
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="radio" checked={value === 'ALL'} onChange={() => onChange('ALL')} className="h-4 w-4 accent-[var(--color-dz-red)]" /> All outlets (including future ones)
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="radio" checked={value !== 'ALL'} onChange={() => onChange([currentId])} className="h-4 w-4 accent-[var(--color-dz-red)]" /> Only these outlets
      </label>
      {value !== 'ALL' && (
        <div className="ml-6 space-y-1">
          {stores.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => onChange(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))} className="h-4 w-4 accent-[var(--color-dz-red)]" />
              {s.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteModal({ data, storeId, isOwner, onClose, onDone }: { data: StaffResponse; storeId: string; isOwner: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ phone: '', name: '', role: data.canManage.includes('COUNTER_STAFF') ? 'COUNTER_STAFF' : data.canManage[0] });
  const [outlets, setOutlets] = useState<string[] | 'ALL'>([storeId]);
  const invite = useMutation({
    mutationFn: () =>
      api<{ inviteLink: string }>(`/partners/stores/${storeId}/staff`, {
        method: 'POST',
        body: { phone: f.phone, name: f.name || undefined, role: f.role, ...(isOwner ? { storeIds: outlets === 'ALL' ? [] : outlets } : {}) },
      }),
    onSuccess: onDone,
  });
  const errors = fieldErrorsOf(invite.error);

  return (
    <Modal title={invite.isSuccess ? 'Invite sent' : 'Invite a team member'} onClose={onClose}>
      {invite.isSuccess ? (
        <div className="space-y-4">
          <p className="text-ink-2">
            <b>{f.name || f.phone}</b> can now log in to Delivez Partners with their phone number. Share this link with them:
          </p>
          <div className="flex gap-2">
            <TextInput readOnly value={invite.data.inviteLink} />
            <Button variant="dark" onClick={() => void navigator.clipboard?.writeText(invite.data.inviteLink)}>
              Copy
            </Button>
          </div>
          <p className="text-xs text-ink-3">SMS and WhatsApp invites are sent automatically once messaging is switched on.</p>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
        >
          <Field label="Mobile number" error={errors.phone}>
            <TextInput inputMode="numeric" autoFocus value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98450 12345" />
          </Field>
          <Field label="Name (optional)">
            <TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Role" hint={ROLE_INFO[f.role].does}>
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as PartnerRole })}>
              {data.canManage.map((r) => (
                <option key={r} value={r}>
                  {ROLE_INFO[r].label}
                </option>
              ))}
            </Select>
          </Field>
          {isOwner && data.stores.length > 1 && (
            <Field label="Outlets">
              <OutletPicker stores={data.stores} value={outlets} onChange={setOutlets} currentId={storeId} />
            </Field>
          )}
          {invite.error && Object.keys(errors).length === 0 && <ErrorText>{errorMessageOf(invite.error)}</ErrorText>}
          <Button type="submit" className="w-full" disabled={invite.isPending || f.phone.replace(/\D/g, '').length < 10}>
            {invite.isPending ? 'Inviting…' : 'Send invite'}
          </Button>
        </form>
      )}
    </Modal>
  );
}

function EditModal({ member, data, storeId, isOwner, onClose, onDone }: { member: Member; data: StaffResponse; storeId: string; isOwner: boolean; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = useState<PartnerRole>(member.role);
  const [outlets, setOutlets] = useState<string[] | 'ALL'>(member.storeIds.length ? member.storeIds : 'ALL');
  const save = useMutation({
    mutationFn: () => api(`/partners/stores/${storeId}/staff/${member.id}`, { method: 'PATCH', body: { role, ...(isOwner ? { storeIds: outlets === 'ALL' ? [] : outlets } : {}) } }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  return (
    <Modal title={`Edit ${member.name ?? member.phone}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Role" hint={ROLE_INFO[role].does}>
          <Select value={role} onChange={(e) => setRole(e.target.value as PartnerRole)}>
            {data.canManage.map((r) => (
              <option key={r} value={r}>
                {ROLE_INFO[r].label}
              </option>
            ))}
          </Select>
        </Field>
        {isOwner && data.stores.length > 1 && (
          <Field label="Outlets">
            <OutletPicker stores={data.stores} value={outlets} onChange={setOutlets} currentId={storeId} />
          </Field>
        )}
        {save.error && <ErrorText>{errorMessageOf(save.error)}</ErrorText>}
        <Button className="w-full" disabled={save.isPending || (outlets !== 'ALL' && outlets.length === 0)} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}
