import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { requireAdminAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    // Allow login page through without admin check
    if (location.pathname === "/admin/login") return;
    try {
      const res = await requireAdminAccess();
      if (!res.ok) {
        throw redirect({ to: "/admin/login" });
      }
    } catch (e: any) {
      // Surface redirects, otherwise treat any error (401/lookup) as not-admin
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
