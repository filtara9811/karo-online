import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CreditCard, Wallet, Truck, Check, Sparkles, ShieldCheck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Karo Online" },
      { name: "description", content: "Secure payment & invoice for your Karo Online order." },
    ],
  }),
  component: CheckoutPage,
});

type Method = "online" | "cod";

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const [method, setMethod] = useState<Method>("online");
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);

  const tax = Math.round(subtotal * 0.05);
  const delivery = subtotal > 999 || items.length === 0 ? 0 : 49;
  const total = subtotal + tax + delivery;

  const placeOrder = () => {
    if (items.length === 0) return;
    setPlacing(true);
    setTimeout(() => {
      setPlacing(false);
      setDone(true);
      clear();
    }, 1400);
  };

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-gradient-to-br from-[#fffaeb] via-white to-[#f9eec9]">
        <div className="text-center" style={{ animation: "fade-up 0.5s ease-out" }}>
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center border-2 border-[#d4af37] shadow-gold-glow mb-5">
            <Check className="h-12 w-12 text-[#92400e]" strokeWidth={3} />
          </div>
          <h1 className="font-display text-3xl text-gold-gradient">Order placed!</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            {method === "online"
              ? "Payment confirmed. Your order is on the way."
              : "Cash on delivery confirmed. Pay when you receive."}
          </p>
          <button
            onClick={() => navigate({ to: "/home" })}
            className="btn-3d mt-6 px-6 py-3 rounded-2xl bg-gold-bar font-display font-bold text-sm shadow-gold-glow"
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 bg-[#fdfaf0]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/90 border-b border-[color:oklch(0.78_0.14_82/0.4)]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/home" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-xl text-gold-gradient flex-1">Checkout</h1>
          <ShieldCheck className="h-5 w-5 text-[#d4af37]" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-lg text-gold-gradient">Your basket is empty</p>
            <button
              onClick={() => navigate({ to: "/home" })}
              className="mt-4 px-5 py-2.5 rounded-full bg-gold-bar text-sm font-semibold"
            >
              Browse maison
            </button>
          </div>
        ) : (
          <>
            {/* Invoice */}
            <section className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base text-gold-gradient">Invoice</h2>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  #{Date.now().toString().slice(-6)}
                </span>
              </div>
              <div className="space-y-2.5">
                {items.map((it) => (
                  <div key={it.id + (it.variation ?? "")} className="flex items-center gap-3">
                    <img src={it.image} alt={it.name} className="h-12 w-12 rounded-lg object-cover border border-black/5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1f2937] truncate">{it.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Qty {it.qty} · ₹{it.price.toLocaleString()} each
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#1f2937]">₹{(it.price * it.qty).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-[color:oklch(0.78_0.14_82/0.4)] my-3" />
              <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
              <Row label="Taxes & fees (5%)" value={`₹${tax.toLocaleString()}`} />
              <Row
                label="Delivery"
                value={delivery === 0 ? "FREE" : `₹${delivery}`}
                accent={delivery === 0}
              />
              <div className="border-t border-[color:oklch(0.78_0.14_82/0.4)] my-2" />
              <div className="flex items-center justify-between">
                <span className="font-display text-base">Total payable</span>
                <span className="font-display text-2xl text-gold-gradient font-bold">₹{total.toLocaleString()}</span>
              </div>
            </section>

            {/* Payment method */}
            <section className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] p-4 shadow-sm">
              <h2 className="font-display text-base text-gold-gradient mb-3">Payment method</h2>
              <div className="space-y-2.5">
                <MethodCard
                  active={method === "online"}
                  onClick={() => setMethod("online")}
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Online payment"
                  sub="UPI · Cards · Netbanking · Wallets"
                  badge="Instant"
                />
                <MethodCard
                  active={method === "cod"}
                  onClick={() => setMethod("cod")}
                  icon={<Wallet className="h-5 w-5" />}
                  title="Cash on delivery"
                  sub="Pay in cash when your order arrives"
                  badge="Offline"
                />
              </div>

              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-[#fffaeb] border border-[#d4af37]/30">
                <Truck className="h-4 w-4 text-[#92400e] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#78350f] leading-relaxed">
                  Estimated delivery in <b>3-5 days</b>. Free returns within 7 days.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {items.length > 0 && (
        <div
          className="fixed inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
          style={{ bottom: 0 }}
        >
          <div className="max-w-md mx-auto px-4 pb-3">
            <button
              onClick={placeOrder}
              disabled={placing}
              className="btn-3d w-full py-4 rounded-3xl bg-gold-bar font-display font-bold text-base text-[color:oklch(0.13_0.06_18)] shadow-gold-glow active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  {method === "online" ? "Connecting gateway…" : "Placing order…"}
                </>
              ) : (
                <>
                  {method === "online" ? "Pay now" : "Place COD order"} · ₹{total.toLocaleString()}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${accent ? "text-[color:oklch(0.55_0.15_140)]" : "text-[#1f2937]"}`}>
        {value}
      </span>
    </div>
  );
}

function MethodCard({
  active,
  onClick,
  icon,
  title,
  sub,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  badge: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition active:scale-[0.99] ${
        active
          ? "border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] shadow-[0_2px_10px_-2px_rgba(212,175,55,0.5)]"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      <span
        className={`h-10 w-10 rounded-xl grid place-items-center flex-shrink-0 ${
          active ? "bg-gold-bar text-[#1f2937]" : "bg-[#f3f4f6] text-[#6b7280]"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#1f2937]">{title}</span>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-bold">
            {badge}
          </span>
        </span>
        <span className="block text-[11px] text-muted-foreground mt-0.5">{sub}</span>
      </span>
      <span
        className={`h-5 w-5 rounded-full border-2 grid place-items-center flex-shrink-0 ${
          active ? "border-[#d4af37] bg-[#d4af37]" : "border-[#e5e7eb]"
        }`}
      >
        {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}
