export type AdminRole = 'FOUNDER' | 'HEAD_OF_OPS' | 'REGIONAL_HEAD' | 'CITY_OPS' | 'COMPLIANCE' | 'FINANCE' | 'LEGAL' | 'SUPPORT' | 'SALES_AGENT' | 'AUDITOR';
export type StoreStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'LIVE' | 'LIMITED' | 'PAUSED' | 'SUSPENDED' | 'REJECTED' | 'CLOSED';
export type DocStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

// Mirrors core-api ROLES (modules/admin/admin.guard.ts) to show only allowed actions.
export const CAN = {
  verify: ['FOUNDER', 'HEAD_OF_OPS', 'COMPLIANCE'] as AdminRole[],
  approve: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'COMPLIANCE'] as AdminRole[],
  suspend: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'COMPLIANCE'] as AdminRole[],
  reinstate: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD'] as AdminRole[],
  operate: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS'] as AdminRole[],
  partnerUsers: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'SUPPORT'] as AdminRole[],
  team: ['FOUNDER', 'HEAD_OF_OPS'] as AdminRole[],
  geo: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD'] as AdminRole[],
  legal: ['FOUNDER', 'LEGAL'] as AdminRole[],
  audit: ['FOUNDER', 'HEAD_OF_OPS', 'COMPLIANCE', 'LEGAL', 'AUDITOR'] as AdminRole[],
};
export const can = (role: AdminRole | undefined, list: AdminRole[]) => !!role && list.includes(role);
export const ALL_ROLES: AdminRole[] = ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'COMPLIANCE', 'FINANCE', 'LEGAL', 'SUPPORT', 'SALES_AGENT', 'AUDITOR'];

export interface AdminMe {
  user: { id: string; phone: string; fullName: string | null };
  role: AdminRole;
  cities: { id: string; name: string }[];
  allCities: boolean;
}

export interface PipelineStore {
  id: string;
  name: string;
  vertical: string;
  storeType: string;
  status: StoreStatus;
  readinessScore: number;
  pincode: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  city: { name: string } | null;
  zone: { name: string } | null;
  onboarding: { status: string; channel: string; currentStep: string; completedSteps: string[]; flowVersion: string; submittedAt: string | null } | null;
  docs: { required: number; verified: number; pending: number; rejected: number };
}

export interface QueueDoc {
  id: string;
  type: string;
  label: string;
  status: DocStatus;
  required: boolean;
  superseded: boolean;
  documentNumber: string | null;
  expiresAt: string | null;
  createdAt: string;
  viewUrl: string;
  contentType: string;
  store: { id: string; name: string; status: StoreStatus; city: string | null; legalName: string } | null;
}

export interface ReadinessFactor {
  factor: string;
  label: string;
  weight: number;
  completion: number;
  points: number;
  hint: string | null;
}

