import type { ReactNode } from 'react';
import { FAIL_REASONS, OPS_CANCEL } from '../lib/orders';
import { Modal } from './ui';

// The order SLA for ops (rules: apps/core-api/src/modules/orders/sla.ts). Reason lists are the same ones the dialogs use.
const TIMERS: [string, string, string][] = [
  ['Shop accepts a new order', '3 min', 'Auto-rejected (ACCEPT_TIMEOUT) · shop’s fault · customer refunded'],
  ['Pharmacist reviews a prescription', '15 min', 'Auto-cancelled (RX_TIMEOUT) · shop’s fault · customer refunded'],
  ['Cooking / packing', 'promised time + 10 min', 'Shop gets a “running late” alert'],
  ['', 'promised time + 30 min', 'You get PREP_STUCK — call the shop; cancel with a reason if it can’t finish'],
  ['Rider for a ready order', '10 min', 'You get NO_RIDER — assign a rider, or cancel “No rider available”'],
  ['Rider waiting at the door', '10 min', 'You get DOOR_WAIT — call the customer, then deliver or mark Delivery failed'],
];

const FAULTS: [string, string, string, string][] = [
  ['Shop', 'Full refund', 'Nothing — counts on store health', 'Stock freed'],
  ['Delivez / rider / no one', 'Full refund', 'Paid for cooked food (items) if cooking had started', 'Stock freed · after pickup: goods ride back, food written off'],
  ['Customer, before accept', 'Full refund', '—', 'Stock freed'],
  [
    'Customer, after accept',
    'Food: no refund · other shops: full refund (before pickup) or all but ₹30 delivery (after pickup)',
    'Paid for cooked food',
    'Groceries / medicines ride back to the shop',
  ],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="mb-2 text-lg leading-none">{title}</h3>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-soft text-xs uppercase tracking-wide text-ink-3">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-semibold' : 'text-ink-2'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SlaGuide({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Order SLA — how to handle orders" onClose={onClose} wide>
      <div data-sla-guide>
        <p className="text-sm text-ink-2">
          Every order that ends early gets a <b>reason</b>. The reason decides whose fault it is, what the customer gets back, what the shop is paid and what happens to the goods — you only pick the
          reason. Each alert fires once per order.
        </p>

        <Section title="Time limits">
          <Table head={['Stage', 'Limit', 'What happens']} rows={TIMERS} />
        </Section>

        <Section title="Who pays, by fault">
          <Table head={['Fault', 'Customer', 'Shop', 'Goods']} rows={FAULTS} />
          <p className="mt-2 text-xs text-ink-3">App orders are paid online (no cash on delivery), with no platform fee and no packaging fee. A shop’s own counter / phone orders can still be cash.</p>
        </Section>

        <Section title="Cancel order — before the rider picks it up">
          <Table head={['Reason', 'Result']} rows={OPS_CANCEL.map((r) => [r.label, r.outcome])} />
          <p className="mt-2 text-xs text-ink-3">Customers can cancel themselves only before the shop accepts. After that they contact support and you cancel with “Customer asked to cancel”.</p>
        </Section>

        <Section title="Delivery failed — after pickup (no cancel)">
          <Table head={['Reason', 'Result']} rows={FAIL_REASONS.map((r) => [r.label, r.outcome])} />
        </Section>

        <Section title="Good practice">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>Pick the reason that is actually true — it decides refunds, shop pay-outs and store health.</li>
            <li>If the shop can still make it, call them before cancelling; a stuck order is better delayed than cancelled.</li>
            <li>Before “Customer not reachable”, the rider waits 10 minutes at the door and you try to call the customer.</li>
            <li>Groceries / local shops: the rider waits 5 minutes at the door for the customer’s check; returned items go back to the shop.</li>
          </ul>
        </Section>
      </div>
    </Modal>
  );
}
