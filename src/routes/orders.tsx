import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Tag, CheckCircle2, Clock } from "lucide-react";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — Karo Online" },
      { name: "description", content: "Your active orders. Tap any to chat with the vendor and track status." },
    ],
  }),
  component: OrdersPage,
});

type OrderStatus = "Online" | "Typing…" | "Last seen now";

const ORDERS: {
  id: string;
  vendorId: string;
  customer: string;
  vendorName: string;
  avatar: string;
  status: OrderStatus;
  lastMsg: string;
  service: string;
  pinned?: boolean;
}[] = [
  { id: "KO-1042", vendorId: "v1", customer: "You", vendorName: "Aryan | Bansal", avatar: avatarAryan, status: "Online", lastMsg: "20 minute mein. Address confirm kar dijiy…", service: "AC Service", pinned: true },
  { id: "KO-1031", vendorId: "v2", customer: "You", vendorName: "Raj | kumar", avatar: avatarRaj, status: "Typing…", lastMsg: "Bhej raha hoon", service: "Furniture Repair" },
  { id: "KO-1018", vendorId: "v3", customer: "You", vendorName: "Rani | kumari", avatar: avatarRani, status: "Online", lastMsg: "Hi! Service ready hai", service: "Salon at Home" },
  { id: "KO-1007", vendorId: "v4", customer: "You", vendorName: "Ashu | Qureshi", avatar: avatarUser, status: "Last seen now", lastMsg: "Quote bhej diya hai", service: "Plumbing" },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  Online: "text-emerald-600",
  "Typing…": "text-emerald-600",
  "Last seen now": "text-emerald-600",
};

function OrdersPage() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#fdf8ec] to-[#f7efd6] flex flex-col overflow-hidden">
      {/* Header with back button */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur border-b border-[color:oklch(0.78_0.14_82/0.3)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-90"
        >
          <ArrowLeft className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
        </button>
        <div className="flex-1 leading-tight">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ Ledger ✦</p>
          <h1 className="font-display text-xl text-gold-gradient leading-tight">My Orders</h1>
        </div>
        <span className="text-[11px] font-bold text-[color:oklch(0.45_0.10_82)] bg-[#fff8dc] px-2 py-1 rounded-full border border-[color:oklch(0.78_0.14_82/0.4)]">
          {ORDERS.length}
        </span>
      </header>

      {/* List of orders as customer cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {ORDERS.map((o, i) => (
          <Link
            key={o.id}
            to="/chat"
            className="block bg-white rounded-2xl p-3 border border-[color:oklch(0.78_0.14_82/0.25)] shadow-sm active:scale-[0.98] transition"
            style={{ animation: `fade-up 0.4s ease-out ${0.04 + i * 0.05}s both` }}
          >
            <div className="flex items-start gap-3">
              <span className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0">
                <img src={o.avatar} alt={o.vendorName} className="h-full w-full object-cover" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-display text-[15px] font-bold text-[color:oklch(0.22_0.05_30)] truncate">
                    {o.vendorName}
                  </p>
                  {o.pinned && <Tag className="h-3 w-3 text-[#d97706]" />}
                </div>
                <p className={`text-[11px] font-semibold ${STATUS_COLOR[o.status]}`}>{o.status}</p>
                <p className="text-[12px] text-[color:oklch(0.45_0.02_260)] truncate mt-0.5">{o.lastMsg}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-[color:oklch(0.45_0.10_82)] bg-[#fff8dc] px-1.5 py-0.5 rounded border border-[color:oklch(0.78_0.14_82/0.35)]">
                    #{o.id}
                  </span>
                  <span className="text-[10px] text-[color:oklch(0.50_0.02_260)] flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {o.service}
                  </span>
                </div>
              </div>
              <span className="h-8 w-8 rounded-full grid place-items-center bg-[#f1f5f9] flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-[color:oklch(0.40_0.02_260)]" />
              </span>
            </div>
          </Link>
        ))}

        {ORDERS.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="h-10 w-10 mx-auto text-[color:oklch(0.78_0.14_82/0.5)]" />
            <p className="text-sm text-[color:oklch(0.45_0.02_260)] mt-2">No active orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
