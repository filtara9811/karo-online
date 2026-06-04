import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, TrendingUp, TrendingDown, Wallet as WalletIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Tick = { name: string; coins: number; inr: number; delta: number };

/**
 * Stock-market style scrolling ticker showing per-category lead coin prices.
 * Sits above the search bar. Tapping the bar opens the wallet; the X dismisses.
 * Live wallet balance chip is shown inline so the ticker doubles as the entry
 * point to the full wallet system.
 */
export function CoinRateTicker() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [rate, setRate] = useState(0);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: rateRow }, { data: cats }] = await Promise.all([
        supabase.from("coin_pricing_config").select("coin_rate_inr").limit(1).maybeSingle(),
        supabase
          .from("categories")
          .select("name, lead_cost_coins")
          .eq("is_active", true)
          .order("lead_cost_coins", { ascending: false })
          .limit(20),
      ]);
      if (!alive) return;
      const r = Number((rateRow as any)?.coin_rate_inr ?? 0);
      setRate(r);
      const list: Tick[] = ((cats ?? []) as any[])
        .map((c) => {
          const cn = Number(c.lead_cost_coins) || 0;
          return {
            name: String(c.name ?? "").slice(0, 18),
            coins: cn,
            inr: cn * r,
            delta: ((cn * 7) % 9) - 4,
          };
        })
        .filter((t) => t.coins > 0);
      setTicks(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("vendor_wallets")
        .select("leadx_coins")
        .eq("vendor_id", user.id)
        .maybeSingle();
      if (alive) setCoins(Number((data as any)?.leadx_coins ?? 0));
    };
    load();
    const ch = supabase
      .channel(`vw-ticker-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_wallets", filter: `vendor_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  if (hidden || ticks.length === 0) return null;
  const loop = [...ticks, ...ticks];

  return (
    <Link
      to="/vendor/wallet"
      aria-label="Open wallet"
      className="relative block overflow-hidden rounded-full border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.45)] active:scale-[0.99] transition no-underline"
      style={{
        background:
          "linear-gradient(180deg, #1a1208 0%, #2a1d0c 50%, #1a1208 100%)",
      }}
    >
      <div className="flex items-center gap-2 pl-2 pr-1 h-8">
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.18em] text-amber-300 flex-shrink-0">
          <WalletIcon className="h-3 w-3" /> Live
        </span>
        <div
          className="flex-1 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
          }}
        >
          <div
            className="marquee-x flex gap-5 w-max"
            style={{ animationDuration: "55s" }}
          >
            {loop.map((t, i) => {
              const up = t.delta >= 0;
              return (
                <span
                  key={`${t.name}-${i}`}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-amber-100 whitespace-nowrap"
                >
                  <span className="text-amber-300/90">{t.name}</span>
                  <span className="text-amber-100">{t.coins}c</span>
                  {rate > 0 && (
                    <span className="text-amber-200/80">₹{t.inr.toFixed(0)}</span>
                  )}
                  <span
                    className={`flex items-center gap-0.5 ${
                      up ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {up ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {Math.abs(t.delta)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        {coins != null && (
          <span className="flex items-center gap-1 px-2 h-6 rounded-full bg-amber-300/15 border border-amber-300/40 text-[10px] font-bold text-amber-100 flex-shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            {coins}c
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHidden(true);
          }}
          aria-label="Hide ticker"
          className="h-5 w-5 grid place-items-center rounded-full bg-amber-300/20 active:scale-90 flex-shrink-0"
        >
          <X className="h-3 w-3 text-amber-200" strokeWidth={2.8} />
        </button>
      </div>
    </Link>
  );
}
