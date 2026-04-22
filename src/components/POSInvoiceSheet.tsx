import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Check,
  Plus,
  Minus,
  Edit3,
  Pause,
  Printer,
  ImagePlus,
  Sparkles,
  UserPlus,
  ChevronDown,
  Store,
  User,
  Users,
  Percent,
  Truck,
  Receipt,
  Tag,
} from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";
import { CustomerPickerSheet, type Customer } from "@/components/CustomerPickerSheet";
import { PaymentModeSheet, type PayMode } from "@/components/PaymentModeSheet";
import { PrintOptionsSheet } from "@/components/PrintOptionsSheet";
import { ValuePickerSheet, type ValueMode } from "@/components/ValuePickerSheet";
import { CouponSheet, type Coupon } from "@/components/CouponSheet";
import { InvoiceImage } from "@/components/InvoiceImage";
import { captureInvoicePng, shareInvoicePng } from "@/lib/invoice-image";

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
  discountValue: number;
  discountMode: "pct-off" | "flat-off" | "pct-add";
  coupon: Coupon | null;
  taxPct: number;
  gstMode: "add" | "include";
  deliveryFee: number;
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

type PickerKind = null | "discount" | "gst" | "delivery" | "coupon";

/** Discount mode: percent off, flat ₹ off, or surcharge (rare) */
type DiscountMode = "pct-off" | "flat-off" | "pct-add";
/** GST mode: add GST on top, or include GST inside the subtotal */
type GstMode = "add" | "include";

const DISCOUNT_MODES: ValueMode[] = [
  { id: "pct-off", label: "% Off", unit: "%", sign: -1 },
  { id: "flat-off", label: "Flat ₹", unit: "₹", sign: -1 },
  { id: "pct-add", label: "% Add", unit: "%", sign: 1 },
];
const GST_MODES: ValueMode[] = [
  { id: "add", label: "Add GST", unit: "%", sign: 1 },
  { id: "include", label: "Inclusive", unit: "%", sign: -1 },
];

