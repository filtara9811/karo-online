import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/testimonials")({
  component: () => (
    <AdminLayout>
      <PageHeader title="Testimonials & Brand Logos" />
      <CmsListEditor
        table="web_testimonials"
        titleField="author_name"
        orderBy="sort_order"
        fields={[
          { key: "author_name", label: "Author Name", type: "text" },
          { key: "role", label: "Role / Company", type: "text" },
          { key: "avatar_url", label: "Avatar", type: "image", folder: "testimonials" },
          { key: "rating", label: "Rating (1-5)", type: "number" },
          { key: "quote", label: "Quote", type: "textarea", rows: 4 },
          { key: "sort_order", label: "Sort Order", type: "number" },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ rating: 5, sort_order: 10, is_active: true }}
      />
    </AdminLayout>
  ),
});
