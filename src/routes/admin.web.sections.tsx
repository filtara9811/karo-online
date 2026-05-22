import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/sections")({
  component: () => (
    <AdminLayout>
      <PageHeader title="Content Blocks" subtitle="Reusable blocks per page. Order by 'sort_order'." />
      <CmsListEditor
        table="web_content_blocks"
        titleField="heading"
        orderBy="sort_order"
        rowBadge={(r) => `${r.page_slug ?? "—"} · ${r.block_type ?? "text"}`}
        fields={[
          { key: "page_slug", label: "Page Slug", type: "text" },
          { key: "block_type", label: "Block Type", type: "select", options: [
            { value: "feature", label: "Feature Grid" },
            { value: "text", label: "Text + Image" },
            { value: "image", label: "Image" },
            { value: "cards", label: "Card Grid" },
            { value: "cta", label: "Call to Action" },
            { value: "stats", label: "Stats Strip" },
          ]},
          { key: "heading", label: "Heading", type: "text" },
          { key: "body", label: "Body (Markdown)", type: "textarea", rows: 6 },
          { key: "image_url", label: "Image", type: "image", folder: "blocks" },
          { key: "items", label: "Items (JSON array)", type: "json", help: 'Example: [{"icon":"Zap","title":"Fast","desc":"…"}]' },
          { key: "sort_order", label: "Sort Order", type: "number" },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ page_slug: "home", block_type: "text", sort_order: 10, is_active: true }}
      />
    </AdminLayout>
  ),
});
