export type Vertical = 'EAT' | 'GROCERY' | 'PHARMACY' | 'DIAGNOSTICS' | 'LOCAL_STORES';

export interface Rating {
  avg: number;
  count: number;
}

/** GET /v1/local/stores — one shop near the customer. Money is in paise. */
export interface StoreCard {
  id: string;
  slug: string | null;
  name: string;
  vertical: Vertical;
  cuisines: string[];
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  area: string | null;
  distanceKm: number;
  open: boolean;
  busy: boolean;
  bookable: boolean;
  opensAt: string | null;
  delivers: boolean;
  pickup: boolean;
  etaMinutes: number;
  deliveryFee: number;
  minOrderAmount: number;
  rating: Rating | null;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  isVeg: boolean | null;
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  mrp: number | null;
  unit: string | null;
  unitSize: string | null;
  isVeg: boolean | null;
  spiceLevel: number | null;
  prescriptionRequired: boolean;
  saltComposition: string | null;
  manufacturer: string | null;
  lab: { sampleType: string | null; fastingHours: number | null; reportHours: number | null; homeCollection: boolean; walkIn: boolean; parameters: string[]; preparation: string | null } | null;
  variants: { id: string; name: string; priceDiff: number; isDefault: boolean }[];
  addonGroups: { id: string; name: string; minSelect: number; maxSelect: number; addons: Addon[] }[];
  available: boolean;
  fewLeft: number | null;
  maxQty: number;
}

/** GET /v1/local/stores/:idOrSlug */
export interface Menu {
  store: {
    id: string;
    slug: string | null;
    name: string;
    vertical: Vertical;
    cuisines: string[];
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    address: string;
    open: boolean;
    busy: boolean;
    opensAt: string | null;
    supportsDelivery: boolean;
    supportsPickup: boolean;
    distanceKm: number | null;
    delivers: boolean | null;
    etaMinutes: number;
    deliveryFee: number;
    packagingFee: number;
    minOrderAmount: number;
    rating: Rating | null;
  };
  categories: { id: string | null; name: string }[];
  products: Product[];
}

export type AddressLabel = 'HOME' | 'WORK' | 'OTHER';

export interface Address {
  id: string;
  label: AddressLabel;
  contactName: string | null;
  contactPhone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  pincode: string;
  cityName: string;
  state: string;
  lat: number;
  lng: number;
  placeId: string | null;
  isDefault: boolean;
}

export interface Me {
  id: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  language: string;
  defaultAddressId: string | null;
  whatsappOptIn: boolean;
  marketingOptIn: boolean;
}
