/**
 * Shared Hindi Text-to-Speech utility (Web Speech API).
 * Used for foreground notification voice alerts.
 *
 * Mobile browsers load voices asynchronously, so we wait briefly for the
 * Hindi voice to become available before speaking. If none is found we
 * fall back to en-IN (still understandable, available on most Android).
 */
let __voicesPrimed = false;

export function primeVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  __voicesPrimed = true;
  try {
    window.speechSynthesis.getVoices();
    // Some browsers only populate after this event fires.
    window.speechSynthesis.onvoiceschanged = () => {
      try { window.speechSynthesis.getVoices(); } catch { /* noop */ }
    };
  } catch {
    /* noop */
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en-in")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
    voices[0] ||
    null
  );
}

function doSpeak(text: string, lang: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    const v = pickVoice();
    if (v) {
      u.voice = v;
      if (v.lang) u.lang = v.lang;
    }
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function speakHindi(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  primeVoices();
  // Wait briefly for voice list to populate on mobile.
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    doSpeak(text, "hi-IN");
    return;
  }
  let tries = 0;
  const id = setInterval(() => {
    tries += 1;
    const list = window.speechSynthesis.getVoices();
    if ((list && list.length > 0) || tries > 10) {
      clearInterval(id);
      doSpeak(text, "hi-IN");
    }
  }, 120);
}

/** Map notification kinds → Hindi TTS phrase. */
const KIND_PHRASES: Record<string, string> = {
  lead_alert: "Aapko ek nayi lead receive hui hai. Please accept karein.",
  new_lead: "Aapko ek nayi lead receive hui hai. Please accept karein.",
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
