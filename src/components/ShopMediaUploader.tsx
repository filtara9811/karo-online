import { useEffect, useRef, useState } from "react";
import { ImagePlus, Video as VideoIcon, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Vendor backend uploader for the digital-shop cover.
 * - Uploads video or image to the `business-cards` bucket.
 * - Writes the URL to vendors.cover_video_url / cover_image_url.
 * - Live preview here; same media appears on the customer-facing digital shop.
 */
export function ShopMediaUploader({ variant = "card" }: { variant?: "card" | "hero" } = {}) {
  const { user } = useAuth();
  const [video, setVideo] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("cover_image_url, cover_video_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setImage((data as any).cover_image_url ?? null);
      setVideo((data as any).cover_video_url ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const upload = async (file: File, kind: "image" | "video") => {
    if (!user || !file) return;
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4");
      const path = `${user.id}/shop-${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("business-cards")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        toast.error("Upload failed: " + error.message);
        return;
      }
      const { data } = supabase.storage.from("business-cards").getPublicUrl(path);
      const patch =
        kind === "image" ? { cover_image_url: data.publicUrl } : { cover_video_url: data.publicUrl };
      const { error: upErr } = await supabase.from("vendors").update(patch).eq("user_id", user.id);
      if (upErr) {
        toast.error("Save failed: " + upErr.message);
        return;
      }
      if (kind === "image") setImage(data.publicUrl);
      else setVideo(data.publicUrl);
      toast.success(kind === "image" ? "Cover image updated" : "Cover video updated");
    } finally {
      setUploading(null);
    }
  };

  const hasMedia = !!video || !!image;

  const isHero = variant === "hero";

  return (
    <section
      className={
        isHero
          ? "relative overflow-hidden border-b border-[color:oklch(0.72_0.01_260/0.55)] shadow-[0_8px_22px_-12px_rgba(0,0,0,0.35)]"
          : "relative overflow-hidden rounded-3xl border border-[color:oklch(0.72_0.01_260/0.55)] shadow-[0_18px_40px_-16px_rgba(212,175,55,0.55)]"
      }
      style={{
        background:
          "linear-gradient(135deg, #f5f6f8 0%, #d8dde3 55%, #a8acb3 100%)",
      }}
    >
      <div
        className={
          isHero
            ? "relative w-full bg-gradient-to-br from-[#fff8dc] via-[#fdf3c8] to-[#f5e9b8]"
            : "relative aspect-[16/9] w-full bg-gradient-to-br from-[#fff8dc] via-[#fdf3c8] to-[#f5e9b8]"
        }
        style={isHero ? { height: "220px" } : undefined}
      >
        {video ? (
          <video
            key={video}
            src={video}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : image ? (
          <img src={image} alt="Shop cover" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.45_0.10_82)] font-bold mb-1.5">
                ✦ Your Digital Shop Cover ✦
              </p>
              <p className="text-[11px] text-[color:oklch(0.45_0.05_85)]">
                Upload a video or image — instantly shows on your customer-facing shop.
              </p>
            </div>
          </div>
        )}
        {/* dark gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
        {hasMedia && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-white/95 border border-emerald-400/60 shadow text-[9px] font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> LIVE on Digital Shop
          </div>
        )}
      </div>

      <div
        className={
          isHero
            ? "absolute bottom-2 right-2 z-10 flex items-center gap-1.5"
            : "px-3 py-2.5 flex items-center gap-2"
        }
      >
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f, "image");
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={vidRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f, "video");
            e.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => vidRef.current?.click()}
          disabled={!!uploading}
          className={
            isHero
              ? "h-8 w-8 rounded-full grid place-items-center bg-black/55 backdrop-blur text-white border border-white/30 shadow active:scale-90 disabled:opacity-60"
              : "flex-1 h-10 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8941f] border border-white/60 shadow-md text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
          }
          aria-label={video ? "Change Video" : "Upload Video"}
        >
          {uploading === "video" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <VideoIcon className="h-3.5 w-3.5" />
          )}
          {!isHero && (video ? "Change Video" : "Upload Video")}
        </button>
        <button
          type="button"
          onClick={() => imgRef.current?.click()}
          disabled={!!uploading}
          className={
            isHero
              ? "h-8 w-8 rounded-full grid place-items-center bg-black/55 backdrop-blur text-white border border-white/30 shadow active:scale-90 disabled:opacity-60"
              : "flex-1 h-10 rounded-xl bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow text-xs font-bold text-[color:oklch(0.22_0.05_85)] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
          }
          aria-label={image ? "Change Photo" : "Upload Photo"}
        >
          {uploading === "image" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {!isHero && (image ? "Change Photo" : "Upload Photo")}
        </button>
      </div>
    </section>
  );
}
