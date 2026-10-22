import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Brand, Button } from '../../components/ui';
import { Card } from '../../components/form';
import { ReadinessMeter } from '../../components/ReadinessMeter';
import { errorMessageOf, fieldErrorsOf, useOnboarding, useOnboardingActions, type OnboardingView, type StepKey } from '../../lib/onboarding';
import { BasicDetailsStep, EligibilityStep, OutletStep } from './steps/BasicSteps';
import { BankStep, CommercialsStep, DocumentsStep, LegalStep, PharmacistStep } from './steps/ComplianceSteps';
import { CatalogStep, OperationsStep, TrainingStep } from './steps/CatalogOpsSteps';
import { ReviewStep } from './steps/ReviewStep';
import { LabCatalogStep, LabEligibilityStep, LabOperationsStep, PathologistStep } from './steps/LabSteps';
import { STEP_FORM_ID, type StepProps } from './steps/types';
import { useStoreSocket } from '../../lib/socket';

const STEP_COMPONENTS: Record<Exclude<StepKey, 'REVIEW'>, ComponentType<StepProps>> = {
  ELIGIBILITY: EligibilityStep,
  BASIC_DETAILS: BasicDetailsStep,
  OUTLET: OutletStep,
  DOCUMENTS: DocumentsStep,
  PHARMACIST: PharmacistStep,
  PATHOLOGIST: PathologistStep,
  CATALOG: CatalogStep,
  OPERATIONS: OperationsStep,
  BANK: BankStep,
  COMMERCIALS: CommercialsStep,
  LEGAL: LegalStep,
  TRAINING: TrainingStep,
};

/** Labs (LAB_V1) use their own versions of these steps. */
const LAB_STEPS: Partial<Record<StepKey, ComponentType<StepProps>>> = {
  ELIGIBILITY: LabEligibilityStep,
  CATALOG: LabCatalogStep,
  OPERATIONS: LabOperationsStep,
};

