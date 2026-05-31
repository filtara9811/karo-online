import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";
import { speakForKind, setAppBadge } from "@/lib/tts";
import { playLeadAlert } from "@/lib/lead-sound";

const SAVED_KEY = "ko-fcm-token-v1";
const BADGE_KEY = "ko-badge-count-v1";

function bumpBadge(delta = 1) {
  if (typeof window === "undefined") return;
  const cur = Number(localStorage.getItem(BADGE_KEY) ?? "0") || 0;
  const next = Math.max(0, cur + delta);
  localStorage.setItem(BADGE_KEY, String(next));
  setAppBadge(next);
}

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

    // Foreground messages → TTS (Hindi) + rich system-style banner toast
    onForegroundMessage((payload: any) => {
      const n = payload?.notification ?? {};
      const d = payload?.data ?? {};
      const kind: string =
        d.kind || d.type ||
        (d.lead_id ? "lead_alert" : undefined) ||
        (d.message_id || d.chat_id ? "new_message" : undefined) ||
        (d.inquiry_id ? "new_inquiry" : "");

      const title = n.title || d.title || "Karoonline";
      const body = n.body || d.body || "";

      if (kind === "lead_alert" || kind === "new_lead") {
        playLeadAlert("quick", { loop: true, durationMs: 30_000 });
      }

      // 1) Speak in Hindi based on type
      speakForKind(kind);

      // 2) System-style banner (top, rich, persistent-ish)
      toast(title, {
        description: body,
        duration: 8000,
        position: "top-center",
        className: "ko-system-banner",
        action: d.action_url || d.url
          ? { label: "Open", onClick: () => { window.location.href = d.action_url || d.url; } }
          : undefined,
      });

      // 3) Bump app icon badge
      bumpBadge(1);
    });

    return () => { cancelled = true; };
  }, [ready, isAuthenticated]);
}
