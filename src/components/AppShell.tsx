import { Link, Outlet, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ShoppingBasket, Search, Star, UserPlus, Package, Wrench, Sparkles, Crown, type LucideIcon } from "lucide-react";
import goldServices from "@/assets/gold-services.png";
import goldRepair from "@/assets/gold-cat-repair.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import goldOrders from "@/assets/gold-orders.png";
import goldOther from "@/assets/gold-other.png";
import avatarUser from "@/assets/avatar-user.png";
import { ActionPicker, type ActionOption } from "@/components/ActionPicker";
import { useActiveTypeId } from "@/hooks/use-active-type";
import { AuthGate } from "@/components/AuthGate";
import { VendorLeadAlerts } from "@/components/VendorLeadAlerts";
import { ActionAlertBanner } from "@/components/ActionAlertBanner";
import { PermissionsGate } from "@/components/PermissionsGate";
import { useAuth } from "@/hooks/use-auth";
import { useFcmToken } from "@/hooks/use-fcm-token";

/** Static 3 catalog types — no DB fetch (avoids loading delays). */
type StaticType = { id: string; code: "product" | "service" | "other"; name: string; Icon: LucideIcon; iconImg: string; sub: string };
const STATIC_TYPES: StaticType[] = [
  { id: "product", code: "product", name: "Product", Icon: Package, iconImg: goldOrders, sub: "Browse products & shop categories" },
  { id: "service", code: "service", name: "Service", Icon: Wrench, iconImg: goldRepair, sub: "Book trusted services nearby" },
  { id: "other", code: "other", name: "Other", Icon: Sparkles, iconImg: goldOther, sub: "Everything else · special needs" },
];

const TYPE_OPTIONS: ActionOption[] = STATIC_TYPES.map((t) => ({
  value: t.id,
  label: t.name,
  sub: t.sub,
  icon: t.iconImg,
}));

const HIDE_SHELL_ON: string[] = ["/register", "/chat", "/status", "/vendors", "/profile", "/product", "/vendor/", "/admin", "/referral", "/r/"];
const HIDE_TOP_HEADER_ON = ["/quick", "/chat", "/status", "/vendors", "/profile", "/product", "/vendor/", "/admin"];
// Bottom service/product picker bar ONLY shows on these routes (home, quick, vendors).
// Everywhere else it's hidden to reduce clutter.
const SHOW_BOTTOM_BAR_ON = ["/", "/quick", "/vendors", "/home"];

const RESELLING_OPTIONS: ActionOption[] = [
  { value: "quick", label: "Quick Service", sub: "Instant repairs · cleaning · beauty", icon: goldRepair, badge: "FAST" },
  { value: "all", label: "All Vendors", sub: "Browse all nearby shops & services", icon: goldServices },
  { value: "vendor", label: "Become a Vendor", sub: "Onboard your business · download vendor app", icon: goldBriefcase },
];