export function POSInvoiceSheet({ products, initialCart, onCartChange, onClose }: Props) {
  const [cart, setCart] = useState<CartLine[]>(initialCart);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discountValue, setDiscountValue] = useState(0); // raw positive value
  const [discountMode, setDiscountMode] = useState<DiscountMode>("pct-off");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [taxPct, setTaxPct] = useState(5);
  const [gstMode, setGstMode] = useState<GstMode>("add");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [activeHeldId, setActiveHeldId] = useState<string | null>(null);
  const [done, setDone] = useState<null | {
    invoice: string;
    trackingId: string;
    total: number;
    date: string;
  }>(null);
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);

  // sub sheets
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [showBillsSheet, setShowBillsSheet] = useState(false);
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [showPrintSheet, setShowPrintSheet] = useState(false);
  const [picker, setPicker] = useState<PickerKind>(null);

  // off-screen invoice capture target
  const invoiceImgRef = useRef<HTMLDivElement | null>(null);

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

  // Discount: combine slider value + active coupon
  const manualDiscount =
    discountMode === "pct-off"
      ? (subtotal * discountValue) / 100
      : discountMode === "flat-off"
        ? discountValue
        : -((subtotal * discountValue) / 100); // pct-add → adds (negative discount)
  const couponDiscount = coupon
    ? coupon.percent
      ? (subtotal * coupon.percent) / 100
      : (coupon.flat ?? 0)
    : 0;
  const discountAmt = Math.max(0, manualDiscount + couponDiscount);
  const surcharge = manualDiscount < 0 ? -manualDiscount : 0;

  // GST: add or include
  const taxableBase = Math.max(0, subtotal - discountAmt + surcharge);
  const taxAmt =
    gstMode === "add"
      ? (taxableBase * taxPct) / 100
      : -(taxableBase - taxableBase / (1 + taxPct / 100)); // included → shown as informational negative
  const total = Math.max(
    0,
    gstMode === "add"
      ? taxableBase + taxAmt + deliveryFee
      : taxableBase + deliveryFee, // inclusive: total stays as base
  );
  const discountPctLabel =
    discountMode === "flat-off"
      ? `₹${discountValue}`
      : `${discountValue}%${discountMode === "pct-add" ? " add" : ""}`;
  const taxLabel = `${taxPct}% ${gstMode === "add" ? "add" : "incl"}`;

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

  const resetForm = () => {
    setCart([]);
    setCustomer(null);
    setDiscountValue(0);
    setDiscountMode("pct-off");
    setCoupon(null);
    setTaxPct(5);
    setGstMode("add");
    setDeliveryFee(0);
    setPayMode("cash");
    setActiveHeldId(null);
  };

  const holdCurrent = () => {
    if (!cart.length && !customer) return null;
    const id = activeHeldId ?? `hold-${Date.now()}`;
    const snapshot: HeldBill = {
      id,
      customer,
      cart,
      discountValue,
      discountMode,
      coupon,
      taxPct,
      gstMode,
      deliveryFee,
      createdAt: Date.now(),
    };
    setHeld((prev) => {
      const without = prev.filter((h) => h.id !== id);
      return [snapshot, ...without];
    });
    return id;
  };

  const resumeHeld = (id: string) => {
    const h = held.find((x) => x.id === id);
    if (!h) return;
    if ((cart.length || customer) && activeHeldId !== id) {
      holdCurrent();
    }
    setCart(h.cart);
    setCustomer(h.customer);
    setDiscountValue(h.discountValue ?? 0);
    setDiscountMode(h.discountMode ?? "pct-off");
    setCoupon(h.coupon ?? null);
    setTaxPct(h.taxPct);
    setGstMode(h.gstMode ?? "add");
    setDeliveryFee(h.deliveryFee ?? 0);
    setActiveHeldId(id);
    setHeld((prev) => prev.filter((x) => x.id !== id));
    setShowBillsSheet(false);
  };

  const newBill = () => {
    if (cart.length || customer) holdCurrent();
    resetForm();
    setShowBillsSheet(false);
  };

  const formatDate = (d = new Date()) =>
    `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getFullYear()} · ${d
      .getHours()
      .toString()
      .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  const sendVia = async (mode: "whatsapp" | "thermal" | "email" | "pdf") => {
    if (!cart.length && !done) return;
    const invoice = done?.invoice ?? "INV-" + Math.floor(100000 + Math.random() * 900000);
    const tracking = done?.trackingId ?? "TRK-" + Math.random().toString(36).slice(2, 9).toUpperCase();
    if (mode === "whatsapp") {
      const el = invoiceImgRef.current;
      const phone = customer?.phone ?? "";
      const caption = `Hi ${customer?.name ?? "there"}, here is your invoice ${invoice} (Tracking #${tracking}) for ₹${total.toFixed(0)} from Ashhu's Digital Shop. Thank you!`;
      if (el) {
        const png = await captureInvoicePng(el);
        await shareInvoicePng(png, `${invoice}.png`, { phone, caption });
      } else if (phone) {
        window.open(
          `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(caption)}`,
          "_blank",
        );
      }
    } else if (mode === "thermal" || mode === "pdf") {
      window.print();
    }
  };

  const generate = () => {
    if (!cart.length) return;
    const invoice = "INV-" + Math.floor(100000 + Math.random() * 900000);
    const trackingId = "TRK-" + Math.random().toString(36).slice(2, 9).toUpperCase();
    setDone({ invoice, trackingId, total, date: formatDate() });
    // Keep cart so the off-screen InvoiceImage can still render the items;
    // it will be reset when user closes / starts a new bill.
  };

  const totalHeld = held.length + (cart.length || customer ? 1 : 0);

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
        <div className="px-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="h-11 w-11 rounded-full grid place-items-center shadow-gold-glow border-2 border-white flex-shrink-0"
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
              {customer && (
                <p className="text-[9px] text-[color:oklch(0.45_0.08_85)] truncate mt-0.5">
                  Bill for · <span className="font-bold">{customer.name}</span>
                </p>
              )}
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
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              {/* === Invoice items === */}
              <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2 shadow-sm">
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
                          <div className="flex flex-col items-end gap-0.5 min-w-[58px]">
                            <span className="font-display text-[12px] font-bold text-gold-gradient">
                              ₹{(price * l.qty).toLocaleString()}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* === Totals + integrated Disc/GST/Deliv chips === */}
              <div
                className="relative rounded-2xl border-2 p-3.5 shadow-md"
                style={{
                  borderColor: "oklch(0.78 0.14 82 / 0.55)",
                  background:
                    "linear-gradient(180deg, #fffdf5 0%, #fff8dc 50%, #fbf3d9 100%)",
                }}
              >
                {/* Integrated horizontally-scrollable chip strip */}
                <div className="flex items-center gap-1.5 mb-3 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                  <ChipTrigger
                    icon={<Percent className="h-3 w-3" />}
                    label="Disc"
                    value={
                      discountValue === 0
                        ? "Add"
                        : discountMode === "flat-off"
                          ? `−₹${discountValue}`
                          : `${discountMode === "pct-add" ? "+" : "−"}${discountValue}%`
                    }
                    onClick={() => setPicker("discount")}
                    tone={discountValue !== 0 ? "rose-active" : "neutral"}
                  />
                  <ChipTrigger
                    icon={<Receipt className="h-3 w-3" />}
                    label="GST"
                    value={taxPct === 0 ? "0%" : `${taxPct}% ${gstMode === "include" ? "incl" : ""}`.trim()}
                    onClick={() => setPicker("gst")}
                    tone={taxPct > 0 ? "gold-active" : "neutral"}
                  />
                  <ChipTrigger
                    icon={<Tag className="h-3 w-3" />}
                    label="Coupon"
                    value={coupon ? coupon.code : "Apply"}
                    onClick={() => setPicker("coupon")}
                    tone={coupon ? "rose-active" : "neutral"}
                  />
                  <ChipTrigger
                    icon={<Truck className="h-3 w-3" />}
                    label="Deliv"
                    value={`₹${deliveryFee}`}
                    onClick={() => setPicker("delivery")}
                    tone={deliveryFee > 0 ? "gold-active" : "neutral"}
                  />
                </div>

                {/* Totals rows */}
                <div className="text-sm space-y-1">
                  <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
                  {discountAmt > 0 && (
                    <Row
                      label={`Discount (${discountPctLabel}${coupon ? ` · ${coupon.code}` : ""})`}
                      value={`-₹${discountAmt.toFixed(0)}`}
                    />
                  )}
                  {surcharge > 0 && (
                    <Row label={`Surcharge (${discountValue}%)`} value={`+₹${surcharge.toFixed(0)}`} />
                  )}
                  {gstMode === "add" && taxAmt > 0 && (
                    <Row label={`GST (${taxPct}%)`} value={`+₹${taxAmt.toFixed(0)}`} />
                  )}
                  {gstMode === "include" && taxPct > 0 && (
                    <Row
                      label={`GST (${taxPct}% incl)`}
                      value={`incl ₹${Math.abs(taxAmt).toFixed(0)}`}
                    />
                  )}
                  {deliveryFee > 0 && <Row label="Delivery" value={`+₹${deliveryFee}`} />}
                  <div className="border-t border-dashed border-[color:oklch(0.78_0.14_82/0.5)] pt-1.5 mt-1.5 flex items-center justify-between">
                    <span className="font-display font-bold text-[color:oklch(0.25_0.05_85)]">
                      Total
                    </span>
                    <span className="font-display font-bold text-xl text-gold-gradient">
                      ₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Floating + button → bills/customers manager */}
                <button
                  onClick={() => setShowBillsSheet(true)}
                  aria-label="Manage bills & customers"
                  className="absolute -bottom-4 right-4 h-11 w-11 rounded-full grid place-items-center shadow-gold-glow border-2 border-white text-[color:oklch(0.18_0.06_18)] active:scale-90 transition"
                  style={{
                    background:
                      "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
                  }}
                >
                  <Plus className="h-5 w-5" strokeWidth={3} />
                  {totalHeld > 1 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#d4af37] text-[10px] font-bold text-[color:oklch(0.18_0.06_18)] grid place-items-center border border-white">
                      {totalHeld}
                    </span>
                  )}
                </button>
              </div>

              {/* === Customer add button === */}
              <button
                onClick={() => setShowCustomerSheet(true)}
                className="mt-3 w-full flex items-center gap-3 rounded-2xl bg-white border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] p-3 active:scale-[0.99] transition"
              >
                <span
                  className="h-10 w-10 rounded-full grid place-items-center text-white shadow-md flex-shrink-0"
                  style={{
                    background: customer
                      ? "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)"
                      : "linear-gradient(180deg, oklch(0.62 0.16 165), oklch(0.42 0.14 165))",
                  }}
                >
                  {customer ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Plus className="h-5 w-5" strokeWidth={3} />
                  )}
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

              {/* === Recommended === */}
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

            {/* === Footer: Pay-mode dropdown + Pay Now (printer removed) === */}
            <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">
              <div className="flex items-stretch gap-2 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-1.5 shadow-md">
                <button
                  onClick={() => setShowPaySheet(true)}
                  className="flex-1 flex items-center justify-between gap-1 px-3 py-2 rounded-xl bg-[#fffaeb] active:scale-95"
                >
                  <span className="text-left">
                    <span className="block text-[8px] uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] font-bold">
                      Pay via
                    </span>
                    <span className="block font-display text-[12px] font-bold text-[color:oklch(0.25_0.05_85)] truncate max-w-[100px]">
                      {PAY_LABEL[payMode]}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] flex-shrink-0" />
                </button>

                <button
                  onClick={generate}
                  disabled={!cart.length}
                  className="btn-3d flex-[1.6] py-2 rounded-xl font-display font-bold text-[14px] text-[color:oklch(0.18_0.06_18)] shadow-gold-glow disabled:opacity-50 active:scale-95 flex flex-col items-center justify-center"
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
              </div>
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
      {showBillsSheet && (
        <BillsManagerSheet
          held={held}
          activeCart={cart}
          activeCustomer={customer}
          activeId={activeHeldId}
          onResume={resumeHeld}
          onNew={newBill}
          onClose={() => setShowBillsSheet(false)}
        />
      )}
      {picker === "discount" && (
        <ValuePickerSheet
          title="Discount"
          subtitle="Choose how to apply discount"
          value={discountValue}
          presets={[0, 5, 10, 15, 20, 25, 30, 50]}
          min={0}
          max={discountMode === "flat-off" ? 99999 : 90}
          step={discountMode === "flat-off" ? 10 : 5}
          tone="rose"
          modes={DISCOUNT_MODES}
          modeId={discountMode}
          onPick={(v, modeId) => {
            setDiscountValue(Math.abs(v));
            if (modeId) setDiscountMode(modeId as DiscountMode);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "gst" && (
        <ValuePickerSheet
          title="GST Slab"
          subtitle="Add GST on top, or treat price as inclusive"
          value={taxPct}
          presets={[0, 3, 5, 12, 18, 28]}
          min={0}
          max={28}
          step={1}
          tone="gold"
          modes={GST_MODES}
          modeId={gstMode}
          onPick={(v, modeId) => {
            setTaxPct(Math.abs(v));
            if (modeId) setGstMode(modeId as GstMode);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "coupon" && (
        <CouponSheet
          current={coupon}
          onApply={setCoupon}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "delivery" && (
        <ValuePickerSheet
          title="Delivery Fee"
          subtitle="Add delivery / shipping charge"
          unit="₹"
          value={deliveryFee}
          presets={[0, 50, 100, 150, 200, 300, 500, 1000]}
          min={0}
          max={5000}
          step={10}
          tone="emerald"
          onPick={setDeliveryFee}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function ChipTrigger({
  icon,
  label,
  value,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  tone: "neutral" | "gold-active" | "rose-active";
}) {
  const styles =
    tone === "gold-active"
      ? "border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] text-[color:oklch(0.25_0.05_85)] shadow-sm"
      : tone === "rose-active"
        ? "border-[#e11d48] bg-gradient-to-br from-[#fde7eb] to-[#f9c4cc] text-[color:oklch(0.30_0.18_18)] shadow-sm"
        : "border-[color:oklch(0.78_0.14_82/0.5)] bg-white/80 text-[color:oklch(0.45_0.08_85)]";
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-between gap-1 px-2 py-1.5 rounded-full border-2 active:scale-95 transition ${styles}`}
    >
      <span className="flex items-center gap-1">
        {icon}
        <span className="text-[9px] uppercase tracking-wider font-bold">{label}</span>
      </span>
      <span className="font-display font-bold text-[12px]">{value}</span>
    </button>
  );
}

function BillsManagerSheet({
  held,
  activeCart,
  activeCustomer,
  activeId,
  onResume,
  onNew,
  onClose,
}: {
  held: HeldBill[];
  activeCart: CartLine[];
  activeCustomer: Customer | null;
  activeId: string | null;
  onResume: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const activeSnapshot =
    activeCart.length || activeCustomer
      ? {
          id: activeId ?? "current",
          customer: activeCustomer,
          items: activeCart.reduce((s, l) => s + l.qty, 0),
          total: activeCart.reduce(
            (s, l) => s + (l.priceOverride ?? l.product.price) * l.qty,
            0,
          ),
        }
      : null;

  return (
    <div className="fixed inset-0 z-[105] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] flex flex-col max-h-[85vh]"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 50%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-9 w-9 rounded-full grid place-items-center text-white shadow-gold-glow"
              style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
            >
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
                ✦ Active Bills ✦
              </p>
              <h3 className="font-display text-base text-gold-gradient font-bold">
                Multi-customer Queue
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-4 flex-1 overflow-y-auto space-y-2">
          {/* Start new bill */}
          <button
            onClick={onNew}
            className="w-full flex items-center gap-3 rounded-2xl p-3 border-2 border-dashed border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-white active:scale-[0.99]"
          >
            <span
              className="h-11 w-11 rounded-full grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
              style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)" }}
            >
              <UserPlus className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-left flex-1">
              <span className="block font-display text-sm font-bold text-gold-gradient">
                + Start New Bill
              </span>
              <span className="block text-[10px] text-[color:oklch(0.45_0.08_85)]">
                Hold current bill & start a fresh one for next customer
              </span>
            </span>
          </button>

          {/* Active bill row */}
          {activeSnapshot && (
            <div className="rounded-2xl p-3 border-2 border-[#d4af37] bg-gradient-to-br from-[#fffaeb] to-white shadow-gold-glow flex items-center gap-3">
              <span
                className="h-11 w-11 rounded-full grid place-items-center text-white shadow-md"
                style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
              >
                <User className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                  {activeSnapshot.customer?.name ?? "Walk-in (current)"}
                </p>
                <p className="text-[10px] text-[color:oklch(0.55_0.10_82)]">
                  {activeSnapshot.items} item{activeSnapshot.items !== 1 ? "s" : ""} · ₹
                  {activeSnapshot.total.toLocaleString()} · being edited
                </p>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[color:oklch(0.42_0.10_82)] bg-white px-2 py-1 rounded-full border border-[#d4af37]">
                Live
              </span>
            </div>
          )}

          {/* Held bills */}
          {held.length === 0 && !activeSnapshot && (
            <div className="text-center py-6">
              <p className="text-[12px] text-[color:oklch(0.55_0.10_82)] italic">
                No bills in queue yet
              </p>
            </div>
          )}

          {held.map((h) => {
            const items = h.cart.reduce((s, l) => s + l.qty, 0);
            const total = h.cart.reduce(
              (s, l) => s + (l.priceOverride ?? l.product.price) * l.qty,
              0,
            );
            return (
              <button
                key={h.id}
                onClick={() => onResume(h.id)}
                className="w-full rounded-2xl p-3 border border-[color:oklch(0.78_0.14_82/0.5)] bg-white shadow-sm flex items-center gap-3 active:scale-[0.99]"
              >
                <span className="h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[#d4af37]">
                  <Pause className="h-4 w-4 text-[#92400e]" />
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                    {h.customer?.name ?? "Walk-in"}
                  </p>
                  <p className="text-[10px] text-[color:oklch(0.55_0.10_82)]">
                    {items} item{items !== 1 ? "s" : ""} · ₹{total.toLocaleString()} · held{" "}
                    {timeAgo(h.createdAt)}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[color:oklch(0.42_0.10_82)]">
                  Resume →
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
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
