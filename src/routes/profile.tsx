import { createFileRoute, Link } from "@tanstack/react-router";
import goldProfile from "@/assets/gold-profile.png";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Karo Online" },
      { name: "description", content: "Your maison profile and preferences." },
    ],
  }),
  component: ProfilePage,
});

const ROWS = [
  { label: "Personal Details", sub: "Name · Salutation" },
  { label: "KYC Verification", sub: "Pending · Page 2" },
  { label: "Bank Details", sub: "Add account · Page 4" },
  { label: "Saved Addresses", sub: "Bandra West +1" },
  { label: "Payment Methods", sub: "VISA · UPI" },
  { label: "Help & Support", sub: "Concierge · 24×7" },
];

function ProfilePage() {
  return (
    <div className="space-y-6">
      <header
        className="glass-wine rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden"
        style={{ animation: "fade-up 0.7s ease-out both" }}
      >
        <div className="relative h-20 w-20 rounded-2xl grid place-items-center bg-gradient-to-br from-[oklch(0.26_0.13_22)] to-[oklch(0.10_0.04_14)] border border-[color:oklch(0.84_0.15_85/0.5)] shadow-gold-glow flex-shrink-0">
          <img src={goldProfile} alt="" loading="lazy" width={80} height={80} className="h-16 w-16 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">✦ Membre ✦</p>
          <p className="font-display text-2xl text-gold-gradient leading-tight truncate">Guest</p>
          <Link to="/register" className="text-xs text-muted-foreground mt-0.5 inline-block hover:text-[color:oklch(0.84_0.15_85)]">
            Complete registration ›
          </Link>
        </div>
      </header>

      <div className="space-y-2">
        {ROWS.map((r, i) => (
          <button
            key={r.label}
            className="btn-3d w-full glass-wine rounded-2xl px-4 py-3.5 flex items-center justify-between text-left"
            style={{ animation: `fade-up 0.5s ease-out ${0.05 + i * 0.05}s both` }}
          >
            <div>
              <p className="font-display text-base text-gold-gradient leading-tight">{r.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{r.sub}</p>
            </div>
            <span className="text-[color:oklch(0.84_0.15_85/0.6)] text-xl">›</span>
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.5)]">
        ✦ Crafted for the discerning ✦
      </p>
    </div>
  );
}
