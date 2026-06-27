import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { playLeadAlert, stopLeadAlert, unlockLeadAlertAudio } from "@/lib/lead-sound";
import { speakHindi } from "@/lib/tts";
import { isNative } from "@/lib/native/platform";
import { toast } from "sonner";

export const Route = createFileRoute("/test-bell")({
  head: () => ({ meta: [{ title: "Test Bell · Karo Online" }] }),
  component: TestBellPage,
});

function TestBellPage() {
  const [ringing, setRinging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    stopLeadAlert();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startBell = async () => {
    try { unlockLeadAlertAudio(); } catch {}
    playLeadAlert("quick", { continuous: true });
    try {
      speakHindi("Aashu bhai, ek test lead receive hui hai. Kripya jaldi dekhein.", {
        dedupKey: `test-bell:${Date.now()}`,
        ignoreMute: true,
      });
    } catch {}
    setRinging(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    toast.success("Test bell ringing — foreground high-priority alert", { duration: 2500 });

    // If native, also fire a local notification so we verify channel + sound
    if (isNative()) {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") await LocalNotifications.requestPermissions();
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 100000),
            title: "New Lead (Test)",
            body: "High-priority train-bell alert · tap to open",
            channelId: "lead_alerts_v2",
            sound: "lead_ring",
            smallIcon: "ic_stat_icon_config_sample",
            extra: { kind: "direct_test" },
          }],
        });
      } catch (e) {
        console.warn("[test-bell] local notification failed", e);
      }
    }
  };

  const stopBell = () => {
    stopLeadAlert();
    setRinging(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    toast("Bell stopped");
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className={`h-28 w-28 rounded-full grid place-items-center border-4 ${ringing ? "border-red-500 animate-pulse" : "border-[#d4af37]"}`}
        style={{ background: ringing ? "linear-gradient(180deg,#fff4e0,#ffd2a8)" : "linear-gradient(180deg,#fff8dc,#f5d97a)" }}>
        {ringing ? <Bell className="h-12 w-12 text-red-600" /> : <Bell className="h-12 w-12 text-[#8b6508]" />}
      </div>

      <div>
        <h1 className="font-display text-2xl text-gold-gradient font-bold">Train-Bell Test</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Triggers the same high-priority "new lead" alarm used for incoming orders.
          Sound, vibration and Hindi TTS will fire instantly in the foreground.
        </p>
      </div>

      {!ringing ? (
        <button
          onClick={startBell}
          className="btn-3d inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold shadow-lg active:scale-95"
          style={{ background: "linear-gradient(180deg,#f5d97a,#d4af37 60%,#8b6508)" }}
        >
          <Volume2 className="h-5 w-5" />
          Ring Test Bell
        </button>
      ) : (
        <button
          onClick={stopBell}
          className="btn-3d inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 text-white font-bold shadow-lg active:scale-95"
        >
          <BellOff className="h-5 w-5" />
          Stop ({elapsed}s)
        </button>
      )}

      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Platform: {isNative() ? "Native (Capacitor)" : "Web"} · Channel: lead_alerts_v2
      </div>
    </div>
  );
}