export function AppShell() {
  const location = useLocation();
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  useFcmToken();
  const hideShell = HIDE_SHELL_ON.some((p) => location.pathname.startsWith(p));
  const hideTopHeader = HIDE_TOP_HEADER_ON.some((p) => location.pathname.startsWith(p));
  const showBottomBar = SHOW_BOTTOM_BAR_ON.includes(location.pathname);
  const hideBottomBar = !showBottomBar;
  const isQuickRoute = location.pathname.startsWith("/quick");

  const [fadeKey, setFadeKey] = useState(location.pathname);
  useEffect(() => {
    setFadeKey(location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  if (hideShell) {
    return (
      <AuthGate>
        <Outlet />
        <VendorLeadAlerts />
        <PermissionsGate />
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="min-h-screen relative">
        <div className="pointer-events-none fixed -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none fixed -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.08_92/0.25),transparent_70%)] blur-2xl" />

        <ActionAlertBanner role="customer" />
        {!hideTopHeader && <TopHeader />}

        <main
          key={fadeKey}
          className={`relative ${hideTopHeader ? "" : "max-w-md mx-auto px-4 pt-3"} ${isQuickRoute ? "pb-0" : "pb-36"}`}
          style={isQuickRoute ? undefined : { animation: "lux-fade 0.22s cubic-bezier(0.22, 1, 0.36, 1)", willChange: "transform, opacity" }}
        >
          <Outlet />
        </main>

        {!hideBottomBar && <BottomActionBar loading={isLoading} />}

        <VendorLeadAlerts />
        <PermissionsGate />
      </div>
    </AuthGate>
  );
}

function TopHeader() {
  const { profile } = useAuth();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-[color:oklch(0.78_0.14_82/0.35)]">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Sign-up / Login icon (top-left) */}
        <Link
          to="/register"
          aria-label="Sign up or Login"
          className="btn-3d relative h-10 w-10 grid place-items-center rounded-full text-[color:oklch(0.18_0.06_18)] shadow-gold-glow active:scale-90 flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, #fff3c8 0%, #f5d97a 50%, #d4af37 100%)",
            border: "1.5px solid rgba(255,255,255,0.7)",
          }}
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.4} />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-white border border-[#d4af37] grid place-items-center text-[8px] font-bold text-[#8b6508]">
            +
          </span>
        </Link>

        {/* User chip */}
        <Link to="/profile" className="flex items-center gap-2 flex-1 min-w-0">
          <span className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-gold-glow flex-shrink-0 bg-white">
            <img
              src={profile?.avatar_url || avatarUser}
              alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarUser; }}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-display text-sm text-gold-gradient truncate">{profile?.name || "Welcome"}</span>
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
      {/* Premium search row */}
      <div className="max-w-md mx-auto px-4 pb-2.5 flex items-center gap-2">
        <label className="flex-1 group flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-[#fdfaf0] border border-[color:oklch(0.78_0.14_82/0.5)] px-3.5 py-2.5 shadow-[0_2px_10px_-3px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.8)] focus-within:shadow-gold-glow transition-shadow">
          <Search className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] flex-shrink-0" strokeWidth={2.4} />
          <input
            type="search"
            placeholder="Search markets, brands…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[color:oklch(0.55_0.05_85/0.7)] placeholder:italic min-w-0"
          />
        </label>
        <ChipIcon label="Notifications" badge="2">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
        </ChipIcon>
        <Link to="/cart" aria-label="Cart">
          <ChipIcon label="Cart" badge="3">
            <ShoppingBasket className="h-5 w-5" strokeWidth={2.2} />
          </ChipIcon>
        </Link>
      </div>

      {/* Premium shop rating strip */}
      <div className="max-w-md mx-auto px-4 pb-2.5">
        <div className="flex items-stretch rounded-full bg-gradient-to-r from-[#fff8dc]/80 via-white to-[#fff3c8]/70 border border-[color:oklch(0.78_0.14_82/0.4)] px-3 py-1.5 shadow-[0_1px_8px_-2px_rgba(212,175,55,0.25)] divide-x divide-[color:oklch(0.78_0.14_82/0.25)]">
          <RatingChip icon={<Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />} value="4.9" label="Rating" />
          <RatingChip value="1.2k" label="Reviews" />
          <RatingChip value="98%" label="Happy" />
          <RatingChip value="A+" label="Service" />
        </div>
      </div>
    </header>
  );
}

