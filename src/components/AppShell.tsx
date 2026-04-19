import { Link, Outlet, useLocation, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import goldBell from "@/assets/gold-bell.png";
import goldQuestion from "@/assets/gold-question-sphere.png";
import goldHome from "@/assets/gold-home.png";
import goldServices from "@/assets/gold-services.png";
import goldOrders from "@/assets/gold-orders.png";
import goldProfile from "@/assets/gold-profile.png";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: goldHome },
  { to: "/services", label: "Services", icon: goldServices },
  { to: "/orders", label: "Orders", icon: goldOrders },
  { to: "/profile", label: "Profile", icon: goldProfile },
] as const;

// Routes that should NOT show the persistent shell (full-screen flows)
const HIDE_SHELL_ON = ["/register"];

export function AppShell() {
  const location = useLocation();
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const hideShell = HIDE_SHELL_ON.some((p) => location.pathname.startsWith(p));

  // Luxury-fade page transitions
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
      {/* Ambient gold glows for white theme */}
      <div className="pointer-events-none fixed -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.08_92/0.25),transparent_70%)] blur-2xl" />

      <TopHeader />

      <main
        key={fadeKey}
        className="relative max-w-md mx-auto px-5 pt-4 pb-28"
        style={{ animation: "lux-fade 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <Outlet />
      </main>

      <BottomNav loading={isLoading} />
    </div>
  );
}

function TopHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[oklch(0.98_0.01_90/0.85)] border-b border-[color:oklch(0.84_0.15_85/0.35)]">
      <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="text-[9px] uppercase tracking-[0.35em] text-[color:oklch(0.45_0.08_85/0.8)]">Maison</span>
          <span className="font-display text-lg text-gold-gradient -mt-0.5">Karo · Online</span>
        </Link>
        <div className="flex items-center gap-2">
          <SphereButton icon={goldBell} label="Notifications" />
          <SphereButton icon={goldQuestion} label="Help" />
        </div>
      </div>
    </header>
  );
}

function SphereButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      aria-label={label}
      className="relative h-11 w-11 grid place-items-center rounded-full active:scale-90 transition-transform"
    >
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,217,122,0.3),transparent_70%)] blur-md" />
      <img
        src={icon}
        alt=""
        loading="lazy"
        width={44}
        height={44}
        className="relative h-9 w-9 object-contain drop-shadow-[0_4px_10px_rgba(245,217,122,0.45)]"
        style={{ animation: "float-y 3.6s ease-in-out infinite" }}
      />
    </button>
  );
}

function BottomNav({ loading }: { loading: boolean }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md mx-auto px-3 pb-3">
        <div className="glass-sheet rounded-3xl px-2 py-2 flex items-center justify-around relative overflow-hidden">
          {loading && (
            <span
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f5d97a] to-transparent"
              style={{ animation: "shimmer 1.4s linear infinite" }}
            />
          )}
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              className="group flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl active:scale-90 transition-transform"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative h-11 w-11 grid place-items-center rounded-2xl transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-[oklch(0.95_0.05_90)] to-[oklch(0.98_0.02_90)] shadow-gold-glow border border-[color:oklch(0.84_0.15_85/0.8)]"
                        : "border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,rgba(245,217,122,0.35),transparent_70%)] blur-md" />
                    )}
                    <img
                      src={item.icon}
                      alt=""
                      loading="lazy"
                      width={44}
                      height={44}
                      className={`relative h-8 w-8 object-contain transition-transform ${
                        isActive
                          ? "drop-shadow-[0_4px_8px_rgba(245,217,122,0.6)] scale-110"
                          : "opacity-60 group-hover:opacity-100"
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.18em] transition-colors ${
                      isActive ? "text-gold-gradient font-medium" : "text-[color:oklch(0.40_0.05_85/0.6)]"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
