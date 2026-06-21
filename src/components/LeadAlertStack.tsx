import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Bell, Clock, MapPin, Phone, Coins, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const last = digits.slice(-2);
  const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : "91";
  return `+${cc}-${digits.slice(-10, -7)}XXXXX${last}`;
}

/**
 * Half-screen bottom sheet lead alert. Vendor can:
 *  - Accept → goes to chat
 *  - Skip → rejects lead
 *  - X (dismiss) → collapses to floating bell button (above content), re-opens on tap
 */
export function LeadAlertStack({ alerts, onAccept, onReject, onDismiss }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficient, setInsufficient] = useState<{ leadId: string; reason: string } | null>(null);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (alerts.length === 0) stopLeadAlert();
  }, [alerts.length]);

  // Prune minimized set when alerts go away
  useEffect(() => {
    setMinimizedIds((prev) => {
      const active = new Set(alerts.map((a) => a.notificationId));
      const next = new Set<string>();
      prev.forEach((id) => { if (active.has(id)) next.add(id); });
      return next;
    });
  }, [alerts]);

  const handleAccept = async (leadId: string) => {
    setBusy(leadId);
    setError(null);
    const res = await onAccept(leadId);
    setBusy(null);
    stopLeadAlert();
    if (!res.ok) {
      if (res.reason === "insufficient_coins" || res.reason === "insufficient_balance") {
        setInsufficient({ leadId, reason: res.reason });
        return;
      }
      const map: Record<string, string> = {
        already_taken: "Sorry — slots already filled.",
        sold_out: "Sold Out! Lead taken.",
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

  const minimize = (notifId: string) => {
    stopLeadAlert();
    setMinimizedIds((p) => new Set(p).add(notifId));
  };

  const restore = (notifId: string) => {
    setMinimizedIds((p) => {
      const n = new Set(p); n.delete(notifId); return n;
    });
  };

  if (alerts.length === 0) return null;

  // Pick the first non-minimized alert as the active sheet
  const active = alerts.find((a) => !minimizedIds.has(a.notificationId));
  const minimizedAlerts = alerts.filter((a) => minimizedIds.has(a.notificationId));

  return (
    <>
      {/* Floating bell button(s) for minimized alerts — bottom right, above shell */}
      {minimizedAlerts.length > 0 && (
        <div className="fixed right-3 z-[95] flex flex-col gap-2 pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}>
          {minimizedAlerts.map((a) => (
            <FloatingLeadButton key={a.notificationId} alert={a} onClick={() => restore(a.notificationId)} />
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <AnimatePresence>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-[3px] pointer-events-auto"
              onClick={() => minimize(active.notificationId)}
            />
          </AnimatePresence>

          <AnimatePresence initial={false}>
            <LeadAlertSheet
              key={active.notificationId}
              alert={active}
              busy={busy === active.leadId}
              error={busy === null ? error : null}
              onAccept={() => handleAccept(active.leadId)}
              onSkip={() => handleSkip(active.leadId)}
              onDismiss={() => minimize(active.notificationId)}
              onExpire={() => onDismiss(active.notificationId)}
            />
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

function FloatingLeadButton({ alert: a, onClick }: { alert: IncomingLead; onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      onClick={onClick}
      className="pointer-events-auto relative h-14 w-14 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_8px_24px_-4px_rgba(217,119,6,0.75)] border-2 border-white grid place-items-center active:scale-95"
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-amber-400/60"
        animate={{ scale: [1, 1.4], opacity: [0.55, 0] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <Bell className="h-6 w-6 text-amber-900 relative z-10" strokeWidth={2.6} />
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center border border-white">
        {a.subCategoryName?.[0]?.toUpperCase() || "!"}
      </span>
    </motion.button>
  );
}

function LeadAlertSheet({
  alert: a, busy, error, onAccept, onSkip, onDismiss, onExpire,
}: {
  alert: IncomingLead;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onSkip: () => void;
  onDismiss: () => void;
  onExpire: () => void;
}) {
  const remaining = useCountdown(a.expiresAt);
  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(1, remaining / ALERT_WINDOW_MS));
  const phoneMasked = useMemo(() => maskPhone(a.customerPhone) ?? a.customerPhoneMasked ?? null, [a.customerPhone, a.customerPhoneMasked]);

  useEffect(() => {
    if (remaining <= 0) onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  const areaLine = (a.address || "").split(",").slice(0, 2).join(",").trim();

  return (
    <motion.div
      key={a.notificationId}
      initial={{ y: "110%" }}
      animate={{ y: 0 }}
      exit={{ y: "110%", transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="absolute inset-x-0 bottom-0 pointer-events-auto"
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-t-[28px] border-2 border-amber-300 shadow-[0_-24px_60px_-8px_rgba(217,119,6,0.55)]"
        style={{
          height: "55vh",
          minHeight: 460,
          background: "linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Top progress */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-100">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
            initial={false}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </div>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1.5 w-12 rounded-full bg-amber-700/30" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-amber-950">नए लीड का विवरण</h3>
          <button
            onClick={onDismiss}
            aria-label="Minimize"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-amber-200 text-amber-900 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bell centered */}
        <div className="flex justify-center -mt-1 mb-3">
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: [1, 1.08, 1], rotate: [0, -8, 8, -6, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-16 w-16 rounded-2xl bg-white border-2 border-amber-300 shadow-md grid place-items-center"
          >
            <Bell className="h-8 w-8 text-amber-700" strokeWidth={2.4} />
            <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white shadow border border-amber-300 text-[10px] font-bold text-amber-900">
              <Clock className="h-2.5 w-2.5" /> {seconds}s
            </span>
          </motion.div>
        </div>

        <div className="px-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(55vh - 220px)" }}>
          {/* Customer card */}
          <div className="rounded-2xl border border-amber-200 bg-white p-3 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-amber-300 bg-amber-50 flex-shrink-0">
              {a.customerAvatarUrl ? (
                <img src={a.customerAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-amber-700 font-bold text-lg">
                  {a.customerName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-base text-amber-950 truncate">
                {a.customerName || "Customer"}
              </p>
              {phoneMasked && (
                <p className="text-xs text-amber-900/80 mt-0.5 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {phoneMasked}
                </p>
              )}
              {(areaLine || a.distanceKm != null) && (
                <p className="text-xs text-amber-900/80 mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {areaLine || "Nearby"}{a.distanceKm != null && ` · ${a.distanceKm} km`}
                </p>
              )}
            </div>
          </div>

          {/* Service card */}
          <div className="rounded-2xl border border-amber-200 bg-white p-3 flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl overflow-hidden border border-amber-200 bg-amber-50 flex-shrink-0 grid place-items-center">
              {a.subCategoryImage ? (
                <img src={a.subCategoryImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-amber-700">Service</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-700/80">प्रार्थित सेवा</p>
              <p className="font-display font-bold text-base text-amber-950 leading-tight">
                {a.subCategoryName}
              </p>
              {a.itemNames.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {a.itemNames.slice(0, 4).map((n, i) => (
                    <li key={i} className="text-xs text-amber-900/85 truncate">• {n}</li>
                  ))}
                </ul>
              )}
              {a.note && (
                <p className="mt-1.5 text-[11px] italic text-amber-900/75 line-clamp-2">"{a.note}"</p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="absolute left-0 right-0 bottom-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-gradient-to-t from-amber-50 via-amber-50/95 to-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="flex-1 px-3 py-3.5 rounded-2xl bg-white border border-amber-300 font-display font-bold text-sm text-amber-900 active:scale-[0.97]"
            >
              Skip
            </button>
            <button
              disabled={busy}
              onClick={onAccept}
              className="flex-[1.8] px-3 py-3.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-display font-bold text-sm shadow-[0_6px_18px_-2px_rgba(5,150,105,0.6)] active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {busy ? "Accepting…" : "Accept Lead"}
            </button>
          </div>
          {error && (
            <p className="px-1 pt-2 text-[11px] text-rose-700 font-semibold">{error}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
