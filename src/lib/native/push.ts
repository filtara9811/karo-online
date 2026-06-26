import { supabase } from "@/integrations/supabase/client";
import { isNative } from "./platform";

let registered = false;

/**
 * Register native FCM token via Capacitor PushNotifications and persist to device_tokens.
 * Idempotent. No-op on web (web uses src/hooks/use-fcm-token.ts).
 */
export async function initNativePush(): Promise<void> {
  if (!isNative() || registered) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") return;

    PushNotifications.addListener("registration", async (token) => {
      try {
        await (supabase as any).rpc("register_device_token", {
          _token: token.value,
          _platform: "android",
          _topics: [],
        });
      } catch (e) {
        console.warn("[native push] token save failed", e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[native push] registration error", err);
    });

    await PushNotifications.register();
    registered = true;
  } catch (e) {
    console.warn("[native push] init failed", e);
  }
}
