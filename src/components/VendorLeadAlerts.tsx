import { useEffect, useState } from "react";
import { useVendorLeadAlerts } from "@/hooks/use-vendor-leads";
import { LeadAlertStack } from "@/components/LeadAlertStack";
import { unlockLeadAlertAudio } from "@/lib/lead-sound";

export function VendorLeadAlerts() {
  const { alerts, dismiss, acceptLead, rejectLead } = useVendorLeadAlerts();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Unlock Web Audio on first user gesture (required by mobile browsers)
  useEffect(() => {
    const unlock = () => {
      unlockLeadAlertAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("click", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  if (!hydrated) return null;

  return <LeadAlertStack alerts={alerts} onAccept={acceptLead} onReject={rejectLead} onDismiss={dismiss} />;
}
