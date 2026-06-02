/**
 * Shared Hindi Text-to-Speech utility (Web Speech API).
 *
 * Highlights:
 * - Dedup: same notificationId / phrase won't speak twice in a row.
 * - Mute: user-controllable via localStorage flag (ko-tts-muted-v1).
 * - Mobile unlock: speech APIs only work after a user gesture; we expose
 *   `unlockTTS()` to be called once on first pointerdown/keydown which
 *   speaks an empty utterance to "warm up" the engine.
 * - Voice fallback: hi-IN → en-IN → en → first.
 */

const MUTE_KEY = "ko-tts-muted-v1";
const DEDUP_WINDOW_MS = 8000;
const recentSpoken = new Map<string, number>(); // key -> timestamp

let __unlocked = false;
let __voicesPrimed = false;

export function isTTSMuted(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setTTSMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    if (muted) window.speechSynthesis?.cancel();
  } catch { /* ignore */ }
}

export function toggleTTSMuted(): boolean {
  const next = !isTTSMuted();
  setTTSMuted(next);
  return next;
}

export function primeVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  __voicesPrimed = true;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try { window.speechSynthesis.getVoices(); } catch { /* noop */ }
    };
  } catch { /* noop */ }
}

/** Call once on a real user gesture (pointerdown/keydown) to unlock TTS on mobile. */
export function unlockTTS() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (__unlocked) return;
  primeVoices();
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0; u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
    __unlocked = true;
  } catch { /* ignore */ }
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
  } catch { /* ignore */ }
}

type SpeakOpts = {
  /** Stable key used for dedup. If omitted, the text itself is the key. */
  dedupKey?: string;
  /** Skip dedup check (e.g. for the tap-to-test button). */
  force?: boolean;
  /** Lead alerts must speak even if an old mute flag was saved. */
  ignoreMute?: boolean;
};

export function speakHindi(text: string, opts: SpeakOpts = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!opts.force && !opts.ignoreMute && isTTSMuted()) return;

  const key = opts.dedupKey ?? text;
  const now = Date.now();
  if (!opts.force) {
    const last = recentSpoken.get(key);
    if (last && now - last < DEDUP_WINDOW_MS) return;
  }
  recentSpoken.set(key, now);
  // GC old entries
  if (recentSpoken.size > 50) {
    for (const [k, t] of recentSpoken) {
      if (now - t > DEDUP_WINDOW_MS * 4) recentSpoken.delete(k);
    }
  }

  primeVoices();
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

/** Tap-to-test: always speaks regardless of dedup, ignores mute flag. */
export function testSpeak(text = "Nayi lead receive hui hai. Please accept karein.") {
  unlockTTS();
  speakHindi(text, { force: true });
}

const KIND_PHRASES: Record<string, string> = {
  lead_alert: "Aapko ek nayi lead receive hui hai. Please accept karein.",
  new_lead: "Aapko ek nayi lead receive hui hai. Please accept karein.",
  new_message: "Aapko naya message aaya hai.",
  message: "Aapko naya message aaya hai.",
  chat: "Aapko naya message aaya hai.",
  new_inquiry: "Nayi inquiry aayi hai.",
  inquiry: "Nayi inquiry aayi hai.",
};

export function speakForKind(kind: string | undefined | null, dedupKey?: string) {
  if (!kind) return;
  const phrase = KIND_PHRASES[kind.toLowerCase()];
  if (phrase) speakHindi(phrase, { dedupKey });
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
    if (count > 0 && n.setAppBadge) void n.setAppBadge(count);
    else if (n.clearAppBadge) void n.clearAppBadge();
  } catch { /* unsupported */ }
}

export function clearAppBadge() { setAppBadge(0); }
