import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { CAN, can, type City } from '../lib/types';
import { Button, Card, ErrorBox, fmtDate, inputCls, Modal } from '../components/ui';
import { useMe } from './Layout';

export type RiderAppStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
export const APP_STATUS: Record<RiderAppStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'New',
  UNDER_REVIEW: 'In review',
  CHANGES_REQUESTED: 'Sent back',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const CHIP: Record<RiderAppStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  SUBMITTED: 'bg-dz-yellow-soft text-ink border-dz-yellow-strong',
  UNDER_REVIEW: 'bg-dz-blue-soft text-dz-blue border-dz-blue',
  CHANGES_REQUESTED: 'bg-amber-50 text-amber-800 border-amber-400',
  APPROVED: 'bg-dz-green-soft text-dz-green border-dz-green',
  REJECTED: 'bg-dz-red-soft text-dz-red border-dz-red',
};
export function AppChip({ status, suspended }: { status: RiderAppStatus; suspended?: boolean }) {
  if (suspended) return <span className="inline-flex whitespace-nowrap rounded-full border border-dz-red bg-dz-red-soft px-2.5 py-0.5 text-xs font-bold text-dz-red">Suspended</span>;
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${CHIP[status]}`}>{APP_STATUS[status]}</span>;
}
export const VEHICLE: Record<string, string> = { BIKE: 'Bike', THREE_WHEELER: 'Three-wheeler', FOUR_WHEELER: 'Four-wheeler', TRUCK: 'Truck' };
const DOC_NAME: Record<string, string> = {
  GOV_ID: 'Government ID',
  PHOTO: 'Passport photo',
  PAN: 'PAN card',
  BANK_PROOF: 'Bank proof',
  DRIVING_LICENCE: 'Driving licence',
  VEHICLE_RC: 'Vehicle RC',
  VEHICLE_INSURANCE: 'Vehicle insurance',
  ADDRESS_PROOF: 'Address proof',
};

interface Doc {
  id: string;
  type: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectReason: string | null;
  uploadedAt: string;
  url: string;
}
interface Application {
  id: string;
  status: RiderAppStatus;
  cityId: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rider: { id: string; riderCode: string; status: string; cityId: string | null; assignedModule: string | null; hubName: string | null; suspendReason: string | null };
  user: { id: string; phone: string; fullName: string | null };
  steps: Record<string, Record<string, unknown> | null>;
  summary: { tier: string | null; services: string[]; vehicle: string | null; hyperlocalJobsNotEligible: string[]; suggestedModule: string | null };
  documents: Doc[];
  missing: { steps: string[]; documents: string[]; requiredDocuments: string[]; problems: string[] };
}
type Opt = { value: string; label: string };
type Options = Record<string, Opt[]> & { tiers: (Opt & { services: (Opt & { module: string })[] })[]; agentModules: string[] };
/** "quickCommerce" → "Quick Commerce". */
const moduleName = (m: string) => m.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const label = (opts: Options | undefined, key: string, v: unknown) => (typeof v === 'string' ? opts?.[key]?.find((o) => o.value === v)?.label ?? v : '—');
const labels = (opts: Options | undefined, key: string, v: unknown) => (Array.isArray(v) && v.length ? v.map((x) => label(opts, key, x)).join(', ') : '—');
const isPdf = (u: string) => /\.pdf(\?|$)/i.test(u) || u.includes('pdf');

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-line py-2 text-sm last:border-0">
      <dt className="text-ink-3">{k}</dt>
      <dd className="font-semibold">{children ?? '—'}</dd>
    </div>
  );
}

/** One rider application: the details they entered, their files, and the ops decision. */
export default function RiderReview() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const canAct = can(me?.role, CAN.riders);
  const { data: a, isLoading, error } = useQuery({ queryKey: ['rider-app', id], queryFn: () => api<Application>(`/admin/riders/applications/${id}`) });
  const { data: opts } = useQuery({ queryKey: ['rider-options'], queryFn: () => api<Options>('/rider/registration/options'), staleTime: Infinity });
  const { data: cities } = useQuery({ queryKey: ['cities'], queryFn: () => api<City[]>('/admin/cities') });
  const [ask, setAsk] = useState<null | { kind: 'reject-doc'; doc: Doc } | { kind: 'changes' | 'reject' | 'suspend' } | { kind: 'approve' }>(null);
  const [reason, setReason] = useState('');
  const [city, setCity] = useState('');
  const [module, setModule] = useState('');
  const [hub, setHub] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: (x: { path: string; body?: unknown; ok: string }) => api(x.path, { method: 'POST', body: x.body ?? {} }).then(() => x.ok),
    onSuccess: (ok) => {
      setMsg(ok);
      setAsk(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['rider-app', id] });
      qc.invalidateQueries({ queryKey: ['rider-apps'] });
    },
  });

  if (isLoading) return <p className="text-ink-3">Loading…</p>;
  if (error || !a) return <ErrorBox error={errorText(error)} />;

  const base = `/admin/riders/applications/${a.id}`;
  const p = a.steps['personal-info'] ?? {};
  const v = a.steps['legal-vehicle'] ?? {};
  const w = a.steps['work-tech'] ?? {};
  const h = a.steps.hyperlocal ?? {};
  const t = a.steps['training-role'] ?? {};
  const own = v.vehicleProvider === 'OWN_VEHICLE';
  const services = (opts?.tiers ?? []).flatMap((x) => x.services);
  const inReview = a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW';
  const suspended = a.rider.status === 'SUSPENDED';
  const unverified = a.missing.requiredDocuments.filter((type) => !a.documents.some((d) => d.type === type && d.status === 'VERIFIED'));
  const cityName = (cid: string | null) => cities?.find((c) => c.id === cid)?.name ?? null;

  return (
    <div className="space-y-5">
      <Link to="/riders" className="inline-flex items-center gap-1 text-sm font-bold text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All riders
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(30px,4vw,44px)]">{(p.fullName as string) ?? a.user.fullName ?? 'Rider'}</h1>
          <p className="text-ink-2">
            {a.rider.riderCode} · {a.user.phone.replace(/^\+91/, '+91 ')} · {cityName(a.rider.cityId ?? a.cityId) ?? 'city not set'} · sent {fmtDate(a.submittedAt)}
          </p>
        </div>
        <AppChip status={a.status} suspended={suspended} />
      </div>

      {msg && <p className="rounded-lg bg-dz-green-soft p-3 text-sm font-semibold text-dz-green" role="status">{msg}</p>}
      <ErrorBox error={run.error ? errorText(run.error) : null} />
      {a.reviewNote && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm">
          <b>Note to the rider:</b> {a.reviewNote}
        </p>
      )}
      {suspended && (
        <p className="rounded-lg bg-dz-red-soft p-3 text-sm text-dz-red">
          <b>Suspended:</b> {a.rider.suspendReason}
        </p>
      )}

      {canAct && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {a.status === 'SUBMITTED' && !suspended && (
              <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate({ path: `${base}/start-review`, ok: 'Marked as in review — other ops can see you are on it' })}>
                Start review
              </Button>
            )}
            {inReview && !suspended && (
              <>
                <Button
                  variant="green"
                  disabled={run.isPending}
                  onClick={() => {
                    setCity(a.cityId ?? '');
                    setModule(a.summary.suggestedModule ?? '');
                    setHub('');
                    setAsk({ kind: 'approve' });
                  }}
                  data-approve-rider
                >
                  Approve rider
                </Button>
                <Button variant="outline" disabled={run.isPending} onClick={() => setAsk({ kind: 'changes' })}>
                  Send back for changes
                </Button>
                <Button variant="outline" className="!border-dz-red !text-dz-red" disabled={run.isPending} onClick={() => setAsk({ kind: 'reject' })}>
                  Reject
                </Button>
              </>
            )}
            {a.status === 'APPROVED' && !suspended && (
              <Button variant="outline" className="!border-dz-red !text-dz-red" disabled={run.isPending} onClick={() => setAsk({ kind: 'suspend' })}>
                Suspend rider
              </Button>
            )}
            {suspended && (
              <Button variant="outline" disabled={run.isPending} onClick={() => run.mutate({ path: `/admin/riders/${a.rider.id}/reinstate`, ok: 'Reinstated — the rider can log in again' })}>
                Reinstate
              </Button>
            )}
            {inReview && unverified.length > 0 && <span className="text-sm text-ink-3">Verify {unverified.map((x) => DOC_NAME[x] ?? x).join(', ')} before approving.</span>}
            {a.status === 'APPROVED' && (
              <span className="text-sm text-ink-2">
                Works in <b>{a.rider.assignedModule ? moduleName(a.rider.assignedModule) : '—'}</b>
                {a.rider.hubName && (
                  <>
                    {' '}
                    · hub <b>{a.rider.hubName}</b>
                  </>
                )}
                . Approved riders get orders once they go online in the rider app.
              </span>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Documents">
          {a.missing.documents.length > 0 && <p className="mb-3 text-sm font-semibold text-dz-red">Missing: {a.missing.documents.map((x) => DOC_NAME[x] ?? x).join(', ')}</p>}
          <ul className="space-y-3">
            {a.documents.map((d) => (
              <li key={d.id} className="rounded-[12px] border border-line p-3" data-rider-doc={d.type}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b>{DOC_NAME[d.type] ?? d.type}</b>
                    {!a.missing.requiredDocuments.includes(d.type) && <span className="ml-1 text-xs text-ink-3">(optional)</span>}
                    <div className="text-xs text-ink-3">uploaded {fmtDate(d.uploadedAt)}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${d.status === 'VERIFIED' ? 'border-dz-green bg-dz-green-soft text-dz-green' : d.status === 'REJECTED' ? 'border-dz-red bg-dz-red-soft text-dz-red' : 'border-dz-yellow-strong bg-dz-yellow-soft'}`}>
                    {d.status === 'PENDING' ? 'To check' : d.status === 'VERIFIED' ? 'Verified' : 'Rejected'}
                  </span>
                </div>
                {d.rejectReason && <p className="mt-1 text-sm text-dz-red">{d.rejectReason}</p>}
                {!isPdf(d.url) && <img src={d.url} alt={DOC_NAME[d.type] ?? d.type} className="mt-2 max-h-56 rounded-lg border border-line object-contain" />}
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-[10px] border-[1.5px] border-ink px-3 text-sm font-bold hover:bg-soft">
                    Open file <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  {canAct && inReview && !suspended && (
                    <>
                      {d.status !== 'VERIFIED' && (
                        <Button variant="green" className="min-h-9" disabled={run.isPending} onClick={() => run.mutate({ path: `${base}/documents/${d.id}/verify`, ok: `${DOC_NAME[d.type] ?? d.type} verified` })}>
                          ✓ Verify
                        </Button>
                      )}
                      {d.status !== 'REJECTED' && (
                        <Button variant="outline" className="min-h-9" disabled={run.isPending} onClick={() => setAsk({ kind: 'reject-doc', doc: d })}>
                          Reject file
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
            {!a.documents.length && <li className="text-sm text-ink-3">No files uploaded.</li>}
          </ul>
        </Card>

        <div className="space-y-5">
          {a.missing.problems.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm" data-rider-problems>
              <b>Not complete:</b> {a.missing.problems.join(' ')}
            </p>
          )}
          <Card title="Personal">
            <dl>
              <Row k="Full name">{p.fullName as string}</Row>
              <Row k="Date of birth">{p.dob as string}</Row>
              <Row k="Email">{(p.email as string) || '—'}</Row>
              <Row k="Service pincode">{p.pincode as string}</Row>
              <Row k="ID">
                {label(opts, 'idTypes', p.idType)} · ends {(p.idLast4 as string) ?? '—'}
              </Row>
            </dl>
          </Card>
          <Card title="Services & work">
            <dl>
              <Row k="Tier">{a.summary.tier ?? '—'}</Row>
              <Row k="Services">{a.summary.services.length ? a.summary.services.map((s) => services.find((x) => x.value === s)?.label ?? s).join(', ') : '—'}</Row>
              <Row k="Works as">{label(opts, 'workPreferences', w.workPreference)}</Row>
              <Row k="Days · shift">
                {labels(opts, 'weekDays', w.workingDays)} · {label(opts, 'shifts', w.shift)}
              </Row>
              <Row k="Experience">
                {label(opts, 'experienceLevels', w.experienceLevel)}
                {w.previousPlatforms ? ` · ${w.previousPlatforms as string}` : ''}
              </Row>
              <Row k="Sectors">{labels(opts, 'sectors', w.sectors)}</Row>
              <Row k="Phone · maps · data">
                {label(opts, 'phoneTypes', w.phoneType)} · {label(opts, 'navigationApps', w.navigationApp)} · {label(opts, 'mobileDataPlans', w.mobileData)}
              </Row>
              <Row k="Training needs">{label(opts, 'trainingNeeds', w.trainingNeeds)}</Row>
            </dl>
          </Card>
          <Card title="Vehicle & licence">
            <dl>
              <Row k="Vehicle">{a.summary.vehicle ?? '—'}</Row>
              {own && (
                <>
                  <Row k="Type · make">
                    {label(opts, 'vehicleTypes', v.vehicleType)} · {(v.vehicleMakeModel as string) || '—'}
                  </Row>
                  <Row k="Registration">{(v.vehicleRegNumber as string) || '—'}</Row>
                  <Row k="Ownership · condition">
                    {label(opts, 'ownershipTypes', v.vehicleOwnership)} · {label(opts, 'vehicleConditions', v.operationalCondition)}
                  </Row>
                </>
              )}
              <Row k="Licence">{v.licenceType ? `${label(opts, 'licenceTypes', v.licenceType)} · ${v.licenceNumber as string}` : '—'}</Row>
              <Row k="Licence valid till">{(v.licenceExpiry as string) || '—'}</Row>
              <Row k="Legal declarations">{v.declarations ? 'All accepted' : '—'}</Row>
            </dl>
          </Card>
          <Card title="Jobs, safety & training">
            <dl>
              {a.steps.hyperlocal && (
                <Row k="Hyperlocal jobs">
                  {labels(opts, 'hyperlocalJobTypes', h.jobTypes)}
                  {a.summary.hyperlocalJobsNotEligible.length > 0 && (
                    <div className="text-xs font-normal text-amber-700">Needs a bigger vehicle: {labels(opts, 'hyperlocalJobTypes', a.summary.hyperlocalJobsNotEligible)}</div>
                  )}
                </Row>
              )}
              <Row k="Safety declarations">{a.steps['safety-compliance'] ? 'All 5 accepted' : '—'}</Row>
              <Row k="Role">{label(opts, 'operationalRoles', t.operationalRole)}</Row>
              <Row k="Training done">{Array.isArray(t.completedModules) ? `${t.completedModules.length} of ${opts?.trainingModules?.length ?? 5} modules` : '—'}</Row>
            </dl>
          </Card>
        </div>
      </div>

      {ask?.kind === 'approve' && (
        <Modal title="Approve rider" onClose={() => setAsk(null)}>
          <p className="text-sm text-ink-2">The rider can then go online and will be offered orders from shops in this city.</p>
          <label className="mt-4 block text-sm font-bold">
            Works in city
            <select value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} mt-1`}>
              <option value="">Choose a city…</option>
              {cities?.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold">
            Module in the rider app
            <select value={module} onChange={(e) => setModule(e.target.value)} className={`${inputCls} mt-1`} data-approve-module>
              <option value="">Choose a module…</option>
              {opts?.agentModules?.map((m) => (
                <option key={m} value={m}>
                  {moduleName(m)}
                  {m === a.summary.suggestedModule ? ' (from their services)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold">
            Hub (optional)
            <input value={hub} onChange={(e) => setHub(e.target.value)} maxLength={80} placeholder="e.g. Indiranagar hub" className={`${inputCls} mt-1`} data-approve-hub />
          </label>
          {unverified.length > 0 && <p className="mt-3 text-sm font-semibold text-dz-red">Verify these first: {unverified.map((x) => DOC_NAME[x] ?? x).join(', ')}</p>}
          <ErrorBox error={run.error ? errorText(run.error) : null} />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAsk(null)}>
              Cancel
            </Button>
            <Button
              variant="green"
              disabled={!city || !module || unverified.length > 0 || run.isPending}
              onClick={() => run.mutate({ path: `${base}/approve`, body: { cityId: city, module, ...(hub.trim() ? { hub: hub.trim() } : {}) }, ok: 'Approved — the rider can now go online and take orders' })}
              data-confirm-approve
            >
              Approve
            </Button>
          </div>
        </Modal>
      )}
      {ask && ask.kind !== 'approve' && (
        <Modal
          title={ask.kind === 'reject-doc' ? `Reject ${DOC_NAME[ask.doc.type] ?? ask.doc.type}` : ask.kind === 'changes' ? 'Send back for changes' : ask.kind === 'reject' ? 'Reject application' : 'Suspend rider'}
          onClose={() => setAsk(null)}
        >
          <p className="text-sm text-ink-2">
            {ask.kind === 'suspend' ? 'The rider is logged out everywhere and gets no new orders.' : 'The rider sees this message in the app.'}
          </p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus className="mt-3 w-full rounded-[9px] border-[1.5px] border-line p-3 outline-none focus:border-black" placeholder={ask.kind === 'reject-doc' ? 'e.g. Photo is blurred, upload a clear one' : 'What should the rider know?'} />
          <ErrorBox error={run.error ? errorText(run.error) : null} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAsk(null)}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 5 || run.isPending}
              onClick={() =>
                run.mutate(
                  ask.kind === 'reject-doc'
                    ? { path: `${base}/documents/${ask.doc.id}/reject`, body: { reason }, ok: 'File rejected — send the application back so the rider can upload a new one' }
                    : ask.kind === 'changes'
                      ? { path: `${base}/request-changes`, body: { reason }, ok: 'Sent back — the rider can fix and send again' }
                      : ask.kind === 'reject'
                        ? { path: `${base}/reject`, body: { reason }, ok: 'Application rejected' }
                        : { path: `/admin/riders/${a.rider.id}/suspend`, body: { reason }, ok: 'Rider suspended' },
                )
              }
            >
              Confirm
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
