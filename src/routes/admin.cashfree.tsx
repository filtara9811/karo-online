import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/cashfree")({
  head: () => ({
    meta: [
      { title: "Cashfree Services — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CashfreeServicesPage,
});

const ASSIGNMENTS = [
  { v: "none", l: "Not Assigned" },
  { v: "customer_payment", l: "Customer Payment" },
  { v: "vendor_wallet_recharge", l: "Vendor Wallet Recharge" },
  { v: "leadx_purchase", l: "LeadX Coin Purchase" },
  { v: "vendor_subscription", l: "Vendor Subscription / Plan" },
  { v: "vendor_payout", l: "Vendor Payout / Settlement" },
  { v: "customer_refund", l: "Customer Refund" },
] as const;

type Service = {
  id: string;
  service_key: string;
  display_name: string;
  description: string | null;
  app_id: string | null;
  secret_key: string | null;
  assigned_use: string;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
  config: Record<string, string>;
};

function CashfreeServicesPage() {
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("cashfree_services")
      .select("*")
      .order("priority");
    setList(
      ((data ?? []) as any[]).map((g) => ({
        ...g,
        config: (g.config ?? {}) as Record<string, string>,
      })) as Service[],
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<Service>) => {
    setList((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const save = async (g: Service) => {
    setSavingId(g.id);
    await (supabase as any)
      .from("cashfree_services")
      .update({
        app_id: g.app_id,
        secret_key: g.secret_key,
        assigned_use: g.assigned_use,
        is_active: g.is_active,
        is_test_mode: g.is_test_mode,
        priority: g.priority,
        config: g.config,
      })
      .eq("id", g.id);
    setSavingId(null);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Cashfree Services"
        subtitle="Multiple Cashfree products configure karein aur har service ko app ke specific use-case se assign karein"
      />

      <GoldCard className="p-4 mb-4">
        <p className="text-xs text-[#f5d97a]/85 leading-relaxed">
          💡 <b className="text-[#fff8dc]">Smart Routing:</b> Cashfree ke har product
          (Payment Gateway, Subscriptions, Payouts, etc.) ke alag App ID + Secret hote hain.
          Yahan aap sab services ko separately add karein, aur har service ko ek <b>"Use"</b>
          assign karein — vendor wallet recharge, customer payment, plan subscription,
          vendor payout, etc. App apne aap sahi service use karega.
        </p>
      </GoldCard>

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : (
        <div className="grid gap-4">
          {list.map((g) => (
            <GoldCard key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                    }}
                  >
                    <Zap className="h-5 w-5 text-[#1a1208]" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-display text-lg font-bold truncate"
                      style={{
                        background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {g.display_name}
                    </h3>
                    {g.description ? (
                      <p className="text-[10px] text-[#d4af37]/70 mt-0.5 truncate">
                        {g.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                    g.is_active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20"
                  }`}
                >
                  {g.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                    App ID
                  </label>
                  <input
                    value={g.app_id ?? ""}
                    onChange={(e) => update(g.id, { app_id: e.target.value })}
                    placeholder="TEST123abc... / PROD..."
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={g.secret_key ?? ""}
                    onChange={(e) =>
                      update(g.id, { secret_key: e.target.value })
                    }
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                  Assigned Use (kahan use hoga)
                </label>
                <select
                  value={g.assigned_use}
                  onChange={(e) =>
                    update(g.id, { assigned_use: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm"
                >
                  {ASSIGNMENTS.map((a) => (
                    <option key={a.v} value={a.v} className="bg-[#0F0A05]">
                      {a.l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <Toggle
                  label="Test"
                  value={g.is_test_mode}
                  onChange={(v) => update(g.id, { is_test_mode: v })}
                />
                <Toggle
                  label="Active"
                  value={g.is_active}
                  onChange={(v) => update(g.id, { is_active: v })}
                />
                <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">
                    Priority
                  </span>
                  <input
                    type="number"
                    value={g.priority}
                    onChange={(e) =>
                      update(g.id, {
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-transparent text-[#fff8dc] outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <GoldButton
                onClick={() => save(g)}
                disabled={savingId === g.id}
                className="w-full mt-3"
              >
                <Save className="h-3.5 w-3.5 inline mr-1.5" />
                {savingId === g.id ? "Saving..." : "Save Configuration"}
              </GoldButton>
            </GoldCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-left"
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">
        {label}
      </span>
      <div
        className={`relative h-5 w-9 rounded-full transition ${
          value ? "" : "bg-black/60"
        }`}
        style={
          value
            ? {
                background:
                  "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
              }
            : undefined
        }
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}
