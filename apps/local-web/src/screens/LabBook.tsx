import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FlaskConical, Home, MapPin, Store as StoreIcon, Trash2, Wallet } from 'lucide-react';
import { Field, TextInput } from '../components/form';
import { LocationSheet } from '../components/LocationSheet';
import { RxUpload, type RxFile } from '../components/RxUpload';
import { SlotPicker } from '../components/SlotPicker';
import { Button, ErrorText, Skeleton } from '../components/ui';
import { api, newIdempotencyKey } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { useCart } from '../lib/cart';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { nextDays, type CollectionType, type LabBooking } from '../lib/labs';
import { useDeliverTo } from '../lib/location';
import { useMe, useMenu } from '../lib/queries';
import { messageOf } from './Login';

const GENDER = { F: 'lc.lb.gF', M: 'lc.lb.gM', O: 'lc.lb.gO' } as const;

/** Lab tests from the basket → home collection or walk-in → a slot → patient → book (pay at collection). */
export default function LabBook() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = useAuth((s) => s.accessToken);
  const cart = useCart();
  const at = useDeliverTo((s) => s.at);
  const menu = useMenu(cart.storeId ?? '', at);
  const me = useMe();
  const [type, setType] = useState<CollectionType | null>(null);
  const [date, setDate] = useState(nextDays()[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'F' | 'M' | 'O' | ''>('');
  const [rxFiles, setRxFiles] = useState<RxFile[]>([]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const attempt = useRef(newIdempotencyKey());
  // Set once booked, so emptying the basket doesn't bounce to the cart on the way to the booking.
  const booked = useRef(false);

  useEffect(() => {
    if (me.data?.fullName && !name) setName(me.data.fullName);
  }, [me.data, name]);

  const data = menu.data;
  const tests = (data?.products ?? []).filter((p) => cart.lines.some((l) => l.productId === p.id));
  const homeOk = !!data?.store.supportsDelivery && tests.every((p) => p.lab?.homeCollection !== false);
  const walkInOk = !!data?.store.supportsPickup && tests.every((p) => p.lab?.walkIn !== false);
  // Default to home collection when the lab and every test allow it.
  useEffect(() => {
    if (!data || type) return;
    setType(homeOk ? 'HOME' : walkInOk ? 'WALK_IN' : null);
  }, [data, type, homeOk, walkInOk]);

  if (!token) return <Navigate to="/login?next=/book-lab" replace />;
  if (!booked.current && (!cart.lines.length || cart.storeVertical !== 'DIAGNOSTICS')) return <Navigate to="/cart" replace />;

  const rxTests = tests.filter((p) => p.prescriptionRequired).map((p) => p.name);
  const testsTotal = tests.reduce((n, p) => n + p.price, 0);
  const fee = type === 'HOME' ? (data?.store.collectionFee ?? 0) : 0;
  const fasting = Math.max(0, ...tests.map((p) => p.lab?.fastingHours ?? 0));
  const needAddress = type === 'HOME' && !at?.addressId;
  const ready = !!type && !!slot && name.trim().length >= 2 && !needAddress && (!rxTests.length || rxFiles.length > 0) && tests.length > 0;

  async function book() {
    setError('');
    setBusy(true);
    try {
      const b = await api<LabBooking>('/local/lab-bookings', {
        method: 'POST',
        body: {
          storeId: cart.storeId,
          collectionType: type,
          slotStart: slot,
          testIds: tests.map((p) => p.id),
          patient: { name: name.trim(), age: age ? Number(age) : undefined, gender: gender || undefined },
          addressId: type === 'HOME' ? at?.addressId : undefined,
          prescriptionFileKeys: rxTests.length ? rxFiles.map((f) => f.key) : undefined,
        },
        idempotencyKey: attempt.current,
      });
      booked.current = true;
      qc.setQueryData(['lab-booking', b.id], b);
      qc.invalidateQueries({ queryKey: ['lab-bookings'] });
      navigate(`/bookings/${b.id}?booked=1`, { replace: true });
      cart.clear();
    } catch (err) {
      attempt.current = newIdempotencyKey();
      setError(messageOf(err, t('lc.err.network')));
      void qc.invalidateQueries({ queryKey: ['lab-slots'] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-soft pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link to={cart.storeSlug ? `/s/${cart.storeSlug}` : '/'} className="grid h-10 w-10 place-items-center rounded-full hover:bg-soft" aria-label={t('lc.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl">{t('lc.lb.title')}</h1>
          <p className="truncate text-xs text-ink-3">{cart.storeName}</p>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-3 px-4 pt-4">
        {menu.isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <section className="rounded-2xl bg-white ring-1 ring-line">
              <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-lg">
                <FlaskConical className="h-5 w-5 text-[#0E7490]" aria-hidden /> {t('lc.lb.tests', { n: tests.length })}
              </h2>
              <ul className="divide-y divide-line">
                {cart.lines.map((l) => {
                  const p = tests.find((x) => x.id === l.productId);
                  return (
                    <li key={l.key} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <b className="block leading-snug">{l.name}</b>
                        {p?.lab && <span className="block text-xs text-ink-3">{[p.lab.sampleType, p.lab.reportHours ? t('lc.lab.report', { n: p.lab.reportHours }) : null].filter(Boolean).join(' · ')}</span>}
                        {p?.prescriptionRequired && <span className="mt-0.5 inline-block rounded bg-dz-blue-soft px-1.5 text-[11px] font-bold text-dz-blue">{t('lc.rx')}</span>}
                      </div>
                      <span className="text-sm font-semibold">{rupees(l.unitPrice)}</span>
                      <button type="button" onClick={() => cart.setQty(l.key, 0)} className="grid h-8 w-8 place-items-center rounded-full text-dz-red hover:bg-dz-red-soft" aria-label={t('lc.delete')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {fasting > 0 && <p className="border-t border-line px-4 py-2.5 text-sm font-semibold text-[#b45309]">{t('lc.lb.fasting', { n: fasting })}</p>}
            </section>

            <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <h2 className="mb-3 text-lg">{t('lc.lb.how')}</h2>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('lc.lb.how')}>
                {(
                  [
                    ['HOME', Home, homeOk, t('lc.lb.home'), fee || data.store.collectionFee ? t('lc.lb.homeFee', { fee: rupees(data.store.collectionFee) }) : t('lc.lb.free')],
                    ['WALK_IN', StoreIcon, walkInOk, t('lc.lb.walkIn'), t('lc.lb.walkInSub')],
                  ] as const
                ).map(([v, Icon, ok, label, sub]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={type === v}
                    disabled={!ok}
                    onClick={() => {
                      setType(v);
                      setSlot(null);
                    }}
                    data-collection={v}
                    className={`flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-xl p-3 text-left ring-1 disabled:opacity-40 ${type === v ? 'bg-black text-white ring-black' : 'bg-white ring-line hover:ring-black'}`}
                  >
                    <Icon className={`h-5 w-5 ${type === v ? 'text-dz-yellow' : ''}`} aria-hidden />
                    <b className="text-sm">{label}</b>
                    <span className={`text-xs ${type === v ? 'text-white/70' : 'text-ink-3'}`}>{ok ? sub : t('lc.lb.notForThese')}</span>
                  </button>
                ))}
              </div>
              {type === 'HOME' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-soft p-3 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-dz-red" aria-hidden />
                  <div className="min-w-0 flex-1">
                    {at?.addressId ? (
                      <>
                        <b className="block">{at.title}</b>
                        <span className="block text-ink-2">{at.line}</span>
                      </>
                    ) : (
                      <b className="block">{t('lc.lb.needAddress')}</b>
                    )}
                  </div>
                  {at?.addressId ? (
                    <button type="button" onClick={() => setPicking(true)} className="shrink-0 font-bold text-dz-red">
                      {t('lc.change')}
                    </button>
                  ) : (
                    <Link to="/addresses/new?next=/book-lab" className="shrink-0 font-bold text-dz-red">
                      {t('lc.co.addAddress')}
                    </Link>
                  )}
                </div>
              )}
              {type === 'WALK_IN' && <p className="mt-3 rounded-xl bg-soft p-3 text-sm text-ink-2">{data.store.address}</p>}
            </section>

            {type && (
              <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <h2 className="mb-3 text-lg">{type === 'HOME' ? t('lc.lb.whenHome') : t('lc.lb.whenWalkIn')}</h2>
                <SlotPicker
                  store={data.store.id}
                  type={type}
                  date={date}
                  onDate={(d) => {
                    setDate(d);
                    setSlot(null);
                  }}
                  value={slot}
                  onChange={setSlot}
                />
              </section>
            )}

            <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
              <h2 className="text-lg">{t('lc.lb.patient')}</h2>
              <Field label={t('lc.lb.pName')}>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" data-patient-name />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('lc.lb.pAge')}>
                  <TextInput inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                </Field>
                <Field label={t('lc.lb.pGender')}>
                  <div className="flex gap-1.5">
                    {(['F', 'M', 'O'] as const).map((g) => (
                      <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(gender === g ? '' : g)} className={`h-12 flex-1 rounded-[10px] text-sm font-bold ring-1 ${gender === g ? 'bg-black text-white ring-black' : 'bg-white ring-line'}`}>
                        {t(GENDER[g])}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </section>

            {rxTests.length > 0 && <RxUpload presignPath={`/local/labs/${data.store.id}/rx-upload`} files={rxFiles} onChange={setRxFiles} items={rxTests} />}

            <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-2">{t('lc.lb.testsTotal')}</dt>
                  <dd className="font-semibold">{rupees(testsTotal)}</dd>
                </div>
                {type === 'HOME' && (
                  <div className="flex justify-between">
                    <dt className="text-ink-2">{t('lc.lb.collectionFee')}</dt>
                    <dd className="font-semibold">{fee ? rupees(fee) : t('lc.lb.free')}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
                  <dt>{t('lc.co.toPay')}</dt>
                  <dd>{rupees(testsTotal + fee)}</dd>
                </div>
              </dl>
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-dz-green-soft px-3 py-2 text-sm font-semibold text-dz-green">
                <Wallet className="h-4 w-4 shrink-0" aria-hidden /> {type === 'WALK_IN' ? t('lc.lb.payDesk') : t('lc.lb.payCollector')}
              </p>
            </section>

            <ErrorText>{error}</ErrorText>
            <Button className="min-h-14 w-full text-base" disabled={!ready || busy} onClick={() => void book()} data-book-lab>
              {busy ? t('lc.lb.booking') : slot ? t('lc.lb.book') : t('lc.lb.pickSlot')}
            </Button>
          </>
        )}
      </main>
      {picking && <LocationSheet onClose={() => setPicking(false)} />}
    </div>
  );
}
