import { useEffect, useRef, useState } from "react";
import { useVendorLeadAlerts } from "@/hooks/use-vendor-leads";
import { LeadAlertStack } from "@/components/LeadAlertStack";
import { requestNotificationPermission, playLeadAlert, unlockLeadAlertAudio } from "@/lib/lead-sound";
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

  // Ring CONTINUOUSLY until the vendor accepts/rejects (alerts drains to 0).
  const newestId = alerts[0]?.notificationId;
  useEffect(() => {
    if (!newestId) return;
    if (spokenIds.current.has(newestId)) return;
    spokenIds.current.add(newestId);
    // continuous: true → loops forever, no 30s cutoff
    playLeadAlert("default", { continuous: true });
    setTimeout(() => {
      speakHindi("Aapko ek nayi lead request receive hui hai. Please lead accept karein.", { dedupKey: `lead:${newestId}`, ignoreMute: true });
    }, 450);
  }, [newestId]);

  if (!hydrated) return null;

  return (
    <LeadAlertStack alerts={alerts} onAccept={acceptLead} onReject={rejectLead} onDismiss={dismiss} />
  );
}
