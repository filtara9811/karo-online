import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, ChevronUp } from "lucide-react";
import type { LandingMediaItem } from "@/lib/landing-types";

export type MediaItem = LandingMediaItem;

const IMAGE_DURATION = 4200;

function detectProvider(url: string): "youtube" | "other" {
  return /youtu\.?be/.test(url) ? "youtube" : "other";
}

function ytEmbed(url: string, muted: boolean): string {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
  return m
    ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&controls=1&modestbranding=1&rel=0`
    : url;
}

/**
 * Reels/TikTok style media viewer: vertical swipe up/down to change media,
 * one progress segment per item, sound ON by default (tap to mute).
 * Videos play their full length — progress follows real playback time and the
 * next item starts only when the video actually ends.
 */
export function LandingStoryMedia({
  media,
  alt,
  accent,
  className = "",
  onIndexChange,
  children,
}: {
  media: MediaItem[];
  alt: string;
  accent: string;
  className?: string;
  onIndexChange?: (index: number) => void;
  children?: React.ReactNode;
}) {
  const items = media.length ? media : [];
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedAt = useRef<number>(0);
  const elapsed = useRef<number>(0);

  const toggleSound = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      const el = videoRef.current;
      if (el) {
        el.muted = next;
        if (!next) void el.play().catch(() => undefined);
      }
      return next;
    });
  }, []);

  const current = items[Math.min(index, Math.max(items.length - 1, 0))];
  const total = items.length;

  const go = useCallback(
    (d: 1 | -1) => {
      if (total <= 1) {
        setProgress(0);
        elapsed.current = 0;
        return;
      }
      setDir(d);
      setIndex((i) => (i + d + total) % total);
      setProgress(0);
      elapsed.current = 0;
    },
    [total],
  );

  useEffect(() => {
    setProgress(0);
    elapsed.current = 0;
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  // Autoplay with sound; browsers that block it fall back to muted playback.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    void el.play().catch(() => {
      el.muted = true;
      setMuted(true);
      void el.play().catch(() => undefined);
    });
  }, [index, muted, current?.src]);

  // Images get a gentle progress sweep, but nothing auto-advances any more —
  // the viewer swipes manually to reach the next video.
  useEffect(() => {
    if (!current || total === 0 || current.type !== "image") return;
    let raf = 0;
    startedAt.current = performance.now() - elapsed.current;

    const tick = (now: number) => {
      if (paused) {
        startedAt.current = now - elapsed.current;
        raf = requestAnimationFrame(tick);
        return;
      }
      elapsed.current = now - startedAt.current;
      setProgress(Math.min(1, elapsed.current / IMAGE_DURATION));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, paused, total, index]);


  if (!current) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-black ${className}`}>
      <AnimatePresence mode="popLayout" custom={dir}>
        <motion.div
          key={`${index}-${current.src}`}
          custom={dir}
          initial={{ y: dir === 1 ? "100%" : "-100%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: dir === 1 ? "-100%" : "100%", opacity: 0.4 }}
          transition={{ type: "spring", damping: 30, stiffness: 260 }}
          drag={total > 1 ? "y" : false}
          dragElastic={0.18}
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragStart={() => setPaused(true)}
          onDragEnd={(_, info) => {
            setPaused(false);
            if (info.offset.y < -60 || info.velocity.y < -400) go(1);
            else if (info.offset.y > 60 || info.velocity.y > 400) go(-1);
          }}
          className="absolute inset-0 touch-pan-x"
        >
          {current.type === "video" ? (
            <video
              key={current.src}
              ref={videoRef}
              src={current.src}
              autoPlay
              muted={muted}
              loop
              playsInline
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration > 0) setProgress(Math.min(1, el.currentTime / el.duration));
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />

          ) : current.type === "url" ? (
            detectProvider(current.src) === "youtube" ? (
              <iframe
                key={`${current.src}-${muted ? "m" : "s"}`}
                src={ytEmbed(current.src, muted)}
                title={alt}
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <iframe src={current.src} title={alt} className="absolute inset-0 h-full w-full" style={{ border: 0 }} allowFullScreen />
            )
          ) : (
            <img
              src={current.src}
              alt={alt}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* readability gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />

      {/* sound toggle — sound is ON by default, tap to mute */}
      {current.type === "video" && (
        <motion.button
          type="button"
          onClick={toggleSound}
          whileTap={{ scale: 0.9 }}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="absolute right-3 top-9 z-30 grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </motion.button>
      )}

      {/* swipe hint */}
      {total > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0.35, 0.9, 0.35], y: [6, 0, 6] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85"
        >
          <ChevronUp className="h-3.5 w-3.5" /> swipe
        </motion.div>
      )}

      {/* single progress bar for the item currently playing */}
      {total > 0 && (
        <div className="pointer-events-none absolute inset-x-3 top-2 z-20">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/30">
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent, width: `${progress * 100}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
          {total > 1 && (
            <p className="mt-1 text-right text-[9px] font-bold text-white/70">
              {index + 1}/{total}
            </p>
          )}
        </div>
      )}


      {children}
    </div>
  );
}
