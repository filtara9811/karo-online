/**
 * Traffic-source tagging for shop / QR landing links.
 *
 * A shared link carries `?src=instagram` (or utm_source) so the merchant
 * dashboard can show a real source icon instead of guessing.
 */

export type TrafficMedium =
  | "instagram"
  | "youtube"
  | "facebook"
  | "whatsapp"
  | "telegram"
  | "x"
  | "google"
  | "link"
  | "qr"
  | "card";

const ALLOWED: TrafficMedium[] = [
  "instagram", "youtube", "facebook", "whatsapp", "telegram", "x", "google", "link", "qr", "card",
];

const ALIASES: Record<string, TrafficMedium> = {
  ig: "instagram",
  insta: "instagram",
  instagram: "instagram",
  yt: "youtube",
  youtube: "youtube",
  "youtu.be": "youtube",
  fb: "facebook",
  facebook: "facebook",
  wa: "whatsapp",
  whatsapp: "whatsapp",
  tg: "telegram",
  telegram: "telegram",
  x: "x",
  twitter: "x",
  google: "google",
  qr: "qr",
  card: "card",
  link: "link",
};

function fromHost(host: string): TrafficMedium | null {
  const h = host.toLowerCase();
  if (h.includes("instagram")) return "instagram";
  if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
  if (h.includes("facebook") || h.includes("fb.")) return "facebook";
  if (h.includes("whatsapp") || h.includes("wa.me")) return "whatsapp";
  if (h.includes("t.me") || h.includes("telegram")) return "telegram";
  if (h.includes("twitter") || h === "x.com" || h.endsWith(".x.com")) return "x";
  if (h.includes("google")) return "google";
  return null;
}

/** Reads the medium from the current URL (?src / utm_source) or the referrer. */
export function detectMedium(): TrafficMedium | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = (q.get("src") || q.get("utm_source") || "").trim().toLowerCase();
    const mapped = ALIASES[raw];
    if (mapped) return mapped;
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      const byHost = fromHost(host);
      if (byHost && host !== window.location.hostname) return byHost;
    }
  } catch {
    /* malformed URL */
  }
  return undefined;
}

/** Appends a source tag to a shop link before sharing it on a platform. */
export function taggedUrl(url: string, medium: TrafficMedium) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}src=${medium}`;
}

export function normalizeMedium(value?: string | null): TrafficMedium | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  const mapped = ALIASES[raw];
  return mapped && ALLOWED.includes(mapped) ? mapped : null;
}

/** Best-known source for a visit row: tagged medium wins, else the raw source. */
export function visitMedium(row: { medium?: string | null; source?: string | null }): TrafficMedium {
  return normalizeMedium(row.medium) ?? normalizeMedium(row.source) ?? "qr";
}

export const MEDIUM_LABEL: Record<TrafficMedium, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  x: "X",
  google: "Google",
  link: "Direct link",
  qr: "QR scan",
  card: "Visiting card",
};
