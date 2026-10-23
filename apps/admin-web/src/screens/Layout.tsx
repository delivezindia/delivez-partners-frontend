import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, FileCheck2, LayoutDashboard, Map, MessageSquareText, ScrollText, ShieldCheck, Store, Users, type LucideIcon } from 'lucide-react';
import { api, useAuth } from '../lib/api';
import { CAN, can, type AdminMe, type AdminRole } from '../lib/types';
import { Brand } from '../components/ui';
import { AdminBell } from '../components/AdminBell';
import { disablePush } from '../lib/push';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<AdminMe>('/admin/me'), staleTime: 5 * 60_000 });

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean; roles?: AdminRole[] }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/stores', label: 'Stores', icon: Store },
  { to: '/documents', label: 'Documents', icon: FileCheck2 },
  { to: '/team', label: 'Team', icon: Users, roles: CAN.team },
  { to: '/cities', label: 'Cities', icon: Map },
  { to: '/legal', label: 'Legal', icon: ScrollText },
  { to: '/audit', label: 'Audit log', icon: ShieldCheck, roles: CAN.audit },
  { to: '/system', label: 'System', icon: Activity, roles: CAN.team },
  // Local dev phone for SMS / WhatsApp; never shown in a production build.
  ...(import.meta.env.DEV ? [{ to: '/dev/messages', label: 'Messages (dev)', icon: MessageSquareText }] : []),
];

export default function Layout() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pending = useQuery({ queryKey: ['documents', 'PENDING'], queryFn: () => api<{ superseded: boolean }[]>('/admin/documents?status=PENDING'), refetchInterval: 30_000 });
  const pendingCount = pending.data?.filter((d) => !d.superseded).length ?? 0;
  const nav = NAV.filter((n) => !n.roles || can(me?.role, n.roles));

  async function logout() {
    await disablePush();
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    useAuth.getState().clear();
    qc.clear();
    navigate('/login', { replace: true });
  }

  const link = (n: (typeof NAV)[number]) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-sm font-bold transition ${isActive ? 'text-dz-red shadow-[inset_0_-3px_0_var(--color-dz-red)]' : 'text-black/80 hover:text-dz-red'}`
      }
    >
      <n.icon className="h-4 w-4" aria-hidden />
      {n.label}
      {n.to === '/documents' && pendingCount > 0 && <span className="rounded-full bg-dz-red px-1.5 text-xs text-white">{pendingCount}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-soft">
      <header className="dz-header sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-5">
          <Brand />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <AdminBell />
            {me && (
              <span className="hidden text-right leading-tight sm:block">
                <b className="block">{me.user.fullName ?? me.user.phone}</b>
                <span className="text-xs">
                  {me.role.replace(/_/g, ' ')} · {me.allCities ? 'All cities' : me.cities.map((c) => c.name).join(', ')}
                </span>
              </span>
            )}
            <button type="button" onClick={logout} className="rounded-lg border-[1.5px] border-black px-3 py-1.5 font-bold hover:bg-black/5">
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto border-t border-black/10 px-3 [scrollbar-width:none]" aria-label="Admin">
          {nav.map(link)}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
