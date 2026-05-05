import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, X, Clock } from "lucide-react";
import {
  decideApproval,
  APPROVAL_LABELS,
  type Approval,
} from "@/lib/orders-store";

function useCountdown(toIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, new Date(toIso).getTime() - now);
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { diff, label: `${m}:${s.toString().padStart(2, "0")}` };
}

/** Tiny sticky banner pinned at top of chat — shown when ANY approval is pending. */
export function ApprovalStickyBanner({
  approval,
  onScrollToCard,
}: {
  approval: Approval;
  onScrollToCard: () => void;
}) {
  const { label, diff } = useCountdown(approval.expiresAt);
  if (approval.state !== "pending") return null;
  const meta = APPROVAL_LABELS[approval.kind];
  return (
    <motion.button
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={onScrollToCard}
      className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 border-b-2 border-amber-400 active:scale-[0.99]"
    >
      <span className="h-7 w-7 grid place-items-center rounded-full bg-amber-500 text-white shadow">
        <AlertCircle className="h-4 w-4" />
      </span>
      <div className="flex-1 text-left min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Action required · {meta.label}
        </p>
        <p className="text-[11px] font-semibold text-amber-900 truncate">{approval.title}</p>
      </div>
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          diff < 60_000 ? "bg-red-500 text-white animate-pulse" : "bg-white text-amber-800"
        } flex items-center gap-0.5`}
      >
        <Clock className="h-2.5 w-2.5" /> {label}
      </span>
    </motion.button>
  );
}

/** Inline card that lives above messages — yellow border + pulse. */
export function ApprovalInlineCard({
  orderId,
  approval,
}: {
  orderId: string;
  approval: Approval;
}) {
  const { label: countdown, diff } = useCountdown(approval.expiresAt);
  const meta = APPROVAL_LABELS[approval.kind];
  const isPending = approval.state === "pending";

  return (
    <motion.div
      layout
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`mx-3 my-2 rounded-2xl border-2 p-3 shadow-sm ${
        isPending
          ? "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 animate-[pulse_2.5s_ease-in-out_infinite]"
          : approval.state === "approved"
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-red-200 bg-red-50/60"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="h-9 w-9 grid place-items-center rounded-xl bg-white shadow text-base flex-shrink-0">
          {meta.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            {meta.label}
          </p>
          <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5">
            {approval.title}
          </p>
          <p className="text-xs text-slate-600 mt-1 leading-snug">{approval.detail}</p>
          {approval.proposedAt && (
            <p className="text-[11px] font-semibold text-amber-700 mt-1">
              ⏰ {approval.proposedAt}
            </p>
          )}
          {approval.amount != null && (
            <p className="text-[13px] font-bold text-emerald-700 mt-1">
              ₹{approval.amount.toLocaleString()}
            </p>
          )}
        </div>
        {isPending && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              diff < 60_000 ? "bg-red-500 text-white animate-pulse" : "bg-amber-500 text-white"
            } flex items-center gap-0.5 flex-shrink-0`}
          >
            <Clock className="h-2.5 w-2.5" /> {countdown}
          </span>
        )}
      </div>

      {isPending ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => decideApproval(orderId, approval.id, "declined")}
            className="h-9 rounded-full bg-white border border-red-300 text-red-600 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
          >
            <X className="h-3.5 w-3.5" /> Decline
          </button>
          <button
            onClick={() => decideApproval(orderId, approval.id, "approved")}
            className="h-9 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 shadow"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              approval.state === "approved"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {approval.state === "approved" ? "✓ Approved" : "✕ Declined"}
          </span>
          {approval.decidedAt && (
            <span className="text-[10px] text-slate-500">
              {new Date(approval.decidedAt).toLocaleString([], {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
