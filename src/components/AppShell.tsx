import { Link, Outlet, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import goldBell from "@/assets/gold-bell.png";
import goldQr from "@/assets/gold-qr.png";
import goldServices from "@/assets/gold-services.png";
import goldPin from "@/assets/gold-pin.png";
import goldRepair from "@/assets/gold-cat-repair.png";
import goldUser from "@/assets/gold-user.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import avatarUser from "@/assets/avatar-user.png";
import { ActionPicker, type ActionOption } from "@/components/ActionPicker";
import { ProductServicePicker } from "@/components/ProductServicePicker";

const HIDE_SHELL_ON = ["/register", "/quick"];

const RESELLING_OPTIONS: ActionOption[] = [
  { value: "quick", label: "Quick Service", sub: "Instant repairs · cleaning · beauty", icon: goldRepair, badge: "FAST" },
  { value: "vendor", label: "Vendor", sub: "Onboard your business · sell services", icon: goldBriefcase },
  { value: "all", label: "All", sub: "Quick service + vendor combined", icon: goldServices },
];

const VENDOR_OPTIONS: ActionOption[] = [
  { value: "join", label: "Join as Partner", sub: "Become a Karo Online vendor", icon: goldBriefcase, badge: "NEW" },
  { value: "lead", label: "Lead Selling Business", sub: "Earn from qualified leads", icon: goldUser },
  { value: "refer", label: "Refer & Earn", sub: "Bring partners · earn commission", icon: goldPin },
];

export function AppShell() {
  const location = useLocation();
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const hideShell = HIDE_SHELL_ON.some((p) => location.pathname.startsWith(p));

  const [fadeKey, setFadeKey] = useState(location.pathname);
  useEffect(() => setFadeKey(location.pathname), [location.pathname]);

  if (hideShell) {
    return (
      <div key={fadeKey} style={{ animation: "lux-fade 0.6s ease-out" }}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none fixed -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.08_92/0.25),transparent_70%)] blur-2xl" />

      <TopHeader />

      <main
        key={fadeKey}
        className="relative max-w-md mx-auto px-4 pt-3 pb-36"
        style={{ animation: "lux-fade 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <Outlet />
      </main>

      <BottomActionBar loading={isLoading} />
    </div>
  );
}

function TopHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-[color:oklch(0.78_0.14_82/0.35)]">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* User chip */}
        <Link to="/profile" className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-gold-glow flex-shrink-0 bg-white">
            <img src={avatarUser} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-display text-base text-gold-gradient truncate">Ashhu Qureshi</span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.45_0.08_85/0.8)]">
              Reselling | Affiliate
            </span>
          </span>
        </Link>

        {/* Refferal Join CTA */}
        <Link
          to="/register"
          className="btn-3d relative overflow-hidden rounded-xl px-4 py-2.5 bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-semibold text-sm shadow-gold-glow"
        >
          <span
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }}
          />
          <span className="relative">Refferal join</span>
        </Link>
      </div>

      {/* Location + search row */}
      <div className="max-w-md mx-auto px-4 pb-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-2xl bg-white/95 border border-[color:oklch(0.78_0.14_82/0.45)] px-3 py-2 shadow-sm">
          <img src={goldPin} alt="" className="h-4 w-4 object-contain" />
          <span className="font-display text-sm text-gold-gradient font-semibold">Delhi 6</span>
          <span className="text-[10px] text-muted-foreground italic ml-1 truncate">· Search markets, brands…</span>
        </div>
        <SphereButton icon={goldQr} label="Scan QR" />
        <SphereButton icon={goldBell} label="Notifications" badge="2" />
      </div>
    </header>
  );
}

