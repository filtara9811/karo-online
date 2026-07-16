import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, ArrowUp, ArrowDown, Eye, EyeOff, Video, Link as LinkIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout, PageHeader, GoldButton, GoldCard } from "@/components/admin/AdminLayout";
import { SmartMediaPicker } from "@/components/SmartMediaPicker";

// ---- Vendor onboarding background video (shown behind /vendor/join) ----
function VendorOnboardingVideoCard() {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">("url");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vendor_onboarding_video")
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = (data?.value as any) ?? {};
        setUrl((v.url as string) ?? "");
        setEnabled(v.enabled !== false);
      });
  }, []);

  const persist = async (nextUrl: string, nextEnabled: boolean) => {
    const { error } = await supabase
      .from("app_settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ key: "vendor_onboarding_video", value: { url: nextUrl, enabled: nextEnabled } as any });
    if (error) toast.error(error.message);
    else toast.success("Onboarding video updated");
  };

  const save = async () => { setSaving(true); await persist(url, enabled); setSaving(false); };
  const toggle = async (v: boolean) => { setEnabled(v); await persist(url, v); };

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <GoldCard className="p-5 space-y-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-amber-400" />
          <span className="font-bold text-[#fff8dc]">Vendor Onboarding — Background Video</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#f5d97a]/80 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4 accent-amber-400" />
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </div>
      <p className="text-xs text-[#f5d97a]/60">
        Shown behind the vendor Join / KYC onboarding. Paste a YouTube link or upload MP4/WEBM. Disable to use a plain gradient background.
      </p>

      <div className="flex gap-1 rounded-lg bg-black/30 border border-[#d4af37]/20 p-1 w-fit">
        <button onClick={() => setMode("url")}
          className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${mode === "url" ? "bg-amber-400 text-black" : "text-white/70"}`}>
          <LinkIcon className="h-3.5 w-3.5" /> Paste URL
        </button>
        <button onClick={() => setMode("upload")}
          className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${mode === "upload" ? "bg-amber-400 text-black" : "text-white/70"}`}>
          <Upload className="h-3.5 w-3.5" /> Upload File
        </button>
      </div>

      {mode === "url" ? (
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://cdn.example.com/video.mp4"
            className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-[#d4af37]/30 text-white outline-none focus:border-[#d4af37]" />
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold disabled:opacity-50">
            <Save className="h-4 w-4 inline mr-1" /> Save
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#d4af37]/40 bg-black/20 px-4 py-6 text-center hover:bg-black/30">
          <input type="file" accept="video/mp4,video/webm,video/*" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-amber-300 font-semibold">
              <Loader2 className="h-5 w-5 animate-spin" /> Uploading…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-white/80">
              <Upload className="h-6 w-6 text-amber-400" />
              <span className="font-bold">Choose a video file</span>
              <span className="text-xs text-white/50">MP4 or WEBM, up to 100 MB</span>
            </div>
          )}
        </label>
      )}

      {url && (
        <div className="mt-2">
          <div className="text-[11px] uppercase tracking-wide text-white/50 mb-1">Current</div>
          <div className="text-xs text-white/80 break-all bg-black/30 border border-white/10 rounded-lg px-3 py-2">{url}</div>
        </div>
      )}
    </GoldCard>
  );
}


type Slide = {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  media_type: "image" | "video" | "lottie" | "animation";
  media_url: string;
  poster_url: string | null;
  cta_label: string;
  bg_color: string | null;
  text_color: string | null;
  audience: "customer" | "vendor" | "all";
  is_active: boolean;
  skip_allowed: boolean;
};

export const Route = createFileRoute("/admin/onboarding")({
  component: () => (
    <AdminLayout>
      <OnboardingAdmin />
    </AdminLayout>
  ),
});