function ChipIcon({ children, label, badge }: { children: React.ReactNode; label: string; badge?: string }) {
  return (
    <button
      aria-label={label}
      className="btn-3d relative h-10 w-10 grid place-items-center rounded-full bg-gradient-to-br from-white to-[#fdf6dd] border border-[color:oklch(0.78_0.14_82/0.55)] text-[color:oklch(0.42_0.10_82)] shadow-[0_2px_8px_-2px_rgba(212,175,55,0.4),inset_0_1px_0_rgba(255,255,255,0.9)] active:scale-90 flex-shrink-0"
    >
      {children}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-gradient-to-br from-[#f5d97a] via-[#d4af37] to-[#8b6508] text-[9px] font-bold text-white grid place-items-center shadow-[0_2px_6px_rgba(212,175,55,0.6)] animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}

function RatingChip({ icon, value, label }: { icon?: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-1">
      <span className="flex items-center gap-1 font-display text-[13px] text-gold-gradient font-bold leading-none">
        {icon}
        {value}
      </span>
      <span className="text-[8px] uppercase tracking-[0.18em] text-[color:oklch(0.45_0.05_85)] mt-0.5">{label}</span>
    </div>
  );
}

function BottomActionBar({ loading }: { loading: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [picker, setPicker] = useState<null | "reselling" | "types">(null);
  const [defaultHome, setDefaultHome] = useState<string | null>(null);
  const [activeTypeId, setActiveTypeId] = useActiveTypeId();
  

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDefaultHome(localStorage.getItem("ko-default-home"));
  }, [picker]);

  const handleResellingSelect = (value: string) => {
    setPicker(null);
    if (value === "quick") setTimeout(() => navigate({ to: "/quick" }), 250);
    else if (value === "vendor") setTimeout(() => navigate({ to: "/vendor/register" }), 250);
    else if (value === "all") setTimeout(() => navigate({ to: "/vendors" }), 250);
    else setTimeout(() => navigate({ to: "/" }), 250);
  };

  const handleSetDefault = (value: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ko-default-home", value);
    }
    setDefaultHome(value);
  };

  const handleTypeSelect = (value: string) => {
    const t = STATIC_TYPES.find((x) => x.id === value);
    if (!t) return;
    setActiveTypeId(t.id);
    setPicker(null);
    const target = t.code === "service" ? "/quick" : "/";
    if (location.pathname !== target) setTimeout(() => navigate({ to: target }), 220);
  };


  const activeType = STATIC_TYPES.find((x) => x.id === activeTypeId);

  return (
    <>
      <div
        data-bottom-action-bar
        className="fixed inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
        style={{ bottom: 0 }}
      >
        <div className="max-w-md mx-auto px-4 pb-2 pt-0 flex flex-col items-stretch">

          {/* Single segmented pill — glassy/translucent so it merges with the categories panel above */}
          <div
            className="relative overflow-hidden rounded-full border border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.35)] flex items-stretch backdrop-blur-md"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,248,220,0.7) 100%)",
            }}
          >
            {loading && (
              <span
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent z-10"
                style={{ animation: "shimmer 1.4s linear infinite" }}
              />
            )}

            {/* LEFT — opens Product/Service/Other picker. Shows pinned type's GOLD ICON + name. */}
            <button
              onClick={() => setPicker("types")}
              className="btn-3d flex-1 flex items-center justify-center gap-2 px-4 py-3 active:scale-[0.97] transition-transform"
              aria-label="Choose catalog type"
            >
              <span
                className="h-6 w-6 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-sm overflow-hidden flex-shrink-0"
              >
                <img
                  src={(activeType ?? STATIC_TYPES[1]).iconImg}
                  alt=""
                  className="h-5 w-5 object-contain drop-shadow-[0_1px_2px_rgba(212,175,55,0.5)]"
                />
              </span>
              <span className="font-display text-[12px] text-gold-gradient font-bold italic tracking-tight rounded-2xl">
                All | Digital | Shop
              </span>
              <span className="text-[color:oklch(0.78_0.14_82)] text-[10px]">▾</span>
            </button>

            {/* Divider */}
            <span className="w-px self-stretch my-2 bg-[color:oklch(0.78_0.14_82/0.35)]" />

            {/* RIGHT — opens Quick | Sarvic / Vendor / All picker */}
            <button
              onClick={() => setPicker("reselling")}
              className="btn-3d flex-1 flex items-center justify-center gap-2 px-4 py-3 active:scale-[0.97] transition-transform"
              aria-label="Quick Sarvic"
            >
              <span className="text-[color:oklch(0.55_0.18_60)] text-base">⚡</span>
              <span className="font-display text-[12px] text-gold-gradient font-bold italic tracking-tight rounded-2xl">
                Basic | Sarvice
              </span>
              <span className="text-[color:oklch(0.78_0.14_82)] text-[10px]">▾</span>
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
        defaultValue={defaultHome ?? undefined}
        onSetDefault={handleSetDefault}
      />
      <ActionPicker
        open={picker === "types"}
        title="What you want?"
        subtitle="Choose a catalog to browse"
        options={TYPE_OPTIONS}
        onSelect={handleTypeSelect}
        onClose={() => setPicker(null)}
        defaultValue={activeTypeId ?? undefined}
        onSetDefault={(value) => setActiveTypeId(value)}
        topRightAction={
          <Link
            to="/admin"
            onClick={() => setPicker(null)}
            className="group inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-r from-[#1a1208] via-[#2a1d0a] to-[#1a1208] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.5)] active:scale-95"
            aria-label="Open Admin"
          >
            <span
              className="h-4 w-4 rounded-full grid place-items-center"
              style={{ background: "linear-gradient(180deg,#fff8dc,#d4af37 60%,#8b6508)" }}
            >
              <Crown className="h-2.5 w-2.5 text-[#1a1208]" strokeWidth={2.5} />
            </span>
            <span
              className="text-[8px] font-bold uppercase tracking-[0.22em]"
              style={{
                background: "linear-gradient(180deg,#fff8dc,#f5d97a 40%,#d4af37)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Admin
            </span>
          </Link>
        }
      />
    </>
  );
}
