// Loud, attention-grabbing chime via Web Audio + repeating vibration loop.
let ctx: AudioContext | null = null;
let audioUnlocked = false;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlockLeadAlertAudio() {
  const ac = getCtx();
  if (!ac || audioUnlocked) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    g.gain.value = 0.0001;
    o.frequency.value = 1;
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.03);
    audioUnlocked = true;
  } catch {}
}

/** One ring cycle — distinct ascending arpeggio chime (~1.6s). */
function playOneRing() {
  const ac = getCtx();
  if (!ac || ac.state === "suspended") return;
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);
  master.gain.exponentialRampToValueAtTime(0.95, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);

  // Distinct "lead-incoming" motif: low ding → bright bell trill
  const notes: Array<[number, number, OscillatorType]> = [
    [523, 0.0, "triangle"],   // C5
    [784, 0.14, "triangle"],  // G5
    [1047, 0.28, "sine"],     // C6
    [1319, 0.42, "sine"],     // E6
    [1047, 0.62, "triangle"], // C6
    [1568, 0.78, "sine"],     // G6
    [1319, 0.98, "triangle"], // E6
  ];
  notes.forEach(([freq, t, type]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0;
    const t0 = now + t;
    g.gain.linearRampToValueAtTime(0.55, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.36);
  });
}

/** Play the chime once + start a vibrate+ring loop until stopLeadAlert() is called. */
export function playLeadAlert() {
  playOneRing();
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([260, 90, 260, 90, 540, 120, 260]); } catch {}
  }

  // Repeat ring every 2.2s for up to ~30s (covers the bottom-sheet window)
  if (ringInterval) clearInterval(ringInterval);
  let count = 0;
  ringInterval = setInterval(() => {
    count += 1;
    if (count > 12) { if (ringInterval) clearInterval(ringInterval); return; }
    playOneRing();
  }, 2200);

  if (vibrateTimer) clearInterval(vibrateTimer);
  let vc = 0;
  vibrateTimer = setInterval(() => {
    vc += 1;
    if (vc > 14) { if (vibrateTimer) clearInterval(vibrateTimer); return; }
    try { navigator.vibrate?.([220, 80, 220, 80, 420]); } catch {}
  }, 2000);
}

/** Stop the looping ring + vibration (call on accept / skip / dismiss). */
export function stopLeadAlert() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
  if (vibrateTimer) { clearInterval(vibrateTimer); vibrateTimer = null; }
  try { navigator.vibrate?.(0); } catch {}
}

export async function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "lead-alert", renotify: true } as any);
    }
  } catch {}
}

export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
