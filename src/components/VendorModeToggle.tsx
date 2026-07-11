import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Top-right "Join Business / Vendor ON-OFF" pill.
 * - New users (no vendor row) → "Join Business" → /vendor/register
 * - Existing vendors → slide toggle between Customer (/quick) and Vendor (/vendor/dashboard)
 *
 * `mode` is the current side: "customer" on /quick, "vendor" on /vendor/dashboard.
 * The toggle position reflects this; sliding flips the route.
 */
const CACHE_KEY = "ko-vendor-mode-v1";

type VendorState = "unknown" | "none" | "vendor";

function readCached(): VendorState {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(CACHE_KEY);
    if (v === "none" || v === "vendor") return v;
  } catch {}
  return "unknown";
}

function writeCached(v: VendorState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CACHE_KEY, v); } catch {}
}

export function VendorModeToggle({ mode }: { mode: "customer" | "vendor" }) {
  const navigate = useNavigate();
  // Always start "unknown" on SSR + first client render to avoid a
  // hydration mismatch (localStorage isn't available on the server).
  const [state, setState] = useState<VendorState>("unknown");

  useEffect(() => {
    // Hydrate synchronously from localStorage after mount.
    const cached = readCached();
    if (cached !== "unknown") setState(cached);
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) { setState("none"); writeCached("none"); } return; }
        const { data } = await supabase.from("vendors").select("user_id").eq("user_id", user.id).maybeSingle();
        if (cancelled) return;
        const next: VendorState = data ? "vendor" : "none";
        setState(next);
        writeCached(next);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // New user / no vendor profile → Join Business CTA
  if (state !== "vendor") {
    return (
      <button
        onClick={() => navigate({ to: "/vendor/join" })}
        aria-label="Join Business"
        className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-2 border-[color:oklch(0.78_0.14_82/0.7)] shadow-[0_4px_12px_-2px_rgba(212,175,55,0.5)] active:scale-95 transition"
      >
        <span className="h-6 w-6 rounded-full bg-white/80 grid place-items-center">
          <Store className="h-3.5 w-3.5 text-[color:oklch(0.35_0.12_60)]" strokeWidth={2.4} />
        </span>
        <span className="text-[10px] font-display font-bold leading-none text-[color:oklch(0.30_0.05_85)]">
          Join<br/>Business
        </span>
      </button>
    );
  }

  // Existing vendor → on/off slider
  const isVendor = mode === "vendor";
  const toggle = () => {
    if (isVendor) navigate({ to: "/quick" });
    else navigate({ to: "/vendor/dashboard" });
  };
  return (
    <button
      onClick={toggle}
      aria-label={isVendor ? "Switch to customer mode" : "Switch to vendor mode (open shop)"}
      className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white border-2 border-[color:oklch(0.78_0.14_82/0.7)] shadow-[0_4px_12px_-2px_rgba(212,175,55,0.5)] active:scale-95 transition"
    >
      {/* Slider track */}
      <span className="relative h-6 w-11 rounded-full bg-gradient-to-r from-[#fdf3c8] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)]">
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full grid place-items-center text-white text-[9px] font-bold transition-all duration-300 ${
            isVendor
              ? "left-[22px] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_2px_6px_rgba(16,185,129,0.5)]"
              : "left-0.5 bg-gradient-to-br from-[#e08820] to-[#c2410c] shadow-[0_2px_6px_rgba(194,65,12,0.5)]"
          }`}
        >
          {isVendor ? "ON" : ""}
          {!isVendor && <Store className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>
      </span>
      <span className="text-[9px] font-display font-bold leading-tight text-[color:oklch(0.30_0.05_85)] uppercase tracking-wider">
        {isVendor ? <>Shop<br/>ON</> : <>Open<br/>Shop</>}
      </span>
    </button>
  );
}
