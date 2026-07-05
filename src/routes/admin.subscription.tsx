import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Crown } from "lucide-react";

export const Route = createFileRoute("/admin/subscription")({
  head: () => ({ meta: [{ title: "Vendor Subscription — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SubscriptionAdmin,
});

type Row = {
  id: string;
  plan_name: string;
  headline: string;
  sub_headline: string;
  price_paise: number;
  original_price_paise: number;
  trial_price_paise: number;
  trial_days: number;
  trial_enabled: boolean;
  auto_deduct_after_trial: boolean;
  features: string[];
  payment_gateway: string;
  upi_id: string | null;
  is_active: boolean;
};

function SubscriptionAdmin() {
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("vendor_subscription_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow(data as any);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from("vendor_subscription_settings")
      .update({
        plan_name: row.plan_name,
        headline: row.headline,
        sub_headline: row.sub_headline,
        price_paise: row.price_paise,
        original_price_paise: row.original_price_paise,
        trial_price_paise: row.trial_price_paise,
        trial_days: row.trial_days,
        trial_enabled: row.trial_enabled,
        auto_deduct_after_trial: row.auto_deduct_after_trial,
        features: row.features,
        payment_gateway: row.payment_gateway,
        upi_id: row.upi_id,
        is_active: row.is_active,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const set = <K extends keyof Row>(k: K, v: Row[K]) =>
    setRow((r) => (r ? { ...r, [k]: v } : r));

  if (!row) return <AdminLayout><PageHeader title="Subscription" /><p className="text-white/60">Loading…</p></AdminLayout>;

  const rupees = (p: number) => (p / 100).toFixed(0);

  const Field = ({ label, children }: any) => (
    <div>
      <label className="text-xs uppercase tracking-wider text-[#d4af37]/70 font-semibold block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
  const input =
    "w-full px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/30 text-white outline-none focus:border-[#d4af37]";

  return (
    <AdminLayout>
      <PageHeader
        title="Vendor Subscription Plan"
        subtitle="Configure price, trial, and features shown to vendors"
      />
      <GoldCard className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-5 w-5 text-amber-400" />
          <span className="font-bold text-white">Plan settings</span>
          <label className="ml-auto flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={row.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />
            Active
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Plan Name">
            <input className={input} value={row.plan_name} onChange={(e) => set("plan_name", e.target.value)} />
          </Field>
          <Field label="Payment Gateway">
            <select
              className={input}
              value={row.payment_gateway}
              onChange={(e) => set("payment_gateway", e.target.value)}
            >
              <option value="cashfree">Cashfree (auto-verify)</option>
              <option value="razorpay">Razorpay (auto-verify)</option>
              <option value="upi_manual">UPI QR (manual approve)</option>
            </select>
          </Field>
          <Field label="Headline">
            <input className={input} value={row.headline} onChange={(e) => set("headline", e.target.value)} />
          </Field>
          <Field label="Sub Headline">
            <input className={input} value={row.sub_headline} onChange={(e) => set("sub_headline", e.target.value)} />
          </Field>
          <Field label={`Price (₹${rupees(row.price_paise)})`}>
            <input
              type="number"
              className={input}
              value={rupees(row.price_paise)}
              onChange={(e) => set("price_paise", Math.round(parseFloat(e.target.value || "0") * 100))}
            />
          </Field>
          <Field label={`Original Price (₹${rupees(row.original_price_paise)})`}>
            <input
              type="number"
              className={input}
              value={rupees(row.original_price_paise)}
              onChange={(e) =>
                set("original_price_paise", Math.round(parseFloat(e.target.value || "0") * 100))
              }
            />
          </Field>
          <Field label="UPI ID (fallback)">
            <input
              className={input}
              value={row.upi_id ?? ""}
              placeholder="karo.online@upi"
              onChange={(e) => set("upi_id", e.target.value)}
            />
          </Field>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-4">
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={row.trial_enabled}
              onChange={(e) => set("trial_enabled", e.target.checked)}
            />
            Enable trial option
          </label>
          {row.trial_enabled && (
            <div className="grid md:grid-cols-3 gap-4">
              <Field label={`Trial Price (₹${rupees(row.trial_price_paise)})`}>
                <input
                  type="number"
                  className={input}
                  value={rupees(row.trial_price_paise)}
                  onChange={(e) =>
                    set("trial_price_paise", Math.round(parseFloat(e.target.value || "0") * 100))
                  }
                />
              </Field>
              <Field label="Trial Days">
                <input
                  type="number"
                  className={input}
                  value={row.trial_days}
                  onChange={(e) => set("trial_days", parseInt(e.target.value) || 15)}
                />
              </Field>
              <Field label="Auto-deduct after trial">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={row.auto_deduct_after_trial}
                    onChange={(e) => set("auto_deduct_after_trial", e.target.checked)}
                  />
                  Auto charge full price
                </label>
              </Field>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <Field label="Features (one per line, max 6)">
            <textarea
              className={`${input} min-h-32`}
              value={row.features.join("\n")}
              onChange={(e) =>
                set(
                  "features",
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 6),
                )
              }
            />
          </Field>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold shadow-lg disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </GoldCard>
    </AdminLayout>
  );
}
