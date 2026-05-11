// Browser-side Firebase init for FCM Web Push.
// All values here are publishable (sender id, web api key, vapid key, app id).
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyAOG2wCS6gjRAHHEUxwF2Rou-bbSOyUDj4",
  authDomain: "karoonline.firebaseapp.com",
  projectId: "karoonline",
  storageBucket: "karoonline.firebasestorage.app",
  messagingSenderId: "242509372770",
  appId: "1:242509372770:web:01bfae8afaa436b6c5203b",
  measurementId: "G-1J4Y5LZKFF",
};

export const VAPID_KEY =
  "BMut5fwHoLIM-lzKED2sPDJ-nVjLGirWrJXXThDlRYx6K1nTF_BlljdP7FkTgfeb1iBqof5NympM0WYoDKJN4BA";

let _app: FirebaseApp | null = null;
export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps()[0] ?? initializeApp(firebaseConfig);
  return _app;
}

let _messaging: Messaging | null = null;
export async function getMessagingSafe(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  try {
    if (!(await isSupported())) return null;
  } catch { return null; }
  if (_messaging) return _messaging;
  _messaging = getMessaging(getFirebaseApp());
  return _messaging;
}

/**
 * Request the browser's FCM token. Caller must ensure Notification permission
 * is already 'granted' (PermissionsGate handles that). Returns null if push
 * is not supported or the user blocked it.
 */
export async function requestFcmToken(): Promise<string | null> {
  const m = await getMessagingSafe();
  if (!m) return null;
  // Register our SW (firebase-messaging-sw.js must live at site root)
  let reg: ServiceWorkerRegistration | undefined;
  try {
    reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  } catch (e) {
    console.warn("[fcm] SW register failed", e);
    return null;
  }
  try {
    const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    return token || null;
  } catch (e) {
    console.warn("[fcm] getToken failed", e);
    return null;
  }
}

export function onForegroundMessage(cb: (p: unknown) => void) {
  getMessagingSafe().then((m) => {
    if (!m) return;
    onMessage(m, cb);
  });
}
