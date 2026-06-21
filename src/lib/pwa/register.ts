/**
 * Guarded service-worker registration.
 * - Never runs in Lovable preview, iframes, or dev.
 * - `?sw=off` unregisters and exits.
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const inIframe = window.self !== window.top;
  const host = window.location.hostname;
  const isLovablePreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";

  if (!isProd || inIframe || isLovablePreview || killSwitch) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        if (r.active?.scriptURL.endsWith("/sw.js")) await r.unregister();
      }
    } catch { /* ignore */ }
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch { /* plugin not loaded; ignore */ }
}
