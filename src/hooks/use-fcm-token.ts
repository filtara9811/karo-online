import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

const SAVED_KEY = "ko-fcm-token-v1";

/**
 * Once user is signed in AND notification permission is granted, register
 * an FCM token and store it in device_tokens. Idempotent across reloads.
 */
export function useFcmToken() {
  const { isAuthenticated, ready } = useAuth();

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;
    (async () => {
      const token = await requestFcmToken();
      if (cancelled || !token) return;
      const last = localStorage.getItem(SAVED_KEY);
      if (last === token) return;
      try {
        await (supabase as any).rpc("register_device_token", {
          _token: token,
          _platform: "web",
          _topics: [],
        });
        localStorage.setItem(SAVED_KEY, token);
      } catch (e) {
        console.warn("[fcm] token save failed", e);
      }
    })();

    // Foreground messages → toast (browser doesn't show native notif when tab focused)
    onForegroundMessage((payload: any) => {
      const n = payload?.notification ?? payload?.data ?? {};
      if (n?.title || n?.body) {
        toast(n.title ?? "New notification", { description: n.body });
      }
    });

    return () => { cancelled = true; };
  }, [ready, isAuthenticated]);
}
