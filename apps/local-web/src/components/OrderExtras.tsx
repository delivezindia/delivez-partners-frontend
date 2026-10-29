import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileCheck2, FileText, FileX2, LifeBuoy, PackageCheck, Repeat2, Star, Undo2 } from 'lucide-react';
import { Modal } from './Modal';
import { TextArea } from './form';
import { Button, ErrorText, QtyStepper } from './ui';
import { api, newIdempotencyKey } from '../lib/api';
import { rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import { RETURN_REASONS, REVIEW_TAGS, type CustomerOrder, type ReturnReason, type Substitution } from '../lib/orders';
import { messageOf } from '../screens/Login';

/** Ticks every second while mounted — for countdowns. */
function useNow(on: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** POST to an order action and put the fresh order in the cache. */
function useOrderAction(o: CustomerOrder) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(path: string, body?: unknown) {
    setError('');
    setBusy(true);
    try {
      const updated = await api<CustomerOrder>(`/local/orders/${o.id}/${path}`, { method: 'POST', body, idempotencyKey: newIdempotencyKey() });
      qc.setQueryData(['order', o.id], updated);
      qc.invalidateQueries({ queryKey: ['orders'] });
      return true;
    } catch (err) {
      setError(messageOf(err, t('lc.err.network')));
      void qc.invalidateQueries({ queryKey: ['order', o.id] });
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error };
}

/** Where the prescription is: being checked, approved, or not accepted (with the pharmacist's reason). */
export function RxStatus({ o }: { o: CustomerOrder }) {
  const { t } = useI18n();
  if (!o.rx || o.status === 'DRAFT') return null;
  if (o.rx.status === 'APPROVED')
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-dz-green-soft px-4 py-3 text-sm font-bold text-dz-green" data-rx-status="APPROVED">
        <FileCheck2 className="h-5 w-5 shrink-0" aria-hidden /> {t('lc.rxs.ok')}
      </p>
    );
  if (o.rx.status === 'REJECTED')
    return (
      <section className="rounded-2xl bg-dz-red-soft p-4 text-sm ring-1 ring-dz-red/20" data-rx-status="REJECTED">
        <p className="flex items-center gap-2 font-bold text-dz-red">
          <FileX2 className="h-5 w-5 shrink-0" aria-hidden /> {t('lc.rxs.no')}
        </p>
        {o.rx.rejectionReason && <p className="mt-1 text-ink-2">{o.rx.rejectionReason}</p>}
      </section>
    );
  return (
    <section className="rounded-2xl bg-dz-blue-soft p-4 text-sm ring-1 ring-dz-blue/20" data-rx-status="UNDER_REVIEW">
      <p className="flex items-center gap-2 font-bold text-dz-blue">
        <FileText className="h-5 w-5 shrink-0" aria-hidden /> {t('lc.rxs.review')}
      </p>
      <p className="mt-1 text-ink-2">{t('lc.rxs.reviewBody')}</p>
    </section>
  );
}

/** The shop ran out of something and suggests a replacement — accept or decline before the timer ends. */
export function Substitutions({ o }: { o: CustomerOrder }) {
  const { t } = useI18n();
  const open = o.substitutions.filter((s) => s.status === 'PROPOSED');
  const done = o.substitutions.filter((s) => s.status !== 'PROPOSED');
  if (!o.substitutions.length) return null;
  return (
    <>
      {open.map((s) => (
        <SubOffer key={s.id} o={o} s={s} />
      ))}
      {done.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-white p-4 text-sm ring-1 ring-line">
          {done.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <Repeat2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
              <span>{t(s.status === 'ACCEPTED' ? 'lc.sub.doneYes' : s.status === 'DECLINED' ? 'lc.sub.doneNo' : 'lc.sub.doneExpired', { from: s.forItem, to: s.name })}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SubOffer({ o, s }: { o: CustomerOrder; s: Substitution }) {
  const { t } = useI18n();
  const now = useNow(true);
  const left = new Date(s.respondBy).getTime() - now;
  const { run, busy, error } = useOrderAction(o);
  const diff = s.forTotal - s.lineTotal;
  return (
    <section className="dz-rise rounded-2xl bg-white p-4 ring-2 ring-dz-yellow" data-sub-offer={s.id}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl">
          <Repeat2 className="h-5 w-5 text-dz-red" aria-hidden /> {t('lc.sub.title')}
        </h2>
        <span className="shrink-0 rounded-full bg-black px-2.5 py-1 font-mono text-xs font-bold text-dz-yellow" aria-label={t('lc.sub.timeLeft')}>
          {mmss(left)}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{t('lc.sub.body', { item: s.forItem })}</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-soft p-3 text-sm">
        <span className="min-w-0 flex-1 truncate text-ink-3 line-through">
          {s.forQty} × {s.forItem}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        <b className="min-w-0 flex-1 truncate">
          {s.qty} × {s.name}
          {s.variant ? ` (${s.variant})` : ''}
        </b>
        <b className="shrink-0">{rupees(s.lineTotal)}</b>
      </div>
      {s.note && <p className="mt-2 text-sm italic text-ink-2">“{s.note}”</p>}
      {diff > 0 && <p className="mt-2 text-xs font-semibold text-dz-green">{t('lc.sub.refund', { amount: rupees(diff) })}</p>}
      <ErrorText>{error}</ErrorText>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" disabled={busy || left <= 0} onClick={() => void run(`substitutions/${s.id}`, { accept: false })} data-sub-no>
          {t('lc.sub.no')}
        </Button>
        <Button disabled={busy || left <= 0} onClick={() => void run(`substitutions/${s.id}`, { accept: true })} data-sub-yes>
          {t('lc.sub.yes')}
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">{t('lc.sub.auto')}</p>
    </section>
  );
}

const REASON_LABEL: Record<ReturnReason, MsgKey> = { DAMAGED: 'lc.ret.r.DAMAGED', WRONG_ITEM: 'lc.ret.r.WRONG_ITEM', EXPIRED: 'lc.ret.r.EXPIRED', POOR_QUALITY: 'lc.ret.r.POOR_QUALITY', MISSING: 'lc.ret.r.MISSING' };

/** Doorstep check (grocery / local shops): a few minutes after delivery to hand anything wrong back to the rider. */
export function DoorCheck({ o }: { o: CustomerOrder }) {
  const { t } = useI18n();
  const w = o.returnWindow;
  const now = useNow(w?.state === 'OPEN');
  const { run, busy, error } = useOrderAction(o);
  const [picking, setPicking] = useState(false);
  const [sel, setSel] = useState<Record<string, { qty: number; reason: ReturnReason }>>({});
  const left = w ? new Date(w.endsAt).getTime() - now : 0;
  const returnable = o.items.filter((i) => !i.unavailable && i.qty - i.returnedQty > 0);

  return (
    <>
      {w?.state === 'OPEN' && left > 0 && (
        <section className="dz-rise rounded-2xl bg-white p-4 ring-2 ring-dz-green" data-door-check>
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl">
              <PackageCheck className="h-5 w-5 text-dz-green" aria-hidden /> {t('lc.ret.title')}
            </h2>
            <span className="shrink-0 rounded-full bg-dz-green px-2.5 py-1 font-mono text-xs font-bold text-white">{mmss(left)}</span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{t('lc.ret.body')}</p>
          <ErrorText>{error}</ErrorText>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setPicking(true)} data-return-open>
              <Undo2 className="h-4 w-4" aria-hidden /> {t('lc.ret.handBack')}
            </Button>
            <Button className="bg-dz-green hover:bg-dz-green" disabled={busy} onClick={() => void run('returns/keep')} data-return-keep>
              {t('lc.ret.allGood')}
            </Button>
          </div>
        </section>
      )}
      {o.returns.length > 0 && (
        <section className="rounded-2xl bg-white p-4 text-sm ring-1 ring-line" data-returns>
          <h2 className="mb-2 flex items-center gap-2 text-lg">
            <Undo2 className="h-4 w-4" aria-hidden /> {t('lc.ret.done')}
          </h2>
          <ul className="space-y-1">
            {o.returns.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span>
                  {r.qty} × {r.name} <span className="text-ink-3">· {t(REASON_LABEL[r.reason])}</span>
                </span>
                <b className="text-dz-green">−{rupees(r.amount)}</b>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">{t('lc.ret.refundNote')}</p>
        </section>
      )}
      {picking && (
        <Modal title={t('lc.ret.pickTitle')} onClose={() => setPicking(false)} wide>
          <p className="text-sm text-ink-2">{t('lc.ret.pickBody')}</p>
          <ul className="mt-3 divide-y divide-line">
            {returnable.map((i) => {
              const max = i.qty - i.returnedQty;
              const cur = sel[i.id];
              return (
                <li key={i.id} className="py-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-dz-red"
                      checked={!!cur}
                      onChange={(e) => setSel((s) => {
                        const n = { ...s };
                        if (e.target.checked) n[i.id] = { qty: 1, reason: 'DAMAGED' };
                        else delete n[i.id];
                        return n;
                      })}
                      data-return-item={i.name}
                    />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{i.name}</b>
                      <span className="text-xs text-ink-3">{t('lc.ret.got', { n: max, price: rupees(i.unitPrice) })}</span>
                    </span>
                    {cur && max > 1 && <QtyStepper size="sm" qty={cur.qty} max={max} label={i.name} onChange={(q) => setSel((s) => ({ ...s, [i.id]: { ...cur, qty: Math.max(1, q) } }))} />}
                  </label>
                  {cur && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                      {RETURN_REASONS.map((r) => (
                        <button key={r} type="button" aria-pressed={cur.reason === r} onClick={() => setSel((s) => ({ ...s, [i.id]: { ...cur, reason: r } }))} className={`min-h-8 rounded-full px-3 text-xs font-bold ring-1 ${cur.reason === r ? 'bg-black text-dz-yellow ring-black' : 'bg-white ring-line'}`}>
                          {t(REASON_LABEL[r])}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ErrorText>{error}</ErrorText>
          <Button
            className="mt-3 w-full"
            disabled={busy || !Object.keys(sel).length}
            onClick={async () => {
              const items = Object.entries(sel).map(([itemId, v]) => ({ itemId, qty: v.qty, reason: v.reason }));
              if (await run('returns', { items })) setPicking(false);
            }}
            data-return-submit
          >
            {t('lc.ret.submit', { amount: rupees(Object.entries(sel).reduce((n, [id, v]) => n + (o.items.find((x) => x.id === id)?.unitPrice ?? 0) * v.qty, 0)) })}
          </Button>
        </Modal>
      )}
    </>
  );
}

const TAG_LABEL: Record<(typeof REVIEW_TAGS)[number], MsgKey> = {
  ON_TIME: 'lc.rate.t.ON_TIME',
  LATE: 'lc.rate.t.LATE',
  GOOD_PACKING: 'lc.rate.t.GOOD_PACKING',
  POOR_PACKING: 'lc.rate.t.POOR_PACKING',
  FRESH: 'lc.rate.t.FRESH',
  WRONG_ITEM: 'lc.rate.t.WRONG_ITEM',
  FRIENDLY: 'lc.rate.t.FRIENDLY',
  COLD_FOOD: 'lc.rate.t.COLD_FOOD',
};

/** Rate a delivered order (1–5 stars, quick tags, a line of text). */
export function RateOrder({ o }: { o: CustomerOrder }) {
  const { t } = useI18n();
  const { run, busy, error } = useOrderAction(o);
  const tapped = (useLocation().state as { rate?: number } | null)?.rate;
  const [stars, setStars] = useState(tapped && tapped >= 1 && tapped <= 5 ? tapped : 0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    if (tapped) box.current?.scrollIntoView({ block: 'center' });
  }, [tapped]);
  if (o.review)
    return (
      <section className="rounded-2xl bg-white p-4 text-sm ring-1 ring-line" data-rated>
        <p className="flex items-center gap-2 font-bold">
          {t('lc.rate.thanks')}
          <span className="inline-flex items-center gap-0.5 rounded-md bg-dz-green px-1.5 py-0.5 text-xs text-white">
            {o.review.rating} <Star className="h-3 w-3 fill-current" aria-hidden />
          </span>
        </p>
        {o.review.comment && <p className="mt-1 italic text-ink-2">“{o.review.comment}”</p>}
        {o.review.reply && (
          <p className="mt-2 rounded-xl bg-soft p-3">
            <b className="block text-xs">{t('lc.rate.reply', { store: o.store.name })}</b>
            {o.review.reply}
          </p>
        )}
      </section>
    );
  if (!o.canRate) return null;
  const tagList = REVIEW_TAGS.filter((x) => (o.store.vertical === 'EAT' ? x !== 'FRESH' : x !== 'COLD_FOOD'));
  return (
    <section ref={box} className="rounded-2xl bg-white p-4 ring-1 ring-line" data-rate>
      <h2 className="text-xl">{t('lc.rate.title', { store: o.store.name })}</h2>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t('lc.rate.stars')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={t('lc.rate.nStars', { n })} onClick={() => setStars(n)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-dz-yellow-soft" data-star={n}>
            <Star className={`h-8 w-8 ${n <= stars ? 'fill-dz-yellow text-[#d4a106]' : 'text-ink-3'}`} aria-hidden />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tagList.map((x) => (
              <button key={x} type="button" aria-pressed={tags.includes(x)} onClick={() => setTags((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]))} className={`min-h-9 rounded-full px-3 text-xs font-bold ring-1 ${tags.includes(x) ? 'bg-black text-dz-yellow ring-black' : 'bg-white ring-line'}`}>
                {t(TAG_LABEL[x])}
              </button>
            ))}
          </div>
          <TextArea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t('lc.rate.commentPh')} className="mt-3 min-h-16" />
          <ErrorText>{error}</ErrorText>
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void run('review', { rating: stars, tags, comment: comment.trim() || undefined })} data-rate-submit>
            {t('lc.rate.submit')}
          </Button>
        </>
      )}
    </section>
  );
}

export function HelpLink({ o }: { o: CustomerOrder }) {
  const { t } = useI18n();
  return (
    <Link to={`/help/new?order=${o.id}`} className="flex min-h-12 items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-ink-2 hover:text-ink" data-order-help>
      <LifeBuoy className="h-4 w-4" aria-hidden /> {t('lc.help.order')}
    </Link>
  );
}
