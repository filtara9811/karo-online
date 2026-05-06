import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Wallet,
  Zap,
  History,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { TileEditSheet, type SheetField } from "@/components/admin/TileEditSheet";
import { fmtShort, MAX_LEADX_SUPPLY, haptic } from "@/lib/format";

export const Route = createFileRoute("/admin/coins")({
  head: () => ({
    meta: [
      { title: "LeadX Market — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadXMarketPage,
});

type Pricing = {
  id: string;
  coin_rate_inr: number;
  min_purchase_coins: number;
  max_purchase_coins: number;
  gst_percent: number;
  total_supply: number;
};

type CoinPack = {
  id: string;
  pack_name: string;
  coins: number;
  price_inr: number;
  bonus_coins: number;
  is_active: boolean;
  sort_order: number;
};

type WalletPack = {
  id: string;
  label: string;
  amount_inr: number;
  bonus_inr: number;
  is_active: boolean;
  sort_order: number;
};

type SourceMult = {
  id: string;
  source_key: string;
  source_label: string;
  multiplier: number;
  is_active: boolean;
  sort_order: number;
};

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  lead_cost_coins: number | null;
  is_active: boolean;
};

type MarketStats = {
  total_supply: number;
  rate_inr: number;
  sold: number;
  returned: number;
  in_circulation: number;
  admin_holds: number;
  vendor_count: number;
  value_inr_circulation: number;
  value_inr_total: number;
  top_vendors: Array<{
    vendor_id: string;
    business_name: string | null;
    owner_name: string | null;
    avatar_url: string | null;
    leadx_coins: number;
    lifetime_purchased: number;
    lifetime_used: number;
  }>;
  rate_history: Array<{ rate: number; at: string }>;
};

function fmt(n: number) {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + " L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
}

function LeadXMarketPage() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [walletPacks, setWalletPacks] = useState<WalletPack[]>([]);
  const [sources, setSources] = useState<SourceMult[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tickerPulse, setTickerPulse] = useState(0);

  const load = async () => {
    setLoading(true);
    const [p, c, w, s, cats, st] = await Promise.all([
      supabase.from("coin_pricing_config").select("*").limit(1).maybeSingle(),
      supabase.from("coin_packs").select("*").order("sort_order"),
      supabase.from("wallet_recharge_packs").select("*").order("sort_order"),
      supabase.from("lead_source_multipliers").select("*").order("sort_order"),
      supabase
        .from("categories")
        .select("id,name,parent_id,lead_cost_coins,is_active")
        .not("parent_id", "is", null)
        .order("name"),
      supabase.rpc("get_leadx_market_stats" as any),
    ]);
    setPricing((p.data ?? null) as Pricing | null);
    setCoinPacks((c.data ?? []) as CoinPack[]);
    setWalletPacks((w.data ?? []) as WalletPack[]);
    setSources((s.data ?? []) as SourceMult[]);
    setCategories((cats.data ?? []) as CategoryRow[]);
    setStats((st.data ?? null) as MarketStats | null);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  // Live ticker pulse + auto-refresh stats every 15s
  useEffect(() => {
    const t = setInterval(() => setTickerPulse((p) => p + 1), 1500);
    const r = setInterval(async () => {
      const st = await supabase.rpc("get_leadx_market_stats" as any);
      if (st.data) setStats(st.data as MarketStats);
    }, 15000);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, []);

  const savePricing = async () => {
    if (!pricing) return;
    setSaving(true);
    await supabase.rpc("update_coin_rate" as any, { _new_rate: pricing.coin_rate_inr });
    await supabase
      .from("coin_pricing_config")
      .update({
        min_purchase_coins: pricing.min_purchase_coins,
        max_purchase_coins: pricing.max_purchase_coins,
        gst_percent: pricing.gst_percent,
        total_supply: pricing.total_supply,
      })
      .eq("id", pricing.id);
    setSaving(false);
    load();
  };

  const updateCategory = (id: string, patch: Partial<CategoryRow>) =>
    setCategories((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const saveCategory = async (c: CategoryRow) => {
    await supabase
      .from("categories")
      .update({ lead_cost_coins: c.lead_cost_coins ?? 0 })
      .eq("id", c.id);
  };

  const updateSource = (id: string, patch: Partial<SourceMult>) =>
    setSources((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const saveSource = async (s: SourceMult) => {
    await supabase
      .from("lead_source_multipliers")
      .update({
        source_label: s.source_label,
        multiplier: s.multiplier,
        is_active: s.is_active,
      })
      .eq("id", s.id);
  };

  // Coin pack handlers
  const updateCoinPack = (id: string, patch: Partial<CoinPack>) =>
    setCoinPacks((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const saveCoinPack = async (p: CoinPack) => {
    await supabase
      .from("coin_packs")
      .update({
        pack_name: p.pack_name,
        coins: p.coins,
        price_inr: p.price_inr,
        bonus_coins: p.bonus_coins,
        is_active: p.is_active,
      })
      .eq("id", p.id);
  };
  const deleteCoinPack = async (id: string) => {
    await supabase.from("coin_packs").delete().eq("id", id);
    load();
  };
  const addCoinPack = async () => {
    await supabase.from("coin_packs").insert({
      pack_name: "New Pack",
      coins: 100,
      price_inr: 2000,
      bonus_coins: 0,
      sort_order: (coinPacks.at(-1)?.sort_order ?? 0) + 10,
    });
    load();
  };

  // Wallet pack handlers
  const updateWalletPack = (id: string, patch: Partial<WalletPack>) =>
    setWalletPacks((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const saveWalletPack = async (p: WalletPack) => {
    await supabase
      .from("wallet_recharge_packs")
      .update({
        label: p.label,
        amount_inr: p.amount_inr,
        bonus_inr: p.bonus_inr,
        is_active: p.is_active,
      })
      .eq("id", p.id);
  };
  const deleteWalletPack = async (id: string) => {
    await supabase.from("wallet_recharge_packs").delete().eq("id", id);
    load();
  };
  const addWalletPack = async () => {
    await supabase.from("wallet_recharge_packs").insert({
      label: "New ₹500",
      amount_inr: 500,
      bonus_inr: 0,
      sort_order: (walletPacks.at(-1)?.sort_order ?? 0) + 10,
    });
    load();
  };

  // Rate trend
  const rateTrend = useMemo(() => {
    const h = stats?.rate_history ?? [];
    if (h.length < 2) return { dir: "flat" as const, change: 0 };
    const first = h[0].rate;
    const last = h[h.length - 1].rate;
    const change = ((last - first) / first) * 100;
    return {
      dir: (change > 0 ? "up" : change < 0 ? "down" : "flat") as
        | "up"
        | "down"
        | "flat",
      change,
    };
  }, [stats]);

  if (loading) {
    return (
      <AdminLayout>
        <PageHeader title="LeadX Market" />
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="LeadX Market"
        subtitle="Live supply, circulation & vendor holdings"
      />

      {/* Stock-style ticker */}
      {stats && pricing && (
        <LiveTicker
          stats={stats}
          rate={pricing.coin_rate_inr}
          trend={rateTrend}
          pulse={tickerPulse}
        />
      )}

      {/* Supply stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatTile
            label="Total Supply"
            value={fmt(stats.total_supply)}
            sub={`₹${fmt(stats.value_inr_total)} value`}
            tone="gold"
            icon={Package}
          />
          <StatTile
            label="In Market"
            value={fmt(stats.in_circulation)}
            sub={`${stats.vendor_count} vendors hold`}
            tone="green"
            icon={ArrowUpRight}
          />
          <StatTile
            label="Returned to Admin"
            value={fmt(stats.returned)}
            sub="used for leads"
            tone="blue"
            icon={ArrowDownLeft}
          />
          <StatTile
            label="Admin Reserve"
            value={fmt(stats.admin_holds)}
            sub="not yet sold"
            tone="purple"
            icon={Sparkles}
          />
        </div>
      )}

      {/* Sparkline chart */}
      {stats && stats.rate_history.length > 1 && (
        <GoldCard className="p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-[#fff8dc] text-sm">
                Rate Chart
              </h3>
              <p className="text-[10px] text-[#d4af37]/60">
                Last {stats.rate_history.length} changes
              </p>
            </div>
            <div
              className={`text-xs font-bold flex items-center gap-1 ${
                rateTrend.dir === "up"
                  ? "text-emerald-400"
                  : rateTrend.dir === "down"
                    ? "text-red-400"
                    : "text-[#d4af37]"
              }`}
            >
              {rateTrend.dir === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : rateTrend.dir === "down" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : null}
              {rateTrend.change.toFixed(2)}%
            </div>
          </div>
          <Sparkline data={stats.rate_history.map((h) => h.rate)} />
        </GoldCard>
      )}

      {/* Pricing config */}
      {pricing && (
        <GoldCard className="p-4 mb-5">
          <h3 className="font-display font-bold text-[#fff8dc] text-sm mb-3">
            Market Controls
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Field
              label="Total Supply"
              value={pricing.total_supply}
              onChange={(v) => setPricing({ ...pricing, total_supply: v })}
            />
            <Field
              label="Rate (₹/LeadX)"
              value={pricing.coin_rate_inr}
              onChange={(v) => setPricing({ ...pricing, coin_rate_inr: v })}
            />
            <Field
              label="GST %"
              value={pricing.gst_percent}
              onChange={(v) => setPricing({ ...pricing, gst_percent: v })}
            />
            <Field
              label="Min buy"
              value={pricing.min_purchase_coins}
              onChange={(v) =>
                setPricing({ ...pricing, min_purchase_coins: v })
              }
            />
            <Field
              label="Max buy"
              value={pricing.max_purchase_coins}
              onChange={(v) =>
                setPricing({ ...pricing, max_purchase_coins: v })
              }
            />
          </div>
          <GoldButton
            onClick={savePricing}
            disabled={saving}
            className="mt-4"
          >
            <Save className="h-3.5 w-3.5 inline mr-1.5" />
            {saving ? "Saving…" : "Save & Log Rate"}
          </GoldButton>
        </GoldCard>
      )}

      {/* Vendor holdings */}
      {stats && (
        <>
          <SectionHeader
            icon={Users}
            title="Vendor Holdings"
            subtitle={`${stats.top_vendors.length} vendors holding LeadX`}
          />
          <GoldCard className="p-2 mb-6 overflow-hidden">
            {stats.top_vendors.length === 0 ? (
              <div className="text-center text-[#d4af37]/60 text-sm py-6">
                No vendor holdings yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-[#d4af37]/70 border-b border-[#d4af37]/20">
                      <th className="px-3 py-2">Vendor</th>
                      <th className="px-3 py-2 text-right">Holds</th>
                      <th className="px-3 py-2 text-right">Bought</th>
                      <th className="px-3 py-2 text-right">Used</th>
                      <th className="px-3 py-2 text-right">Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_vendors.map((v) => (
                      <tr
                        key={v.vendor_id}
                        className="border-b border-[#d4af37]/10 last:border-0"
                      >
                        <td className="px-3 py-2 text-[#fff8dc]">
                          {v.business_name ||
                            v.owner_name ||
                            v.vendor_id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-300 font-bold">
                          {fmt(v.leadx_coins)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#fff8dc]/70">
                          {fmt(v.lifetime_purchased)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#fff8dc]/70">
                          {fmt(v.lifetime_used)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#d4af37]">
                          ₹{fmt(v.leadx_coins * stats.rate_inr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GoldCard>
        </>
      )}

      {/* Category pricing */}
      <SectionHeader
        icon={Package}
        title="Category LeadX Cost"
        subtitle="Per sub-category — kitne LeadX deduct honge"
      />
      <GoldCard className="p-3 mb-6">
        <div className="grid sm:grid-cols-2 gap-2">
          {categories.length === 0 ? (
            <div className="text-center text-[#d4af37]/60 text-sm py-4 col-span-2">
              No sub-categories yet — create from Catalog page
            </div>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/20"
              >
                <span className="flex-1 text-[#fff8dc] text-sm truncate">
                  {c.name}
                </span>
                <input
                  type="number"
                  value={c.lead_cost_coins ?? 0}
                  onChange={(e) =>
                    updateCategory(c.id, {
                      lead_cost_coins: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-20 px-2 py-1 rounded bg-black/60 border border-[#d4af37]/30 text-[#fff8dc] text-sm text-right outline-none focus:border-[#d4af37]"
                />
                <span className="text-[10px] text-[#d4af37]/70">LeadX</span>
                <button
                  onClick={() => saveCategory(c)}
                  className="p-1 rounded text-[#d4af37] hover:bg-[#d4af37]/10"
                >
                  <Save className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </GoldCard>

      {/* Source multipliers */}
      <SectionHeader
        icon={Zap}
        title="Source Multipliers"
        subtitle="Quick / WhatsApp / Digital — per-source rate"
      />
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {sources.map((s) => (
          <GoldCard key={s.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="text-[9px] uppercase tracking-[0.2em] text-[#f5d97a]/60 font-bold">
                  {s.source_key}
                </div>
                <input
                  value={s.source_label}
                  onChange={(e) =>
                    updateSource(s.id, { source_label: e.target.value })
                  }
                  className="w-full bg-transparent text-[#fff8dc] font-display font-bold text-base outline-none border-b border-[#d4af37]/20 focus:border-[#d4af37] pb-1"
                />
              </div>
            </div>
            <Field
              label="Multiplier (× base LeadX cost)"
              value={s.multiplier}
              onChange={(v) => updateSource(s.id, { multiplier: v })}
            />
            <div className="flex items-center justify-between gap-2">
              <ActiveToggle
                value={s.is_active}
                onChange={(v) => updateSource(s.id, { is_active: v })}
              />
              <GoldButton size="sm" onClick={() => saveSource(s)}>
                Save
              </GoldButton>
            </div>
          </GoldCard>
        ))}
      </div>

      {/* LeadX Packs */}
      <SectionHeader
        icon={Sparkles}
        title="LeadX Packs"
        subtitle="Vendor LeadX purchase ke preset bundles"
        onAdd={addCoinPack}
      />
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {coinPacks.map((p) => (
          <GoldCard key={p.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                value={p.pack_name}
                onChange={(e) =>
                  updateCoinPack(p.id, { pack_name: e.target.value })
                }
                className="flex-1 bg-transparent text-[#fff8dc] font-display font-bold text-base outline-none border-b border-[#d4af37]/20 focus:border-[#d4af37] pb-1"
              />
              <button
                onClick={() => deleteCoinPack(p.id)}
                className="p-1.5 rounded-lg text-red-300/80 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field
                label="LeadX"
                value={p.coins}
                onChange={(v) => updateCoinPack(p.id, { coins: v })}
              />
              <Field
                label="Price ₹"
                value={p.price_inr}
                onChange={(v) => updateCoinPack(p.id, { price_inr: v })}
              />
              <Field
                label="Bonus"
                value={p.bonus_coins}
                onChange={(v) => updateCoinPack(p.id, { bonus_coins: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <ActiveToggle
                value={p.is_active}
                onChange={(v) => updateCoinPack(p.id, { is_active: v })}
              />
              <GoldButton size="sm" onClick={() => saveCoinPack(p)}>
                Save
              </GoldButton>
            </div>
          </GoldCard>
        ))}
      </div>

      {/* Wallet packs */}
      <SectionHeader
        icon={Wallet}
        title="Service Wallet Packs"
        subtitle="₹ recharge quick-add"
        onAdd={addWalletPack}
      />
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {walletPacks.map((p) => (
          <GoldCard key={p.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                value={p.label}
                onChange={(e) =>
                  updateWalletPack(p.id, { label: e.target.value })
                }
                className="flex-1 bg-transparent text-[#fff8dc] font-display font-bold text-base outline-none border-b border-[#d4af37]/20 focus:border-[#d4af37] pb-1"
              />
              <button
                onClick={() => deleteWalletPack(p.id)}
                className="p-1.5 rounded-lg text-red-300/80 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Amount ₹"
                value={p.amount_inr}
                onChange={(v) => updateWalletPack(p.id, { amount_inr: v })}
              />
              <Field
                label="Bonus ₹"
                value={p.bonus_inr}
                onChange={(v) => updateWalletPack(p.id, { bonus_inr: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <ActiveToggle
                value={p.is_active}
                onChange={(v) => updateWalletPack(p.id, { is_active: v })}
              />
              <GoldButton size="sm" onClick={() => saveWalletPack(p)}>
                Save
              </GoldButton>
            </div>
          </GoldCard>
        ))}
      </div>

      {/* Rate history log */}
      {stats && stats.rate_history.length > 0 && (
        <>
          <SectionHeader
            icon={History}
            title="Rate Change History"
            subtitle="All manual rate updates"
          />
          <GoldCard className="p-4 mb-6">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...stats.rate_history].reverse().map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm border-b border-[#d4af37]/10 pb-2 last:border-0"
                >
                  <span className="text-[#fff8dc] font-bold">
                    ₹{Number(h.rate).toFixed(2)} / LeadX
                  </span>
                  <span className="text-[#d4af37]/70 text-xs">
                    {new Date(h.at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </GoldCard>
        </>
      )}
    </AdminLayout>
  );
}

// ---------- Sub-components ----------

function LiveTicker({
  stats,
  rate,
  trend,
  pulse,
}: {
  stats: MarketStats;
  rate: number;
  trend: { dir: "up" | "down" | "flat"; change: number };
  pulse: number;
}) {
  const color =
    trend.dir === "up"
      ? "text-emerald-400"
      : trend.dir === "down"
        ? "text-red-400"
        : "text-[#d4af37]";
  const dotColor =
    trend.dir === "up"
      ? "bg-emerald-400"
      : trend.dir === "down"
        ? "bg-red-400"
        : "bg-[#d4af37]";

  const items = [
    { label: "LEADX", value: `₹${rate.toFixed(2)}`, color },
    {
      label: "SUPPLY",
      value: fmt(stats.total_supply),
      color: "text-[#fff8dc]",
    },
    {
      label: "MARKET",
      value: fmt(stats.in_circulation),
      color: "text-emerald-300",
    },
    {
      label: "RETURNED",
      value: fmt(stats.returned),
      color: "text-blue-300",
    },
    {
      label: "VENDORS",
      value: stats.vendor_count.toString(),
      color: "text-[#fff8dc]",
    },
    {
      label: "MCAP",
      value: `₹${fmt(stats.value_inr_circulation)}`,
      color: "text-[#d4af37]",
    },
  ];

  return (
    <div className="mb-4 rounded-xl border border-[#d4af37]/30 bg-black/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#d4af37]/20">
        <span
          className={`h-2 w-2 rounded-full ${dotColor} ${pulse % 2 === 0 ? "opacity-100" : "opacity-30"} transition-opacity`}
        />
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-bold">
          Live · LeadX Market
        </span>
        <span className={`ml-auto text-xs font-bold ${color}`}>
          {trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "—"}{" "}
          {trend.change.toFixed(2)}%
        </span>
      </div>
      <div className="overflow-hidden">
        <div className="flex gap-6 px-4 py-2.5 animate-marquee whitespace-nowrap">
          {[...items, ...items].map((it, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-[#d4af37]/70 font-bold">
                {it.label}
              </span>
              <span className={`text-sm font-bold ${it.color}`}>
                {it.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
      `}</style>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const first = data[0];
  const up = last >= first;
  const stroke = up ? "#10b981" : "#ef4444";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-16"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill="url(#sparkFill)"
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "gold" | "green" | "blue" | "purple";
  icon: typeof Wallet;
}) {
  const tones = {
    gold: "from-[#f5d97a]/30 to-[#d4af37]/10 border-[#d4af37]/40 text-[#fff8dc]",
    green: "from-emerald-500/30 to-emerald-700/10 border-emerald-500/40 text-emerald-100",
    blue: "from-blue-500/30 to-blue-700/10 border-blue-500/40 text-blue-100",
    purple: "from-purple-500/30 to-purple-700/10 border-purple-500/40 text-purple-100",
  };
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${tones[tone]} p-3 backdrop-blur`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-70">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </div>
      <div className="font-display text-xl font-bold leading-tight">
        {value}
      </div>
      <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-transparent text-[#fff8dc] outline-none text-sm font-bold"
      />
    </label>
  );
}

function ActiveToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
        value
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          : "bg-black/40 text-[#d4af37]/60 border-[#d4af37]/20"
      }`}
    >
      {value ? "Active" : "Inactive"}
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  onAdd,
}: {
  icon: typeof Wallet;
  title: string;
  subtitle: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 mt-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#d4af37]" />
        <div>
          <h3
            className="font-display text-base font-bold"
            style={{
              background: "linear-gradient(180deg, #fff8dc, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </h3>
          <p className="text-[10px] text-[#f5d97a]/60">{subtitle}</p>
        </div>
      </div>
      {onAdd && (
        <GoldButton size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3 inline mr-1" />
          Add
        </GoldButton>
      )}
    </div>
  );
}
