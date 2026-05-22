import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/blog")({
  component: () => (
    <AdminLayout>
      <PageHeader
        title="Blog · SEO Articles"
        subtitle="Markdown supported. Each post auto-generates JSON-LD BlogPosting schema."
      />
      <CmsListEditor
        table="web_blog_posts"
        titleField="title"
        orderBy="published_at"
        orderAsc={false}
        rowBadge={(r) => (r.is_published ? "PUBLISHED" : "DRAFT")}
        fields={[
          { key: "title", label: "Title", type: "text" },
          { key: "slug", label: "URL Slug", type: "text" },
          { key: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
          { key: "cover_image_url", label: "Cover Image (also used as OG/Twitter image)", type: "image", folder: "blog" },
          { key: "cover_image_alt", label: "Cover Alt Text (SEO)", type: "text" },
          { key: "body_md", label: "Body (Markdown)", type: "textarea", rows: 18 },
          { key: "author_name", label: "Author Name", type: "text" },
          { key: "author_avatar", label: "Author Avatar", type: "image", folder: "authors" },
          { key: "tags", label: "Tags (comma sep)", type: "tags" },
          { key: "seo_title", label: "SEO Title", type: "text" },
          { key: "seo_description", label: "Meta Description", type: "textarea", rows: 2 },
          { key: "reading_minutes", label: "Reading Minutes", type: "number" },
          { key: "published_at", label: "Published At (ISO)", type: "text" },
          { key: "is_published", label: "Published", type: "bool" },
        ]}
        defaults={{ is_published: false, reading_minutes: 3 }}
      />
    </AdminLayout>
  ),
});
