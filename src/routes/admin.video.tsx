import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Video, Link as LinkIcon, Upload, Save, Loader2, Play, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout, PageHeader, GoldButton, GoldCard } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/video")({
  head: () => ({ meta: [{ title: "Onboarding Video — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminLayout>
      <VideoAdmin />
    </AdminLayout>
  ),
});

type VideoSetting = { url: string; enabled: boolean; kind: "youtube" | "url" | "upload" };

function detectKind(u: string): VideoSetting["kind"] {
  if (!u) return "url";
  if (/youtube\.com|youtu\.be/i.test(u)) return "youtube";
  return "url";
}

function youtubeEmbedUrl(u: string): string | null {
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0&mute=1&controls=1` : null;
}

function VideoAdmin() {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"youtube" | "url" | "upload">("url");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vendor_onboarding_video")
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (data?.value as any) ?? {};
    const u = (v.url as string) ?? "";
    setUrl(u);
    setEnabled(v.enabled !== false);
    setTab(detectKind(u));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const persist = async (nextUrl: string, nextEnabled: boolean) => {
    const value = { url: nextUrl, enabled: nextEnabled, kind: detectKind(nextUrl) };
    const { error } = await supabase
      .from("app_settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ key: "vendor_onboarding_video", value: value as any }, { onConflict: "key" });
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const save = async () => {
    setSaving(true);
    const ok = await persist(url.trim(), enabled);
    setSaving(false);
    if (ok) toast.success("Onboarding video saved");
  };

  const toggle = async (v: boolean) => {
    setEnabled(v);
    const ok = await persist(url, v);
    if (ok) toast.success(v ? "Video enabled" : "Video disabled — vendor join will show plain background");
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("video/")) { toast.error("Please choose a video file"); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error("Video too large (max 100 MB)"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `onboarding/vendor-bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("catalog").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("catalog").getPublicUrl(path);
      setUrl(pub.publicUrl);
      await persist(pub.publicUrl, enabled);
      toast.success("Video uploaded and saved");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const embed = useMemo(() => (detectKind(url) === "youtube" ? youtubeEmbedUrl(url) : null), [url]);

  return (
    <div>
      <PageHeader
        title="🎬 Onboarding Video Control"
        subtitle="Manage the background video shown on the vendor onboarding / join screen. Paste a YouTube link, a direct MP4/WEBM URL, or upload a file."
        action={
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#d4af37]/40 bg-black/30 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4 accent-amber-400" />
            <span className={`text-xs font-bold uppercase tracking-widest ${enabled ? "text-emerald-300" : "text-red-300"}`}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-[#f5d97a]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Editor */}
          <GoldCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-amber-400" />
              <span className="font-bold text-[#fff8dc]">Video Source</span>
            </div>

            <div className="flex gap-1 rounded-lg bg-black/30 border border-[#d4af37]/20 p-1 w-fit">
              {(["youtube", "url", "upload"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize ${tab === t ? "bg-amber-400 text-black" : "text-white/70"}`}>
                  {t === "youtube" ? "YouTube" : t === "url" ? "Direct URL" : "Upload File"}
                </button>
              ))}
            </div>

            {tab !== "upload" ? (
              <div className="space-y-2">
                <label className="block text-xs text-[#f5d97a]/70">
                  {tab === "youtube" ? "YouTube URL" : "Direct video URL (.mp4 / .webm)"}
                </label>
                <div className="flex gap-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={tab === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://cdn.example.com/onboarding.mp4"}
                    className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/30 text-white outline-none focus:border-[#d4af37]"
                  />
                  <GoldButton onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                  </GoldButton>
                </div>
                <p className="text-[11px] text-white/50">
                  Tip: For best playback on mobile, use a direct MP4 (H.264) under 25 MB.
                </p>
              </div>
            ) : (
              <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#d4af37]/40 bg-black/20 px-4 py-8 text-center hover:bg-black/30 transition">
                <input type="file" accept="video/mp4,video/webm,video/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-semibold">
                    <Loader2 className="h-5 w-5 animate-spin" /> Uploading…
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-white/80">
                    <Upload className="h-7 w-7 text-amber-400" />
                    <span className="font-bold">Choose a video file</span>
                    <span className="text-xs text-white/50">MP4 or WEBM · up to 100 MB</span>
                  </div>
                )}
              </label>
            )}

            {url && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-white/50">Current Active URL</span>
                  <div className="flex gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copied"); }}
                      className="h-7 px-2 rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20 text-[11px] flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <a href={url} target="_blank" rel="noreferrer"
                      className="h-7 px-2 rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20 text-[11px] flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                  </div>
                </div>
                <div className="text-xs text-white/80 break-all">{url}</div>
              </div>
            )}

            <a href="/vendor/join" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold">
              <ExternalLink className="h-3.5 w-3.5" /> Test on vendor join page →
            </a>
          </GoldCard>

          {/* Live preview */}
          <GoldCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Play className="h-5 w-5 text-amber-400" />
              <span className="font-bold text-[#fff8dc]">Live Preview</span>
              {!enabled && <span className="ml-auto text-[10px] font-bold uppercase text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full">Disabled</span>}
            </div>
            <div className="aspect-video rounded-xl overflow-hidden bg-black/60 grid place-items-center border border-[#d4af37]/20">
              {!url ? (
                <p className="text-sm text-white/50 px-4 text-center">No video set. Paste a URL or upload a file to see it here.</p>
              ) : embed ? (
                <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
              ) : (
                <video src={url} controls playsInline className="w-full h-full object-cover" />
              )}
            </div>
            <p className="text-[11px] text-white/50 mt-3">
              This is the exact video vendors will see behind the onboarding form. Toggle disabled to fall back to the plain gradient background.
            </p>
          </GoldCard>
        </div>
      )}
    </div>
  );
}
