// Coin-drop chime via Web Audio (no asset needed).
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

export function playCoinDrop() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  // Sequence of bright bell-like blips that descend then resolve up — coin pile feel.
  const pattern: Array<[number, number, number]> = [
    [1568, 0.0, 0.12], // G6
    [2093, 0.06, 0.12], // C7
    [2637, 0.12, 0.14], // E7
    [3136, 0.2, 0.18], // G7
    [2349, 0.34, 0.22], // D7 sparkle
  ];
  pattern.forEach(([freq, t, dur]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.value = 0;
    const t0 = now + t;
    g.gain.linearRampToValueAtTime(0.55, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });
  // Low "thunk" of coin landing
  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  o2.type = "sine";
  o2.frequency.value = 220;
  g2.gain.value = 0;
  g2.gain.linearRampToValueAtTime(0.3, now + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  o2.connect(g2).connect(ac.destination);
  o2.start(now);
  o2.stop(now + 0.3);

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([60, 40, 120]); } catch {}
  }
}
