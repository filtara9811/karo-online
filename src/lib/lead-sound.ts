// Loud, attention-grabbing lead alert. Loops a source-specific audio file up
// to 30 s, vibrates in parallel, and falls back to a Web Audio bell synth if
// the mp3 is blocked / not loaded yet.

export type AlertSource = "quick" | "whatsapp" | "call" | "digital" | "message" | "order" | "default";

const SOUND_URLS: Record<AlertSource, string> = {
  quick: "/sounds/quick_service.mp3",
  whatsapp: "/sounds/whatsapp.mp3",
  call: "/sounds/call_ring.mp3",
  digital: "/sounds/digital_shop.mp3",
  message: "/sounds/new_message.mp3",
  order: "/sounds/order_received.mp3",
  default: "/sounds/lead-ring.mp3",
};

const MAX_DURATION_MS = 30_000;

const audioCache: Partial<Record<AlertSource, HTMLAudioElement>> = {};
let currentAudio: HTMLAudioElement | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let unlocked = false;
let synthCtx: AudioContext | null = null;
let synthTimer: ReturnType<typeof setInterval> | null = null;

function getAudio(source: AlertSource): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioCache[source]) {
    const a = new Audio(SOUND_URLS[source]);
    a.loop = true;
    a.preload = "auto";
    a.volume = 1.0;
    try { a.load(); } catch {}
    audioCache[source] = a;
  }
  return audioCache[source] ?? null;
}

/** Call on first user gesture (mobile browsers require user activation). */
export function unlockLeadAlertAudio() {
  if (unlocked) return;
  // Unlock every variant in one shot
  (Object.keys(SOUND_URLS) as AlertSource[]).forEach((key) => {
    const a = getAudio(key);
    if (!a) return;
    a.muted = true;
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(() => { try { a.pause(); a.currentTime = 0; } catch {}; a.muted = false; })
       .catch(() => { a.muted = false; });
    }
  });
  unlocked = true;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC && !synthCtx) synthCtx = new AC() as AudioContext;
    if (synthCtx && synthCtx.state === "suspended") synthCtx.resume().catch(() => {});
  } catch {}
}

function playSynthBell() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!synthCtx) synthCtx = new AC() as AudioContext;
    const ctx = synthCtx;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const ring = () => {
      const now = ctx.currentTime;
      [880, 1175, 1480].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.6, now + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.45);
        o.connect(g).connect(ctx.destination);
        o.start(now + i * 0.12);
        o.stop(now + i * 0.12 + 0.5);
      });
    };
    ring();
    if (synthTimer) clearInterval(synthTimer);
    synthTimer = setInterval(ring, 1500);
  } catch {}
}

/** Start the alert: looped sound up to 30 s + repeating vibration. */
export function playLeadAlert(source: AlertSource = "default", opts?: { loop?: boolean; durationMs?: number }) {
  if (typeof window === "undefined") return;
  const loop = opts?.loop !== false;
  const dur = opts?.durationMs ?? MAX_DURATION_MS;

  stopLeadAlert();

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([400, 150, 400, 150, 800, 200, 400]); } catch {}
  }
  if (loop) {
    let vc = 0;
    vibrateTimer = setInterval(() => {
      vc += 1;
      if (vc > 14) { if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; } return; }
      try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch {}
    }, 2000);
  }

  const a = getAudio(source);
  let mp3Started = false;
  if (a) {
    try {
      a.muted = false;
      a.volume = 1.0;
      a.currentTime = 0;
      a.loop = loop;
      currentAudio = a;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => { mp3Started = true; }).catch(() => playSynthBell());
      } else {
        mp3Started = true;
      }
    } catch { playSynthBell(); }
  } else {
    playSynthBell();
  }

  setTimeout(() => {
    if (!mp3Started && (currentAudio?.paused ?? true)) playSynthBell();
  }, 600);

  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(() => stopLeadAlert(), dur);
}

/** Play a quick non-looping ping for new chat messages / small events. */
export function playPing(source: AlertSource = "message") {
  playLeadAlert(source, { loop: false, durationMs: 1500 });
}

/** Stop the looping sound + vibration. */
export function stopLeadAlert() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; }
  if (synthTimer) { clearInterval(synthTimer); synthTimer = null; }
  try { navigator.vibrate?.(0); } catch {}
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.currentTime = 0; } catch {}
    currentAudio = null;
  }
}

export async function showBrowserNotification(title: string, body: string, opts?: { icon?: string; image?: string; tag?: string }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: opts?.icon || "/icon-192.png",
        badge: "/icon-192.png",
        tag: opts?.tag || "ko-alert",
        renotify: true,
        requireInteraction: true,
        ...(opts?.image ? ({ image: opts.image } as any) : {}),
      } as NotificationOptions);
    }
  } catch {}
}

export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

export function isLeadAlertUnlocked() {
  return unlocked;
}
