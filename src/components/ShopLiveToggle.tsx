import { useEffect, useState } from "react";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * On/Off switch shown at the top of the vendor's digital shop page.
 * Writes vendors.is_online — when ON, the shop appears in the customer-side
 * "All Digital Shops" list. When OFF, customers won't see it.
 *
 * When `redirectOnEnable` is true, flipping ON also navigates the user to
 * the vendor panel (`/vendor/shop`) so they can manage products immediately.
 */
export function ShopLiveToggle({ redirectOnEnable = false }: { redirectOnEnable?: boolean } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("is_online")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancel && data) setLive(Boolean((data as any).is_online));
    })();
    return () => { cancel = true; };
  }, [user]);

  const toggle = async () => {
    if (!user || busy) return;
    setBusy(true);
    const next = !live;
    setLive(next);
    const { error } = await supabase
      .from("vendors")
      .update({ is_online: next })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      setLive(!next);
      toast.error("Could not update: " + error.message);
      return;
    }
    toast.success(next ? "Shop is LIVE — visible to customers" : "Shop is OFF — hidden from customers");
    if (next && redirectOnEnable) {
      setTimeout(() => navigate({ to: "/vendor/shop" }), 200);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={live}
      className={`flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 border shadow-sm active:scale-95 transition-colors ${
        live
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400 text-white"
          : "bg-white border-[color:oklch(0.72_0.01_260/0.5)] text-[color:oklch(0.42_0.01_260)]"
      }`}
    >
      <span
        className={`h-6 w-10 rounded-full relative transition-colors ${
          live ? "bg-white/30" : "bg-[color:oklch(0.86_0.01_260)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow grid place-items-center transition-all ${
            live ? "left-[18px]" : "left-0.5"
          }`}
        >
          <Power className={`h-3 w-3 ${live ? "text-emerald-600" : "text-[color:oklch(0.55_0.01_260)]"}`} strokeWidth={2.8} />
        </span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {live ? "Shop Live" : "Shop Off"}
      </span>
    </button>
  );
}
