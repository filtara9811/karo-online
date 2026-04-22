import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShoppingBasket, ChevronUp, X, MessageCircle, Zap, Send } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

/**
 * Floating golden basket shown on the Home screen.
 * - Shows a thin "peek" bar with the live count and a CTA when items > 0
 * - Tap to expand into a draggable-feel sheet listing items
 * - "Order now" → opens an enquiry / buy popup
 *   - Enquiry → /chat with cart context
 *   - Buy → /checkout
 * - "Request now" small icon button → quick enquiry shortcut
 */
export function HomeBasket() {
  const navigate = useNavigate();
  const { items, count, subtotal, setQty, flying } = useCart();
  const [open, setOpen] = useState(false);
  const [askEnquiry, setAskEnquiry] = useState(false);

  if (count === 0 && !flying) return null;

  const goEnquiry = () => {
    setAskEnquiry(false);
    setOpen(false);
    const first = items[0];
    navigate({
      to: "/chat",
      search: first
        ? ({
            productId: first.id,
            productName: first.name,
            productImage: first.image,
            productPrice: first.price,
            mode: "inquiry",
          } as never)
        : (undefined as never),
    });
  };

  const goBuy = () => {
    setAskEnquiry(false);
    setOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <>
      {/* Peek bar — always visible above the bottom action bar when cart has items */}
      <div
        data-home-basket
        className="fixed inset-x-0 z-30 pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 78px)" }}
      >
        <div className="max-w-md mx-auto px-4">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto btn-3d w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-gradient-to-b from-[#fffaeb] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.6)] shadow-[0_8px_24px_-8px_rgba(212,175,55,0.55)] active:scale-[0.99]"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
            aria-label={`Basket: ${count} items, ₹${subtotal.toLocaleString()}`}
          >
            {/* Basket icon with bounce when flying */}
            <span
              data-cart-target
              className={`relative h-10 w-10 rounded-full grid place-items-center bg-white border-2 border-[#d4af37] shadow-gold-glow flex-shrink-0 ${
                flying ? "animate-bounce" : ""
              }`}
            >
              <ShoppingBasket className="h-5 w-5 text-[#92400e]" strokeWidth={2.4} />
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-gradient-to-br from-[#f5d97a] via-[#d4af37] to-[#8b6508] text-[10px] font-bold text-white grid place-items-center shadow">
                {count}
              </span>
            </span>

            <span className="flex-1 text-left min-w-0">
              <span className="block font-display text-[13px] text-gold-gradient font-bold leading-tight">
                {count} {count === 1 ? "product" : "products"} in basket
              </span>
              <span className="block text-[10px] text-[color:oklch(0.45_0.08_85)] truncate">
                Tap to review · ₹{subtotal.toLocaleString()}
              </span>
            </span>

            {/* Order now */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setAskEnquiry(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-bold text-[11px] shadow-gold-glow active:scale-95"
            >
              Order now
              <ChevronUp className="h-3 w-3" strokeWidth={3} />
            </span>

            {/* Request now — small icon-only shortcut on the right */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                goEnquiry();
              }}
              aria-label="Request enquiry now"
              className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.55)] text-[#92400e] active:scale-90"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          </button>
        </div>
      </div>

      {/* Expanded sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            style={{ animation: "overlay-in 0.25s ease-out" }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto bg-gradient-to-b from-white to-[#fdfaf0] rounded-t-3xl border-t border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_-12px_40px_-8px_rgba(212,175,55,0.5)] max-h-[78vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
            style={{ animation: "sheet-up 0.4s cubic-bezier(0.22,1,0.36,1)" }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            </div>
            <div className="px-5 pb-2 flex items-center justify-between border-b border-[color:oklch(0.78_0.14_82/0.3)]">
              <h3 className="font-display text-lg text-gold-gradient">Your basket</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {items.map((it) => (
                <article
                  key={it.id + (it.variation ?? "")}
                  className="flex items-center gap-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2.5"
                >
                  <img src={it.image} alt={it.name} className="h-14 w-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1f2937] truncate">{it.name}</p>
                    <p className="font-display text-sm text-gold-gradient font-bold">
                      ₹{(it.price * it.qty).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-[color:oklch(0.78_0.14_82/0.5)] px-1 py-0.5 bg-white">
                    <button
                      onClick={() => setQty(it.id, it.qty - 1)}
                      aria-label="decrease"
                      className="h-6 w-6 grid place-items-center text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{it.qty}</span>
                    <button
                      onClick={() => setQty(it.id, it.qty + 1)}
                      aria-label="increase"
                      className="h-6 w-6 grid place-items-center text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="px-4 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)] bg-gradient-to-b from-transparent to-[#fffaeb]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-muted-foreground">Subtotal</span>
                <span className="font-display text-xl text-gold-gradient font-bold">
                  ₹{subtotal.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setAskEnquiry(true)}
                className="btn-3d w-full py-3 rounded-2xl bg-gold-bar font-display font-bold text-sm text-[color:oklch(0.13_0.06_18)] shadow-gold-glow active:scale-[0.98]"
              >
                Order now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry / Buy popup */}
      {askEnquiry && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center px-6"
          onClick={() => setAskEnquiry(false)}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            style={{ animation: "overlay-in 0.2s ease-out" }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-white to-[#fdfaf0] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_20px_60px_-12px_rgba(212,175,55,0.55)] p-5"
            style={{ animation: "fade-up 0.35s cubic-bezier(0.22,1,0.36,1)" }}
          >
            <div className="flex justify-center mb-3">
              <span className="h-12 w-12 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center border-2 border-[#d4af37] shadow-gold-glow">
                <MessageCircle className="h-6 w-6 text-[#92400e]" />
              </span>
            </div>
            <h3 className="font-display text-xl text-gold-gradient text-center">
              Enquiry करना चाहते हैं?
            </h3>
            <p className="text-xs text-muted-foreground text-center mt-1.5">
              Vendor से सीधा chat पर बात करें या तुरंत payment कर के order place करें।
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={goEnquiry}
                className="btn-3d py-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.55)] flex items-center justify-center gap-1.5 active:scale-95"
              >
                <MessageCircle className="h-4 w-4 text-[#92400e]" strokeWidth={2.4} />
                <span className="font-display text-[13px] text-gold-gradient font-bold">Enquiry</span>
              </button>
              <button
                onClick={goBuy}
                className="btn-3d py-3 rounded-2xl bg-gold-bar shadow-gold-glow flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Zap className="h-4 w-4 text-[color:oklch(0.13_0.06_18)]" strokeWidth={2.6} />
                <span className="font-display text-[13px] font-bold text-[color:oklch(0.13_0.06_18)]">Buy now</span>
              </button>
            </div>
            <button
              onClick={() => setAskEnquiry(false)}
              className="mt-3 w-full text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
