import { useEffect, useState } from "react";
import { X, Check, Plus, Minus } from "lucide-react";
import type { Product } from "@/lib/products";

/**
 * Bottom sheet shown when a customer taps "+" on a product that has variations.
 * Lets them pick a variation and quantity before adding to cart with full detail.
 */
export function VariationPickerSheet({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (selection: { variation?: string; qty: number }) => void;
}) {
  const variations = product.variations ?? [];
  const [selected, setSelected] = useState<string | undefined>(variations[0]?.value);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const confirm = () => {
    onConfirm({ variation: selected, qty });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.25s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[80vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        <div className="px-5 pb-2 flex items-center gap-3">
          <img
            src={product.image}
            alt={product.name}
            className="h-14 w-14 rounded-xl object-cover border border-[color:oklch(0.78_0.14_82/0.5)]"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)] font-bold">
              ✦ Choose Option ✦
            </p>
            <h3 className="font-display text-base text-gold-gradient font-bold leading-tight truncate">
              {product.name}
            </h3>
            <p className="font-display text-sm text-gold-gradient font-bold">
              ₹{product.price.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {variations.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-2">
                Select Variation
              </p>
              <div className="flex flex-wrap gap-2">
                {variations.map((v) => {
                  const active = selected === v.value;
                  return (
                    <button
                      key={v.value}
                      onClick={() => setSelected(v.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-display font-bold border-2 transition ${
                        active
                          ? "text-[color:oklch(0.18_0.06_18)] border-[#d4af37] shadow-md"
                          : "text-[color:oklch(0.55_0.10_82)] border-[color:oklch(0.78_0.14_82/0.4)] bg-white"
                      }`}
                      style={
                        active
                          ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" }
                          : undefined
                      }
                    >
                      {v.label}
                      {active && <Check className="inline h-3 w-3 ml-1" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-2">
              Quantity
            </p>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:oklch(0.78_0.14_82/0.5)] bg-white px-2 py-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-9 w-9 grid place-items-center rounded-full bg-[color:oklch(0.97_0.02_85)] active:scale-90"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-display text-base font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-9 w-9 grid place-items-center rounded-full bg-[color:oklch(0.97_0.02_85)] active:scale-90"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>

          <div className="rounded-2xl bg-gradient-to-b from-[#fff8dc] to-white border border-[color:oklch(0.78_0.14_82/0.4)] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[color:oklch(0.45_0.08_85)]">Total</span>
              <span className="font-display text-xl text-gold-gradient font-bold">
                ₹{(product.price * qty).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">
          <button
            onClick={confirm}
            className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-base text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
            style={{
              background:
                "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
            }}
          >
            <Check className="inline h-4 w-4 mr-1" strokeWidth={3} /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