function SphereButton({ icon, label, badge }: { icon: string; label: string; badge?: string }) {
  return (
    <button
      aria-label={label}
      className="btn-3d relative h-11 w-11 grid place-items-center rounded-full active:scale-90"
    >
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,217,122,0.3),transparent_70%)] blur-md" />
      <img
        src={icon}
        alt=""
        loading="lazy"
        width={44}
        height={44}
        className="relative h-9 w-9 object-contain drop-shadow-[0_4px_10px_rgba(245,217,122,0.45)]"
      />
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b6508] text-[9px] font-bold text-white grid place-items-center shadow">
          {badge}
        </span>
      )}
    </button>
  );
}

function BottomActionBar({ loading }: { loading: boolean }) {
  const navigate = useNavigate();
  const [picker, setPicker] = useState<null | "reselling" | "vendor" | "browse">(null);

  const handleResellingSelect = (value: string) => {
    setPicker(null);
    if (value === "quick") setTimeout(() => navigate({ to: "/quick" }), 250);
    else if (value === "vendor") setTimeout(() => setPicker("vendor"), 350);
    else setTimeout(() => navigate({ to: "/" }), 250);
  };

  const handleVendorSelect = () => {
    setPicker(null);
    setTimeout(() => navigate({ to: "/register" }), 250);
  };

  const handleBrowsePick = (mode: "products" | "services") => {
    setPicker(null);
    setTimeout(() => navigate({ to: mode === "services" ? "/quick" : "/" }), 250);
  };

  return (
    <>
      {/* Bottom dock — nav strip glued directly on top of the action bar */}
      <div
        className="fixed inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
        style={{ bottom: 0 }}
      >
        <div className="max-w-md mx-auto px-3 pb-3 flex flex-col items-stretch">
          {/* Curved bottom action bar */}
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/98 to-[oklch(0.97_0.02_88)] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.35)] flex items-center justify-between px-3 py-3 pt-5"
            style={{ borderRadius: "28px" }}
          >
            {loading && (
              <span
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"
                style={{ animation: "shimmer 1.4s linear infinite" }}
              />
            )}

            {/* Left — Sarvic | Products */}
            <button
              onClick={() => setPicker("browse")}
              className="btn-3d flex items-center gap-2 active:scale-95 px-3 py-2 rounded-2xl"
              aria-label="Sarvic Products"
            >
              <span className="relative h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border-2 border-[color:oklch(0.78_0.14_82/0.7)] shadow-gold-glow">
                <img src={goldPin} alt="" className="h-6 w-6 object-contain drop-shadow-[0_2px_4px_rgba(212,175,55,0.5)]" />
              </span>
              <span className="font-display text-base text-gold-gradient font-bold italic tracking-wide">
                Sarvic<span className="font-light"> | </span>Products
              </span>
              <span className="text-[color:oklch(0.78_0.14_82)] text-base">▾</span>
            </button>

            {/* Right — Quick | Sarvic */}
            <button
              onClick={() => setPicker("reselling")}
              className="btn-3d flex items-center gap-2 active:scale-95 px-3 py-2 rounded-2xl"
              aria-label="Quick Sarvic"
            >
              <span className="text-[color:oklch(0.55_0.18_60)] text-lg">⚡</span>
              <span className="font-display text-base text-gold-gradient font-bold italic tracking-wide">
                Quick<span className="font-light"> | </span>Sarvic
              </span>
              <span className="text-[color:oklch(0.78_0.14_82)] text-base">▾</span>
            </button>
          </div>
        </div>
      </div>

      <ActionPicker
        open={picker === "reselling"}
        title="Reselling Program"
        subtitle="Choose how you want to engage"
        options={RESELLING_OPTIONS}
        onSelect={handleResellingSelect}
        onClose={() => setPicker(null)}
      />
      <ActionPicker
        open={picker === "vendor"}
        title="Join as Vendor"
        subtitle="Lead-selling business onboarding"
        options={VENDOR_OPTIONS}
        onSelect={handleVendorSelect}
        onClose={() => setPicker(null)}
      />
      <ProductServicePicker
        open={picker === "browse"}
        onClose={() => setPicker(null)}
        onCategoryPick={(mode) => handleBrowsePick(mode)}
      />
    </>
  );
}
