/**
 * Shared Hindi Text-to-Speech utility (Web Speech API).
 * Used for foreground notification voice alerts. Background SW falls back to
 * the device's default notification sound (TTS is unreliable in service workers).
 */
let __voicesPrimed = false;

export function primeVoices() {
  if (__voicesPrimed || typeof window === "undefined" || !window.speechSynthesis) return;
  __voicesPrimed = true;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* noop */
  }
}

export function speakHindi(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    primeVoices();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    u.rate = 0.95;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const hi = voices.find((v) => v.lang?.toLowerCase().startsWith("hi"));
    if (hi) u.voice = hi;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/** Map notification kinds → Hindi TTS phrase. */
const KIND_PHRASES: Record<string, string> = {
  lead_alert: "Aapko ek nayi lead receive hui hai.",
  new_lead: "Aapko ek nayi lead receive hui hai.",
  new_message: "Aapko naya message aaya hai.",
  message: "Aapko naya message aaya hai.",
  chat: "Aapko naya message aaya hai.",
  new_inquiry: "Nayi inquiry aayi hai.",
  inquiry: "Nayi inquiry aayi hai.",
};

export function speakForKind(kind: string | undefined | null) {
  if (!kind) return;
  const phrase = KIND_PHRASES[kind.toLowerCase()];
  if (phrase) speakHindi(phrase);
}

// ── App icon badge (Badging API) ───────────────────────────────────────
type BadgeNav = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function setAppBadge(count: number) {
  if (typeof navigator === "undefined") return;
  const n = navigator as BadgeNav;
  try {
    if (count > 0 && n.setAppBadge) {
      void n.setAppBadge(count);
    } else if (n.clearAppBadge) {
      void n.clearAppBadge();
    }
  } catch {
    /* unsupported */
  }
}

export function clearAppBadge() {
  setAppBadge(0);
}
