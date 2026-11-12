import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CreditCard, FlaskConical, Landmark, Smartphone, Wallet, X, type LucideIcon } from 'lucide-react';
import { rupees } from './format';

/** What the API sends for a dummy payment (PAYMENT_GATEWAY=dummy on the server). */
export interface DummyParams {
  orderId: string;
  amount: number;
  description: string;
  prefill: { method?: string };
  dummy: { paymentId: string; signature: string };
}
export interface DummySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const METHODS: { k: string; label: string; icon: LucideIcon }[] = [
  { k: 'upi', label: 'UPI', icon: Smartphone },
  { k: 'card', label: 'Card', icon: CreditCard },
  { k: 'netbanking', label: 'Netbanking', icon: Landmark },
  { k: 'wallet', label: 'Wallet', icon: Wallet },
];

/**
 * The test payment screen, shown instead of Razorpay Checkout when the server runs dummy payments. No money moves:
 * "Pay" sends back the server-signed payment, "Make it fail" behaves like a payment that didn't go through.
 * Resolves like Razorpay Checkout: the signed result, or null.
 */
export function openDummyCheckout(p: DummyParams): Promise<DummySuccess | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (r: DummySuccess | null) => {
      root.unmount();
      host.remove();
      resolve(r);
    };
    root.render(<DummySheet p={p} onDone={done} />);
  });
}

function DummySheet({ p, onDone }: { p: DummyParams; onDone: (r: DummySuccess | null) => void }) {
  const [method, setMethod] = useState(METHODS.some((m) => m.k === p.prefill.method) ? p.prefill.method! : 'upi');
  const [busy, setBusy] = useState(false);
  const payRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    payRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onDone(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [busy, onDone]);
  const pay = () => {
    setBusy(true);
    // A short pause, like a real gateway, so the app's "checking payment" state is seen too.
    setTimeout(() => onDone({ razorpay_order_id: p.orderId, razorpay_payment_id: `${p.dummy.paymentId}_${method}`, razorpay_signature: p.dummy.signature }), 900);
  };
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-end bg-black/60 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="dummy-pay-title" data-dummy-checkout>
      <div className="w-full max-w-[420px] rounded-t-[24px] bg-white p-5 text-black shadow-2xl sm:rounded-[24px]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-dz-yellow px-2.5 py-1 text-[11px] font-black uppercase tracking-wide">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Test payment
            </p>
            <h2 id="dummy-pay-title" className="mt-2 font-display text-[34px] leading-none">
              {rupees(p.amount)}
            </h2>
            <p className="mt-1 text-sm text-ink-2">{p.description}</p>
          </div>
          <button type="button" onClick={() => onDone(null)} disabled={busy} className="grid h-9 w-9 place-items-center rounded-full bg-soft" aria-label="Close without paying">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-4 rounded-xl bg-soft px-3 py-2.5 text-[13px] font-semibold">Delivez is in test mode. No real money is charged, and refunds go through at once.</p>
        <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pay with">
          {METHODS.map((m) => (
            <button
              key={m.k}
              type="button"
              role="radio"
              aria-checked={method === m.k}
              onClick={() => setMethod(m.k)}
              className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-3 text-sm font-extrabold transition ${method === m.k ? 'border-black bg-black text-dz-yellow' : 'border-line hover:border-black'}`}
            >
              <m.icon className="h-4 w-4" aria-hidden /> {m.label}
            </button>
          ))}
        </div>
        <button ref={payRef} type="button" onClick={pay} disabled={busy} className="w-full rounded-xl bg-dz-red py-3.5 text-base font-black text-white disabled:opacity-60" data-dummy-pay>
          {busy ? 'Paying…' : `Pay ${rupees(p.amount)}`}
        </button>
        <button type="button" onClick={() => onDone(null)} disabled={busy} className="mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-ink-2 underline" data-dummy-fail>
          Make it fail
        </button>
      </div>
    </div>
  );
}
