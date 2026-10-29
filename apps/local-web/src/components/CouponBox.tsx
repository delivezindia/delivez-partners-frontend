import { useState } from 'react';
import { BadgePercent, Check, Tag, X } from 'lucide-react';
import { rupees } from '../lib/format';
import { useI18n, type MsgKey } from '../lib/i18n';
import type { CouponProblem, Offer, Quote } from '../lib/orders';

const SHOWN = 3;

/** "₹50 off", "20% off up to ₹100", "Free delivery" — in the customer's language. */
export function offerTitle(t: ReturnType<typeof useI18n>['t'], o: Pick<Offer, 'kind' | 'value' | 'maxDiscount'>) {
  if (o.kind === 'FREE_DELIVERY') return t('lc.cp.h.free');
  if (o.kind === 'PERCENT') return o.maxDiscount != null ? t('lc.cp.h.pctCap', { n: o.value, amount: rupees(o.maxDiscount) }) : t('lc.cp.h.pct', { n: o.value });
  return t('lc.cp.h.flat', { amount: rupees(o.value) });
}

export const problemText = (t: ReturnType<typeof useI18n>['t'], p: CouponProblem, short?: number) => t(`lc.cp.e.${p}` as MsgKey, { amount: rupees(short ?? 0) });

/**
 * Cart: type a code or pick one of the listed offers (admin panel → Coupons). The server decides what applies;
 * a code that doesn't fit stays in the box with the reason, and the bill is shown without it.
 */
export function CouponBox({ q, code, onApply, onRemove, busy }: { q: Quote | undefined; code: string | undefined; onApply: (code: string) => void; onRemove: () => void; busy: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState(code ?? '');
  const [all, setAll] = useState(false);
  const applied = q?.coupon;
  const error = code && q?.couponError && !busy ? problemText(t, q.couponError.problem, q.couponError.short) : '';
  const offers = (q?.offers ?? []).filter((o) => o.code !== applied?.code);
  const shown = all ? offers : offers.slice(0, SHOWN);
  const apply = (c: string) => {
    const v = c.trim().toUpperCase();
    if (!v) return;
    setText(v);
    onApply(v);
  };

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-line" data-coupons>
      <h2 className="mb-3 flex items-center gap-2 text-xl">
        <BadgePercent className="h-5 w-5 text-dz-red" aria-hidden /> {t('lc.cp.title')}
      </h2>

      {applied ? (
        <div className="flex items-start gap-3 rounded-xl bg-dz-green-soft px-3 py-2.5" data-coupon-applied={applied.code}>
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-dz-green" aria-hidden />
          <div className="min-w-0 flex-1">
            <b className="block text-dz-green">{t('lc.cp.applied', { code: applied.code })}</b>
            <span className="block text-sm font-semibold">{t('lc.cp.youSave', { amount: rupees(applied.saved) })}</span>
            {applied.description && <span className="block text-xs text-ink-2">{applied.description}</span>}
          </div>
          <button type="button" onClick={() => (setText(''), onRemove())} className="shrink-0 text-sm font-bold text-dz-red" data-coupon-remove>
            {t('lc.cp.remove')}
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply(text);
          }}
        >
          <label className="sr-only" htmlFor="coupon">
            {t('lc.cp.ph')}
          </label>
          <span className="relative flex-1">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              id="coupon"
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
              maxLength={20}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder={t('lc.cp.ph')}
              aria-invalid={!!error}
              aria-describedby={error ? 'coupon-error' : undefined}
              className="h-12 w-full rounded-xl border-[1.5px] border-line bg-white pl-9 pr-9 font-bold uppercase tracking-wider outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal focus:border-black"
              data-coupon-input
            />
            {text && (
              <button type="button" aria-label={t('lc.cp.clear')} onClick={() => (setText(''), code && onRemove())} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-soft">
                <X className="h-4 w-4" />
              </button>
            )}
          </span>
          <button type="submit" disabled={!text.trim() || busy} className="h-12 shrink-0 rounded-xl bg-black px-5 font-extrabold text-dz-yellow disabled:opacity-40" data-coupon-apply>
            {t('lc.cp.apply')}
          </button>
        </form>
      )}
      {error && (
        <p id="coupon-error" className="mt-2 text-sm font-semibold text-dz-red" role="alert" data-coupon-error>
          {error}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label={t('lc.cp.available')}>
          {shown.map((o) => (
            <li key={o.code} className={`flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 ${o.ok ? 'border-dz-red/50' : 'border-line'}`} data-offer={o.code}>
              <div className="min-w-0 flex-1">
                <b className="block leading-snug">{offerTitle(t, o)}</b>
                <span className="block text-xs text-ink-2">
                  <span className="font-bold tracking-wider text-ink">{o.code}</span>
                  {o.description && <> · {o.description}</>}
                </span>
                <span className="block text-xs text-ink-3">
                  {[o.minOrder > 0 && t('lc.cp.min', { amount: rupees(o.minOrder) }), o.firstOrderOnly && t('lc.cp.first')].filter(Boolean).join(' · ')}
                </span>
                {!o.ok && !!o.short && <span className="mt-0.5 block text-xs font-bold text-[#b45309]">{t('lc.cp.e.BELOW_MINIMUM', { amount: rupees(o.short) })}</span>}
              </div>
              {o.ok ? (
                <button type="button" disabled={busy} onClick={() => apply(o.code)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-extrabold text-dz-red ring-1 ring-dz-red disabled:opacity-40" data-offer-use>
                  {applied ? t('lc.cp.switch') : t('lc.cp.use')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {offers.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-sm font-bold text-dz-red">
          {all ? t('lc.cp.fewer') : t('lc.cp.more', { n: offers.length - SHOWN })}
        </button>
      )}
    </section>
  );
}
