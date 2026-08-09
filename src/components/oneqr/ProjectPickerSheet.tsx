import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Check, Store, Lock, Loader2 } from "lucide-react";
import type { QrProject } from "./QrProjectCard";

/**
 * Project picker: every QR project lives inside the create button. Selected
 * projects are the ones rendered on the home screen.
 */
export function ProjectPickerSheet({
  open, onClose, projects, selected, onToggle, onNew, priceInr, busy,
}: {
  open: boolean;
  onClose: () => void;
  projects: QrProject[];
  selected: string[];
  onToggle: (id: string) => void;
  onNew: () => void;
  priceInr: number;
  busy?: boolean;
}) {
  const paidNext = projects.length >= 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[150] bg-black/50"
          />
          <motion.section
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[151] max-h-[86vh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 pt-3 pb-2.5 border-b border-black/5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[15px] text-slate-900">My QR projects</p>
                <p className="text-[11px] text-slate-500">Jo select karenge wahi home screen par dikhega</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-2.5 pb-8">
              {projects.length === 0 && (
                <p className="text-[12px] text-slate-500 rounded-2xl border border-black/10 px-3 py-4">
                  Abhi koi project nahi — pehla project free banayein.
                </p>
              )}

              {projects.map((p, i) => {
                const on = selected.includes(p.id);
                const accent = p.accent_color || "#f59e0b";
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onToggle(p.id)}
                    className={`w-full flex items-center gap-3 rounded-3xl border px-3 py-2.5 text-left transition ${on ? "border-amber-400 bg-amber-50" : "border-black/10 bg-white"}`}
                  >
                    <span className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden grid place-items-center text-white" style={{ background: accent }}>
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
                      <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold grid place-items-center ring-2 ring-white">
                        {i + 1}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-bold text-slate-900">{p.business_name || p.title}</p>
                      <p className="truncate text-[11px] text-slate-500">/{p.slug}{p.is_paid ? " · paid" : " · free"}</p>
                    </div>
                    <span className={`h-8 w-8 shrink-0 grid place-items-center rounded-full ${on ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  </motion.button>
                );
              })}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onNew}
                disabled={!!busy}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display font-extrabold text-[14.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : paidNext ? <Lock className="h-4.5 w-4.5" /> : <Plus className="h-5 w-5" strokeWidth={3} />}
                {paidNext ? `New project — ₹${priceInr}` : "Create free project"}
              </motion.button>
              <p className="text-[10.5px] text-slate-500 text-center">
                Pehla project free · uske baad har project ₹{priceInr} (payment gateway se)
              </p>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
