/**
 * Device-local shopper identity for merchant landing pages.
 * The token is a private key that lets the shopper read their own shop chats
 * without signing in; the name/phone are the details captured at scan time.
 */

const TOKEN_KEY = "ko-shop-visitor-token";
const PROFILE_KEY = "ko-shop-visitor-profile";

export type VisitorProfile = { name: string; phone: string };

function randomToken(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
  } catch { /* ignore */ }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-device token (created on first use). */
export function getVisitorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = randomToken();
    window.localStorage.setItem(TOKEN_KEY, next);
    return next;
  } catch {
    return "";
  }
}

export function getVisitorProfile(): VisitorProfile {
  if (typeof window === "undefined") return { name: "", phone: "" };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<VisitorProfile>;
      return { name: p.name ?? "", phone: p.phone ?? "" };
    }
  } catch { /* ignore */ }
  return { name: "", phone: "" };
}

export function setVisitorProfile(profile: VisitorProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({
      name: profile.name.trim(),
      phone: profile.phone.replace(/\D/g, "").slice(-10),
    }));
  } catch { /* ignore */ }
}
