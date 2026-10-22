import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

export type StepKey =
  | 'ELIGIBILITY'
  | 'BASIC_DETAILS'
  | 'OUTLET'
  | 'DOCUMENTS'
  | 'PHARMACIST'
  | 'PATHOLOGIST'
  | 'CATALOG'
  | 'OPERATIONS'
  | 'BANK'
  | 'COMMERCIALS'
  | 'LEGAL'
  | 'TRAINING'
  | 'REVIEW';

export interface Timing {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface ReadinessFactor {
  factor: string;
  label: string;
  weight: number;
  completion: 0 | 0.5 | 1;
  points: number;
  hint: string | null;
  step: StepKey;
}

export interface Readiness {
  score: number;
  gate: 'LIVE' | 'LIMITED' | 'BLOCKED';
  factors: ReadinessFactor[];
}

export interface UploadedDocument {
  id: string;
  type: string;
  label: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  documentNumber: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  viewUrl: string;
}

export interface OnboardingView {
  session: {
    id: string;
    storeId: string;
    flowVersion: 'RESTAURANT_V1' | 'STORE_V1' | 'PHARMACY_V1' | 'LAB_V1' | 'VENDOR_V1';
    status: 'DRAFT' | 'SUBMITTED' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED';
    currentStep: StepKey;
    completedSteps: StepKey[];
    steps: { key: StepKey; title: string; optional?: boolean; status: 'DONE' | 'SKIPPED' | 'TODO' }[];
    progressPct: number;
    stepData: Partial<Record<StepKey, Record<string, unknown>>>;
    trainingDone: boolean;
    quizScore: number | null;
    submittedAt: string | null;
  };
  store: {
    id: string;
    name: string;
    vertical: 'EAT' | 'GROCERY' | 'PHARMACY' | 'LOCAL_STORES' | 'RUSH' | 'FETCH';
    storeType: string;
    status: string;
    description: string | null;
    cuisines: string[];
    phone: string | null;
    whatsappPhone: string | null;
    email: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    landmark: string | null;
    pincode: string | null;
    lat: number | null;
    lng: number | null;
    addressConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    city: { id: string; name: string; state: string } | null;
    zone: { id: string; name: string } | null;
    timings: Timing[];
    defaultPrepMinutes: number;
    peakPrepMinutes: number;
    aiPrepEnabled: boolean;
    supportsDelivery: boolean;
    supportsPickup: boolean;
    deliveryRadiusKm: number;
    acceptMultipleOrders: boolean;
    allowSubstitutions: boolean;
    maxOrdersPerHour: number | null;
    autoPauseOverloaded: boolean;
    packagingFee: number;
    collectionFee?: number;
    allowGenericSubstitution: boolean;
    contactIfRxUnclear: boolean;
    selfPackagingConfirmed: boolean;
    commissionPct: number;
    settlementCycle: string;
    deliveryFeeBearer: string;
    readinessScore: number;
  };
  partnerAccount: { id: string; legalName: string; partnerType: string; gstin: string | null };
  documents: {
    required: { type: string; label: string }[];
    optional: { type: string; label: string }[];
    uploaded: UploadedDocument[];
  };
  bank: {
    id: string;
    accountHolderName: string;
    accountNumberLast4: string | null;
    ifsc: string | null;
    bankName: string | null;
    upiId: string | null;
    verificationStatus: 'UNVERIFIED' | 'PENNY_DROP_PENDING' | 'VERIFIED' | 'FAILED';
    nameMatchScore: number | null;
  } | null;
  pharmacist: {
    id: string;
    name: string;
    registrationNo: string;
    stateCouncil: string;
    shifts: { dayOfWeek: number; startsAt: string; endsAt: string }[];
  } | null;
  pathologist: { id: string; name: string; qualification: string; registrationNo: string; stateCouncil: string } | null;
  catalog: {
    count: number;
    products: {
      id: string;
      name: string;
      price: number;
      mrp: number | null;
      isVeg: boolean | null;
      unit: string;
      prescriptionRequired: boolean;
      drugSchedule: string;
      category: { name: string } | null;
      inventory: { stockQty: number; trackStock: boolean } | null;
      lab?: { sampleType: string | null; fastingHours: number | null; reportHours: number | null; homeCollection: boolean | null; walkIn: boolean | null } | null;
    }[];
  };
  legal: {
    required: { id: string; type: string; title: string; version: string; state: string | null; contentUrl: string; accepted: boolean }[];
    stateKnown: boolean;
    complete: boolean;
  };
  quiz: { question: string; options: string[] }[] | null;
  readiness: Readiness;
  /** Decisions by the Delivez team, newest first. */
  reviewNotes: { action: string; reason: string | null; to: string | null; at: string }[];
  warnings?: { code: string; message: string }[];
}

const key = (storeId: string) => ['onboarding', storeId];

export const useOnboarding = (storeId: string | undefined) =>
  useQuery({
    queryKey: key(storeId ?? ''),
    queryFn: () => api<OnboardingView>(`/partners/stores/${storeId}/onboarding`),
    enabled: !!storeId,
  });

export function useOnboardingActions(storeId: string) {
  const qc = useQueryClient();
  const put = (view: OnboardingView) => qc.setQueryData(key(storeId), view);

  const save = useMutation({
    mutationFn: ({ step, payload }: { step: StepKey; payload: unknown }) =>
      api<OnboardingView>(`/partners/stores/${storeId}/onboarding/steps/${step}`, { method: 'PATCH', body: payload }),
    onSuccess: put,
  });
  const skip = useMutation({
    mutationFn: (step: StepKey) => api<OnboardingView>(`/partners/stores/${storeId}/onboarding/steps/${step}/skip`, { method: 'POST' }),
    onSuccess: put,
  });
  const submit = useMutation({
    mutationFn: () => api<OnboardingView>(`/partners/stores/${storeId}/onboarding/submit`, { method: 'POST' }),
    onSuccess: (view) => {
      put(view);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key(storeId) });
  return { save, skip, submit, refresh, put };
}

/** presign → PUT the file → register the document (plan §5.2). */
export async function uploadDocument(
  storeId: string,
  file: File,
  meta: { type: string; documentNumber?: string; expiresAt?: string },
): Promise<UploadedDocument> {
  const presigned = await api<{ uploadUrl: string; fileKey: string }>(`/partners/stores/${storeId}/uploads`, {
    method: 'POST',
    body: { contentType: file.type, size: file.size },
  });
  const res = await fetch(presigned.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!res.ok) {
    const err = (await res.json().catch(() => null))?.error;
    throw new ApiError(res.status, err?.code ?? 'UPLOAD_FAILED', err?.message ?? 'Upload failed. Try again.');
  }
  return api<UploadedDocument>(`/partners/stores/${storeId}/documents`, {
    method: 'POST',
    body: { type: meta.type, fileKey: presigned.fileKey, documentNumber: meta.documentNumber || undefined, expiresAt: meta.expiresAt || undefined },
  });
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Field errors from a zod-flattened 400 response. */
export function fieldErrorsOf(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const fe = (err.details as { fieldErrors?: Record<string, string[]> })?.fieldErrors ?? {};
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]]));
}

export function errorMessageOf(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof ApiError) {
    const problems = (err.details as { problems?: string[] })?.problems;
    if (problems?.length) return `${err.message}:\n• ${problems.join('\n• ')}`;
    const formErrors = (err.details as { formErrors?: string[] })?.formErrors;
    return formErrors?.[0] ?? err.message;
  }
  return 'Network error. Check your connection and try again.';
}
