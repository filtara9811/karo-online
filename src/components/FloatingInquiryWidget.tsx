import { useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, X, MessageCircle, Phone, CheckCircle2, Maximize2 } from "lucide-react";
import { useState } from "react";
import { useActiveInquiry } from "@/hooks/use-active-inquiry";
import { supabase } from "@/integrations/supabase/client";

/**
 * Picture-in-picture floating widget shown on Home / app routes when the
 * customer has an active vendor inquiry — either pending (radar minimized)
 * or approved (single vendor pill with chat/call shortcuts).
 *
 * Mounted globally in AppShell; renders nothing unless an inquiry is active
 * AND its sheet is minimized (`open: false`).
 */
export function FloatingInquiryWidget() {
  const { inquiry, set, clear } = useActiveInquiry();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Full sheet hides itself when minimized; the widget must remain visible on /quick too.
  if (!inquiry || inquiry.open) return null;
  if (location.pathname.startsWith("/chat") || location.pathname.startsWith("/admin")) return null;

  const approved = inquiry.approved;
  const isApproved = !!approved;

  const restore = () => {
    set({ ...inquiry, open: true });
    navigate({ to: "/quick" });
  };

  const cancelInquiry = async () => {
    try {
      await supabase
        .from("leads")
        .update({ status: "cancelled" })
        .eq("id", inquiry.leadId);
    } catch (e) { console.warn("cancel lead failed", e); }
    clear();
    setConfirmCancel(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="floating-inquiry"
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="fixed z-[70] right-3 max-w-[88vw]"
        style={{ bottom: location.pathname.startsWith("/quick") ? "calc(218px + env(safe-area-inset-bottom))" : "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <div className={`relative rounded-2xl shadow-[0_10px_30px_-8px_rgba(15,23,42,0.4)] border overflow-hidden backdrop-blur ${
          isApproved
            ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-300"
            : "bg-gradient-to-br from-[#fff8dc] to-white border-[color:oklch(0.78_0.14_82/0.55)]"
        }`}>
          {/* Header */}
          <button
            onClick={restore}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 pr-9 text-left active:scale-[0.98] transition"
            aria-label="Restore inquiry"
          >
            {isApproved ? (
              <img
                src={approved!.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"}
                alt=""
                className="h-10 w-10 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
              />
            ) : (
              <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] grid place-items-center flex-shrink-0 shadow">
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-amber-400"
                  animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <Radar className="h-5 w-5 text-white" strokeWidth={2.4} />
              </div>
            )}
            <div className="min-w-0">
              <p className={`font-display text-[13px] font-bold leading-tight truncate ${isApproved ? "text-emerald-800" : "text-amber-900"}`}>
                {isApproved ? approved!.name : `Finding · ${inquiry.category}`}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {isApproved
                  ? <>Approved {approved!.quoted_price ? `· ₹${approved!.quoted_price}` : ""}</>
                  : `${inquiry.vendorCount} vendor${inquiry.vendorCount === 1 ? "" : "s"} ready — tap to view`}
              </p>
            </div>
            <Maximize2 className="h-3.5 w-3.5 text-slate-400 ml-auto flex-shrink-0" />
          </button>

          {/* Close — for approved → only allows restore (handled in sheet). For pending → opens cancel confirm */}
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmCancel(true); }}
            aria-label="Cancel inquiry"
            className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-white/90 border border-slate-200 active:scale-90"
          >
            <X className="h-3 w-3 text-slate-600" />
          </button>

          {/* Action row for approved */}
          {isApproved && (
            <div className="px-2 pb-2 flex gap-1.5">
              <button
                onClick={() => navigate({ to: "/orders" })}
                className="flex-1 h-8 rounded-lg bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 active:scale-95"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> My Order
              </button>
              <button
                onClick={() => navigate({ to: "/orders" })}
                className="h-8 w-8 rounded-lg bg-white border border-sky-400 text-sky-700 grid place-items-center active:scale-95"
                aria-label="Chat"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
              {approved!.phone && (
                <a
                  href={`tel:${approved!.phone}`}
                  className="h-8 w-8 rounded-lg bg-white border border-emerald-400 text-emerald-700 grid place-items-center active:scale-95"
                  aria-label="Call"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Cancel confirm popover */}
        <AnimatePresence>
          {confirmCancel && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-white border border-slate-200 shadow-2xl p-3"
            >
              <p className="text-[12px] font-semibold text-slate-800">
                {isApproved ? "Approved order ko cancel karein?" : "Vendor search cancel karein?"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isApproved ? "Yeh order My Orders me bana rahega." : "Dobara request bhejni padegi."}
              </p>
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 h-7 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold active:scale-95"
                >
                  No, keep it
                </button>
                <button
                  onClick={cancelInquiry}
                  className="flex-1 h-7 rounded-md bg-red-500 text-white text-[11px] font-bold active:scale-95"
                >
                  Yes, cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
