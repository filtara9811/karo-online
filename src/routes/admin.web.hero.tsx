import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/hero")({
  component: () => (
    <AdminLayout>
      <PageHeader title="Hero Banners" subtitle="One hero per page slug — first match wins." />
      <CmsListEditor
        table="web_hero_sections"
        titleField="page_slug"
        orderBy="page_slug"
        fields={[
          { key: "page_slug", label: "Page Slug", type: "text" },
          { key: "eyebrow", label: "Eyebrow Label", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "textarea", rows: 2 },
          { key: "image_url", label: "Hero Image", type: "image", folder: "hero" },
          { key: "cta_label", label: "Primary CTA Label", type: "text" },
          { key: "cta_url", label: "Primary CTA URL", type: "url" },
          { key: "secondary_cta_label", label: "Secondary CTA Label", type: "text" },
          { key: "secondary_cta_url", label: "Secondary CTA URL", type: "url" },
          { key: "alignment", label: "Alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }] },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ page_slug: "home", alignment: "left", is_active: true }}
      />
    </AdminLayout>
  ),
});
