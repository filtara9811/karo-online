import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Sparkles, Link2 } from "lucide-react";
import { SheetShell } from "./SheetShell";
import { ServiceDetailSheet } from "./ServiceDetailSheet";
import {
  SERVICES, loadServiceState, saveServiceState,
  type ServiceDef, type ServiceKey, type ServiceState,
} from "./services-catalog";

/**
 * Services & Plugins bottom sheet for a One QR project.
 * Lists every plug-in with an Activate status; tapping one opens the
 * detail sheet (video tutorial → settings → pricing/activate).
 */
export function ServicesPluginsSheet({
  open, onClose, projectId, projectTitle, accent = "#f59e0b", onManageLinks,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  accent?: string;
  onManageLinks?: () => void;
}) {
  const [state, setState] = useState<ServiceState>(() => loadServiceState(projectId));
  const [detail, setDetail] = useState<ServiceDef | null>(null);

  useEffect(() => { if (open) setState(loadServiceState(projectId)); }, [open, projectId]);

  const patch = (next: ServiceState) => { setState(next); saveServiceState(projectId, next); };

  const activate = (key: ServiceKey, plan: "monthly" | "yearly") =>
    patch({ ...state, active: { ...state.active, [key]: { plan, at: new Date().toISOString() } } });

  const deactivate = (key: ServiceKey) => {
    const active = { ...state.active };
    delete active[key];
    patch({ ...state, active });
  };

  return (
    <>
      <SheetShell
      section="services"
        open={open}
        onClose={onClose}
        title="Services & Plugins"
        subtitle={projectTitle ? `${projectTitle} ke liye add-ons` : "Apni shop ko super-charge karein"}
      >
        <div className="space-y-2.5">
          {onManageLinks && (
            <button
              onClick={onManageLinks}
              className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-left active:scale-[0.99]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
                <Link2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-slate-900">Manage shop links</span>
                <span className="block text-[11px] text-slate-500">Social, payment, shop & custom links</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          )}

          {SERVICES.map((s, i) => {
            const on = !!state.active[s.key];
            return (
              <motion.button
                key={s.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i, type: "spring", stiffness: 320, damping: 28 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setDetail(s)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
                  on ? "border-transparent text-white shadow-md" : "border-amber-200 bg-white"
                }`}
                style={on ? { background: `linear-gradient(135deg, ${accent}, #f97316)` } : undefined}
              >
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl ${
                    on ? "bg-white/20" : "bg-amber-50"
                  }`}
                >
                  {s.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14.5px] font-bold leading-tight ${on ? "text-white" : "text-slate-900"}`}>
                    {s.name}
                  </span>
                  <span className={`mt-0.5 block truncate text-[11px] ${on ? "text-white/85" : "text-slate-500"}`}>
                    {s.tagline}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                    on ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {on ? (
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Active</span>
                  ) : s.free ? "Free" : "Activate"}
                </span>
              </motion.button>
            );
          })}

          <p className="pt-1 text-center text-[10.5px] text-slate-400">
            <Sparkles className="mr-1 inline h-3 w-3 text-amber-500" />
            Har plugin instantly on/off kar sakte hain
          </p>
        </div>
      </SheetShell>

      <ServiceDetailSheet
        service={detail}
        onClose={() => setDetail(null)}
        accent={accent}
        state={state}
        onActivate={activate}
        onDeactivate={deactivate}
        onVoiceChange={(voice) => patch({ ...state, voice })}
        onGmbUrl={(gmbUrl) => patch({ ...state, gmbUrl })}
      />
    </>
  );
}
