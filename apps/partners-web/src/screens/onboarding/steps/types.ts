import type { OnboardingView } from '../../../lib/onboarding';

export interface StepProps {
  view: OnboardingView;
  storeId: string;
  /** Saves the step via PATCH; the wizard handles errors and navigation. */
  submit: (payload: unknown) => void;
  errors: Record<string, string>;
  /** Re-fetch the onboarding view (after uploads / bank saves that bypass the step endpoint). */
  refresh: () => void;
}

export const STEP_FORM_ID = 'onboarding-step-form';

export const toPaise = (rupees: string | number) => Math.round(Number(rupees) * 100);
