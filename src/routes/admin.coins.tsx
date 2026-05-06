import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, Loader2, Save, Plus, Trash2, Wallet, Zap, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/coins")({
  head: () => ({
    meta: [
      { title: "Coins & Wallet — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CoinsPage,
});

type Pricing = {
  id: string;
  coin_rate_inr: number;
  min_purchase_coins: number;
  max_purchase_coins: number;
  gst_percent: number;
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

function CoinsPage() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [walletPacks, setWalletPacks] = useState<WalletPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, c, w] = await Promise.all([
      supabase.from("coin_pricing_config").select("*").limit(1).maybeSingle(),
      supabase.from("coin_packs").select("*").order("sort_order"),
      supabase.from("wallet_recharge_packs").select("*").order("sort_order"),
    ]);
    setPricing((p.data ?? null) as Pricing | null);
    setCoinPacks((c.data ?? []) as CoinPack[]);
    setWalletPacks((w.data ?? []) as WalletPack[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const savePricing = async () => {
    if (!pricing) return;
    setSaving(true);
    await supabase
      .from("coin_pricing_config")
      .update({
        coin_rate_inr: pricing.coin_rate_inr,
        min_purchase_coins: pricing.min_purchase_coins,
        max_purchase_coins: pricing.max_purchase_coins,
        gst_percent: pricing.gst_percent,
      })
      .eq("id", pricing.id);
    setSaving(false);
  };

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
        sort_order: p.sort_order,
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
        sort_order: p.sort_order,
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

  if (loading) {
    return (
      <AdminLayout>
        <PageHeader title="Coins & Wallet" />
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Coins & Wallet"
        subtitle="LeadX Coin pricing + Service Wallet recharge packs"
      />

      {/* Pricing */}
      {pricing && (
        <GoldCard className="p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-11 w-11 rounded-xl grid place-items-center"
              style={{
                background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
              }}
            >
              <Coins className="h-5 w-5 text-[#1a1208]" />
            </div>
            <div>
              <h3
                className="font-display text-lg font-bold"
                style={{
                  background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                LeadX Coin Pricing
              </h3>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60">
                1 coin = ₹{pricing.coin_rate_inr}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field
              label="Rate (₹/coin)"
              value={pricing.coin_rate_inr}
              onChange={(v) => setPricing({ ...pricing, coin_rate_inr: v })}
            />
            <Field
              label="GST %"
              value={pricing.gst_percent}
              onChange={(v) => setPricing({ ...pricing, gst_percent: v })}
            />
            <Field
              label="Min coins"
              value={pricing.min_purchase_coins}
              onChange={(v) =>
                setPricing({ ...pricing, min_purchase_coins: v })
              }
            />
            <Field
              label="Max coins"
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
            {saving ? "Saving…" : "Save Pricing"}
          </GoldButton>
        </GoldCard>
      )}

      {/* Coin Packs */}
      <SectionHeader
        icon={Coins}
        title="Coin Packs"
        subtitle="Vendor LeadX coin purchase ke preset bundles"
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
                label="Coins"
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

      {/* Wallet Packs */}
      <SectionHeader
        icon={Wallet}
        title="Wallet Recharge Packs"
        subtitle="Vendor Service Wallet quick-add amounts (₹)"
        onAdd={addWalletPack}
      />
      <div className="grid sm:grid-cols-2 gap-3">
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
    </AdminLayout>
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
  icon: typeof Coins;
  title: string;
  subtitle: string;
  onAdd: () => void;
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
      <GoldButton size="sm" onClick={onAdd}>
        <Plus className="h-3 w-3 inline mr-1" />
        Add
      </GoldButton>
    </div>
  );
}
