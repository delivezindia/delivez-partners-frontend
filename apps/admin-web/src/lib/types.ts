export type AdminRole = 'FOUNDER' | 'HEAD_OF_OPS' | 'REGIONAL_HEAD' | 'CITY_OPS' | 'COMPLIANCE' | 'FINANCE' | 'LEGAL' | 'SUPPORT' | 'SALES_AGENT' | 'AUDITOR' | 'ACCOUNT_MANAGER' | 'DISPATCHER' | AreaRole;
/** Area managers: one per level of the map; each works only inside their own area. */
export type AreaRole = 'ZONE_HEAD' | 'STATE_HEAD' | 'DISTRICT_MANAGER' | 'AREA_MANAGER' | 'PINCODE_EXECUTIVE';
export type GeoLevel = 'NATIONAL' | 'ZONE' | 'STATE' | 'DISTRICT' | 'CITY' | 'AREA' | 'PINCODE';
export const LEVELS: GeoLevel[] = ['NATIONAL', 'ZONE', 'STATE', 'DISTRICT', 'CITY', 'AREA', 'PINCODE'];
export const LEVEL_NAME: Record<GeoLevel, string> = { NATIONAL: 'All of India', ZONE: 'Zone', STATE: 'State', DISTRICT: 'District', CITY: 'City', AREA: 'Area', PINCODE: 'PIN code' };
/** Area roles always work at exactly this level (mirrors ROLE_LEVEL in core-api geo-scope.ts). */
export const ROLE_LEVEL: Record<AreaRole, GeoLevel> = { ZONE_HEAD: 'ZONE', STATE_HEAD: 'STATE', DISTRICT_MANAGER: 'DISTRICT', AREA_MANAGER: 'AREA', PINCODE_EXECUTIVE: 'PINCODE' };
export const AREA_ROLES = Object.keys(ROLE_LEVEL) as AreaRole[];
/** Roles an area manager may give inside their area besides the area roles below them. */
export const FIELD_ROLES: AdminRole[] = ['DISPATCHER', 'SUPPORT', 'ACCOUNT_MANAGER'];
const Z: AreaRole = 'ZONE_HEAD';
const S: AreaRole = 'STATE_HEAD';
const D: AreaRole = 'DISTRICT_MANAGER';
const A: AreaRole = 'AREA_MANAGER';
const P: AreaRole = 'PINCODE_EXECUTIVE';
export type StoreStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'LIVE' | 'LIMITED' | 'PAUSED' | 'SUSPENDED' | 'REJECTED' | 'CLOSED';
export type DocStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

// Mirrors core-api ROLES (modules/admin/admin.guard.ts) to show only allowed actions.
export const CAN = {
  verify: ['FOUNDER', 'HEAD_OF_OPS', 'COMPLIANCE', Z, S] as AdminRole[],
  approve: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'COMPLIANCE', Z, S, D] as AdminRole[],
  suspend: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'COMPLIANCE', Z, S] as AdminRole[],
  reinstate: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', Z] as AdminRole[],
  operate: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', Z, S, D, A, P] as AdminRole[],
  partnerUsers: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'SUPPORT', Z, S, D, A] as AdminRole[],
  team: ['FOUNDER', 'HEAD_OF_OPS', Z, S, D, A] as AdminRole[],
  /** System page: national senior admins only. */
  system: ['FOUNDER', 'HEAD_OF_OPS'] as AdminRole[],
  geo: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', Z, S, D, A] as AdminRole[],
  legal: ['FOUNDER', 'LEGAL'] as AdminRole[],
  /** Customer coupons (mirrors MANAGE_COUPONS on the API). */
  coupons: ['FOUNDER', 'HEAD_OF_OPS', 'FINANCE'] as AdminRole[],
  /** Who sees the coupon list (the API's READ group). */
  couponsView: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'COMPLIANCE', 'FINANCE', 'LEGAL', 'SUPPORT', 'AUDITOR', Z, S, D, A, P] as AdminRole[],
  audit: ['FOUNDER', 'HEAD_OF_OPS', 'COMPLIANCE', 'LEGAL', 'AUDITOR'] as AdminRole[],
  /** Cancel orders (mirrors ORDER_OPS on the API). */
  orderOps: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'SUPPORT', Z, S, D, A, P] as AdminRole[],
  /** Review, approve and suspend riders (mirrors MANAGE_RIDERS on the API). */
  riders: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'COMPLIANCE', Z, S, D] as AdminRole[],
  /** Assign / change / remove drivers (mirrors DISPATCH on the API). */
  dispatch: ['FOUNDER', 'HEAD_OF_OPS', 'REGIONAL_HEAD', 'CITY_OPS', 'DISPATCHER', Z, S, D, A, P] as AdminRole[],
};
export const can = (role: AdminRole | undefined, list: AdminRole[]) => !!role && list.includes(role);
export const ALL_ROLES: AdminRole[] = ['FOUNDER', 'HEAD_OF_OPS', Z, S, D, A, P, 'REGIONAL_HEAD', 'CITY_OPS', 'DISPATCHER', 'COMPLIANCE', 'FINANCE', 'LEGAL', 'SUPPORT', 'SALES_AGENT', 'AUDITOR', 'ACCOUNT_MANAGER'];
/** City dispatchers only get the Driver assignment screen, and must be given at least one city. */
export const DISPATCH_ONLY: AdminRole[] = ['DISPATCHER'];

