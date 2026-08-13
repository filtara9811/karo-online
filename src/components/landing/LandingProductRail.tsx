import { useRef } from "react";
import { Star, Tag } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { resolveCta } from "./product-cta";

/**
 * Compact shoppable carousel of the products attached to the video currently
 * playing. Cards are small enough that 2–3 stay visible without covering the
 * video, and the gaps stay transparent so the video shows through.
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

  if (!products.length) return null;

  return (
    <div
      ref={scrollerRef}
      className="pointer-events-auto flex gap-2 overflow-x-auto px-3 pb-0.5 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ touchAction: "pan-x", overscrollBehaviorX: "contain" }}
    >
      {products.map((p) => {
        const cta = resolveCta(p, { shopName, phone });
        return (
          <article
            key={p.id}
            className="relative w-[118px] shrink-0 overflow-hidden rounded-xl bg-white shadow-lg"
          >
            <button onClick={() => onOpen(p)} className="block w-full text-left">
              <div className="relative h-[96px] w-full overflow-hidden bg-slate-100">
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
                    <Tag className="h-4 w-4" />
                  </span>
                )}
                {p.badge && (
                  <span
                    className="absolute right-0 top-1.5 rounded-l-md px-1.5 py-0.5 text-[8.5px] font-extrabold text-white shadow"
                    style={{ background: /best/i.test(p.badge) ? "#f97316" : "#ec4899" }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="px-2 pb-0.5 pt-1.5">
                <h5 className="truncate text-[11px] font-bold text-slate-900">{p.name}</h5>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-[11.5px] font-extrabold text-slate-900">{p.price || "Ask price"}</span>
                  {p.mrp && <span className="text-[9.5px] font-semibold text-slate-400 line-through">{p.mrp}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-slate-500">
                  <Star className="h-2.5 w-2.5 fill-current" style={{ color: accent }} />
                  <span className="text-[9.5px] font-bold text-slate-700">{p.rating ?? 4.8}</span>
                  {p.quantity ? <span className="ml-auto text-[8.5px] font-bold text-emerald-600">{p.quantity} left</span> : null}
                </div>
              </div>
            </button>
            <a
              href={cta.href}
              target={cta.external ? "_blank" : undefined}
              rel="noreferrer"
              onClick={() => onCta?.(p)}
              className="mx-2 mb-2 mt-1 flex h-7 items-center justify-center rounded-lg text-[10.5px] font-extrabold text-white active:scale-[0.98]"
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
