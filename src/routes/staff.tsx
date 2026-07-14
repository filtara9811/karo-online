import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Store, ListChecks, Wallet, Loader2 } from "lucide-react";
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

type Tab = { to: string; label: string; icon: typeof MessageSquare; exact?: boolean };
const TABS: Tab[] = [
  { to: "/staff", label: "Chats", icon: MessageSquare, exact: true },
  { to: "/staff/vendors", label: "Vendors", icon: Store },
  { to: "/staff/tasks", label: "Tasks", icon: ListChecks },
  { to: "/staff/wallet", label: "Wallet", icon: Wallet },
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
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[color:oklch(0.9_0.03_85)] shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
          <div className="max-w-md mx-auto grid grid-cols-4">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${active ? "text-[color:oklch(0.55_0.16_82)]" : "text-muted-foreground"}`}>
                  <Icon className={`h-5 w-5 ${active ? "fill-[oklch(0.9_0.08_85/0.3)]" : ""}`} />
                  <span>{t.label}</span>
                  {active && <div className="h-0.5 w-6 rounded-full bg-[color:oklch(0.55_0.16_82)]" />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
