import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wrench, Hammer, Sparkles, Scissors, Zap, Paintbrush2,
  Truck, ChefHat, Plus, MapPin, type LucideIcon,
} from "lucide-react";
import { NeedsSheet } from "@/components/NeedsSheet";

export const Route = createFileRoute("/quick")({
  head: () => ({
    meta: [
      { title: "Quick Service — Karo Online" },
      { name: "description", content: "Live map of nearby vendors. Tap a category to filter, drop your need, and get instant quotes." },
    ],
  }),
  component: QuickPage,
});

type Cat = { key: string; label: string; icon: LucideIcon };

const CATS: Cat[] = [
  { key: "all", label: "All", icon: Sparkles },
  { key: "plumber", label: "Plumber", icon: Wrench },
  { key: "carpenter", label: "Carpenter", icon: Hammer },
  { key: "electrician", label: "Electrician", icon: Zap },
  { key: "painter", label: "Painter", icon: Paintbrush2 },
  { key: "beauty", label: "Beauty", icon: Scissors },
  { key: "movers", label: "Movers", icon: Truck },
  { key: "chef", label: "Chef", icon: ChefHat },
];

type Vendor = { id: string; name: string; cat: string; x: number; y: number; rating: number };

const VENDORS: Vendor[] = [
  { id: "v1", name: "Ramesh Plumbing", cat: "plumber", x: 28, y: 32, rating: 4.8 },
  { id: "v2", name: "Suresh Tap Pro", cat: "plumber", x: 70, y: 58, rating: 4.6 },
  { id: "v3", name: "Bharat Plumbers", cat: "plumber", x: 52, y: 72, rating: 4.9 },
  { id: "v4", name: "Mohan Carpenter", cat: "carpenter", x: 22, y: 60, rating: 4.7 },
  { id: "v5", name: "Wood Maison", cat: "carpenter", x: 78, y: 28, rating: 4.5 },
  { id: "v6", name: "Sparky Electric", cat: "electrician", x: 38, y: 22, rating: 4.9 },
  { id: "v7", name: "Volt Bros", cat: "electrician", x: 65, y: 75, rating: 4.4 },
  { id: "v8", name: "Rang Painters", cat: "painter", x: 18, y: 78, rating: 4.6 },
  { id: "v9", name: "Maison Brush", cat: "painter", x: 82, y: 45, rating: 4.8 },
  { id: "v10", name: "Glow Salon", cat: "beauty", x: 32, y: 80, rating: 4.9 },
  { id: "v11", name: "Aurum Beauty", cat: "beauty", x: 72, y: 18, rating: 4.7 },
  { id: "v12", name: "Swift Movers", cat: "movers", x: 15, y: 45, rating: 4.5 },
  { id: "v13", name: "Royal Chef", cat: "chef", x: 85, y: 65, rating: 5.0 },
];

