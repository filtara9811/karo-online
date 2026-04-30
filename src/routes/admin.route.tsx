import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Layout for everything under /admin/*  (except /admin/login which is its own file)
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
