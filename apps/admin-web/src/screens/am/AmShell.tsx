import type { ReactNode } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { Bell, CheckSquare, Home, Store, UserRound, WifiOff, type LucideIcon } from 'lucide-react';
import { useMe } from '../Layout';
import { istTime, useAmQuery, useOnline, useOutbox } from '../../lib/am';

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/am', label: 'Home', icon: Home, end: true },
  { to: '/am/stores', label: 'Restaurants', icon: Store },
  { to: '/am/alerts', label: 'Alerts', icon: Bell },
  { to: '/am/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/am/profile', label: 'Profile', icon: UserRound },
];

/** Account manager mobile view: phone-first shell with a bottom bar. Only ACCOUNT_MANAGERs land here. */
export default function AmShell() {
  const { data: me, isLoading } = useMe();
  const online = useOnline();
  const pending = useOutbox();
  const counts = useAmQuery<{ issues: unknown[] }>('issues-open', '/admin/am/issues?status=open', { refetchInterval: 60_000, enabled: me?.role === 'ACCOUNT_MANAGER' });
  if (isLoading) return null;
  if (me && me.role !== 'ACCOUNT_MANAGER') return <Navigate to="/" replace />;
  const openIssues = counts.data?.data.issues.length ?? 0;

  return (
    <div className="min-h-screen bg-soft pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60">
      {(!online || pending.length > 0) && (
        <div className="sticky top-0 z-40 flex items-center gap-2 bg-black px-4 py-2 text-xs font-bold text-dz-yellow" role="status" data-offline>
          <WifiOff className="h-4 w-4" aria-hidden />
          {!online ? 'Offline — showing your last synced data' : `${pending.length} note(s) waiting to sync`}
          {!online && pending.length > 0 && <span className="ml-auto">{pending.length} to sync</span>}
        </div>
      )}
      <Outlet />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-auto lg:w-60 lg:border-r lg:border-t-0 lg:pb-0"
        aria-label="Account manager"
      >
        <p className="hidden px-6 pb-2 pt-6 font-display text-2xl text-dz-red lg:block">
          DELIVEZ <span className="align-middle text-xs font-extrabold text-ink-2">Account manager</span>
        </p>
        <ul className="mx-auto grid max-w-xl grid-cols-5 md:max-w-3xl lg:max-w-none lg:grid-cols-1 lg:gap-1 lg:p-3">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4 lg:text-sm ${isActive ? 'text-dz-red lg:bg-dz-red-soft' : 'text-ink-2 lg:hover:bg-soft'}`
                }
              >
                <n.icon className="h-[22px] w-[22px]" aria-hidden />
                {n.label}
                {n.to === '/am/alerts' && openIssues > 0 && (
                  <span className="absolute right-[22%] top-2 min-w-[18px] rounded-full bg-dz-red px-1 text-center text-[10px] leading-[18px] text-white lg:static lg:ml-auto">{openIssues}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Yellow page header used by every AM screen. */
export function AmHeader({ title, sub, back, right }: { title: ReactNode; sub?: ReactNode; back?: ReactNode; right?: ReactNode }) {
  return (
    <header className="dz-header px-4 pb-4 pt-3 lg:px-8 lg:pb-6 lg:pt-6">
      <div className="mx-auto flex max-w-xl md:max-w-3xl lg:max-w-6xl items-start gap-3">
        {back}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[26px] leading-tight lg:text-[36px]">{title}</h1>
          {sub && <p className="text-sm font-semibold text-black/70">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Synced({ at, cachedAt }: { at?: string; cachedAt: string | null }) {
  if (!at) return null;
  return (
    <p className={`mx-auto max-w-xl md:max-w-3xl lg:max-w-6xl px-4 pt-2 text-[11px] lg:px-8 ${cachedAt ? 'font-bold text-[#8a5a00]' : 'text-ink-3'}`}>
      {cachedAt ? `Last synced ${istTime(cachedAt)} — offline copy` : `Updated ${istTime(at)}`}
    </p>
  );
}

export const Page = ({ children }: { children: ReactNode }) => <main className="mx-auto max-w-xl md:max-w-3xl lg:max-w-6xl space-y-4 px-4 py-3 lg:space-y-5 lg:px-8 lg:py-5">{children}</main>;
