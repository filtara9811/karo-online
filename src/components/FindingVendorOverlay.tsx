import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, BadgeCheck, Sparkles, Search, X, Radar } from "lucide-react";

type Step = {
  key: string;
  label: string;
  km: string;
  tone: "gold" | "silver" | "basic" | "vendor";
};

const STEPS: Step[] = [
  { key: "near", label: "0–1 km", km: "10 sec", tone: "gold" },
  { key: "three", label: "3 km", km: "10 sec", tone: "silver" },
  { key: "five", label: "5 km", km: "10 sec", tone: "basic" },
  { key: "ten", label: "10 km", km: "10 sec", tone: "vendor" },
];

const STEP_MS = 10_000;

type Props = {
  open: boolean;
  category: string | null;
  onComplete: () => void;
  onClose: () => void;
};

export function FindingVendorOverlay({ open, category, onComplete, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  // Hide the global BottomActionBar while finder is on screen
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.dataset.finderOpen = "1";
    } else {
      delete document.body.dataset.finderOpen;
    }
    return () => {
      delete document.body.dataset.finderOpen;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i + 1), (i + 1) * STEP_MS));
    });
    timers.push(setTimeout(() => onComplete(), STEPS.length * STEP_MS + 500));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, onComplete]);

  if (!open) return null;

  const progressPct = Math.min(100, (activeStep / (STEPS.length - 1)) * 100);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex items-end justify-center pointer-events-none">
      {/* Soft scrim */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/15 to-transparent pointer-events-auto"
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
        className="relative w-full max-w-md bg-gradient-to-b from-white via-[#fffaf0] to-[#fef3c7] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] pointer-events-auto pb-[env(safe-area-inset-bottom)] flex flex-col overflow-hidden"
        style={{ height: "90vh", maxHeight: "90vh" }}
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
            Find vendor · live broadcast
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
              Broadcasting your request to nearby vendors…
            </p>
          </div>
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

        {/* MAIN — big radar / find animation */}
        <div className="flex-1 min-h-0 px-5 pt-4 pb-2 grid place-items-center relative">
          <div className="relative h-full w-full max-w-[280px] aspect-square mx-auto grid place-items-center">
            {/* Radar concentric rings */}
            {[0, 0.5, 1, 1.5].map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="absolute inset-0 m-auto rounded-full border-2"
                style={{
                  borderColor: "oklch(0.78 0.14 82 / 0.55)",
                  animation: `finder-radar 2.4s cubic-bezier(0.22,1,0.36,1) ${delay}s infinite`,
                  width: "100%",
                  height: "100%",
                }}
              />
            ))}

            {/* Faint grid circles */}
            {[0.3, 0.55, 0.8].map((s) => (
              <span
                key={s}
                aria-hidden
                className="absolute rounded-full border border-dashed border-[color:oklch(0.78_0.14_82/0.35)]"
                style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
              />
            ))}

            {/* Rotating sweep beam */}
            <span
              aria-hidden
              className="absolute inset-0 m-auto rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, oklch(0.78 0.14 82 / 0.45) 35deg, transparent 80deg, transparent 360deg)",
                animation: "finder-orbit 2.6s linear infinite",
                maskImage: "radial-gradient(circle, black 60%, transparent 70%)",
                WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 70%)",
              }}
            />

            {/* Floating vendor dots around */}
            {[
              { x: "18%", y: "30%", d: 0 },
              { x: "78%", y: "22%", d: 0.4 },
              { x: "82%", y: "70%", d: 0.8 },
              { x: "22%", y: "76%", d: 1.2 },
            ].map((d, i) => (
              <span
                key={i}
                className="absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                style={{
                  left: d.x,
                  top: d.y,
                  animation: `finder-ping-dot 1.6s ease-in-out ${d.d}s infinite`,
                }}
              />
            ))}

            {/* Center pulsing badge */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[#fff8dc] via-[#fbbf24] to-[#d97706] border-4 border-white shadow-[0_8px_24px_-4px_rgba(212,175,55,0.7)] grid place-items-center z-10"
            >
              <Radar className="h-9 w-9 text-white" strokeWidth={2.2} />
            </motion.div>

            {/* Status pill */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-3 py-1.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow font-display text-[11px] font-bold text-[color:oklch(0.30_0.05_85)] whitespace-nowrap"
                >
                  {activeStep < STEPS.length
                    ? `Finding vendors in ${STEPS[activeStep].label} radius…`
                    : "Match found! Loading vendors…"}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Progress steps — slim, centered, smooth */}
        <div className="flex-shrink-0 px-5 pb-6 pt-2">
          <div className="relative flex items-start justify-between">
            {/* Hairline track — centered behind the 28px circles (top: 14px - half of h-0.5 = 13px) */}
            <div
              className="absolute left-0 right-0 h-[2px] bg-[color:oklch(0.78_0.14_82/0.22)] rounded-full overflow-hidden"
              style={{ top: "13px" }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-[#d4af37] to-emerald-600"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            {STEPS.map((s, i) => {
              const done = i < activeStep;
              const current = i === activeStep;
              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center gap-1.5 w-1/4">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: current ? 1.08 : 1, opacity: 1 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 240, damping: 20 }}
                    className={`relative h-7 w-7 rounded-full grid place-items-center border-2 shadow-sm ${
                      done
                        ? "bg-emerald-500 border-emerald-600 text-white"
                        : current
                        ? "bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-[#d97706] text-white"
                        : "bg-white border-[color:oklch(0.78_0.14_82/0.45)] text-[color:oklch(0.50_0.08_85)]"
                    }`}
                  >
                    {current && (
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full border-2 border-[#d4af37]"
                        style={{ animation: "ping-slow 1.6s ease-out infinite" }}
                      />
                    )}
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : s.tone === "vendor" ? (
                      <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                    ) : s.tone === "gold" ? (
                      <Star className="h-3.5 w-3.5" fill="currentColor" />
                    ) : s.tone === "silver" ? (
                      <Star className="h-3.5 w-3.5" />
                    ) : (
                      <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                    )}
                  </motion.div>
                  <span className="text-[10px] font-display font-bold text-[color:oklch(0.30_0.05_85)] text-center leading-tight">
                    {s.label}
                  </span>
                  {s.km && (
                    <span className="text-[9px] text-[color:oklch(0.50_0.08_85)] -mt-1">{s.km}</span>
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
