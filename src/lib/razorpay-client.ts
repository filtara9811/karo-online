// Razorpay Checkout client loader + helper.
// Server functions are in @/lib/payments.functions.ts

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (resp: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

let loaderPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loaderPromise = null; reject(new Error("Razorpay script failed to load")); };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export async function openRazorpayCheckout(opts: {
  key_id: string;
  order_id: string;
  amount: number; // paise
  currency?: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpayResponse> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Razorpay not available");
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay!({
      key: opts.key_id,
      amount: opts.amount,
      currency: opts.currency ?? "INR",
      order_id: opts.order_id,
      name: opts.name ?? "Karo Online",
      description: opts.description ?? "Wallet recharge",
      prefill: opts.prefill,
      theme: { color: "#d4af37" },
      handler: (resp) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rz.open();
  });
}
