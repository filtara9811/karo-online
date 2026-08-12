import { useEffect, useRef, useState } from "react";
import { Star, Tag } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { resolveCta } from "./product-cta";

/**
 * Clean shoppable carousel of the products attached to the video currently
 * playing. Gaps between the cards stay transparent so the video shows through.
 * Drifts slowly on its own; any touch pauses it and hands control to the user.
 */
export function LandingProductRail({
  products,
  accent,
  onOpen,
  shopName = "this shop",
  phone,
  onCta,
}: {
  products: VideoProduct[];
  accent: string;
  onOpen: (p: VideoProduct) => void;
  shopName?: string;
  phone?: string | null;
  onCta?: (p: VideoProduct) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  // Gentle auto-drift; loops back to the start when it reaches the end.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || paused || products.length < 2) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (el.scrollWidth > el.clientWidth + 4) {
        const next = el.scrollLeft + dt * 0.022;
        el.scrollLeft = next >= el.scrollWidth - el.clientWidth - 1 ? 0 : next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, products.length]);

  if (!products.length) return null;

  return (
    <div
      ref={scrollerRef}
      className="pointer-events-auto flex gap-2.5 overflow-x-auto px-3 pb-1 pt-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ touchAction: "pan-x", overscrollBehaviorX: "contain" }}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onMouseLeave={() => setPaused(false)}
    >
      {products.map((p) => {
        const cta = resolveCta(p, { shopName, phone });
        return (
          <article
            key={p.id}
            className="relative w-[150px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <button onClick={() => onOpen(p)} className="block w-full text-left">
              <div className="relative h-[180px] w-full overflow-hidden bg-slate-100">
                {p.image ? (
                  <img
                    src={optimizedImage(p.image, IMG.tile) ?? p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-slate-400">
                    <Tag className="h-5 w-5" />
                  </span>
                )}
                {p.badge && (
                  <span
                    className="absolute right-0 top-2 rounded-l-lg px-2 py-1 text-[10px] font-extrabold text-white shadow"
                    style={{ background: /best/i.test(p.badge) ? "#f97316" : "#ec4899" }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="px-2.5 pb-1 pt-2">
                <h5 className="truncate text-[12px] font-bold text-slate-900">{p.name}</h5>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[13px] font-extrabold text-slate-900">{p.price || "Ask price"}</span>
                  {p.mrp && <span className="text-[11px] font-semibold text-slate-400 line-through">{p.mrp}</span>}
                </div>
                <div className="mt-1 flex items-center gap-1 text-slate-500">
                  <Star className="h-3 w-3 fill-current" style={{ color: accent }} />
                  <span className="text-[10.5px] font-bold text-slate-700">{p.rating ?? 4.8}</span>
                  {p.reviews ? <span className="text-[10px]">({p.reviews})</span> : null}
                  {p.quantity ? <span className="ml-auto text-[9.5px] font-bold text-emerald-600">{p.quantity} left</span> : null}
                </div>
              </div>
            </button>
            <a
              href={cta.href}
              target={cta.external ? "_blank" : undefined}
              rel="noreferrer"
              onClick={() => onCta?.(p)}
              className="mx-2.5 mb-2.5 mt-1 flex h-9 items-center justify-center rounded-xl text-[12px] font-extrabold text-white active:scale-[0.98]"
              style={{ background: cta.color }}
            >
              {cta.label}
            </a>
          </article>
        );
      })}
    </div>
  );
}
