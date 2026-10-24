// Response shapes used by the web app. Moves to the generated @delivez/api-client later.
export type OpenState = 'OPEN' | 'BUSY' | 'CLOSED';
export type StoreStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'LIVE'
  | 'LIMITED'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'CLOSED';
export type PartnerRole = 'OWNER' | 'MANAGER' | 'KITCHEN_LEAD' | 'COUNTER_STAFF' | 'PHARMACIST' | 'ACCOUNTANT';

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  storeType: string;
  status: StoreStatus;
  openState: OpenState;
  readinessScore: number;
  city: { name: string } | null;
  zone: { name: string } | null;
}

export interface Membership {
  partnerAccountId: string;
  displayName: string;
  role: PartnerRole;
  stores: StoreSummary[];
}

export interface MeResponse {
  user: { id: string; phone: string; fullName: string | null; email: string | null; language: string };
  memberships: Membership[];
  pendingLegal: { id: string; type: string; version: string; state: string | null; contentUrl: string }[];
}

export interface StoreDetail {
  role: PartnerRole;
  store: StoreSummary & {
    addressLine1: string | null;
    landmark: string | null;
    pincode: string | null;
    defaultPrepMinutes: number;
    peakPrepMinutes: number;
    probationOrdersLeft: number;
    supportsDelivery: boolean;
    supportsPickup: boolean;
    lat: number | null;
    lng: number | null;
    closedReason: string | null;
    allowSubstitutions?: boolean;
    city: { name: string; state: string } | null;
    timings: { dayOfWeek: number; opensAt: string; closesAt: string }[];
    _count: { products: number };
  };
  /** Messages from the Delivez team, last 30 days. */
  notices?: { id: string; message: string; at: string }[];
}
