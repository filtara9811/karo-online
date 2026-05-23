import { useCallback, useEffect, useState } from "react";

/**
 * Global "active inquiry" state for the customer-side vendor finder flow.
 * Persisted in localStorage + broadcast via window events so the floating
 * widget (mounted in AppShell) stays in sync with the VendorListSheet on /quick.
 */
export type ApprovedVendorLite = {
  vendor_id: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  quoted_price?: number | null;
};

export type ActiveInquiry = {
  leadId: string;
  category: string;
  productImage: string | null;
  startedAt: number;
  vendorCount: number;
  approved: ApprovedVendorLite | null;
  /** true → sheet currently visible. false → minimized to floating widget. */
  open: boolean;
};

const KEY = "ko-active-inquiry-v1";
const EVENT = "ko-active-inquiry-change";

function read(): ActiveInquiry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveInquiry) : null;
  } catch {
    return null;
  }
}

function write(v: ActiveInquiry | null) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(KEY, JSON.stringify(v));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function setActiveInquiry(v: ActiveInquiry | null) { write(v); }
export function getActiveInquiry() { return read(); }
export function patchActiveInquiry(p: Partial<ActiveInquiry>) {
  const cur = read();
  if (!cur) return;
  write({ ...cur, ...p });
}

export function useActiveInquiry() {
  const [v, setV] = useState<ActiveInquiry | null>(() => read());

  useEffect(() => {
    const sync = () => setV(read());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) sync(); };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback((next: ActiveInquiry | null) => write(next), []);
  const patch = useCallback((p: Partial<ActiveInquiry>) => patchActiveInquiry(p), []);
  const clear = useCallback(() => write(null), []);

  return { inquiry: v, set, patch, clear };
}
