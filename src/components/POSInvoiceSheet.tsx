import { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Plus,
  Minus,
  Edit3,
  Pause,
  UserPlus,
  Printer,
  MessageCircle,
  ImagePlus,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";

export type CartLine = {
  product: EditorProduct;
  qty: number;
  /** Editable per-line override of price */
  priceOverride?: number;
};

export type HeldBill = {
  id: string;
  customer: { name: string; phone: string };
  cart: CartLine[];
  discountPct: number;
  taxPct: number;
  createdAt: number;
};

type Props = {
  products: EditorProduct[];
  initialCart: CartLine[];
  onCartChange: (lines: CartLine[]) => void;
  onClose: () => void;
};

type PayMode = "cash" | "online" | "upi";

export function POSInvoiceSheet({ products, initialCart, onCartChange, onClose }: Props) {
  const [cart, setCart] = useState<CartLine[]>(initialCart);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(5);
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [activeHeldId, setActiveHeldId] = useState<string | null>(null);
  const [done, setDone] = useState<null | { invoice: string; total: number }>(null);
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    onCartChange(cart);
  }, [cart, onCartChange]);

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + (l.priceOverride ?? l.product.price) * l.qty, 0),
    [cart],
  );
  const discountAmt = (subtotal * discountPct) / 100;
  const taxAmt = ((subtotal - discountAmt) * taxPct) / 100;
  const total = Math.max(0, subtotal - discountAmt + taxAmt);

  // recommended = products NOT in cart, top 6
  const recommended = useMemo(() => {
    const inCart = new Set(cart.map((l) => l.product.id));
    return products.filter((p) => !inCart.has(p.id)).slice(0, 8);
  }, [products, cart]);

  const addLine = (p: EditorProduct) => {
    setCart((prev) => {
      const ex = prev.find((l) => l.product.id === p.id);
      if (ex) return prev.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const setQty = (id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product.id !== id)
        : prev.map((l) => (l.product.id === id ? { ...l, qty } : l)),
    );
  };

  const setLinePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, priceOverride: price } : l)));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.product.id !== id));

  const resetForm = () => {
    setCart([]);
    setCustomer({ name: "", phone: "" });
    setDiscountPct(0);
    setTaxPct(5);
    setPayMode("cash");
    setActiveHeldId(null);
  };

  const holdCurrent = () => {
    if (!cart.length && !customer.name) return;
    const id = activeHeldId ?? `hold-${Date.now()}`;
    const snapshot: HeldBill = {
      id,
      customer,
      cart,
      discountPct,
      taxPct,
      createdAt: Date.now(),
    };
    setHeld((prev) => {
      const without = prev.filter((h) => h.id !== id);
      return [snapshot, ...without];
    });
    resetForm();
  };

  const resumeHeld = (id: string) => {
    const h = held.find((x) => x.id === id);
    if (!h) return;
    // first park current if it has data and is not already this hold
    if ((cart.length || customer.name) && activeHeldId !== id) {
      holdCurrent();
    }
    setCart(h.cart);
    setCustomer(h.customer);
    setDiscountPct(h.discountPct);
    setTaxPct(h.taxPct);
    setActiveHeldId(id);
    setHeld((prev) => prev.filter((x) => x.id !== id));
  };

  const newBill = () => {
    if (cart.length || customer.name) holdCurrent();
    resetForm();
  };

  const submit = (sendVia?: "whatsapp" | "print") => {
    if (!cart.length || !customer.name) return;
    const invoice = "INV-" + Math.floor(100000 + Math.random() * 900000);
    setDone({ invoice, total });
    setCart([]);
    if (sendVia === "whatsapp" && customer.phone) {
      const msg = encodeURIComponent(
        `Hi ${customer.name}, your invoice ${invoice} for ₹${total.toFixed(0)} is ready. Thank you for shopping at Ashhu's Dukan.`,
      );
      const phone = customer.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    } else if (sendVia === "print") {
      window.print();
    }
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

        {/* Header */}
        <div className="px-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ POS Invoice ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">
              {done ? "Invoice Ready" : activeHeldId ? "Resumed Bill" : "Create Invoice"}
            </h3>
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
          <DoneView
            invoice={done.invoice}
            total={done.total}
            customer={customer}
            payMode={payMode}
            onClose={onClose}
            onPrint={() => window.print()}
            onWhatsApp={() => {
              if (!customer.phone) return;
              const msg = encodeURIComponent(
                `Hi ${customer.name}, your invoice ${done.invoice} for ₹${done.total.toFixed(0)} is ready.`,
              );
              window.open(`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
            }}
          />
        ) : (
          <>
            {/* Held bills strip + new bill */}
            {(held.length > 0 || cart.length > 0 || customer.name) && (
              <div className="px-5 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={newBill}
                  className="flex-shrink-0 h-9 pl-2 pr-3 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[#d4af37] flex items-center gap-1.5 text-[11px] font-display font-bold text-[color:oklch(0.25_0.05_85)] shadow-sm active:scale-95"
                >
                  <span className="h-6 w-6 rounded-full grid place-items-center bg-white shadow-inner">
                    <UserPlus className="h-3.5 w-3.5 text-[#92400e]" />
                  </span>
                  New
                </button>

                {held.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => resumeHeld(h.id)}
                    className="flex-shrink-0 h-9 px-3 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] flex items-center gap-1.5 text-[11px] font-bold text-[color:oklch(0.42_0.10_82)] active:scale-95"
                    title={`Resume ${h.customer.name || "Walk-in"}`}
                  >
                    <Pause className="h-3 w-3" />
                    {h.customer.name || "Walk-in"}
                    <span className="text-[9px] text-[color:oklch(0.55_0.10_82)]">
                      · {h.cart.reduce((s, l) => s + l.qty, 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {/* Customer */}
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Customer Name"
                  value={customer.name}
                  onChange={(v) => setCustomer({ ...customer, name: v })}
                  placeholder="Aarav K."
                />
                <Field
                  label="Phone"
                  value={customer.phone}
                  onChange={(v) => setCustomer({ ...customer, phone: v })}
                  placeholder="98xxxxxx"
                  type="tel"
                />
              </div>

              {/* Tap to add */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
                  Tap to add
                </p>
                <div className="mt-1 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                  {products.map((p) => (
                    <ProductChip key={p.id} product={p} onAdd={() => addLine(p)} />
                  ))}
                </div>
              </div>

              {/* Cart lines with image + editable price */}
              <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2">
                {cart.length === 0 ? (
                  <p className="text-[11px] text-center py-4 text-[color:oklch(0.55_0.10_82)] italic">
                    No items yet · tap a product above
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cart.map((l) => {
                      const price = l.priceOverride ?? l.product.price;
                      const isEditing = editingPriceFor === l.product.id;
                      return (
                        <li
                          key={l.product.id}
                          className="flex items-center gap-2.5 p-1.5 rounded-xl bg-gradient-to-r from-[#fffaeb] to-white border border-[color:oklch(0.78_0.14_82/0.25)]"
                        >
                          {/* image */}
                          <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 border border-[color:oklch(0.78_0.14_82/0.4)] bg-[#fff8dc] grid place-items-center">
                            {l.product.image ? (
                              <img
                                src={l.product.image}
                                alt={l.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImagePlus className="h-5 w-5 text-[#d4af37]" />
                            )}
                          </div>

                          {/* details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-display font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                              {l.product.name}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={price}
                                  autoFocus
                                  onBlur={(e) => {
                                    setLinePrice(l.product.id, Number(e.target.value) || 0);
                                    setEditingPriceFor(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setLinePrice(
                                        l.product.id,
                                        Number((e.target as HTMLInputElement).value) || 0,
                                      );
                                      setEditingPriceFor(null);
                                    }
                                  }}
                                  className="w-16 text-[11px] px-1.5 py-0.5 rounded border border-[#d4af37] outline-none bg-white"
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingPriceFor(l.product.id)}
                                  className="inline-flex items-center gap-1 text-[11px] text-[color:oklch(0.42_0.10_82)] font-bold underline decoration-dotted underline-offset-2"
                                >
                                  ₹{price.toLocaleString()}
                                  <Edit3 className="h-2.5 w-2.5" />
                                </button>
                              )}
                              {l.priceOverride !== undefined &&
                                l.priceOverride !== l.product.price && (
                                  <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] line-through">
                                    ₹{l.product.price}
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* qty */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setQty(l.product.id, l.qty - 1)}
                              className="h-7 w-7 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center active:scale-90"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold">{l.qty}</span>
                            <button
                              onClick={() => setQty(l.product.id, l.qty + 1)}
                              className="h-7 w-7 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[#d4af37] grid place-items-center active:scale-90"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* line total + delete */}
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-display text-[12px] font-bold text-gold-gradient">
                              ₹{(price * l.qty).toLocaleString()}
                            </span>
                            <button
                              onClick={() => removeLine(l.product.id)}
                              className="text-[color:oklch(0.55_0.10_82)] active:scale-90"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Discount + Tax with steppers */}
              <div className="grid grid-cols-2 gap-2">
                <Stepper
                  label="Discount %"
                  value={discountPct}
                  onChange={setDiscountPct}
                  step={5}
                  min={0}
                  max={90}
                  tone="rose"
                />
                <Stepper
                  label="Tax / GST %"
                  value={taxPct}
                  onChange={setTaxPct}
                  step={1}
                  min={0}
                  max={28}
                  tone="gold"
                />
              </div>

              {/* Payment mode */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
                  Payment Mode
                </p>
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
                      style={
                        payMode === m
                          ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" }
                          : undefined
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-2xl bg-gradient-to-b from-[#fff8dc] to-white border border-[color:oklch(0.78_0.14_82/0.5)] p-3 text-sm space-y-1">
                <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
                <Row label={`Discount (${discountPct}%)`} value={`-₹${discountAmt.toFixed(0)}`} />
                <Row label={`Tax (${taxPct}%)`} value={`+₹${taxAmt.toFixed(0)}`} />
                <div className="border-t border-dashed border-[color:oklch(0.78_0.14_82/0.5)] pt-1 mt-1 flex items-center justify-between">
                  <span className="font-display font-bold text-[color:oklch(0.25_0.05_85)]">
                    Total
                  </span>
                  <span className="font-display font-bold text-lg text-gold-gradient">
                    ₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Recommended */}
              {recommended.length > 0 && cart.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-[#d4af37]" />
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
                      Recommended for this bill
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                    {recommended.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addLine(p)}
                        className="flex-shrink-0 w-[88px] rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] overflow-hidden active:scale-95 shadow-sm relative"
                      >
                        {p.image ? (
                          <img src={p.image} alt="" className="h-14 w-full object-cover" />
                        ) : (
                          <div className="h-14 w-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center">
                            <ImagePlus className="h-5 w-5 text-[#d4af37]" />
                          </div>
                        )}
                        <div className="p-1.5">
                          <p className="text-[10px] font-bold truncate">{p.name}</p>
                          <p className="text-[10px] text-gold-gradient font-bold">₹{p.price}</p>
                        </div>
                        <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center shadow border border-white">
                          <Plus className="h-3 w-3 text-[#92400e]" strokeWidth={3} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)] space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={holdCurrent}
                  disabled={!cart.length}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] font-display font-bold text-xs text-[color:oklch(0.42_0.10_82)] disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Hold Bill
                </button>
                <button
                  onClick={() => submit("whatsapp")}
                  disabled={!cart.length || !customer.name || !customer.phone}
                  className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white font-display font-bold text-xs disabled:opacity-40 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={() => submit("print")}
                  disabled={!cart.length || !customer.name}
                  className="flex-1 py-2.5 rounded-xl bg-[color:oklch(0.30_0.05_85)] text-white font-display font-bold text-xs disabled:opacity-40 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
              <button
                onClick={() => submit()}
                disabled={!cart.length || !customer.name}
                className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-base text-[color:oklch(0.18_0.06_18)] shadow-gold-glow disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
                }}
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

function ProductChip({ product, onAdd }: { product: EditorProduct; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex-shrink-0 w-24 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] overflow-hidden active:scale-95 shadow-sm relative"
    >
      {product.image ? (
        <img src={product.image} alt="" className="h-16 w-full object-cover" />
      ) : (
        <div className="h-16 w-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center">
          <ImagePlus className="h-5 w-5 text-[#d4af37]" />
        </div>
      )}
      <div className="p-1.5">
        <p className="text-[10px] font-bold truncate">{product.name}</p>
        <p className="text-[10px] text-gold-gradient font-bold">₹{product.price}</p>
      </div>
      <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white/95 grid place-items-center shadow">
        <Plus className="h-3 w-3 text-[#92400e]" strokeWidth={3} />
      </span>
    </button>
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
        inputMode={type === "number" ? "numeric" : type === "tel" ? "tel" : undefined}
        className="mt-1 w-full rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2 text-sm outline-none focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.2)] transition"
      />
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  tone,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  tone: "gold" | "rose";
}) {
  const accent =
    tone === "gold"
      ? "from-[#fff8dc] to-[#f5d97a] border-[#d4af37]"
      : "from-[#fde7eb] to-[#f9c4cc] border-[#e11d48]";
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
        {label}
      </label>
      <div
        className={`mt-1 flex items-center justify-between rounded-xl bg-gradient-to-br ${accent} border px-1 py-1 shadow-sm`}
      >
        <button
          onClick={() => onChange(clamp(value - step))}
          className="h-7 w-7 rounded-lg bg-white grid place-items-center active:scale-90 shadow-sm"
          aria-label="decrease"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          inputMode="numeric"
          className="w-12 text-center bg-transparent text-sm font-display font-bold outline-none"
        />
        <button
          onClick={() => onChange(clamp(value + step))}
          className="h-7 w-7 rounded-lg bg-white grid place-items-center active:scale-90 shadow-sm"
          aria-label="increase"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
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

function DoneView({
  invoice,
  total,
  customer,
  payMode,
  onClose,
  onPrint,
  onWhatsApp,
}: {
  invoice: string;
  total: number;
  customer: { name: string; phone: string };
  payMode: PayMode;
  onClose: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 text-center">
      <div
        className="mx-auto h-16 w-16 rounded-full grid place-items-center text-white shadow-gold-glow"
        style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>
      <h4 className="mt-3 font-display text-xl text-gold-gradient font-bold">Invoice Created</h4>
      <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-1">
        {invoice} · {customer.name}
      </p>
      <div className="mt-4 mx-auto max-w-[280px] rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-4 text-left shadow">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)]">
          Total
        </p>
        <p className="font-display text-3xl text-gold-gradient font-bold">
          ₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-[color:oklch(0.45_0.08_85)] mt-1">
          Payment: {payMode.toUpperCase()}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onWhatsApp}
          disabled={!customer.phone}
          className="py-2.5 rounded-xl bg-[#25D366] text-white font-display font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp PDF
        </button>
        <button
          onClick={onPrint}
          className="py-2.5 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] font-display font-bold text-sm text-[color:oklch(0.42_0.10_82)] flex items-center justify-center gap-1.5"
        >
          <Printer className="h-4 w-4" /> Thermal Print
        </button>
      </div>
      <button
        onClick={onClose}
        className="btn-3d mt-3 w-full py-2.5 rounded-xl font-display font-bold text-sm text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
        style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
      >
        Done
      </button>
    </div>
  );
}
