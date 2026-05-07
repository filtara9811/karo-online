import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MyOrdersList } from "@/components/MyOrdersList";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — Karo Online" },
      { name: "description", content: "Your active orders. Tap any to chat with the vendor and track status." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#fdf8ec] to-[#f7efd6] flex flex-col overflow-hidden">
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
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <MyOrdersList basePath="/chat" />
      </div>
    </div>
  );
}
