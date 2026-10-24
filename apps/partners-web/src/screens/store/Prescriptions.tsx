import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, FileText, Settings2, ShieldCheck, Sparkles, UserPlus, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { inr } from '../../lib/catalog';
import { useI18n } from '../../lib/i18n';
import { errorMessageOf } from '../../lib/onboarding';
import { orderAction, STATUS, useOrders, type Order } from '../../lib/orders';
import { istClock, istToday, pharmacyApi, RX_REJECT_REASONS, todaysShift, usePharmacists, type Pharmacist, type PharmacyTeam, type RxRejectReason, type Shift } from '../../lib/pharmacy';
import { DAYS, TimingsEditor, type DaySlot } from '../../components/TimingsEditor';
import { Field, TextArea, TextInput } from '../../components/form';
import { Modal } from '../../components/Modal';
import { Button, ErrorText } from '../../components/ui';
import { EmptyState, SkeletonList, toast } from '../../components/feedback';
import { useStoreContext } from './StoreLayout';

const REVIEWERS = ['OWNER', 'MANAGER', 'PHARMACIST'];

// P17 Prescriptions: a registered pharmacist checks every prescription before the order reaches the counter.
export default function Prescriptions() {
  const { storeId, role } = useStoreContext();
  const { t } = useI18n();
  const qc = useQueryClient();
  const team = usePharmacists(storeId);
  const queue = useOrders(storeId, 'RX');
  const recent = useOrders(storeId, 'ALL');
  const [open, setOpen] = useState<Order | null>(null);
  const [managing, setManaging] = useState(false);
  const canReview = REVIEWERS.includes(role);
  const now = useNow();

  const simulate = useMutation({
    mutationFn: () => api<{ orders: Order[] }>(`/dev/stores/${storeId}/orders/simulate`, { method: 'POST', body: { count: 1, rx: 'YES' } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['orders', storeId] }),
    onError: (e) => toast.error(errorMessageOf(e) ?? t('rx.testFailed')),
  });

  const reviewedToday = useMemo(() => {
    const today = istToday();
    return (recent.data?.orders ?? []).filter((o) => o.rx?.reviewedAt && new Date(new Date(o.rx.reviewedAt).getTime() + 5.5 * 3600_000).toISOString().startsWith(today));
  }, [recent.data]);

  const waiting = queue.data?.orders ?? [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.5vw,40px)]">{t('tab.prescriptions')}</h1>
          <p className="text-ink-2">{t('rx.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {import.meta.env.DEV && (role === 'OWNER' || role === 'MANAGER') && (
            <Button variant="ghost" className="min-h-11" disabled={simulate.isPending} onClick={() => simulate.mutate()}>
              <Sparkles className="h-4 w-4" aria-hidden /> {t('rx.testOrder')}
            </Button>
          )}
          {team.data?.canManage && (
            <Button variant="ghost" className="min-h-11" onClick={() => setManaging(true)}>
              <Settings2 className="h-4 w-4" aria-hidden /> {t('rx.manage')}
            </Button>
          )}
        </div>
      </div>

      {team.error && <ErrorText>{errorMessageOf(team.error)}</ErrorText>}
      {team.data && <DutyPanel storeId={storeId} team={team.data} role={role} />}

      <section className="space-y-2" aria-label={t('rx.queue')}>
        <h2 className="text-xl">
          {t('rx.queue')} {waiting.length > 0 && <span className="ml-1 rounded-full bg-dz-blue px-2 text-sm text-white">{waiting.length}</span>}
        </h2>
        {queue.isLoading && <SkeletonList rows={2} />}
        {queue.data && waiting.length === 0 && <EmptyState icon={ClipboardCheck} title={t('rx.emptyTitle')} body={t('rx.emptyBody')} />}
        <ul className="grid gap-3 md:grid-cols-2">
          {waiting.map((o) => {
            const left = o.rxReviewBy ? (new Date(o.rxReviewBy).getTime() - now) / 1000 : 0;
            return (
              <li key={o.id} className="dz-card flex flex-col gap-3 p-4" aria-label={t('rx.cardAria', { no: o.orderNumber })}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b className="text-lg">{o.orderNumber}</b>
                    {o.isTestOrder && <span className="ml-2 rounded bg-soft px-1 text-[10px] font-bold uppercase text-ink-3">{t('ord.test')}</span>}
                    <p className="text-sm text-ink-2">{o.customer.name} · {o.fulfilmentType === 'PICKUP' ? t('ord.pickup') : t('ord.delivery')} · {inr(o.totals.grandTotal)}</p>
                  </div>
                  <span className={`text-right text-xl font-extrabold tabular-nums ${left < 180 ? 'text-dz-red' : ''}`} title={t('rx.reviewWithin')}>
                    {mmss(left)}
                    <span className="block text-[11px] font-semibold text-ink-3">{t('rx.left')}</span>
                  </span>
                </div>
                <ul className="space-y-0.5 text-sm">
                  {o.items.filter((i) => !i.unavailable).map((i) => (
                    <li key={i.id}>
                      <b className="tabular-nums">{i.qty}×</b> {i.name} {i.isRx && <b className="text-dz-red">Rx</b>}
                    </li>
                  ))}
                </ul>
                {canReview ? (
                  <Button className="min-h-11" onClick={() => setOpen(o)}>
                    <ShieldCheck className="h-4 w-4" aria-hidden /> {t('rx.review')}
                  </Button>
                ) : (
                  <p className="text-sm text-ink-2">{t('rx.waitingPharmacist')}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {reviewedToday.length > 0 && (
        <section className="space-y-2" aria-label={t('rx.reviewedToday')}>
          <h2 className="text-xl">{t('rx.reviewedToday')}</h2>
          <ul className="dz-card divide-y divide-line">
            {reviewedToday.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                {o.rx?.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4 text-dz-green" aria-hidden /> : <XCircle className="h-4 w-4 text-dz-red" aria-hidden />}
                <Link to={`/stores/${storeId}/orders/${o.orderNumber}`} className="font-bold hover:underline">{o.orderNumber}</Link>
                <span>{o.rx?.status === 'APPROVED' ? t('rx.approved') : t('rx.rejected')}</span>
                <span className="text-ink-3">{o.rx?.reviewedBy ? t('rx.byWhom', { name: o.rx.reviewedBy.name }) : ''} · {o.rx?.reviewedAt ? istClock(o.rx.reviewedAt) : ''}</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS[o.status].cls}`}>{t(STATUS[o.status].t)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && team.data && <ReviewPanel order={open} team={team.data} onClose={() => setOpen(null)} />}
      {managing && team.data && <ManagePharmacists storeId={storeId} team={team.data} onClose={() => setManaging(false)} />}
    </div>
  );
}

// --------------------------------------------------------------------
// Who is on duty
// --------------------------------------------------------------------

function DutyPanel({ storeId, team, role }: { storeId: string; team: PharmacyTeam; role: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const duty = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: 'ON' | 'OFF' | 'SHIFTS' }) => pharmacyApi.duty(storeId, id, mode),
    onSuccess: (r, v) => (qc.setQueryData(['pharmacists', storeId], r), toast.success(v.mode === 'ON' ? t('rx.dutyStarted') : v.mode === 'OFF' ? t('rx.dutyEnded') : t('rx.dutyShifts'))),
    onError: (e) => toast.error(errorMessageOf(e) ?? t('rx.dutyFailed')),
  });
  const lead = role === 'OWNER' || role === 'MANAGER';
  return (
    <section className="space-y-3" aria-label={t('rx.onDutyTitle')}>
      {!team.rxOpen && (
        <p className="flex items-start gap-2 rounded-2xl border-[1.5px] border-dz-red bg-dz-red-soft px-4 py-3 text-sm font-semibold text-dz-red" role="alert" data-rx-closed>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t('rx.nobodyOnDuty')}
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {team.pharmacists.map((p) => {
          const canSwitch = lead || p.isMe;
          const shift = todaysShift(p);
          return (
            <li key={p.id} className="dz-card flex flex-wrap items-center gap-3 p-4" data-pharmacist={p.registrationNo}>
              <span className={`h-3 w-3 shrink-0 rounded-full ${p.duty.onDuty ? 'bg-dz-green' : 'bg-neutral-300'}`} aria-hidden />
              <div className="min-w-[12rem] flex-1">
                <b>{p.name}</b> {p.isMe && <span className="text-xs font-bold text-ink-3">({t('rx.you')})</span>}
                <p className="text-xs text-ink-3">{p.registrationNo} · {p.stateCouncil}</p>
                <p className="mt-1 text-sm font-semibold" data-duty={p.duty.onDuty ? 'on' : 'off'}>
                  {p.duty.onDuty
                    ? p.duty.source === 'MANUAL'
                      ? t('rx.onDutyManual')
                      : t('rx.onDutyShift', { shift: shift ?? '' })
                    : p.override
                      ? t('rx.offDutyToday')
                      : p.duty.nextShift
                        ? t('rx.offDutyNext', { next: p.duty.nextShift })
                        : t('rx.offDuty')}
                </p>
              </div>
              {canSwitch && (
                <div className="flex flex-wrap gap-2">
                  {p.duty.onDuty ? (
                    <Button variant="ghost" className="min-h-10 text-sm" disabled={duty.isPending} onClick={() => duty.mutate({ id: p.id, mode: 'OFF' })}>{t('rx.endDuty')}</Button>
                  ) : (
                    <Button variant="dark" className="min-h-10 text-sm" disabled={duty.isPending} onClick={() => duty.mutate({ id: p.id, mode: 'ON' })}>{t('rx.startDuty')}</Button>
                  )}
                  {p.override && (
                    <Button variant="ghost" className="min-h-10 text-sm" disabled={duty.isPending} onClick={() => duty.mutate({ id: p.id, mode: 'SHIFTS' })}>{t('rx.backToShifts')}</Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --------------------------------------------------------------------
// The review
// --------------------------------------------------------------------

function ReviewPanel({ order, team, onClose }: { order: Order; team: PharmacyTeam; onClose: () => void }) {
  const { storeId, role } = useStoreContext();
  const { t } = useI18n();
  const qc = useQueryClient();
  const mine = team.pharmacists.find((p) => p.isMe);
  const onDuty = team.pharmacists.filter((p) => p.duty.onDuty);
  const [pharmacistId, setPharmacistId] = useState(mine?.id ?? onDuty[0]?.id ?? '');
  const [f, setF] = useState({ doctorName: '', doctorRegNo: '', issuedOn: istToday(), patientName: '', notes: '' });
  const [attest, setAttest] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<RxRejectReason>('UNREADABLE');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<{ url: string; contentType: string }[] | null>(null);
  const [items, setItems] = useState(order.items);
  const reviewer = mine ?? team.pharmacists.find((p) => p.id === pharmacistId);
  const unlinkedPharmacist = role === 'PHARMACIST' && !mine;

  const done = (o: Order, msg: string) => {
    qc.setQueryData(['order', storeId, o.orderNumber], o);
    void qc.invalidateQueries({ queryKey: ['orders', storeId] });
    toast.success(msg);
    onClose();
  };
  const view = useMutation({ mutationFn: () => pharmacyApi.files(storeId, order.id), onSuccess: (r) => setFiles(r.files), onError: (e) => toast.error(errorMessageOf(e) ?? t('lb.openFailed')) });
  const approve = useMutation({
    mutationFn: () => pharmacyApi.approve(storeId, order.id, { ...(mine ? {} : { pharmacistId }), doctorName: f.doctorName, doctorRegNo: f.doctorRegNo, issuedOn: f.issuedOn, patientName: f.patientName || undefined, notes: f.notes || undefined, attest: true }),
    onSuccess: (o) => done(o, t('rx.approvedToast', { no: o.orderNumber })),
  });
  const reject = useMutation({
    mutationFn: () => pharmacyApi.reject(storeId, order.id, { reason, note: note || undefined, ...(mine || !pharmacistId ? {} : { pharmacistId }) }),
    onSuccess: (o) => done(o, t('rx.rejectedToast', { no: o.orderNumber })),
  });
  const removeItem = useMutation({
    mutationFn: (itemId: string) => orderAction(storeId, order.id, `items/${itemId}/unavailable`, { switchOff: false }),
    onSuccess: (o) => (setItems(o.items), void qc.invalidateQueries({ queryKey: ['orders', storeId] }), toast.success(t('rx.itemRemoved'))),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const live = items.filter((i) => !i.unavailable);
  const ready = !!reviewer && reviewer.duty.onDuty && f.doctorName.trim().length >= 3 && f.doctorRegNo.trim().length >= 3 && !!f.issuedOn && attest;

  return (
    <Modal title={t('rx.reviewTitle', { no: order.orderNumber })} onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-xl bg-soft p-4 text-sm">
            <p className="font-bold">{t('rx.orderItems')}</p>
            <ul className="mt-2 space-y-2">
              {live.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2">
                  <span>
                    <b className="tabular-nums">{i.qty}×</b> {i.name} {i.isRx && <b className="text-dz-red">Rx</b>}
                  </span>
                  {live.length > 1 && (
                    <button type="button" className="shrink-0 text-xs font-bold text-ink-3 underline hover:text-dz-red" disabled={removeItem.isPending} onClick={() => removeItem.mutate(i.id)}>
                      {t('rx.notOnRx')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-line pt-2 text-ink-2">{order.customer.name} · {order.payment.mode === 'COD' ? t('ord.cash') : t('ord.paidOnline')}</p>
          </div>

          <div className="rounded-xl border-[1.5px] border-dz-blue/40 p-4 text-sm">
            <p className="flex items-center gap-1.5 font-bold"><FileText className="h-4 w-4 text-dz-blue" aria-hidden /> {t('lb.rx')}</p>
            {!files ? (
              <Button variant="ghost" className="mt-2 min-h-10 text-sm" disabled={view.isPending} onClick={() => view.mutate()}>
                <Eye className="h-4 w-4" aria-hidden /> {t('lb.openRx')}
              </Button>
            ) : (
              <div className="mt-2 space-y-2">
                {files.map((fl, i) =>
                  fl.contentType === 'application/pdf' ? (
                    <iframe key={i} src={fl.url} title={t('lb.rx')} className="h-[420px] w-full rounded-lg border border-line bg-white" data-rx-file />
                  ) : (
                    <img key={i} src={fl.url} alt={t('lb.rx')} className="max-h-[420px] w-full rounded-lg border border-line object-contain" data-rx-file />
                  ),
                )}
                <a href={files[0]?.url} target="_blank" rel="noreferrer" className="text-xs font-bold underline">{t('rx.openNewTab')}</a>
              </div>
            )}
            <p className="mt-1 text-xs text-ink-3">{t('rx.viewLogged')}</p>
          </div>
        </div>

        <div className="space-y-3">
          {unlinkedPharmacist ? (
            <p className="rounded-xl bg-dz-yellow-soft p-3 text-sm font-semibold">{t('rx.linkFirst')}</p>
          ) : mine ? (
            <p className="rounded-xl bg-soft p-3 text-sm">{t('rx.reviewingAs', { name: mine.name, reg: mine.registrationNo })}</p>
          ) : (
            <Field label={t('rx.whoChecked')}>
              <select className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3" value={pharmacistId} onChange={(e) => setPharmacistId(e.target.value)} aria-label={t('rx.whoChecked')}>
                {team.pharmacists.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.duty.onDuty}>
                    {p.name} ({p.registrationNo}){p.duty.onDuty ? '' : ` — ${t('rx.offDuty')}`}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {reviewer && !reviewer.duty.onDuty && <p className="text-sm font-semibold text-dz-red">{t('rx.reviewerOffDuty', { name: reviewer.name })}</p>}

          {!rejecting ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('rx.doctorName')}><TextInput value={f.doctorName} onChange={set('doctorName')} placeholder="Dr. …" /></Field>
                <Field label={t('rx.doctorReg')}><TextInput value={f.doctorRegNo} onChange={set('doctorRegNo')} placeholder="KMC-12345" /></Field>
                <Field label={t('rx.rxDate')} hint={t('rx.rxDateHint')}><TextInput type="date" max={istToday()} value={f.issuedOn} onChange={set('issuedOn')} /></Field>
                <Field label={t('rx.patient')}><TextInput value={f.patientName} onChange={set('patientName')} /></Field>
              </div>
              <Field label={t('rx.notes')}><TextArea rows={2} value={f.notes} onChange={set('notes')} placeholder={t('rx.notesPh')} /></Field>
              <label className="flex items-start gap-2 rounded-xl bg-dz-blue-soft p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
                {t('rx.attest', { name: reviewer?.name ?? '' })}
              </label>
              {approve.error && <ErrorText>{errorMessageOf(approve.error)}</ErrorText>}
              <div className="flex flex-wrap gap-2">
                <Button className="min-h-12 flex-1" disabled={!ready || unlinkedPharmacist || approve.isPending} onClick={() => approve.mutate()}>
                  <ShieldCheck className="h-4 w-4" aria-hidden /> {t('rx.approve')}
                </Button>
                <Button variant="ghost" className="min-h-12" onClick={() => setRejecting(true)}>{t('rx.reject')}</Button>
              </div>
              <p className="text-xs text-ink-3">{t('rx.approveNote')}</p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="font-bold">{t('rx.whyReject')}</p>
              <div className="space-y-1.5" role="radiogroup" aria-label={t('rx.whyReject')}>
                {RX_REJECT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="rx-reason" checked={reason === r.value} onChange={() => setReason(r.value)} /> {t(r.t)}
                  </label>
                ))}
              </div>
              <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('rx.rejectNotePh')} aria-label={t('rx.rejectNotePh')} />
              {reject.error && <ErrorText>{errorMessageOf(reject.error)}</ErrorText>}
              <div className="flex gap-2">
                <Button variant="primary" className="min-h-11" disabled={reject.isPending || unlinkedPharmacist || (reason === 'OTHER' && !note.trim())} onClick={() => reject.mutate()}>{t('rx.rejectConfirm')}</Button>
                <Button variant="ghost" className="min-h-11" onClick={() => setRejecting(false)}>{t('lb.back')}</Button>
              </div>
              <p className="text-xs text-ink-3">{t('rx.rejectNote')}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------------
// Pharmacists: shifts, logins, add/remove (owners & managers)
// --------------------------------------------------------------------

const toSlots = (shifts: Shift[]): DaySlot[] =>
  DAYS.map((_, d) => {
    const s = shifts.find((x) => x.dayOfWeek === d);
    return { dayOfWeek: d, open: !!s, opensAt: s?.startsAt ?? '09:00', closesAt: s?.endsAt ?? '21:00' };
  });
const toShifts = (slots: DaySlot[]): Shift[] => slots.filter((s) => s.open).map((s) => ({ dayOfWeek: s.dayOfWeek, startsAt: s.opensAt, endsAt: s.closesAt }));

function ManagePharmacists({ storeId, team, onClose }: { storeId: string; team: PharmacyTeam; onClose: () => void }) {
  const { t } = useI18n();
  const { role } = useStoreContext();
  const [adding, setAdding] = useState(false);
  return (
    <Modal title={t('rx.manage')} onClose={onClose} wide>
      <div className="space-y-4">
        {team.pharmacists.map((p) => <PharmacistEditor key={p.id} storeId={storeId} p={p} team={team} canRemove={role === 'OWNER' && team.pharmacists.length > 1} />)}
        {adding ? (
          <AddPharmacist storeId={storeId} onDone={() => setAdding(false)} />
        ) : (
          <Button variant="ghost" className="min-h-11 w-full" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" aria-hidden /> {t('rx.addPharmacist')}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function PharmacistEditor({ storeId, p, team, canRemove }: { storeId: string; p: Pharmacist; team: PharmacyTeam; canRemove: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [slots, setSlots] = useState(() => toSlots(p.shifts));
  const save = (fn: () => Promise<PharmacyTeam>, msg: string) =>
    fn()
      .then((r) => (qc.setQueryData(['pharmacists', storeId], r), toast.success(msg)))
      .catch((e) => toast.error(errorMessageOf(e) ?? t('rx.saveFailed')));
  return (
    <div className="rounded-2xl border-[1.5px] border-line p-4" data-editor={p.registrationNo}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <b>{p.name}</b>
          <p className="text-xs text-ink-3">{p.registrationNo} · {p.stateCouncil}</p>
        </div>
        {canRemove && (
          <button type="button" className="text-sm font-bold text-ink-3 underline hover:text-dz-red" onClick={() => window.confirm(t('rx.removeConfirm', { name: p.name })) && void save(() => pharmacyApi.remove(storeId, p.id), t('rx.removed'))}>
            {t('rx.remove')}
          </button>
        )}
      </div>
      <Field label={t('rx.login')} hint={t('rx.loginHint')} className="mt-3">
        <select className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3" value={p.login?.userId ?? ''} onChange={(e) => void save(() => pharmacyApi.login(storeId, p.id, e.target.value || null), t('rx.saved'))} aria-label={t('rx.login')}>
          <option value="">{t('rx.noLogin')}</option>
          {team.members.map((m) => <option key={m.userId} value={m.userId}>{m.name} · {m.role.toLowerCase()}</option>)}
        </select>
      </Field>
      <p className="mb-2 mt-4 text-sm font-bold">{t('rx.shifts')}</p>
      <TimingsEditor value={slots} onChange={setSlots} labels={{ open: t('rx.onDutyShort'), closed: t('rx.offShort') }} />
      <p className="mt-1 text-xs text-ink-3">{t('rx.nightHint')}</p>
      <Button variant="dark" className="mt-3 min-h-10 text-sm" onClick={() => void save(() => pharmacyApi.shifts(storeId, p.id, toShifts(slots)), t('rx.saved'))}>{t('rx.saveShifts')}</Button>
    </div>
  );
}

function AddPharmacist({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { detail } = useStoreContext();
  const [f, setF] = useState({ name: '', registrationNo: '', stateCouncil: detail.store.city ? `${(detail.store.city as { state?: string }).state ?? ''} State Pharmacy Council`.trim() : '' });
  const [slots, setSlots] = useState(() => toSlots(DAYS.map((_, d) => ({ dayOfWeek: d, startsAt: '09:00', endsAt: '21:00' }))));
  const [consent, setConsent] = useState(false);
  const add = useMutation({
    mutationFn: () => pharmacyApi.add(storeId, { ...f, shifts: toShifts(slots), consent: true }),
    onSuccess: (r) => (qc.setQueryData(['pharmacists', storeId], r), toast.success(t('rx.added')), onDone()),
  });
  return (
    <div className="space-y-3 rounded-2xl border-[1.5px] border-black p-4">
      <p className="font-bold">{t('rx.addPharmacist')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('rx.pName')}><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t('rx.pReg')}><TextInput value={f.registrationNo} onChange={(e) => setF({ ...f, registrationNo: e.target.value })} /></Field>
        <Field label={t('rx.pCouncil')} className="sm:col-span-2"><TextInput value={f.stateCouncil} onChange={(e) => setF({ ...f, stateCouncil: e.target.value })} /></Field>
      </div>
      <TimingsEditor value={slots} onChange={setSlots} labels={{ open: t('rx.onDutyShort'), closed: t('rx.offShort') }} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {t('rx.consent')}
      </label>
      {add.error && <ErrorText>{errorMessageOf(add.error)}</ErrorText>}
      <div className="flex gap-2">
        <Button className="min-h-11" disabled={!consent || f.name.trim().length < 3 || f.registrationNo.trim().length < 3 || f.stateCouncil.trim().length < 3 || add.isPending} onClick={() => add.mutate()}>{t('rx.add')}</Button>
        <Button variant="ghost" className="min-h-11" onClick={onDone}>{t('lb.back')}</Button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const mmss = (s: number) => {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};
