import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, BadgeCheck, Sparkles, ThumbsDown, Search, X } from "lucide-react";

type Step = {
  key: string;
  label: string;
  km: string;
  tone: "gold" | "silver" | "basic" | "admin";
};

const STEPS: Step[] = [
  { key: "gold", label: "Gold vendor", km: "1.5 km", tone: "gold" },
  { key: "silver", label: "Selver | vendor", km: "3.5 km", tone: "silver" },
  { key: "basic", label: "Basic | vendor", km: "6.0 km", tone: "basic" },
  { key: "admin", label: "Admin | Request", km: "", tone: "admin" },
];

type Props = {
  open: boolean;
  category: string | null;
  onComplete: () => void;
  onClose: () => void;
};

export function FindingVendorOverlay({ open, category, onComplete, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i + 1), (i + 1) * 900));
    });
    timers.push(setTimeout(() => onComplete(), STEPS.length * 900 + 700));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, onComplete]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex items-end justify-center pointer-events-none">
      {/* Soft scrim only on lower portion so map stays visible */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-md bg-gradient-to-b from-white via-[#fffaf0] to-[#fef3c7] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] pointer-events-auto pb-[env(safe-area-inset-bottom)] flex flex-col"
        style={{ maxHeight: "70vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        {/* Header */}
        <div className="px-4 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] uppercase tracking-[0.25em] font-display font-bold text-[color:oklch(0.45_0.10_82)]">
            ✦ Finding ✦
          </span>
          <span className="text-[11px] font-display italic text-[color:oklch(0.45_0.08_85)]">
            Find vender | screen 3
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-3.5 w-3.5 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        {/* Title strip */}
        <div className="mx-4 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2.5 flex items-center gap-2.5 shadow-gold-glow flex-shrink-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] grid place-items-center border border-[color:oklch(0.78_0.14_82/0.4)]">
            <Search className="h-5 w-5 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] leading-tight truncate">
              {category ?? "Service"} | service vendor
            </h3>
            <p className="text-[10px] text-[color:oklch(0.50_0.08_85)]">
              Searching live vendors near you…
            </p>
          </div>
          {/* Inline pulsing badge */}
          <div className="relative h-10 w-10 grid place-items-center flex-shrink-0">
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-[color:oklch(0.78_0.14_82/0.5)]"
                animate={{ scale: [0.7, 1.3], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
              />
            ))}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-7 w-7 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#fbbf24] border-2 border-white shadow grid place-items-center"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
            </motion.div>
          </div>
        </div>

        {/* Status line */}
        <div className="px-5 pt-3 pb-1 flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="font-display text-sm font-bold text-[color:oklch(0.30_0.05_85)] text-center"
            >
              {activeStep < STEPS.length
                ? `Connecting to ${STEPS[activeStep].label}…`
                : "Match found! Loading vendors…"}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress steps */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-5 right-5 top-5 h-1 bg-[color:oklch(0.78_0.14_82/0.25)] rounded-full">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                initial={{ width: "0%" }}
                animate={{
                  width: `${Math.min(100, (activeStep / (STEPS.length - 1)) * 100)}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {STEPS.map((s, i) => {
              const done = i < activeStep;
              const current = i === activeStep;
              const isAdmin = s.tone === "admin";
              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center gap-1.5 w-1/4">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`h-10 w-10 rounded-2xl grid place-items-center border-2 shadow-md ${
                      done
                        ? "bg-emerald-500 border-emerald-600 text-white"
                        : current
                        ? isAdmin
                          ? "bg-red-500 border-red-600 text-white animate-pulse"
                          : "bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-[#d97706] text-white animate-pulse"
                        : "bg-white border-[color:oklch(0.78_0.14_82/0.4)] text-[color:oklch(0.50_0.08_85)]"
                    }`}
                  >
                    {done ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : isAdmin ? (
                      <ThumbsDown className="h-4 w-4" strokeWidth={2.4} />
                    ) : s.tone === "gold" ? (
                      <Star className="h-4 w-4" fill="currentColor" />
                    ) : s.tone === "silver" ? (
                      <Star className="h-4 w-4" />
                    ) : (
                      <BadgeCheck className="h-4 w-4" strokeWidth={2.4} />
                    )}
                  </motion.div>
                  <span className="text-[9px] font-display font-bold text-[color:oklch(0.30_0.05_85)] text-center leading-tight">
                    {s.label}
                  </span>
                  {s.km && (
                    <span className="text-[8px] text-[color:oklch(0.50_0.08_85)] -mt-1">{s.km}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
