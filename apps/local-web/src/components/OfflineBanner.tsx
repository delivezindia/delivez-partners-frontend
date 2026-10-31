import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useI18n } from '../lib/i18n';

// While the phone is offline, requests pause (React Query) and pages keep their loading state;
// this says why, and goes away by itself when the connection is back and the pages carry on.
export function OfflineBanner() {
  const { t } = useI18n();
  const online = useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline());
  if (online) return null;
  return (
    <div role="status" className="fixed left-1/2 top-3 z-[100] flex w-[min(92vw,30rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white shadow-lg" data-offline>
      <WifiOff className="h-4 w-4 shrink-0 text-dz-yellow" aria-hidden /> {t('lc.offline')}
    </div>
  );
}
