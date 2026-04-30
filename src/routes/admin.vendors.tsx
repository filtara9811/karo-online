import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import {
  AdminLayout,
  GoldCard,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  return (
    <AdminLayout>
      <PageHeader title="Vendors" subtitle="Active sellers aur shops" />
      <GoldCard className="p-12 text-center">
        <Store className="h-12 w-12 text-[#d4af37]/40 mx-auto mb-4" />
        <h3
          className="font-display text-xl font-bold mb-2"
          style={{
            background: "linear-gradient(180deg, #fff8dc, #d4af37)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Vendors Module
        </h3>
        <p className="text-sm text-[#f5d97a]/60 max-w-md mx-auto leading-relaxed">
          Vendor onboarding table jab connect hoga, sabhi vendors yahan list
          honge with approve/suspend actions.
        </p>
      </GoldCard>
    </AdminLayout>
  );
}
