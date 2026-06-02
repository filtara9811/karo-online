import { useEffect, useState } from "react";
import { useVendorLeadAlerts } from "@/hooks/use-vendor-leads";
import { LeadAlertStack } from "@/components/LeadAlertStack";
import { requestNotificationPermission, playLeadAlert, unlockLeadAlertAudio } from "@/lib/lead-sound";
import { speakHindi, primeVoices } from "@/lib/tts";

export function VendorLeadAlerts() {
  const { alerts, dismiss, acceptLead, rejectLead } = useVendorLeadAlerts();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    requestNotificationPermission();
    // Unlock audio on first user gesture (required by mobile browsers)
    const unlock = () => unlockLeadAlertAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Ring the bell every time a new alert arrives
  const newestId = alerts[0]?.notificationId;
  useEffect(() => {
    if (newestId) {
      playLeadAlert("default");
      primeVoices();
      // Small delay so TTS doesn't clash with start of ringtone
      setTimeout(() => speakHindi("Nayi lead receive hui hai. Please accept karein."), 450);
    }
  }, [newestId]);

  if (!hydrated) return null;

  return (
    <LeadAlertStack alerts={alerts} onAccept={acceptLead} onReject={rejectLead} onDismiss={dismiss} />
  );
}
