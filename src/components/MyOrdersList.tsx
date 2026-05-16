import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Clock, CheckCircle2, Tag, MessageCircle, ChevronDown, Plus } from "lucide-react";
import {
  clearUnread,
  SOURCE_BADGE, STATUS_BADGE,
  type OrderSource, type OrderStatus,
} from "@/lib/orders-store";
import { useMyOrders } from "@/hooks/use-my-orders";

export type { OrderSource } from "@/lib/orders-store";
export type OrderStatusKind = "pending" | "active" | "completed";

const FILTERS: { key: "all" | OrderStatusKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Done" },
];

const PRESENCE_COLOR: Record<string, string> = {
  Online: "text-emerald-600",
  "Typing…": "text-emerald-600 italic",
  "Last seen now": "text-emerald-600",
  Offline: "text-slate-400",
};

function statusBucket(s: OrderStatus): OrderStatusKind {
  if (s === "delivered" || s === "cancelled") return "completed";
  if (s === "placed") return "pending";
  return "active";
}

export function MyOrdersList({
  onItemClick,
  basePath = "/status",
}: {
  onItemClick?: () => void;
  basePath?: "/status" | "/vendor/status" | "/chat" | "/vendor/chat";
}) {
  const vendors = useOrdersStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | OrderStatusKind>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filteredVendors = useMemo(() => {
    return vendors
      .map((v) => {
        const orders = v.orders.filter((o) => {
          if (filter !== "all" && statusBucket(o.status) !== filter) return false;
          if (query && !`${v.vendorName} ${o.service} ${o.id}`.toLowerCase().includes(query.toLowerCase())) return false;
          return true;
        });
        return { ...v, orders };
      })
      .filter((v) => v.orders.length > 0);
  }, [vendors, filter, query]);

  const totalUnread = vendors.reduce((s, v) => s + v.orders.reduce((a, o) => a + o.unread, 0), 0);
  const totalOrders = vendors.reduce((s, v) => s + v.orders.length, 0);

  const openOrder = (vendorId: string, orderId: string) => {
    clearUnread(orderId);
    onItemClick?.();
    navigate({ to: basePath, search: { vendorId, orderId } as never });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="font-display text-base text-amber-800 font-bold flex items-center gap-2">
          My Orders
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold text-white bg-emerald-500 rounded-full px-2 py-0.5 leading-none">
              {totalUnread} new
            </span>
          )}
        </h2>
        <span className="text-[10px] text-slate-400">
          {filteredVendors.reduce((s, v) => s + v.orders.length, 0)} of {totalOrders}
        </span>
      </div>

      <div className="flex items-center gap-2 bg-white border border-amber-200/70 rounded-full px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-amber-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendor, service, order id…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <Filter className="h-4 w-4 text-slate-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-amber-500 shadow"
                  : "bg-white text-amber-700 border-amber-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filteredVendors.map((v, i) => {
          const isOpen = expanded[v.vendorId] ?? v.orders.some((o) => o.unread > 0);
          const vendorUnread = v.orders.reduce((a, o) => a + o.unread, 0);
          return (
            <div
              key={v.vendorId}
              className="bg-white rounded-2xl border border-amber-200/70 shadow-[0_2px_8px_-4px_rgba(212,175,55,0.3)] overflow-hidden"
              style={{ animation: `fade-up 0.4s ease-out ${0.04 + i * 0.05}s both` }}
            >
              {/* Vendor row */}
              <button
                onClick={() => setExpanded((p) => ({ ...p, [v.vendorId]: !isOpen }))}
                className="w-full flex items-start gap-3 p-3 active:bg-amber-50/50 transition"
              >
                <span className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0">
                  <img src={v.avatar} alt={v.vendorName} className="h-full w-full object-cover" />
                  {v.presence === "Online" && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[15px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                      {v.vendorName}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                      {v.orders.length} order{v.orders.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold ${PRESENCE_COLOR[v.presence] ?? "text-slate-400"}`}>{v.presence}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {v.orders.slice(0, 3).map((o) => (
                      <span key={o.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SOURCE_BADGE[o.source].cls}`}>
                        {o.service}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {vendorUnread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 grid place-items-center text-[10px] font-bold text-white bg-emerald-500 rounded-full">
                      {vendorUnread}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-amber-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Inline expanded order list */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-amber-100"
                  >
                    <div className="p-2 space-y-1.5 bg-amber-50/30">
                      {v.orders.map((o, idx) => (
                        <button
                          key={o.id}
                          onClick={() => openOrder(v.vendorId, o.id)}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-amber-100 hover:border-amber-300 active:scale-[0.99] transition text-left"
                        >
                          <span className="h-8 w-8 rounded-lg grid place-items-center bg-gradient-to-br from-amber-100 to-amber-200 text-[10px] font-bold text-amber-800 flex-shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-bold text-slate-800 truncate">{o.service}</p>
                              <span className="text-[9px] text-slate-400 flex-shrink-0">{o.lastAt}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUS_BADGE[o.status].cls}`}>
                                {STATUS_BADGE[o.status].label}
                              </span>
                              <span className="text-[9px] font-bold text-amber-700">#{o.id}</span>
                              {o.pinned && <Tag className="h-2.5 w-2.5 text-amber-600" />}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{o.lastMsg}</p>
                          </div>
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            {o.unread > 0 && (
                              <span className="min-w-[18px] h-4 px-1 grid place-items-center text-[9px] font-bold text-white bg-emerald-500 rounded-full">
                                {o.unread}
                              </span>
                            )}
                            <span className="h-7 w-7 rounded-full grid place-items-center bg-emerald-50">
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </span>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => openOrder(v.vendorId, v.orders[0].id)}
                        className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-amber-300 text-[11px] font-semibold text-amber-700 active:bg-amber-100"
                      >
                        <Plus className="h-3.5 w-3.5" /> New order with this vendor
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredVendors.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-amber-200/50">
            <CheckCircle2 className="h-10 w-10 mx-auto text-amber-300" />
            <p className="text-sm text-slate-500 mt-2">No orders match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
