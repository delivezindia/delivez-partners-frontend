import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { CAN, can, type LegalDoc } from '../lib/types';
import { Button, Card, ErrorBox, Field, inputCls, Modal, PageHead, Switch } from '../components/ui';
import { useMe } from './Layout';

const TYPES = ['PARTNER_TNC', 'SLA_TERMS', 'PENALTY_FRAMEWORK', 'STATE_RIDER', 'PRIVACY_POLICY', 'CUSTOMER_TNC', 'RX_DECLARATION', 'WHATSAPP_OPT_IN'];
const LABEL = (t: string) => t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()).replace('Tnc', 'Terms & conditions').replace('Sla', 'SLA');

// Legal document versions. Publishing a new partner version asks every partner to accept it on their next visit.
export default function Legal() {
  const { data: me } = useMe();
  const edit = can(me?.role, CAN.legal);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['legal'], queryFn: () => api<LegalDoc[]>('/admin/legal') });
  const [adding, setAdding] = useState(false);
  const toggle = useMutation({
    mutationFn: (d: LegalDoc) => api(`/admin/legal/${d.id}`, { method: 'PATCH', body: { isActive: !d.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal'] }),
  });
  const byType = TYPES.map((t) => ({ type: t, versions: (data ?? []).filter((d) => d.type === t) })).filter((g) => g.versions.length);

  return (
    <div className="space-y-5">
      <PageHead
        title="Legal documents"
        sub="Partners are asked to accept the newest version in force. Older versions stay on record with their acceptances."
        actions={
          edit && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Publish version
            </Button>
          )
        }
      />
      <ErrorBox error={toggle.error ? errorText(toggle.error) : null} />
      {isLoading && <p className="text-ink-3">Loading…</p>}
      {byType.map((g) => (
        <Card key={g.type} title={LABEL(g.type)}>
          <ul className="divide-y divide-line text-sm">
            {g.versions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <b>v{d.version}</b>
                  {d.state && <span className="text-ink-3"> · {d.state}</span>}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${d.inForce ? 'bg-dz-green-soft text-dz-green' : d.isActive ? 'bg-dz-yellow-soft text-ink' : 'bg-soft text-ink-3'}`}>
                    {d.inForce ? 'In force' : d.isActive ? `From ${new Date(d.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Retired'}
                  </span>
                  <span className="block text-xs text-ink-3">{d.acceptances} acceptances</span>
                </span>
                <a href={d.contentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold underline">
                  Text <ExternalLink className="h-3 w-3" />
                </a>
                <Switch on={d.isActive} label={`v${d.version} active`} disabled={!edit || toggle.isPending} onChange={() => toggle.mutate(d)} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {adding && <Publish onClose={() => setAdding(false)} />}
    </div>
  );
}

function Publish({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ type: 'PARTNER_TNC', version: '', state: '', contentUrl: '', effectiveFrom: today });
  const save = useMutation({
    mutationFn: () => api('/admin/legal', { method: 'POST', body: { ...f, state: f.type === 'STATE_RIDER' ? f.state : null } }),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['legal'] }), onClose()),
  });
  return (
    <Modal title="Publish a new version" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Document">
          <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {LABEL(t)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Version" hint="e.g. 2026.11">
            <input className={inputCls} value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} maxLength={20} />
          </Field>
          <Field label="In force from">
            <input type="date" className={inputCls} value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} />
          </Field>
        </div>
        {f.type === 'STATE_RIDER' && (
          <Field label="State">
            <input className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} placeholder="Karnataka" />
          </Field>
        )}
        <Field label="Link to the full text" hint="Where partners read it before accepting">
          <input className={inputCls} value={f.contentUrl} onChange={(e) => setF({ ...f, contentUrl: e.target.value })} placeholder="https://delivez.com/legal/…" />
        </Field>
        <p className="rounded-lg bg-dz-yellow-soft p-3 text-xs">
          From the date above, every partner owner sees a banner asking them to review and accept this version. Choose a future date to give notice.
        </p>
        <ErrorBox error={save.error ? errorText(save.error) : null} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || !f.version.trim() || !f.contentUrl.trim()} onClick={() => save.mutate()}>
            Publish
          </Button>
        </div>
      </div>
    </Modal>
  );
}
