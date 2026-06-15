import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  X,
  Plus,
  Receipt,
  Star,
  Edit3,
  ImagePlus,
  ShoppingBasket,
  ScanBarcode,
  Share2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { buildShopDeepLink, shareLink } from "@/lib/share";
import { toast } from "sonner";
import { PRODUCTS } from "@/lib/products";
import { ProductEditor, type EditorProduct } from "@/components/ProductEditor";
import { ShopMediaUploader } from "@/components/ShopMediaUploader";
import { ShopStatsTicker } from "@/components/ShopStatsTicker";
import { ShopSearchBar } from "@/components/ShopSearchBar";
import { ShopLiveToggle } from "@/components/ShopLiveToggle";
import { BannerCarousel } from "@/components/BannerCarousel";
import { TopProductsMarquee } from "@/components/TopProductsMarquee";
import { CategorySections } from "@/components/CategorySections";
import {
  QuickAddVariationSheet,
  type PricingMode,
  type QuickAddSelection,
} from "@/components/QuickAddVariationSheet";
import { BarcodeScannerOverlay } from "@/components/BarcodeScannerOverlay";
import { POSInvoiceSheet, type CartLine } from "@/components/POSInvoiceSheet";
import { VendorAuthGate } from "@/components/VendorAuthGate";

export const Route = createFileRoute("/vendor/shop")({
  head: () => ({
    meta: [
      { title: "My Digital Dukan — Vendor" },
      { name: "description", content: "Manage your digital shop products and create POS invoices." },
    ],
  }),
  component: () => (<VendorAuthGate><VendorShop /></VendorAuthGate>),
});

type VendorProduct = EditorProduct;
type FlyEffect = { id: number; src: string; from: DOMRect; to: DOMRect };

