import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Tag } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";

/**
 * Shoppable rail of the products attached to the video currently playing.
 * Auto-slides slowly; pauses on touch.
 */
export function LandingProductRail({
  products,
  accent,
  onOpen,
  compact = false,
}: {
  products: VideoProduct[];
  accent: string;
  onOpen: (p: VideoProduct) => void;
  compact?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  if (!products.length) return null;

  const loop = products.length > 2 ? [...products, ...products] : products;

  return (
    <section className={compact ? "px-3 pt-2" : "px-3 pt-3"}>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h3 className="text-[12px] font-extrabold" style={{ color: compact ? "white" : accent }}>
          Shop Our Collection
        </h3>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">
          View All ›
        </span>
      </div>
      <div
        className="-mx-3 overflow-hidden px-3"
        style={{ touchAction: "pan-y" }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className={`marquee-x flex w-max gap-2.5 ${paused ? "paused" : ""}`}>
          <AnimatePresence initial={false}>
            {loop.map((p, i) => (
              <motion.article
                key={`${p.id}-${i}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                onClick={() => onOpen(p)}
                className={`relative shrink-0 overflow-hidden border shadow-sm backdrop-blur ${compact ? "w-[108px] rounded-xl bg-white/85" : "w-[124px] rounded-2xl bg-white/95"}`}
                style={{ borderColor: `${accent}55` }}
              >
                <div className={`relative overflow-hidden bg-slate-100 ${compact ? "h-[68px]" : "h-[104px]"}`}>
                  {p.image ? (
                    <img
                      src={optimizedImage(p.image, IMG.tile) ?? p.image}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-slate-400"><Tag className="h-5 w-5" /></span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpen(p); }}
                    aria-label={`Open ${p.name}`}
                    className="absolute -bottom-3 right-1.5 grid h-8 w-8 place-items-center rounded-full border-2 border-white text-white shadow active:scale-90"
                    style={{ background: accent }}
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>
                <div className="p-1.5 pt-2.5">
                  <h5 className="truncate text-[11px] font-bold text-slate-900">{p.name}</h5>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="text-[11.5px] font-extrabold" style={{ color: accent }}>
                      {p.price || "Ask price"}
                    </span>
                    <span className="flex items-center gap-0.5 text-slate-500">
                      <Star className="h-2.5 w-2.5 fill-current" style={{ color: accent }} />
                      <span className="text-[8.5px] font-bold">{p.rating ?? 4.8}</span>
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
