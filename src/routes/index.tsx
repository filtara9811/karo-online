import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import goldTruck from "@/assets/gold-truck.png";
import goldRepair from "@/assets/gold-cat-repair.png";
import goldCleaning from "@/assets/gold-cat-cleaning.png";
import goldBeauty from "@/assets/gold-cat-beauty.png";
import goldChef from "@/assets/gold-cat-chef.png";
import goldPin from "@/assets/gold-pin.png";
import goldTicket from "@/assets/gold-ticket.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karo Online — Luxury Local Services" },
      { name: "description", content: "Premium home services on demand. Repairs, cleaning, beauty and gourmet — delivered with maison-grade care." },
      { property: "og:title", content: "Karo Online — Luxury Local Services" },
      { property: "og:description", content: "Premium home services on demand from the Karo Online maison." },
    ],
  }),
  component: HomePage,
});

const CATEGORIES = [
  { key: "repair", label: "Repairs", sub: "Plumbing · Electric", icon: goldRepair },
  { key: "cleaning", label: "Cleaning", sub: "Deep · Daily", icon: goldCleaning },
  { key: "beauty", label: "Beauty", sub: "Salon at Home", icon: goldBeauty },
  { key: "chef", label: "Gourmet", sub: "Private Chef", icon: goldChef },
];

const ORDER_STAGES = ["Confirmed", "Processing", "On the way", "Delivered"];

