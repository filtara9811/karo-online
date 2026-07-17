import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, RotateCcw, X } from "lucide-react";

export type SubmitPhase = "submitting" | "success" | "error";

type Props = {
  open: boolean;
  phase: SubmitPhase;
  category?: string | null;
  variation?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
};

export function SubmittingRequestOverlay({
  open,
  phase,
  category,
  variation,
  errorMessage,
  onRetry,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] grid place-items-center bg-black/45 backdrop-blur-sm px-6"
          role="dialog"
          aria-modal="true"
          aria-live="polite"
        >
          <motion.div
            initial={{ y: 20, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Status icon */}
            <div className="relative pt-8 pb-4 grid place-items-center">
              {phase === "submitting" && (
                <>
                  {[0, 1].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute top-8 h-20 w-20 rounded-full border-2 border-orange-300"
                      animate={{ scale: [0.8, 1.5], opacity: [0.6, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                    />
                  ))}
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 grid place-items-center shadow-lg">
                    <Loader2 className="h-9 w-9 text-white animate-spin" strokeWidth={2.4} />
                  </div>
                </>
              )}
              {phase === "success" && (
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [0.5, 1.15, 1] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center shadow-lg"
                >
                  <CheckCircle2 className="h-11 w-11 text-white" strokeWidth={2.4} />
                </motion.div>
              )}
              {phase === "error" && (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 grid place-items-center shadow-lg">
                  <AlertCircle className="h-11 w-11 text-white" strokeWidth={2.4} />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="px-6 pb-2 text-center">
              <h3 className="text-base font-bold text-slate-900">
                {phase === "submitting" && "Sending your request…"}
                {phase === "success" && "Request submitted ✓"}
                {phase === "error" && "Couldn't send request"}
              </h3>
              <p className="mt-1 text-[13px] text-slate-600 leading-snug">
                {phase === "submitting" && (
                  <>Please wait while we submit your <span className="font-semibold text-slate-800">{category ?? "service"}</span> request.</>
                )}
                {phase === "success" && (
                  <>Broadcasting to nearby vendors now. Opening live status…</>
                )}
                {phase === "error" && (errorMessage || "Something went wrong. Please try again.")}
              </p>
              {(category || variation) && phase !== "error" && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-semibold text-orange-700">
                  {category}{variation ? ` · ${variation}` : ""}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 pt-4">
              {phase === "error" ? (
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm active:scale-95 transition-transform inline-flex items-center justify-center gap-1.5"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    onClick={onRetry}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm active:scale-95 transition-transform inline-flex items-center justify-center gap-1.5 shadow"
                  >
                    <RotateCcw className="h-4 w-4" /> Retry
                  </button>
                </div>
              ) : (
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${phase === "success" ? "bg-emerald-500" : "bg-gradient-to-r from-orange-400 to-orange-600"}`}
                    initial={{ width: "10%" }}
                    animate={{ width: phase === "success" ? "100%" : ["10%", "85%", "60%", "90%"] }}
                    transition={phase === "success"
                      ? { duration: 0.4 }
                      : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
