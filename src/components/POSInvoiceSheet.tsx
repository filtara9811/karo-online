import { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Plus,
  Minus,
  Edit3,
  Pause,
  Printer,
  ImagePlus,
  Trash2,
  Sparkles,
  UserPlus,
  ChevronDown,
  Store,
  User,
} from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";
import { CustomerPickerSheet, type Customer } from "@/components/CustomerPickerSheet";
import { PaymentModeSheet, type PayMode } from "@/components/PaymentModeSheet";
import { PrintOptionsSheet } from "@/components/PrintOptionsSheet";

export type CartLine = {
  product: EditorProduct;
  qty: number;
  /** Editable per-line override of price */
  priceOverride?: number;
};

export type HeldBill = {
  id: string;
  customer: Customer | null;
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

const PAY_LABEL: Record<PayMode, string> = {
  cash: "Cash",
  upi: "UPI / QR",
  online: "Online Pay",
  "card-credit": "Credit Card",
  "card-debit": "Debit Card",
};

export function POSInvoiceSheet({ products, initialCart, onCartChange, onClose }: Props) {
  const [cart, setCart] = useState<CartLine[]>(initialCart);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(5);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [activeHeldId, setActiveHeldId] = useState<string | null>(null);
  const [done, setDone] = useState<null | { invoice: string; total: number }>(null);
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);

  // sub sheets
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [showPrintSheet, setShowPrintSheet] = useState(false);

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
  const total = Math.max(0, subtotal - discountAmt + taxAmt + deliveryFee);

  // recommended = products NOT in cart, top 8
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
    setCustomer(null);
    setDiscountPct(0);
    setTaxPct(5);
    setDeliveryFee(0);
    setPayMode("cash");
    setActiveHeldId(null);
  };

  const holdCurrent = () => {
    if (!cart.length && !customer) return;
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
    if ((cart.length || customer) && activeHeldId !== id) {
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
    if (cart.length || customer) holdCurrent();
    resetForm();
  };

  const sendVia = (mode: "whatsapp" | "thermal" | "email" | "pdf") => {
    if (!cart.length) return;
    const invoice = "INV-" + Math.floor(100000 + Math.random() * 900000);
    if (mode === "whatsapp" && customer?.phone) {
      const msg = encodeURIComponent(
        `Hi ${customer.name}, your invoice ${invoice} for ₹${total.toFixed(0)} from Ashhu's Digital Shop is ready. Thank you!`,
      );
      window.open(`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    } else if (mode === "thermal" || mode === "pdf") {
      window.print();
    }
  };

  const generate = () => {
    if (!cart.length) return;
    const invoice = "INV-" + Math.floor(100000 + Math.random() * 900000);
    setDone({ invoice, total });
    setCart([]);
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

        {/* === Logo + Shop Name Header === */}
        <div className="px-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="h-10 w-10 rounded-full grid place-items-center shadow-gold-glow border-2 border-white flex-shrink-0"
              style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)" }}
            >
              <Store className="h-5 w-5 text-[color:oklch(0.18_0.06_18)]" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
                ✦ Tax Invoice ✦
              </p>
              <h3 className="font-display text-base text-gold-gradient font-bold leading-tight truncate">
                Ashhu's Digital Shop
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90 flex-shrink-0"
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
            onPrint={() => setShowPrintSheet(true)}
          />
        ) : (
          <>
            {/* Held bills strip */}
            {(held.length > 0 || cart.length > 0 || customer) && (
              <div className="px-5 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={newBill}
                  className="flex-shrink-0 h-8 pl-1.5 pr-2.5 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[#d4af37] flex items-center gap-1 text-[10px] font-display font-bold text-[color:oklch(0.25_0.05_85)] shadow-sm active:scale-95"
                >
                  <span className="h-5 w-5 rounded-full grid place-items-center bg-white">
                    <UserPlus className="h-3 w-3 text-[#92400e]" />
                  </span>
                  New
                </button>
                {held.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => resumeHeld(h.id)}
                    className="flex-shrink-0 h-8 px-2.5 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] flex items-center gap-1 text-[10px] font-bold text-[color:oklch(0.42_0.10_82)] active:scale-95"
                  >
                    <Pause className="h-2.5 w-2.5" />
                    {h.customer?.name || "Walk-in"} · {h.cart.reduce((s, l) => s + l.qty, 0)}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {/* === Invoice items === */}
              <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2">
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[12px] text-[color:oklch(0.55_0.10_82)] italic">
                      No items in invoice yet
                    </p>
                    <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] mt-1">
                      Tap any product from the recommended list below to add
                    </p>
                  </div>
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

              {/* === Discount + Tax + Delivery steppers === */}
              <div className="grid grid-cols-3 gap-2">
                <Stepper
                  label="Disc %"
                  value={discountPct}
                  onChange={setDiscountPct}
                  step={5}
                  min={0}
                  max={90}
                  tone="rose"
                />
                <Stepper
                  label="GST %"
                  value={taxPct}
                  onChange={setTaxPct}
                  step={1}
                  min={0}
                  max={28}
                  tone="gold"
                />
                <Stepper
                  label="Deliv ₹"
                  value={deliveryFee}
                  onChange={setDeliveryFee}
                  step={10}
                  min={0}
                  max={2000}
                  tone="gold"
                />
              </div>

              {/* === Totals === */}
              <div className="rounded-2xl bg-gradient-to-b from-[#fff8dc] to-white border border-[color:oklch(0.78_0.14_82/0.5)] p-3 text-sm space-y-1">
                <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
                {discountAmt > 0 && (
                  <Row label={`Discount (${discountPct}%)`} value={`-₹${discountAmt.toFixed(0)}`} />
                )}
                {taxAmt > 0 && (
                  <Row label={`GST (${taxPct}%)`} value={`+₹${taxAmt.toFixed(0)}`} />
                )}
                {deliveryFee > 0 && <Row label="Delivery" value={`+₹${deliveryFee}`} />}
                <div className="border-t border-dashed border-[color:oklch(0.78_0.14_82/0.5)] pt-1 mt-1 flex items-center justify-between">
                  <span className="font-display font-bold text-[color:oklch(0.25_0.05_85)]">
                    Total
                  </span>
                  <span className="font-display font-bold text-lg text-gold-gradient">
                    ₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* === Customer add button (just below subtotal) === */}
              <button
                onClick={() => setShowCustomerSheet(true)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] p-3 active:scale-[0.99] transition"
              >
                <span
                  className="h-10 w-10 rounded-full grid place-items-center text-white shadow-md flex-shrink-0"
                  style={{
                    background: customer
                      ? "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)"
                      : "linear-gradient(180deg, oklch(0.45 0.18 320), oklch(0.30 0.15 320))",
                  }}
                >
                  {customer ? <User className="h-5 w-5" /> : <Plus className="h-5 w-5" strokeWidth={3} />}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  {customer ? (
                    <>
                      <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                        {customer.name}
                      </p>
                      <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] truncate">
                        {customer.phone} · {customer.type ?? "retail"} · tap to change
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-sm font-bold text-[color:oklch(0.42_0.10_82)]">
                        + Add Customer
                      </p>
                      <p className="text-[10px] text-[color:oklch(0.55_0.10_82)]">
                        Pick saved or add new (name, phone, GST...)
                      </p>
                    </>
                  )}
                </div>
              </button>

              {/* === Recommended (just below subtotal/customer area) === */}
              {recommended.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-[#d4af37]" />
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
                      Recommended · tap to add
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

            {/* === Combined footer button: Pay-mode dropdown + Pay Now + Print === */}
            <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">
              <div className="flex items-stretch gap-2 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-1.5 shadow-md">
                {/* Left: pay mode dropdown */}
                <button
                  onClick={() => setShowPaySheet(true)}
                  className="flex-1 flex items-center justify-between gap-1 px-3 py-2 rounded-xl bg-[#fffaeb] active:scale-95"
                >
                  <span className="text-left">
                    <span className="block text-[8px] uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] font-bold">
                      Pay via
                    </span>
                    <span className="block font-display text-[12px] font-bold text-[color:oklch(0.25_0.05_85)] truncate max-w-[90px]">
                      {PAY_LABEL[payMode]}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] flex-shrink-0" />
                </button>

                {/* Center: Pay Now */}
                <button
                  onClick={generate}
                  disabled={!cart.length}
                  className="btn-3d flex-[1.4] py-2 rounded-xl font-display font-bold text-[13px] text-[color:oklch(0.18_0.06_18)] shadow-gold-glow disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
                  }}
                >
                  <span className="leading-none">Pay Now</span>
                  <span className="text-[10px] font-medium opacity-80 mt-0.5">
                    ₹{total.toFixed(0)}
                  </span>
                </button>

                {/* Right: Print icon */}
                <button
                  onClick={() => setShowPrintSheet(true)}
                  disabled={!cart.length}
                  aria-label="Print or send"
                  className="h-auto w-11 rounded-xl bg-[color:oklch(0.30_0.05_85)] grid place-items-center text-white active:scale-95 disabled:opacity-40"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>

              {/* Hold link */}
              {cart.length > 0 && (
                <button
                  onClick={holdCurrent}
                  className="mt-2 mx-auto block text-[10px] font-bold uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] underline"
                >
                  Hold this bill
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* sub-sheets */}
      {showCustomerSheet && (
        <CustomerPickerSheet
          current={customer}
          onPick={(c) => {
            setCustomer(c);
            setShowCustomerSheet(false);
          }}
          onClose={() => setShowCustomerSheet(false)}
        />
      )}
      {showPaySheet && (
        <PaymentModeSheet
          current={payMode}
          onPick={setPayMode}
          onClose={() => setShowPaySheet(false)}
        />
      )}
      {showPrintSheet && (
        <PrintOptionsSheet onPick={sendVia} onClose={() => setShowPrintSheet(false)} />
      )}
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
      <label className="text-[9px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">
        {label}
      </label>
      <div
        className={`mt-1 flex items-center justify-between rounded-xl bg-gradient-to-br ${accent} border px-1 py-1 shadow-sm`}
      >
        <button
          onClick={() => onChange(clamp(value - step))}
          className="h-6 w-6 rounded-lg bg-white grid place-items-center active:scale-90 shadow-sm"
          aria-label="decrease"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          inputMode="numeric"
          className="w-10 text-center bg-transparent text-xs font-display font-bold outline-none"
        />
        <button
          onClick={() => onChange(clamp(value + step))}
          className="h-6 w-6 rounded-lg bg-white grid place-items-center active:scale-90 shadow-sm"
          aria-label="increase"
        >
          <Plus className="h-3 w-3" />
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
}: {
  invoice: string;
  total: number;
  customer: Customer | null;
  payMode: PayMode;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 text-center">
      <div
        className="mx-auto h-16 w-16 rounded-full grid place-items-center text-white shadow-gold-glow"
        style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>
      <h4 className="mt-3 font-display text-xl text-gold-gradient font-bold">Invoice Generated</h4>
      <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-1">
        {invoice}
        {customer ? ` · ${customer.name}` : ""}
      </p>
      <div className="mt-4 mx-auto max-w-[280px] rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-4 text-left shadow">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)]">
          Total
        </p>
        <p className="font-display text-3xl text-gold-gradient font-bold">
          ₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-[color:oklch(0.45_0.08_85)] mt-1">
          Payment: {PAY_LABEL[payMode]}
        </p>
      </div>
      <button
        onClick={onPrint}
        className="mt-4 w-full py-2.5 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] font-display font-bold text-sm text-[color:oklch(0.42_0.10_82)] flex items-center justify-center gap-1.5 active:scale-95"
      >
        <Printer className="h-4 w-4" /> Send / Print Invoice
      </button>
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
