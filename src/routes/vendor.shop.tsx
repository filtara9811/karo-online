import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Receipt,
  Star,
  Sparkles,
  Edit3,
  ImagePlus,
  ShoppingBasket,
} from "lucide-react";
import { PRODUCTS } from "@/lib/products";
import { ProductEditor, type EditorProduct } from "@/components/ProductEditor";
import { VendorDashboardCard } from "@/components/VendorDashboardCard";
import { POSInvoiceSheet, type CartLine } from "@/components/POSInvoiceSheet";

export const Route = createFileRoute("/vendor/shop")({
  head: () => ({
    meta: [
      { title: "My Digital Dukan — Vendor" },
      { name: "description", content: "Manage your digital shop products and create POS invoices." },
    ],
  }),
  component: VendorShop,
});

type VendorProduct = EditorProduct;

type FlyEffect = { id: number; src: string; from: DOMRect; to: DOMRect };

function VendorShop() {
  const navigate = useNavigate();
  const [items, setItems] = useState<VendorProduct[]>(
    PRODUCTS.map((p) => ({ ...p, theme: "classic" }))
  );
  const [editing, setEditing] = useState<VendorProduct | null>(null);
  const [posOpen, setPosOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);

  // POS billing cart (persists across openings)
  const [cart, setCart] = useState<CartLine[]>([]);
  const [flying, setFlying] = useState<FlyEffect[]>([]);
  const basketRef = useRef<HTMLDivElement | null>(null);

  // long-press handler
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPressStart = (p: VendorProduct) => {
    pressTimer.current = setTimeout(() => setEditing(p), 450);
  };
  const onPressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const saveProduct = (updated: VendorProduct) => {
    setItems((prev) => {
      const exists = prev.find((p) => p.id === updated.id);
      if (exists) return prev.map((p) => (p.id === updated.id ? updated : p));
      return [updated, ...prev];
    });
    setEditing(null);
    setAddingNew(false);
  };

  const addToBilling = (p: VendorProduct, fromEl: HTMLElement) => {
    const target = basketRef.current;
    if (target && p.image) {
      const from = fromEl.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setFlying((prev) => [...prev, { id, src: p.image, from, to }]);
      setTimeout(() => setFlying((prev) => prev.filter((f) => f.id !== id)), 850);
    }
    setCart((prev) => {
      const ex = prev.find((l) => l.product.id === p.id);
      if (ex) return prev.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);

  return (
    <div
      className="fixed inset-0 overflow-y-auto pb-32"
      style={{
        background:
          "radial-gradient(ellipse at top, #fffaf0 0%, transparent 55%), linear-gradient(160deg, #fffdf5 0%, #fbf3d9 60%, #f5e9b8 100%)",
      }}
    >
      <div className="pointer-events-none fixed -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[color:oklch(0.78_0.14_82/0.35)]">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ My Dukan ✦</p>
            <h1 className="font-display text-lg text-gold-gradient leading-tight font-bold">
              Ashhu's Digital Shop
            </h1>
          </div>
          <button
            onClick={() => setPosOpen(true)}
            aria-label="Create Invoice"
            className="relative h-9 w-9 grid place-items-center rounded-full text-[color:oklch(0.18_0.06_18)] shadow-md active:scale-90"
            style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
          >
            <Receipt className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-3 space-y-4">
        {/* === Visiting-card live dashboard === */}
        <VendorDashboardCard items={items} />

        {/* Hint banner */}
        <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] px-3 py-2 flex items-center gap-2 shadow-sm">
          <Sparkles className="h-4 w-4 text-[#d4af37] flex-shrink-0" />
          <p className="text-[11px] text-[color:oklch(0.42_0.10_82)] leading-snug">
            Tap the gold{" "}
            <span className="inline-grid h-4 w-4 place-items-center rounded-full bg-gold-bar text-white align-middle">
              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
            </span>{" "}
            to add to billing · <span className="font-bold">long-press</span> any card to edit.
          </p>
        </div>

        {/* Section: All products */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-display text-base text-gold-gradient font-bold">
              All Products <span className="font-light">| {items.length}</span>
            </h3>
            <button
              onClick={() => setAddingNew(true)}
              className="text-[10px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider"
            >
              + Add New
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {items.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                onPressStart={() => onPressStart(p)}
                onPressEnd={onPressEnd}
                onQuickAdd={(el) => addToBilling(p, el)}
              />
            ))}

            {/* Add tile */}
            <button
              onClick={() => setAddingNew(true)}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] grid place-items-center bg-white/60 active:scale-[0.97]"
            >
              <div className="flex flex-col items-center gap-1.5 text-[color:oklch(0.42_0.10_82)]">
                <span
                  className="h-10 w-10 rounded-full grid place-items-center text-white shadow-md"
                  style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
                >
                  <ImagePlus className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-display font-bold">Add Product</span>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Floating quick-billing basket bar */}
      {cartCount > 0 && !posOpen && (
        <div
          className="fixed inset-x-0 z-40 pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
        >
          <div className="max-w-md mx-auto px-4">
            <button
              onClick={() => setPosOpen(true)}
              className="pointer-events-auto w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-[color:oklch(0.78_0.14_82/0.6)] shadow-[0_10px_28px_-10px_rgba(212,175,55,0.6)] active:scale-[0.99]"
              style={{
                background: "linear-gradient(180deg, #fffaeb, #fdf3c8)",
                animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              <span
                ref={basketRef}
                className="relative h-11 w-11 rounded-full grid place-items-center bg-white border-2 border-[#d4af37] shadow-gold-glow"
              >
                <ShoppingBasket className="h-5 w-5 text-[#92400e]" strokeWidth={2.4} />
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-gradient-to-br from-[#f5d97a] via-[#d4af37] to-[#8b6508] text-[10px] font-bold text-white grid place-items-center shadow">
                  {cartCount}
                </span>
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block font-display text-[13px] text-gold-gradient font-bold leading-tight">
                  {cartCount} item{cartCount > 1 ? "s" : ""} · Bill ready
                </span>
                <span className="block text-[10px] text-[color:oklch(0.45_0.08_85)]">
                  ₹{cartTotal.toLocaleString()} · tap to checkout
                </span>
              </span>
              <span className="px-3 py-2 rounded-full bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-bold text-[11px] shadow-gold-glow">
                Bill Now
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Flying images */}
      {flying.map((f) => (
        <FlyImage key={f.id} fly={f} />
      ))}

      {/* Edit / Create sheet */}
      {(editing || addingNew) && (
        <ProductEditor
          product={
            editing ?? {
              id: `new-${Date.now()}`,
              name: "",
              tagline: "",
              description: "",
              price: 0,
              mrp: 0,
              image: "",
              rating: 5,
              reviews: 0,
              seller: "Ashhu Qureshi",
              category: "Beauty",
              theme: "classic",
            }
          }
          onSave={saveProduct}
          onClose={() => {
            setEditing(null);
            setAddingNew(false);
          }}
        />
      )}

      {/* POS sheet */}
      {posOpen && (
        <POSInvoiceSheet
          products={items}
          initialCart={cart}
          onCartChange={setCart}
          onClose={() => setPosOpen(false)}
        />
      )}
    </div>
  );
}

function ProductTile({
  product,
  onPressStart,
  onPressEnd,
  onQuickAdd,
}: {
  product: VendorProduct;
  onPressStart: () => void;
  onPressEnd: () => void;
  onQuickAdd: (sourceEl: HTMLElement) => void;
}) {
  const themeStyles: Record<NonNullable<VendorProduct["theme"]>, string> = {
    classic: "bg-white",
    minimal: "bg-[#fffaf0]",
    bold: "bg-gradient-to-b from-white to-[#fff3c8]",
    luxe: "bg-gradient-to-b from-[#fff8dc] to-[#f5e9b8]",
  };
  const t = product.theme ?? "classic";
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);

  return (
    <article
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      className={`relative aspect-[3/4] rounded-2xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] active:scale-[0.97] transition select-none ${themeStyles[t]}`}
      style={{ animation: "float-soft 6s ease-in-out infinite" }}
    >
      <div className="relative h-3/5 overflow-hidden">
        {product.image ? (
          <img ref={imgRef} src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div ref={fallbackRef} className="h-full w-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8]">
            <ImagePlus className="h-8 w-8 text-[#d4af37]" />
          </div>
        )}
        {product.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[8px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider shadow">
            {product.badge}
          </span>
        )}
        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 grid place-items-center shadow">
          <Edit3 className="h-3 w-3 text-[color:oklch(0.42_0.10_82)]" />
        </span>

        {/* Round + Quick-add to billing */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const src = imgRef.current ?? fallbackRef.current;
            if (src) onQuickAdd(src);
          }}
          aria-label={`Add ${product.name} to billing`}
          className="absolute -bottom-3 right-2 h-9 w-9 rounded-full grid place-items-center text-[color:oklch(0.13_0.06_18)] shadow-gold-glow border-2 border-white active:scale-90 transition"
          style={{
            background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={3.2} />
        </button>
      </div>
      <div className="p-2 pt-3">
        <h4 className="font-display text-xs font-bold text-[color:oklch(0.25_0.05_85)] truncate">
          {product.name || "Untitled"}
        </h4>
        <p className="text-[9px] text-[color:oklch(0.45_0.08_85)] truncate">{product.tagline}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="font-display text-sm text-gold-gradient font-bold">
            ₹{product.price.toLocaleString()}
          </span>
          {product.mrp > product.price && (
            <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] line-through">
              ₹{product.mrp.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 mt-0.5">
          <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
          <span className="text-[9px] font-bold">{product.rating}</span>
          <span className="text-[9px] text-[color:oklch(0.55_0.10_82)]">({product.reviews})</span>
        </div>
      </div>
    </article>
  );
}

function FlyImage({ fly }: { fly: FlyEffect }) {
  const dx = fly.to.left + fly.to.width / 2 - (fly.from.left + fly.from.width / 2);
  const dy = fly.to.top + fly.to.height / 2 - (fly.from.top + fly.from.height / 2);

  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{
        left: fly.from.left,
        top: fly.from.top,
        width: fly.from.width,
        height: fly.from.height,
        ["--dx" as never]: `${dx}px`,
        ["--dy" as never]: `${dy}px`,
        animation: "fly-to-cart 0.85s cubic-bezier(0.5, 0, 0.75, 0) forwards",
      }}
    >
      <img
        src={fly.src}
        alt=""
        className="h-full w-full object-cover rounded-2xl border-2 border-[#d4af37] shadow-2xl"
      />
    </div>
  );
}
