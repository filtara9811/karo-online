import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "support"]);

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    // Allow login page through without admin check
    if (location.pathname === "/admin/login") return;

    // Check session client-side (supabase persists session in localStorage)
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      throw redirect({ to: "/admin/login" });
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error || !data || data.length === 0) {
      throw redirect({ to: "/admin/login" });
    }

    const isAdmin = data.some((r) => ADMIN_ROLES.has(r.role));
    if (!isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
