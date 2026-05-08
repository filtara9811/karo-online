import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import {
  AdminLayout,
  GoldCard,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <AdminLayout>
      <PageHeader
        title="Customers"
        subtitle="Sabhi registered users"
      />
      <GoldCard className="p-12 text-center">
        <Users className="h-12 w-12 text-[#d4af37]/40 mx-auto mb-4" />
        <h3
          className="font-display text-xl font-bold mb-2"
          style={{
            background: "linear-gradient(180deg, #fff8dc, #d4af37)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Customers Module
        </h3>
        <p className="text-sm text-[#f5d97a]/60 max-w-md mx-auto leading-relaxed">
          Customer profiles table jab hum next phase mein add karenge, yahan
          unka full list, search, filter aur details aa jayenge.
        </p>
      </GoldCard>
    </AdminLayout>
  );
}
