import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/offers")({
  component: () => (
    <AdminLayout>
      <PageHeader title="Offer Bar" subtitle="Top announcement strip. Latest active row wins." />
      <CmsListEditor
        table="web_offers"
        titleField="title"
        orderBy="updated_at"
        orderAsc={false}
        fields={[
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "text" },
          { key: "cta_label", label: "CTA Label", type: "text" },
          { key: "cta_url", label: "CTA URL", type: "url" },
          { key: "bg_color", label: "Background Color (hex)", type: "text" },
          { key: "text_color", label: "Text Color (hex)", type: "text" },
          { key: "starts_at", label: "Starts At (ISO datetime)", type: "text" },
          { key: "ends_at", label: "Ends At (ISO datetime)", type: "text" },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ title: "New Offer", bg_color: "#d4af37", text_color: "#1a1208", is_active: true }}
      />
    </AdminLayout>
  ),
});
