import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, Check, Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { IncomingLead } from "@/hooks/use-vendor-leads";

type Props = {
  alerts: IncomingLead[];
  onAccept: (leadId: string) => Promise<{ ok: boolean; reason?: string }>;
  onReject: (leadId: string) => Promise<void>;
  onDismiss: (notificationId: string) => void;
};

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
        sold_out: "Sold Out! This lead has been taken.",
        insufficient_balance: "Low wallet balance. Please recharge.",
        not_notified: "This lead is not for you.",
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
          <motion.div
            key={a.notificationId}
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
                background:
                  "linear-gradient(135deg, #fff8dc 0%, #fde68a 50%, #fbbf24 100%)",
              }}
            >
              <motion.span
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: [0.6, 0.2, 0.6] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{ background: "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.65), transparent 60%)" }}
              />
              <div className="relative p-3 flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0.6 }}
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  className="h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md flex-shrink-0"
                >
                  <Bell className="h-5 w-5" strokeWidth={2.4} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-900/70">
                    🔥 New Lead
                  </p>
                  <h4 className="font-display text-base font-bold text-amber-950 leading-tight truncate">
                    {a.subCategoryName} required
                  </h4>
                  {a.customerName && (
                    <p className="text-xs text-amber-900 mt-0.5">
                      {a.customerName}{a.address ? ` · ${a.address}` : ""}
                    </p>
                  )}
                  {a.itemNames.length > 0 && (
                    <p className="text-[11px] text-amber-900/80 mt-0.5 truncate">
                      {a.itemNames.join(" · ")}
                    </p>
                  )}
                  {a.note && (
                    <p className="text-[11px] italic text-amber-900/70 mt-0.5 line-clamp-2">"{a.note}"</p>
                  )}
                </div>
                <button
                  onClick={() => onDismiss(a.notificationId)}
                  aria-label="Dismiss"
                  className="h-7 w-7 grid place-items-center rounded-full bg-white/60 hover:bg-white text-amber-900 active:scale-90 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="relative px-3 pb-3 flex items-center gap-2">
                {a.customerPhone && (
                  <a
                    href={`tel:${a.customerPhone}`}
                    className="h-10 w-10 rounded-full grid place-items-center bg-emerald-500 text-white shadow-md active:scale-95"
                    aria-label="Call"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => onReject(a.leadId).catch(() => {})}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/80 border border-amber-300 font-display font-bold text-sm text-amber-900 active:scale-[0.97]"
                >
                  Skip
                </button>
                <button
                  disabled={busy === a.leadId}
                  onClick={() => handleAccept(a.leadId)}
                  className="flex-[1.4] px-3 py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-display font-bold text-sm shadow-[0_4px_14px_-2px_rgba(5,150,105,0.55)] active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                  {busy === a.leadId ? "Accepting…" : "Accept Lead"}
                </button>
              </div>
              {error && (
                <p className="relative px-3 pb-2 text-[11px] text-rose-700 font-semibold">{error}</p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
