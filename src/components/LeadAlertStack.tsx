import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Bell, Clock, MapPin } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { IncomingLead } from "@/hooks/use-vendor-leads";
import { stopLeadAlert } from "@/lib/lead-sound";

type Props = {
  alerts: IncomingLead[];
  onAccept: (leadId: string) => Promise<{ ok: boolean; reason?: string }>;
  onReject: (leadId: string) => Promise<void>;
  onDismiss: (notificationId: string) => void;
};

const ALERT_WINDOW_MS = 15_000;

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

/**
 * Bottom-sheet style lead alert. Only the most recent alert is shown as a
 * full sheet; older pending ones queue as small chips above it. The sheet
 * rings + vibrates until the vendor accepts / skips / dismisses.
 */
export function LeadAlertStack({ alerts, onAccept, onReject, onDismiss }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stop ringtone whenever every alert is cleared
  useEffect(() => {
    if (alerts.length === 0) stopLeadAlert();
  }, [alerts.length]);

  const handleAccept = async (leadId: string) => {
    setBusy(leadId);
    setError(null);
    const res = await onAccept(leadId);
    setBusy(null);
    stopLeadAlert();
    if (!res.ok) {
      const map: Record<string, string> = {
        already_taken: "Sorry — slots already filled.",
        sold_out: "Sold Out! Lead taken.",
        insufficient_balance: "Low wallet balance.",
        insufficient_coins: "Not enough LeadX coins.",
        not_notified: "This lead is not for you.",
        auth_required: "Please login again.",
      };
      setError(map[res.reason ?? ""] ?? "Could not accept lead.");
      setTimeout(() => setError(null), 2600);
    } else {
      navigate({ to: "/vendor/chat", search: { leadId } as any });
    }
  };

  const handleSkip = async (leadId: string) => {
    stopLeadAlert();
    await onReject(leadId).catch(() => {});
  };

  const handleDismiss = (notifId: string) => {
    stopLeadAlert();
    onDismiss(notifId);
  };

  if (alerts.length === 0) return null;
  const [current, ...queued] = alerts;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Soft backdrop only behind the active sheet */}
      <AnimatePresence>
        <motion.div
          key="bd"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
          onClick={() => handleDismiss(current.notificationId)}
        />
      </AnimatePresence>

      {/* Queue chips (older pending) above the sheet */}
      {queued.length > 0 && (
        <div className="absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+260px)] flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 shadow-lg border border-amber-300">
            <Bell className="h-3.5 w-3.5 text-amber-700" />
            <span className="text-[11px] font-bold text-amber-900">+{queued.length} more lead{queued.length > 1 ? "s" : ""} waiting</span>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        <LeadAlertSheet
          key={current.notificationId}
          alert={current}
          busy={busy === current.leadId}
          error={busy === null ? error : null}
          onAccept={() => handleAccept(current.leadId)}
          onSkip={() => handleSkip(current.leadId)}
          onDismiss={() => handleDismiss(current.notificationId)}
        />
      </AnimatePresence>
    </div>
  );
}

function LeadAlertSheet({
  alert: a, busy, error, onAccept, onSkip, onDismiss,
}: {
  alert: IncomingLead;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  const remaining = useCountdown(a.expiresAt);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(1, remaining / ALERT_WINDOW_MS));

  useEffect(() => {
    if (remaining <= 0) onDismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  return (
    <motion.div
      key={a.notificationId}
      initial={{ y: "110%" }}
      animate={{ y: 0 }}
      exit={{ y: "110%", transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="absolute inset-x-0 bottom-0 pointer-events-auto px-3 pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-t-3xl border-2 border-amber-300 shadow-[0_-20px_60px_-8px_rgba(217,119,6,0.55)]"
        style={{
          background:
            "linear-gradient(180deg, #fffbeb 0%, #fde68a 60%, #fbbf24 100%)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="h-1.5 w-12 rounded-full bg-amber-700/40" />
        </div>

        {/* Timer progress */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-200/60">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500"
            initial={false}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </div>

        <div className="relative px-4 pt-2 pb-3 flex items-start gap-3">
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-white grid place-items-center"
          >
            {a.subCategoryImage ? (
              <img src={a.subCategoryImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <Bell className="h-7 w-7 text-amber-700" strokeWidth={2.4} />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-900/80">
                🔥 Naya Lead Aaya
              </p>
              <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-amber-900 border border-amber-300">
                <Clock className="h-2.5 w-2.5" /> {seconds}s
              </span>
            </div>
            <h4 className="font-display text-lg font-bold text-amber-950 leading-tight truncate">
              {a.subCategoryName}
            </h4>
            {a.customerName && (
              <p className="text-xs text-amber-900 mt-0.5 line-clamp-1 font-semibold">
                {a.customerName}
                {a.distanceKm != null && <span className="ml-1 font-normal">· 📍 {a.distanceKm} km</span>}
              </p>
            )}
            {a.customerPhoneMasked && (
              <p className="text-[11px] text-amber-900/80 mt-0.5">📞 {a.customerPhoneMasked}</p>
            )}
            {a.address && (
              <p className="text-[11px] text-amber-900/80 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {a.address}
              </p>
            )}
            {a.itemNames.length > 0 && (
              <p className="text-[11px] text-amber-900/80 mt-0.5 truncate">
                {a.itemNames.join(" · ")}
              </p>
            )}
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="h-7 w-7 grid place-items-center rounded-full bg-white/80 hover:bg-white text-amber-900 active:scale-90 flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {a.note && (
          <p className="px-4 -mt-1 pb-2 text-[11px] italic text-amber-900/90 line-clamp-2">
            “{a.note}”
          </p>
        )}

        <div className="relative px-4 pb-4 flex items-center gap-2">
          <button
            onClick={onSkip}
            className="flex-1 px-3 py-3 rounded-2xl bg-white/85 border border-amber-300 font-display font-bold text-sm text-amber-900 active:scale-[0.97]"
          >
            Skip
          </button>
          <button
            disabled={busy}
            onClick={onAccept}
            className="flex-[1.8] px-3 py-3 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-display font-bold text-sm shadow-[0_6px_18px_-2px_rgba(5,150,105,0.6)] active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
            {busy ? "Accepting…" : "Accept Lead"}
          </button>
        </div>
        {error && (
          <p className="relative px-4 pb-3 text-[11px] text-rose-700 font-semibold">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
