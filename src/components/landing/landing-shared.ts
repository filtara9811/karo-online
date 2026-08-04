import {
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  Send,
  MessageCircle,
  Globe,
  Store,
  CreditCard,
  Phone,
  Tag,
  Link2,
  Share2,
  Download,
  type LucideIcon,
} from "lucide-react";

export type ExtraLink = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  category?: string;
  icon?: string | null;
  image?: string | null;
  price?: string | null;
};

export type LinkCategoryKey =
  | "social"
  | "payment"
  | "shop"
  | "website"
  | "contact"
  | "offers"
  | "other";

export const LINK_CATEGORIES: Array<{
  key: LinkCategoryKey;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "social", label: "social media", icon: Share2 },
  { key: "payment", label: "payment", icon: CreditCard },
  { key: "shop", label: "my shop", icon: Store },
  { key: "website", label: "website", icon: Globe },
  { key: "contact", label: "contact", icon: Phone },
  { key: "offers", label: "offers", icon: Tag },
  { key: "other", label: "more", icon: Link2 },
];

export const APP_CATEGORY = { key: "app", label: "get app", icon: Download };

/** Well known social platforms merchants can fill in one tap. */
export const SOCIAL_PRESETS: Array<{ id: string; label: string; hint: string }> = [
  { id: "social-instagram", label: "Instagram", hint: "https://instagram.com/yourshop" },
  { id: "social-facebook", label: "Facebook", hint: "https://facebook.com/yourshop" },
  { id: "social-youtube", label: "YouTube", hint: "https://youtube.com/@yourshop" },
  { id: "social-twitter", label: "X (Twitter)", hint: "https://x.com/yourshop" },
  { id: "social-whatsapp", label: "WhatsApp", hint: "https://wa.me/91XXXXXXXXXX" },
  { id: "social-telegram", label: "Telegram", hint: "https://t.me/yourshop" },
  { id: "social-linkedin", label: "LinkedIn", hint: "https://linkedin.com/company/yourshop" },
];

export function normalizeUrl(url: string): string {
  const v = (url ?? "").trim();
  if (!v) return "";
  if (/^(https?:|mailto:|tel:|upi:|whatsapp:)/i.test(v)) return v;
  return `https://${v}`;
}

/** Brand identity (icon + colour) resolved from the link url/label. */
export function brandOf(url: string, label?: string): { icon: LucideIcon; color: string; name: string } {
  const s = `${url} ${label ?? ""}`.toLowerCase();
  if (s.includes("instagram")) return { icon: Instagram, color: "#E1306C", name: "Instagram" };
  if (s.includes("facebook") || s.includes("fb.com")) return { icon: Facebook, color: "#1877F2", name: "Facebook" };
  if (s.includes("youtu")) return { icon: Youtube, color: "#FF0000", name: "YouTube" };
  if (s.includes("twitter") || /(^|\W)x\.com/.test(s) || s.includes("(twitter)")) return { icon: Twitter, color: "#0f172a", name: "X" };
  if (s.includes("linkedin")) return { icon: Linkedin, color: "#0A66C2", name: "LinkedIn" };
  if (s.includes("wa.me") || s.includes("whatsapp")) return { icon: MessageCircle, color: "#25D366", name: "WhatsApp" };
  if (s.includes("t.me") || s.includes("telegram")) return { icon: Send, color: "#229ED9", name: "Telegram" };
  if (s.startsWith("tel:") || s.includes("call")) return { icon: Phone, color: "#0f766e", name: "Call" };
  return { icon: Globe, color: "#475569", name: label || "Link" };
}

function clampHex(hex: string): string {
  const h = (hex || "").trim();
  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(h)) return h;
  return "#f59e0b";
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = clampHex(hex).slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Returns true when the given background needs light (white) text. */
export function needsLightText(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.62;
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
