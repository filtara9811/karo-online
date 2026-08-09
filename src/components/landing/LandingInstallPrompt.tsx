import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Download, X, Share2, CheckCircle2, Zap, WifiOff, Home } from "lucide-react";

type Props = {
  open: boolean;
  name: string;
  icon?: string | null;
  accent: string;
  isIOS: boolean;
  onClose: () => void;
  onInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

/**
 * White-label install popup shown when a customer opens a merchant shop link.
 * Installing gives them a home-screen icon with the merchant's own name/logo.
 */
export function LandingInstallPrompt({
  open,
  name,
  icon,
  accent,
  isIOS,
  onClose,
  onInstall,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "installing" | "done" | "manual">("idle");

  useEffect(() => {
    if (phase !== "installing") return;
    const t = setInterval(() => {
      setProgress((p) => (p >= 94 ? 94 : p + Math.random() * 11 + 4));
    }, 180);
    return () => clearInterval(t);
  }, [phase]);

  const start = async () => {
    setPhase("installing");
    setProgress(6);
    const r = await onInstall();
    if (r === "accepted") {
      setProgress(100);
      setPhase("done");
      setTimeout(onClose, 1600);
    } else if (r === "unavailable") {
      setPhase("manual");
    } else {
      setPhase("idle");
      setProgress(0);
    }
  };

  const letter = (name || "S").trim().charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 backdrop-blur-sm"
          onClick={() => phase !== "installing" && onClose()}
        >
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 140, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-3xl border border-white/60 bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl"
          >
            <div
              className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl"
              style={{ background: `linear-gradient(90deg, ${accent}, #ffffff00)` }}
            />
            {phase !== "installing" && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-center gap-3">
              <motion.div
                animate={phase === "installing" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 1.2, repeat: phase === "installing" ? Infinity : 0 }}
                className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl shadow-lg"
                style={{ background: `linear-gradient(160deg, ${accent}, #111827)` }}
              >
                {icon ? (
                  <img src={icon} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-extrabold text-white">{letter}</span>
                )}
              </motion.div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                  Free App
                </p>
                <h3 className="truncate text-lg font-extrabold text-slate-900">{name}</h3>
                <p className="text-xs text-slate-500">
                  {phase === "done"
                    ? "Installed on your home screen"
                    : "Add to your home screen — 1 tap, no Play Store"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Home, label: "Own icon" },
                { icon: Zap, label: "Fast open" },
                { icon: WifiOff, label: "Low data" },
              ].map((b) => (
                <div key={b.label} className="rounded-xl bg-slate-50 px-2 py-2.5">
                  <b.icon className="mx-auto mb-1 h-4 w-4" style={{ color: accent }} />
                  <p className="text-[11px] font-semibold text-slate-600">{b.label}</p>
                </div>
              ))}
            </div>

            {(phase === "installing" || phase === "done") && (
              <div className="mt-4">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${accent}, #f59e0b)` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.3 }}
                  />
                </div>
                <p className="mt-2 text-center text-xs font-bold text-slate-600">
                  {phase === "done" ? "Installed!" : `Installing… ${Math.round(progress)}%`}
                </p>
              </div>
            )}

            {phase === "done" ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Home screen par check karein
              </div>
            ) : isIOS ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="mb-1 flex items-center gap-2 font-bold">
                  <Share2 className="h-4 w-4" /> iPhone steps:
                </p>
                <ol className="list-inside list-decimal space-y-1 text-xs">
                  <li>Safari me niche <b>Share</b> button dabaayein</li>
                  <li><b>Add to Home Screen</b> par tap karein</li>
                  <li><b>Add</b> dabaayein — “{name}” install ho jayega</li>
                </ol>
              </div>
            ) : phase === "manual" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                Browser menu (⋮) khol ke <b>Install app</b> ya <b>Add to Home screen</b> par tap
                karein.
              </div>
            ) : (
              <button
                onClick={start}
                disabled={phase === "installing"}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white shadow-xl transition active:scale-95 disabled:opacity-70"
                style={{ background: `linear-gradient(180deg, ${accent}, #111827)` }}
              >
                <Download className="h-5 w-5" />
                {phase === "installing" ? "Installing…" : `Install ${name}`}
              </button>
            )}

            {phase === "idle" && (
              <button
                onClick={onClose}
                className="mt-2 w-full py-2 text-xs font-semibold text-slate-400"
              >
                Not now
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
