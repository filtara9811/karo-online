import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Coins, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type WalletInfo = { leadx_coins: number; service_balance_paise: number };

/**
 * Compact premium strip shown on the vendor home dashboard.
 * Surfaces the live LeadX coin rate (₹/coin), the vendor's own coin balance,
 * and the typical lead price band — so vendors instantly know what each lead
 * will cost before they accept the bottom-sheet popup.
 */
export function LeadPricingStrip() {
  const { user } = useAuth();
  const [rate, setRate] = useState<number>(0);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [avgCoins, setAvgCoins] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: rateRow }, { data: cats }] = await Promise.all([
        supabase.from("coin_pricing_config").select("coin_rate_inr").limit(1).maybeSingle(),
        supabase.from("categories").select("lead_cost_coins").eq("is_active", true),
      ]);
      if (!alive) return;
      setRate(Number((rateRow as any)?.coin_rate_inr ?? 0));
      const costs = ((cats ?? []) as any[]).map((c) => Number(c.lead_cost_coins) || 0).filter((n) => n > 0);
      const avg = costs.length ? Math.round(costs.reduce((s, n) => s + n, 0) / costs.length) : 0;
      setAvgCoins(avg);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("vendor_wallets")
        .select("leadx_coins, service_balance_paise")
        .eq("vendor_id", user.id)
        .maybeSingle();
      if (alive) setWallet((data as any) ?? { leadx_coins: 0, service_balance_paise: 0 });
    };
    load();
    const ch = supabase
      .channel(`vw-strip-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_wallets", filter: `vendor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  const avgInr = avgCoins * rate;
  const coins = wallet?.leadx_coins ?? 0;
  const inrBal = Math.round(((wallet?.service_balance_paise ?? 0) / 100));

  return (
    <Link
      to="/vendor/wallet"
      className="relative block rounded-2xl overflow-hidden shadow-[0_10px_28px_-10px_rgba(212,175,55,0.55)] active:scale-[0.99] transition"
      style={{
        background:
          "linear-gradient(135deg, #1a1208 0%, #3a2a10 45%, #6b4d12 100%)",
        border: "1px solid rgba(212,175,55,0.55)",
      }}
    >
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,215,140,0.18) 0 1px, transparent 1px 14px)",
        }}
      />
      <div className="relative p-3 flex items-center gap-3">
        <span
          className="h-11 w-11 rounded-2xl grid place-items-center shadow-inner flex-shrink-0"
          style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
        >
          <Coins className="h-5 w-5 text-[#1a1208]" strokeWidth={2.6} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-amber-300/90">
            ✦ Live Lead Pricing ✦
          </p>
          <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
            <span className="font-display font-bold text-base text-amber-100">
              ₹{rate.toFixed(0)} / coin
            </span>
            {avgCoins > 0 && (
              <span className="text-[10px] text-amber-200/85 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Avg {avgCoins} coins · ₹{avgInr.toFixed(0)}/lead
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[9px] uppercase tracking-[0.18em] text-amber-300/80 font-bold">Balance</span>
          <span className="font-display font-bold text-sm text-amber-100">{coins} coins</span>
          {inrBal > 0 && (
            <span className="text-[10px] text-amber-200/80">+ ₹{inrBal.toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