function QuickPage() {
  const [active, setActive] = useState<string>("all");
  const [needsOpen, setNeedsOpen] = useState(false);

  const filtered = useMemo(
    () => (active === "all" ? VENDORS : VENDORS.filter((v) => v.cat === active)),
    [active],
  );

  return (
    <div className="space-y-3">
      {/* Map */}
      <section
        className="relative rounded-3xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.55)] shadow-gold-glow"
        style={{ animation: "fade-up 0.6s ease-out both", height: "min(60vh, 460px)" }}
      >
        <FakeMap vendors={filtered} />
        {/* Map header chips */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10">
          <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] text-[10px] font-display font-semibold text-[color:oklch(0.30_0.05_85)] flex items-center gap-1 shadow-sm">
            <MapPin className="h-3 w-3 text-[color:oklch(0.55_0.10_82)]" />
            Delhi 6 · Live
          </span>
          <span className="ml-auto px-2.5 py-1 rounded-full bg-gradient-to-r from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] text-[10px] font-bold uppercase tracking-wider text-[color:oklch(0.42_0.10_82)] shadow-sm">
            {filtered.length} vendors
          </span>
        </div>
      </section>

      {/* Floating red needs button — anchored over map's bottom-right */}
      <button
        onClick={() => setNeedsOpen(true)}
        aria-label="Post your need"
        className="btn-3d fixed z-40 right-5 grid place-items-center rounded-full"
        style={{
          bottom: "calc(112px + env(safe-area-inset-bottom))",
          width: 64,
          height: 64,
          background: "linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)",
          boxShadow: "0 10px 30px -8px rgba(201,42,42,0.6), 0 0 0 4px rgba(255,255,255,0.9)",
          animation: "breathe 2.6s ease-in-out infinite",
        }}
      >
        <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(201,42,42,0.5)" }} />
        <Plus className="relative h-8 w-8 text-white" strokeWidth={3} />
      </button>

      {/* Categories — horizontal */}
      <section style={{ animation: "fade-up 0.6s ease-out 0.05s both" }}>
        <h3 className="font-display text-base text-gold-gradient mb-2 px-1">Service categories</h3>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          {CATS.map((c) => {
            const Icon = c.icon;
            const isActive = active === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActive(c.key)}
                className={`btn-3d flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border-2 transition-all min-w-[72px] ${
                  isActive
                    ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] shadow-gold-glow scale-105"
                    : "border-[color:oklch(0.78_0.14_82/0.35)] bg-white/85"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${isActive ? "text-[color:oklch(0.42_0.10_82)]" : "text-[color:oklch(0.55_0.10_82/0.7)]"}`}
                  strokeWidth={2.2}
                />
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-[color:oklch(0.30_0.05_85)]" : "text-[color:oklch(0.45_0.08_85)]"}`}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <NeedsSheet
        open={needsOpen}
        category={active === "all" ? null : CATS.find((c) => c.key === active)?.label}
        onClose={() => setNeedsOpen(false)}
        onSubmit={() => {
          setNeedsOpen(false);
        }}
      />
    </div>
  );
}

function FakeMap({ vendors }: { vendors: Vendor[] }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#fefcf6] via-[#fdf8e8] to-[#f5e9b8]">
      {/* Subtle map grid */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="oklch(0.78 0.14 82 / 0.18)" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {/* Gold roads */}
        <path d="M 0 35 Q 30 30 50 40 T 100 38" stroke="oklch(0.78 0.14 82 / 0.5)" strokeWidth="1.4" fill="none" />
        <path d="M 0 65 Q 35 70 55 60 T 100 68" stroke="oklch(0.78 0.14 82 / 0.4)" strokeWidth="1.2" fill="none" />
        <path d="M 25 0 Q 30 40 45 60 T 50 100" stroke="oklch(0.78 0.14 82 / 0.4)" strokeWidth="1.2" fill="none" />
        <path d="M 75 0 Q 70 35 80 55 T 78 100" stroke="oklch(0.78 0.14 82 / 0.35)" strokeWidth="1.1" fill="none" />
        {/* Buildings */}
        {[
          [10, 15, 8, 6], [22, 50, 6, 8], [60, 20, 10, 7], [80, 80, 8, 6],
          [40, 85, 7, 5], [88, 30, 6, 7], [12, 72, 9, 6], [55, 50, 5, 5],
        ].map(([x, y, w, h], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            rx="0.6"
            fill="oklch(1 0 0 / 0.55)"
            stroke="oklch(0.78 0.14 82 / 0.35)"
            strokeWidth="0.15"
          />
        ))}
        {/* Park */}
        <ellipse cx="48" cy="48" rx="6" ry="4" fill="oklch(0.85 0.12 145 / 0.35)" stroke="oklch(0.55 0.15 145 / 0.4)" strokeWidth="0.2" />
      </svg>

      {/* Customer pin (center) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "oklch(0.55 0.22 25 / 0.4)" }} />
        <span className="relative h-5 w-5 rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#c92a2a] border-[3px] border-white shadow-lg block" />
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white border border-[color:oklch(0.78_0.14_82/0.5)] text-[9px] font-display font-bold text-[color:oklch(0.30_0.05_85)] shadow whitespace-nowrap">
          You
        </span>
      </div>

      {/* Vendor pins */}
      {vendors.map((v, i) => (
        <button
          key={v.id}
          aria-label={v.name}
          className="absolute -translate-x-1/2 -translate-y-1/2 group"
          style={{
            left: `${v.x}%`,
            top: `${v.y}%`,
            animation: `fade-up 0.4s ease-out ${i * 0.04}s both`,
          }}
        >
          <span className="relative block">
            <span className="absolute -inset-1 rounded-full bg-[oklch(0.78_0.14_82/0.3)] blur-sm" />
            <span className="relative h-7 w-7 rounded-full bg-gradient-to-br from-[#fff3b0] to-[#b8860b] border-2 border-white shadow-[0_4px_10px_-2px_rgba(212,175,55,0.6)] grid place-items-center">
              <MapPin className="h-3.5 w-3.5 text-[color:oklch(0.20_0.05_85)]" strokeWidth={2.5} fill="currentColor" />
            </span>
          </span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[oklch(0.20_0.02_90/0.85)] text-white text-[8px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {v.name} · ★{v.rating}
          </span>
        </button>
      ))}
    </div>
  );
}
