import { createFileRoute } from "@tanstack/react-router";
import goldRepair from "@/assets/gold-cat-repair.png";
import goldCleaning from "@/assets/gold-cat-cleaning.png";
import goldBeauty from "@/assets/gold-cat-beauty.png";
import goldChef from "@/assets/gold-cat-chef.png";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Karo Online" },
      { name: "description", content: "Browse premium home services curated for the discerning." },
    ],
  }),
  component: ServicesPage,
});

const SERVICES = [
  { label: "Repairs", sub: "Plumbing · Electric · Carpentry", icon: goldRepair },
  { label: "Cleaning", sub: "Deep · Daily · Move-in", icon: goldCleaning },
  { label: "Beauty", sub: "Salon at home · Spa", icon: goldBeauty },
  { label: "Gourmet", sub: "Private chef · Catering", icon: goldChef },
];

function ServicesPage() {
  return (
    <div className="space-y-5">
      <header style={{ animation: "fade-up 0.7s ease-out both" }}>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">✦ Catalogue ✦</p>
        <h1 className="font-display text-3xl text-gold-gradient leading-tight mt-1">All Services</h1>
        <p className="text-sm text-muted-foreground italic mt-1">Curated for the maison</p>
      </header>

      <div className="space-y-3">
        {SERVICES.map((s, i) => (
          <button
            key={s.label}
            className="btn-3d w-full glass-wine rounded-2xl p-4 flex items-center gap-4 hover:shadow-gold-glow"
            style={{ animation: `fade-up 0.6s ease-out ${0.05 + i * 0.06}s both` }}
          >
            <div className="h-16 w-16 rounded-xl grid place-items-center bg-gradient-to-br from-[oklch(0.26_0.13_22)] to-[oklch(0.10_0.04_14)] border border-[color:oklch(0.84_0.15_85/0.35)] flex-shrink-0">
              <img src={s.icon} alt="" loading="lazy" width={64} height={64} className="h-12 w-12 object-contain" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-lg text-gold-gradient leading-tight">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
            <span className="text-[color:oklch(0.84_0.15_85/0.6)] text-xl">›</span>
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.5)] pt-4">
        ✦ Vendor catalogue arriving soon ✦
      </p>
    </div>
  );
}
