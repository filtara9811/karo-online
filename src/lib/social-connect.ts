/** Helpers that turn a username / phone number into a real profile URL. */

export type ConnectMode = "manual" | "username";

export type SocialPlatform = {
  id: string;
  label: string;
  mode: ConnectMode | "phone";
  prefix?: string;
  hint: string;
  color: string;
};

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  "social-instagram": { id: "social-instagram", label: "Instagram", mode: "username", prefix: "https://instagram.com/", hint: "yourshop", color: "#E1306C" },
  "social-facebook": { id: "social-facebook", label: "Facebook", mode: "username", prefix: "https://facebook.com/", hint: "yourshop", color: "#1877F2" },
  "social-youtube": { id: "social-youtube", label: "YouTube", mode: "username", prefix: "https://youtube.com/@", hint: "yourshop", color: "#FF0000" },
  "social-twitter": { id: "social-twitter", label: "X (Twitter)", mode: "username", prefix: "https://x.com/", hint: "yourshop", color: "#0f172a" },
  "social-whatsapp": { id: "social-whatsapp", label: "WhatsApp", mode: "phone", hint: "9876543210", color: "#25D366" },
  "social-telegram": { id: "social-telegram", label: "Telegram", mode: "username", prefix: "https://t.me/", hint: "yourshop", color: "#229ED9" },
  "social-linkedin": { id: "social-linkedin", label: "LinkedIn", mode: "username", prefix: "https://linkedin.com/company/", hint: "yourshop", color: "#0A66C2" },
};

/** Build a full URL from a handle / phone typed by the merchant. */
export function buildSocialUrl(platformId: string, value: string): string {
  const p = SOCIAL_PLATFORMS[platformId];
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!p) return `https://${raw.replace(/^\/+/, "")}`;
  if (p.mode === "phone") {
    const digits = raw.replace(/\D/g, "").slice(-10);
    return digits.length === 10 ? `https://wa.me/91${digits}` : "";
  }
  const handle = raw.replace(/^@+/, "").replace(/^\/+/, "");
  return `${p.prefix}${handle}`;
}

/** Pull the handle back out of a stored URL so the input stays editable. */
export function handleFromUrl(platformId: string, url: string): string {
  const p = SOCIAL_PLATFORMS[platformId];
  const raw = (url ?? "").trim();
  if (!raw || !p) return raw;
  if (p.mode === "phone") return raw.replace(/\D/g, "").slice(-10);
  if (p.prefix && raw.toLowerCase().startsWith(p.prefix.toLowerCase())) return raw.slice(p.prefix.length);
  return raw;
}

export function isValidSocialUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}