function VendorShop() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleShareShop = async () => {
    const id = user?.id ?? "shop";
    const url = buildShopDeepLink(id);
    const r = await shareLink({
      title: "My Digital Dukan",
      text: "Visit my digital dukan on Karo Online",
      url,
    });
    if (r === "copied") toast.success("Shop link copied to clipboard");
    if (r === "failed") toast.error("Could not share link");
  };

  const [items, setItems] = useState<VendorProduct[]>(
    PRODUCTS.map((p) => ({ ...p, theme: "classic" }))
  );
  const [editing, setEditing] = useState<VendorProduct | null>(null);
  const [posOpen, setPosOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [search, setSearch] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("retail");
  const [scanOpen, setScanOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState<{ product: VendorProduct; sourceEl: HTMLElement | null } | null>(null);

  // POS billing cart
  const [cart, setCart] = useState<CartLine[]>([]);
  const [flying, setFlying] = useState<FlyEffect[]>([]);
  const basketRef = useRef<HTMLDivElement | null>(null);

  // long-press for tile edit
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

  const flyAndAdd = (
    p: VendorProduct,
    fromEl: HTMLElement | null,
    line: CartLine
  ) => {
    const target = basketRef.current;
    if (target && p.image && fromEl) {
      const from = fromEl.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setFlying((prev) => [...prev, { id, src: p.image, from, to }]);
      setTimeout(() => setFlying((prev) => prev.filter((f) => f.id !== id)), 850);
    }
    setCart((prev) => {
      const sameKey = (l: CartLine) =>
        l.product.id === line.product.id && l.priceOverride === line.priceOverride;
      const ex = prev.find(sameKey);
      if (ex) return prev.map((l) => (l === ex ? { ...l, qty: l.qty + line.qty } : l));
      return [...prev, line];
    });
  };

  // Quick-add entry — opens variation sheet if product has variations, else direct add
  const onQuickAdd = (p: VendorProduct, sourceEl: HTMLElement) => {
    const hasVariations =
      (p.variationsList && p.variationsList.length > 0) ||
      (p.variations && p.variations.length > 0);
    if (hasVariations) {
      setQuickAdd({ product: p, sourceEl });
    } else {
      const unit =
        pricingMode === "wholesale"
          ? p.wholesalePrice ??
            (p.buyingPrice ? Math.round(p.buyingPrice * 1.15) : Math.round(p.price * 0.85))
          : p.price;
      flyAndAdd(p, sourceEl, { product: p, qty: 1, priceOverride: unit });
    }
  };

  const confirmQuickAdd = (sel: QuickAddSelection) => {
    if (!quickAdd) return;
    const product = quickAdd.product;
    const enriched: VendorProduct = sel.variationLabel
      ? { ...product, name: `${product.name} · ${sel.variationLabel}` }
      : product;
    flyAndAdd(product, quickAdd.sourceEl, {
      product: enriched,
      qty: sel.qty,
      priceOverride: sel.unitPrice,
    });
    setQuickAdd(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.primaryCategory?.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Top products = first 6 by rating
  const topProducts = useMemo(
    () => [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6),
    [items]
  );

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce(
    (s, l) => s + (l.priceOverride ?? l.product.price) * l.qty,
    0
  );

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden pb-32 isolate"
      style={{
        background:
          "radial-gradient(ellipse at top, #f5f6f8 0%, transparent 55%), linear-gradient(160deg, #f5f6f8 0%, #f5f6f8 60%, #eef0f3 100%)",
      }}
    >
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />

      {/* Full-bleed cover hero with floating top controls */}
      <section className="relative">
        <ShopMediaUploader variant="hero" />

        {/* Top-left: Live toggle */}
        <div className="absolute top-3 left-3 z-30">
          <ShopLiveToggle />
        </div>

        {/* Top-right: Share + Invoice + Close (X) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <button
            onClick={handleShareShop}
            aria-label="Share my shop"
            className="h-9 px-3 grid grid-flow-col auto-cols-max items-center gap-1.5 rounded-full bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] border border-[color:oklch(0.78_0.14_82/0.7)] text-[color:oklch(0.20_0.05_60)] shadow-md active:scale-95 text-[11px] font-display font-bold italic"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            onClick={() => setPosOpen(true)}
            aria-label="Create Invoice"
            className="relative h-9 w-9 grid place-items-center rounded-full text-[color:oklch(0.20_0.01_260)] shadow-md active:scale-90"
            style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
          >
            <Receipt className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.72_0.01_260/0.5)] shadow-md active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.01_260)]" strokeWidth={2.6} />
          </button>
        </div>

        {/* Profile logo overhang — pokes below the cover */}
        <div className="absolute -bottom-7 left-4 z-30">
          <div className="h-14 w-14 rounded-full grid place-items-center bg-black border-4 border-white shadow-lg">
            <span className="text-white text-2xl">🏬</span>
          </div>
        </div>
      </section>

      <div className="max-w-md mx-auto px-4 pt-10 space-y-4">
        {/* Shop title — moved out of the old header */}
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ My Dukan ✦</p>
          <h1 className="font-display text-base text-silver-gradient leading-tight font-bold">
            Ashhu's Digital Shop
          </h1>
        </div>

        {/* Search */}
        <ShopSearchBar value={search} onChange={setSearch} />

        {/* Yesterday vs Today moving ticker */}
        <ShopStatsTicker />

        {/* Banners */}
        <BannerCarousel />

        {/* Pricing mode toggle */}
        <div className="flex items-center justify-between rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-1 shadow-sm">
          <ModePill
            active={pricingMode === "retail"}
            label="Retail Pricing"
            onClick={() => setPricingMode("retail")}
          />
          <ModePill
            active={pricingMode === "wholesale"}
            label="Wholesale Pricing"
            onClick={() => setPricingMode("wholesale")}
          />
        </div>

        {/* Top products marquee */}
        <TopProductsMarquee items={topProducts} onQuickAdd={onQuickAdd} />

        {/* Category sections */}
        <CategorySections
          items={filtered}
          onQuickAdd={onQuickAdd}
          onTileLongPress={(p) => setEditing(p)}
        />

        {/* Section: All products grid */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-display text-base text-silver-gradient font-bold">
              All Products <span className="font-light">| {filtered.length}</span>
            </h3>
            <button
              onClick={() => setAddingNew(true)}
              className="text-[10px] font-bold text-[color:oklch(0.42_0.01_260)] uppercase tracking-wider"
            >
              + Add New
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                onPressStart={() => onPressStart(p)}
                onPressEnd={onPressEnd}
                onQuickAdd={(el) => onQuickAdd(p, el)}
              />
            ))}

            {/* Add tile */}
            <button
              onClick={() => setAddingNew(true)}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[color:oklch(0.72_0.01_260/0.6)] grid place-items-center bg-white/60 active:scale-[0.97]"
            >
              <div className="flex flex-col items-center gap-1.5 text-[color:oklch(0.42_0.01_260)]">
                <span
                  className="h-10 w-10 rounded-full grid place-items-center text-white shadow-md"
                  style={{ background: "linear-gradient(180deg, #d8dde3, #a8acb3, #3f4750)" }}
                >
                  <ImagePlus className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-display font-bold">Add Product</span>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* === Floating 3-button bottom bar === */}
      {!posOpen && (
        <div
          className="fixed inset-x-0 z-40 pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
        >
          <div className="max-w-md mx-auto px-4">
            <div
              className="pointer-events-auto flex items-center gap-2 rounded-2xl px-2 py-2 border border-[color:oklch(0.72_0.01_260/0.6)] shadow-[0_10px_28px_-10px_rgba(212,175,55,0.6)]"
              style={{
                background: "linear-gradient(180deg, #f5f6f8, #f5f6f8)",
                animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              {/* Basket pill */}
              <button
                onClick={() => cartCount > 0 && setPosOpen(true)}
                disabled={cartCount === 0}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 active:scale-[0.97] disabled:opacity-60"
              >
                <span
                  ref={basketRef}
                  className="relative h-10 w-10 rounded-full grid place-items-center bg-white border-2 border-[#a8acb3] shadow-silver-glow"
                >
                  <ShoppingBasket className="h-4 w-4 text-[#3f4750]" strokeWidth={2.4} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-gradient-to-br from-[#d8dde3] via-[#a8acb3] to-[#3f4750] text-[9px] font-bold text-white grid place-items-center shadow">
                      {cartCount}
                    </span>
                  )}
                </span>
                <span className="text-left">
                  <span className="block font-display text-[11px] text-silver-gradient font-bold leading-tight">
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                  <span className="block text-[9px] text-[color:oklch(0.45_0.01_260)] tabular-nums">
                    ₹{cartTotal.toLocaleString()}
                  </span>
                </span>
              </button>

              {/* Scan */}
              <button
                onClick={() => setScanOpen(true)}
                aria-label="Scan barcode"
                className="h-12 w-12 rounded-full grid place-items-center text-[color:oklch(0.13_0.06_18)] shadow-silver-glow border-2 border-white active:scale-90"
                style={{
                  background:
                    "linear-gradient(180deg, #f5f6f8, #d8dde3, #a8acb3, #3f4750)",
                }}
              >
                <ScanBarcode className="h-5 w-5" strokeWidth={2.4} />
              </button>

              {/* Bill Now */}
              <button
                onClick={() => setPosOpen(true)}
                disabled={cartCount === 0}
                className="flex-1 h-12 rounded-xl font-display font-bold text-[12px] text-[color:oklch(0.13_0.06_18)] shadow-silver-glow active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3, #3f4750)" }}
              >
                Bill Now →
              </button>
            </div>
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

      {/* Quick-add variation sheet */}
      {quickAdd && (
        <QuickAddVariationSheet
          product={quickAdd.product}
          defaultMode={pricingMode}
          onConfirm={confirmQuickAdd}
          onClose={() => setQuickAdd(null)}
        />
      )}

      {/* Barcode scanner overlay */}
      {scanOpen && (
        <BarcodeScannerOverlay
          products={items}
          onScan={(p) => {
            const unit =
              pricingMode === "wholesale"
                ? p.wholesalePrice ??
                  (p.buyingPrice
                    ? Math.round(p.buyingPrice * 1.15)
                    : Math.round(p.price * 0.85))
                : p.price;
            flyAndAdd(p, basketRef.current, {
              product: p,
              qty: 1,
              priceOverride: unit,
            });
          }}
          onClose={() => setScanOpen(false)}
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

function ModePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-xl text-[11px] font-display font-bold uppercase tracking-wider transition ${
        active
          ? "text-[color:oklch(0.20_0.01_260)] shadow"
          : "text-[color:oklch(0.55_0.10_82)]"
      }`}
      style={
        active
          ? { background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }
          : undefined
      }
    >
      {label}
    </button>
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
    minimal: "bg-[#f5f6f8]",
    bold: "bg-gradient-to-b from-white to-[#eef0f3]",
    luxe: "bg-gradient-to-b from-[#f5f6f8] to-[#eef0f3]",
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
      className={`relative aspect-[3/4] rounded-2xl overflow-hidden border border-[color:oklch(0.72_0.01_260/0.5)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] active:scale-[0.97] transition select-none ${themeStyles[t]}`}
      style={{ animation: "float-soft 6s ease-in-out infinite" }}
    >
      <div className="relative h-3/5 overflow-hidden">
        {product.image ? (
          <img ref={imgRef} src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div ref={fallbackRef} className="h-full w-full grid place-items-center bg-gradient-to-br from-[#f5f6f8] to-[#eef0f3]">
            <ImagePlus className="h-8 w-8 text-[#a8acb3]" />
          </div>
        )}
        {product.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[8px] font-bold text-[color:oklch(0.42_0.01_260)] uppercase tracking-wider shadow">
            {product.badge}
          </span>
        )}
        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/90 grid place-items-center shadow">
          <Edit3 className="h-3 w-3 text-[color:oklch(0.42_0.01_260)]" />
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const src = imgRef.current ?? fallbackRef.current;
            if (src) onQuickAdd(src);
          }}
          aria-label={`Add ${product.name} to billing`}
          className="absolute -bottom-3 right-2 h-9 w-9 rounded-full grid place-items-center text-[color:oklch(0.13_0.06_18)] shadow-silver-glow border-2 border-white active:scale-90 transition"
          style={{
            background: "linear-gradient(180deg, #f5f6f8, #d8dde3, #a8acb3, #3f4750)",
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={3.2} />
        </button>
      </div>
      <div className="p-2 pt-3">
        <h4 className="font-display text-xs font-bold text-[color:oklch(0.25_0.01_260)] truncate">
          {product.name || "Untitled"}
        </h4>
        <p className="text-[9px] text-[color:oklch(0.45_0.01_260)] truncate">{product.tagline}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="font-display text-sm text-silver-gradient font-bold">
            ₹{product.price.toLocaleString()}
          </span>
          {product.mrp > product.price && (
            <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] line-through">
              ₹{product.mrp.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 mt-0.5">
          <Star className="h-2.5 w-2.5 fill-[#a8acb3] text-[#a8acb3]" />
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
        className="h-full w-full object-cover rounded-2xl border-2 border-[#a8acb3] shadow-2xl"
      />
    </div>
  );
}
