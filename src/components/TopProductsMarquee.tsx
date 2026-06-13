import { useState } from "react";
import { Plus, Star, ImagePlus } from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";

/**
 * Slow infinite horizontal marquee of top products.
 * Touch to pause; tap "+" to fire onQuickAdd.
 */
export function TopProductsMarquee({
  items,
  onQuickAdd,
}: {
  items: EditorProduct[];
  onQuickAdd: (p: EditorProduct, el: HTMLElement) => void;
}) {
  const [paused, setPaused] = useState(false);

  if (items.length === 0) return null;

  // Duplicate the strip so it loops seamlessly.
  const loop = [...items, ...items];

  return (
    <section>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <h3 className="font-display text-sm text-gold-gradient font-bold uppercase tracking-wider">
          ✦ Top Products
        </h3>
        <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] font-bold uppercase tracking-wider">
          Auto · slide
        </span>
      </div>
      <div
        className="overflow-hidden -mx-4 px-4"
        style={{ touchAction: "pan-y" }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          className={`marquee-x flex gap-2.5 w-max ${paused ? "paused" : ""}`}
        >
          {loop.map((p, i) => (
            <MiniTile
              key={`${p.id}-${i}`}
              product={p}
              onAdd={(el) => onQuickAdd(p, el)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniTile({
  product,
  onAdd,
}: {
  product: EditorProduct;
  onAdd: (el: HTMLElement) => void;
}) {
  return (
    <article className="relative w-28 flex-shrink-0 rounded-xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.5)] bg-white shadow-[0_4px_12px_-6px_rgba(212,175,55,0.4)]">
      <div className="relative h-20 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8]">
            <ImagePlus className="h-6 w-6 text-[#d4af37]" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(e.currentTarget);
          }}
          aria-label={`Add ${product.name}`}
          className="absolute -bottom-2.5 right-1.5 h-7 w-7 rounded-full grid place-items-center text-[color:oklch(0.13_0.06_18)] shadow border-2 border-white active:scale-90"
          style={{
            background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
          }}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3.2} />
        </button>
      </div>
      <div className="p-1.5 pt-2">
        <h5 className="font-display text-[10px] font-bold text-[color:oklch(0.25_0.05_85)] truncate">
          {product.name}
        </h5>
        <div className="flex items-baseline justify-between mt-0.5">
          <span className="font-display text-[11px] text-gold-gradient font-bold">
            ₹{product.price.toLocaleString()}
          </span>
          <span className="flex items-center gap-0.5">
            <Star className="h-2 w-2 fill-[#d4af37] text-[#d4af37]" />
            <span className="text-[8px] font-bold">{product.rating}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
