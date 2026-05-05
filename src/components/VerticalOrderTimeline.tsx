import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Ban, ChevronRight, AlertCircle, MessageCircle, Star } from "lucide-react";
import { useState } from "react";
import {
  STATUS_STEPS, STATUS_BADGE,
  advanceStatus, cancelOrder, addApproval,
  type VendorGroup, type OrderItem, type ApprovalKind,
} from "@/lib/orders-store";
import { ChatTopMedia } from "@/components/ChatTopMedia";
import { ApprovalInlineCard, ApprovalStickyBanner } from "@/components/ApprovalCard";
import { RatingSheet } from "@/components/RatingSheet";

type Props = {
  vendor: VendorGroup;
  order: OrderItem;
  role: "customer" | "vendor";
};

/**
 * Vertical, professional order status timeline.
 * Used by /status (customer) and /vendor/status (vendor).
 *
 * Layout (top → bottom):
 *  - Compact map + auto-sliding banners (ChatTopMedia)
 *  - Order summary card (service · #id · status pill)
 *  - Vertical stepper with mini vendor avatar at each step
 *      · past steps   = filled green dot + check
 *      · current step = vendor avatar (28px) with pulse ring + label highlighted
 *      · future steps = hollow dot
 *  - Inline approval cards (yellow, pulsing, approve/decline)
 *  - Vendor-only controls: Mark next / Ask approval / Cancel
 *  - Bottom Live-Chat bar
 */
