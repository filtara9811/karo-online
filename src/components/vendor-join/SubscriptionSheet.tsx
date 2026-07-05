import { useEffect, useState } from "react";
import { Crown, Check, Zap, Calendar, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getVendorSubscriptionSettings,
  startVendorSubscription,
  verifyVendorSubscription,
} from "@/lib/vendor-subscription.functions";
import { openCashfreeCheckout } from "@/lib/cashfree-client";
import { toast } from "sonner";

type Settings = {
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
};

const ICONS = ["♾️", "🗂️", "🎧", "✅", "📈", "🔒"];

export function SubscriptionSheet({ onPaid }: { onPaid: () => void }) {
  const getSettings = useServerFn(getVendorSubscriptionSettings);
  const startSub = useServerFn(startVendorSubscription);
  const verifySub = useServerFn(verifyVendorSubscription);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<"" | "full" | "trial">("");

  useEffect(() => {
    getSettings().then((r: any) => {
      if (r.ok && r.settings) setSettings(r.settings as Settings);
    });
    // Verify on return from Cashfree
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("cf_sub_order");
    if (orderId) {
      verifySub({ data: { order_id: orderId } }).then((r: any) => {
        if (r.ok && r.paid) {
          toast.success("Payment successful! Dashboard active ho gaya");
          onPaid();
        }
        url.searchParams.delete("cf_sub_order");
        window.history.replaceState({}, "", url.toString());
      });
    }
  }, []);

  const pay = async (mode: "full" | "trial") => {
    setBusy(mode);
    try {
      const r = await startSub({ data: { mode } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      await openCashfreeCheckout(r.payment_session_id, r.mode);
      // After modal returns, verify
      const v = await verifySub({ data: { order_id: r.order_id } });
      if (v.ok && v.paid) {
        toast.success("Payment successful!");
        onPaid();
      } else if (v.ok) {
        toast.info(`Status: ${v.status}. Verify hone tak wait karein.`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setBusy("");
    }
  };

  if (!settings) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" />
      </div>
    );
  }

  const price = settings.price_paise / 100;
  const original = settings.original_price_paise / 100;
  const save = original - price;
  const trial = settings.trial_price_paise / 100;

  return (
    <div className="pb-10 px-4 pt-2 max-w-md mx-auto">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900">Subscription</h2>
          <p className="text-sm text-neutral-500">Choose plan aur leads paayein</p>
        </div>
        <span className="px-3 py-1 rounded-full border border-amber-400 text-amber-700 text-xs font-semibold">
          Step 3 of 3
        </span>
      </header>

      <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-amber-100 border border-amber-200 p-5 space-y-4 relative overflow-hidden">
        <div className="mx-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold">
          <Crown className="h-3 w-3" /> {settings.plan_name.toUpperCase()}
        </div>
        <div className="text-center">
          <h3 className="text-xl font-extrabold text-neutral-900">
            {settings.headline.split(",")[0]}
            <span className="block text-amber-600">
              {settings.headline.split(",").slice(1).join(",").trim() || "Get More Leads"}
            </span>
          </h3>
          <p className="text-sm text-neutral-600 mt-2">{settings.sub_headline}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-baseline gap-2">
            {original > price && (
              <span className="text-neutral-400 line-through text-lg">₹{original}</span>
            )}
            <span className="text-4xl font-black text-amber-600">₹{price}</span>
          </div>
          {save > 0 && (
            <div className="text-center px-2 py-1 rounded-lg border-2 border-dashed border-amber-400 text-amber-700 text-xs font-bold">
              SAVE
              <br />₹{save}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-neutral-600 -mt-2">One-time Payment</p>

        <div className="grid grid-cols-3 gap-y-3 pt-2">
          {settings.features.slice(0, 6).map((f, i) => (
            <div key={f} className="flex flex-col items-center text-center gap-1">
              <div className="h-10 w-10 rounded-full border border-amber-300 grid place-items-center text-lg">
                {ICONS[i] ?? "✨"}
              </div>
              <div className="text-[11px] font-semibold text-neutral-800 leading-tight px-1">
                {f}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 mt-4">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => pay("full")}
          className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-left flex items-center gap-3 disabled:opacity-50"
        >
          <div className="h-10 w-10 rounded-full bg-amber-500 grid place-items-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-neutral-900">Buy Now & Activate</div>
            <div className="text-xs text-neutral-600">Get immediate access</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-amber-500 text-white font-bold">
            {busy === "full" ? <Loader2 className="h-4 w-4 animate-spin" /> : `₹${price}`}
          </div>
        </button>

        {settings.trial_enabled && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => pay("trial")}
            className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 text-left flex items-center gap-3 disabled:opacity-50"
          >
            <div className="h-10 w-10 rounded-full bg-blue-500 grid place-items-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-neutral-900">
                Try for {settings.trial_days} Days
              </div>
              <div className="text-xs text-neutral-600">
                {settings.auto_deduct_after_trial
                  ? `After ${settings.trial_days} days ₹${
                      settings.original_price_paise / 100
                    } auto-deduct`
                  : `Try platform for ${settings.trial_days} days`}
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-blue-500 text-white font-bold">
              {busy === "trial" ? <Loader2 className="h-4 w-4 animate-spin" /> : `₹${trial}`}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
