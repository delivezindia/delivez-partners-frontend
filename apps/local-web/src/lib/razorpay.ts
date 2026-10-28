import { api } from './api';
import type { CustomerOrder } from './orders';

/** What the API returns to open Razorpay Checkout for an unpaid order. */
export interface CheckoutParams {
  gateway: 'RAZORPAY';
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; contact?: string; email?: string; method?: string };
  payBy: string;
  testMode: boolean;
}
interface Success {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void; on(e: string, cb: (r: unknown) => void): void };

let loading: Promise<RazorpayCtor> | null = null;
function loadCheckout() {
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(w.Razorpay);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay did not load')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Couldn’t load the payment page — check your internet and try again'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Opens Razorpay Checkout and, on success, has the API verify the payment.
 * Resolves with the updated order, or null if the customer closed the window without paying.
 */
export async function payWithRazorpay(orderId: string, p: CheckoutParams, onVerifying?: () => void): Promise<CustomerOrder | null> {
  const Razorpay = await loadCheckout();
  const result = await new Promise<Success | null>((resolve) => {
    const rzp = new Razorpay({
      key: p.keyId,
      order_id: p.orderId,
      amount: p.amount,
      currency: p.currency,
      name: p.name,
      description: p.description,
      prefill: { name: p.prefill.name, contact: p.prefill.contact, email: p.prefill.email, method: p.prefill.method },
      theme: { color: '#E8130F' },
      retry: { enabled: true },
      handler: (r: Success) => resolve(r),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    });
    rzp.open();
  });
  if (!result) return null;
  onVerifying?.();
  return api<CustomerOrder>(`/local/orders/${orderId}/payment/verify`, { method: 'POST', body: result });
}
