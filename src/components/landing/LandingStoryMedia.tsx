import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

export type MediaItem = { type: "image" | "video" | "url"; src: string };

const DURATION: Record<MediaItem["type"], number> = {
  image: 4200,
  video: 12000,
  url: 14000,
};

function detectProvider(url: string): "youtube" | "other" {
  return /youtu\.?be/.test(url) ? "youtube" : "other";
}

function ytEmbed(url: string, muted: boolean): string {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
  return m
    ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&loop=1&playlist=${m[1]}&controls=0&modestbranding=1&rel=0`
    : url;
}

/**
 * Instagram-status style media viewer: one progress segment per uploaded item,
 * auto advance, tap left/right to seek, press-and-hold to pause.
 */
export function LandingStoryMedia({
  media,
  alt,
  accent,
  className = "",
  children,
}: {
  media: MediaItem[];
  alt: string;
  accent: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const items = media.length ? media : [];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const startedAt = useRef<number>(0);
  const elapsed = useRef<number>(0);

  const current = items[Math.min(index, Math.max(items.length - 1, 0))];
  const total = items.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (total <= 1) {
        setProgress(0);
        elapsed.current = 0;
        return;
      }
      setIndex((i) => (i + dir + total) % total);
      setProgress(0);
      elapsed.current = 0;
    },
    [total],
  );

  useEffect(() => {
    setProgress(0);
    elapsed.current = 0;
  }, [index]);

  useEffect(() => {
    if (!current || total === 0) return;
    let raf = 0;
    const duration = DURATION[current.type] ?? 4200;
    startedAt.current = performance.now() - elapsed.current;

    const tick = (now: number) => {
      if (paused) {
        startedAt.current = now - elapsed.current;
        raf = requestAnimationFrame(tick);
        return;
      }
      elapsed.current = now - startedAt.current;
      const p = Math.min(1, elapsed.current / duration);
      setProgress(p);
      if (p >= 1) {
        elapsed.current = 0;
        if (total > 1) setIndex((i) => (i + 1) % total);
        startedAt.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, paused, total, index]);

  if (!current) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-black ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${index}-${current.src}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {current.type === "video" ? (
            <video
              key={current.src}
              src={current.src}
              autoPlay
              muted
              loop={total === 1}
              playsInline
              onEnded={() => go(1)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : current.type === "url" ? (
            detectProvider(current.src) === "youtube" ? (
              <iframe
                src={ytEmbed(current.src)}
                title={alt}
                className="pointer-events-none absolute inset-0 h-full w-full"
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
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* readability gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />

      {/* tap zones */}
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            className="absolute left-0 top-0 h-full w-1/3"
          />
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            className="absolute right-0 top-0 h-full w-1/3"
          />
        </>
      )}

      {/* progress segments — one per uploaded item */}
      {total > 0 && (
        <div className="pointer-events-none absolute inset-x-3 top-2 z-20 flex gap-1.5">
          {items.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: accent,
                  width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%",
                }}
                transition={{ ease: "linear", duration: 0.1 }}
              />
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
