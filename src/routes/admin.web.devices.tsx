import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";

export const Route = createFileRoute("/admin/web/devices")({
  component: () => (
    <AdminLayout>
      <PageHeader
        title="Virtual Devices"
        subtitle="Add extra floating phone mockups. Each enabled device shows as a button in the website's '+' launcher. Disable a device to hide its button."
      />
      <CmsListEditor
        table="web_virtual_devices"
        titleField="label"
        orderBy="sort_order"
        rowBadge={(r) => (r.is_active ? "ENABLED" : "disabled")}
        fields={[
          { key: "label", label: "Label (e.g. Flipkart, Amazon, Vendor Demo)", type: "text" },
          { key: "url", label: "URL (full https:// or internal /path)", type: "text" },
          { key: "icon", label: "Icon (single emoji or letter, optional)", type: "text" },
          { key: "sort_order", label: "Sort order", type: "number" },
          { key: "is_active", label: "Enabled (show button on website)", type: "bool" },
        ]}
        defaults={{ label: "New Device", url: "https://", is_active: true, sort_order: 100 }}
      />
    </AdminLayout>
  ),
});
