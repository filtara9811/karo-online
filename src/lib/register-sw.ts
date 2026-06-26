/** Native-first cache cleanup: stop registering the old app-shell PWA worker. */
export function registerPwaServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => {
      if (r.active?.scriptURL?.endsWith("/sw.js") || r.installing?.scriptURL?.endsWith("/sw.js") || r.waiting?.scriptURL?.endsWith("/sw.js")) {
        r.unregister().catch(() => undefined);
      }
    }))
    .catch(() => undefined);
}
