import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import { useMe, useStore } from '../../lib/queries';
import { useStoreSocket, type DomainEvent } from '../../lib/socket';
import { useLogout } from '../../lib/use-logout';
import type { MeResponse, OpenState, PartnerRole, StoreDetail } from '../../lib/types';
import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, Download, ChevronDown, ClipboardList, FileText, LayoutDashboard, LogOut, Package, Settings as SettingsIcon, Store, UserRoundCog, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Brand, Button, ErrorText } from '../../components/ui';
import { Avatar, Dropdown, Skeleton, toast, Toaster } from '../../components/feedback';
import { useI18n, type MsgKey } from '../../lib/i18n';
import { ring } from '../../lib/orders';
import { usePushBridge } from '../../lib/notifications';
import { NotificationBell } from '../../components/NotificationBell';
import { AlertsBanner } from '../../components/AlertsBanner';
import { useInstallPrompt } from '../../lib/install';

export interface StoreContext {
  storeId: string;
  detail: StoreDetail;
  role: PartnerRole;
  feed: DomainEvent[];
}
export const useStoreContext = () => useOutletContext<StoreContext>();

/** Navigation per role (plan §4.2). `soon` tabs are placeholders until their step ships. */
const TABS: { to: string; label: MsgKey; icon: LucideIcon; roles: PartnerRole[]; soon?: boolean; end?: boolean; hideFor?: string[]; onlyFor?: string[] }[] = [
  { to: '', label: 'tab.dashboard', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST', 'ACCOUNTANT'], end: true },
  { to: 'orders', label: 'tab.orders', icon: ClipboardList, roles: ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST'], hideFor: ['DIAGNOSTICS'] },
  { to: 'bookings', label: 'tab.bookings', icon: CalendarClock, roles: ['OWNER', 'MANAGER', 'COUNTER_STAFF'], onlyFor: ['DIAGNOSTICS'] },
  { to: 'menu', label: 'tab.menu', icon: UtensilsCrossed, roles: ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST'] },
  { to: 'inventory', label: 'tab.inventory', icon: Package, roles: ['OWNER', 'MANAGER', 'PHARMACIST'], hideFor: ['EAT', 'DIAGNOSTICS'] },
  { to: 'staff', label: 'tab.staff', icon: Users, roles: ['OWNER', 'MANAGER'] },
  { to: 'settings', label: 'tab.settings', icon: SettingsIcon, roles: ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST', 'ACCOUNTANT'] },
];

export default function StoreLayout() {
  const { storeId = '' } = useParams();
  const navigate = useNavigate();
  const logout = useLogout();
  const qc = useQueryClient();
  const me = useMe();
  const { data, isLoading, error } = useStore(storeId);
  const [feed, setFeed] = useState<DomainEvent[]>([]);
  const { t } = useI18n();
  usePushBridge();
  const installer = useInstallPrompt();

  const connected = useStoreSocket(storeId, (event) => {
    setFeed((f) => [event, ...f].slice(0, 8));
    if (event.type === 'store.open_state_changed') {
      const to = (event.data as { to: OpenState }).to;
      qc.setQueryData<StoreDetail>(['store', storeId], (old) => (old ? { ...old, store: { ...old.store, openState: to } } : old));
      qc.setQueryData<MeResponse>(['me'], (old) =>
        old ? { ...old, memberships: old.memberships.map((m) => ({ ...m, stores: m.stores.map((s) => (s.id === storeId ? { ...s, openState: to } : s)) })) } : old,
      );
    }
    if (event.type === 'catalog.updated' || event.type === 'inventory.low_stock') {
      void qc.invalidateQueries({ queryKey: ['products', storeId] });
      void qc.invalidateQueries({ queryKey: ['categories', storeId] });
      void qc.invalidateQueries({ queryKey: ['inventory', storeId] });
    }
    if (event.type === 'notification.created') void qc.invalidateQueries({ queryKey: ['notifications'] });
    if (event.type.startsWith('order.') || event.type === 'delivery.task_updated' || event.type === 'payment.refund_initiated') {
      void qc.invalidateQueries({ queryKey: ['orders', storeId] });
      void qc.invalidateQueries({ queryKey: ['order', storeId] });
      if (event.type === 'order.placed' && event.actor?.type !== 'PARTNER') {
        ring();
        toast.info(`New order ${(event.data as { orderNumber?: string }).orderNumber ?? ''}`.trim());
      }
    }
    if (event.type.startsWith('lab.')) {
      void qc.invalidateQueries({ queryKey: ['lab-bookings', storeId] });
      void qc.invalidateQueries({ queryKey: ['lab-booking', storeId] });
      if (event.type === 'lab.booking_created') toast.info('New lab booking');
    }
    if (event.type === 'store.admin_notice') {
      void qc.invalidateQueries({ queryKey: ['store', storeId] });
      toast.info(t('dash.notice'));
    }
    if (event.type === 'store.status_changed' || event.type.startsWith('document.') || event.type === 'store.settings_updated' || event.type === 'store.hours_updated') {
      void qc.invalidateQueries({ queryKey: ['store', storeId] });
      void qc.invalidateQueries({ queryKey: ['settings', storeId] });
      void qc.invalidateQueries({ queryKey: ['me'] });
    }
  });

  const allStores = me.data?.memberships.flatMap((m) => m.stores) ?? [];
  const role = data?.role;
  const userName = me.data?.user.fullName ?? me.data?.user.phone;

  if (error) {
    return (
      <div className="p-8">
        <ErrorText>{error instanceof ApiError ? error.message : 'Could not load this store'}</ErrorText>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/accounts')}>
          Back to outlets
        </Button>
      </div>
    );
  }

  const tabs = TABS.filter((t) => (!role || t.roles.includes(role)) && !(data && t.hideFor?.includes(data.store.vertical)) && !(data && t.onlyFor && !t.onlyFor.includes(data.store.vertical)));
  const roleLabel = role ? role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ') : '';

  return (
    <main className="flex min-h-screen flex-col bg-soft">
      <header className="dz-header sticky top-0 z-30">
        <div className="flex h-[60px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Brand compact />
          <div className="relative min-w-0 flex-1 sm:max-w-xs sm:flex-none">
            <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
            <select
              aria-label="Outlet"
              value={storeId}
              onChange={(e) => navigate(`/stores/${e.target.value}`)}
              className="h-10 w-full appearance-none truncate rounded-lg border-[1.5px] border-black bg-white pl-9 pr-8 text-sm font-bold"
            >
              {allStores.length === 0 && data && <option value={data.store.id}>{data.store.name}</option>}
              {allStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold" title={connected ? t('shell.live') : t('shell.connecting')}>
            <span className="relative flex h-2.5 w-2.5">
              {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dz-green opacity-60" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-dz-green' : 'bg-neutral-500'}`} />
            </span>
            <span className="hidden sm:inline">{connected ? t('shell.live') : t('shell.connecting')}</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell storeId={storeId} />
            <Dropdown
              label="Account menu"
              triggerClass="flex items-center gap-2 rounded-full p-1 transition hover:bg-black/5 sm:pr-3"
              trigger={
                <>
                  <Avatar name={userName ?? '?'} className="h-9 w-9 text-sm" />
                  <span className="hidden text-left leading-tight sm:block">
                    <b className="block max-w-[10rem] truncate text-sm">{userName}</b>
                    <span className="text-xs">{roleLabel}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 sm:block" aria-hidden />
                </>
              }
              items={[
                { label: t('shell.switchUser'), icon: UserRoundCog, onSelect: () => navigate(`/stores/${storeId}/switch`) },
                ...(allStores.length > 1 ? [{ label: t('shell.allOutlets'), icon: Store, onSelect: () => navigate('/accounts') }] : []),
                ...(installer.canInstall ? [{ label: t('shell.installApp'), icon: Download, onSelect: () => void installer.install() }] : []),
                null,
                { label: t('shell.logout'), icon: LogOut, danger: true, onSelect: () => void logout() },
              ]}
            />
          </div>
        </div>
        <nav className="dz-scroll-x flex gap-1 overflow-x-auto border-t border-black/10 px-2 sm:px-5" aria-label="Store">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-bold transition ${isActive ? 'text-dz-red shadow-[inset_0_-3px_0_var(--color-dz-red)]' : 'text-black/80 hover:text-dz-red'}`
              }
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              {t(tab.label === 'tab.menu' && data?.store.vertical === 'DIAGNOSTICS' ? 'tab.tests' : tab.label)}
              {tab.soon && <span className="rounded bg-white/70 px-1 text-[10px] font-bold uppercase tracking-wide">{t('tab.soon')}</span>}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Only for people who take orders/bookings, once the store can receive them. */}
      {data && role && ['LIVE', 'LIMITED'].includes(data.store.status) && (data.store.vertical === 'DIAGNOSTICS' ? ['OWNER', 'MANAGER', 'COUNTER_STAFF'] : ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST']).includes(role) && (
        <AlertsBanner bookings={data.store.vertical === 'DIAGNOSTICS'} />
      )}
      {data && ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(data.store.status) && (
        <Banner
          tone="info"
          icon={FileText}
          action={
            <Button className="min-h-9 px-4 text-sm" onClick={() => navigate(`/onboarding/${storeId}`)}>
              {data.store.status === 'DRAFT' ? t('banner.continue') : t('banner.view')}
            </Button>
          }
        >
          {data.store.status === 'DRAFT' ? t('banner.draft') : t('banner.inReview')}
        </Banner>
      )}
      {data?.store.status === 'PAUSED' && (
        <Banner tone="warn" icon={AlertTriangle}>
          {t('banner.paused')}
          {data.store.closedReason && <span className="block font-normal">{t('banner.reason', { reason: data.store.closedReason })}</span>}
        </Banner>
      )}
      {data?.store.status === 'SUSPENDED' && (
        <Banner tone="danger" icon={AlertTriangle}>
          {t('banner.suspended')}
          {data.store.closedReason && <span className="block font-normal">{t('banner.reason', { reason: data.store.closedReason })}</span>}
        </Banner>
      )}
      {me.data && me.data.pendingLegal.length > 0 && data?.store.status !== 'DRAFT' && (
        <Banner
          tone="warn"
          icon={FileText}
          action={
            role === 'OWNER' && (
              <Button variant="yellow" className="min-h-9 px-4 text-sm" onClick={() => navigate(`/stores/${storeId}/settings?tab=legal`)}>
                {t('banner.review')}
              </Button>
            )
          }
        >
          {t('banner.terms')}
          <span className="hidden font-normal text-ink-2 md:inline"> — {me.data.pendingLegal.map((d) => d.type.replace(/_/g, ' ').toLowerCase()).join(', ')} (v{me.data.pendingLegal[0].version})</span>
        </Banner>
      )}

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {isLoading || !data || !role ? <PageSkeleton /> : <Outlet context={{ storeId, detail: data, role, feed } satisfies StoreContext} />}
      </section>
      <Toaster />
    </main>
  );
}

const BANNER_TONE = {
  info: 'border-line bg-white',
  warn: 'border-dz-yellow-strong bg-dz-yellow-soft',
  danger: 'border-dz-red bg-dz-red-soft text-dz-red',
};

function Banner({ tone, icon: Icon, action, children }: { tone: keyof typeof BANNER_TONE; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={`border-b ${BANNER_TONE[tone]}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 font-bold">{children}</p>
        {action}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36 md:col-span-2" />
        <Skeleton className="h-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
