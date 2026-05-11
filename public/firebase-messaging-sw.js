/* Background FCM service worker. Served from site root. */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

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
  const options = {
    body: n.body || data.body || "",
    icon: n.icon || "/icon-192.png",
    image: n.image || data.image || undefined,
    badge: "/icon-192.png",
    data: { url: data.action_url || data.url || "/", ...data },
    tag: data.tag || "ko-msg",
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { w.navigate(url); return w.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
