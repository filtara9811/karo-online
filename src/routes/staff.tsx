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

function StaffLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) { if (!c) navigate({ to: "/staff/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (c) return;
      if (!roles?.some((r) => r.role === "staff")) {
        await supabase.auth.signOut();
        navigate({ to: "/staff/login" });
        return;
      }
      setChecking(false);
    })();
    return () => { c = true; };
  }, [navigate]);

  // Hide bottom nav on chat detail page
  const hideNav = pathname.startsWith("/staff/chat/");

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-[oklch(0.98_0.01_88)]">
        <Loader2 className="h-6 w-6 animate-spin text-[color:oklch(0.55_0.16_82)]" />
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
