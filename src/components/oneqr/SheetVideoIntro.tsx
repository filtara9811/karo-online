import { useState } from "react";
import { ChevronDown, PlayCircle } from "lucide-react";
import { useTutorialVideo, youtubeEmbed } from "@/lib/tutorial-videos";

/**
 * Responsive tutorial player pinned to the top of a configuration sheet.
 * Renders nothing until an admin configures a video for that section.
 */
export function SheetVideoIntro({ section }: { section?: string }) {
  const video = useTutorialVideo(section);
  const [open, setOpen] = useState(true);

  if (!video) return null;
  const embed = video.youtube_url ? youtubeEmbed(video.youtube_url) : null;
  if (!embed && !video.video_url) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <PlayCircle className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-extrabold text-amber-900">
            {video.title || "How to use this"}
          </span>
          {video.caption && (
            <span className="block truncate text-[10.5px] text-amber-700/80">{video.caption}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-amber-700 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="relative w-full bg-black" style={{ aspectRatio: "16 / 9" }}>
          {embed ? (
            <iframe
              src={embed}
              title={video.title || "Tutorial"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <video
              src={video.video_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}
