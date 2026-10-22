import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Megaphone, ArrowRight, BadgeCheck, CircleDot, ClipboardList, Clock, EyeOff, FileText, PackageX, PauseCircle, Settings as SettingsIcon, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { api, ApiError, newIdempotencyKey } from '../../lib/api';
import { useProducts } from '../../lib/catalog';
import type { DomainEvent } from '../../lib/socket';
import type { OpenState, PartnerRole, StoreDetail } from '../../lib/types';
import { ErrorText } from '../../components/ui';
import { Skeleton, toast } from '../../components/feedback';
import { StoreStatusChip } from '../../components/StatusChip';
import { useStoreContext } from './StoreLayout';
import { useMe } from '../../lib/queries';
import { useI18n, type MsgKey } from '../../lib/i18n';

const CAN_TOGGLE: PartnerRole[] = ['OWNER', 'MANAGER', 'KITCHEN_LEAD'];
const CAN_SEE_MENU: PartnerRole[] = ['OWNER', 'MANAGER', 'KITCHEN_LEAD', 'COUNTER_STAFF', 'PHARMACIST'];

const OPEN_STATES: { value: OpenState; label: MsgKey; hint: MsgKey; active: string; dot: string }[] = [
  { value: 'OPEN', label: 'state.open', hint: 'state.openHint', active: 'bg-dz-green text-white', dot: 'bg-dz-green' },
  { value: 'BUSY', label: 'state.busy', hint: 'state.busyHint', active: 'bg-state-almost text-white', dot: 'bg-state-almost' },
  { value: 'CLOSED', label: 'state.closed', hint: 'state.closedHint', active: 'bg-black text-white', dot: 'bg-neutral-400' },
];

function greetingKey(): MsgKey {
  const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  return h < 12 ? 'dash.goodMorning' : h < 17 ? 'dash.goodAfternoon' : 'dash.goodEvening';
}

