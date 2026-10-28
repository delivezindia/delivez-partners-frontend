import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { cartCount, cartTotal, useCart } from '../lib/cart';
import { rupees } from '../lib/format';
import { useI18n } from '../lib/i18n';

/** Floating "3 items · ₹420 — View cart" bar, shown while the basket has something in it. */
export function CartBar() {
  const { t } = useI18n();
  const { lines, storeName, storeVertical } = useCart();
  const lab = storeVertical === 'DIAGNOSTICS';
  const { pathname } = useLocation();
  const n = cartCount(lines);
  // Only while browsing (home, a shop); forms and the cart itself have their own buttons at the bottom.
  if (!n || !(pathname === '/' || pathname.startsWith('/s/'))) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <Link to={lab ? '/book-lab' : '/cart'} className="dz-rise pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-dz-green px-4 py-3 text-white shadow-lg">
        <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <b className="block">{t('lc.cart.bar', { n, total: rupees(cartTotal(lines)) })}</b>
          <span className="block truncate text-xs text-white/80">{t('lc.cart.from', { store: storeName ?? '' })}</span>
        </span>
        <span className="font-extrabold">{lab ? t('lc.lb.next') : t('lc.cart.view')} →</span>
      </Link>
    </div>
  );
}
