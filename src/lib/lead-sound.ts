// Loud, attention-grabbing lead alert. Loops a real audio file up to 30 s,
// vibrates in parallel, and falls back to a Web Audio bell synth if the mp3
// is blocked / not loaded yet.

const SOUND_URL = "/sounds/lead-ring.mp3";
const MAX_DURATION_MS = 30_000;

let audioEl: HTMLAudioElement | null = null;
let audioReady = false;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let unlocked = false;
let synthCtx: AudioContext | null = null;
let synthTimer: ReturnType<typeof setInterval> | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.volume = 1.0;
    audioEl.crossOrigin = "anonymous";
    audioEl.addEventListener("canplaythrough", () => { audioReady = true; }, { once: true });
    audioEl.addEventListener("error", () => { audioReady = false; });
    // Force load
    try { audioEl.load(); } catch {}
  }
  return audioEl;
}

/** Call on first user gesture (mobile browsers require user activation). */
export function unlockLeadAlertAudio() {
  if (unlocked) return;
  const a = getAudio();
  if (!a) return;
  a.muted = true;
  const p = a.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      try { a.pause(); a.currentTime = 0; } catch {}
      a.muted = false;
      unlocked = true;
    }).catch(() => {
      a.muted = false;
    });
  }
  // Also unlock Web Audio fallback
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC && !synthCtx) {
      synthCtx = new AC() as AudioContext;
    }
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
export function playLeadAlert() {
  if (typeof window === "undefined") return;

  // Vibration loop
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([400, 150, 400, 150, 800, 200, 400]); } catch {}
  }
  if (vibrateTimer) clearInterval(vibrateTimer);
  let vc = 0;
  vibrateTimer = setInterval(() => {
    vc += 1;
    if (vc > 14) { if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; } return; }
    try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch {}
  }, 2000);

  // Try mp3
  const a = getAudio();
  let mp3Started = false;
  if (a) {
    try {
      a.muted = false;
      a.volume = 1.0;
      a.currentTime = 0;
      a.loop = true;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => { mp3Started = true; })
          .catch(() => {
            // Autoplay blocked or load failed — fall back to synth bell
            playSynthBell();
          });
      } else {
        mp3Started = true;
      }
    } catch {
      playSynthBell();
    }
  } else {
    playSynthBell();
  }

  // Safety: if 600 ms later the mp3 hasn't started, run synth in parallel
  setTimeout(() => {
    if (!mp3Started && (audioEl?.paused ?? true)) playSynthBell();
  }, 600);

  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(() => stopLeadAlert(), MAX_DURATION_MS);
}

/** Stop the looping sound + vibration (call on accept / reject / dismiss). */
export function stopLeadAlert() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; }
  if (synthTimer) { clearInterval(synthTimer); synthTimer = null; }
  try { navigator.vibrate?.(0); } catch {}
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch {}
  }
}

export async function showBrowserNotification(title: string, body: string, opts?: { icon?: string; image?: string }) {
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
        tag: "lead-alert",
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
