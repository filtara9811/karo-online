import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, ChevronUp } from "lucide-react";
import type { LandingMediaItem } from "@/lib/landing-types";

export type MediaItem = LandingMediaItem;

const IMAGE_DURATION = 4200;

function detectProvider(url: string): "youtube" | "other" {
  return /youtu\.?be/.test(url) ? "youtube" : "other";
}

function ytEmbed(url: string, muted: boolean): string {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/);
  if (!m) return url;
  const id = m[1];
  // loop=1 needs playlist=<id> for single videos, otherwise the player stops
  // at the end and shows the circular replay overlay.
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&iv_load_policy=3`;
}

/**
 * Vertical reel feed built on native scroll-snap: a vertical swipe starting
 * anywhere on the screen moves to the next media, including on top of YouTube
 * iframes (they are pointer-events:none, a transparent tap layer sits above).
 * Only the active slide and its neighbours mount a player, and only the active
 * slide is allowed to make sound.
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
  const total = items.length;
  const startIndex = Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0));
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [muted, setMuted] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const holdTimer = useRef<number | null>(null);
  const elapsed = useRef(0);
  const startedAt = useRef(0);
  const jumping = useRef(false);

  /** Trailing clone of the first item makes last -> first a seamless loop. */
  const slides = useMemo(() => (total > 1 ? [...items, items[0]] : items), [items, total]);
  const current = items[Math.min(index, Math.max(total - 1, 0))];

  const registerVideo = useCallback((i: number, el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(i, el);
    else videoRefs.current.delete(i);
  }, []);

  // Scroll to the requested starting slide once.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || startIndex === 0) return;
    el.scrollTo({ top: startIndex * el.clientHeight, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the visible slide; jump back to the top when the clone appears.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-slide]"));
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || e.intersectionRatio < 0.6) continue;
          const i = Number((e.target as HTMLElement).dataset.slide);
          if (total > 1 && i === total) {
            if (jumping.current) return;
            jumping.current = true;
            el.scrollTo({ top: 0, behavior: "auto" });
            setIndex(0);
            window.setTimeout(() => { jumping.current = false; }, 260);
            return;
          }
          setIndex(i);
        }
      },
      { root: el, threshold: [0.6] },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [slides.length, total]);

  // Single audio owner: everything except the active slide is paused + muted.
  useEffect(() => {
    setProgress(0);
    elapsed.current = 0;
    videoRefs.current.forEach((el, i) => {
      if (i === index) return;
      el.muted = true;
      el.pause();
    });
    const active = videoRefs.current.get(index);
    if (active) {
      active.muted = muted;
      void active.play().catch(() => {
        active.muted = true;
        setMuted(true);
        void active.play().catch(() => undefined);
      });
    }
    onIndexChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Applies the mute preference to whichever slide is active.
  useEffect(() => {
    const active = videoRefs.current.get(index);
    if (!active) return;
    active.muted = muted;
    if (!muted) void active.play().catch(() => undefined);
  }, [muted, index]);

  const toggleSound = useCallback(() => setMuted((m) => !m), []);

  // Gentle progress sweep for images (videos report their own time).
  useEffect(() => {
    if (!current || current.type !== "image") return;
    let raf = 0;
    startedAt.current = performance.now() - elapsed.current;
    const tick = (now: number) => {
      if (holding) startedAt.current = now - elapsed.current;
      else {
        elapsed.current = now - startedAt.current;
        setProgress(Math.min(1, elapsed.current / IMAGE_DURATION));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, holding, index]);

  const holdStart = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      setHolding(true);
      videoRefs.current.get(index)?.pause();
    }, 180);
  };
  const holdEnd = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    const el = videoRefs.current.get(index);
    if (el?.paused) void el.play().catch(() => undefined);
  };

  useEffect(() => () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); }, []);

  if (!current) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-black ${className}`}>
      <div
        ref={scrollerRef}
        className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll overflow-x-hidden [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
      >
        {slides.map((item, i) => {
          const isClone = total > 1 && i === total;
          const near = Math.abs(i - index) <= 1 || (isClone && index === total - 1);
          const active = i === index;
          return (
            <section
              key={`${i}-${item.src}`}
              data-slide={i}
              className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
            >
              {/* Blurred still keeps the backdrop filled behind letterboxed media */}
              {item.type !== "url" && (
                <div
                  aria-hidden
                  className="absolute inset-0 scale-105 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: `url(${item.poster || (item.type === "image" ? item.src : "")})` }}
                />
              )}

              {item.type === "video" ? (
                near ? (
                  <video
                    ref={(el) => registerVideo(i, el)}
                    src={item.src}
                    poster={item.poster ?? undefined}
                    autoPlay={active}
                    muted={active ? muted : true}
                    loop
                    playsInline
                    preload={active ? "auto" : "metadata"}
                    onTimeUpdate={(e) => {
                      if (!active) return;
                      const el = e.currentTarget;
                      if (el.duration > 0) setProgress(Math.min(1, el.currentTime / el.duration));
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null
              ) : item.type === "url" ? (
                near ? (
                  <iframe
                    key={`${item.src}-${active ? (muted ? "m" : "s") : "idle"}`}
                    src={detectProvider(item.src) === "youtube" ? ytEmbed(item.src, active ? muted : true) : item.src}
                    title={alt}
                    // pointer-events off so a swipe over the player still scrolls the feed
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    style={{ border: 0 }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                ) : null
              ) : (
                <img
                  src={item.src}
                  alt={alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* Transparent tap layer: hold to pause, never blocks vertical scroll */}
              <div
                className="absolute inset-0 z-10"
                style={{ touchAction: "pan-y" }}
                onPointerDown={holdStart}
                onPointerUp={holdEnd}
                onPointerCancel={holdEnd}
                onPointerLeave={holdEnd}
              />
            </section>
          );
        })}
      </div>

      {/* readability gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-28 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-28 bg-gradient-to-t from-black/45 to-transparent" />

      {/* sound toggle — sound is ON by default, tap to mute */}
      {current.type !== "image" && (
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
            <div className="h-full rounded-full transition-[width] duration-150" style={{ background: accent, width: `${progress * 100}%` }} />
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