// P14 Dashboard
export default function Dashboard() {
  const { storeId, detail, role, feed } = useStoreContext();
  const me = useMe();
  const qc = useQueryClient();
  const [toggleError, setToggleError] = useState('');
  const { t, locale } = useI18n();
  const dayName = new Date().toLocaleDateString(locale, { weekday: 'long' });
  const store = detail.store;
  const today = new Date().getDay();
  const todaySlots = store.timings?.filter((t) => t.dayOfWeek === today) ?? [];
  const firstName = me.data?.user.fullName?.split(' ')[0];

  const setOpenState = useMutation({
    mutationFn: (openState: OpenState) => api<{ openState: OpenState }>(`/partners/stores/${storeId}/open-state`, { method: 'PUT', body: { openState }, idempotencyKey: newIdempotencyKey() }),
    onMutate: () => setToggleError(''),
    onSuccess: (res) => {
      qc.setQueryData<StoreDetail>(['store', storeId], (old) => (old ? { ...old, store: { ...old.store, openState: res.openState } } : old));
      toast.success(res.openState === 'OPEN' ? t('dash.toastOpen') : res.openState === 'BUSY' ? t('dash.toastBusy') : t('dash.toastClosed'));
    },
    onError: (err) => setToggleError(err instanceof ApiError ? err.message : 'Could not update. Try again.'),
  });

  const tiles: { to: string; title: string; note: string; icon: LucideIcon; soon?: boolean }[] = [
    store.vertical === 'DIAGNOSTICS'
      ? { to: 'bookings', title: t('dash.tileBookings'), note: t('dash.tileBookingsNote'), icon: ClipboardList }
      : { to: 'orders', title: t('dash.tileOrders'), note: t('dash.tileOrdersNote'), icon: ClipboardList },
    ...(CAN_SEE_MENU.includes(role) ? [{ to: 'menu', title: store.vertical === 'EAT' ? t('dash.tileMenu') : store.vertical === 'DIAGNOSTICS' ? t('dash.tileTests') : t('dash.tileProducts'), note: store.vertical === 'DIAGNOSTICS' ? t('dash.tileTestsNote') : t('dash.tileMenuNote'), icon: UtensilsCrossed }] : []),
    ...(role === 'OWNER' || role === 'MANAGER' ? [{ to: 'staff', title: t('dash.tileStaff'), note: t('dash.tileStaffNote'), icon: Users }] : []),
    { to: 'settings', title: t('dash.tileSettings'), note: t('dash.tileSettingsNote'), icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-3">
            {t(greetingKey())}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[clamp(30px,4vw,44px)]">{store.name}</h1>
            <StoreStatusChip status={store.status} />
          </div>
          <p className="mt-1.5 text-sm text-ink-2">{[store.addressLine1, store.landmark, store.city?.name].filter(Boolean).join(' · ') || 'Address not set yet'}</p>
        </div>
        {store.probationOrdersLeft > 0 && (store.status === 'LIVE' || store.status === 'LIMITED') && (
          <span className="dz-badge">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t('dash.newStore', { n: store.probationOrdersLeft })}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="dz-card p-5 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-2">
              <CircleDot className="h-4 w-4" aria-hidden /> {t('dash.storeStatus')}
            </p>
            {setOpenState.isPending && <span className="text-xs font-semibold text-ink-3">{t('dash.updating')}</span>}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Store status">
            {OPEN_STATES.map((o) => {
              const active = store.openState === o.value;
              return (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={active}
                  disabled={!CAN_TOGGLE.includes(role) || setOpenState.isPending || active}
                  onClick={() => setOpenState.mutate(o.value)}
                  className={`flex min-h-[56px] min-w-0 items-center justify-between gap-3 rounded-xl border-[1.5px] px-3 py-2.5 text-left [overflow-wrap:anywhere] sm:block sm:min-h-[72px] transition disabled:cursor-default ${active ? `${o.active} border-transparent shadow-md` : 'border-line bg-white hover:border-black disabled:opacity-50'}`}
                >
                  <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-extrabold sm:whitespace-normal">
                    {!active && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${o.dot}`} />}
                    {t(o.label)}
                  </span>
                  <span className={`block min-w-0 text-right text-xs leading-snug sm:text-left ${active ? 'opacity-90' : 'text-ink-3'}`}>{t(o.hint)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 space-y-1">
            <ErrorText>{toggleError}</ErrorText>
            {store.openState === 'CLOSED' && store.closedReason === 'AUTO_HOURS' && <p className="text-xs text-ink-3">{t('dash.autoClosed')}</p>}
            {!CAN_TOGGLE.includes(role) && <p className="text-xs text-ink-3">{t('dash.cantToggle')}</p>}
          </div>
        </div>

        <div className="dz-card p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-ink-2">
            <Clock className="h-4 w-4" aria-hidden /> {dayName}
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">{todaySlots.length ? todaySlots.map((t) => `${t.opensAt}–${t.closesAt}`).join(', ') : t('dash.closedToday')}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
            <div>
              <dt className="text-xs text-ink-3">{t('dash.prepTime')}</dt>
              <dd className="font-bold">{t('dash.minutes', { n: store.defaultPrepMinutes })}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">{t('dash.atPeak')}</dt>
              <dd className="font-bold">{t('dash.minutes', { n: store.peakPrepMinutes })}</dd>
            </div>
          </dl>
        </div>
      </div>

      {detail.notices && detail.notices.length > 0 && (
        <div className="dz-card border-dz-yellow-strong bg-dz-yellow-soft p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Megaphone className="h-4 w-4" aria-hidden /> {t('dash.notice')}
          </p>
          <ul className="mt-2 space-y-2">
            {detail.notices.map((n) => (
              <li key={n.id} className="text-sm">
                <span className="font-semibold">{n.message}</span>
                <span className="block text-xs text-ink-3">{new Date(n.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {CAN_SEE_MENU.includes(role) && <CatalogStats storeId={storeId} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.title} to={t.to} className={`dz-card group flex items-start gap-3 p-4 ${t.soon ? 'border-dashed bg-white/60' : ''}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.soon ? 'bg-soft text-ink-3' : 'bg-dz-yellow text-black'}`}>
              <t.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-extrabold">
                {t.title}
                {!t.soon && <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />}
              </span>
              <span className="block text-xs text-ink-3">{t.note}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="dz-card p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-ink-2">
          <Activity className="h-4 w-4" aria-hidden /> {t('dash.activity')}
        </p>
        {feed.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dz-green opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-dz-green" />
            </span>
            {t('dash.listening')}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {feed.map((e) => {
              const { icon: Icon, text, tone } = describe(e);
              return (
                <li key={e.id} className="dz-fade flex items-center gap-3 py-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">{text}</span>
                  <time className="shrink-0 text-xs text-ink-3" dateTime={e.occurredAt}>
                    {new Date(e.occurredAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Real numbers from the catalog — what customers can order right now. */
function CatalogStats({ storeId }: { storeId: string }) {
  const { data, isLoading } = useProducts(storeId);
  const { t } = useI18n();
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[88px]" />
        ))}
      </div>
    );
  }
  if (!data) return null;
  const s = data.summary;
  const stats: { label: string; value: number; icon: LucideIcon; tone: string; filter?: string }[] = [
    { label: t('dash.statLive'), value: s.AVAILABLE, icon: BadgeCheck, tone: 'text-dz-green' },
    { label: t('dash.statPaused'), value: s.PAUSED, icon: PauseCircle, tone: s.PAUSED ? 'text-amber-700' : 'text-ink-3' },
    { label: t('dash.statOff'), value: s.HIDDEN, icon: EyeOff, tone: 'text-ink-3' },
    { label: s.LOW_STOCK ? t('dash.statOutLow') : t('dash.statOut'), value: s.OUT_OF_STOCK + (s.LOW_STOCK ?? 0), icon: s.OUT_OF_STOCK ? PackageX : AlertTriangle, tone: s.OUT_OF_STOCK + (s.LOW_STOCK ?? 0) ? 'text-dz-red' : 'text-ink-3' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((x) => (
        <Link key={x.label} to="menu" className="dz-card flex items-center justify-between gap-2 p-4">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <span className="block text-[28px] font-black leading-none tracking-tight" style={{ fontStretch: '80%' }}>
              {x.value}
            </span>
            <span className="mt-1 block text-xs font-semibold text-ink-3">{x.label}</span>
          </span>
          <x.icon className={`h-6 w-6 shrink-0 ${x.tone}`} aria-hidden />
        </Link>
      ))}
    </div>
  );
}

const STATE_WORD: Record<string, string> = { OPEN: 'open', BUSY: 'busy', CLOSED: 'closed' };

function describe(e: DomainEvent): { icon: LucideIcon; text: string; tone: string } {
  const by = e.actor?.type === 'ADMIN' ? 'by the Delivez team' : e.actor?.type === 'SYSTEM' ? 'automatically' : e.actor?.role ? `by ${e.actor.role.toLowerCase().replace('_', ' ')}` : '';
  switch (e.type) {
    case 'store.open_state_changed': {
      const d = e.data as { to: string };
      return { icon: CircleDot, text: `Store set to ${STATE_WORD[d.to] ?? d.to.toLowerCase()} ${by}`.trim(), tone: d.to === 'OPEN' ? 'bg-dz-green-soft text-dz-green' : 'bg-soft text-ink-2' };
    }
    case 'store.status_changed': {
      const d = e.data as { to: string };
      return { icon: BadgeCheck, text: `Store is now ${d.to.replace('_', ' ').toLowerCase()} ${by}`.trim(), tone: 'bg-dz-blue-soft text-dz-blue' };
    }
    case 'store.settings_updated': {
      const fields = (e.data as { fields?: string[] }).fields ?? [];
      return { icon: SettingsIcon, text: `Settings updated${fields.length ? ` — ${fields.map(humanField).join(', ')}` : ''}`, tone: 'bg-soft text-ink-2' };
    }
    case 'store.admin_notice':
      return { icon: Megaphone, text: `Delivez: ${(e.data as { message?: string }).message ?? 'new message'}`, tone: 'bg-dz-yellow-soft text-ink' };
    case 'store.hours_updated':
      return { icon: Clock, text: 'Opening hours updated', tone: 'bg-soft text-ink-2' };
    case 'catalog.updated': {
      const n = (e.data as { productIds?: string[] }).productIds?.length;
      return { icon: UtensilsCrossed, text: n ? `Menu updated — ${n} item${n > 1 ? 's' : ''}` : 'Menu updated', tone: 'bg-dz-yellow-soft text-ink' };
    }
    case 'inventory.low_stock': {
      const d = e.data as { name?: string; available?: number };
      return { icon: AlertTriangle, text: `${d.name ?? 'An item'} is running low (${d.available ?? 0} left)`, tone: 'bg-dz-red-soft text-dz-red' };
    }
  }
  if (e.type.startsWith('document.')) {
    const d = e.data as { label?: string; reason?: string };
    const verb = e.type.endsWith('verified') ? 'verified' : e.type.endsWith('rejected') ? 'needs another upload' : 'updated';
    return { icon: FileText, text: `${d.label ?? 'Document'} ${verb}${d.reason ? ` — ${d.reason}` : ''}`, tone: e.type.endsWith('rejected') ? 'bg-dz-red-soft text-dz-red' : 'bg-dz-green-soft text-dz-green' };
  }
  return { icon: Activity, text: e.type.replace(/[._]/g, ' '), tone: 'bg-soft text-ink-2' };
}

function humanField(f: string) {
  return f
    .replace(/([A-Z])/g, ' $1')
    .replace(/Minutes$/i, '')
    .trim()
    .toLowerCase();
}
