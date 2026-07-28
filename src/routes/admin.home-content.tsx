import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Plus, Trash2, Image as ImageIcon, Video } from "lucide-react";
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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="h-12 w-24 rounded-lg object-cover border border-[#d4af37]/30" />
                ) : (
                  <div className="h-12 w-24 rounded-lg bg-black/30 border border-[#d4af37]/20" />
                )}
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
              <input className={`${inputCls} sm:col-span-2`} placeholder="Image URL (https://...)" value={b.image_url} onChange={(e) => patchBanner(b.id, { image_url: e.target.value })} />
              <input className={inputCls} placeholder="Title (optional)" value={b.title ?? ""} onChange={(e) => patchBanner(b.id, { title: e.target.value })} />
              <input className={inputCls} placeholder="Subtitle (optional)" value={b.subtitle ?? ""} onChange={(e) => patchBanner(b.id, { subtitle: e.target.value })} />
              <input className={`${inputCls} sm:col-span-2`} placeholder="Link — /pricing or https://..." value={b.link ?? ""} onChange={(e) => patchBanner(b.id, { link: e.target.value })} />
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
            onClick={() => setVideos((p) => [...p, { id: uid(), thumb_url: "", title: "", subtitle: "", duration: "", link: "", is_active: true }])}
          >
            <Plus className="inline h-3 w-3 mr-1" /> Add Video
          </GoldButton>
        </div>

        <div className="space-y-3">
          {videos.length === 0 && <p className="text-[11px] text-[#f5d97a]/50">No videos yet.</p>}
          {videos.map((v) => (
            <div key={v.id} className="rounded-xl border border-[#d4af37]/25 p-3 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-3">
                {v.thumb_url ? (
                  <img src={v.thumb_url} alt="" className="h-12 w-20 rounded-lg object-cover border border-[#d4af37]/30" />
                ) : (
                  <div className="h-12 w-20 rounded-lg bg-black/30 border border-[#d4af37]/20" />
                )}
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
              <input className={`${inputCls} sm:col-span-2`} placeholder="Thumbnail URL (https://...)" value={v.thumb_url} onChange={(e) => patchVideo(v.id, { thumb_url: e.target.value })} />
              <input className={inputCls} placeholder="Title" value={v.title ?? ""} onChange={(e) => patchVideo(v.id, { title: e.target.value })} />
              <input className={inputCls} placeholder="Subtitle" value={v.subtitle ?? ""} onChange={(e) => patchVideo(v.id, { subtitle: e.target.value })} />
              <input className={inputCls} placeholder="Duration e.g. 1:24" value={v.duration ?? ""} onChange={(e) => patchVideo(v.id, { duration: e.target.value })} />
              <input className={inputCls} placeholder="Link — YouTube URL or /route" value={v.link ?? ""} onChange={(e) => patchVideo(v.id, { link: e.target.value })} />
            </div>
          ))}
        </div>
      </GoldCard>
    </AdminLayout>
  );
}
