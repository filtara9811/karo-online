import { Check, Crown, Sparkles } from "lucide-react";

export type PlanChoice = "trial" | "premium";

export function PlanSelectionSheet({
  onSelect,
  currentPlan,
}: {
  onSelect: (plan: PlanChoice) => void;
  currentPlan?: PlanChoice | null;
}) {
  return (
    <div className="px-5 pt-2 pb-8 max-w-md mx-auto">
      <div className="mx-auto w-10 h-1 rounded-full bg-neutral-200 mb-4" />
      <h2 className="text-xl font-extrabold text-neutral-900 text-center">Choose Your Plan</h2>
      <p className="text-sm text-neutral-500 text-center mb-5">
        Start free or unlock premium features
      </p>

      {/* Free Trial */}
      <button
        type="button"
        onClick={() => onSelect("trial")}
        className={`w-full text-left rounded-3xl border-2 p-5 mb-3 transition ${
          currentPlan === "trial"
            ? "border-amber-500 bg-amber-50"
            : "border-neutral-200 bg-white hover:border-amber-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-neutral-900">Free Trial · 15 Days</div>
            <div className="text-xs text-neutral-500">Pay ₹1 setup verification</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-neutral-900">₹1</div>
            <div className="text-[10px] text-neutral-500">setup</div>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-y-2 gap-x-3">
          {[
            "Full Features",
            "Unlimited Mapping",
            "Premium Dashboard",
            "Lead Notifications",
            "Customer Visibility",
            "15 Day Trial",
          ].map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-neutral-700">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </button>

      {/* Premium */}
      <button
        type="button"
        onClick={() => onSelect("premium")}
        className={`w-full text-left rounded-3xl border-2 p-5 relative overflow-hidden transition ${
          currentPlan === "premium"
            ? "border-amber-500 bg-amber-50"
            : "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 hover:border-amber-400"
        }`}
      >
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
          BEST VALUE
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 grid place-items-center text-white">
            <Crown className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-neutral-900">Premium Plan</div>
            <div className="text-xs text-neutral-500">Full access, no trial limits</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-400 line-through">₹1000</div>
            <div className="text-2xl font-black text-amber-600">₹599</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white/60 border border-amber-100 px-3 py-2 text-xs text-neutral-700">
          Instant activation via UPI QR — approved within minutes
        </div>
      </button>

      <p className="text-[11px] text-center text-neutral-400 mt-4">
        You can change or upgrade your plan anytime
      </p>
    </div>
  );
}
