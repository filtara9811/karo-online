import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Trash2, Video, ImagePlus, Link2, Film } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SheetShell } from "./SheetShell";

type MediaItem = { type: "image" | "video" | "url"; src: string; poster?: string };

const MAX_SLOTS = 10;

/** Story / reel media manager for the merchant landing page (up to 10 slots). */
export function LandingMediaSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const kindRef = useRef<"image" | "video">("video");

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("poster_media, poster_bg_urls, poster_bg_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { poster_media?: MediaItem[]; poster_bg_urls?: string[]; poster_bg_url?: string } | null;
      const list: MediaItem[] = Array.isArray(d?.poster_media) && d!.poster_media!.length
        ? d!.poster_media!.filter((x) => x?.src)
        : (Array.isArray(d?.poster_bg_urls) ? d!.poster_bg_urls!.filter(Boolean) : (d?.poster_bg_url ? [d.poster_bg_url] : []))
            .map((src) => ({ type: "image" as const, src }));
      setMedia(list.slice(0, MAX_SLOTS));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const persist = useCallback(async (next: MediaItem[]) => {
    setSaving(true);
    setMedia(next);
    const images = next.filter((x) => x.type === "image").map((x) => x.src);
    const { error } = await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: {
        poster_media: next,
        poster_bg_urls: images,
        poster_bg_url: images[0] ?? null,
      },
    } as never);
    setSaving(false);
    if (error) { toast.error("Save nahi hua: " + error.message); return; }
    onSaved?.();
  }, [onSaved]);

  const pick = (kind: "image" | "video") => {
    kindRef.current = kind;
    if (fileRef.current) {
      fileRef.current.accept = kind === "video" ? "video/*" : "image/*";
      fileRef.current.click();
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (media.length >= MAX_SLOTS) { toast.error(`Max ${MAX_SLOTS} media`); return; }
    const limit = kindRef.current === "video" ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
    if (f.size > limit) { toast.error(`File bahut badi hai (max ${limit / 1024 / 1024} MB)`); return; }
    const reader = new FileReader();
    reader.onload = () => {
      void persist([...media, { type: kindRef.current, src: String(reader.result || "") }].slice(0, MAX_SLOTS));
      toast.success("Media add ho gaya");
    };
    reader.readAsDataURL(f);
  };

  const addUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    if (media.length >= MAX_SLOTS) { toast.error(`Max ${MAX_SLOTS} media`); return; }
    setUrlInput("");
    void persist([...media, { type: "url" as const, src: v }].slice(0, MAX_SLOTS));
    toast.success("Video link add ho gaya");
  };

  return (
    <SheetShell
      open={open}
      onClose={onClose}
      title="Videos & media"
      subtitle={`Landing page par story style me chalega · ${media.length}/${MAX_SLOTS}`}
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => pick("video")}
            disabled={saving}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[12.5px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
          >
            <Video className="h-4 w-4" /> Video upload
          </button>
          <button
            onClick={() => pick("image")}
            disabled={saving}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 text-[12.5px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" /> Photo
          </button>
        </div>
      }
    >
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
        <Link2 className="h-4 w-4 shrink-0 text-amber-600" />
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="YouTube / Instagram video link"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
        />
        <button
          onClick={addUrl}
          className="h-8 shrink-0 rounded-full bg-amber-500 px-3 text-[11px] font-extrabold text-white active:scale-95"
        >
          Add
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
      ) : media.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 py-10 text-center">
          <Film className="h-6 w-6 text-amber-600" />
          <p className="text-[12px] font-bold text-slate-700">Abhi koi video ya photo nahi</p>
          <p className="px-6 text-[11px] text-slate-500">Neeche se video ya photo upload karein — landing page par full screen chalega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m, i) => (
            <motion.div
              key={`${m.src.slice(-24)}-${i}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-black/10 bg-slate-900"
            >
              {m.type === "image" ? (
                <img src={m.src} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
              ) : m.type === "video" ? (
                <video src={m.src} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center px-1 text-center text-[9px] font-bold text-white/80">
                  <Video className="mx-auto mb-1 h-4 w-4" /> Link
                </span>
              )}
              <button
                onClick={() => persist(media.filter((_, idx) => idx !== i))}
                aria-label="Remove media"
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white active:scale-90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 text-[9px] font-bold text-white">
                {i + 1}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </SheetShell>
  );
}
