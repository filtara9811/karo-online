// Shared client-side Cashfree SDK loader / checkout opener.
declare global {
  interface Window {
    Cashfree?: any;
  }
}

let cashfreeSdkPromise: Promise<void> | null = null;

export function loadCashfreeSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();
  if (cashfreeSdkPromise) return cashfreeSdkPromise;
  cashfreeSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      cashfreeSdkPromise = null;
      reject(new Error("Cashfree SDK load failed — internet check karein"));
    };
    document.head.appendChild(s);
  });
  return cashfreeSdkPromise;
}

export async function openCashfreeCheckout(
  paymentSessionId: string,
  mode: "sandbox" | "production",
) {
  await loadCashfreeSdk();
  if (!window.Cashfree) throw new Error("Cashfree SDK not available");
  const cf = window.Cashfree({ mode });
  return cf.checkout({ paymentSessionId, redirectTarget: "_modal" });
}

export function getPaymentError(e: unknown): string {
  if (e instanceof Response) {
    if (e.status === 401)
      return "Login required — pehle sign in / registration complete karein.";
    return `Payment service error (${e.status})`;
  }
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e.trim()) return e;
  try {
    const s = JSON.stringify(e);
    if (s && s !== "{}") return s;
  } catch {}
  return "Payment start nahi ho paya — please dobara try karein.";
}
