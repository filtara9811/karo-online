import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader, GoldCard } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

const FIELDS_EXAMPLE = `[
  {"key":"name","label":"Your Name","type":"text","required":true,"placeholder":"Full name"},
  {"key":"phone","label":"Phone","type":"phone","required":true},
  {"key":"email","label":"Email","type":"email"},
  {"key":"city","label":"City","type":"text"},
  {"key":"message","label":"Message","type":"textarea"}
]`;

export const Route = createFileRoute("/admin/web/forms")({
  component: () => (
    <AdminLayout>
      <PageHeader
        title="Custom Forms · Lead Capture"
        subtitle="Each form gets a public URL: /f/<slug>. Submissions viewable in Lookup → Forms (existing module)."
      />
      <GoldCard className="p-4 mb-4">
        <p className="text-xs text-[#f5d97a]/80">
          Supported field types: <code className="text-[#fff8dc]">text · email · phone · number · textarea · select · checkbox · radio · date</code>.
          For <code>select / radio / checkbox</code>, add <code>"options":["a","b"]</code>.
        </p>
      </GoldCard>
      <CmsListEditor
        table="web_forms"
        titleField="name"
        orderBy="updated_at"
        orderAsc={false}
        rowBadge={(r) => `/f/${r.slug ?? "?"}`}
        fields={[
          { key: "name", label: "Form Name (admin)", type: "text" },
          { key: "slug", label: "URL Slug (e.g. bulk-enquiry)", type: "text" },
          { key: "description", label: "Public Description", type: "textarea", rows: 2 },
          { key: "fields", label: "Fields (JSON)", type: "json", help: `Example:\n${FIELDS_EXAMPLE}` },
          { key: "submit_label", label: "Submit Button Label", type: "text" },
          { key: "success_message", label: "Success Message", type: "textarea", rows: 2 },
          { key: "redirect_url", label: "Redirect URL after submit (optional)", type: "url" },
          { key: "notify_emails", label: "Notify Emails (comma sep)", type: "tags" },
          { key: "seo_title", label: "SEO Title", type: "text" },
          { key: "seo_description", label: "Meta Description", type: "textarea", rows: 2 },
          { key: "is_active", label: "Active (public)", type: "bool" },
        ]}
        defaults={{ submit_label: "Submit", success_message: "Thank you! We'll be in touch.", is_active: true, fields: [] }}
      />
    </AdminLayout>
  ),
});
