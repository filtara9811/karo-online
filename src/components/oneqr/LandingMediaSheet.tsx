import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2, Video, ImagePlus, Link2, Film, Plus, Play, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { LandingMediaItem, VideoProduct } from "@/lib/landing-types";
import { SheetShell } from "./SheetShell";
import { VideoProductSheet } from "./VideoProductSheet";

type MediaItem = LandingMediaItem;

const MAX_SLOTS = 10;
const MAX_PRODUCTS = 10;
const BUCKET = "business-cards";

const newProduct = (): VideoProduct => ({
  id: `vp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  price: "",
  image: null,
  description: "",
  enquiry: "",
  url: "",
  rating: 4.8,
});

/**
 * Video studio: upload / link videos and attach 1-10 products to each one.
 * Products render as a shoppable rail under the video on the landing page.
 */
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
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [editing, setEditing] = useState<VideoProduct | null>(null);
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
      setActive(0);
      setDirty(false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const persist = useCallback(async (next: MediaItem[]) => {
    setSaving(true);
    const images = next.filter((x) => x.type === "image").map((x) => x.src);
    const { error } = await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: {
        poster_media: next,
        poster_bg_urls: images,
        poster_bg_url: images[0] ?? null,
      },
    } as never);
    setSaving(false);
    if (error) { toast.error("Save nahi hua: " + error.message); return false; }
    setDirty(false);
    onSaved?.();
    return true;
  }, [onSaved]);

  const update = (next: MediaItem[]) => {
    setMedia(next.slice(0, MAX_SLOTS));
    setDirty(true);
  };

  const pick = (kind: "image" | "video") => {
    kindRef.current = kind;
    if (fileRef.current) {
      fileRef.current.accept = kind === "video" ? "video/*" : "image/*";
      fileRef.current.click();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (media.length >= MAX_SLOTS) { toast.error(`Max ${MAX_SLOTS} media`); return; }
    const isVideo = kindRef.current === "video";
    const limit = isVideo ? 90 * 1024 * 1024 : 8 * 1024 * 1024;
    if (f.size > limit) { toast.error(`File bahut badi hai (max ${Math.round(limit / 1024 / 1024)} MB)`); return; }

    if (isVideo && user?.id) {
      // Videos go to storage (public URL) so landing pages stay fast.
      setSaving(true);
      const path = `${user.id}/video-${Date.now()}.${(f.name.split(".").pop() || "mp4").toLowerCase()}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
        upsert: false,
        contentType: f.type || "video/mp4",
        cacheControl: "31536000",
      });
      setSaving(false);
      if (error) { toast.error("Video upload fail: " + error.message); return; }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      update([...media, { type: "video", src: data.publicUrl, products: [] }]);
      setActive(media.length);
      toast.success("Video add ho gaya — ab products link karein");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      update([...media, { type: kindRef.current, src: String(reader.result || ""), products: [] }]);
      setActive(media.length);
      toast.success("Media add ho gaya");
    };
    reader.readAsDataURL(f);
  };

  const addUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    if (media.length >= MAX_SLOTS) { toast.error(`Max ${MAX_SLOTS} media`); return; }
    setUrlInput("");
    update([...media, { type: "url", src: v, products: [] }]);
    setActive(media.length);
    toast.success("Video link add ho gaya");
  };

  const current = media[Math.min(active, Math.max(media.length - 1, 0))];
  const products = useMemo(() => current?.products ?? [], [current]);

  const setProducts = (list: VideoProduct[]) => {
    update(media.map((m, i) => (i === active ? { ...m, products: list } : m)));
  };

  const removeMedia = (i: number) => {
    const next = media.filter((_, idx) => idx !== i);
    update(next);
    setActive((a) => Math.max(0, Math.min(a, next.length - 1)));
  };

  return (
    <>
      <SheetShell
        open={open}
        onClose={onClose}
        title="Video studio"
        subtitle={`Video + products link karein · ${media.length}/${MAX_SLOTS}`}
        footer={
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => pick("video")}
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 text-[12px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
              >
                <Video className="h-4 w-4" /> Video
              </button>
              <button
                onClick={() => pick("image")}
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[12px] font-extrabold text-slate-700 active:scale-[0.98] disabled:opacity-60"
              >
                <ImagePlus className="h-4 w-4" /> Photo
              </button>
            </div>
            <button
              onClick={() => persist(media)}
              disabled={saving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-[14px] font-extrabold text-white shadow-lg shadow-amber-500/25 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Publishing…" : dirty ? "Publish changes" : "Published"}
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
        ) : !current ? (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 py-10 text-center">
            <Film className="h-6 w-6 text-amber-600" />
            <p className="text-[12px] font-bold text-slate-700">Abhi koi video nahi</p>
            <p className="px-6 text-[11px] text-slate-500">Video upload karein ya link paste karein — phir 1 se 10 products link kar sakte hain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active player card */}
            <div className="relative aspect-[9/14] w-full overflow-hidden rounded-[26px] border border-black/10 bg-slate-900 shadow-lg">
              {current.type === "image" ? (
                <img src={current.src} alt="Selected media" className="h-full w-full object-cover" />
              ) : current.type === "video" ? (
                <video src={current.src} muted playsInline controls className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center px-6 text-center text-[11px] font-bold text-white/80">
                  <Play className="mx-auto mb-2 h-7 w-7" />
                  {current.src}
                </span>
              )}

              {/* Product slots over the bottom of the player */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <AnimatePresence initial={false}>
                    {products.map((p) => (
                      <motion.button
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setEditing(p)}
                        className="relative h-24 w-[74px] shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white/10 backdrop-blur"
                      >
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-white/80"><Tag className="h-4 w-4" /></span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[8.5px] font-bold text-white">
                          {p.name || "Product"}
                        </span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {products.length < MAX_PRODUCTS && (
                    <button
                      onClick={() => setEditing(newProduct())}
                      className="grid h-24 w-[74px] shrink-0 place-items-center rounded-2xl border border-dashed border-white/70 bg-white/10 text-white backdrop-blur active:scale-95"
                    >
                      <span className="flex flex-col items-center gap-1">
                        <Plus className="h-5 w-5" />
                        <span className="text-[8.5px] font-bold">Add products</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Video rail + add new */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Aapki videos</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {media.map((m, i) => (
                  <div
                    key={`${m.src.slice(-24)}-${i}`}
                    className={`relative h-28 w-[86px] shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-900 ${i === active ? "border-amber-500" : "border-black/10"}`}
                  >
                    <button onClick={() => setActive(i)} className="absolute inset-0">
                      {m.type === "image" ? (
                        <img src={m.src} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
                      ) : m.type === "video" ? (
                        <video src={m.src} muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-white/80"><Play className="h-4 w-4" /></span>
                      )}
                    </button>
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-black/65 px-1.5 text-[9px] font-bold text-white">
                      {(m.products?.length ?? 0)} · {i + 1}
                    </span>
                    <button
                      onClick={() => removeMedia(i)}
                      aria-label="Remove media"
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-white active:scale-90"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {media.length < MAX_SLOTS && (
                  <button
                    onClick={() => pick("video")}
                    className="grid h-28 w-[86px] shrink-0 place-items-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 text-amber-700 active:scale-95"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-extrabold">Add new</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetShell>

      <VideoProductSheet
        open={!!editing}
        product={editing}
        onClose={() => setEditing(null)}
        onSave={(p) => {
          const exists = products.some((x) => x.id === p.id);
          setProducts(exists ? products.map((x) => (x.id === p.id ? p : x)) : [...products, p].slice(0, MAX_PRODUCTS));
          setEditing(null);
          toast.success("Product linked — Publish dabayein");
        }}
        onDelete={(id) => {
          setProducts(products.filter((x) => x.id !== id));
          setEditing(null);
        }}
      />
    </>
  );
}