function HomePage() {
  // Demo active order — would come from Cloud later
  const [stage, setStage] = useState(2); // 0..3
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % ORDER_STAGES.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section
        className="pt-2"
        style={{ animation: "fade-up 0.7s ease-out both" }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">
          ✦ Bonjour ✦
        </p>
        <h1 className="font-display text-3xl text-gold-gradient leading-tight mt-1">
          Welcome back, <span className="italic font-light">guest</span>
        </h1>
        <p className="text-sm text-muted-foreground italic mt-1 flex items-center gap-1.5">
          <img src={goldPin} alt="" className="h-4 w-4 object-contain" />
          Bandra West, Mumbai
        </p>
      </section>

      {/* Hero search card */}
      <section
        className="glass-wine rounded-3xl p-5 relative overflow-hidden"
        style={{ animation: "fade-up 0.8s ease-out 0.05s both" }}
      >
        <div className="absolute top-3 left-3 h-5 w-5 border-t border-l border-[color:oklch(0.84_0.15_85/0.55)] rounded-tl-lg" />
        <div className="absolute top-3 right-3 h-5 w-5 border-t border-r border-[color:oklch(0.84_0.15_85/0.55)] rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 h-5 w-5 border-b border-l border-[color:oklch(0.84_0.15_85/0.55)] rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 h-5 w-5 border-b border-r border-[color:oklch(0.84_0.15_85/0.55)] rounded-br-lg" />

        <p className="text-[10px] uppercase tracking-[0.35em] text-[color:oklch(0.84_0.15_85/0.7)] text-center">
          Private Concierge
        </p>
        <h2 className="font-display text-2xl text-gold-gradient text-center mt-1 leading-tight">
          What may we arrange?
        </h2>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[oklch(0.10_0.05_16/0.55)] border border-[color:oklch(0.84_0.15_85/0.3)] px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[color:oklch(0.84_0.15_85)]" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Search a service…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[color:oklch(0.78_0.06_85/0.45)] text-foreground"
          />
        </div>
      </section>

      {/* Categories */}
      <section style={{ animation: "fade-up 0.8s ease-out 0.1s both" }}>
        <div className="flex items-end justify-between mb-3">
          <h3 className="font-display text-xl text-gold-gradient">Categories</h3>
          <Link to="/services" className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.84_0.15_85/0.7)] hover:text-[color:oklch(0.84_0.15_85)]">
            See all ›
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.key}
              className="btn-3d group relative rounded-2xl p-4 text-left bg-gradient-to-br from-[oklch(0.22_0.11_20/0.55)] to-[oklch(0.13_0.06_18/0.7)] border border-[color:oklch(0.84_0.15_85/0.25)] hover:border-[color:oklch(0.84_0.15_85/0.7)] hover:shadow-gold-glow"
              style={{ animation: `fade-up 0.55s ease-out ${0.15 + i * 0.07}s both` }}
            >
              <div className="h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[oklch(0.26_0.13_22)] to-[oklch(0.10_0.04_14)] border border-[color:oklch(0.84_0.15_85/0.35)] mb-3">
                <img src={c.icon} alt="" loading="lazy" width={56} height={56} className="h-11 w-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display text-lg text-gold-gradient leading-tight">{c.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Active order — live tracker */}
      <section style={{ animation: "fade-up 0.8s ease-out 0.2s both" }}>
        <div className="flex items-end justify-between mb-3">
          <h3 className="font-display text-xl text-gold-gradient">Active Order</h3>
          <Link to="/orders" className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.84_0.15_85/0.7)] hover:text-[color:oklch(0.84_0.15_85)]">
            Details ›
          </Link>
        </div>

        <div className="glass-wine rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[oklch(0.26_0.13_22)] to-[oklch(0.10_0.04_14)] border border-[color:oklch(0.84_0.15_85/0.45)] flex-shrink-0">
              <img src={goldTruck} alt="" loading="lazy" width={64} height={64} className="h-12 w-12 object-contain drop-shadow-[0_3px_8px_rgba(245,217,122,0.4)]" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gradient-to-br from-[#fff3b0] to-[#b8860b] shadow-[0_0_10px_rgba(245,217,122,0.7)]" style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.84_0.15_85/0.7)]">Order #KO-1042</p>
              <p className="font-display text-lg text-gold-gradient leading-tight truncate">Deep Cleaning · 3BHK</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ORDER_STAGES[stage]} · ETA 22 min</p>
            </div>
          </div>

          {/* Stages */}
          <div className="mt-5 flex items-center justify-between">
            {ORDER_STAGES.map((label, i) => {
              const reached = i <= stage;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    <span
                      className={`h-3 w-3 rounded-full transition-all duration-500 ${
                        reached
                          ? "bg-gradient-to-br from-[#fff3b0] to-[#b8860b] shadow-[0_0_10px_rgba(245,217,122,0.7)]"
                          : "bg-[color:oklch(0.84_0.15_85/0.2)]"
                      }`}
                    />
                    <span className={`text-[9px] uppercase tracking-[0.15em] text-center ${reached ? "text-gold-gradient font-medium" : "text-[color:oklch(0.78_0.06_85/0.4)]"}`}>
                      {label}
                    </span>
                  </div>
                  {i < ORDER_STAGES.length - 1 && (
                    <span className={`flex-1 h-px mx-1 transition-colors duration-500 ${i < stage ? "bg-gradient-to-r from-[#f5d97a] to-[#b8860b]" : "bg-[color:oklch(0.84_0.15_85/0.2)]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured vendor */}
      <section style={{ animation: "fade-up 0.8s ease-out 0.25s both" }}>
        <h3 className="font-display text-xl text-gold-gradient mb-3">Featured Maison</h3>
        <div className="glass-wine rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden">
          <img src={goldTicket} alt="" loading="lazy" className="absolute -right-4 -top-2 h-20 w-auto opacity-80 rotate-12" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">Featured</p>
            <p className="font-display text-2xl text-gold-gradient leading-tight">Atelier Aurum</p>
            <p className="text-xs text-muted-foreground mt-1">Curated home spa & wellness · ★ 4.96 (812)</p>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 mt-3 text-xs uppercase tracking-[0.25em] text-gold-gradient font-medium btn-3d"
            >
              Explore ›
            </Link>
          </div>
        </div>
      </section>

      {/* Complete profile CTA */}
      <section style={{ animation: "fade-up 0.8s ease-out 0.3s both" }}>
        <Link
          to="/register"
          className="btn-3d block rounded-2xl p-4 bg-gradient-to-br from-[oklch(0.30_0.13_22)] to-[oklch(0.13_0.06_18)] border border-[color:oklch(0.84_0.15_85/0.4)] shadow-gold-glow"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">Complete Registration</p>
              <p className="font-display text-base text-gold-gradient mt-0.5">Unlock the full Maison ›</p>
            </div>
            <span className="h-10 w-10 rounded-full bg-gold-bar grid place-items-center text-[color:oklch(0.13_0.06_18)] font-bold">›</span>
          </div>
        </Link>
      </section>
    </div>
  );
}
