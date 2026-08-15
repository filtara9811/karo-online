import { useRef } from "react";
import { Star, Tag } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { resolveCta } from "./product-cta";

export type RailVariant = "cards" | "wide";

/**
 * Compact shoppable carousel of the products attached to the video currently
 * playing. Two styles: tall mini cards ("cards") and short wide rows ("wide"),
 * switchable from the product section header.
 */
export function LandingProductRail({
  products,
  accent,
  onOpen,
  shopName = "this shop",
  phone,
  onCta,
  variant = "cards",
}: {
  products: VideoProduct[];
  accent: string;
  onOpen: (p: VideoProduct) => void;
  shopName?: string;
  phone?: string | null;
  onCta?: (p: VideoProduct) => void;
  variant?: RailVariant;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  if (!products.length) return null;

  const wide = variant === "wide";

  return (
    <div
      ref={scrollerRef}
      className="pointer-events-auto flex gap-2 overflow-x-auto px-3 pb-0.5 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ touchAction: "pan-x", overscrollBehaviorX: "contain" }}
    >
      {products.map((p) => {
        const cta = resolveCta(p, { shopName, phone });

        if (wide) {
          return (
            <article
              key={p.id}
              className="relative flex w-[236px] shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-white p-1.5 shadow-lg"
            >
              <button onClick={() => onOpen(p)} className="product-thumb-frame h-[54px] w-[54px] shrink-0 rounded-lg">
                {p.image ? (
                  <img
                    src={optimizedImage(p.image, IMG.tile) ?? p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="product-thumb-image"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-slate-400">
                    <Tag className="h-4 w-4" />
                  </span>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <button onClick={() => onOpen(p)} className="block w-full text-left">
                  <h5 className="truncate text-[11px] font-bold text-slate-900">{p.name}</h5>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11.5px] font-extrabold text-slate-900">{p.price || "Ask price"}</span>
                    {p.mrp && <span className="text-[9.5px] font-semibold text-slate-400 line-through">{p.mrp}</span>}
                    <Star className="ml-auto h-2.5 w-2.5 fill-current" style={{ color: accent }} />
                    <span className="text-[9.5px] font-bold text-slate-700">{p.rating ?? 4.8}</span>
                  </div>
                </button>
                <a
                  href={cta.href}
                  target={cta.external ? "_blank" : undefined}
                  rel="noreferrer"
                  onClick={() => onCta?.(p)}
                  className="mt-1 flex h-[24px] items-center justify-center rounded-lg text-[10.5px] font-extrabold text-white active:scale-[0.98]"
                  style={{ background: cta.color }}
                >
                  {cta.label}
                </a>
              </div>
            </article>
          );
        }

        return (
          <article
            key={p.id}
            className="relative w-[108px] shrink-0 overflow-hidden rounded-xl bg-white shadow-lg"
          >
            <button onClick={() => onOpen(p)} className="block w-full text-left">
              <div className="product-thumb-frame h-[74px]">
                {p.image ? (
                  <img
                    src={optimizedImage(p.image, IMG.tile) ?? p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="product-thumb-image"
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
              className="mx-2 mb-1.5 mt-1 flex h-[26px] items-center justify-center rounded-lg text-[10.5px] font-extrabold text-white active:scale-[0.98]"
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
