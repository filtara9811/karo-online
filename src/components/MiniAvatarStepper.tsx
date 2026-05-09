import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { STATUS_STEPS, type OrderStatus } from "@/lib/orders-store";

type Props = {
  status: OrderStatus;
  vendorAvatar: string;
  vendorName: string;
};

/**
 * Mini-Avatar Stepper (Option B):
 * - Compact horizontal pipeline
 * - Done steps = small filled dot with check
 * - Current step = vendor avatar (28px) with pulse ring
 * - Future steps = small hollow dot
 * - Gradient line connects only the completed portion
 */
export function MiniAvatarStepper({ status, vendorAvatar, vendorName }: Props) {
  if (status === "cancelled") {
    return (
      <div className="px-3 py-2 text-center">
        <span className="text-[11px] font-bold text-red-600">❌ Order cancelled</span>
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center px-1 py-1.5">
      {STATUS_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial min-w-0">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              {isCurrent ? (
                <motion.span
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  className="relative h-7 w-7 rounded-full overflow-hidden border-2 border-emerald-500 ring-2 ring-emerald-300/70 ring-offset-1 shadow-sm"
                >
                  <img src={vendorAvatar} alt={vendorName} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/30" />
                </motion.span>
              ) : (
                <span
                  className={`h-4 w-4 rounded-full grid place-items-center border transition ${
                    done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                </span>
              )}
              <span
                className={`text-[8.5px] font-semibold whitespace-nowrap leading-none ${
                  isCurrent
                    ? "text-emerald-700"
                    : done
                      ? "text-emerald-600/80"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className="flex-1 h-[3px] mx-1 -mt-3 rounded-full overflow-hidden bg-slate-200">
                <div
                  className={`h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all`}
                  style={{ width: i < currentIdx ? "100%" : isCurrent ? "50%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
