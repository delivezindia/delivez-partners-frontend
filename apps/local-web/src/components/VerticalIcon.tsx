import { FlaskConical, Pill, ShoppingBasket, ShoppingCart, Store, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react';
import type { ShopPage } from '../lib/labels';
import type { Vertical } from '../lib/types';

/** One icon + colour pair per kind of shop (Delivez Now palette). */
export const VERTICAL_LOOK: Record<Vertical, { icon: LucideIcon; accent: string; tint: string }> = {
  EAT: { icon: UtensilsCrossed, accent: '#E8130F', tint: '#FFF1EC' },
  GROCERY: { icon: ShoppingBasket, accent: '#17803A', tint: '#EDF8F0' },
  PHARMACY: { icon: Pill, accent: '#1E5BB8', tint: '#EEF3FC' },
  DIAGNOSTICS: { icon: FlaskConical, accent: '#0E7490', tint: '#E8F6F9' },
  LOCAL_STORES: { icon: Store, accent: '#7A3FC0', tint: '#F4EEFC' },
};

/** The Rush and Street Cart pages, in the same style. */
export const KIND_LOOK: Record<Vertical | ShopPage, { icon: LucideIcon; accent: string; tint: string }> = {
  ...VERTICAL_LOOK,
  RUSH: { icon: Zap, accent: '#7B2FD4', tint: '#F1E6FF' },
  STREET: { icon: ShoppingCart, accent: '#C2470B', tint: '#FFE8D6' },
};

const SIZE = {
  sm: { box: 'h-5 w-5', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
  xl: { box: 'h-24 w-24 rounded-3xl', icon: 'h-12 w-12' },
} as const;

/** Category icon. `bare` draws only the glyph (for chips and inline lists); otherwise a tinted tile. */
export function VerticalIcon({ v, size = 'md', bare = false, className = '' }: { v: Vertical | ShopPage; size?: keyof typeof SIZE; bare?: boolean; className?: string }) {
  const { icon: Icon, accent, tint } = KIND_LOOK[v];
  if (bare) return <Icon className={`${SIZE[size].icon} shrink-0 ${className}`} style={{ color: accent }} aria-hidden />;
  return (
    <span className={`grid shrink-0 place-items-center ${SIZE[size].box} ${className}`} style={{ background: tint, color: accent }} aria-hidden>
      <Icon className={SIZE[size].icon} strokeWidth={2.2} />
    </span>
  );
}
