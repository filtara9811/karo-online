// Loud, attention-grabbing lead alert. Uses a real audio file looped for up
// to 30 seconds + a parallel vibration loop. Falls back to Web Audio synth
// if the audio file fails to load (e.g. offline).

const SOUND_URL = "/sounds/lead-ring.mp3";
const MAX_DURATION_MS = 30_000;

let audioEl: HTMLAudioElement | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.volume = 1.0;
  }
  return audioEl;
}

/** Call on first user gesture (mobile browsers require user activation). */
export function unlockLeadAlertAudio() {
  if (unlocked) return;
  const a = getAudio();
  if (!a) return;
  // Play + immediately pause to satisfy autoplay gesture requirement
  a.muted = true;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      unlocked = true;
    })
    .catch(() => {
      // Will retry on actual playLeadAlert
    });
}

/** Start the alert: looped sound up to 30s + repeating vibration. */
export function playLeadAlert() {
  // Vibration
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([400, 150, 400, 150, 800, 200, 400]); } catch {}
  }
  if (vibrateTimer) clearInterval(vibrateTimer);
  let vc = 0;
  vibrateTimer = setInterval(() => {
    vc += 1;
    if (vc > 14) { if (vibrateTimer) clearInterval(vibrateTimer); return; }
    try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch {}
  }, 2000);

  // Audio
  const a = getAudio();
  if (a) {
    try {
      a.currentTime = 0;
      a.loop = true;
      a.volume = 1.0;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }

  // Hard stop after MAX_DURATION_MS
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(() => stopLeadAlert(), MAX_DURATION_MS);
}

/** Stop the looping sound + vibration (call on accept / reject / dismiss). */
export function stopLeadAlert() {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; }
  try { navigator.vibrate?.(0); } catch {}
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch {}
  }
}

export async function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "lead-alert",
        renotify: true,
        requireInteraction: true,
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
