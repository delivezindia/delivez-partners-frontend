import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, Check, CircleCheck, Download, FileText, FlaskConical, Home, LifeBuoy, MapPin, Phone, Store as StoreIcon, UserRound, XCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { SlotPicker } from '../components/SlotPicker';
import { Button, ErrorText, Skeleton } from '../components/ui';
import { api, newIdempotencyKey } from '../lib/api';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { LAB_STATUS, LAB_STEPS, nextDays, useLabBooking, type LabBooking } from '../lib/labs';
import { messageOf } from './Login';

// A lab booking: slot, booking code for the collector / desk, progress, report.
export default function Booking() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const q = useLabBooking(id);
  const [modal, setModal] = useState<'cancel' | 'move' | null>(null);
  const [date, setDate] = useState(nextDays()[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const b = q.data;
  if (q.isLoading) return <Skeleton className="m-4 h-48" />;
  if (!b)
    return (
      <div className="p-10 text-center">
        <p className="font-bold">{t('lc.lb.notFound')}</p>
        <Link to="/orders?tab=labs" className="mt-3 inline-block font-bold text-dz-red underline">
          {t('lc.lb.mine')}
        </Link>
      </div>
    );

  const ended = ['CANCELLED', 'REJECTED'].includes(b.status);
  const current = LAB_STEPS.findIndex((s) => s.states.includes(b.status));
  const when = new Date(b.slotStart);
  const whenLabel = `${when.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })} · ${when.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`;

  async function act(path: string, body: unknown) {
    setError('');
    setBusy(true);
    try {
      const updated = await api<LabBooking>(`/local/lab-bookings/${b!.id}/${path}`, { method: 'POST', body, idempotencyKey: newIdempotencyKey() });
      qc.setQueryData(['lab-booking', id], updated);
      qc.invalidateQueries({ queryKey: ['lab-bookings'] });
      setModal(null);
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
    } finally {
      setBusy(false);
    }
  }

  async function openReport(reportId: string) {
    setError('');
    // Open the tab first (pop-up blockers), then point it at the 5-minute link.
    const win = window.open('', '_blank');
    try {
      const r = await api<{ url: string }>(`/local/lab-bookings/${b!.id}/reports/${reportId}`);
      if (win) win.location.href = r.url;
      else window.location.href = r.url;
    } catch (err) {
      win?.close();
      setError(messageOf(err, t('lc.err.network')));
    }
  }

  return (
    <div className="min-h-screen bg-soft pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to="/orders?tab=labs" className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl">{b.lab.name}</h1>
          <p className="text-xs text-ink-3">{b.bookingNumber}</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">
        {params.get('booked') && !ended && (
          <p className="dz-rise flex items-center gap-2 rounded-2xl bg-dz-green px-4 py-3 font-bold text-white" role="status">
            <CircleCheck className="h-5 w-5" aria-hidden /> {t('lc.lb.booked')}
          </p>
        )}

        <section className={`rounded-2xl p-5 ring-1 ${ended ? 'bg-dz-red-soft ring-dz-red/20' : 'bg-white ring-line'}`} aria-live="polite">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">{t('lc.ord.status')}</p>
          <h2 className="mt-1 flex items-center gap-2 text-3xl">
            {ended && <XCircle className="h-7 w-7 text-dz-red" aria-hidden />}
            {t(LAB_STATUS[b.status])}
          </h2>
          {b.status === 'RX_REVIEW' && <p className="mt-1 text-sm text-ink-2">{t('lc.lb.rxReview')}</p>}
          {ended && b.cancelReason && <p className="mt-1 text-sm font-semibold">{b.cancelReason}</p>}
          {!ended && (
            <ol className="mt-5 grid grid-cols-4 gap-1">
              {LAB_STEPS.map((s, i) => {
                const done = i < current || (i === current && b.status === 'REPORT_READY');
                const on = i === current && !done;
                return (
                  <li key={s.key} className="text-center">
                    <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-black ${done ? 'bg-dz-green text-white' : on ? 'bg-black text-dz-yellow' : 'bg-soft text-ink-3'}`}>{done ? <Check className="h-4 w-4" /> : i + 1}</span>
                    <span className={`mt-1 block text-[11px] font-bold leading-tight ${done || on ? 'text-ink' : 'text-ink-3'}`}>{t(s.key)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {b.code && (
          <section className="rounded-2xl bg-dz-yellow p-5 text-center ring-1 ring-black/10">
            <p className="text-sm font-bold">{b.collectionType === 'HOME' ? t('lc.lb.codeHome') : t('lc.lb.codeDesk')}</p>
            <p className="mt-1 font-display text-5xl tracking-[0.3em]" data-booking-code>
              {b.code}
            </p>
          </section>
        )}

        {b.reports.length > 0 && (
          <section className="rounded-2xl bg-white p-4 ring-1 ring-dz-green/40">
            <h2 className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-dz-green" aria-hidden /> {t('lc.lb.report')}
            </h2>
            {b.reports.map((r) => (
              <div key={r.id} className="mt-3">
                {r.summary && <p className="text-sm text-ink-2">{r.summary}</p>}
                <Button variant="dark" className="mt-2 w-full" onClick={() => void openReport(r.id)} data-open-report>
                  <Download className="h-4 w-4" aria-hidden /> {t('lc.lb.viewReport')}
                </Button>
              </div>
            ))}
            <p className="mt-2 text-xs text-ink-3">{t('lc.lb.reportPrivate')}</p>
          </section>
        )}

        <section className="space-y-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-line">
          <p className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <b className="block text-base">{whenLabel}</b>
              <span className="text-ink-2">{b.collectionType === 'HOME' ? t('lc.lb.home') : t('lc.lb.walkIn')}</span>
            </span>
          </p>
          <p className="flex items-start gap-2">
            {b.collectionType === 'HOME' ? <Home className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <StoreIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            <span className="text-ink-2">{b.collectionType === 'HOME' ? b.address : b.lab.address}</span>
          </p>
          <p className="flex items-start gap-2">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="text-ink-2">{[b.patient.name, b.patient.age ? t('lc.lb.years', { n: b.patient.age }) : null].filter(Boolean).join(' · ')}</span>
          </p>
          {b.collector && b.active && (
            <p className="flex items-center gap-2 rounded-xl bg-soft p-3">
              <span className="flex-1 font-semibold">{t('lc.lb.collector', { name: b.collector.name })}</span>
              {b.collector.phone && (
                <a href={`tel:${b.collector.phone}`} className="grid h-9 w-9 place-items-center rounded-full bg-dz-green text-white" aria-label={t('lc.lb.callCollector')}>
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </p>
          )}
          {b.fastingHours > 0 && b.active && b.status !== 'SAMPLE_COLLECTED' && b.status !== 'PROCESSING' && <p className="rounded-xl bg-dz-yellow-soft p-3 font-semibold text-[#92400e]">{t('lc.lb.fasting', { n: b.fastingHours })}</p>}
          {b.rx?.status === 'REJECTED' && b.rx.rejectionReason && <p className="rounded-xl bg-dz-red-soft p-3 text-dz-red">{b.rx.rejectionReason}</p>}
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <h2 className="mb-2 flex items-center gap-2 text-xl">
            <FlaskConical className="h-5 w-5" aria-hidden /> {t('lc.lb.tests', { n: b.tests.length })}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {b.tests.map((x) => (
              <li key={x.id} className="flex justify-between gap-3">
                <span>{x.name}</span>
                <span className="font-semibold">{rupees(x.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            {b.totals.collectionFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-2">{t('lc.lb.collectionFee')}</dt>
                <dd>{rupees(b.totals.collectionFee)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold">
              <dt>{b.payment.status === 'COD_PENDING' ? t('lc.co.toPay') : t('lc.ord.total')}</dt>
              <dd>{rupees(b.totals.grandTotal)}</dd>
            </div>
          </dl>
          {b.payment.status === 'COD_PENDING' && !ended && <p className="mt-2 text-xs text-ink-3">{b.collectionType === 'HOME' ? t('lc.lb.payCollector') : t('lc.lb.payDesk')}</p>}
        </section>

        <ErrorText>{error}</ErrorText>
        {b.canCancel && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setModal('move')}>
              <CalendarClock className="h-4 w-4" aria-hidden /> {t('lc.lb.move')}
            </Button>
            <Button variant="ghost" onClick={() => setModal('cancel')}>
              {t('lc.lb.cancel')}
            </Button>
          </div>
        )}
        <Link to={`/help/new?booking=${b.bookingNumber}`} className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-ink-2 hover:text-ink">
          <LifeBuoy className="h-4 w-4" aria-hidden /> {t('lc.help.get')}
        </Link>
        {b.lab.phone && (
          <a href={`tel:${b.lab.phone}`} className="flex min-h-10 items-center justify-center gap-2 text-sm font-bold text-ink-2">
            <Phone className="h-4 w-4" aria-hidden /> {t('lc.lb.callLab')}
          </a>
        )}
        {b.lab.slug && (
          <Link to={`/s/${b.lab.slug}`} className="flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-3 underline">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {b.lab.name}
          </Link>
        )}
      </main>

      {modal === 'cancel' && (
        <Modal title={t('lc.lb.cancelTitle')} onClose={() => setModal(null)}>
          <p className="text-ink-2">{t('lc.lb.cancelBody')}</p>
          <ErrorText>{error}</ErrorText>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t('lc.ord.keep')}
            </Button>
            <Button disabled={busy} onClick={() => void act('cancel', { reason: 'Cancelled by customer' })}>
              {t('lc.ord.cancelYes')}
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'move' && (
        <Modal title={t('lc.lb.move')} onClose={() => setModal(null)} wide>
          <SlotPicker
            store={b.lab.id}
            type={b.collectionType}
            date={date}
            onDate={(d) => {
              setDate(d);
              setSlot(null);
            }}
            value={slot}
            onChange={setSlot}
          />
          <ErrorText>{error}</ErrorText>
          <Button className="mt-4 w-full" disabled={!slot || busy} onClick={() => void act('reschedule', { slotStart: slot })}>
            {t('lc.lb.moveHere')}
          </Button>
        </Modal>
      )}
    </div>
  );
}
