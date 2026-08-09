import type { VisitorRow } from "./VisitorChatSheet";

export type VisitorGroup = {
  key: string;
  latest: VisitorRow;
  visits: VisitorRow[];
  total: number;
  unread: number;
};

const LS_KEY = "oneqr.visitorSeen.v1";

function readSeen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function visitorKey(r: VisitorRow) {
  const phone = (r.visitor_phone || "").replace(/\D/g, "");
  if (phone) return `p:${phone.slice(-10)}`;
  const name = (r.visitor_name || "").trim().toLowerCase();
  if (name) return `n:${name}`;
  return `a:${(r.user_agent || "unknown").slice(0, 40)}`;
}

/** Marks a visitor thread as read (WhatsApp-style badge clears). */
export function markVisitorSeen(key: string) {
  if (typeof window === "undefined") return;
  const seen = readSeen();
  seen[key] = new Date().toISOString();
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(seen));
  } catch {
    /* storage full */
  }
}

/**
 * One row per phone number (fallback: name, then device) — repeat visits become
 * an unread counter instead of a duplicate row. Newest thread first.
 */
export function groupVisitors(rows: VisitorRow[]): VisitorGroup[] {
  const seen = readSeen();
  const map = new Map<string, VisitorRow[]>();
  for (const r of rows) {
    const k = visitorKey(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  const groups: VisitorGroup[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const since = seen[key] ? +new Date(seen[key]) : 0;
    groups.push({
      key,
      latest: sorted[0]!,
      visits: sorted,
      total: sorted.length,
      unread: since ? sorted.filter((r) => +new Date(r.created_at) > since).length : sorted.length,
    });
  }
  return groups.sort((a, b) => +new Date(b.latest.created_at) - +new Date(a.latest.created_at));
}
