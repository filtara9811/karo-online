import { useState } from "react";
import { Play, ChevronRight, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useHomeVideos, type HomeVideo } from "@/hooks/use-home-content";

/** Horizontally scrollable, clickable video rail (YouTube-style). Managed from Admin → Home Content. */
export function HomeVideoRail() {
  const { videos, loading } = useHomeVideos();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState<HomeVideo | null>(null);

  const open = (v: HomeVideo) => {
    if (v.link) {
      if (/^https?:\/\//i.test(v.link)) window.open(v.link, "_blank", "noopener,noreferrer");
      else navigate({ to: v.link as string });
      return;
    }
    if (v.video_url) setPlaying(v);
  };

  if (loading) {
    return (
      <div className="flex gap-3 px-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[42%] h-28 rounded-2xl bg-white/70 animate-pulse" />
        ))}
      </div>
    );
  }
  if (videos.length === 0) return null;

  return (
    <section className="pt-4">
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="font-semibold text-[15px] text-slate-900">Recommended Videos</span>
        <span className="text-orange-500 text-[12px] font-semibold flex items-center">
          See All <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => open(v)}
            className="shrink-0 w-[42%] text-left active:scale-[0.97] transition"
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-[0_12px_26px_-16px_rgba(0,0,0,0.6)]">
              {v.thumb_url ? (
                <img src={v.thumb_url} alt={v.title || "Video"} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <video src={v.video_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-0 grid place-items-center">
                <span className="h-9 w-9 rounded-full bg-black/50 backdrop-blur grid place-items-center">
                  <Play className="h-4 w-4 text-white fill-white" />
                </span>
              </span>
              {v.duration && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                  {v.duration}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[12.5px] font-bold text-slate-900 truncate">{v.title}</p>
            {v.subtitle && <p className="text-[11px] text-slate-500 truncate">{v.subtitle}</p>}
          </button>
        ))}
      </div>

      {playing?.video_url && (
        <div className="fixed inset-0 z-[120] bg-black/90 grid place-items-center p-4" onClick={() => setPlaying(null)}>
          <button
            onClick={() => setPlaying(null)}
            aria-label="Close video"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/15 grid place-items-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <video
            src={playing.video_url}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl"
          />
        </div>
      )}
    </section>
  );
}
