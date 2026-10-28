import { useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from './ui';
import { useI18n } from '../lib/i18n';
import { enablePush, usePushState } from '../lib/push';

/** "Order alerts on this phone": asks once from a tap; hidden where the browser can't do push or Firebase isn't set up. */
export function PushCard({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const state = usePushState();
  const [busy, setBusy] = useState(false);
  if (!state || state === 'unsupported' || state === 'not-configured') return null;
  if (compact && state === 'on') return null;
  const Icon = state === 'on' ? BellRing : state === 'blocked' ? BellOff : Bell;
  return (
    <section className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line" data-push={state}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dz-yellow" aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <b className="block">{state === 'on' ? t('lc.push.enabled') : t('lc.push.title')}</b>
        <span className="block text-sm text-ink-2">{state === 'blocked' ? t('lc.push.blocked') : t('lc.push.hint')}</span>
      </div>
      {state === 'off' && (
        <Button
          variant="dark"
          className="min-h-10 shrink-0 px-4 text-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await enablePush().catch(() => undefined);
            setBusy(false);
          }}
        >
          {t('lc.push.on')}
        </Button>
      )}
    </section>
  );
}
