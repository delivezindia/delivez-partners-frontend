import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, FlaskConical, Phone } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { BADGE, logActivity, type Badge, type StoreCard } from '../../lib/am';

export function BadgeChip({ badge, risk }: { badge: Badge; risk?: number | null }) {
  const b = BADGE[badge];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold ${b.chip}`} data-badge={badge}>
      <span className={`h-2 w-2 rounded-full ${b.dot}`} aria-hidden />
      {b.label}
      {risk != null && badge !== 'NO_DATA' && <span className="font-bold opacity-80">· {risk}</span>}
    </span>
  );
}

export function Trend({ t }: { t: 'UP' | 'DOWN' | 'FLAT' }) {
  if (t === 'UP') return <ArrowUpRight className="inline h-4 w-4 text-dz-green" aria-label="improving" />;
  if (t === 'DOWN') return <ArrowDownRight className="inline h-4 w-4 text-dz-red" aria-label="getting worse" />;
  return <ArrowRight className="inline h-4 w-4 text-ink-3" aria-label="steady" />;
}

export const pct = (x: number | null | undefined) => (x == null ? '—' : `${x}%`);
export const mins = (x: number | null | undefined, signed = false) => (x == null ? '—' : `${signed && x > 0 ? '+' : ''}${x} min`);

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-4 ring-1 ring-line ${className}`}>{children}</section>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink-2 ring-1 ring-line">{children}</p>;
}

/** Big round action button (≥ 48 px) for one-tap actions. */
export function Action({
  icon: Icon,
  label,
  onClick,
  href,
  tone = 'plain',
  busy,
  ...rest
}: { icon: typeof Phone; label: string; onClick?: () => void; href?: string; tone?: 'plain' | 'red' | 'green'; busy?: boolean } & Record<`data-${string}`, string>) {
  const cls = `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-extrabold ${tone === 'red' ? 'bg-dz-red text-white' : tone === 'green' ? 'bg-dz-green text-white' : 'bg-soft text-ink'} ${busy ? 'opacity-50' : ''}`;
  const inner = (
    <>
      <Icon className="h-5 w-5" aria-hidden /> {label}
    </>
  );
  return href ? (
    <a href={href} onClick={onClick} className={cls} {...rest}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={busy} className={cls} {...rest}>
      {inner}
    </button>
  );
}

/** Phone link that also writes the call into the communication log. */
export function callHref(phone: string | null) {
  return phone ? `tel:${phone}` : undefined;
}

export function useTestOrder(storeId: string) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const m = useMutation({
    mutationFn: () => api<{ orderNumber: string | null }>(`/admin/am/stores/${storeId}/test-order`, { method: 'POST' }),
    onSuccess: (r) => {
      setMsg(r.orderNumber ? `Test order ${r.orderNumber} placed` : 'Test order placed');
      void qc.invalidateQueries({ queryKey: ['am'] });
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'No network — try again when online'),
  });
  return { run: () => m.mutate(), busy: m.isPending, msg };
}

export function StoreRow({ s }: { s: StoreCard }) {
  const t = useTestOrder(s.id);
  return (
    <li className="rounded-2xl bg-white ring-1 ring-line" data-store-card={s.id}>
      <Link to={`/am/stores/${s.id}`} className="block p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold">{s.name}</p>
            <p className="truncate text-xs capitalize text-ink-3">{s.category}</p>
          </div>
          <BadgeChip badge={s.badge} risk={s.risk} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-soft py-1.5">
            <dt className="text-[10px] font-bold uppercase text-ink-3">SLA 7D</dt>
            <dd className="text-base font-extrabold">
              {pct(s.slaPct)} <Trend t={s.slaTrend} />
            </dd>
          </div>
          <div className="rounded-lg bg-soft py-1.5">
            <dt className="text-[10px] font-bold uppercase text-ink-3">Orders 7D</dt>
            <dd className="text-base font-extrabold">{s.orders7d}</dd>
          </div>
          <div className="rounded-lg bg-soft py-1.5">
            <dt className="text-[10px] font-bold uppercase text-ink-3">Churn risk</dt>
            <dd className="text-base font-extrabold">{s.risk ?? '—'}</dd>
          </div>
        </dl>
      </Link>
      <div className="flex gap-2 border-t border-line p-2">
        <Action icon={Phone} label="Call" href={callHref(s.phone)} onClick={() => void logActivity({ storeId: s.id, kind: 'CALL' })} data-call={s.id} />
        <Action icon={FlaskConical} label="Test order" onClick={t.run} busy={t.busy} />
        <Link to={`/am/stores/${s.id}?tab=issues`} className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-soft px-2 text-[11px] font-extrabold">
          <AlertTriangle className="h-5 w-5" aria-hidden /> Issues
          {s.openIssues > 0 && <span className="absolute right-3 top-1 rounded-full bg-dz-red px-1.5 text-[10px] text-white">{s.openIssues}</span>}
        </Link>
      </div>
      {t.msg && <p className="px-4 pb-3 text-xs font-semibold text-ink-2">{t.msg}</p>}
    </li>
  );
}
