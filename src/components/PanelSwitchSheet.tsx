import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase, Store, Gift, LayoutDashboard, QrCode, ChevronRight, X,
  Zap, ShoppingBag, Users, ShieldCheck, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceMenu } from "@/hooks/use-service-menu";
import { writeActiveService } from "@/lib/service-menu";
import type { ApkTarget } from "@/components/ApkDownloadSheet";

export type PanelOption = {
  key: string;
  /** Active-service id persisted as the user's home workspace (null = don't persist). */
  serviceId: string | null;
  label: string;
  sub: string;
  icon: LucideIcon;
  accent: string;
  to: string;
  apk?: ApkTarget;
};

/**
 * Single source of truth for the "Switch Panel" / Quick Menu list.
 * Filters by the Super Admin service toggles and by the signed-in user's roles.
 */
export function usePanelOptions() {
  const { services, loading } = useServiceMenu();
  const [hasVendor, setHasVendor] = useState<boolean | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setHasVendor(false); return; }
        const [{ data: vendor }, { data: roleRows }] = await Promise.all([
          supabase.from("vendors").select("user_id").eq("user_id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
        ]);
        if (cancelled) return;
        setHasVendor(!!vendor);
        setRoles(((roleRows ?? []) as { role: string }[]).map((r) => r.role));
      } catch {
        if (!cancelled) setHasVendor(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const on = (id: string) => services.some((s) => s.id === id);
  const isAdmin = roles.some((r) => r === "admin" || r === "super_admin");
  const isStaff = roles.some((r) => ["staff", "support", "field_executive", "moderator"].includes(r));

  const options: PanelOption[] = [];

  if (on("vendor_panel")) {
    options.push({
      key: "vendor_panel",
      serviceId: "vendor_panel",
      label: hasVendor ? "Vendor Panel" : "Join as Vendor",
      sub: hasVendor ? "Open your business dashboard" : "Grow your business · get leads",
      icon: hasVendor ? LayoutDashboard : Briefcase,
      accent: "from-amber-400 to-orange-500",
      to: hasVendor ? "/vendor/dashboard" : "/vendor/register",
      apk: {
        title: hasVendor ? "Vendor Panel" : "Join as Vendor",
        to: hasVendor ? "/vendor/dashboard" : "/vendor/register",
        audience: "vendor",
        manifest: "/manifest-vendor.json",
        accent: "from-amber-400 to-orange-500",
      },
    });
  }

  if (on("digital_shop")) {
    options.push({
      key: "digital_shop",
      serviceId: "digital_shop",
      label: "Digital Dukaan",
      sub: "Browse all digital dukans near you",
      icon: Store,
      accent: "from-emerald-400 to-teal-600",
      to: "/vendors",
      apk: {
        title: "Digital Shop",
        to: "/vendors",
        audience: "customer",
        manifest: "/manifest-shop.json",
        accent: "from-emerald-400 to-teal-600",
      },
    });
  }

  if (on("quick")) {
    options.push({
      key: "quick",
      serviceId: "quick",
      label: "All Services",
      sub: "Nearby experts se turant kaam karwayein",
      icon: Zap,
      accent: "from-orange-400 to-rose-500",
      to: "/quick",
    });
  }

  options.push({
    key: "my_shop",
    serviceId: null,
    label: "My Shop",
    sub: "POS · inventory · products manage karein",
    icon: ShoppingBag,
    accent: "from-lime-500 to-emerald-600",
    to: "/vendor/shop",
  });

  if (on("digital_qr")) {
    options.push({
      key: "digital_qr",
      serviceId: "digital_qr",
      label: "QR Business",
      sub: "QR dashboard · themes · visitor count",
      icon: QrCode,
      accent: "from-sky-500 to-indigo-700",
      to: "/one-qr",
      apk: {
        title: "My QR Code",
        to: "/one-qr",
        audience: "oneqr",
        manifest: "/manifest-oneqr.json",
        accent: "from-sky-500 to-indigo-700",
      },
    });
  }

  options.push({
    key: "programs",
    serviceId: null,
    label: "All Programs",
    sub: "Referral program · downloads · rewards",
    icon: Gift,
    accent: "from-fuchsia-500 to-purple-700",
    to: "/referral",
    apk: {
      title: "All Programs",
      to: "/referral",
      audience: "customer",
      manifest: "/manifest-programs.json",
      accent: "from-fuchsia-500 to-purple-700",
    },
  });

  if (isStaff || isAdmin) {
    options.push({
      key: "staff",
      serviceId: null,
      label: "Staff Panel",
      sub: "Team operations & tasks",
      icon: Users,
      accent: "from-slate-500 to-slate-800",
      to: "/staff",
    });
  }

  if (isAdmin) {
    options.push({
      key: "admin",
      serviceId: null,
      label: "Super Admin Panel",
      sub: "Platform-wide control",
      icon: ShieldCheck,
      accent: "from-rose-500 to-red-700",
      to: "/admin",
    });
  }

  return { options, loading, hasVendor, isAdmin, isStaff };
}

/**
 * Bottom sheet with the full workspace switcher. Used from the Profile page
 * (every panel opens the same profile → same switcher).
 */
export function PanelSwitchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { options } = usePanelOptions();

  const go = (opt: PanelOption) => {
    if (opt.serviceId) writeActiveService(opt.serviceId);
    onClose();
    setTimeout(() => navigate({ to: opt.to as never }), 180);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-end"
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)] max-h-[88vh] flex flex-col"
          >
            <div className="pt-2 pb-1 grid place-items-center shrink-0">
              <span className="h-1.5 w-11 rounded-full bg-black/15" />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-2 shrink-0">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-[color:oklch(0.22_0.05_85)]">Switch Panel</h3>
                <p className="text-xs text-[color:oklch(0.5_0.05_85)]">Apna workspace chunein</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-6 space-y-2.5 overflow-y-auto overscroll-contain">
              {options.map((opt) => (
                <motion.button
                  key={opt.key}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => go(opt)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left shadow-[0_8px_22px_-16px_rgba(0,0,0,0.5)]"
                >
                  <span className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center bg-gradient-to-br ${opt.accent} text-white shadow-md`}>
                    <opt.icon className="h-6 w-6" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-slate-900">{opt.label}</span>
                    <span className="block truncate text-[12px] text-slate-500">{opt.sub}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
