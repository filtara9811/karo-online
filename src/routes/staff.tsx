import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, ListChecks, Share2, Users, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Panel — Field Operations" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffLayout,
});

type Tab = { to: string; label: string; icon: typeof Home; exact?: boolean };
const TABS: Tab[] = [
  { to: "/staff", label: "Home", icon: Home, exact: true },
  { to: "/staff/tasks", label: "Leads", icon: ListChecks },
  { to: "/staff/wallet", label: "Referral", icon: Share2 },
  { to: "/staff/vendors", label: "My Team", icon: Users },
];

/** Routes inside /staff that must render without the staff auth gate. */
const PUBLIC_STAFF_PATHS = ["/staff/login", "/staff/onboard", "/s/onboard"];

type GateState = "checking" | "ok" | "no-session" | "not-staff" | "error";

function StaffLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicPath = PUBLIC_STAFF_PATHS.some((p) => pathname.startsWith(p));
  const [gate, setGate] = useState<GateState>("checking");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (isPublicPath) return;
    let c = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setGate("checking");
    (async () => {
      // Never let the spinner hang forever (slow / offline network)
      timer = setTimeout(() => { if (!c) setGate((g) => (g === "checking" ? "error" : g)); }, 8000);
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (c) return;
        if (!uid) {
          setGate("no-session");
          navigate({ to: "/staff/login" });
          return;
        }
        const { data: roles, error } = await supabase
          .from("user_roles").select("role").eq("user_id", uid);
        if (c) return;
        if (error) { setGate("error"); return; }
        if (!roles?.some((r) => r.role === "staff")) {
          setGate("not-staff");
          return;
        }
        setGate("ok");
      } catch {
        if (!c) setGate("error");
      } finally {
        if (timer) clearTimeout(timer);
      }
    })();
    return () => { c = true; if (timer) clearTimeout(timer); };
  }, [navigate, isPublicPath, pathname, retry]);

  // Hide bottom nav on chat detail page
  const hideNav = pathname.startsWith("/staff/chat/");

  // Login / onboarding pages render without the gate and without bottom nav
  if (isPublicPath) {
    return (
      <div className="min-h-screen bg-[oklch(0.985_0.008_88)] flex flex-col">
        <main className="flex-1"><Outlet /></main>
      </div>
    );
  }

  if (gate === "checking" || gate === "no-session") {
    return (
      <div className="min-h-screen grid place-items-center bg-[oklch(0.98_0.01_88)]">
        <Loader2 className="h-6 w-6 animate-spin text-[color:oklch(0.55_0.16_82)]" />
      </div>
    );
  }

  if (gate !== "ok") {
    const notStaff = gate === "not-staff";
    return (
      <div className="min-h-screen grid place-items-center bg-[oklch(0.98_0.01_88)] px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center">
          <h1 className="text-base font-bold text-slate-800">
            {notStaff ? "Yeh account staff nahi hai" : "Staff panel load nahi ho paya"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {notStaff
              ? "Is account ke paas staff access nahi hai. Staff account se login kijiye."
              : "Network ya server se connect nahi ho paya. Dobara koshish kijiye."}
          </p>
          <div className="mt-5 grid gap-2">
            {notStaff ? (
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/staff/login" }); }}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
              >
                Staff login
              </button>
            ) : (
              <button
                onClick={() => { setGate("checking"); setRetry((n) => n + 1); }}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
              >
                Retry
              </button>
            )}
            <Link to="/" className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.008_88)] flex flex-col">
      <main className={`flex-1 ${hideNav ? "" : "pb-20"}`}>
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="fixed bottom-3 left-3 right-3 z-40 bg-white rounded-full border border-slate-200 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.15)]">
          <div className="max-w-md mx-auto grid grid-cols-5 items-center relative">
            {TABS.slice(0, 2).map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${active ? "text-violet-600" : "text-slate-500"}`}>
                  <Icon className="h-5 w-5" />
                  <span>{t.label}</span>
                </Link>
              );
            })}
            <Link to="/staff/tasks" className="flex justify-center -mt-6">
              <span className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-white shadow-lg ring-4 ring-white">
                <Plus className="h-7 w-7" strokeWidth={3} />
              </span>
            </Link>
            {TABS.slice(2).map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${active ? "text-violet-600" : "text-slate-500"}`}>
                  <Icon className="h-5 w-5" />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
