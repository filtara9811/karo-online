// Shared orders store — vendor-grouped, multi-order per vendor, with live status pipeline.
// Used by customer (read-only status) and vendor (status updater) panels.
// Persisted in localStorage + simple pub-sub for cross-component sync.

import { useEffect, useState } from "react";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export const STATUS_STEPS: { key: OrderStatus; label: string; emoji: string }[] = [
  { key: "placed", label: "Order Placed", emoji: "📝" },
  { key: "accepted", label: "Accepted", emoji: "✅" },
  { key: "processing", label: "Processing", emoji: "🛠️" },
  { key: "packed", label: "Packed", emoji: "📦" },
  { key: "shipped", label: "Shipped", emoji: "🚚" },
  { key: "delivered", label: "Delivered", emoji: "🎉" },
];

export type OrderSource = "quick" | "service" | "shop" | "lead";

export type ApprovalKind = "time" | "quote" | "scope" | "reschedule";
export type ApprovalState = "pending" | "approved" | "declined" | "expired";
export type Approval = {
  id: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  amount?: number;
  proposedAt?: string; // for time/reschedule
  createdAt: string;
  expiresAt: string; // ISO
  state: ApprovalState;
  decidedAt?: string;
};

export type OrderItem = {
  id: string;
  vendorId: string;
  service: string;
  source: OrderSource;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
  lastMsg: string;
  lastAt: string;
  unread: number;
  pinned?: boolean;
  approvals?: Approval[];
  rated?: { stars: number; mood: "angry" | "neutral" | "happy" | "love"; at: string } | null;
  /** Real product/service image (catalog_items.image_url) when available. */
  productImage?: string | null;
  /** Short, human-friendly order code (last 6 chars of UUID). */
  shortCode?: string;
};

export type VendorGroup = {
  vendorId: string;
  vendorName: string;
  avatar: string;
  presence: "Online" | "Typing…" | "Last seen now" | "Offline";
  orders: OrderItem[];
  gmbPlaceId?: string | null;
};

const STORAGE_KEY = "ko_orders_v1";

const SEED: VendorGroup[] = [
  {
    vendorId: "v1",
    vendorName: "Aryan | Bansal",
    avatar: avatarAryan,
    presence: "Online",
    gmbPlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    orders: [
      {
        id: "KO-1042", vendorId: "v1", service: "AC Service", source: "service",
        status: "processing",
        history: [
          { status: "placed", at: "21 Mar · 10:55" },
          { status: "accepted", at: "21 Mar · 11:02" },
          { status: "processing", at: "21 Mar · 11:30" },
        ],
        lastMsg: "20 minute mein. Address confirm…", lastAt: "Just now", unread: 3, pinned: true,
        approvals: [
          {
            id: "ap-1", kind: "time", title: "Vendor proposed visit time",
            detail: "Aaj shaam 5:30 PM ko aapke ghar pahunchne ka time set kiya gaya hai.",
            proposedAt: "Today · 5:30 PM",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            state: "pending",
          },
        ],
      },
      {
        id: "KO-1056", vendorId: "v1", service: "Cooler Service", source: "service",
        status: "accepted",
        history: [
          { status: "placed", at: "22 Mar · 09:00" },
          { status: "accepted", at: "22 Mar · 09:15" },
        ],
        lastMsg: "Tomorrow morning theek hai?", lastAt: "5m", unread: 1,
      },
      {
        id: "KO-0998", vendorId: "v1", service: "Refrigerator Repair", source: "lead",
        status: "delivered",
        history: [
          { status: "placed", at: "10 Mar" },
          { status: "accepted", at: "10 Mar" },
          { status: "processing", at: "11 Mar" },
          { status: "delivered", at: "12 Mar" },
        ],
        lastMsg: "Thanks! Service complete.", lastAt: "10 Mar", unread: 0,
      },
    ],
  },
  {
    vendorId: "v2",
    vendorName: "Raj | Kumar",
    avatar: avatarRaj,
    presence: "Typing…",
    orders: [
      {
        id: "KO-1031", vendorId: "v2", service: "Furniture Repair", source: "quick",
        status: "placed",
        history: [{ status: "placed", at: "Today · 06:55" }],
        lastMsg: "Bhej raha hoon", lastAt: "2m", unread: 1,
      },
      {
        id: "KO-1071", vendorId: "v2", service: "Carpentry — Door Fix", source: "quick",
        status: "accepted",
        history: [
          { status: "placed", at: "Yesterday" },
          { status: "accepted", at: "Yesterday" },
        ],
        lastMsg: "Wood ka quote bhej diya", lastAt: "1h", unread: 0,
      },
    ],
  },
  {
    vendorId: "v3",
    vendorName: "Rani | Kumari",
    avatar: avatarRani,
    presence: "Online",
    orders: [
      {
        id: "KO-1018", vendorId: "v3", service: "Salon at Home", source: "service",
        status: "accepted",
        history: [
          { status: "placed", at: "Today · 07:00" },
          { status: "accepted", at: "Today · 07:02" },
        ],
        lastMsg: "Hi! Service ready hai", lastAt: "12m", unread: 0,
      },
    ],
  },
  {
    vendorId: "v4",
    vendorName: "Ashu | Qureshi",
    avatar: avatarUser,
    presence: "Last seen now",
    orders: [
      {
        id: "KO-1007", vendorId: "v4", service: "Plumbing", source: "lead",
        status: "shipped",
        history: [
          { status: "placed", at: "20 Mar" },
          { status: "accepted", at: "20 Mar" },
          { status: "processing", at: "21 Mar" },
          { status: "shipped", at: "22 Mar" },
        ],
        lastMsg: "Quote bhej diya hai", lastAt: "1h", unread: 0,
      },
    ],
  },
];

