import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { enablePush, usePushState } from '../lib/notifications';
import { useI18n } from '../lib/i18n';
import { Button } from './ui';
import { toast } from './feedback';

const DISMISS_KEY = 'dz-alerts-banner-dismissed';
const SNOOZE_MS = 7 * 86_400_000;
const snoozed = () => {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
};

/** Asks the people who take orders to turn on alerts for this device, so orders ring even with the tab closed. */
export function AlertsBanner({ bookings = false }: { bookings?: boolean }) {
  const [state, setState] = usePushState();
  const [hidden, setHidden] = useState(snoozed);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  if (hidden || (state !== 'off' && state !== 'blocked')) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setHidden(true);
  };

  return (
    <div className="border-b border-dz-blue/30 bg-dz-blue-soft" role="region" aria-label={t('nt.bannerAria')}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5 text-sm sm:px-6">
        <BellRing className="h-5 w-5 shrink-0 text-dz-blue" aria-hidden />
        <p className="min-w-[12rem] flex-1">
          {state === 'blocked' ? (
            <>
              <b>{t('nt.blockedTitle')}</b> {t(bookings ? 'nt.blockedHowBookings' : 'nt.blockedHowOrders')}
            </>
          ) : (
            <>
              <b>{t('nt.neverMiss')}</b> {t(bookings ? 'nt.turnOnHowBookings' : 'nt.turnOnHowOrders')}
            </>
          )}
        </p>
        {state === 'off' && (
          <Button
            variant="dark"
            className="min-h-9 px-4 text-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const s = await enablePush().catch(() => 'off' as const);
              setBusy(false);
              setState(s);
              if (s === 'on') toast.success(t(bookings ? 'nt.onBookings' : 'nt.onOrders'));
              if (s === 'blocked') toast.error(t('nt.blockedToast'));
            }}
          >
            {busy ? t('nt.turningOn') : t('nt.turnOnAlerts')}
          </Button>
        )}
        <button type="button" onClick={dismiss} className="grid h-8 w-8 place-items-center rounded-lg text-ink-2 hover:bg-white/60" aria-label={t('nt.notNow')}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
