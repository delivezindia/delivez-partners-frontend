import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Ban, CheckCircle2, CreditCard, Clock, CloudRain, FileText, HeartHandshake, LifeBuoy, PackageCheck, Pill, ReceiptText, RefreshCw, Store, Truck, XCircle } from 'lucide-react';
import { SiteFooter, SiteNavbar } from '../components/site';
import { useI18n } from '../lib/i18n';
import { rupees } from '../lib/format';
import { useOverview } from '../lib/queries';

/**
 * The policy text is legal wording (English). It must say what the app does — the rules live in
 * apps/core-api/src/modules/orders/sla.ts and returns-rules.ts. Update LAST_UPDATED with any change.
 */
const LAST_UPDATED = '27 October 2026';
/** Placeholder until the customer-care address is confirmed. */
const SUPPORT_EMAIL = 'support@delivez.com';

function Block({ id, icon: Icon, title, tone = 'neutral', children }: { id: string; icon: typeof Ban; title: string; tone?: 'neutral' | 'good' | 'warn' | 'bad'; children: ReactNode }) {
  const toneCls = { neutral: 'bg-dz-yellow text-black', good: 'bg-dz-green-soft text-dz-green', warn: 'bg-dz-yellow-soft text-[#b45309]', bad: 'bg-dz-red-soft text-dz-red' }[tone];
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneCls}`}>
          <Icon className="h-[22px] w-[22px]" aria-hidden />
        </span>
        <h2 className="text-[clamp(24px,3vw,30px)] leading-none">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-neutral-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-dz-red">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <>
      {/* Phones: one card per row, each value labelled. */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r, i) => (
          <li key={i} className="rounded-xl bg-soft p-3 text-sm">
            <p className="font-semibold text-ink">{r[0]}</p>
            {r.slice(1).map((c, j) => (
              <p key={j} className="mt-1.5">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-ink-3">{head[j + 1]}</span>
                {c}
              </p>
            ))}
          </li>
        ))}
      </ul>
      <div className="hidden rounded-xl ring-1 ring-line sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft text-xs uppercase tracking-wider text-ink-3">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-extrabold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                {r.map((c, j) => (
                  <td key={j} className={`px-3 py-2.5 ${j === 0 ? 'font-semibold text-ink' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const STAGES = [
  {
    n: 1,
    title: 'Before the shop accepts',
    tone: 'border-dz-green',
    icon: CheckCircle2,
    iconCls: 'text-dz-green',
    points: ['Cancel yourself from the order screen', 'Free — full refund'],
  },
  {
    n: 2,
    title: 'Shop accepted, rider not yet left',
    tone: 'border-state-preparing',
    icon: Clock,
    iconCls: 'text-[#b45309]',
    points: ['Can’t be cancelled in the app — contact support', 'Food: not refunded, as it is already being cooked', 'Groceries, medicines & other shops: refunded in full'],
  },
  {
    n: 3,
    title: 'Rider has picked it up',
    tone: 'border-dz-red',
    icon: XCircle,
    iconCls: 'text-dz-red',
    points: ['Cancellation is not possible', 'If the delivery fails, see “When a delivery fails” below'],
  },
];

const TOC = [
  ['scope', 'What this covers'],
  ['cancel', 'Cancelling your order'],
  ['ours', 'When the shop or Delivez cancels'],
  ['failed', 'When a delivery fails'],
  ['doorstep', 'Problems with what arrived'],
  ['charges', 'What you pay for — no extra fees'],
  ['medicines', 'Medicines & prescriptions'],
  ['force', 'Weather & emergencies'],
  ['payment', 'Payment & refund timeline'],
  ['request', 'How to ask for a refund'],
  ['updates', 'Policy updates'],
  ['help', 'Need help?'],
] as const;

// Refund & Cancellation Policy — home delivery from restaurants, grocery, pharmacy and local shops.
export default function Policy() {
  const { t, lang } = useI18n();
  const overview = useOverview().data;
  const fee = rupees(overview?.deliveryFee ?? 3000);
  const doorMin = overview?.doorCheckMinutes ?? 5;
  useEffect(() => {
    document.title = 'Refund & Cancellation Policy · Delivez';
    window.scrollTo({ top: 0 });
  }, []);

  const full = <b className="text-dz-green">Full refund</b>;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNavbar />
      <main className="flex-1">
        <section className="border-b border-line bg-gradient-to-br from-dz-yellow-soft via-dz-yellow-soft/50 to-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <p className="dz-badge">Home delivery · Food, groceries, medicines &amp; local shops</p>
            <h1 className="mt-4 text-[clamp(36px,5vw,56px)]">Refund &amp; Cancellation Policy</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-2">When you can cancel, when you get your money back, and what happens if something goes wrong with your order.</p>
            <p className="mt-3 text-sm text-ink-3">Last updated: {LAST_UPDATED}</p>
            {lang !== 'EN' && <p className="mt-3 inline-block rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-line">{t('lc.policy.englishOnly')}</p>}
          </div>
        </section>

        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-ink-3">On this page</p>
              <ul className="space-y-1 text-sm">
                {TOC.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block rounded-lg px-2 py-1.5 font-semibold text-ink-2 hover:bg-soft hover:text-dz-red">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="min-w-0 space-y-5">
            <Block id="scope" icon={FileText} title="What This Covers">
              <p>
                This policy applies to orders placed on the Delivez app or website for <b>home delivery</b> from restaurants, grocery stores, pharmacies and local shops. Orders are paid online; there
                is no cash on delivery and no pickup from the shop. Lab test bookings have their own terms, shown when you book.
              </p>
              <p>
                The one rule behind everything below: <b>if it wasn’t your fault, you don’t pay.</b> If something you did stopped the order after the shop started on it, you may pay for what was
                already made or the delivery trip.
              </p>
            </Block>

            <Block id="cancel" icon={Ban} title="Cancelling Your Order">
              <ol className="grid gap-3 md:grid-cols-3">
                {STAGES.map((s) => (
                  <li key={s.n} className={`rounded-xl border-t-4 bg-soft p-4 ${s.tone}`}>
                    <p className="flex items-center gap-2 font-bold text-ink">
                      <s.icon className={`h-5 w-5 shrink-0 ${s.iconCls}`} aria-hidden /> {s.n}. {s.title}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {s.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <p className="text-sm">Shops have 3 minutes to accept a new order. The order screen shows a “Cancel order” button for as long as cancelling is free.</p>
            </Block>

            <Block id="ours" icon={Store} title="When the Shop or Delivez Cancels" tone="good">
              <p>You get a full refund whenever the order ends for a reason that isn’t yours:</p>
              <Table
                head={['Reason', 'What you get']}
                rows={[
                  ['The shop declines the order (items ran out, too busy, closing, kitchen problem)', full],
                  ['The shop doesn’t accept within 3 minutes', full],
                  ['The shop can’t complete the order after accepting', full],
                  ['No rider is available', full],
                  ['A Delivez technical or operations problem', full],
                  ['The rider has an accident or problem on the way', full],
                  ['The order is damaged on the way', full],
                  ['You were charged twice for the same order', <>The duplicate order is cancelled — {full}</>],
                ]}
              />
              <p className="text-sm">The app tells you why, in your language. If an item runs out after you order, the shop removes it and you are not charged for it.</p>
            </Block>

            <Block id="failed" icon={Truck} title="When a Delivery Fails" tone="warn">
              <p>Once the rider has your order, it can only end as delivered or as a failed delivery. What happens depends on why it failed:</p>
              <Table
                head={['Why it failed', 'Food (restaurants)', 'Groceries, medicines & other shops']}
                rows={[
                  [
                    'You weren’t reachable at the address, refused the order, or the address was wrong or incomplete',
                    'Not refunded — the food can’t be resold',
                    `Items go back to the shop. Refunded except the ${fee} delivery fee`,
                  ],
                  ['Rider problem, damage on the way, or a Delivez issue', full, full],
                  ['Weather, strike or emergency', full, full],
                ]}
              />
              <p className="text-sm">The rider waits at your door for up to 10 minutes and tries to reach you before a delivery is marked “not reachable”. There are no waiting charges.</p>
            </Block>

            <Block id="doorstep" icon={PackageCheck} title="Problems With What Arrived">
              <p className="font-semibold text-ink">Groceries and local shops — {doorMin}-minute doorstep check</p>
              <List
                items={[
                  `After handing over, the rider waits up to ${doorMin} minutes while you check the items`,
                  'Damaged, wrong, expired or poor-quality items go back with the rider; missing items are noted',
                  'You are refunded for those items to the way you paid',
                ]}
              />
              <p className="font-semibold text-ink">Food and medicines</p>
              <List
                items={[
                  'Cooked food and medicines can’t be taken back at the door, for hygiene and safety reasons',
                  'If an item is missing, wrong, or spilled or damaged in transit, contact support within 24 hours with a photo. If confirmed, you are refunded for those items',
                  'Taste or personal preference is not a reason for a refund',
                ]}
              />
            </Block>

            <Block id="charges" icon={ReceiptText} title="What You Pay For">
              <p>Your bill has only two parts:</p>
              <Table
                head={['Charge', 'What it is', 'When it’s refunded']}
                rows={[
                  ['Item total', 'The shop’s price for your items', 'Whenever the order is cancelled or fails through no fault of yours'],
                  ['Delivery fee', `Flat ${fee} per order`, 'Refunded unless a delivery failed because of you'],
                ]}
              />
              <div className="flex items-start gap-3 rounded-xl bg-dz-green-soft/60 p-4">
                <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-dz-green" aria-hidden />
                <div>
                  <p className="font-bold text-ink">No hidden charges</p>
                  <List items={['No platform fee', 'No packaging fee', 'No cancellation fee', 'No waiting charges']} />
                </div>
              </div>
              <p className="text-sm">You see the full bill on the cart screen before you pay.</p>
            </Block>

            <Block id="medicines" icon={Pill} title="Medicines & Prescriptions">
              <List
                items={[
                  'Orders with prescription medicines are checked by the pharmacist before the pharmacy accepts them',
                  'If the prescription isn’t reviewed within 15 minutes, the order is cancelled — full refund',
                  'If the pharmacist can’t accept the prescription (unclear, expired or not valid for the medicine), the order is cancelled — full refund',
                ]}
              />
            </Block>

            <Block id="force" icon={CloudRain} title="Weather & Emergencies">
              <p>Heavy rain, floods, strikes, protests, government restrictions or other events outside anyone’s control can delay or stop deliveries.</p>
              <List items={['Delays from these events are not refunded', <>If we have to cancel your order because of them, you get a full refund</>]} />
            </Block>

            <Block id="payment" icon={CreditCard} title="Payment & Refund Timeline" tone="good">
              <List items={['Orders are paid online when you place them — UPI, card or net banking', 'Cash on delivery is not available']} />
              <p className="font-semibold text-ink">Refunds</p>
              <List
                items={[
                  'Refunds go back to the original payment method (UPI, card or net banking)',
                  'They are started as soon as the order is cancelled and usually arrive within 5–10 business days, depending on your bank',
                  'Delivez does not use wallet credits — refunds are always real money',
                ]}
              />
            </Block>

            <Block id="request" icon={RefreshCw} title="How to Ask for a Refund">
              <p>Refunds for cancellations and failed deliveries are automatic — you don’t need to ask. For anything else:</p>
              <ol className="grid gap-2 sm:grid-cols-4">
                {[
                  <>
                    Open{' '}
                    <Link to="/orders" className="font-bold text-dz-red underline">
                      My orders
                    </Link>{' '}
                    and note the order number (e.g. DEL-1234)
                  </>,
                  'Contact support (details below) within 24 hours of delivery',
                  'Say what went wrong and add photos if it’s about the items',
                  'We check with the shop and rider and reply within 48 hours',
                ].map((s, i) => (
                  <li key={i} className="rounded-xl bg-soft p-3 text-sm">
                    <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-black font-extrabold text-dz-yellow">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Block>

            <Block id="updates" icon={HeartHandshake} title="Policy Updates">
              <p>We may update this policy from time to time. The version in force when you placed your order applies to that order.</p>
            </Block>

            <Block id="help" icon={LifeBuoy} title="Need Help?" tone="bad">
              <List
                items={[
                  'About an active order: use “Call shop” or “Call rider” on the order screen',
                  <>
                    Refunds and anything else: email{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-dz-red underline">
                      {SUPPORT_EMAIL}
                    </a>{' '}
                    with your order number
                  </>,
                ]}
              />
              <p>Support hours may vary by city.</p>
            </Block>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
