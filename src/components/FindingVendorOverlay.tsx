import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, BadgeCheck, Sparkles, ThumbsDown, Search } from "lucide-react";

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
    document.body.style.overflow = "hidden";
    setActiveStep(0);
    // Tick each step every 900ms
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i + 1), (i + 1) * 900));
    });
    // Auto open vendor list after final tick
    timers.push(setTimeout(() => onComplete(), STEPS.length * 900 + 700));
    return () => {
      document.body.style.overflow = "";
      timers.forEach(clearTimeout);
    };
  }, [open, onComplete]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gradient-to-b from-white via-[#fffaf0] to-[#fef3c7]">
      {/* Header bar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between border-b border-[color:oklch(0.78_0.14_82/0.3)]">
        <button
          onClick={onClose}
          aria-label="Back"
          className="text-sm font-display font-bold text-[color:oklch(0.30_0.05_85)] underline underline-offset-2"
        >
          ‹ Back
        </button>
        <span className="text-[11px] font-display italic text-[color:oklch(0.45_0.08_85)]">
          Find vender | screen 3
        </span>
        <span className="h-7 w-7 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] grid place-items-center text-xs">?</span>
      </div>

      {/* Title card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-3 flex items-center gap-3 shadow-gold-glow"
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] grid place-items-center border border-[color:oklch(0.78_0.14_82/0.4)]">
          <Search className="h-6 w-6 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
            {category ?? "Service"} | service vendor
          </h3>
          <p className="text-[11px] text-[color:oklch(0.50_0.08_85)] mt-0.5">
            Searching live vendors near you…
          </p>
        </div>
      </motion.div>

      {/* Center hero illustration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* Pulsing rings */}
        <div className="relative h-48 w-48 grid place-items-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-2 border-[color:oklch(0.78_0.14_82/0.5)]"
              animate={{ scale: [0.6, 1.4], opacity: [0.7, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
            />
          ))}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-32 w-32 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#fbbf24] border-4 border-white shadow-[0_12px_30px_-8px_rgba(217,119,6,0.55)] grid place-items-center"
          >
            <Sparkles className="h-14 w-14 text-white drop-shadow" strokeWidth={2.2} />
            <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 border-2 border-white grid place-items-center shadow">
              <BadgeCheck className="h-4 w-4 text-white" strokeWidth={3} />
            </span>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={activeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 font-display text-base font-bold text-[color:oklch(0.30_0.05_85)] text-center"
          >
            {activeStep < STEPS.length
              ? `Connecting to ${STEPS[activeStep].label}…`
              : "Match found! Loading vendors…"}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress steps row */}
      <div className="flex-shrink-0 px-5 pb-8 pt-4">
        <div className="relative flex items-center justify-between">
          {/* Connecting line */}
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
    </div>
  );
}