function OnboardingAdmin() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("onboarding_slides" as never)
      .select("*")
      .order("position", { ascending: true });
    setSlides(((data as unknown) as Slide[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const nextPos = (slides[slides.length - 1]?.position ?? -1) + 1;
    const { error } = await supabase.from("onboarding_slides" as never).insert({
      position: nextPos,
      title: "Welcome to Karo Online",
      subtitle: "India's premium hyperlocal marketplace",
      media_type: "image",
      media_url: "",
      cta_label: "Next",
      audience: "customer",
      is_active: true,
      skip_allowed: true,
    } as never);
    if (error) toast.error(error.message);
    else load();
  };

  const update = async (id: string, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const persist = async (slide: Slide) => {
    setSaving(slide.id);
    const { id, ...rest } = slide;
    const { error } = await supabase
      .from("onboarding_slides" as never)
      .update(rest as never)
      .eq("id", id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Slide saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    const { error } = await supabase.from("onboarding_slides" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const move = async (slide: Slide, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    const swap = slides[idx + dir];
    if (!swap) return;
    await supabase.from("onboarding_slides" as never).update({ position: swap.position } as never).eq("id", slide.id);
    await supabase.from("onboarding_slides" as never).update({ position: slide.position } as never).eq("id", swap.id);
    load();
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-amber-200">🎬 Vendor onboarding video moved</div>
          <div className="text-xs text-amber-100/70">Use the dedicated page to add or replace the background video shown on vendor join.</div>
        </div>
        <a href="/admin/video" className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg bg-amber-400 text-black hover:bg-amber-300">Open</a>
      </div>
      <PageHeader
        title="Customer Onboarding Screens"
        subtitle="Splash / intro slides shown before the customer logs in. Drag-style ordering, image / video / Lottie animation supported."
        action={
          <GoldButton onClick={add}>
            <Plus className="h-4 w-4" /> Add Slide
          </GoldButton>
        }
      />


      {loading ? (
        <div className="flex items-center gap-2 text-[#f5d97a]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : slides.length === 0 ? (
        <GoldCard>
          <p className="text-[#f5d97a]/80 text-sm">
            Abhi koi slide nahi hai. "Add Slide" pe click karke pehla welcome screen banaiye.
          </p>
        </GoldCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {slides.map((slide, i) => (
            <GoldCard key={slide.id}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-[#fff8dc] font-semibold">
                  Slide #{i + 1}
                  <span className="ml-2 text-xs text-[#f5d97a]/60">({slide.audience})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(slide, -1)}
                    disabled={i === 0}
                    className="h-7 w-7 grid place-items-center rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(slide, 1)}
                    disabled={i === slides.length - 1}
                    className="h-7 w-7 grid place-items-center rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => update(slide.id, { is_active: !slide.is_active })}
                    className="h-7 w-7 grid place-items-center rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20"
                    title={slide.is_active ? "Active" : "Hidden"}
                  >
                    {slide.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => remove(slide.id)}
                    className="h-7 w-7 grid place-items-center rounded bg-red-900/30 text-red-300 hover:bg-red-900/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs text-[#f5d97a]/70 mb-1">Title</label>
                  <input
                    value={slide.title}
                    onChange={(e) => update(slide.id, { title: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#f5d97a]/70 mb-1">Subtitle</label>
                  <textarea
                    value={slide.subtitle}
                    onChange={(e) => update(slide.id, { subtitle: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">Media Type</label>
                    <select
                      value={slide.media_type}
                      onChange={(e) => update(slide.id, { media_type: e.target.value as Slide["media_type"] })}
                      className="w-full px-2 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video (mp4/url)</option>
                      <option value="lottie">Lottie JSON</option>
                      <option value="animation">Animation GIF</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">CTA Label</label>
                    <input
                      value={slide.cta_label}
                      onChange={(e) => update(slide.id, { cta_label: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">Audience</label>
                    <select
                      value={slide.audience}
                      onChange={(e) => update(slide.id, { audience: e.target.value as Slide["audience"] })}
                      className="w-full px-2 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                {slide.media_type === "image" || slide.media_type === "animation" ? (
                  <SmartMediaPicker
                    value={slide.media_url}
                    onChange={(url) => update(slide.id, { media_url: url ?? "" })}
                    label="Media (upload or paste URL)"
                    folder="onboarding"
                  />
                ) : (
                  <div>
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">
                      {slide.media_type === "video" ? "Video URL (.mp4 / YouTube)" : "Lottie JSON URL"}
                    </label>
                    <input
                      value={slide.media_url}
                      onChange={(e) => update(slide.id, { media_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-[#f5d97a]/80">
                  <input
                    type="checkbox"
                    checked={slide.skip_allowed}
                    onChange={(e) => update(slide.id, { skip_allowed: e.target.checked })}
                  />
                  Allow user to skip this slide
                </label>

                <div className="flex justify-end pt-1">
                  <GoldButton onClick={() => persist(slide)} disabled={saving === slide.id}>
                    {saving === slide.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </GoldButton>
                </div>
              </div>
            </GoldCard>
          ))}
        </div>
      )}
    </div>
  );
}
