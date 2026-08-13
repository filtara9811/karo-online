import { useEffect, useState } from "react";
import { Loader2, Save, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TUTORIAL_SECTIONS, clearTutorialCache, youtubeEmbed } from "@/lib/tutorial-videos";

type Row = {
  section: string;
  title: string;
  caption: string;
  youtube_url: string;
  video_url: string;
  is_active: boolean;
};

const blank = (section: string): Row => ({
  section,
  title: "",
  caption: "",
  youtube_url: "",
  video_url: "",
  is_active: true,
});

/** Admin editor for the tutorial video shown on top of each merchant config sheet. */
export function TutorialVideosPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("oneqr_tutorial_videos" as never)
        .select("section, title, caption, youtube_url, video_url, is_active");
      const map: Record<string, Row> = {};
      for (const s of TUTORIAL_SECTIONS) map[s.key] = blank(s.key);
      for (const r of ((data as unknown as Partial<Row>[]) ?? [])) {
        if (!r.section) continue;
        map[r.section] = {
          section: r.section,
          title: r.title ?? "",
          caption: r.caption ?? "",
          youtube_url: r.youtube_url ?? "",
          video_url: r.video_url ?? "",
          is_active: r.is_active ?? true,
        };
      }
      setRows(map);
      setLoading(false);
    })();
  }, []);

  const patch = (key: string, p: Partial<Row>) =>
    setRows((s) => ({ ...s, [key]: { ...(s[key] ?? blank(key)), ...p } }));

  const save = async (key: string) => {
    const row = rows[key];
    if (!row) return;
    if (row.youtube_url && !youtubeEmbed(row.youtube_url)) {
      toast.error("YouTube link samajh nahi aaya");
      return;
    }
    setSavingKey(key);
    const { error } = await supabase
      .from("oneqr_tutorial_videos" as never)
      .upsert(
        {
          section: row.section,
          title: row.title,
          caption: row.caption,
          youtube_url: row.youtube_url || null,
          video_url: row.video_url || null,
          is_active: row.is_active,
        } as never,
        { onConflict: "section" } as never,
      );
    setSavingKey(null);
    if (error) { toast.error("Save nahi hua: " + error.message); return; }
    clearTutorialCache();
    toast.success("Tutorial video saved");
  };

  const upload = async (key: string, file: File) => {
    if (!user?.id) return;
    setUploading(key);
    try {
      if (file.size > 90 * 1024 * 1024) throw new Error("File bahut badi hai (max 90 MB)");
      const path = `${user.id}/tutorial-${key}-${Date.now()}.${(file.name.split(".").pop() || "mp4").toLowerCase()}`;
      const { error } = await supabase.storage.from("business-cards").upload(path, file, {
        upsert: false,
        contentType: file.type || "video/mp4",
        cacheControl: "31536000",
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
      patch(key, { video_url: data.publicUrl, youtube_url: "" });
      toast.success("Video uploaded — Save dabaiye");
    } catch (e) {
      toast.error((e as Error).message || "Upload fail");
    } finally { setUploading(null); }
  };

  if (loading) {
    return <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="space-y-3">
      {TUTORIAL_SECTIONS.map((s) => {
        const row = rows[s.key] ?? blank(s.key);
        return (
          <div key={s.key} className="rounded-2xl border border-amber-200/60 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="min-w-0 flex-1 truncate text-sm font-bold">{s.label}</p>
              <button
                type="button"
                onClick={() => patch(s.key, { is_active: !row.is_active })}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${row.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}
              >
                {row.is_active ? "Active" : "Hidden"}
              </button>
            </div>
            <input
              value={row.title}
              onChange={(e) => patch(s.key, { title: e.target.value.slice(0, 80) })}
              placeholder="Video title (e.g. Links kaise set karein)"
              className="mt-2 w-full rounded-lg border border-amber-200/40 bg-black/20 px-2.5 py-2 text-sm outline-none"
            />
            <input
              value={row.caption}
              onChange={(e) => patch(s.key, { caption: e.target.value.slice(0, 120) })}
              placeholder="Short caption"
              className="mt-2 w-full rounded-lg border border-amber-200/40 bg-black/20 px-2.5 py-2 text-sm outline-none"
            />
            <input
              value={row.youtube_url}
              onChange={(e) => patch(s.key, { youtube_url: e.target.value })}
              placeholder="YouTube / Shorts URL"
              inputMode="url"
              className="mt-2 w-full rounded-lg border border-amber-200/40 bg-black/20 px-2.5 py-2 text-sm outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-amber-200/50 px-3 text-[11.5px] font-bold">
                {uploading === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload MP4
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(s.key, f); }}
                />
              </label>
              {row.video_url && <span className="min-w-0 flex-1 truncate text-[10.5px] text-emerald-400">File attached</span>}
              <button
                onClick={() => void save(s.key)}
                disabled={savingKey === s.key}
                className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-[11.5px] font-extrabold text-black disabled:opacity-60"
              >
                {savingKey === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
