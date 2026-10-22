import type { Readiness, StepKey } from '../lib/onboarding';

const GATE_TEXT = {
  LIVE: { label: 'Ready to go live', cls: 'text-state-ready' },
  LIMITED: { label: 'Soft launch (LIMITED)', cls: 'text-amber-600' },
  BLOCKED: { label: 'Needs more details', cls: 'text-state-delayed' },
};

// Ring + factor list with "fix" links (plan §16.4).
export function ReadinessMeter({ readiness, onFix }: { readiness: Readiness; onFix?: (step: StepKey) => void }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = readiness.gate === 'LIVE' ? '#16a34a' : readiness.gate === 'LIMITED' ? '#f59e0b' : '#dc2626';
  return (
    <div>
      <div className="flex items-center gap-4">
        <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0" aria-hidden>
          <circle cx="42" cy="42" r={r} fill="none" stroke="#e5e5e5" strokeWidth="8" />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - readiness.score / 100)}
            transform="rotate(-90 42 42)"
            style={{ transition: 'stroke-dashoffset 400ms ease' }}
          />
          <text x="42" y="48" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1a1a1a">
            {readiness.score}
          </text>
        </svg>
        <div>
          <p className="text-sm text-neutral-500">Readiness score</p>
          <p className={`font-semibold ${GATE_TEXT[readiness.gate].cls}`}>{GATE_TEXT[readiness.gate].label}</p>
          <p className="text-xs text-neutral-500">80+ live · 60–79 soft launch</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {readiness.factors.map((f) => (
          <li key={f.factor} className="text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${f.completion === 1 ? 'bg-state-ready' : f.completion > 0 ? 'bg-amber-500' : 'bg-neutral-300'}`} />
                {f.label}
              </span>
              <span className="tabular-nums text-neutral-500">
                {f.points}/{f.weight}
              </span>
            </div>
            {f.hint && (
              <button type="button" className="ml-4 text-left text-xs text-neutral-500 underline-offset-2 hover:underline" onClick={() => onFix?.(f.step)}>
                {f.hint} →
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
