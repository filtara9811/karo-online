import { useCallback, useEffect, useState } from "react";

/**
 * Global "active inquiries" store for the customer-side vendor finder flow.
 * Supports MULTIPLE concurrent inquiries (e.g. AC + Legal + Other) — at most
 * one is `open` (sheet expanded) at a time; others stay minimized in the
 * floating widget which shows a count and a picker.
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
  /** true → this inquiry's sheet is currently visible. Only one at a time. */
  open: boolean;
};

const KEY = "ko-active-inquiries-v2";
const OLD_KEY = "ko-active-inquiry-v1";
const EVENT = "ko-active-inquiry-change";

function migrate(): ActiveInquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const v2 = window.localStorage.getItem(KEY);
    if (v2) return JSON.parse(v2) as ActiveInquiry[];
    const v1 = window.localStorage.getItem(OLD_KEY);
    if (v1) {
      const single = JSON.parse(v1) as ActiveInquiry;
      window.localStorage.removeItem(OLD_KEY);
      const list = [single];
      window.localStorage.setItem(KEY, JSON.stringify(list));
      return list;
    }
  } catch {}
  return [];
}

function read(): ActiveInquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ActiveInquiry[];
  } catch {}
  return migrate();
}

function write(list: ActiveInquiry[]) {
  if (typeof window === "undefined") return;
  if (list.length) window.localStorage.setItem(KEY, JSON.stringify(list));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Upsert by leadId. If `open` is true, close all other inquiries first. */
export function setActiveInquiry(v: ActiveInquiry | null) {
  if (!v) return;
  const list = read();
  const idx = list.findIndex((i) => i.leadId === v.leadId);
  let next = idx >= 0 ? list.map((i, k) => (k === idx ? v : i)) : [...list, v];
  if (v.open) next = next.map((i) => (i.leadId === v.leadId ? i : { ...i, open: false }));
  write(next);
}

export function clearActiveInquiry(leadId: string) {
  write(read().filter((i) => i.leadId !== leadId));
}

export function clearAllInquiries() {
  write([]);
}

export function minimizeAll() {
  write(read().map((i) => ({ ...i, open: false })));
}

export function openInquiry(leadId: string) {
  write(read().map((i) => ({ ...i, open: i.leadId === leadId })));
}

export function useActiveInquiries() {
  const [list, setList] = useState<ActiveInquiry[]>(() => read());
  useEffect(() => {
    const sync = () => setList(read());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === OLD_KEY) sync(); };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const openInq = list.find((i) => i.open) ?? null;
  return {
    inquiries: list,
    open: openInq,
    set: useCallback((v: ActiveInquiry | null) => setActiveInquiry(v), []),
    remove: useCallback((leadId: string) => clearActiveInquiry(leadId), []),
    minimizeAll: useCallback(() => minimizeAll(), []),
    openOne: useCallback((leadId: string) => openInquiry(leadId), []),
    clearAll: useCallback(() => clearAllInquiries(), []),
  };
}

/** Backwards-compatible single-inquiry hook used by existing components.
 *  Returns the currently-open inquiry, or the most recent one if none open. */
export function useActiveInquiry() {
  const all = useActiveInquiries();
  const inquiry = all.open ?? all.inquiries[all.inquiries.length - 1] ?? null;
  return {
    inquiry,
    set: useCallback((v: ActiveInquiry | null) => {
      if (v) setActiveInquiry(v);
      else if (inquiry) clearActiveInquiry(inquiry.leadId);
    }, [inquiry?.leadId]),
    patch: useCallback((p: Partial<ActiveInquiry>) => {
      if (!inquiry) return;
      setActiveInquiry({ ...inquiry, ...p });
    }, [inquiry]),
    clear: useCallback(() => {
      if (inquiry) clearActiveInquiry(inquiry.leadId);
    }, [inquiry?.leadId]),
  };
}

export function getActiveInquiry(): ActiveInquiry | null {
  const list = read();
  return list.find((i) => i.open) ?? list[list.length - 1] ?? null;
}
