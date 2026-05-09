// Loud, attention-grabbing chime via Web Audio (no asset needed).
let ctx: AudioContext | null = null;
let audioUnlocked = false;

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

export function playLeadAlert() {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") {
    navigator.vibrate?.([240, 80, 240, 80, 500]);
    return;
  }
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);
  // ramp up loud
  master.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

  const notes = [880, 1320, 1760, 1320, 1760];
  notes.forEach((freq, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.value = 0;
    const t0 = now + i * 0.16;
    g.gain.linearRampToValueAtTime(0.6, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.22);
  });

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([200, 80, 200, 80, 400]); } catch {}
  }
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
