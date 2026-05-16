import { useEffect, useState } from "react";
import { useVendorLeadAlerts } from "@/hooks/use-vendor-leads";
import { LeadAlertStack } from "@/components/LeadAlertStack";
import { unlockLeadAlertAudio, isLeadAlertUnlocked, requestNotificationPermission } from "@/lib/lead-sound";
import { BellRing } from "lucide-react";

export function VendorLeadAlerts() {
  const { alerts, dismiss, acceptLead, rejectLead } = useVendorLeadAlerts();
  const [hydrated, setHydrated] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // After mount, check if we already have a user gesture (we won't, on first paint)
    setNeedsUnlock(!isLeadAlertUnlocked());
  }, []);

  // Unlock Web Audio + notifications on first user gesture
  useEffect(() => {
    const unlock = () => {
      unlockLeadAlertAudio();
      requestNotificationPermission();
      setTimeout(() => setNeedsUnlock(!isLeadAlertUnlocked()), 200);
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

  return (
    <>
      {needsUnlock && (
        <button
          onClick={() => {
            unlockLeadAlertAudio();
            requestNotificationPermission();
            setTimeout(() => setNeedsUnlock(!isLeadAlertUnlocked()), 300);
          }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-lg active:scale-95 animate-pulse"
        >
          <BellRing className="h-3.5 w-3.5" /> Tap to enable lead alerts
        </button>
      )}
      <LeadAlertStack alerts={alerts} onAccept={acceptLead} onReject={rejectLead} onDismiss={dismiss} />
    </>
  );
}
