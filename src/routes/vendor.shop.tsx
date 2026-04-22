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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type ?? "text"}
        inputMode={type === "number" ? "numeric" : undefined}
        className="mt-1 w-full rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2 text-sm outline-none focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.2)] transition"
      />
    </div>
  );
}

function POSSheet({
  products,
  initialCart,
  onCartChange,
  onClose,
}: {
  products: VendorProduct[];
  initialCart: CartLine[];
  onCartChange: (lines: CartLine[]) => void;
  onClose: () => void;
}) {
  const [cart, setCart] = useState<CartLine[]>(initialCart);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);
  const [payMode, setPayMode] = useState<"cash" | "online" | "upi">("cash");
  const [done, setDone] = useState<null | { invoice: string; total: number }>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    onCartChange(cart);
  }, [cart, onCartChange]);

  const addLine = (p: VendorProduct) => {
    setCart((prev) => {
      const ex = prev.find((l) => l.product.id === p.id);
      if (ex) return prev.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const setQty = (id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => (l.product.id === id ? { ...l, qty } : l))
    );
  };

  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discountAmt = (subtotal * discount) / 100;
  const taxAmt = ((subtotal - discountAmt) * taxRate) / 100;
  const total = Math.max(0, subtotal - discountAmt + taxAmt);

  const submit = () => {
    if (!cart.length || !customer.name) return;
    const invoice = "INV-" + Math.floor(100000 + Math.random() * 900000);
    setDone({ invoice, total });
    setCart([]);
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[94vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ POS Invoice ✦</p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">Create Invoice</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        {done ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-full grid place-items-center text-white shadow-gold-glow"
              style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}>
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <h4 className="mt-3 font-display text-xl text-gold-gradient font-bold">Invoice Created</h4>
            <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-1">{done.invoice} · {customer.name}</p>
            <div className="mt-4 mx-auto max-w-[280px] rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-4 text-left shadow">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)]">Total</p>
              <p className="font-display text-3xl text-gold-gradient font-bold">₹{done.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-[color:oklch(0.45_0.08_85)] mt-1">Payment: {payMode.toUpperCase()}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={printInvoice}
                className="flex-1 py-2.5 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] font-display font-bold text-sm text-[color:oklch(0.42_0.10_82)]"
              >
                Print / PDF
              </button>
              <button
                onClick={onClose}
                className="btn-3d flex-1 py-2.5 rounded-xl font-display font-bold text-sm text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
                style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {/* Customer */}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Customer Name" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} placeholder="Aarav K." />
                <Field label="Phone" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} placeholder="98xxxxxx" type="tel" />
              </div>

              {/* Add products grid */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">Tap to add</p>
                <div className="mt-1 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addLine(p)}
                      className="flex-shrink-0 w-24 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] overflow-hidden active:scale-95 shadow-sm"
                    >
                      {p.image && <img src={p.image} alt="" className="h-16 w-full object-cover" />}
                      <div className="p-1.5">
                        <p className="text-[10px] font-bold truncate">{p.name}</p>
                        <p className="text-[10px] text-gold-gradient font-bold">₹{p.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart lines */}
              <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2">
                {cart.length === 0 ? (
                  <p className="text-[11px] text-center py-3 text-[color:oklch(0.55_0.10_82)] italic">
                    No items yet · tap a product above
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {cart.map((l) => (
                      <li key={l.product.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate font-display font-bold text-[color:oklch(0.25_0.05_85)]">{l.product.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(l.product.id, l.qty - 1)} className="h-6 w-6 rounded-full bg-[color:oklch(0.97_0.02_85)] border border-[color:oklch(0.78_0.14_82/0.4)] grid place-items-center text-xs font-bold">−</button>
                          <span className="w-5 text-center text-xs font-bold">{l.qty}</span>
                          <button onClick={() => setQty(l.product.id, l.qty + 1)} className="h-6 w-6 rounded-full bg-[color:oklch(0.97_0.02_85)] border border-[color:oklch(0.78_0.14_82/0.4)] grid place-items-center text-xs font-bold">+</button>
                        </div>
                        <span className="w-16 text-right font-display font-bold text-gold-gradient">
                          ₹{(l.product.price * l.qty).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Discount + Tax */}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Discount %" value={String(discount)} onChange={(v) => setDiscount(Number(v) || 0)} type="number" />
                <Field label="Tax %" value={String(taxRate)} onChange={(v) => setTaxRate(Number(v) || 0)} type="number" />
              </div>

              {/* Payment mode */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">Payment Mode</p>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(["cash", "online", "upi"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayMode(m)}
                      className={`py-2 rounded-xl text-xs font-display font-bold border-2 transition uppercase ${
                        payMode === m
                          ? "text-[color:oklch(0.18_0.06_18)] border-[#d4af37] shadow-md"
                          : "text-[color:oklch(0.55_0.10_82)] border-[color:oklch(0.78_0.14_82/0.3)] bg-white"
                      }`}
                      style={payMode === m ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" } : undefined}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-2xl bg-gradient-to-b from-[#fff8dc] to-white border border-[color:oklch(0.78_0.14_82/0.5)] p-3 text-sm space-y-1">
                <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
                <Row label={`Discount (${discount}%)`} value={`-₹${discountAmt.toFixed(0)}`} />
                <Row label={`Tax (${taxRate}%)`} value={`+₹${taxAmt.toFixed(0)}`} />
                <div className="border-t border-dashed border-[color:oklch(0.78_0.14_82/0.5)] pt-1 mt-1 flex items-center justify-between">
                  <span className="font-display font-bold text-[color:oklch(0.25_0.05_85)]">Total</span>
                  <span className="font-display font-bold text-lg text-gold-gradient">₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">
              <button
                onClick={submit}
                disabled={!cart.length || !customer.name}
                className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-base text-[color:oklch(0.18_0.06_18)] shadow-gold-glow disabled:opacity-50"
                style={{ background: "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)" }}
              >
                Generate Invoice · ₹{total.toFixed(0)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:oklch(0.45_0.08_85)]">{label}</span>
      <span className="font-bold text-[color:oklch(0.25_0.05_85)]">{value}</span>
    </div>
  );
}
