import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';

export type ProductStatus = 'AVAILABLE' | 'HIDDEN' | 'PAUSED' | 'OUT_OF_STOCK';

export interface Variant {
  id?: string;
  name: string;
  priceDiff: number;
  isDefault: boolean;
}
export interface AddonGroup {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  addons: { id?: string; name: string; price: number; isVeg: boolean | null }[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: { id: string; name: string } | null;
  images: { key: string; url: string }[];
  sku: string | null;
  barcode: string | null;
  unit: string;
  unitSize: number | null;
  price: number;
  mrp: number | null;
  taxRatePct: number;
  hsnCode: string | null;
  isAvailable: boolean;
  pausedUntil: string | null;
  isComplex: boolean;
  prepMinutes: number | null;
  maxQtyPerOrder: number | null;
  sortOrder: number;
  isVeg: boolean | null;
  spiceLevel: number | null;
  prescriptionRequired: boolean;
  drugSchedule: 'NONE' | 'OTC' | 'H' | 'H1' | 'X';
  saltComposition: string | null;
  manufacturer: string | null;
  substitutionAllowed: boolean;
  /** Lab tests (DIAGNOSTICS stores). */
  lab: {
    sampleType: 'BLOOD' | 'URINE' | 'STOOL' | 'SWAB' | 'SALIVA' | 'OTHER' | null;
    fastingHours: number | null;
    reportHours: number | null;
    homeCollection: boolean | null;
    walkIn: boolean | null;
    parameters: number | null;
    preparation: string | null;
  } | null;
  tags: string[];
  variants: Variant[];
  addonGroups: AddonGroup[];
  inventory: {
    trackStock: boolean;
    stockQty: number;
    reservedQty: number;
    available: number | null;
    lowStockThreshold: number;
    isLow: boolean;
    batchNo: string | null;
    expiryDate: string | null;
  } | null;
  status: ProductStatus;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export type Summary = Record<ProductStatus | 'total' | 'LOW_STOCK', number>;

export const useCategories = (storeId: string) =>
  useQuery({ queryKey: ['categories', storeId], queryFn: () => api<{ categories: Category[]; uncategorized: number }>(`/partners/stores/${storeId}/categories`) });

export const useProducts = (storeId: string) =>
  useQuery({ queryKey: ['products', storeId], queryFn: () => api<{ products: Product[]; summary: Summary }>(`/partners/stores/${storeId}/products`) });

export const STATUS_LABEL: Record<ProductStatus, { label: string; cls: string }> = {
  AVAILABLE: { label: 'Available', cls: 'border-dz-green bg-dz-green-soft text-dz-green' },
  HIDDEN: { label: 'Unavailable', cls: 'border-line bg-soft text-ink-2' },
  PAUSED: { label: 'Paused', cls: 'border-dz-yellow-strong bg-dz-yellow-soft text-ink' },
  OUT_OF_STOCK: { label: 'Out of stock', cls: 'border-dz-red bg-dz-red-soft text-dz-red' },
};

/** "₹1,234.50" from paise; whole rupees drop the decimals. */
export const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
/** Rupee text field → paise (NaN-safe). */
export const toPaise = (rupees: string) => Math.round(Number(rupees.replace(/[^\d.]/g, '') || 0) * 100);
export const toRupees = (paise: number | null | undefined) => (paise == null ? '' : String(paise / 100));

/** presign → PUT → file key for a product image. */
export async function uploadProductImage(storeId: string, file: File): Promise<string> {
  const pre = await api<{ uploadUrl: string; fileKey: string }>(`/partners/stores/${storeId}/products/uploads`, { method: 'POST', body: { contentType: file.type, size: file.size } });
  const res = await fetch(pre.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!res.ok) {
    const err = (await res.json().catch(() => null))?.error;
    throw new ApiError(res.status, err?.code ?? 'UPLOAD_FAILED', err?.message ?? 'Image upload failed');
  }
  return pre.fileKey;
}

export function pausedText(until: string | null) {
  if (!until) return '';
  const d = new Date(until);
  return `until ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}${d.toDateString() !== new Date().toDateString() ? ` ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`;
}
