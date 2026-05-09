import { createFileRoute } from "@tanstack/react-router";
import goldTruck from "@/assets/gold-truck.png";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Karo Online" },
      { name: "description", content: "Track your active and past orders." },
    ],
  }),
  component: OrdersPage,
});

const ORDERS = [
  { id: "KO-1042", title: "Deep Cleaning · 3BHK", status: "On the way", time: "ETA 22 min", live: true },
  { id: "KO-1031", title: "Plumbing repair", status: "Delivered", time: "Yesterday", live: false },
  { id: "KO-1018", title: "Salon at home", status: "Delivered", time: "3 days ago", live: false },
];

function OrdersPage() {
  return (
    <div className="space-y-5">
      <header style={{ animation: "fade-up 0.7s ease-out both" }}>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">✦ Ledger ✦</p>
        <h1 className="font-display text-3xl text-gold-gradient leading-tight mt-1">Your Orders</h1>
      </header>

      <div className="space-y-3">
        {ORDERS.map((o, i) => (
          <div
            key={o.id}
            className="glass-wine rounded-2xl p-4 flex items-center gap-4"
            style={{ animation: `fade-up 0.55s ease-out ${0.05 + i * 0.06}s both` }}
          >
            <div className="relative h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[oklch(0.26_0.13_22)] to-[oklch(0.10_0.04_14)] border border-[color:oklch(0.84_0.15_85/0.35)] flex-shrink-0">
              <img src={goldTruck} alt="" loading="lazy" width={56} height={56} className="h-10 w-10 object-contain" />
              {o.live && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gradient-to-br from-[#fff3b0] to-[#b8860b] shadow-[0_0_10px_rgba(245,217,122,0.7)]" style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.84_0.15_85/0.7)]">#{o.id}</p>
              <p className="font-display text-base text-gold-gradient leading-tight truncate">{o.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{o.status} · {o.time}</p>
            </div>
            <span className="text-[color:oklch(0.84_0.15_85/0.6)] text-xl">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
