import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CloudRain, Lightbulb, PackageCheck, Timer, Truck, UserX } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n, type MsgKey } from '../lib/i18n';

// The order SLA as a shop sees it (rules: apps/core-api/src/modules/orders/sla.ts).
const TIMES: [MsgKey, MsgKey][] = [
  ['sla.t1', 'sla.t1b'],
  ['sla.t2', 'sla.t2b'],
  ['sla.t3', 'sla.t3b'],
  ['sla.t4', 'sla.t4b'],
];
const ENDS: { icon: typeof Timer; cls: string; title: MsgKey; body: MsgKey }[] = [
  { icon: AlertTriangle, cls: 'bg-dz-red-soft text-dz-red', title: 'sla.e1', body: 'sla.e1b' },
  { icon: CloudRain, cls: 'bg-dz-green-soft text-dz-green', title: 'sla.e2', body: 'sla.e2b' },
  { icon: UserX, cls: 'bg-soft text-ink', title: 'sla.e3', body: 'sla.e3b' },
  { icon: Truck, cls: 'bg-dz-yellow-soft text-[#b45309]', title: 'sla.e4', body: 'sla.e4b' },
];

function Section({ icon: Icon, title, children }: { icon: typeof Timer; title: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-2 flex items-center gap-2 text-lg leading-none">
        <Icon className="h-5 w-5 text-dz-red" aria-hidden /> {title}
      </h3>
      {children}
    </section>
  );
}

export function SlaGuide({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal title={t('sla.title')} onClose={onClose} wide>
      <div data-sla-guide>
        <Section icon={Timer} title={t('sla.timeH')}>
          <ol className="divide-y divide-line rounded-xl ring-1 ring-line">
            {TIMES.map(([h, b]) => (
              <li key={h} className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[130px_1fr] sm:gap-3">
                <b className="text-ink">{t(h)}</b>
                <span className="text-ink-2">{t(b)}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={CheckCircle2} title={t('sla.endH')}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ENDS.map((e) => (
              <li key={e.title} className="flex gap-3 rounded-xl bg-white p-3 text-sm ring-1 ring-line">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${e.cls}`}>
                  <e.icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span>
                  <b className="block text-ink">{t(e.title)}</b>
                  <span className="text-ink-2">{t(e.body)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={PackageCheck} title={t('sla.retH')}>
          <p className="text-sm text-ink-2">{t('sla.retB')}</p>
        </Section>

        <Section icon={Lightbulb} title={t('sla.tipH')}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2 marker:text-dz-red">
            <li>{t('sla.tip1')}</li>
            <li>{t('sla.tip2')}</li>
            <li>{t('sla.tip3')}</li>
          </ul>
        </Section>
      </div>
    </Modal>
  );
}
