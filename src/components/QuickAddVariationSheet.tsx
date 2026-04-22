import { useEffect, useMemo, useState } from "react";
import { X, Check, Plus, Minus, Tag, Package } from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";

export type PricingMode = "retail" | "wholesale";

export type QuickAddSelection = {
  qty: number;
  variationLabel?: string;
  size?: string;
  color?: string;
  pricingMode: PricingMode;
  unitPrice: number;
};

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];
const DEFAULT_COLORS = [
  { name: "Gold", hex: "#d4af37" },
  { name: "Cream", hex: "#fff3c8" },
  { name: "Cognac", hex: "#8b6508" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
];

/**
 * Bottom sheet for quick-adding a product to the billing cart.
 * - Retail ↔ Wholesale price toggle
 * - Variation chips (label or size)
 * - Color swatches (when product has multiple variations)
 * - Quantity stepper
 */
export function QuickAddVariationSheet({
  product,
  defaultMode = "retail",
  onConfirm,
  onClose,
}: {
  product: EditorProduct;
  defaultMode?: PricingMode;
  onConfirm: (sel: QuickAddSelection) => void;
  onClose: () => void;
}) {
  const variations = product.variationsList ?? [];
  const labelVariations = product.variations ?? [];

  const [mode, setMode] = useState<PricingMode>(defaultMode);
  const [selectedVariation, setSelectedVariation] = useState<string | undefined>(
    variations[0]?.label ?? labelVariations[0]?.label
  );
  const [size, setSize] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const retailPrice =
    product.sellingPrice ?? product.price ?? 0;
  const wholesalePrice = useMemo(() => {
    if (product.wholesalePrice) return product.wholesalePrice;
    if (product.buyingPrice) return Math.round(product.buyingPrice * 1.15);
    return Math.round(retailPrice * 0.85);
  }, [product, retailPrice]);

  // If a specific variation is selected, prefer its price.
  const variationPrice = useMemo(() => {
    const v = variations.find((v) => v.label === selectedVariation);
    return v?.price;
  }, [variations, selectedVariation]);

  const unitPrice = variationPrice ?? (mode === "retail" ? retailPrice : wholesalePrice);
  const total = unitPrice * qty;

  const confirm = () => {
    const variationLabel = [selectedVariation, size, color].filter(Boolean).join(" · ");
    onConfirm({
      qty,
      variationLabel: variationLabel || undefined,
      size,
      color,
      pricingMode: mode,
      unitPrice,
    });
    onClose();
  };

  const showSizes = variations.length > 0 || labelVariations.length > 1;
  const showColors = variations.length > 1;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.25s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        {/* Header */}
        <div className="px-5 pb-2 flex items-center gap-3">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-14 w-14 rounded-xl object-cover border border-[color:oklch(0.78_0.14_82/0.5)]"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)]">
              <Package className="h-6 w-6 text-[#d4af37]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)] font-bold">
              ✦ Add to Bill ✦
            </p>
            <h3 className="font-display text-base text-gold-gradient font-bold leading-tight truncate">
              {product.name}
            </h3>
            <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] truncate">
              {product.tagline}
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

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
          {/* Pricing toggle */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-1.5">
              Pricing Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              <PricingPill
                active={mode === "retail"}
                title="Retail"
                price={retailPrice}
                onClick={() => setMode("retail")}
              />
              <PricingPill
                active={mode === "wholesale"}
                title="Wholesale"
                price={wholesalePrice}
                onClick={() => setMode("wholesale")}
              />
            </div>
          </section>

          {/* Variation chips */}
          {(variations.length > 0 || labelVariations.length > 0) && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-1.5">
                Variation
              </p>
              <div className="flex flex-wrap gap-2">
                {(variations.length > 0
                  ? variations.map((v) => v.label)
                  : labelVariations.map((v) => v.label)
                ).map((label) => {
                  const active = selectedVariation === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedVariation(label)}
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
                      {label}
                      {active && <Check className="inline h-3 w-3 ml-1" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sizes */}
          {showSizes && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-1.5">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SIZES.map((s) => {
                  const active = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSize(active ? undefined : s)}
                      className={`h-9 w-11 rounded-lg text-xs font-display font-bold border-2 transition ${
                        active
                          ? "text-[color:oklch(0.18_0.06_18)] border-[#d4af37]"
                          : "text-[color:oklch(0.55_0.10_82)] border-[color:oklch(0.78_0.14_82/0.4)] bg-white"
                      }`}
                      style={
                        active
                          ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" }
                          : undefined
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Colors */}
          {showColors && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-1.5">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((c) => {
                  const active = color === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setColor(active ? undefined : c.name)}
                      aria-label={c.name}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        active
                          ? "border-[#d4af37] shadow-md scale-110"
                          : "border-[color:oklch(0.78_0.14_82/0.4)]"
                      }`}
                      style={{ background: c.hex }}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Qty */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-1.5">
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
              <span className="w-10 text-center font-display text-base font-bold tabular-nums">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-9 w-9 grid place-items-center rounded-full bg-[color:oklch(0.97_0.02_85)] active:scale-90"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* Total */}
          <div className="rounded-2xl bg-gradient-to-b from-[#fff8dc] to-white border border-[color:oklch(0.78_0.14_82/0.4)] p-3">
            <div className="flex items-center justify-between text-[11px] text-[color:oklch(0.45_0.08_85)]">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {mode === "retail" ? "Retail" : "Wholesale"} · ₹{unitPrice.toLocaleString()} × {qty}
              </span>
              <span className="font-bold uppercase tracking-wider">Total</span>
            </div>
            <div className="font-display text-2xl text-gold-gradient font-bold text-right tabular-nums">
              ₹{total.toLocaleString()}
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
            <Check className="inline h-4 w-4 mr-1" strokeWidth={3} /> Add to Bill
          </button>
        </div>
      </div>
    </div>
  );
}

function PricingPill({
  active,
  title,
  price,
  onClick,
}: {
  active: boolean;
  title: string;
  price: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-3 py-2 text-left border-2 transition ${
        active
          ? "border-[#d4af37] shadow-md"
          : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white"
      }`}
      style={
        active
          ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" }
          : undefined
      }
    >
      <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
        {title}
      </p>
      <p className="font-display text-base text-gold-gradient font-bold tabular-nums">
        ₹{price.toLocaleString()}
      </p>
    </button>
  );
}