// P04–P13 Onboarding wizard. Steps come from the server flow (RESTAURANT_V1, STORE_V1, PHARMACY_V1, VENDOR_V1).
export default function OnboardingWizard() {
  const { storeId = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: view, isLoading, error: loadError } = useOnboarding(storeId);
  const { save, skip, submit, refresh } = useOnboardingActions(storeId);
  const [warnings, setWarnings] = useState<OnboardingView['warnings']>([]);

  const active = (params.get('step') as StepKey | null) ?? view?.session.currentStep;
  const goto = (step: StepKey) => {
    save.reset();
    skip.reset();
    setParams({ step }, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (view && active && !view.session.steps.some((s) => s.key === active)) setParams({}, { replace: true });
  }, [view, active, setParams]);

  // Admin decisions (document verified/rejected, approval, changes requested) arrive live.
  useStoreSocket(storeId, (e) => {
    if (e.type.startsWith('document.') || e.type === 'store.status_changed' || e.type === 'onboarding.approved') void refresh();
  });

  if (isLoading) return <p className="p-8 text-neutral-500">Loading…</p>;
  if (loadError || !view) {
    return (
      <div className="p-8">
        <p className="text-state-delayed">{errorMessageOf(loadError) ?? 'Could not load onboarding'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/accounts')}>
          Back
        </Button>
      </div>
    );
  }

  const locked = !['DRAFT', 'NEEDS_CHANGES'].includes(view.session.status);
  if (locked) return <Submitted view={view} storeId={storeId} refresh={refresh} />;

  const steps = view.session.steps;
  const index = Math.max(0, steps.findIndex((s) => s.key === active));
  const step = steps[index];
  const StepComponent = step.key === 'REVIEW' ? null : ((view.session.flowVersion === 'LAB_V1' && LAB_STEPS[step.key]) || STEP_COMPONENTS[step.key]);
  const errors = fieldErrorsOf(save.error);
  const mutationError = save.error ?? skip.error;

  function onSave(payload: unknown) {
    setWarnings([]);
    save.mutate(
      { step: step.key, payload },
      {
        onSuccess: (next) => {
          setWarnings(next.warnings ?? []);
          goto(next.session.currentStep);
        },
      },
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 flex items-center gap-4 dz-header px-4 py-2.5 sm:px-8">
        <Brand size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{view.store.name}</p>
          <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/80">
            <div className="h-full bg-dz-red transition-all" style={{ width: `${view.session.progressPct}%` }} />
          </div>
        </div>
        <button className="text-sm font-semibold" onClick={() => navigate('/accounts')}>
          Save & exit
        </button>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr] xl:grid-cols-[230px_1fr_300px] sm:px-8">
        {/* Step list */}
        <nav className="hidden lg:block">
          <ol className="sticky top-24 space-y-1">
            {steps.map((s, i) => (
              <li key={s.key}>
                <button
                  onClick={() => goto(s.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${s.key === step.key ? 'bg-white font-semibold shadow-sm ring-1 ring-neutral-200' : 'hover:bg-white'}`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      s.key === step.key ? 'bg-dz-red text-white ring-4 ring-dz-red-soft' : s.status === 'DONE' ? 'bg-dz-yellow text-black' : s.status === 'SKIPPED' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {s.status === 'DONE' && s.key !== step.key ? '✓' : i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Current step */}
        <section className="min-w-0 pb-28">
          <p className="text-sm text-neutral-500">
            Step {index + 1} of {steps.length}
            {step.optional && ' · optional'}
          </p>
          <h1 className="mb-5 text-2xl font-bold">{step.title}</h1>

          {view.session.status === 'NEEDS_CHANGES' && (
            <div className="mb-5 rounded-[12px] border-[1.5px] border-dz-red bg-dz-red-soft p-4 text-sm">
              <p className="font-extrabold text-dz-red">Our team asked for a few changes</p>
              {view.reviewNotes[0]?.reason && <p className="mt-1 text-ink">“{view.reviewNotes[0].reason}”</p>}
              <p className="mt-2 text-ink-2">
                Fix the items above, then{' '}
                <button type="button" className="font-bold underline" onClick={() => goto('REVIEW')}>
                  resubmit from Review &amp; submit
                </button>
                .
              </p>
            </div>
          )}

          {warnings && warnings.length > 0 && (
            <div className="mb-5 space-y-1 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {warnings.map((w) => (
                <p key={w.code}>⚠ {w.message}</p>
              ))}
            </div>
          )}

          {StepComponent ? (
            <StepComponent key={step.key} view={view} storeId={storeId} submit={onSave} errors={errors} refresh={() => void refresh()} />
          ) : (
            <ReviewStep
              view={view}
              onGoto={goto}
              onSubmit={() => submit.mutate(undefined, { onSuccess: () => window.scrollTo({ top: 0 }) })}
              submitting={submit.isPending}
              error={errorMessageOf(submit.error)}
            />
          )}

          {mutationError && Object.keys(errors).length === 0 && (
            <p className="mt-5 whitespace-pre-line rounded-xl bg-red-50 p-4 text-sm text-state-delayed">{errorMessageOf(mutationError)}</p>
          )}
          {Object.keys(errors).length > 0 && <p className="mt-5 text-sm text-state-delayed">Please fix the highlighted fields.</p>}

          {/* Mobile readiness */}
          {step.key !== 'REVIEW' && (
            <details className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-neutral-200 xl:hidden">
              <summary className="cursor-pointer text-sm font-semibold">Readiness {view.readiness.score}/100</summary>
              <div className="mt-3">
                <ReadinessMeter readiness={view.readiness} onFix={goto} />
              </div>
            </details>
          )}
        </section>

        {/* Readiness panel */}
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <Card>
              <ReadinessMeter readiness={view.readiness} onFix={goto} />
            </Card>
          </div>
        </aside>
      </div>

      {step.key !== 'REVIEW' && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Button variant="ghost" disabled={index === 0} onClick={() => goto(steps[index - 1].key)}>
              Back
            </Button>
            <div className="flex-1" />
            {step.optional && (
              <button type="button" className="px-3 text-sm font-semibold text-neutral-600" disabled={skip.isPending} onClick={() => skip.mutate(step.key, { onSuccess: (next) => goto(next.session.currentStep) })}>
                Skip for now
              </button>
            )}
            <Button type="submit" form={STEP_FORM_ID} disabled={save.isPending} className="min-w-44">
              {save.isPending ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </footer>
      )}
    </main>
  );
}

// After submit: status + documents still uploadable.
function Submitted({ view, storeId, refresh }: { view: OnboardingView; storeId: string; refresh: () => void }) {
  const navigate = useNavigate();
  const stages = [
    { label: 'Submitted', done: true, at: view.session.submittedAt },
    { label: 'Documents verified', done: view.documents.uploaded.length > 0 && view.documents.uploaded.every((d) => d.status === 'VERIFIED') },
    { label: 'Live on Delivez', done: ['LIVE', 'LIMITED'].includes(view.store.status) },
  ];
  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between dz-header px-4 py-2.5 sm:px-8">
        <Brand size="sm" />
        <Button variant="ghost" className="min-h-10 text-sm" onClick={() => navigate(`/stores/${storeId}`)}>
          Go to dashboard
        </Button>
      </header>
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-neutral-200">
          {(() => {
            const status = view.store.status;
            const note = view.reviewNotes[0]?.reason;
            if (status === 'LIVE' || status === 'LIMITED')
              return (
                <>
                  <p className="text-4xl">🎉</p>
                  <h1 className="mt-2 text-3xl">{view.store.name} is live!</h1>
                  <p className="mt-1 text-sm text-ink-2">
                    {status === 'LIMITED' ? 'Soft launch: you appear as “New on Delivez” within 2 km while the remaining items are completed.' : 'Customers near you can now find and order from you.'} Open your store from the dashboard to start taking orders.
                  </p>
                  <Button className="mt-4" onClick={() => navigate(`/stores/${storeId}`)}>
                    Open dashboard
                  </Button>
                </>
              );
            if (status === 'REJECTED')
              return (
                <>
                  <h1 className="mt-2 text-3xl text-dz-red">Application not approved</h1>
                  {note && <p className="mt-2 text-ink">“{note}”</p>}
                  <p className="mt-2 text-sm text-ink-2">If you think this is a mistake, contact partner support.</p>
                </>
              );
            return (
              <>
                <p className="text-4xl">📋</p>
                <h1 className="mt-2 text-3xl">{status === 'UNDER_REVIEW' ? 'Our team is reviewing your application' : `${view.store.name} is with our team`}</h1>
                <p className="mt-1 text-sm text-ink-2">We usually review within 24 hours. This page updates by itself when anything changes.</p>
              </>
            );
          })()}
          <ol className="mx-auto mt-6 flex max-w-md justify-between">
            {stages.map((s) => (
              <li key={s.label} className="flex flex-1 flex-col items-center text-xs">
                <span className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full font-bold ${s.done ? 'bg-state-ready text-white' : 'bg-neutral-200 text-neutral-500'}`}>{s.done ? '✓' : '…'}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
        <Card>
          <ReadinessMeter readiness={view.readiness} />
        </Card>
        <div>
          <h2 className="mb-3 font-semibold">Documents</h2>
          <DocumentsStep view={view} storeId={storeId} submit={() => undefined} errors={{}} refresh={refresh} />
        </div>
      </section>
    </main>
  );
}
