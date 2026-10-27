import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import { CAN, can, type AdminRole, type StoreReview as Review, type StoreStatus } from '../lib/types';
import { DocReview } from '../components/DocReview';
import { Button, Card, ErrorBox, fmtDate, inputCls, Modal, StatusChip, Switch } from '../components/ui';
import { useMe } from './Layout';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const rupees = (p: number) => `₹${(p / 100).toLocaleString('en-IN')}`;

const ACTION_LABEL: Record<string, string> = {
  APPROVE_STORE: 'Approved',
  REJECT_STORE: 'Rejected',
  SUSPEND_STORE: 'Suspended',
  PAUSE_NEW_ORDERS: 'Orders paused',
  RESUME_ORDERS: 'Orders resumed',
  SEND_WARNING: 'Notice sent',
};

type Action ='start-review' | 'approve-live' | 'approve-limited' | 'request-changes' | 'reject' | 'pause' | 'resume' | 'suspend' | 'reinstate';

const ACTIONS: Record<Action, { label: string; from: StoreStatus[]; roles: AdminRole[]; variant: 'red' | 'outline' | 'green' | 'yellow' | 'dark'; reason: 'required' | 'optional' | 'none'; confirm: string }> = {
  'start-review': { label: 'Start review', from: ['SUBMITTED'], roles: CAN.approve, variant: 'dark', reason: 'none', confirm: 'Mark this store as under review by you?' },
  'approve-live': { label: 'Approve LIVE', from: ['SUBMITTED', 'UNDER_REVIEW', 'LIMITED'], roles: CAN.approve, variant: 'green', reason: 'optional', confirm: 'The store will be visible to customers and can start taking orders.' },
  'approve-limited': { label: 'Soft launch (LIMITED)', from: ['SUBMITTED', 'UNDER_REVIEW'], roles: CAN.approve, variant: 'yellow', reason: 'optional', confirm: 'The store goes live with a “New” badge and a 2 km radius until the remaining items are done.' },
  'request-changes': { label: 'Request changes', from: ['SUBMITTED', 'UNDER_REVIEW'], roles: CAN.approve, variant: 'outline', reason: 'required', confirm: 'The partner’s registration reopens for editing. Tell them exactly what to fix.' },
  reject: { label: 'Reject', from: ['SUBMITTED', 'UNDER_REVIEW'], roles: CAN.approve, variant: 'red', reason: 'required', confirm: 'Use only for fraud, invalid licences or businesses we can’t serve. The partner sees the reason.' },
  pause: { label: 'Pause orders', from: ['LIVE', 'LIMITED'], roles: CAN.operate, variant: 'outline', reason: 'required', confirm: 'Stops new orders until you resume — for operational issues (inspection, outage, staffing). Not a compliance action. The partner sees the reason.' },
  resume: { label: 'Resume orders', from: ['PAUSED'], roles: CAN.operate, variant: 'green', reason: 'optional', confirm: 'The store goes back to LIVE (or LIMITED if it no longer passes the LIVE checks). The partner opens it themselves.' },
  suspend: { label: 'Suspend', from: ['LIVE', 'LIMITED', 'PAUSED'], roles: CAN.suspend, variant: 'red', reason: 'required', confirm: 'The store is closed immediately and hidden from customers.' },
  reinstate: { label: 'Reinstate', from: ['SUSPENDED'], roles: CAN.reinstate, variant: 'green', reason: 'required', confirm: 'The store returns to LIVE (or LIMITED if it no longer passes the LIVE checks).' },
};

