import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payment Gateways — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentsPage,
});

type Gateway = {
  id: string;
  provider: string;
  display_name: string;
  is_active: boolean;
  is_test_mode: boolean;
  public_key: string | null;
};

function PaymentsPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payment_gateways")
      .select("*")
      .order("provider");
    setGateways((data ?? []) as Gateway[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<Gateway>) => {
    setGateways((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const save = async (g: Gateway) => {
    setSavingId(g.id);
    await supabase
      .from("payment_gateways")
      .update({
        is_active: g.is_active,
        is_test_mode: g.is_test_mode,
        public_key: g.public_key,
      })
      .eq("id", g.id);
    setSavingId(null);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Payment Gateways"
        subtitle="Razorpay / Stripe configuration"
      />

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {gateways.map((g) => (
            <GoldCard key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-xl grid place-items-center"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                    }}
                  >
                    <CreditCard className="h-5 w-5 text-[#1a1208]" />
                  </div>
                  <div>
                    <h3
                      className="font-display text-lg font-bold"
                      style={{
                        background:
                          "linear-gradient(180deg, #fff8dc, #d4af37)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {g.display_name}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60">
                      {g.provider}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${
                    g.is_active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20"
                  }`}
                >
                  {g.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                    Public Key {g.provider === "razorpay" ? "(Key ID)" : "(Publishable Key)"}
                  </label>
                  <input
                    value={g.public_key ?? ""}
                    onChange={(e) =>
                      update(g.id, { public_key: e.target.value })
                    }
                    placeholder={
                      g.provider === "razorpay"
                        ? "rzp_test_..."
                        : "pk_test_..."
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Toggle
                    label="Test mode"
                    value={g.is_test_mode}
                    onChange={(v) => update(g.id, { is_test_mode: v })}
                  />
                  <Toggle
                    label="Active"
                    value={g.is_active}
                    onChange={(v) => update(g.id, { is_active: v })}
                  />
                </div>

                <GoldButton
                  onClick={() => save(g)}
                  disabled={savingId === g.id}
                  className="w-full mt-2"
                >
                  <Save className="h-3.5 w-3.5 inline mr-1.5" />
                  {savingId === g.id ? "Saving..." : "Save Configuration"}
                </GoldButton>
              </div>

              <p className="text-[10px] text-[#d4af37]/50 mt-3 leading-relaxed">
                🔐 Secret keys (key_secret / sk_) ko Supabase secrets mein
                store karein — yahan sirf safe public key paste karein.
              </p>
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
