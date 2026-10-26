import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MapPin, Receipt, UserRound } from 'lucide-react';
import { Brand } from './ui';
import { LocationSheet } from './LocationSheet';
import { useAuth } from '../lib/auth-store';
import { useI18n } from '../lib/i18n';
import { useDeliverTo } from '../lib/location';

/** Yellow top bar: where we deliver (tap to change) and the account. */
export function AppHeader() {
  const { t } = useI18n();
  const at = useDeliverTo((s) => s.at);
  const token = useAuth((s) => s.accessToken);
  const [picking, setPicking] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-dz-red bg-dz-yellow">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <Brand />
        <button type="button" onClick={() => setPicking(true)} className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left hover:bg-black/5" aria-label={t('lc.loc.change')}>
          <span className="flex items-center gap-1 text-sm font-extrabold">
            <MapPin className="h-4 w-4 shrink-0 text-dz-red" aria-hidden />
            <span className="truncate">{at ? at.title : t('lc.loc.choose')}</span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          </span>
          {at?.line && <span className="block truncate text-xs text-ink-2">{at.line}</span>}
        </button>
        {token && (
          <Link to="/orders" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10" aria-label={t('lc.ord.all')}>
            <Receipt className="h-5 w-5" aria-hidden />
          </Link>
        )}
        <Link to={token ? '/account' : '/login'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10" aria-label={token ? t('lc.acc.title') : t('lc.login')}>
          <UserRound className="h-5 w-5" aria-hidden />
        </Link>
      </div>
      {picking && <LocationSheet onClose={() => setPicking(false)} />}
    </header>
  );
}
