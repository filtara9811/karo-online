import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, Headphones, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceMenu } from "@/hooks/use-service-menu";
import type { ServiceDef } from "@/lib/service-menu";

/**
 * Post-OTP "Service Selection Menu".
 *
 * Shown right after signup AND on every re-login (existing users skip the
 * registration form). Only services the Super Admin has toggled ON appear.
 * Picking a tile routes straight into that service's dashboard.
 */
export function ServiceMenuScreen({ onPick }: { onPick: (route: string) => void }) {
  const { services, loading } = useServiceMenu();
  const [hasVendor, setHasVendor] = useState<boolean | null>(null);
  const autoPicked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setHasVendor(false); return; }
        const { data } = await supabase.from("vendors").select("user_id").eq("user_id", user.id).maybeSingle();
        if (!cancelled) setHasVendor(!!data);
      } catch {
        if (!cancelled) setHasVendor(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const routeFor = (s: ServiceDef) =>
    s.id === "vendor_panel" ? (hasVendor ? "/vendor/dashboard" : "/vendor/join") : s.route;

  // Single enabled service → skip the menu entirely.
  useEffect(() => {
    if (loading || autoPicked.current) return;
    if (services.length === 1 && hasVendor !== null) {
      autoPicked.current = true;
      onPick(routeFor(services[0]));
    }
  }, [loading, services, hasVendor, onPick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <main className="fixed inset-0 z-[70] grid place-items-center" style={{ background: "linear-gradient(180deg,#f6f0dd 0%,#fbf5e4 40%,#ffffff 100%)" }}>
        <Loader2 className="h-6 w-6 animate-spin text-[color:oklch(0.55_0.12_75)]" />
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 z-[70] overflow-y-auto"
      style={{ background: "linear-gradient(180deg,#f6f0dd 0%,#fbf5e4 40%,#ffffff 100%)" }}
    >
      <div className="pt-14 pb-2 px-6 text-center">
        <div className="inline-flex items-center gap-2">
          <span className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm">
            <span className="text-[color:oklch(0.35_0.12_60)] font-bold text-lg">K</span>
          </span>
          <h1 className="text-3xl font-display font-bold text-[color:oklch(0.30_0.05_85)]">Karo Online</h1>
        </div>
      </div>

      <div className="px-6 text-center mb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:oklch(0.78_0.14_82)]/60" />
        <h2 className="text-[22px] leading-[1.25] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
          Aap kya karna chahte hain?
        </h2>
        <p className="mt-2 text-[15px] text-[color:oklch(0.45_0.03_85)] leading-snug">
          Apna service chunein — seedhe uske dashboard par pahunch jayein
        </p>
      </div>

      <div className="px-5 flex flex-col gap-3.5 pb-4">
        {services.length === 0 ? (
          <div className="rounded-2xl border border-[color:oklch(0.85_0.08_85)] bg-white/70 p-6 text-center">
            <p className="text-sm font-semibold text-[color:oklch(0.30_0.05_85)]">
              Abhi koi service available nahi hai. Thodi der baad try karein.
            </p>
          </div>
        ) : (
          services.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, type: "spring", damping: 22, stiffness: 260 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => onPick(routeFor(s))}
              aria-label={s.label}
              className="w-full text-left rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl p-4 flex items-center gap-3.5 shadow-[0_10px_28px_-14px_rgba(120,90,20,0.45)]"
            >
              <span className={`h-14 w-14 shrink-0 rounded-2xl grid place-items-center bg-gradient-to-br ${s.accent} text-white shadow-md`}>
                <s.icon className="h-6.5 w-6.5" strokeWidth={2.2} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[17px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">
                  {s.id === "vendor_panel" && hasVendor === false ? "Vendor Panel · Join" : s.label}
                </span>
                <span className="block text-[13px] text-[color:oklch(0.45_0.03_85)] leading-snug mt-0.5">{s.sub}</span>
              </span>
              <span className="h-10 w-10 rounded-full grid place-items-center bg-[color:oklch(0.78_0.14_82)] text-white shrink-0">
                <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
              </span>
            </motion.button>
          ))
        )}
      </div>

      <div className="mt-4 mb-10 px-4 grid grid-cols-3 gap-2 text-center">
        {[
          { icon: ShieldCheck, title: "Trusted Platform", sub: "100% Verified Professionals" },
          { icon: Headphones, title: "24x7 Support", sub: "Har waqt aapke saath" },
          { icon: Lock, title: "Safe & Secure", sub: "Aapki suraksha hamari zimmedari" },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex flex-col items-center gap-1">
            <Icon className="h-6 w-6 text-[color:oklch(0.55_0.12_75)]" strokeWidth={2} />
            <span className="text-[12px] font-display font-bold text-[color:oklch(0.20_0.03_85)]">{title}</span>
            <span className="text-[11px] text-[color:oklch(0.50_0.03_85)] leading-tight">{sub}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
