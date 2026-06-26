import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAccess } from "@/lib/admin.functions";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "support"]);

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/reset-password",
]);

export const Route = createFileRoute("/admin")({
  // Server-side gate: validates the bearer token and the user's role via the
  // protected `requireAdminAccess` server fn. Cannot be bypassed by disabling
  // JS or manipulating the client router. The client-side check below remains
  // as a UX layer for fast redirects.
  beforeLoad: async ({ location }) => {
    if (PUBLIC_ADMIN_PATHS.has(location.pathname)) return;

    // Server check (authoritative). Failures throw a redirect to /admin/login.
    try {
      const res = await requireAdminAccess();
      if (!res?.ok) throw redirect({ to: "/admin/login" });
    } catch (e: any) {
      // If the call itself threw (e.g. no auth header during SSR/prerender),
      // fall back to the client check below — never silently allow access.
      if (typeof window === "undefined") {
        throw redirect({ to: "/admin/login" });
      }
    }

    // Client UX check (fast redirect once session is already loaded).
    if (typeof window !== "undefined") {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw redirect({ to: "/admin/login" });

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error || !data || data.length === 0) {
        throw redirect({ to: "/admin/login" });
      }
      const isAdmin = data.some((r) => ADMIN_ROLES.has(r.role));
      if (!isAdmin) throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