// Store review page — everything compliance needs on one screen (plan §7).
export default function StoreReview() {
  const { storeId = '' } = useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['store', storeId], queryFn: () => api<Review>(`/admin/stores/${storeId}`) });
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const sendNotice = useMutation({
    mutationFn: () => api(`/admin/stores/${storeId}/notices`, { method: 'POST', body: { message: notice.trim() } }),
    onSuccess: () => (setNoticeOpen(false), setNotice(''), qc.invalidateQueries({ queryKey: ['store', storeId] })),
  });
  const memberAccess = useMutation({
    mutationFn: (m: { memberId: string; isActive: boolean }) => api(`/admin/stores/${storeId}/members/${m.memberId}/access`, { method: 'POST', body: { isActive: m.isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store', storeId] }),
  });

  const act = useMutation({
    mutationFn: (a: Action) => api<{ to: StoreStatus }>(`/admin/stores/${storeId}/${a}`, { method: 'POST', body: reason.trim() ? { reason: reason.trim() } : {} }),
    onSuccess: () => {
      setPending(null);
      setReason('');
      void qc.invalidateQueries({ queryKey: ['store', storeId] });
      void qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });

  if (isLoading) return <p className="text-ink-3">Loading…</p>;
  if (error || !data) return <p className="font-semibold text-dz-red">{errorText(error)}</p>;

  const o = data.onboarding;
  const s = o?.store;
  const role = me?.role;
  const available = (Object.keys(ACTIONS) as Action[]).filter((a) => ACTIONS[a].from.includes(data.store.status) && role && ACTIONS[a].roles.includes(role));
  const latestDocs = data.documents.filter((d, i, all) => all.findIndex((x) => x.type === d.type) === i);
  const olderDocs = data.documents.filter((d) => !latestDocs.includes(d));
  const def = pending ? ACTIONS[pending] : null;

  return (
    <div className="space-y-5">
      <Link to="/stores" className="text-sm font-bold text-ink-2 hover:text-dz-red">
        ← Stores
      </Link>

      {/* Header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border-t-4 border-dz-red bg-white p-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[clamp(30px,4vw,44px)]">{data.store.name}</h1>
            <StatusChip status={data.store.status} />
            {['LIVE', 'LIMITED'].includes(data.store.status) && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${data.openState === 'CLOSED' ? 'bg-soft text-ink-2' : 'bg-dz-green-soft text-dz-green'}`}>{data.openState === 'CLOSED' ? 'Closed now' : data.openState === 'BUSY' ? 'Open · busy' : 'Open now'}</span>
            )}
          </div>
          <p className="mt-1 text-ink-2">
            {o?.partnerAccount.legalName} · {data.store.storeType.replace(/_/g, ' ').toLowerCase()} · {o?.session.flowVersion} via {o?.session.channel.toLowerCase()}
            {o?.session.submittedAt && <> · submitted {fmtDate(o.session.submittedAt)}</>}
          </p>
          {data.store.rejectedReason && <p className="mt-2 text-sm font-semibold text-dz-red">Reason on record: {data.store.rejectedReason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {available.map((a) => (
            <Button key={a} variant={ACTIONS[a].variant} onClick={() => (act.reset(), setReason(''), setPending(a))}>
              {ACTIONS[a].label}
            </Button>
          ))}
          {can(role, CAN.operate) && (
            <Button variant="outline" onClick={() => (sendNotice.reset(), setNoticeOpen(true))}>
              Send notice
            </Button>
          )}
          {can(role, CAN.audit) && (
            <Link to={`/audit?entityId=${storeId}`} className="inline-flex min-h-10 items-center rounded-[10px] border-[1.5px] border-line bg-white px-4 text-sm font-extrabold hover:border-black">
              Audit trail
            </Link>
          )}
          {available.length === 0 && !can(role, CAN.operate) && <span className="text-sm text-ink-3">No actions for your role at this stage.</span>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Documents */}
          <Card title={`Documents (${latestDocs.length})`}>
            {latestDocs.length === 0 && <p className="text-ink-3">No documents uploaded yet.</p>}
            <div className="space-y-4">
              {latestDocs.map((d) => (
                <DocReview key={d.id} doc={{ ...d, superseded: false }} role={role} />
              ))}
            </div>
            {olderDocs.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-bold">Earlier uploads ({olderDocs.length})</summary>
                <ul className="mt-2 divide-y divide-line">
                  {olderDocs.map((d) => (
                    <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        {d.label} · {fmtDate(d.createdAt)} · {d.status.toLowerCase()}
                        {d.rejectionReason && <span className="text-ink-3"> — {d.rejectionReason}</span>}
                      </span>
                      <a href={d.viewUrl} target="_blank" rel="noreferrer" className="underline">
                        open
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          {s && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Business">
                <Rows
                  rows={[
                    ['Legal name', o!.partnerAccount.legalName],
                    ['Type', o!.partnerAccount.partnerType.replace(/_/g, ' ').toLowerCase()],
                    ['GSTIN', o!.partnerAccount.gstin ?? '—'],
                    ['Phone', s.phone ?? '—'],
                    ['WhatsApp', s.whatsappPhone ?? '—'],
                    ['Email', s.email ?? '—'],
                    ['Cuisines', s.cuisines.join(', ') || '—'],
                  ]}
                />
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-3">People</p>
                <ul className="mt-1 divide-y divide-line text-sm">
                  {data.members.map((m) => (
                    <li key={m.memberId} className="flex items-center justify-between gap-3 py-2">
                      <span className={m.isActive ? '' : 'text-ink-3'}>
                        <b>{m.fullName ?? 'No name'}</b> · {m.phone} · {m.role.replace(/_/g, ' ').toLowerCase()}
                        <span className="block text-xs text-ink-3">{m.invited ? 'Invite not accepted yet' : m.isActive ? `Last login ${fmtDate(m.lastLoginAt)}` : 'Access switched off'}</span>
                      </span>
                      {can(role, CAN.partnerUsers) && !m.invited && (
                        <Switch on={m.isActive} label={`${m.fullName ?? m.phone} access`} disabled={memberAccess.isPending} onChange={(v) => memberAccess.mutate({ memberId: m.memberId, isActive: v })} />
                      )}
                    </li>
                  ))}
                </ul>
                <ErrorBox error={memberAccess.error ? errorText(memberAccess.error) : null} />
              </Card>

              <Card title="Location">
                <Rows
                  rows={[
                    ['Address', [s.addressLine1, s.addressLine2].filter(Boolean).join(', ') || '—'],
                    ['Landmark', s.landmark ?? '—'],
                    ['PIN code', s.pincode ?? '—'],
                    ['City / zone', [s.zone?.name, s.city?.name, s.city?.state].filter(Boolean).join(', ') || '—'],
                    ['Confidence', s.addressConfidence ?? '—'],
                  ]}
                />
                {s.lat != null && s.lng != null && (
                  <a className="mt-3 inline-block text-sm font-bold text-dz-red underline" href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=18/${s.lat}/${s.lng}`} target="_blank" rel="noreferrer">
                    Open pin on map ({s.lat.toFixed(5)}, {s.lng.toFixed(5)})
                  </a>
                )}
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-3">Hours</p>
                <p className="text-sm">{s.timings.length ? s.timings.map((t) => `${DAYS[t.dayOfWeek]} ${t.opensAt}–${t.closesAt}`).join(' · ') : '—'}</p>
              </Card>

              <Card title="Operations">
                <Rows
                  rows={[
                    ['Prep time', `${s.defaultPrepMinutes} min (peak ${s.peakPrepMinutes})`],
                    ['Delivery', s.supportsDelivery ? `Yes, ${s.deliveryRadiusKm} km` : 'No'],
                    ['Pickup', s.supportsPickup ? 'Yes' : 'No'],
                    ['Packaging fee', rupees(s.packagingFee)],
                  ]}
                />
              </Card>

              <Card title="Payouts">
                {o!.bank ? (
                  <Rows
                    rows={[
                      ['Holder', o!.bank.accountHolderName],
                      ['Account', o!.bank.accountNumberLast4 ? `${o!.bank.bankName ?? ''} ••••${o!.bank.accountNumberLast4} · ${o!.bank.ifsc}` : (o!.bank.upiId ?? '—')],
                      ['Status', o!.bank.verificationStatus.replace(/_/g, ' ').toLowerCase()],
                      ['Name match', o!.bank.nameMatchScore != null ? `${Math.round(o!.bank.nameMatchScore * 100)}%` : '—'],
                    ]}
                  />
                ) : (
                  <p className="text-ink-3">No bank account yet.</p>
                )}
              </Card>

              {o!.pathologist && (
                <Card title="Pathologist">
                  <Rows
                    rows={[
                      ['Name', o!.pathologist.name],
                      ['Qualification', o!.pathologist.qualification],
                      ['Registration', `${o!.pathologist.registrationNo} · ${o!.pathologist.stateCouncil}`],
                    ]}
                  />
                  <p className="mt-3 text-xs text-ink-3">Check the registration on the state medical council register before verifying the Pathologist registration document.</p>
                </Card>
              )}

              {o!.pharmacist && (
                <Card title="Pharmacist">
                  <Rows
                    rows={[
                      ['Name', o!.pharmacist.name],
                      ['Registration', `${o!.pharmacist.registrationNo} · ${o!.pharmacist.stateCouncil}`],
                      ['On duty', o!.pharmacist.shifts.map((x) => `${DAYS[x.dayOfWeek]} ${x.startsAt}–${x.endsAt}`).join(' · ')],
                      ['Quiz', o!.session.quizScore != null ? `${o!.session.quizScore}/3` : 'Not taken'],
                    ]}
                  />
                </Card>
              )}

              <Card title={`Catalog (${o!.catalog.count})`}>
                {o!.catalog.count === 0 ? (
                  <p className="text-ink-3">No items yet.</p>
                ) : (
                  <ul className="max-h-64 divide-y divide-line overflow-auto text-sm">
                    {o!.catalog.products.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 py-1.5">
                        <span>
                          {p.name}
                          {p.category && <span className="text-ink-3"> · {p.category.name}</span>}
                          {p.prescriptionRequired && <span className="ml-1 rounded bg-dz-red-soft px-1 text-xs font-bold text-dz-red">Rx {p.drugSchedule}</span>}
                        </span>
                        <b>{rupees(p.price)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}

          <Card title="Agreements accepted">
            {data.consents.length === 0 ? (
              <p className="text-ink-3">None yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {data.consents.map((c) => (
                  <li key={`${c.type}-${c.acceptedAt}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <b>{c.type.replace(/_/g, ' ').toLowerCase()}</b> v{c.version}
                      {c.state && ` (${c.state})`}
                    </span>
                    <span className="text-ink-3">
                      {c.by} · {c.channel.toLowerCase()} · IP {c.ip ?? '—'} · {fmtDate(c.acceptedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <aside className="space-y-5">
          {o && (
            <Card title="Readiness">
              <p className="text-4xl font-black" style={{ fontStretch: '74%' }}>
                <span className={o.readiness.score >= 80 ? 'text-dz-green' : o.readiness.score >= 60 ? 'text-amber-700' : 'text-dz-red'}>{o.readiness.score}</span>
                <span className="text-lg text-ink-3">/100</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {o.readiness.factors.map((f) => (
                  <li key={f.factor}>
                    <div className="flex justify-between">
                      <span>{f.label}</span>
                      <span className="tabular-nums text-ink-3">
                        {f.points}/{f.weight}
                      </span>
                    </div>
                    {f.hint && <p className="text-xs text-ink-3">{f.hint}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <AccountManagerCard storeId={storeId} current={data.store.accountManagerId ?? null} canEdit={can(role, CAN.operate)} />

          <Card title="Go-live checks">
            <Check title="LIVE" problems={data.approval.live} />
            <div className="mt-3" />
            <Check title="LIMITED (soft launch)" problems={data.approval.limited} />
          </Card>

          {o && (
            <Card title="Steps">
              <ul className="space-y-1 text-sm">
                {o.session.steps.map((st) => (
                  <li key={st.key} className="flex justify-between">
                    <span>{st.title}</span>
                    <span className={st.status === 'DONE' ? 'font-bold text-dz-green' : st.status === 'SKIPPED' ? 'text-amber-700' : 'text-ink-3'}>{st.status.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.adminActions.length > 0 && (
            <Card title="Admin actions">
              <ul className="space-y-2 text-sm">
                {data.adminActions.map((a, i) => (
                  <li key={i} className="border-l-2 border-dz-red pl-3">
                    <b>{ACTION_LABEL[a.type] ?? a.type.replace(/_/g, ' ').toLowerCase()}</b>
                    {a.reason && <span className="block text-ink-2">“{a.reason}”</span>}
                    <span className="block text-xs text-ink-3">
                      {a.by ?? 'Admin'} · {fmtDate(a.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Activity">
            <ol className="space-y-2 text-sm">
              {data.timeline.slice(0, 25).map((t, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <b>{t.action.replace(/_/g, ' ').toLowerCase()}</b> · {t.step.replace(/_/g, ' ').toLowerCase()}
                  <span className="block text-xs text-ink-3">
                    {t.actorType.toLowerCase()} · {fmtDate(t.at)}
                  </span>
                  {typeof t.meta?.reason === 'string' && <span className="block text-xs text-ink-2">“{t.meta.reason}”</span>}
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      {noticeOpen && (
        <Modal title="Send a notice" onClose={() => setNoticeOpen(false)}>
          <p className="text-ink-2">The partner sees this instantly on their dashboard, and it stays there for 30 days.</p>
          <textarea value={notice} onChange={(e) => setNotice(e.target.value)} rows={4} maxLength={500} autoFocus className="mt-3 w-full rounded-[9px] border-[1.5px] border-line p-2" placeholder="e.g. Please upload your renewed FSSAI licence by Friday." />
          <ErrorBox error={sendNotice.error ? errorText(sendNotice.error) : null} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoticeOpen(false)}>
              Cancel
            </Button>
            <Button disabled={sendNotice.isPending || notice.trim().length < 5} onClick={() => sendNotice.mutate()}>
              {sendNotice.isPending ? 'Sending…' : 'Send notice'}
            </Button>
          </div>
        </Modal>
      )}

      {pending && def && (
        <Modal title={def.label} onClose={() => setPending(null)}>
          <p className="text-ink-2">{def.confirm}</p>
          {def.reason !== 'none' && (
            <label className="mt-4 block text-sm font-bold">
              Reason {def.reason === 'optional' && <span className="font-normal text-ink-3">(optional)</span>}
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={500} autoFocus className="mt-1 w-full rounded-[9px] border-[1.5px] border-line p-2 font-normal" placeholder={def.reason === 'required' ? 'The partner will see this' : 'Internal note'} />
            </label>
          )}
          {act.error && <p className="mt-3 whitespace-pre-line rounded-lg bg-dz-red-soft p-3 text-sm font-semibold text-dz-red">{errorText(act.error)}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={def.variant === 'outline' ? 'dark' : def.variant} disabled={act.isPending || (def.reason === 'required' && reason.trim().length < 5)} onClick={() => act.mutate(pending)}>
              {act.isPending ? 'Working…' : def.label}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Check({ title, problems }: { title: string; problems: string[] }) {
  return (
    <div>
      <p className={`flex items-center gap-2 font-bold ${problems.length ? 'text-ink' : 'text-dz-green'}`}>
        {problems.length ? '○' : '✓'} {title}
      </p>
      {problems.length > 0 && (
        <ul className="ml-5 mt-1 list-disc text-xs text-ink-2">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Which account manager looks after this store (they see it in their mobile view). */
function AccountManagerCard({ storeId, current, canEdit }: { storeId: string; current: string | null; canEdit: boolean }) {
  const qc = useQueryClient();
  const ams = useQuery({ queryKey: ['account-managers'], queryFn: () => api<{ id: string; name: string; phone: string; stores: number }[]>('/admin/account-managers') });
  const save = useMutation({
    mutationFn: (accountManagerId: string | null) => api(`/admin/stores/${storeId}/account-manager`, { method: 'PUT', body: { accountManagerId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['store', storeId] });
      void qc.invalidateQueries({ queryKey: ['account-managers'] });
    },
  });
  const who = ams.data?.find((a) => a.id === current);
  return (
    <Card title="Account manager">
      {canEdit ? (
        <select value={current ?? ''} disabled={save.isPending} onChange={(e) => save.mutate(e.target.value || null)} className={inputCls} data-am-select>
          <option value="">Not assigned</option>
          {ams.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.stores} store{a.stores === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm">{who ? who.name : 'Not assigned'}</p>
      )}
      {save.error && <p className="mt-2 text-sm text-dz-red">{(save.error as Error).message}</p>}
      {!ams.isLoading && !ams.data?.length && <p className="mt-2 text-xs text-ink-3">No account managers yet — add one in Team with the Account manager role.</p>}
    </Card>
  );
}