export interface AdminMe {
  user: { id: string; phone: string; fullName: string | null };
  role: AdminRole;
  cities: { id: string; name: string }[];
  allCities: boolean;
  /** Area of work: which part of the map this admin covers. */
  scope: { level: GeoLevel; ids: string[]; label: string };
  permissions: string[];
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

/** What the partner's browser read off the file (digital PDF text or OCR), with warnings. */
export interface DocReading {
  method: 'pdf-text' | 'tesseract';
  read: { documentNumber: string | null; issuedAt: string | null; expiresAt: string | null } | null;
  confidence: 'HIGH' | 'LOW' | 'NONE';
  engineConfidence: number | null;
  flags: ('NOT_READ' | 'NUMBER_CHANGED' | 'EXPIRY_CHANGED' | 'GSTIN_MISMATCH' | 'PAN_MISMATCH' | 'LOW_QUALITY')[];
}

export interface QueueDoc {
  id: string;
  reading?: DocReading | null;
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
  store: { id: string; name: string; status: StoreStatus; vertical: string; storeType: string; rejectedReason: string | null; liveAt: string | null; createdAt: string; accountManagerId?: string | null };
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
  orders?: {
    today: { orders: number; sold: number; missed: number; revenue: number };
    last7Days: { date: string; orders: number; sold: number; missed: number; revenue: number }[];
    missedRate7d: number;
    busiestStores: { id: string; name: string; orders: number; sold: number; missed: number }[];
    mostMissed: { id: string; name: string; orders: number; sold: number; missed: number; missedRate: number }[];
  };
}

export interface TeamMember {
  id: string;
  phone: string;
  fullName: string | null;
  role: AdminRole;
  cityIds: string[];
  cities: string[];
  scope: { level: GeoLevel; ids: string[]; label: string };
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
    reading?: DocReading | null;
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

// ---- The map behind areas of work: Zone → State → District → City → Area → PIN code (GET /admin/geo/tree)
export interface GeoPin { code: string; serviceable: boolean; covered: boolean; team: number }
export interface GeoArea { id: string; name: string; isActive: boolean; covered: boolean; canEdit: boolean; canAddPincodes: boolean; stores: number; team: number; pincodes: GeoPin[] }
export interface GeoCity { id: string; name: string; isActive: boolean; covered: boolean; canEdit: boolean; canAddAreas: boolean; stores: number; riders: number; team: number; areas: GeoArea[]; pincodes: GeoPin[] }
export interface GeoDistrict { id: string; name: string; isActive: boolean; covered: boolean; canEdit: boolean; canAddCities: boolean; stores: number; riders: number; team: number; cities: GeoCity[] }
export interface GeoStateNode { id: string; name: string; code: string; isActive: boolean; covered: boolean; canEdit: boolean; canAddDistricts: boolean; stores: number; riders: number; team: number; districts: GeoDistrict[] }
export interface GeoZone { id: string; name: string; isActive: boolean; covered: boolean; canEdit: boolean; canAddStates: boolean; stores: number; riders: number; team: number; states: GeoStateNode[] }
export interface GeoTree { me: { level: GeoLevel; canAddZones: boolean }; zones: GeoZone[]; unplacedCities: GeoCity[] }
export interface PermissionTable {
  levels: GeoLevel[];
  permissions: { key: string; label: string }[];
  roles: { role: AdminRole; level: GeoLevel | 'ANY'; isAreaRole: boolean; permissions: string[]; canAdd: string[]; youCanGrant: boolean }[];
}
