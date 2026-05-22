import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, PageHeader, GoldCard, GoldButton } from "@/components/admin/AdminLayout";
import { CmsListEditor } from "@/components/admin/CmsListEditor";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/web/apk")({
  component: () => (
    <AdminLayout>
      <PageHeader
        title="APK / Download Manager"
        subtitle="Upload APK file directly (up to 200 MB) or paste Play Store / Drive link. Mark one row per audience as 'Current'."
      />
      <ApkUploader />
      <CmsListEditor
        table="web_apk_releases"
        titleField="version"
        orderBy="released_at"
        orderAsc={false}
        rowBadge={(r) => `${r.audience ?? "—"} · ${r.is_current ? "CURRENT" : "archive"}`}
        fields={[
          { key: "audience", label: "Audience", type: "select", options: [
            { value: "customer", label: "Customer App" },
            { value: "vendor", label: "Vendor App" },
          ]},
          { key: "version", label: "Version (e.g. 1.4.0)", type: "text" },
          { key: "build_number", label: "Build Number", type: "number" },
          { key: "file_url", label: "Direct APK URL (use uploader above)", type: "text" },
          { key: "external_url", label: "External Link (Play Store / Drive)", type: "url" },
          { key: "size_mb", label: "Size (MB)", type: "number" },
          { key: "changelog", label: "Changelog (Markdown)", type: "textarea", rows: 5 },
          { key: "is_current", label: "Current Release (only one per audience)", type: "bool" },
          { key: "is_active", label: "Visible Publicly", type: "bool" },
        ]}
        defaults={{ audience: "customer", is_current: false, is_active: true }}
      />
    </AdminLayout>
  ),
});

function ApkUploader() {
  const [uploading, setUploading] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "-")}`;
      const { error } = await supabase.storage.from("marketing-apk").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/vnd.android.package-archive",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("marketing-apk").getPublicUrl(path);
      setLastUrl(data.publicUrl);
      toast.success("APK uploaded — paste URL into 'Direct APK URL' field below.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <GoldCard className="p-5 mb-5">
      <p className="text-xs uppercase tracking-widest text-[#d4af37] font-bold mb-3">
        Quick Upload (APK)
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[#1a1208] cursor-pointer text-xs"
          style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading…" : "Choose .apk"}
          <input
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        {lastUrl && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#f5d97a]/60 uppercase tracking-widest">Uploaded — copy this:</p>
            <input
              readOnly
              value={lastUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-xs font-mono"
            />
            <GoldButton
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => { navigator.clipboard.writeText(lastUrl); toast.success("Copied"); }}
            >Copy URL</GoldButton>
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#f5d97a]/50 mt-3">
        Max 200 MB. Paste URL into "Direct APK URL" of a release row below.
      </p>
    </GoldCard>
  );
}
