export interface DaySlot {
  dayOfWeek: number;
  open: boolean;
  opensAt: string;
  closesAt: string;
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function slotsFrom(timings: { dayOfWeek: number; opensAt: string; closesAt: string }[], fallback = { opensAt: '09:00', closesAt: '22:00' }): DaySlot[] {
  return DAYS.map((_, d) => {
    const t = timings.find((x) => x.dayOfWeek === d);
    return { dayOfWeek: d, open: timings.length === 0 || !!t, opensAt: t?.opensAt ?? fallback.opensAt, closesAt: t?.closesAt ?? fallback.closesAt };
  });
}

export const slotsToTimings = (slots: DaySlot[]) =>
  slots.filter((s) => s.open).map(({ dayOfWeek, opensAt, closesAt }) => ({ dayOfWeek, opensAt, closesAt }));

// Weekly hours, one slot per day (split shifts come with the full Settings screen).
export function TimingsEditor({ value, onChange, labels = { open: 'Open', closed: 'Closed' } }: { value: DaySlot[]; onChange: (v: DaySlot[]) => void; labels?: { open: string; closed: string } }) {
  const set = (d: number, patch: Partial<DaySlot>) => onChange(value.map((s) => (s.dayOfWeek === d ? { ...s, ...patch } : s)));
  const first = value.find((s) => s.open);
  return (
    <div className="space-y-2">
      {value.map((s) => (
        <div key={s.dayOfWeek} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => set(s.dayOfWeek, { open: !s.open })}
            className={`h-11 w-24 shrink-0 rounded-xl text-sm font-semibold transition ${s.open ? 'bg-dz-black text-dz-yellow' : 'bg-neutral-100 text-neutral-500'}`}
          >
            {DAYS[s.dayOfWeek]} · {s.open ? labels.open : labels.closed}
          </button>
          {s.open && (
            <>
              <input
                type="time"
                value={s.opensAt}
                onChange={(e) => set(s.dayOfWeek, { opensAt: e.target.value })}
                className="h-11 rounded-xl border border-neutral-300 px-2"
                aria-label={`${DAYS[s.dayOfWeek]} opens`}
              />
              <span className="text-neutral-400">to</span>
              <input
                type="time"
                value={s.closesAt}
                onChange={(e) => set(s.dayOfWeek, { closesAt: e.target.value })}
                className="h-11 rounded-xl border border-neutral-300 px-2"
                aria-label={`${DAYS[s.dayOfWeek]} closes`}
              />
              {s.closesAt <= s.opensAt && <span className="text-xs text-state-delayed">Closing must be after opening</span>}
            </>
          )}
        </div>
      ))}
      {first && (
        <button
          type="button"
          className="text-sm font-semibold underline underline-offset-2"
          onClick={() => onChange(value.map((s) => (s.open ? { ...s, opensAt: first.opensAt, closesAt: first.closesAt } : s)))}
        >
          Use {DAYS[first.dayOfWeek]}'s hours for all open days
        </button>
      )}
    </div>
  );
}
