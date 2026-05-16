/* Background FCM service worker. Served from site root. */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    ]),
  );
});

firebase.initializeApp({
  apiKey: "AIzaSyAOG2wCS6gjRAHHEUxwF2Rou-bbSOyUDj4",
  authDomain: "karoonline.firebaseapp.com",
  projectId: "karoonline",
  storageBucket: "karoonline.firebasestorage.app",
  messagingSenderId: "242509372770",
  appId: "1:242509372770:web:01bfae8afaa436b6c5203b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};
  const title = n.title || data.title || "Karoonline";
  const isLead = data.kind === "lead_alert";
  const options = {
    body: n.body || data.body || "",
    icon: n.icon || "/icon-192.png",
    image: n.image || data.image || undefined,
    badge: "/icon-192.png",
    data: { url: data.action_url || data.url || "/", ...data },
    tag: data.tag || (isLead ? `lead-${data.lead_id || "x"}` : "ko-msg"),
    renotify: true,
    requireInteraction: isLead,
    silent: false,
    vibrate: isLead ? [400, 150, 400, 150, 800, 200, 400, 150, 800] : [200, 100, 200],
    actions: isLead
      ? [
          { action: "accept", title: "Accept" },
          { action: "reject", title: "Reject" },
        ]
      : undefined,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const baseUrl = data.url || "/";
  let url = baseUrl;
  if (event.action === "accept" && data.lead_id) {
    url = `/vendor/dashboard?leadId=${data.lead_id}&action=accept`;
  } else if (event.action === "reject" && data.lead_id) {
    url = `/vendor/dashboard?leadId=${data.lead_id}&action=reject`;
  }
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { w.navigate(url); return w.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
