/* Native-first cache busting kill-switch.
   Firebase background push still uses /firebase-messaging-sw.js separately. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.allSettled(
        keys
          .filter((key) => key.startsWith("ko-") || key.includes("workbox"))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      const clientsList = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(clientsList.map((client) => client.navigate(client.url)));
    } finally {
      await self.registration.unregister();
    }
  })());
});
