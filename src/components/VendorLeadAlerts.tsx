import { useEffect, useRef, useState } from "react";
import { useVendorLeadAlerts } from "@/hooks/use-vendor-leads";
import { LeadAlertStack } from "@/components/LeadAlertStack";
import { requestNotificationPermission, playLeadAlert, unlockLeadAlertAudio } from "@/lib/lead-sound";
import { speakHindi, primeVoices, unlockTTS, isTTSMuted, toggleTTSMuted, testSpeak } from "@/lib/tts";
import { Volume2, VolumeX } from "lucide-react";

export function VendorLeadAlerts() {
  const { alerts, dismiss, acceptLead, rejectLead } = useVendorLeadAlerts();
  const [hydrated, setHydrated] = useState(false);
  const [muted, setMuted] = useState(false);
  const spokenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setHydrated(true);
    setMuted(isTTSMuted());
  }, []);

  useEffect(() => {
    requestNotificationPermission();
    const unlock = () => { unlockLeadAlertAudio(); unlockTTS(); primeVoices(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Ring + speak ONLY for genuinely new notificationIds
  const newestId = alerts[0]?.notificationId;
  useEffect(() => {
    if (!newestId) return;
    if (spokenIds.current.has(newestId)) return;
    spokenIds.current.add(newestId);
    playLeadAlert("default");
    setTimeout(() => {
      speakHindi("Nayi lead receive hui hai. Please accept karein.", { dedupKey: `lead:${newestId}` });
    }, 450);
  }, [newestId]);

  if (!hydrated) return null;

  return (
    <>
      <LeadAlertStack alerts={alerts} onAccept={acceptLead} onReject={rejectLead} onDismiss={dismiss} />
      {/* Tiny mute / tap-to-test bubble (bottom-left, above bottom nav) */}
      <div className="fixed bottom-24 left-3 z-[80] flex items-center gap-2 pointer-events-none">
        <button
          type="button"
          onClick={() => {
            const next = toggleTTSMuted();
            setMuted(next);
            if (!next) testSpeak();
          }}
          aria-label={muted ? "Unmute voice alerts" : "Mute voice alerts"}
          className="pointer-events-auto h-9 w-9 rounded-full bg-white/95 border border-amber-300 shadow grid place-items-center active:scale-90"
        >
          {muted ? <VolumeX className="h-4 w-4 text-rose-600" /> : <Volume2 className="h-4 w-4 text-emerald-700" />}
        </button>
        {!muted && (
          <button
            type="button"
            onClick={() => testSpeak()}
            className="pointer-events-auto h-9 px-3 rounded-full bg-white/95 border border-amber-300 shadow text-[10px] font-bold text-amber-900 active:scale-95"
          >
            Test voice
          </button>
        )}
      </div>
    </>
  );
}
