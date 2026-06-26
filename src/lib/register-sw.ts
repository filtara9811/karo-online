/**
 * Register the PWA service worker — but ONLY in safe contexts.
 * Skipped inside Lovable preview iframes (would cause stale caching during edits).
 */
export function registerPwaServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }

  const host = window.location.hostname;
  const isLovablePreview =
    host.includes("lovableproject.com") ||
    (host.includes("lovable.app") && host.includes("id-preview--"));

  if (inIframe || isLovablePreview) {
    // Clean up any previously registered SW so preview stays fresh.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => {
        // Keep firebase messaging SW; only remove our /sw.js registration.
        if (r.active?.scriptURL?.endsWith("/sw.js")) r.unregister();
      }))
      .catch(() => undefined);
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Ask for the newest worker on every launch so stale cached bundles do
        // not leave users stuck on an old Loading screen.
        reg.update().catch(() => undefined);
      })
      .catch((err) => console.warn("[PWA] SW registration failed:", err));
  });
}
