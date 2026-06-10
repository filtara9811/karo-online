import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/pricing")({
  component: () => (
    <AdminLayout>
      <PageHeader title="Pricing Plans" subtitle="Public website pricing cards" />
      <CmsListEditor
        table="web_pricing_plans"
        titleField="name"
        orderBy="sort_order"
        fields={[
          { key: "name", label: "Plan Name", type: "text" },
          { key: "price", label: "Price", type: "number" },
          { key: "currency", label: "Currency (INR/USD)", type: "text" },
          { key: "period", label: "Period (mo, yr, one-time)", type: "text" },
          { key: "description", label: "Description", type: "textarea", rows: 2 },
          { key: "features", label: "Features (comma separated)", type: "tags" },
          { key: "cta_label", label: "CTA Label", type: "text" },
          { key: "cta_url", label: "CTA URL", type: "url" },
          { key: "badge_label", label: "Badge (e.g. POPULAR)", type: "text" },
          { key: "is_featured", label: "Featured (highlighted)", type: "bool" },
          { key: "sort_order", label: "Sort Order", type: "number" },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ name: "New Plan", price: "0", currency: "INR", period: "mo", cta_label: "Get Started", cta_url: "/quick", sort_order: 10, is_featured: false, is_active: true }}
      />
    </AdminLayout>
  ),
});
