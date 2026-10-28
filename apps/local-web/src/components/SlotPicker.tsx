import { CalendarX } from 'lucide-react';
import { Skeleton } from './ui';
import { useI18n } from '../lib/i18n';
import { nextDays, useLabSlots, type CollectionType } from '../lib/labs';

/** Day chips (next 7 days) + the lab's hourly slots for the chosen day. */
export function SlotPicker({ store, type, date, onDate, value, onChange }: { store: string; type: CollectionType; date: string; onDate: (d: string) => void; value: string | null; onChange: (start: string) => void }) {
  const { t, locale } = useI18n();
  const days = nextDays();
  const slots = useLabSlots(store, date, type);
  const list = slots.data?.slots ?? [];
  const dayLabel = (d: string, i: number) => (i === 0 ? t('lc.today') : i === 1 ? t('lc.tomorrow') : new Date(`${d}T12:00:00+05:30`).toLocaleDateString(locale, { weekday: 'short', timeZone: 'Asia/Kolkata' }));
  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={t('lc.lb.day')}>
        {days.map((d, i) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === date}
            onClick={() => onDate(d)}
            className={`flex w-16 shrink-0 flex-col items-center rounded-xl px-2 py-2 text-xs font-bold ring-1 ${d === date ? 'bg-black text-dz-yellow ring-black' : 'bg-white ring-line hover:ring-black'}`}
          >
            <span className="capitalize">{dayLabel(d, i)}</span>
            <span className="text-lg font-black">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        {slots.isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : !list.some((s) => s.available) ? (
          <p className="flex items-center gap-2 rounded-xl bg-soft px-3 py-3 text-sm text-ink-2">
            <CalendarX className="h-4 w-4 shrink-0" aria-hidden /> {slots.data && !slots.data.offered ? t('lc.lb.notOffered') : t('lc.lb.noSlots')}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t('lc.lb.slot')}>
            {list.map((s) => {
              const on = value === s.start;
              const label = new Date(s.start).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
              return (
                <button
                  key={s.start}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!s.available}
                  onClick={() => onChange(s.start)}
                  data-slot={s.start}
                  className={`min-h-11 rounded-xl px-2 text-sm font-bold ring-1 disabled:cursor-not-allowed disabled:bg-soft disabled:text-ink-3 disabled:line-through disabled:ring-transparent ${on ? 'bg-black text-dz-yellow ring-black' : 'bg-white ring-line hover:ring-black'}`}
                >
                  {label}
                  {s.available && s.left <= 1 && !on && <span className="block text-[10px] font-semibold text-dz-red">{t('lc.lb.lastOne')}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
