import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Menu as MenuIcon, LayoutDashboard, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * ProfileHubSheet — opens from the center FAB of FloatingDockNav.
 * Two big options:
 *   1. Vendor Dashboard (if vendor row exists) OR Join Vendor
 *   2. Menu → /profile
 */
export function ProfileHubSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [hasVendor, setHasVendor] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHasVendor(false); return; }
        const { data } = await supabase.from("vendors").select("user_id").eq("user_id", user.id).maybeSingle();
        setHasVendor(!!data);
      } catch { setHasVendor(false); }
    })();
  }, [open]);

  const go = (to: string) => { onClose(); setTimeout(() => navigate({ to }), 180); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="font-display text-lg text-[color:oklch(0.22_0.05_85)] font-bold">Quick Menu</h3>
                <p className="text-xs text-[color:oklch(0.5_0.05_85)]">Where do you want to go?</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              <HubButton
                accent="from-amber-400 to-orange-500"
                icon={hasVendor ? LayoutDashboard : Briefcase}
                title={hasVendor ? "Vendor Dashboard" : "Join as Vendor"}
                sub={hasVendor ? "Open your business panel" : "Grow your business · get leads"}
                onClick={() => go(hasVendor ? "/vendor/dashboard" : "/vendor/register")}
              />
              <HubButton
                accent="from-slate-800 to-slate-950"
                icon={MenuIcon}
                title="Menu"
                sub="Profile · settings · orders · more"
                onClick={() => go("/profile")}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HubButton({
  icon: Icon, title, sub, onClick, accent,
}: { icon: typeof Briefcase; title: string; sub: string; onClick: () => void; accent: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 rounded-2xl border border-black/5 bg-white shadow-[0_6px_20px_-10px_rgba(0,0,0,0.25)] p-4 text-left active:shadow-md"
    >
      <span className={`h-12 w-12 shrink-0 rounded-xl grid place-items-center bg-gradient-to-br ${accent} text-white shadow-md`}>
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-display font-bold text-[15px] text-[color:oklch(0.22_0.05_85)] truncate">{title}</span>
        <span className="block text-[11px] text-[color:oklch(0.5_0.05_85)] truncate">{sub}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-[color:oklch(0.6_0.03_85)] shrink-0" />
    </motion.button>
  );
}
