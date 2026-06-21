import { useEffect, useRef, useState } from "react";
import { useVendorLeadAlerts } from "@/hooks/use-vendor-leads";
import { LeadAlertStack } from "@/components/LeadAlertStack";
import { requestNotificationPermission, unlockLeadAlertAudio, playLeadAlert, stopLeadAlert } from "@/lib/lead-sound";
import { speakHindi, primeVoices, unlockTTS } from "@/lib/tts";

export function VendorLeadAlerts() {
  const { alerts, dismiss, acceptLead, rejectLead } = useVendorLeadAlerts();
  const [hydrated, setHydrated] = useState(false);
  const spokenIds = useRef<Set<string>>(new Set());

  useEffect(() => { setHydrated(true); }, []);

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

  // ONE-TIME voice alert (Hindi TTS) — no continuous ringing.
  // A short attention "ding" plays once, then the Hindi line is spoken.
  const newestId = alerts[0]?.notificationId;
  useEffect(() => {
    if (!newestId) return;
    if (spokenIds.current.has(newestId)) return;
    spokenIds.current.add(newestId);
    // single attention chime (no loop, no continuous)
    playLeadAlert("default", { loop: false, durationMs: 1500 });
    setTimeout(() => {
      speakHindi(
        "Aashu bhai, aapko ek lead receive hui hai. Kripya jaldi dekhein.",
        { dedupKey: `lead:${newestId}`, ignoreMute: true },
      );
      // stop any residual loop just in case
      setTimeout(() => stopLeadAlert(), 100);
    }, 600);
  }, [newestId]);

  if (!hydrated) return null;

  return (
    <LeadAlertStack alerts={alerts} onAccept={acceptLead} onReject={rejectLead} onDismiss={dismiss} />
  );
}
