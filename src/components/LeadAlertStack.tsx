import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Bell, Clock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { IncomingLead } from "@/hooks/use-vendor-leads";

type Props = {
  alerts: IncomingLead[];
  onAccept: (leadId: string) => Promise<{ ok: boolean; reason?: string }>;
  onReject: (leadId: string) => Promise<void>;
  onDismiss: (notificationId: string) => void;
};

const ALERT_WINDOW_MS = 90_000;

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

export function LeadAlertStack({ alerts, onAccept, onReject, onDismiss }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (leadId: string) => {
    setBusy(leadId);
    setError(null);
    const res = await onAccept(leadId);
    setBusy(null);
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

  return (
    <div className="fixed inset-x-0 top-0 z-[100] pointer-events-none flex flex-col items-center gap-2 pt-[env(safe-area-inset-top)] px-3">
      <AnimatePresence initial={false}>
        {alerts.map((a, idx) => (
          <LeadAlertCard
            key={a.notificationId}
            alert={a}
            idx={idx}
            busy={busy === a.leadId}
            error={busy === null ? error : null}
            onAccept={() => handleAccept(a.leadId)}
            onSkip={() => onReject(a.leadId).catch(() => {})}
            onDismiss={() => onDismiss(a.notificationId)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function LeadAlertCard({
  alert: a, idx, busy, error, onAccept, onSkip, onDismiss,
}: {
  alert: IncomingLead;
  idx: number;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  const remaining = useCountdown(a.expiresAt);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(1, remaining / ALERT_WINDOW_MS));

  // Auto-dismiss when timer ends
  useEffect(() => {
    if (remaining <= 0) onDismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  return (
    <motion.div
      layout
      initial={{ y: -120, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 - idx * 0.02 }}
      exit={{ y: -120, opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className="pointer-events-auto w-full max-w-md mt-2"
      style={{ zIndex: 100 - idx }}
    >
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-amber-300 shadow-[0_18px_48px_-12px_rgba(217,119,6,0.55)]"
        style={{
          background: "linear-gradient(135deg, #fff8dc 0%, #fde68a 50%, #fbbf24 100%)",
        }}
      >
        {/* Timer progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-200/60">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500"
            initial={false}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </div>

        <div className="relative p-3 flex items-start gap-3 pt-4">
          {/* Service image (sub-category) instead of plain bell */}
          <motion.div
            initial={{ scale: 0.6 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-white grid place-items-center"
          >
            {a.subCategoryImage ? (
              <img src={a.subCategoryImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <Bell className="h-6 w-6 text-amber-700" strokeWidth={2.4} />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-900/80">
                🔥 New Lead
              </p>
              <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/85 text-[10px] font-bold text-amber-900 border border-amber-300">
                <Clock className="h-2.5 w-2.5" /> {seconds}s
              </span>
            </div>
            <h4 className="font-display text-base font-bold text-amber-950 leading-tight truncate">
              {a.subCategoryName} required
            </h4>
            {a.customerName && (
              <p className="text-xs text-amber-900 mt-0.5 line-clamp-1">
                {a.customerName}{a.address ? ` · ${a.address}` : ""}
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
            className="h-7 w-7 grid place-items-center rounded-full bg-white/70 hover:bg-white text-amber-900 active:scale-90 flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative px-3 pb-3 flex items-center gap-2">
          <button
            onClick={onSkip}
            className="flex-1 px-3 py-2.5 rounded-xl bg-white/80 border border-amber-300 font-display font-bold text-sm text-amber-900 active:scale-[0.97]"
          >
            Skip
          </button>
          <button
            disabled={busy}
            onClick={onAccept}
            className="flex-[1.6] px-3 py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-display font-bold text-sm shadow-[0_4px_14px_-2px_rgba(5,150,105,0.55)] active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
            {busy ? "Accepting…" : "Accept Lead"}
          </button>
        </div>
        {error && (
          <p className="relative px-3 pb-2 text-[11px] text-rose-700 font-semibold">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
