/**
 * Indian short-scale formatter — strict labels: Cr, L, K
 */
export function fmtShort(n: number, digits = 2): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e7) return trimZeros((n / 1e7).toFixed(digits)) + " Cr";
  if (abs >= 1e5) return trimZeros((n / 1e5).toFixed(digits)) + " L";
  if (abs >= 1000) return trimZeros((n / 1000).toFixed(1)) + " K";
  return Math.round(n).toLocaleString("en-IN");
}

function trimZeros(s: string) {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

/** Hard cap for LeadX total supply */
export const MAX_LEADX_SUPPLY = 1e7; // 1 Cr

/** Tiny haptic feedback for taps */
export function haptic(ms: number = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    /* no-op */
  }
}
