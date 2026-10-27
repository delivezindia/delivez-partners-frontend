import { useState } from 'react';

// Mini charts for the SLA screen. Colors are the validated categorical pair (blue / orange) on white;
// identity is never color-only: a legend sits above and tapping a day spells out the values.
const C1 = '#2a78d6';
const C2 = '#eb6834';
const W = 320;
const H = 132;
const PAD = { l: 26, r: 6, t: 8, b: 20 };
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });

/** Bar with 4 px rounding on the data end only, anchored to the baseline. */
function bar(x: number, w: number, base: number, y: number) {
  const r = Math.min(4, w / 2, Math.abs(base - y));
  if (y <= base) return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
  return `M${x},${base}V${y - r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y - r}V${base}Z`;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs font-semibold text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden /> {i.label}
        </span>
      ))}
    </div>
  );
}

/** Promised vs actual prep minutes per day. */
export function PrepChart({ series }: { series: { date: string; promised: number | null; actual: number | null }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(10, ...series.flatMap((s) => [s.promised ?? 0, s.actual ?? 0]));
  const top = Math.ceil(max / 10) * 10;
  const plotW = W - PAD.l - PAD.r;
  const col = plotW / series.length;
  const bw = Math.min(10, (col - 8) / 2);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const base = y(0);
  const s = sel != null ? series[sel] : null;
  return (
    <figure>
      <Legend
        items={[
          { color: C1, label: 'Promised' },
          { color: C2, label: 'Actual' },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Promised and actual prep minutes for the last 7 days" data-chart="prep">
        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#e3e3de" strokeWidth={v ? 1 : 1.5} />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#7c7c77">
              {v}
            </text>
          </g>
        ))}
        {series.map((d, i) => {
          const x0 = PAD.l + i * col + (col - 2 * bw - 2) / 2;
          return (
            <g key={d.date}>
              {d.promised != null && <path d={bar(x0, bw, base, y(d.promised))} fill={C1} opacity={sel == null || sel === i ? 1 : 0.35} />}
              {d.actual != null && <path d={bar(x0 + bw + 2, bw, base, y(d.actual))} fill={C2} opacity={sel == null || sel === i ? 1 : 0.35} />}
              <text x={PAD.l + i * col + col / 2} y={H - 6} textAnchor="middle" fontSize="9" fill={sel === i ? '#000' : '#7c7c77'} fontWeight={sel === i ? 700 : 400}>
                {day(d.date).split(' ')[0]}
              </text>
              <rect x={PAD.l + i * col} y={0} width={col} height={H} fill="transparent" onClick={() => setSel(sel === i ? null : i)} onMouseEnter={() => setSel(i)} style={{ cursor: 'pointer' }} />
            </g>
          );
        })}
      </svg>
      <figcaption className="min-h-5 text-xs text-ink-2">
        {s
          ? s.promised == null
            ? `${day(s.date)}: no timed orders`
            : `${day(s.date)}: promised ${s.promised} min · actual ${s.actual} min`
          : 'Tap a day for the numbers (minutes from accept to ready).'}
      </figcaption>
    </figure>
  );
}

/** Rider arrival minus ready time per day: above the line food waited for the rider, below the rider waited for food. */
export function RiderChart({ series }: { series: { date: string; riderVsReady: number | null }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  if (series.every((s) => s.riderVsReady == null)) return <p className="rounded-xl bg-soft p-4 text-center text-sm text-ink-2">No rider pickups recorded in the last 7 days.</p>;
  const ext = Math.max(5, ...series.map((s) => Math.abs(s.riderVsReady ?? 0)));
  const lim = Math.ceil(ext / 5) * 5;
  const plotW = W - PAD.l - PAD.r;
  const col = plotW / series.length;
  const bw = Math.min(14, col - 10);
  const y = (v: number) => PAD.t + ((lim - v) / (2 * lim)) * (H - PAD.t - PAD.b);
  const base = y(0);
  const s = sel != null ? series[sel] : null;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Minutes between food ready and rider arrival, last 7 days" data-chart="rider">
        {[lim, 0, -lim].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#e3e3de" strokeWidth={v ? 1 : 1.5} />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#7c7c77">
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}
        {series.map((d, i) => (
          <g key={d.date}>
            {d.riderVsReady != null && d.riderVsReady !== 0 && <path d={bar(PAD.l + i * col + (col - bw) / 2, bw, base, y(d.riderVsReady))} fill={C1} opacity={sel == null || sel === i ? 1 : 0.35} />}
            {/* On time to the minute: a dot on the zero line so the day doesn't look empty. */}
            {d.riderVsReady === 0 && <circle cx={PAD.l + i * col + col / 2} cy={base} r={4} fill={C1} stroke="#fff" strokeWidth={2} opacity={sel == null || sel === i ? 1 : 0.35} />}
            <text x={PAD.l + i * col + col / 2} y={H - 6} textAnchor="middle" fontSize="9" fill={sel === i ? '#000' : '#7c7c77'} fontWeight={sel === i ? 700 : 400}>
              {day(d.date).split(' ')[0]}
            </text>
            <rect x={PAD.l + i * col} y={0} width={col} height={H} fill="transparent" onClick={() => setSel(sel === i ? null : i)} onMouseEnter={() => setSel(i)} style={{ cursor: 'pointer' }} />
          </g>
        ))}
      </svg>
      <figcaption className="min-h-5 text-xs text-ink-2">
        {s
          ? s.riderVsReady == null
            ? `${day(s.date)}: no rider pickups`
            : s.riderVsReady > 0
              ? `${day(s.date)}: food waited ${s.riderVsReady} min for the rider`
              : s.riderVsReady === 0
              ? `${day(s.date)}: rider arrived as the food was ready`
              : `${day(s.date)}: rider waited ${-s.riderVsReady} min for food`
          : 'Above the line: food waited for the rider. Below: the rider waited for food.'}
      </figcaption>
    </figure>
  );
}