export function VerticalOrderTimeline({ vendor, order, role }: Props) {
  const navigate = useNavigate();
  const [showRating, setShowRating] = useState(false);

  const currentIdx = Math.max(0, STATUS_STEPS.findIndex((s) => s.key === order.status));
  const isCancelled = order.status === "cancelled";
  const isDone = order.status === "delivered";

  const pendingApproval = order.approvals?.find((a) => a.state === "pending");
  const approvals = order.approvals ?? [];

  const openChat = () => {
    const to = role === "customer" ? "/chat" : "/vendor/chat";
    navigate({ to, search: { vendorId: vendor.vendorId, orderId: order.id } as never });
  };

  const historyAt = (key: string) =>
    order.history.find((h) => h.status === key)?.at ?? "";

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#fdf8ec] to-[#f7efd6] flex flex-col overflow-hidden">
      {/* Sticky approval banner */}
      {pendingApproval && (
        <ApprovalStickyBanner
          approval={pendingApproval}
          onScrollToCard={() =>
            document
              .getElementById(`approval-${pendingApproval.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        />
      )}

      {/* Header — back + vendor */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur border-b border-amber-200/60 px-3 py-2.5 flex items-center gap-2.5">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : navigate({ to: "/profile" })}
          className="h-8 px-3 rounded-full bg-white border border-amber-200 text-[12px] font-bold text-amber-700 active:scale-95 shadow-sm"
        >
          ← Back
        </button>
        <span className="h-9 w-9 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0">
          <img src={vendor.avatar} alt={vendor.vendorName} className="h-full w-full object-cover" />
        </span>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="font-display text-sm font-bold text-slate-800 truncate">{vendor.vendorName}</p>
          <p className="text-[10px] font-semibold text-emerald-600">{vendor.presence}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[order.status].cls}`}>
          {STATUS_BADGE[order.status].label}
        </span>
      </div>

      {/* Top media — map + banners */}
      {!isCancelled && <ChatTopMedia vendorName={vendor.vendorName} />}

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {/* Order summary card */}
        <div className="rounded-2xl bg-white border border-amber-200/70 shadow-sm p-3 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-100 via-white to-emerald-100 grid place-items-center text-2xl flex-shrink-0">
            ☁️
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[17px] font-bold text-slate-800 leading-tight truncate">
              {order.service}
            </h2>
            <p className="text-[11px] font-semibold text-amber-700">#{order.id}</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{order.lastMsg}</p>
          </div>
        </div>

        {/* Vendor controls */}
        {role === "vendor" && !isCancelled && !isDone && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {(() => {
              const next = STATUS_STEPS[currentIdx + 1];
              if (!next) return null;
              return (
                <button
                  onClick={() => advanceStatus(order.id, next.key)}
                  className="flex-1 min-w-[140px] h-10 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[12px] font-bold shadow flex items-center justify-center gap-1.5 active:scale-95"
                >
                  Mark {next.label} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              );
            })()}
            <button
              onClick={() => {
                const kind = (prompt("Approval type — time, quote, scope, reschedule?", "time") || "").toLowerCase() as ApprovalKind;
                if (!["time", "quote", "scope", "reschedule"].includes(kind)) return;
                const title = prompt("Short title (e.g. 'Visit at 5:30 PM')") || "";
                if (!title.trim()) return;
                const detail = prompt("Detail message for customer:") || "";
                const amountStr = kind === "quote" ? prompt("Amount (₹)") || "0" : "0";
                addApproval(order.id, {
                  kind, title, detail,
                  amount: kind === "quote" ? Number(amountStr) || 0 : undefined,
                  proposedAt: kind === "time" || kind === "reschedule" ? title : undefined,
                  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                });
              }}
              className="h-10 px-3 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[12px] font-bold flex items-center gap-1 active:scale-95"
            >
              <AlertCircle className="h-3.5 w-3.5" /> Ask approval
            </button>
            <button
              onClick={() => { if (confirm(`Cancel order ${order.id}?`)) cancelOrder(order.id); }}
              className="h-10 px-3 rounded-full bg-white border border-red-300 text-red-600 text-[12px] font-bold flex items-center gap-1 active:scale-95"
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Vertical timeline */}
        <div className="mt-4 relative pl-1">
          {/* gradient vertical line */}
          <div className="absolute left-[22px] top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 via-amber-300 to-slate-200" />

          <div className="space-y-3">
            {STATUS_STEPS.map((step, i) => {
              const past = i < currentIdx;
              const isCurrent = i === currentIdx && !isCancelled;
              const future = i > currentIdx;
              const ts = historyAt(step.key);

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex items-start gap-3"
                >
                  {/* Avatar / dot column (fixed width to align with vertical line) */}
                  <div className="relative w-[44px] flex-shrink-0 flex justify-center pt-0.5">
                    {isCurrent ? (
                      <motion.span className="relative h-11 w-11 rounded-full overflow-hidden border-[3px] border-emerald-500 shadow-md">
                        <img src={vendor.avatar} alt={vendor.vendorName} className="h-full w-full object-cover" />
                        <motion.span
                          className="absolute inset-0 rounded-full ring-2 ring-emerald-400"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.15, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        />
                      </motion.span>
                    ) : past ? (
                      <span className="h-7 w-7 rounded-full grid place-items-center bg-emerald-500 text-white shadow-sm">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="h-7 w-7 rounded-full grid place-items-center bg-white border-2 border-slate-300 text-[10px] font-bold text-slate-400">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className={`flex-1 min-w-0 rounded-xl px-3 py-2 border shadow-sm transition ${
                    isCurrent
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300"
                      : past
                        ? "bg-white border-emerald-100"
                        : "bg-white/60 border-slate-100"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-display text-[14px] font-bold leading-tight truncate ${
                        isCurrent ? "text-amber-800" : past ? "text-slate-800" : "text-slate-400"
                      }`}>
                        {step.emoji} {step.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    {ts && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {vendor.vendorName} · {ts}
                      </p>
                    )}
                    {!ts && future && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">Pending…</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Approvals section */}
        {approvals.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 px-1 mb-1.5">
              Approvals ({approvals.filter((a) => a.state === "pending").length} pending)
            </p>
            {approvals.map((ap) => (
              <div id={`approval-${ap.id}`} key={ap.id}>
                <ApprovalInlineCard orderId={order.id} approval={ap} />
              </div>
            ))}
          </div>
        )}

        {/* Rate now */}
        {role === "customer" && isDone && !order.rated && (
          <button
            onClick={() => setShowRating(true)}
            className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold shadow-md flex items-center justify-center gap-2 active:scale-[0.98] animate-pulse"
          >
            <Star className="h-4 w-4 fill-white" /> Rate this service
          </button>
        )}
        {order.rated && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-3 text-center">
            <p className="text-[11px] font-bold text-slate-700">
              You rated · {order.rated.stars}★
            </p>
          </div>
        )}
      </div>

      {/* Bottom Live Chat bar */}
      <button
        onClick={openChat}
        className="flex-shrink-0 w-full bg-gradient-to-b from-[#fb923c] to-[#ea580c] py-3 grid place-items-center active:scale-[0.99] pb-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-white" fill="white" />
          <span className="px-3 py-0.5 rounded-md bg-white/95 font-display text-sm font-bold text-[color:oklch(0.45_0.18_28)] underline underline-offset-2">
            Live | chat
          </span>
        </span>
      </button>

      <RatingSheet
        open={showRating}
        onClose={() => setShowRating(false)}
        orderId={order.id}
        vendorName={vendor.vendorName}
        vendorPlaceId={vendor.gmbPlaceId}
      />
    </div>
  );
}
