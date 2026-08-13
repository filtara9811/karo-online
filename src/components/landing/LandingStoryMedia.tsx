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
 * Vertical media viewer: swipe up/down to change media, sound ON by default.
 * Frames cross-fade while both stay painted, so no black flash appears between
 * two videos. Press and hold pauses playback; releasing resumes it.
 */
export function LandingStoryMedia({
  media,
  alt,
  accent,
  className = "",
  initialIndex = 0,
  onIndexChange,
  children,
}: {
  media: MediaItem[];
  alt: string;
  accent: string;
  className?: string;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  children?: React.ReactNode;
}) {
  const items = media.length ? media : [];
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
  const [dir, setDir] = useState<1 | -1>(1);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedAt = useRef<number>(0);
  const elapsed = useRef<number>(0);
  const holdTimer = useRef<number | null>(null);

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

  /** Keeps only the newest mounted <video> so the outgoing frame can be silenced. */
  const setVideo = useCallback((el: HTMLVideoElement | null) => {
    if (el) videoRef.current = el;
  }, []);

  const go = useCallback(
    (d: 1 | -1) => {
      if (total <= 1) {
        setProgress(0);
        elapsed.current = 0;
        return;
      }
      // Silence + freeze the outgoing video: otherwise both frames play sound
      // together while they cross-fade.
      const prev = videoRef.current;
      if (prev) {
        prev.muted = true;
        prev.pause();
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
      if (paused || holding) {
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
  }, [current, paused, holding, total, index]);

  const holdStart = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      setHolding(true);
      videoRef.current?.pause();
    }, 180);
  };
  const holdEnd = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    const el = videoRef.current;
    if (el?.paused) void el.play().catch(() => undefined);
  };

  useEffect(() => () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); }, []);

  if (!current) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-black ${className}`}>
      {/* Blurred still of the active frame keeps the backdrop filled during swipes */}
      {current.type !== "url" && (
        <div
          aria-hidden
          className="absolute inset-0 scale-105 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${current.poster || (current.type === "image" ? current.src : "")})` }}
        />
      )}

      {/* mode="sync" keeps the outgoing frame painted, so there is no black gap */}
      <AnimatePresence mode="sync" initial={false} custom={dir}>
        <motion.div
          key={`${index}-${current.src}`}
          custom={dir}
          initial={{ y: dir === 1 ? "18%" : "-18%", opacity: 0, scale: 1.02 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: dir === 1 ? "-8%" : "8%", opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          drag={total > 1 ? "y" : false}
          dragElastic={0.18}
          dragConstraints={{ top: 0, bottom: 0 }}
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerCancel={holdEnd}
          onDragStart={() => { setPaused(true); holdEnd(); }}
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
              ref={setVideo}
              src={current.src}
              poster={current.poster ?? undefined}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent" />

      {/* sound toggle — sound is ON by default, tap to mute */}
      {current.type === "video" && (
        <motion.button
          type="button"
          onClick={toggleSound}
          whileTap={{ scale: 0.9 }}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="absolute right-3 top-[86px] z-30 grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white shadow-lg"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </motion.button>
      )}

      {/* hold-to-pause indicator */}
      <AnimatePresence>
        {holding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/55 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur"
          >
            paused
          </motion.div>
        )}
      </AnimatePresence>

      {/* progress bar for the item currently playing */}
      {total > 0 && (
        <div className="pointer-events-none absolute inset-x-3 top-[76px] z-20">
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

      {/* swipe hint */}
      {total > 1 && !children && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0.35, 0.9, 0.35], y: [6, 0, 6] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85"
        >
          <ChevronUp className="h-3.5 w-3.5" /> swipe
        </motion.div>
      )}

      {children}
    </div>
  );
}
