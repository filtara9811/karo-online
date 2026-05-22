import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/faqs")({
  component: () => (
    <AdminLayout>
      <PageHeader title="FAQs" subtitle="Per-page Q&A. Shown in marketing pages." />
      <CmsListEditor
        table="web_faqs"
        titleField="question"
        orderBy="sort_order"
        rowBadge={(r) => String(r.page_slug ?? "—")}
        fields={[
          { key: "page_slug", label: "Page Slug", type: "text" },
          { key: "question", label: "Question", type: "text" },
          { key: "answer", label: "Answer (Markdown)", type: "textarea", rows: 5 },
          { key: "sort_order", label: "Sort Order", type: "number" },
          { key: "is_active", label: "Active", type: "bool" },
        ]}
        defaults={{ page_slug: "home", sort_order: 10, is_active: true }}
      />
    </AdminLayout>
  ),
});