export interface StoreReview {
  store: { id: string; name: string; status: StoreStatus; vertical: string; storeType: string; rejectedReason: string | null; liveAt: string | null; createdAt: string };
  onboarding: {
    session: { flowVersion: string; status: string; channel: string; steps: { key: string; title: string; optional?: boolean; status: string }[]; progressPct: number; submittedAt: string | null; quizScore: number | null; trainingDone: boolean; stepData: Record<string, Record<string, unknown>> };
    store: Record<string, unknown> & {
      phone: string | null;
      whatsappPhone: string | null;
      email: string | null;
      description: string | null;
      cuisines: string[];
      addressLine1: string | null;
      addressLine2: string | null;
      landmark: string | null;
      pincode: string | null;
      lat: number | null;
      lng: number | null;
      addressConfidence: string | null;
      city: { name: string; state: string } | null;
      zone: { name: string } | null;
      timings: { dayOfWeek: number; opensAt: string; closesAt: string }[];
      defaultPrepMinutes: number;
      peakPrepMinutes: number;
      supportsDelivery: boolean;
      supportsPickup: boolean;
      deliveryRadiusKm: number;
      packagingFee: number;
      readinessScore: number;
    };
    partnerAccount: { legalName: string; partnerType: string; gstin: string | null };
    bank: { accountHolderName: string; accountNumberLast4: string | null; ifsc: string | null; bankName: string | null; upiId: string | null; verificationStatus: string; nameMatchScore: number | null } | null;
    pharmacist: { name: string; registrationNo: string; stateCouncil: string; shifts: { dayOfWeek: number; startsAt: string; endsAt: string }[] } | null;
    pathologist?: { name: string; qualification: string; registrationNo: string; stateCouncil: string } | null;
    catalog: { count: number; products: { id: string; name: string; price: number; isVeg: boolean | null; prescriptionRequired: boolean; drugSchedule: string; category: { name: string } | null; inventory: { stockQty: number } | null }[] };
    readiness: { score: number; gate: string; factors: ReadinessFactor[] };
  } | null;
  members: { memberId: string; role: string; isActive: boolean; invited: boolean; phone: string; fullName: string | null; lastLoginAt: string | null }[];
  documents: (QueueDoc & { issuedAt: string | null; fileHash: string | null; rejectionReason: string | null; reviewedBy: string | null; reviewedAt: string | null })[];
  consents: { type: string; version: string; state: string | null; by: string; ip: string | null; channel: string; acceptedAt: string }[];
  timeline: { step: string; action: string; actorType: string; meta: Record<string, unknown> | null; at: string }[];
  adminActions: { type: string; reason: string | null; by: string | null; at: string }[];
  openState: 'OPEN' | 'BUSY' | 'CLOSED';
  closedReason: string | null;
  approval: { live: string[]; limited: string[] };
}

export interface Dashboard {
  statusCounts: Record<StoreStatus, number>;
  liveByVertical: Record<string, number>;
  openNow: number;
  newThisWeek: number;
  liveThisWeek: number;
  docsPending: number;
  docsExpiring: number;
  waitingReview: { id: string; name: string; status: StoreStatus; vertical: string; readinessScore: number; city: string | null; submittedAt: string | null }[];
  oldestDocuments: { id: string; label: string; createdAt: string; store: { id: string; name: string } | null }[];
  expiringDocuments: { id: string; label: string; expiresAt: string; store: { id: string; name: string; status: StoreStatus } | null }[];
  recentActions: { id: string; type: string; reason: string | null; at: string; store: { id: string; name: string } | null; by: string }[];
}

export interface TeamMember {
  id: string;
  phone: string;
  fullName: string | null;
  role: AdminRole;
  cityIds: string[];
  cities: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  centerLat: number;
  centerLng: number;
  stores: number;
  pincodes: number;
  serviceablePincodes: number;
  zones: { id: string; name: string; isActive: boolean; stores: number; pincodes: number }[];
}

export interface LegalDoc {
  id: string;
  type: string;
  version: string;
  state: string | null;
  contentUrl: string;
  effectiveFrom: string;
  isActive: boolean;
  inForce: boolean;
  acceptances: number;
}

export interface AuditRow {
  id: string;
  at: string;
  actorType: string;
  actor: string | null;
  entity: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  ip: string | null;
}

export interface ShopDocSlot {
  type: string;
  label: string;
  required: boolean;
  uploads: number;
  doc: {
    id: string;
    status: DocStatus;
    createdAt: string;
    documentNumber: string | null;
    expiresAt: string | null;
    expiringSoon: boolean;
    rejectionReason: string | null;
    reviewedAt: string | null;
    viewUrl: string;
    contentType: string;
  } | null;
}

export interface ShopDocs {
  id: string;
  name: string;
  status: StoreStatus;
  vertical: string;
  storeType: string;
  readinessScore: number;
  city: string | null;
  legalName: string;
  slots: ShopDocSlot[];
  summary: { required: number; verified: number; toReview: number; missing: number; expiringSoon: number };
}
