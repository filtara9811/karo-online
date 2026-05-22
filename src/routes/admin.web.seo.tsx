import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/seo")({
  component: () => (
    <AdminLayout>
      <PageHeader title="SEO · Per Page" subtitle="Title, meta, keywords, OG image. Keep keywords lowercase & specific (e.g. 'vendor leads India')." />
      <CmsListEditor
        table="web_pages"
        titleField="slug"
        orderBy="slug"
        fields={[
          { key: "slug", label: "Slug (e.g. home, about, pricing)", type: "text" },
          { key: "seo_title", label: "SEO Title (<60 chars)", type: "text" },
          { key: "seo_description", label: "Meta Description (<160 chars)", type: "textarea", rows: 2 },
          { key: "seo_keywords", label: "Keywords (comma separated)", type: "tags" },
          { key: "og_image_url", label: "OG Image (1200×630)", type: "image", folder: "seo" },
          { key: "canonical_path", label: "Canonical Path (optional)", type: "text" },
          { key: "schema_json", label: "JSON-LD Schema (optional)", type: "json", help: "Paste valid JSON-LD; leave empty to skip." },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ slug: "new-page", is_active: true }}
      />
    </AdminLayout>
  ),
});
