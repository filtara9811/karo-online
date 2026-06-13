import { useMemo } from "react";
import { Plus, Star, ImagePlus, ChevronRight } from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";

/**
 * Groups items by primaryCategory / category and renders one horizontal row per category.
 */
export function CategorySections({
  items,
  onQuickAdd,
  onTileLongPress,
}: {
  items: EditorProduct[];
  onQuickAdd: (p: EditorProduct, el: HTMLElement) => void;
  onTileLongPress?: (p: EditorProduct) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, EditorProduct[]>();
    items.forEach((p) => {
      const key = p.primaryCategory || p.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [items]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs text-[color:oklch(0.30_0.05_85)] font-bold uppercase tracking-wider">
                Catagry |
              </span>
              <span className="font-display text-sm text-gold-gradient font-bold">
                {cat}
              </span>
              <span className="block h-px w-8 bg-gradient-to-r from-[#d4af37] to-transparent" />
            </div>
            <button className="flex items-center gap-0.5 text-[9px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider active:scale-95">
              All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 touch-pan-x overscroll-x-contain">
            <div className="flex gap-2.5 w-max pb-1">
              {list.map((p) => (
                <CategoryTile
                  key={p.id}
                  product={p}
                  onAdd={(el) => onQuickAdd(p, el)}
                  onLongPress={() => onTileLongPress?.(p)}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function CategoryTile({
  product,
  onAdd,
  onLongPress,
}: {
  product: EditorProduct;
  onAdd: (el: HTMLElement) => void;
  onLongPress?: () => void;
}) {
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  const start = () => {
    pressTimer = setTimeout(() => onLongPress?.(), 450);
  };
  const end = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  return (
    <article
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchEnd={end}
      className="relative w-32 flex-shrink-0 rounded-2xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.5)] bg-white shadow-[0_4px_12px_-6px_rgba(212,175,55,0.4)] active:scale-[0.97] transition select-none"
    >
      <div className="relative h-24 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8]">
            <ImagePlus className="h-7 w-7 text-[#d4af37]" />
          </div>
        )}
        {product.badge && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-white/95 text-[7px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider shadow">
            {product.badge}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(e.currentTarget);
          }}
          aria-label={`Add ${product.name}`}
          className="absolute -bottom-2.5 right-1.5 h-8 w-8 rounded-full grid place-items-center text-[color:oklch(0.13_0.06_18)] shadow-gold-glow border-2 border-white active:scale-90"
          style={{
            background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={3.2} />
        </button>
      </div>
      <div className="p-1.5 pt-2.5">
        <h5 className="font-display text-[11px] font-bold text-[color:oklch(0.25_0.05_85)] truncate">
          {product.name}
        </h5>
        <div className="flex items-baseline justify-between mt-0.5">
          <span className="font-display text-xs text-gold-gradient font-bold">
            ₹{product.price.toLocaleString()}
          </span>
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
            <span className="text-[9px] font-bold">{product.rating}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
