// Cha-ching cash-register sound via Web Audio (no asset).
// Replaces the previous coin-drop chime with a richer drawer-slide + bell ding + thunk.

let ctx: AudioContext | null = null;

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

function noiseBuffer(ac: AudioContext, durSec: number) {
  const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * durSec)), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    // decay envelope on the random noise → drawer slide whoosh
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.4);
  }
  return buf;
}

export function playCoinDrop() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  // 1) Bright BELL DING chord (cha-ching first syllable) — G6 + C7 + E7 + G7
  const bellFreqs = [1568, 2093, 2637, 3136];
  bellFreqs.forEach((freq, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    const t0 = now + i * 0.012;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.32, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + 0.6);
  });

  // 2) Second bell hit (the "CHING" — slightly later, higher) — E7 + B7 sparkle
  [2637, 3951].forEach((freq, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const t0 = now + 0.18 + i * 0.01;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.4, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + 0.7);
  });

  // 3) Drawer-slide noise whoosh (filtered noise burst)
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 0.45);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 1.2;
  const nGain = ac.createGain();
  nGain.gain.setValueAtTime(0, now);
  nGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  src.connect(bp).connect(nGain).connect(ac.destination);
  src.start(now);

  // 4) Low ka-CHUNK thunk of the drawer landing
  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  o2.type = "sine";
  o2.frequency.setValueAtTime(180, now + 0.35);
  o2.frequency.exponentialRampToValueAtTime(80, now + 0.5);
  g2.gain.setValueAtTime(0, now + 0.35);
  g2.gain.linearRampToValueAtTime(0.35, now + 0.36);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  o2.connect(g2).connect(ac.destination);
  o2.start(now + 0.35);
  o2.stop(now + 0.6);

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([40, 30, 60, 20, 80]); } catch {}
  }
}