let state: VendorGroup[] = load();
const subs = new Set<() => void>();

function load(): VendorGroup[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VendorGroup[];
      // re-attach avatars (not stored in JSON if data-URLs would bloat)
      const seedMap = Object.fromEntries(SEED.map((v) => [v.vendorId, v.avatar]));
      return parsed.map((v) => ({ ...v, avatar: seedMap[v.vendorId] ?? v.avatar }));
    }
  } catch {}
  return SEED;
}

function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  subs.forEach((fn) => fn());
  // cross-tab sync
  try { window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY })); } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      subs.forEach((fn) => fn());
    }
  });
}

export function getOrdersState(): VendorGroup[] {
  return state;
}

export function getVendor(vendorId: string): VendorGroup | undefined {
  return state.find((v) => v.vendorId === vendorId);
}

export function getOrder(orderId: string): { vendor: VendorGroup; order: OrderItem } | null {
  for (const v of state) {
    const o = v.orders.find((x) => x.id === orderId);
    if (o) return { vendor: v, order: o };
  }
  return null;
}

export function advanceStatus(orderId: string, next: OrderStatus) {
  state = state.map((v) => ({
    ...v,
    orders: v.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: next,
            history: [...o.history, { status: next, at: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }) }],
          }
        : o
    ),
  }));
  persist();
}

export function cancelOrder(orderId: string) {
  advanceStatus(orderId, "cancelled");
}

export function clearUnread(orderId: string) {
  state = state.map((v) => ({
    ...v,
    orders: v.orders.map((o) => (o.id === orderId ? { ...o, unread: 0 } : o)),
  }));
  persist();
}

export function useOrdersStore(): VendorGroup[] {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, []);
  return state;
}

export const SOURCE_BADGE: Record<OrderSource, { label: string; cls: string }> = {
  quick: { label: "Quick", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  service: { label: "Service", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  shop: { label: "Dukan", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  lead: { label: "Lead", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  placed: { label: "Placed", cls: "bg-slate-100 text-slate-700" },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-700" },
  processing: { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
  packed: { label: "Packed", cls: "bg-violet-100 text-violet-700" },
  shipped: { label: "Shipped", cls: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

// ============ Approvals & Rating helpers ============

export function addApproval(orderId: string, a: Omit<Approval, "id" | "createdAt" | "state">) {
  const ap: Approval = {
    ...a,
    id: `ap-${Date.now()}`,
    createdAt: new Date().toISOString(),
    state: "pending",
  };
  state = state.map((v) => ({
    ...v,
    orders: v.orders.map((o) =>
      o.id === orderId ? { ...o, approvals: [...(o.approvals ?? []), ap] } : o
    ),
  }));
  persist();
}

export function decideApproval(orderId: string, approvalId: string, decision: "approved" | "declined") {
  state = state.map((v) => ({
    ...v,
    orders: v.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            approvals: (o.approvals ?? []).map((ap) =>
              ap.id === approvalId ? { ...ap, state: decision, decidedAt: new Date().toISOString() } : ap
            ),
          }
        : o
    ),
  }));
  persist();
}

export function setOrderRating(orderId: string, mood: "angry" | "neutral" | "happy" | "love", stars: number) {
  state = state.map((v) => ({
    ...v,
    orders: v.orders.map((o) =>
      o.id === orderId ? { ...o, rated: { mood, stars, at: new Date().toISOString() } } : o
    ),
  }));
  persist();
}

export function setVendorPlaceId(vendorId: string, placeId: string | null) {
  state = state.map((v) => (v.vendorId === vendorId ? { ...v, gmbPlaceId: placeId } : v));
  persist();
}

export function gmbReviewUrl(placeId?: string | null): string | null {
  if (!placeId) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export const APPROVAL_LABELS: Record<ApprovalKind, { label: string; emoji: string }> = {
  time: { label: "Time Confirmation", emoji: "⏰" },
  quote: { label: "Quote / Bill", emoji: "💰" },
  scope: { label: "Scope Change", emoji: "📋" },
  reschedule: { label: "Reschedule", emoji: "📅" },
};

