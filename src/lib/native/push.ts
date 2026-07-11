import { supabase } from "@/integrations/supabase/client";
import { isNative } from "./platform";
import { playLeadAlert } from "@/lib/lead-sound";
import { speakHindi } from "@/lib/tts";

let registered = false;

/**
 * Register native FCM token via Capacitor PushNotifications and persist to device_tokens.
 * Idempotent. No-op on web (web uses src/hooks/use-fcm-token.ts).
 */
export async function initNativePush(): Promise<void> {
  if (!isNative() || registered) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    try {
      await (PushNotifications as any).createChannel?.({
        id: "lead_alerts_v2",
        name: "Lead Alerts",
        description: "Urgent incoming lead alerts",
        importance: 5,
        visibility: 1,
        sound: "lead_ring",
        vibration: true,
        lights: true,
      });
    } catch { /* channel creation is Android-only */ }

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

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      const data: any = notification.data ?? {};
      if (data.kind === "lead_alert" || data.kind === "new_lead" || data.kind === "direct_test") {
        playLeadAlert("quick", { continuous: true });
        speakHindi("Namaskar! Aapko ek nayi lead mili hai. Kripya turant dekhen.", {
          dedupKey: `native-lead:${data.lead_id ?? Date.now()}`,
          ignoreMute: true,
        });
      }
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const data: any = event.notification?.data ?? {};
      const leadId = data.lead_id;
      if (leadId && event.actionId === "accept") window.location.href = `/vendor/dashboard?leadId=${leadId}&action=accept`;
      else if (leadId && event.actionId === "reject") window.location.href = `/vendor/dashboard?leadId=${leadId}&action=reject`;
      else if (data.action_url || data.url) window.location.href = data.action_url || data.url;
    });

    // Wrap register() to silently swallow Google Play services missing/outdated errors
    // (surfaces as an intrusive "Something went wrong · Check that Google Play is enabled" dialog on some devices).
    try {
      await PushNotifications.register();
      registered = true;
    } catch (e) {
      console.warn("[native push] register() failed — likely missing/outdated Play services; push disabled on this device.", e);
    }
  } catch (e) {
    console.warn("[native push] init failed", e);
  }
}
