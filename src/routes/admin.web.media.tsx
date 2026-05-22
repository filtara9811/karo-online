import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader, GoldCard } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/media")({
  component: () => (
    <AdminLayout>
      <PageHeader title="Media Library" subtitle="Reusable images, with alt text for SEO." />
      <GoldCard className="p-4 mb-4 text-xs text-[#f5d97a]/80">
        Tip: most image fields throughout admin upload directly to storage. Add a row here only if you want to catalog an asset for reuse (with alt text & tags).
      </GoldCard>
      <CmsListEditor
        table="web_media_assets"
        titleField="alt"
        orderBy="created_at"
        orderAsc={false}
        fields={[
          { key: "public_url", label: "Image", type: "image", folder: "library" },
          { key: "alt", label: "Alt Text (required for SEO)", type: "text" },
          { key: "tags", label: "Tags (comma sep)", type: "tags" },
        ]}
        defaults={{}}
      />
    </AdminLayout>
  ),
});
