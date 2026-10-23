import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useI18n } from '../lib/i18n';

/** Shown on every page while the device has no internet; disappears as soon as it is back. */
export function OfflineBar() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <p className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white shadow-xl">
        <WifiOff className="h-4 w-4 text-dz-yellow" aria-hidden /> {t('shell.offline')}
      </p>
    </div>
  );
}
