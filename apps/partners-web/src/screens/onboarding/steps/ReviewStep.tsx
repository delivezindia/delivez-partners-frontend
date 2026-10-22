import { ReadinessMeter } from '../../../components/ReadinessMeter';
import { Card } from '../../../components/form';
import type { OnboardingView, StepKey } from '../../../lib/onboarding';

const GATE_COPY = {
  LIVE: 'You meet everything needed to go live. After our team verifies your documents you can start taking orders.',
  LIMITED: 'You can soft-launch: you will appear as "New on Delivez" with a 2 km delivery radius until the remaining items are done.',
  BLOCKED: 'A few more details are needed before you can submit. Use the links below to finish them.',
};

// REVIEW / GO_LIVE — checklist + submit (plan §5.1.1)
export function ReviewStep({
  view,
  onGoto,
  onSubmit,
  submitting,
  error,
}: {
  view: OnboardingView;
  onGoto: (step: StepKey) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const steps = view.session.steps.filter((s) => s.key !== 'REVIEW');
  const missingRequired = steps.filter((s) => !s.optional && s.status !== 'DONE');
  const canSubmit = missingRequired.length === 0 && view.readiness.gate !== 'BLOCKED' && !submitting;

  return (
    <div className="space-y-6">
      <Card>
        <ReadinessMeter readiness={view.readiness} onFix={onGoto} />
        <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">{GATE_COPY[view.readiness.gate]}</p>
      </Card>

      <Card title="Checklist">
        <ul className="divide-y divide-neutral-100">
          {steps.map((s) => (
            <li key={s.key} className="flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    s.status === 'DONE' ? 'bg-state-ready text-white' : s.status === 'SKIPPED' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {s.status === 'DONE' ? '✓' : s.status === 'SKIPPED' ? '–' : '!'}
                </span>
                {s.title}
                {s.optional && <span className="text-xs text-neutral-400">optional</span>}
              </span>
              {s.status !== 'DONE' && (
                <button type="button" className="font-semibold underline underline-offset-2" onClick={() => onGoto(s.key)}>
                  {s.status === 'SKIPPED' ? 'Finish' : 'Complete'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {error && <p className="whitespace-pre-line rounded-xl bg-red-50 p-4 text-sm text-state-delayed">{error}</p>}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="h-14 w-full rounded-xl bg-state-ready text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {submitting ? 'Submitting…' : 'Submit for approval'}
      </button>
      {missingRequired.length > 0 && <p className="text-center text-sm text-neutral-500">Complete: {missingRequired.map((s) => s.title).join(', ')}</p>}
    </div>
  );
}
