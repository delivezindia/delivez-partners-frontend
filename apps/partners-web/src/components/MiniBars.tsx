import { useState } from 'react';

export interface Bar {
  /** Short x-axis label, e.g. "23 Oct". */
  label: string;
  value: number;
  /** Tooltip lines shown on hover / focus. */
  tip: string[];
}

/**
 * One-series bar chart (values per day). Single neutral hue, 4px rounded tops on a shared baseline,
 * 2px gaps, recessive axis, tooltip per bar on hover or keyboard focus. The card title names the series.
 */
export function MiniBars({ bars, height = 120, label }: { bars: Bar[]; height?: number; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const every = Math.max(1, Math.ceil(bars.length / 6));
  return (
    <figure className="m-0" aria-label={label}>
      <div className="relative flex items-end gap-[2px] border-b border-line" style={{ height }} onMouseLeave={() => setActive(null)}>
        {bars.map((b, i) => (
          <div
            key={i}
            tabIndex={0}
            role="img"
            aria-label={`${b.label}: ${b.tip.join(', ')}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
          >
            <span
              className={`block w-full max-w-7 rounded-t-[4px] transition-colors ${active === i ? 'bg-ink' : 'bg-ink-3/60'} ${b.value === 0 ? 'opacity-0' : ''}`}
              style={{ height: `${Math.max(b.value ? 3 : 0, (b.value / max) * 100)}%` }}
            />
            {active === i && (
              <span className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-black px-2.5 py-1.5 text-xs text-white shadow-lg ${i > bars.length * 0.66 ? 'right-0' : i < bars.length * 0.33 ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}>
                <b className="block">{b.label}</b>
                {b.tip.map((t) => (
                  <span key={t} className="block">{t}</span>
                ))}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-ink-3" aria-hidden>
        {bars.map((b, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {i % every === 0 || i === bars.length - 1 ? b.label : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}
