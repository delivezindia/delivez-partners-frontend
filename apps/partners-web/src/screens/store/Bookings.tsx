import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ClipboardCheck, Eye, FileText, FlaskConical, Home, Plus, ShieldCheck, Sparkles, Store as StoreIcon, Upload, UserRound } from 'lucide-react';
import { api, newIdempotencyKey } from '../../lib/api';
import { inr } from '../../lib/catalog';
import { errorMessageOf } from '../../lib/onboarding';
import { dayKey, labAction, openHealthFile, slotLabel, STATUS, TABS, timeLabel, useLabBooking, useLabBookings, type BookingTab, type LabBooking } from '../../lib/labBookings';
import { Field, TextArea, TextInput } from '../../components/form';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';
import { MapPicker } from '../../components/MapPicker';
import { useAddressAutofill } from '../../lib/addressAutofill';
import { useI18n } from '../../lib/i18n';
import { useStoreContext } from './StoreLayout';

const CLINICAL = ['OWNER', 'MANAGER'];

// Lab bookings (Step 9b): confirm → [prescription] → collect sample → process → release the signed report.
export default function Bookings() {
  const { storeId } = useStoreContext();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<BookingTab>('TO_CONFIRM');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useLabBookings(storeId, tab);
  const simulate = useMutation({
    mutationFn: () => api<{ bookings: LabBooking[] }>(`/dev/stores/${storeId}/lab-bookings/simulate`, { method: 'POST', body: { count: 1 } }),
    onSuccess: (r) => (toast.success(t('lb.testCreated', { no: r.bookings[0].bookingNumber })), qc.invalidateQueries({ queryKey: ['lab-bookings', storeId] })),
    onError: (e) => toast.error(errorMessageOf(e) ?? t('lb.testFailed')),
  });

  const groups = useMemo(() => {
    const m = new Map<string, LabBooking[]>();
    for (const b of data?.bookings ?? []) {
      const k = dayKey(b.slotStart);
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return [...m.entries()];
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">{t('lb.title')}</h1>
          <p className="text-ink-2">{t('lb.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {import.meta.env.DEV && (
            <Button variant="ghost" className="min-h-11" disabled={simulate.isPending} onClick={() => simulate.mutate()}>
              <Sparkles className="h-4 w-4" aria-hidden /> {t('lb.testBooking')}
            </Button>
          )}
          <Button className="min-h-11" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden /> {t('lb.newBooking')}
          </Button>
        </div>
      </div>

      <div className="dz-scroll-x flex gap-1 overflow-x-auto border-b-[1.5px] border-line" role="tablist">
        {TABS.map((tb) => {
          const n = data?.counts[tb.key as keyof typeof data.counts];
          return (
            <button key={tb.key} role="tab" aria-selected={tab === tb.key} onClick={() => setTab(tb.key)} className={`-mb-[1.5px] whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold ${tab === tb.key ? 'border-dz-red text-dz-red' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {t(tb.t)}
              {n ? <span className="ml-1.5 rounded-full bg-dz-red px-1.5 text-xs text-white">{n}</span> : null}
            </button>
          );
        })}
      </div>

      {error && <ErrorText>{errorMessageOf(error)}</ErrorText>}
      {isLoading && <SkeletonList rows={4} />}
      {data && data.bookings.length === 0 && (
        <EmptyState icon={CalendarClock} title={tab === 'TO_CONFIRM' ? t('lb.nothingWaiting') : t('lb.noBookings')} body={tab === 'TO_CONFIRM' ? t('lb.emptyBody') : undefined} />
      )}
      {groups.map(([day, list]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-lg">{new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <ul className="dz-card divide-y divide-line">
            {list.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setOpenId(b.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50">
                  <span className="w-[4.5rem] shrink-0 text-center">
                    <b className="block whitespace-nowrap text-base leading-tight tabular-nums">{timeLabel(b.slotStart)}</b>
                    <span className="text-[11px] text-ink-3">{t('lb.slotMin', { n: b.slotMinutes })}</span>
                  </span>
                  <span className="min-w-[12rem] flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <b>{b.patient.name}</b>
                      <span className="text-xs text-ink-3">{[b.patient.age && t('lb.ageY', { n: b.patient.age }), b.patient.gender].filter(Boolean).join(' · ')}</span>
                      {b.isTestBooking && <span className="rounded bg-soft px-1 text-[10px] font-bold uppercase text-ink-3">{t('lb.testTag')}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-2">
                      {b.tests.map((x) => x.name).join(' · ')}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
                      {b.collectionType === 'HOME' ? <Home className="h-3 w-3" /> : <StoreIcon className="h-3 w-3" />}
                      {b.collectionType === 'HOME' ? t('lb.home') : t('lb.walkIn')}
                    </span>
                    {b.rx && <span className="rounded-full border border-dz-red bg-dz-red-soft px-2 py-0.5 text-dz-red">Rx</span>}
                    {b.fastingHours > 0 && <span className="rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-amber-800">{t('lb.fasting', { n: b.fastingHours })}</span>}
                    <span className={`rounded-full border px-2 py-0.5 ${STATUS[b.status].cls}`}>{t(STATUS[b.status].t)}</span>
                  </span>
                  <span className="ml-auto w-20 text-right text-sm">
                    <b className="tabular-nums">{inr(b.totals.grandTotal)}</b>
                    <span className="block text-[11px] text-ink-3">{b.bookingNumber}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {openId && <BookingPanel storeId={storeId} id={openId} onClose={() => setOpenId(null)} />}
      {creating && <NewBooking storeId={storeId} onClose={() => setCreating(false)} onCreated={(id) => (setCreating(false), setOpenId(id))} />}
    </div>
  );
}

function BookingPanel({ storeId, id, onClose }: { storeId: string; id: string; onClose: () => void }) {
  const { role } = useStoreContext();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: b, error } = useLabBooking(storeId, id);
  const clinical = CLINICAL.includes(role);
  const [code, setCode] = useState('');
  const [collector, setCollector] = useState({ name: '', phone: '' });
  const [rejecting, setRejecting] = useState<'rx-reject' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [doctor, setDoctor] = useState({ doctorName: '', doctorRegNo: '' });

  const run = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: unknown }) => labAction(storeId, id, action, body),
    onSuccess: (r) => {
      qc.setQueryData(['lab-booking', storeId, id], r);
      void qc.invalidateQueries({ queryKey: ['lab-bookings', storeId] });
      toast.success(t(STATUS[r.status].t));
      setRejecting(null);
      setReason('');
      setCode('');
    },
  });
  const open = (path: string) => openHealthFile(`/partners/stores/${storeId}/lab-bookings/${id}/${path}`).catch((e) => toast.error(errorMessageOf(e) ?? t('lb.openFailed')));

  if (error) return <Modal title={t('lb.booking')} onClose={onClose}><ErrorText>{errorMessageOf(error)}</ErrorText></Modal>;
  if (!b) return <Modal title={t('lb.booking')} onClose={onClose}><p className="text-ink-3">{t('lb.loading')}</p></Modal>;

  return (
    <Modal title={`${b.patient.name} · ${b.bookingNumber}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS[b.status].cls}`}>{t(STATUS[b.status].t)}</span>
          <span className="flex items-center gap-1 font-semibold"><CalendarClock className="h-4 w-4" /> {slotLabel(b.slotStart)}</span>
          <span className="text-ink-3">· {b.collectionType === 'HOME' ? t('lb.homeCollection') : t('lb.walkIn')}</span>
          {b.isTestBooking && <span className="rounded bg-soft px-1.5 text-xs font-bold uppercase text-ink-3">{t('lb.testBookingTag')}</span>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-soft p-4 text-sm">
            <p className="flex items-center gap-1.5 font-bold"><UserRound className="h-4 w-4" /> {t('lb.patient')}</p>
            <p className="mt-1">{b.patient.name}{b.patient.age ? `, ${t('lb.ageY', { n: b.patient.age })}` : ''}{b.patient.gender ? ` · ${b.patient.gender}` : ''}</p>
            <p className="text-ink-3">{t('lb.customerPhone', { phone: b.customerPhone })}</p>
            {b.address && <p className="mt-2">{[b.address.line1, b.address.landmark, b.address.pincode].filter(Boolean).join(', ')}{b.distanceKm != null && <span className="text-ink-3"> · {b.distanceKm} km</span>}</p>}
            {b.note && <p className="mt-2 rounded bg-white px-2 py-1 text-ink-2">“{b.note}”</p>}
          </div>
          <div className="rounded-xl bg-soft p-4 text-sm">
            <p className="flex items-center gap-1.5 font-bold"><FlaskConical className="h-4 w-4" /> {t('lb.tests')}</p>
            <ul className="mt-1 space-y-1">
              {b.tests.map((x) => (
                <li key={x.id} className="flex justify-between gap-2">
                  <span>{x.name} {x.isRx && <b className="text-dz-red">Rx</b>} <span className="text-xs text-ink-3">{[x.sampleType?.toLowerCase(), x.fastingHours ? t('lb.fasting', { n: x.fastingHours }) : null].filter(Boolean).join(' · ')}</span></span>
                  <b className="tabular-nums">{inr(x.price)}</b>
                </li>
              ))}
              {b.totals.collectionFee > 0 && <li className="flex justify-between text-ink-2"><span>{t('lb.homeCollection')}</span><span>{inr(b.totals.collectionFee)}</span></li>}
              <li className="flex justify-between border-t border-line pt-1 font-extrabold"><span>{b.payment.mode === 'COD' ? t('lb.totalCod') : t('od.totalOnline')}</span><span>{inr(b.totals.grandTotal)}</span></li>
            </ul>
            {b.payment.collectCash > 0 && <p className="mt-2 rounded bg-dz-yellow-soft px-2 py-1 font-bold">{t('lb.collectCash', { amount: inr(b.payment.collectCash) })}</p>}
            {b.totals.refund > 0 && <p className="mt-2 font-semibold text-dz-red">{t('lb.refund', { amount: inr(b.totals.refund) })}</p>}
          </div>
        </div>

        {/* Prescription */}
        {b.rx && (
          <div className="rounded-xl border-[1.5px] border-dz-red/40 p-4 text-sm">
            <p className="flex items-center gap-1.5 font-bold"><FileText className="h-4 w-4 text-dz-red" /> {t('lb.rx')}</p>
            {b.rx.prescription ? (
              <>
                <p className="mt-1 text-ink-2">{t('lb.rxStatusLabel')} <b>{b.rx.prescription.status.toLowerCase().replace(/_/g, ' ')}</b>{b.rx.prescription.doctorName && ` · ${b.rx.prescription.doctorName} (${b.rx.prescription.doctorRegNo ?? t('lb.noRegNo')})`}</p>
                <Button variant="ghost" className="mt-2 min-h-9 text-sm" onClick={() => void open('prescription')}>
                  <Eye className="h-4 w-4" /> {t('lb.openRx')}
                </Button>
                <p className="mt-1 text-xs text-ink-3">{t('lb.viewsLogged')}</p>
              </>
            ) : (
              <p className="mt-1 text-ink-2">{b.rx.seenByStore ? t('lb.rxSeen') : t('lb.noRx')}</p>
            )}
            {b.status === 'RX_REVIEW' && clinical && rejecting !== 'rx-reject' && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <TextInput placeholder={t('lb.doctorName')} value={doctor.doctorName} onChange={(e) => setDoctor({ ...doctor, doctorName: e.target.value })} />
                <TextInput placeholder={t('lb.doctorReg')} value={doctor.doctorRegNo} onChange={(e) => setDoctor({ ...doctor, doctorRegNo: e.target.value })} />
                <div className="flex gap-2 sm:col-span-2">
                  <Button variant="primary" className="min-h-10 text-sm" disabled={run.isPending} onClick={() => run.mutate({ action: 'rx-approve', body: { doctorName: doctor.doctorName || undefined, doctorRegNo: doctor.doctorRegNo || undefined } })}>
                    <ShieldCheck className="h-4 w-4" /> {t('lb.rxValid')}
                  </Button>
                  <Button variant="ghost" className="min-h-10 text-sm" onClick={() => setRejecting('rx-reject')}>{t('lb.rxInvalid')}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next step for this booking */}
        <div className="rounded-xl border-[1.5px] border-black p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink-3">{t('lb.nextStep')}</p>
          {rejecting ? (
            <div className="mt-2 space-y-2">
              <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('lb.rejectPh')} />
              <div className="flex gap-2">
                <Button variant="primary" className="min-h-10 text-sm" disabled={reason.trim().length < 5 || run.isPending} onClick={() => run.mutate({ action: rejecting, body: { reason } })}>{t('lb.reject')}</Button>
                <Button variant="ghost" className="min-h-10 text-sm" onClick={() => setRejecting(null)}>{t('lb.back')}</Button>
              </div>
            </div>
          ) : (
            <NextStep b={b} clinical={clinical} busy={run.isPending} code={code} setCode={setCode} collector={collector} setCollector={setCollector} run={(action, body) => run.mutate({ action, body })} reject={() => setRejecting('reject')} storeId={storeId} onReport={(r) => qc.setQueryData(['lab-booking', storeId, id], r)} />
          )}
          {run.error && <div className="mt-2"><ErrorText>{errorMessageOf(run.error)}</ErrorText></div>}
        </div>

        {/* Reports */}
        {b.reports.length > 0 && (
          <div className="space-y-2">
            <p className="font-bold">{t('lb.reports')}</p>
            {b.reports.map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${r.superseded ? 'border-line text-ink-3' : 'border-dz-green bg-dz-green-soft/40'}`}>
                <span>
                  <b>{t('lb.version', { n: r.version })}</b>{r.superseded ? ` ${t('lb.replaced')}` : ''} · {t('lb.signedBy', { name: r.pathologist.name, qual: r.pathologist.qualification })}
                  {r.amendReason && <span className="block text-xs">{t('lb.amended', { reason: r.amendReason })}</span>}
                  {r.summary && <span className="block text-xs">{r.summary}</span>}
                </span>
                <Button variant="ghost" className="min-h-9 text-xs" onClick={() => void open(`reports/${r.id}/file`)}><Eye className="h-3.5 w-3.5" /> {t('lb.open')}</Button>
              </div>
            ))}
            {clinical && <AccessLog storeId={storeId} id={id} />}
          </div>
        )}

        {b.timeline && (
          <details className="text-sm">
            <summary className="cursor-pointer font-bold">{t('od.timeline')}</summary>
            <ol className="mt-2 space-y-1.5">
              {b.timeline.map((ev, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <b>{t(STATUS[ev.to].t)}</b>{ev.reason && <span className="text-ink-2"> — {ev.reason}</span>}
                  <span className="block text-xs text-ink-3">{ev.actorType.toLowerCase()} · {new Date(ev.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </Modal>
  );
}

function NextStep(p: {
  b: LabBooking;
  clinical: boolean;
  busy: boolean;
  code: string;
  setCode: (v: string) => void;
  collector: { name: string; phone: string };
  setCollector: (v: { name: string; phone: string }) => void;
  run: (action: string, body?: unknown) => void;
  reject: () => void;
  storeId: string;
  onReport: (b: LabBooking) => void;
}) {
  const { b } = p;
  const { t } = useI18n();
  switch (b.status) {
    case 'RX_REVIEW':
      return <p className="mt-1 text-sm">{p.clinical ? t('lb.checkRx') : t('lb.checkRxOwner')}</p>;
    case 'BOOKED':
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button className="min-h-10 text-sm" disabled={p.busy} onClick={() => p.run('confirm')}><ClipboardCheck className="h-4 w-4" /> {t('lb.confirm')}</Button>
          <Button variant="ghost" className="min-h-10 text-sm" onClick={p.reject}>{t('lb.cantTake')}</Button>
        </div>
      );
    case 'CONFIRMED':
    case 'COLLECTOR_ASSIGNED':
      return (
        <div className="mt-2 space-y-3">
          {b.collectionType === 'HOME' && (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <TextInput placeholder={b.collector?.name ?? t('lb.collectorName')} value={p.collector.name} onChange={(e) => p.setCollector({ ...p.collector, name: e.target.value })} />
              <TextInput placeholder={b.collector?.phone ?? t('lb.collectorPhone')} inputMode="tel" value={p.collector.phone} onChange={(e) => p.setCollector({ ...p.collector, phone: e.target.value })} />
              <Button variant="dark" className="min-h-12 text-sm" disabled={p.busy || p.collector.name.trim().length < 2 || p.collector.phone.replace(/\D/g, '').length < 10} onClick={() => p.run('collector', p.collector)}>
                {b.collector ? t('lb.changeCollector') : t('lb.assignCollector')}
              </Button>
            </div>
          )}
          {(b.collectionType === 'WALK_IN' || b.status === 'COLLECTOR_ASSIGNED') && (
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t('lb.code')} className="w-56">
                <TextInput inputMode="numeric" maxLength={4} value={p.code} onChange={(e) => p.setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
              </Field>
              <Button className="min-h-12 text-sm" disabled={p.busy || p.code.length !== 4} onClick={() => p.run('collect', { otp: p.code })}>{t('lb.st.SAMPLE_COLLECTED')}</Button>
            </div>
          )}
          <button type="button" className="text-sm font-bold text-ink-3 underline" onClick={p.reject}>{t('lb.cantDo')}</button>
        </div>
      );
    case 'SAMPLE_COLLECTED':
    case 'PROCESSING':
    case 'REPORT_READY':
      return (
        <div className="mt-2 space-y-3">
          {b.status === 'SAMPLE_COLLECTED' && (
            <Button variant="ghost" className="min-h-10 text-sm" disabled={p.busy} onClick={() => p.run('processing')}>{t('lb.markProcessing')}</Button>
          )}
          {p.clinical ? <ReleaseReport storeId={p.storeId} b={b} onDone={p.onReport} /> : <p className="text-sm text-ink-2">{t('lb.ownerReleases')}</p>}
        </div>
      );
    default:
      return <p className="mt-1 text-sm text-ink-2">{b.cancelReason ? t('lb.closed', { reason: b.cancelReason }) : t('lb.nothingMore')}</p>;
  }
}

function ReleaseReport({ storeId, b, onDone }: { storeId: string; b: LabBooking; onDone: (b: LabBooking) => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const amend = b.status === 'REPORT_READY';
  const [file, setFile] = useState<File | null>(null);
  const [pathologistId, setPathologistId] = useState('');
  const [summary, setSummary] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [attest, setAttest] = useState(false);
  const [open, setOpen] = useState(!amend);
  const pathologists = useQuery({ queryKey: ['lab-pathologists', storeId], queryFn: () => api<{ id: string; name: string; qualification: string; registrationNo: string }[]>(`/partners/stores/${storeId}/lab-pathologists`) });
  const chosen = pathologistId || pathologists.data?.[0]?.id || '';
  const release = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t('lb.choosePdf'));
      const pre = await api<{ uploadUrl: string; fileKey: string }>(`/partners/stores/${storeId}/lab-bookings/${b.id}/report-uploads`, { method: 'POST', body: { size: file.size } });
      const put = await fetch(pre.uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file });
      if (!put.ok) throw new Error(t('lb.uploadFailed'));
      return api<LabBooking>(`/partners/stores/${storeId}/lab-bookings/${b.id}/reports`, {
        method: 'POST',
        body: { fileKey: pre.fileKey, pathologistId: chosen, summary: summary || undefined, attest: true, ...(amend ? { amendReason } : {}) },
        idempotencyKey: newIdempotencyKey(),
      });
    },
    onSuccess: (r) => {
      onDone(r);
      void qc.invalidateQueries({ queryKey: ['lab-bookings', storeId] });
      toast.success(amend ? t('lb.amendedSent') : t('lb.reportSent'));
      setFile(null);
      setAttest(false);
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <Button variant="ghost" className="min-h-10 text-sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> {t('lb.amendReport')}
      </Button>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('lb.pdf')}>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:font-bold file:text-white" />
        </Field>
        <Field label={t('lb.signedByLabel')}>
          <select className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3" value={chosen} onChange={(e) => setPathologistId(e.target.value)}>
            {pathologists.data?.map((x) => <option key={x.id} value={x.id}>{x.name}, {x.qualification}</option>)}
          </select>
        </Field>
        <Field label={t('lb.summary')} className="sm:col-span-2">
          <TextInput value={summary} maxLength={500} onChange={(e) => setSummary(e.target.value)} placeholder={t('lb.summaryPh')} />
        </Field>
        {amend && (
          <Field label={t('lb.whyAmend')} className="sm:col-span-2">
            <TextInput value={amendReason} maxLength={300} onChange={(e) => setAmendReason(e.target.value)} placeholder={t('lb.amendPh')} />
          </Field>
        )}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5 h-4 w-4" />
        {t('lb.attest')}
      </label>
      <Button className="min-h-11 text-sm" disabled={!file || !attest || !chosen || (amend && amendReason.trim().length < 5) || release.isPending} onClick={() => release.mutate()}>
        <Upload className="h-4 w-4" /> {release.isPending ? t('lb.sending') : amend ? t('lb.sendAmended') : t('lb.sendReport')}
      </Button>
      {release.error && <ErrorText>{errorMessageOf(release.error) ?? (release.error as Error).message}</ErrorText>}
    </div>
  );
}

function AccessLog({ storeId, id }: { storeId: string; id: string }) {
  const [show, setShow] = useState(false);
  const { t } = useI18n();
  const log = useQuery({ queryKey: ['lab-access', id], queryFn: () => api<{ version: number; actorType: string; who: string | null; purpose: string | null; at: string }[]>(`/partners/stores/${storeId}/lab-bookings/${id}/report-access`), enabled: show });
  return (
    <div className="text-sm">
      <button type="button" className="font-bold text-ink-2 underline" onClick={() => setShow((v) => !v)}>{show ? t('lb.hide') : t('lb.whoOpened')}</button>
      {show && (
        <ul className="mt-2 space-y-1 text-xs text-ink-2">
          {log.data?.length === 0 && <li>{t('lb.nobody')}</li>}
          {log.data?.map((x, i) => (
            <li key={i}>v{x.version} · {x.who ?? x.actorType.toLowerCase()} ({x.actorType.toLowerCase()}){x.purpose && ` — ${x.purpose}`} · {new Date(x.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Phone / walk-in bookings entered at the lab. */
function NewBooking({ storeId, onClose, onCreated }: { storeId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const { detail } = useStoreContext();
  const { t } = useI18n();
  const homeOk = detail.store.supportsDelivery;
  const [f, setF] = useState({ phone: '', name: '', patient: '', age: '', gender: '' as '' | 'F' | 'M' | 'O', type: (detail.store.supportsPickup ? 'WALK_IN' : 'HOME') as 'HOME' | 'WALK_IN', date: new Date(Date.now() + 5.5 * 3600_000 + 86_400_000).toISOString().slice(0, 10), slot: '', pay: 'COD' as 'COD' | 'UPI', line1: '', pincode: '', rxSeen: false });
  const [testIds, setTestIds] = useState<string[]>([]);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const autofill = useAddressAutofill<'line1' | 'pincode'>();
  const tests = useQuery({ queryKey: ['products', storeId], queryFn: () => api<{ products: { id: string; name: string; price: number; prescriptionRequired: boolean; isAvailable: boolean; lab: { homeCollection: boolean | null; walkIn: boolean | null } | null }[] }>(`/partners/stores/${storeId}/products`) });
  const slots = useQuery({ queryKey: ['lab-slots', storeId, f.date, f.type], queryFn: () => api<{ slots: { start: string; left: number; available: boolean }[] }>(`/partners/stores/${storeId}/lab-slots?date=${f.date}&type=${f.type}`) });
  const offered = (tests.data?.products ?? []).filter((t) => t.isAvailable && (f.type === 'HOME' ? t.lab?.homeCollection !== false : t.lab?.walkIn !== false));
  const needsRx = offered.some((t) => testIds.includes(t.id) && t.prescriptionRequired);
  const total = offered.filter((t) => testIds.includes(t.id)).reduce((s, t) => s + t.price, 0);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: () =>
      api<LabBooking>(`/partners/stores/${storeId}/lab-bookings`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: {
          customer: { phone: f.phone, name: f.name || undefined },
          patient: { name: f.patient || f.name, age: f.age ? Number(f.age) : undefined, gender: f.gender || undefined },
          collectionType: f.type,
          slotStart: f.slot,
          testIds,
          paymentMode: f.pay,
          rxSeenByStore: needsRx ? f.rxSeen : undefined,
          // Home address: the map pin comes from the store location until address search is added here.
          address: f.type === 'HOME' && pin ? { line1: f.line1, pincode: f.pincode, lat: pin.lat, lng: pin.lng } : undefined,
        },
      }),
    onSuccess: (b) => (void qc.invalidateQueries({ queryKey: ['lab-bookings', storeId] }), toast.success(t('lb.booked', { no: b.bookingNumber })), onCreated(b.id)),
  });

  return (
    <Modal title={t('lb.newBooking')} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('no.mobile')}><TextInput inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98450 12345" /></Field>
          <Field label={t('lb.customerName')}><TextInput value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label={t('lb.patientName')}><TextInput value={f.patient} onChange={(e) => set('patient', e.target.value)} placeholder={t('lb.patientPh')} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('lb.age')}><TextInput inputMode="numeric" value={f.age} onChange={(e) => set('age', e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label={t('lb.gender')}>
              <select className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3" value={f.gender} onChange={(e) => set('gender', e.target.value as typeof f.gender)}>
                <option value="">—</option><option value="F">{t('lb.female')}</option><option value="M">{t('lb.male')}</option><option value="O">{t('lb.other')}</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['WALK_IN', 'HOME'] as const).map((ct) => (
            <button key={ct} type="button" disabled={ct === 'HOME' ? !homeOk : !detail.store.supportsPickup} onClick={() => (set('type', ct), set('slot', ''))} className={`flex h-11 items-center gap-2 rounded-xl border-[1.5px] px-3 text-sm font-semibold disabled:opacity-40 ${f.type === ct ? 'border-black bg-dz-yellow-soft' : 'border-line'}`}>
              {ct === 'HOME' ? <Home className="h-4 w-4" /> : <StoreIcon className="h-4 w-4" />} {ct === 'HOME' ? t('lb.homeCollection') : t('lb.walkIn')}
            </button>
          ))}
        </div>
        {f.type === 'HOME' && (
          <MapPicker
            lat={pin?.lat ?? null}
            lng={pin?.lng ?? null}
            fallbackCenter={[detail.store.lat ?? 12.9716, detail.store.lng ?? 77.5946]}
            height="h-56"
            placeholder={t('lb.searchAddress')}
            hint={t('lb.pinHint')}
            onChange={(lat, lng) => setPin({ lat, lng })}
            onAddress={(r) => setF((x) => autofill(x, { line1: r.landmark ? `${r.line1} (near ${r.landmark})` : r.line1, pincode: r.pincode && /^\d{6}$/.test(r.pincode) ? r.pincode : null }))}
          />
        )}
        {f.type === 'HOME' && (
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label={t('lb.address')}><TextInput value={f.line1} onChange={(e) => set('line1', e.target.value)} /></Field>
            <Field label={t('no.pincode')}><TextInput inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} /></Field>
          </div>
        )}
        <div>
          <div className="flex items-end gap-3">
            <Field label={t('lb.date')}><TextInput type="date" value={f.date} onChange={(e) => (set('date', e.target.value), set('slot', ''))} /></Field>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {slots.data?.slots.length === 0 && <p className="text-sm text-ink-3">{t('lb.noSlots')}</p>}
            {slots.data?.slots.map((s) => (
              <button key={s.start} type="button" disabled={!s.available} onClick={() => set('slot', s.start)} className={`rounded-lg border-[1.5px] px-2.5 py-1.5 text-sm font-semibold disabled:opacity-35 ${f.slot === s.start ? 'border-black bg-black text-dz-yellow' : 'border-line bg-white'}`}>
                {timeLabel(s.start)}{s.available && <span className="ml-1 text-[10px] opacity-70">{t('lb.left', { n: s.left })}</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold">{t('lb.tests')}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {offered.map((x) => {
              const on = testIds.includes(x.id);
              return (
                <button key={x.id} type="button" onClick={() => setTestIds((ids) => (on ? ids.filter((i) => i !== x.id) : [...ids, x.id]))} className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold ${on ? 'border-black bg-dz-yellow-soft' : 'border-line bg-white'}`}>
                  {x.name} · {inr(x.price)} {x.prescriptionRequired && <b className="text-dz-red">Rx</b>}
                </button>
              );
            })}
          </div>
        </div>
        {needsRx && (
          <label className="flex items-start gap-2 rounded-xl bg-dz-red-soft p-3 text-sm">
            <input type="checkbox" checked={f.rxSeen} onChange={(e) => set('rxSeen', e.target.checked)} className="mt-0.5 h-4 w-4" />
            {t('lb.rxCheck')}
          </label>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex gap-2">
            {(['COD', 'UPI'] as const).map((m) => (
              <button key={m} type="button" onClick={() => set('pay', m)} className={`rounded-lg border-[1.5px] px-3 py-1.5 text-sm font-bold ${f.pay === m ? 'border-black bg-black text-white' : 'border-line'}`}>{m === 'COD' ? t('lb.payAtCollection') : t('no.paidUpi')}</button>
            ))}
          </div>
          <b className="text-lg">{inr(total)}</b>
        </div>
        {save.error && <ErrorText>{errorMessageOf(save.error)}</ErrorText>}
        <Button className="w-full" disabled={save.isPending || !f.phone || !(f.patient || f.name) || !f.slot || !testIds.length || (needsRx && !f.rxSeen) || (f.type === 'HOME' && (!pin || !f.line1 || f.pincode.length !== 6))} onClick={() => save.mutate()}>
          {save.isPending ? t('lb.bookingPending') : t('lb.book')}
        </Button>
      </div>
    </Modal>
  );
}
