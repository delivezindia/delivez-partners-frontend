import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-store';
import { inr } from '../lib/catalog';
import { apiUrl } from '../lib/config';
import { useI18n } from '../lib/i18n';
import { Button } from './ui';
import { Skeleton, toast } from './feedback';
import { MiniBars } from './MiniBars';

interface Summary {
  range: { days: number; from: string; to: string };
  orders: { total: number; sold: number; active: number; rejected: number; missed: number; cancelled: number };
  revenue: number;
  averageOrderValue: number;
  averagePrepMinutes: number | null;
  topItems: { name: string; qty: number; revenue: number }[];
  byDay: { date: string; orders: number; sold: number; revenue: number }[];
}

const istToday = (offsetDays = 0) => new Date(Date.now() + 5.5 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);
const short = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Owner / manager / accountant: today's (or 7 / 30 days') sales, best sellers and an orders CSV. */
export function SalesCard({ storeId }: { storeId: string }) {
  const { t } = useI18n();
  const [days, setDays] = useState<1 | 7 | 30>(1);
  const q = useQuery({ queryKey: ['sales', storeId, days], queryFn: () => api<Summary>(`/partners/stores/${storeId}/reports/summary?days=${days}`), refetchInterval: 60_000 });
  const s = q.data;

  const RANGES: { days: 1 | 7 | 30; label: string }[] = [
    { days: 1, label: t('sales.today') },
    { days: 7, label: t('sales.days7') },
    { days: 30, label: t('sales.days30') },
  ];

  return (
    <section className="dz-card space-y-4 p-5" aria-label={t('sales.title')} data-sales>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-5 w-5" aria-hidden /> {t('sales.title')}
        </h2>
        <div className="flex gap-1" role="radiogroup" aria-label={t('sales.title')}>
          {RANGES.map((r) => (
            <button key={r.days} type="button" role="radio" aria-checked={days === r.days} onClick={() => setDays(r.days)} className={`rounded-full border-[1.5px] px-3 py-1 text-sm font-bold ${days === r.days ? 'border-black bg-black text-white' : 'border-line bg-white'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!s && <Skeleton className="h-24" />}
      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Tile label={t('sales.orders')} value={String(s.orders.total)} note={s.orders.active ? t('sales.inProgress', { n: s.orders.active }) : undefined} />
            <Tile label={t('sales.revenue')} value={inr(s.revenue)} note={t('sales.completed', { n: s.orders.sold })} strong />
            <Tile label={t('sales.avgOrder')} value={s.orders.sold ? inr(s.averageOrderValue) : '—'} />
            <Tile label={t('sales.avgPrep')} value={s.averagePrepMinutes != null ? t('sales.minutes', { n: s.averagePrepMinutes }) : '—'} />
            <Tile
              label={t('sales.missed')}
              value={String(s.orders.missed)}
              note={s.orders.cancelled || s.orders.rejected ? t('sales.cancelledRejected', { c: s.orders.cancelled, r: s.orders.rejected }) : t('sales.missedNote')}
              warn={s.orders.missed > 0}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <div>
              {days > 1 ? (
                <>
                  <p className="mb-2 text-sm font-bold">{t('sales.perDay')}</p>
                  <MiniBars
                    label={t('sales.perDay')}
                    bars={s.byDay.map((d) => ({ label: short(d.date), value: d.revenue, tip: [inr(d.revenue), t('sales.ordersN', { n: d.orders })] }))}
                  />
                </>
              ) : (
                <p className="rounded-xl bg-soft px-4 py-3 text-sm text-ink-2">{s.orders.sold ? t('sales.todayNote', { n: s.orders.sold, amount: inr(s.revenue) }) : t('sales.noSales')}</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{t('sales.topItems')}</p>
              {s.topItems.length === 0 && <p className="text-sm text-ink-3">{t('sales.noSales')}</p>}
              <ol className="space-y-1.5 text-sm">
                {s.topItems.map((it, i) => (
                  <li key={it.name} className="flex justify-between gap-3">
                    <span className="truncate"><b className="mr-1.5 text-ink-3">{i + 1}</b>{it.name}</span>
                    <span className="shrink-0 tabular-nums text-ink-2">{it.qty} × · {inr(it.revenue)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      )}
      <CsvDownload storeId={storeId} />
    </section>
  );
}

function Tile({ label, value, note, strong, warn }: { label: string; value: string; note?: string; strong?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${warn ? 'border-amber-400 bg-amber-50' : 'border-line bg-white'}`}>
      <span className="flex items-center gap-1 text-xs font-semibold text-ink-3">
        {warn && <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-label="Attention" />}
        {label}
      </span>
      <b className={`block tabular-nums ${strong ? 'text-2xl' : 'text-xl'}`}>{value}</b>
      {note && <span className="block text-[11px] text-ink-3">{note}</span>}
    </div>
  );
}

/** Orders for a date range (max 92 days) as a CSV file for Excel / the accountant. */
function CsvDownload({ storeId }: { storeId: string }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(istToday(6));
  const [to, setTo] = useState(istToday());
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/v1/partners/stores/${storeId}/reports/orders.csv?from=${from}&to=${to}`), { headers: { authorization: `Bearer ${useAuth.getState().accessToken ?? ''}` } });
      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(e?.error?.message ?? t('sales.downloadFailed'));
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `delivez-orders-${from}-to-${to}.csv`;
      // The link must be in the page for Firefox (and some Chrome setups) to save the file.
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
      toast.success(t('sales.downloaded', { n: Number(res.headers.get('x-row-count') ?? 0) }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
      <label className="text-xs font-semibold text-ink-3">
        {t('sales.from')}
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-0.5 block h-10 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-ink" />
      </label>
      <label className="text-xs font-semibold text-ink-3">
        {t('sales.to')}
        <input type="date" value={to} min={from} max={istToday()} onChange={(e) => setTo(e.target.value)} className="mt-0.5 block h-10 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-ink" />
      </label>
      <Button variant="ghost" className="min-h-10 text-sm" disabled={busy || !from || !to} onClick={() => void download()}>
        <Download className="h-4 w-4" /> {busy ? '…' : t('sales.download')}
      </Button>
    </div>
  );
}
