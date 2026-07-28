import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Plus, Trash2, Image as ImageIcon, Video, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";
import type { HomeBanner, HomeVideo } from "@/hooks/use-home-content";

export const Route = createFileRoute("/admin/home-content")({
  head: () => ({
    meta: [
      { title: "Home Content — Banners & Videos | Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HomeContentPage,
});

const inputCls =
  "w-full rounded-lg bg-black/30 border border-[#d4af37]/30 px-3 py-2 text-xs text-[#fffdf5] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37]";

/** Pages an admin can link a banner / video to. */
const PAGE_LINKS: { label: string; value: string }[] = [
  { label: "Home", value: "/" },
  { label: "Services", value: "/services" },
  { label: "Vendors", value: "/vendors" },
  { label: "Pricing", value: "/pricing" },
  { label: "Features", value: "/features" },
  { label: "For Customers", value: "/for-customers" },
  { label: "For Vendors", value: "/for-vendors" },
  { label: "Blog", value: "/blog" },
  { label: "Download App", value: "/download" },
  { label: "Referral", value: "/referral" },
  { label: "My Orders", value: "/orders" },
  { label: "Profile", value: "/profile" },
  { label: "Cart", value: "/cart" },
  { label: "Register", value: "/register" },
  { label: "Join as Vendor", value: "/vendor/join" },
  { label: "Vendor Dashboard", value: "/vendor/dashboard" },
  { label: "Contact", value: "/contact" },
  { label: "About", value: "/about" },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function uploadToStorage(file: File, folder: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `home/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("catalog").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return supabase.storage.from("catalog").getPublicUrl(path).data.publicUrl;
}

/** Simple upload button + preview. */
function MediaUploader({
  accept,
  folder,
  value,
  onChange,
  kind,
  label,
}: {
  accept: string;
  folder: string;
  value?: string;
  onChange: (url: string) => void;
  kind: "image" | "video";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement | null>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    setErr(null);
    setBusy(true);
    try {
      onChange(await uploadToStorage(f, folder));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-16 w-28 rounded-xl overflow-hidden bg-black/30 border border-[#d4af37]/25 grid place-items-center shadow-[0_8px_20px_-10px_rgba(0,0,0,0.9)]">
          {value ? (
            kind === "image" ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={value} muted className="h-full w-full object-cover" />
            )
          ) : (
            <span className="text-[10px] text-[#f5d97a]/40">No {kind}</span>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={ref}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <GoldButton size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="inline h-3 w-3 mr-1 animate-spin" /> : <Upload className="inline h-3 w-3 mr-1" />}
            {busy ? "Uploading…" : label}
          </GoldButton>
          <p className="mt-1 text-[10px] text-[#f5d97a]/45">
            {kind === "image" ? "Gallery से image चुनें — frame में auto-fit हो जाएगी." : "MP4 / WEBM वीडियो चुनें."}
          </p>
        </div>
      </div>
      <input
        className={inputCls}
        placeholder={`...or paste ${kind} URL (https://...)`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {err && <p className="text-[10px] text-rose-300">{err}</p>}
    </div>
  );
}

/** Page dropdown + external URL field. */
function LinkPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const isPage = !!value && PAGE_LINKS.some((p) => p.value === value);
  const [mode, setMode] = useState<"page" | "external">(value && !isPage ? "external" : "page");

  return (
    <div className="sm:col-span-2 grid gap-2">
      <div className="flex gap-1 rounded-lg bg-black/30 border border-[#d4af37]/20 p-1 w-fit">
        {(["page", "external"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              onChange("");
            }}
            className={`px-3 py-1 rounded-md text-[11px] font-bold ${mode === m ? "bg-amber-400 text-black" : "text-white/70"}`}
          >
            {m === "page" ? "App Page" : "Other Website"}
          </button>
        ))}
      </div>
      {mode === "page" ? (
        <select className={inputCls} value={isPage ? value : ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">— No redirect —</option>
          {PAGE_LINKS.map((p) => (
            <option key={p.value} value={p.value} className="bg-black">
              {p.label} ({p.value})
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputCls}
          placeholder="https://example.com/offer"
          value={isPage ? "" : (value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function HomeContentPage() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["home_banners", "home_videos"]);
      for (const row of data ?? []) {
        const items = (row.value as { items?: unknown[] })?.items ?? [];
        if (row.key === "home_banners") setBanners(items as HomeBanner[]);
        if (row.key === "home_videos") setVideos(items as HomeVideo[]);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("app_settings").upsert(
      [
        { key: "home_banners", value: { items: banners } },
        { key: "home_videos", value: { items: videos } },
      ],
      { onConflict: "key" },
    );
    setSaving(false);
    setMsg(error ? `Save failed: ${error.message}` : "Saved — home screen updated.");
  };

  const patchBanner = (id: string, patch: Partial<HomeBanner>) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const patchVideo = (id: string, patch: Partial<HomeVideo>) =>
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  if (loading) {
    return (
      <AdminLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Home Content"
        subtitle="Banners (auto-slide) and Recommended Videos shown on the customer home screen."
        action={
          <GoldButton onClick={save} disabled={saving}>
            {saving ? <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="inline h-3.5 w-3.5 mr-1" />}
            Save
          </GoldButton>
        }
      />
      {msg && <p className="mb-4 text-xs text-[#f5d97a]">{msg}</p>}

      <GoldCard className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#f5d97a] flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Banners
          </h3>
          <GoldButton
            size="sm"
            variant="outline"
            onClick={() => setBanners((p) => [...p, { id: uid(), image_url: "", title: "", subtitle: "", link: "", is_active: true }])}
          >
            <Plus className="inline h-3 w-3 mr-1" /> Add Banner
          </GoldButton>
        </div>

        <div className="space-y-3">
          {banners.length === 0 && <p className="text-[11px] text-[#f5d97a]/50">No banners yet.</p>}
          {banners.map((b) => (
            <div key={b.id} className="rounded-xl border border-[#d4af37]/25 p-3 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-[#f5d97a]/80">
                  <input type="checkbox" checked={b.is_active !== false} onChange={(e) => patchBanner(b.id, { is_active: e.target.checked })} />
                  Active
                </label>
                <button
                  onClick={() => setBanners((p) => p.filter((x) => x.id !== b.id))}
                  className="ml-auto h-8 w-8 grid place-items-center rounded-lg bg-rose-500/15 text-rose-300"
                  aria-label="Remove banner"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <MediaUploader
                accept="image/*"
                folder="banners"
                kind="image"
                label="Upload Banner Image"
                value={b.image_url}
                onChange={(url) => patchBanner(b.id, { image_url: url })}
              />
              <input className={inputCls} placeholder="Title (optional)" value={b.title ?? ""} onChange={(e) => patchBanner(b.id, { title: e.target.value })} />
              <input className={inputCls} placeholder="Subtitle (optional)" value={b.subtitle ?? ""} onChange={(e) => patchBanner(b.id, { subtitle: e.target.value })} />
              <LinkPicker value={b.link} onChange={(v) => patchBanner(b.id, { link: v })} />
            </div>
          ))}
        </div>
      </GoldCard>

      <GoldCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#f5d97a] flex items-center gap-2">
            <Video className="h-4 w-4" /> Recommended Videos
          </h3>
          <GoldButton
            size="sm"
            variant="outline"
            onClick={() => setVideos((p) => [...p, { id: uid(), thumb_url: "", video_url: "", title: "", subtitle: "", duration: "", link: "", is_active: true }])}
          >
            <Plus className="inline h-3 w-3 mr-1" /> Add Video
          </GoldButton>
        </div>

        <div className="space-y-3">
          {videos.length === 0 && <p className="text-[11px] text-[#f5d97a]/50">No videos yet.</p>}
          {videos.map((v) => (
            <div key={v.id} className="rounded-xl border border-[#d4af37]/25 p-3 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-[#f5d97a]/80">
                  <input type="checkbox" checked={v.is_active !== false} onChange={(e) => patchVideo(v.id, { is_active: e.target.checked })} />
                  Active
                </label>
                <button
                  onClick={() => setVideos((p) => p.filter((x) => x.id !== v.id))}
                  className="ml-auto h-8 w-8 grid place-items-center rounded-lg bg-rose-500/15 text-rose-300"
                  aria-label="Remove video"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <MediaUploader
                accept="video/*"
                folder="videos"
                kind="video"
                label="Upload Video File"
                value={v.video_url}
                onChange={(url) => patchVideo(v.id, { video_url: url })}
              />
              <MediaUploader
                accept="image/*"
                folder="thumbs"
                kind="image"
                label="Upload Thumbnail"
                value={v.thumb_url}
                onChange={(url) => patchVideo(v.id, { thumb_url: url })}
              />
              <input className={inputCls} placeholder="Title" value={v.title ?? ""} onChange={(e) => patchVideo(v.id, { title: e.target.value })} />
              <input className={inputCls} placeholder="Subtitle" value={v.subtitle ?? ""} onChange={(e) => patchVideo(v.id, { subtitle: e.target.value })} />
              <input className={inputCls} placeholder="Duration e.g. 1:24" value={v.duration ?? ""} onChange={(e) => patchVideo(v.id, { duration: e.target.value })} />
              <p className="sm:col-span-2 text-[10px] text-[#f5d97a]/45">
                Tap करने पर कहाँ जाए (खाली छोड़ें तो uploaded video inline play होगी):
              </p>
              <LinkPicker value={v.link} onChange={(val) => patchVideo(v.id, { link: val })} />
            </div>
          ))}
        </div>
      </GoldCard>
    </AdminLayout>
  );
}
