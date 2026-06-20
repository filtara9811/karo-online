// Tiny device fingerprint hash used for 24h visit dedupe.
// Pure browser-side; not used for security, only de-dup grouping.
export function getVisitFp(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const stored = window.localStorage.getItem("ko_visit_fp");
    if (stored) return stored;
    const seed = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset().toString(),
      Math.random().toString(36).slice(2),
    ].join("|");
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    const fp = `fp_${Math.abs(h).toString(36)}`;
    window.localStorage.setItem("ko_visit_fp", fp);
    return fp;
  } catch {
    return "anon";
  }
}
