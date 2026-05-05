import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Filter, Clock, CheckCircle2, Tag, MessageCircle } from "lucide-react";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

export type OrderSource = "quick" | "service" | "shop" | "lead";
export type OrderStatusKind = "pending" | "active" | "completed";

export type OrderRow = {
  id: string;
  vendorId: string;
  vendorName: string;
  avatar: string;
  service: string;
  source: OrderSource;
  status: OrderStatusKind;
  presence: "Online" | "Typing…" | "Last seen now" | "Offline";
  lastMsg: string;
  lastAt: string;
  unread: number;
  pinned?: boolean;
};

export const MY_ORDERS: OrderRow[] = [
  { id: "KO-1042", vendorId: "v1", vendorName: "Aryan | Bansal", avatar: avatarAryan, service: "AC Service", source: "service", status: "active", presence: "Online", lastMsg: "20 minute mein. Address confirm kar dijiye…", lastAt: "Just now", unread: 3, pinned: true },
  { id: "KO-1031", vendorId: "v2", vendorName: "Raj | Kumar", avatar: avatarRaj, service: "Furniture Repair", source: "quick", status: "pending", presence: "Typing…", lastMsg: "Bhej raha hoon", lastAt: "2m", unread: 1 },
  { id: "KO-1018", vendorId: "v3", vendorName: "Rani | Kumari", avatar: avatarRani, service: "Salon at Home", source: "service", status: "active", presence: "Online", lastMsg: "Hi! Service ready hai", lastAt: "12m", unread: 0 },
  { id: "KO-1007", vendorId: "v4", vendorName: "Ashu | Qureshi", avatar: avatarUser, service: "Plumbing", source: "lead", status: "completed", presence: "Last seen now", lastMsg: "Quote bhej diya hai", lastAt: "1h", unread: 0 },
  { id: "KO-0998", vendorId: "v5", vendorName: "Mohit | Digital Dukan", avatar: avatarUser, service: "Mobile Recharge", source: "shop", status: "completed", presence: "Offline", lastMsg: "Thanks! Order delivered.", lastAt: "Yesterday", unread: 0 },
];

const FILTERS: { key: "all" | OrderStatusKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Done" },
];

const SOURCE_BADGE: Record<OrderSource, { label: string; cls: string }> = {
  quick: { label: "Quick", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  service: { label: "Service", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  shop: { label: "Dukan", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  lead: { label: "Lead", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const PRESENCE_COLOR: Record<OrderRow["presence"], string> = {
  Online: "text-emerald-600",
  "Typing…": "text-emerald-600 italic",
  "Last seen now": "text-emerald-600",
  Offline: "text-slate-400",
};

export function MyOrdersList({ onItemClick }: { onItemClick?: () => void }) {
  const [filter, setFilter] = useState<"all" | OrderStatusKind>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return MY_ORDERS.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (query && !`${o.vendorName} ${o.service} ${o.id}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  const totalUnread = MY_ORDERS.reduce((s, o) => s + o.unread, 0);

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
        <span className="text-[10px] text-slate-400">{filtered.length} of {MY_ORDERS.length}</span>
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
        {filtered.map((o, i) => (
          <Link
            key={o.id}
            to="/chat"
            onClick={onItemClick}
            className="block bg-white rounded-2xl p-3 border border-amber-200/70 shadow-[0_2px_8px_-4px_rgba(212,175,55,0.3)] active:scale-[0.98] transition"
            style={{ animation: `fade-up 0.4s ease-out ${0.04 + i * 0.05}s both` }}
          >
            <div className="flex items-start gap-3">
              <span className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0">
                <img src={o.avatar} alt={o.vendorName} className="h-full w-full object-cover" />
                {o.presence === "Online" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-[15px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {o.vendorName}
                    {o.pinned && <Tag className="h-3 w-3 text-amber-600" />}
                  </p>
                  <span className={`text-[10px] font-semibold flex-shrink-0 ${o.unread > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                    {o.lastAt}
                  </span>
                </div>
                <p className={`text-[11px] font-semibold ${PRESENCE_COLOR[o.presence]}`}>{o.presence}</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[12px] text-slate-500 truncate flex-1">{o.lastMsg}</p>
                  {o.unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center text-[10px] font-bold text-white bg-emerald-500 rounded-full">
                      {o.unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${SOURCE_BADGE[o.source].cls}`}>
                    {SOURCE_BADGE[o.source].label}
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    #{o.id}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {o.service}
                  </span>
                </div>
              </div>
              <span className="h-8 w-8 rounded-full grid place-items-center bg-emerald-50 flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
              </span>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-amber-200/50">
            <CheckCircle2 className="h-10 w-10 mx-auto text-amber-300" />
            <p className="text-sm text-slate-500 mt-2">No orders match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
