import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBasket } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Karo Online" },
      { name: "description", content: "Review services and products in your Karo Online cart, adjust quantities, and proceed to secure checkout." },
      { property: "og:title", content: "Your Cart — Karo Online" },
      { property: "og:description", content: "Review your Karo Online cart and check out securely." },
      { property: "og:url", content: "https://karoonline.in/cart" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { items, setQty, remove, subtotal, clear } = useCart();

  return (
    <div className="min-h-screen pb-32" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/85 border-b border-[color:oklch(0.78_0.14_82/0.4)]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/home" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-xl text-gold-gradient flex-1">Your Cart</h1>
          {items.length > 0 && (
            <button onClick={clear} className="text-[10px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)]">
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow mb-4">
              <ShoppingBasket className="h-10 w-10 text-[color:oklch(0.55_0.10_82)]" />
            </div>
            <h2 className="font-display text-xl text-gold-gradient">Cart is empty</h2>
            <p className="text-sm text-muted-foreground mt-1">Discover the maison collection.</p>
            <Link
              to="/home"
              className="inline-flex mt-5 px-5 py-2.5 rounded-full bg-gold-bar text-sm font-display font-semibold text-[color:oklch(0.13_0.06_18)] shadow-gold-glow"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            {items.map((it) => (
              <article
                key={it.id + (it.variation ?? "")}
                className="flex gap-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] p-2.5 shadow-sm"
              >
                <img src={it.image} alt={it.name} className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-sm font-semibold truncate">{it.name}</h3>
                  {it.variation && (
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">{it.variation}</p>
                  )}
                  <p className="font-display text-base text-gold-gradient font-bold mt-0.5">
                    ₹{(it.price * it.qty).toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1 rounded-full border border-[color:oklch(0.78_0.14_82/0.5)] px-1 py-0.5 bg-white">
                      <button
                        onClick={() => setQty(it.id, it.qty - 1)}
                        aria-label="decrease"
                        className="h-6 w-6 grid place-items-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{it.qty}</span>
                      <button
                        onClick={() => setQty(it.id, it.qty + 1)}
                        aria-label="increase"
                        className="h-6 w-6 grid place-items-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => remove(it.id)} aria-label="remove">
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-2xl bg-gradient-to-br from-[#fffaeb] to-[#f9eec9] border border-[color:oklch(0.78_0.14_82/0.55)] p-4 mt-4 shadow-gold-glow">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display font-semibold">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-display font-semibold text-[color:oklch(0.55_0.15_140)]">Free</span>
              </div>
              <div className="border-t border-[color:oklch(0.78_0.14_82/0.4)] my-3" />
              <div className="flex items-center justify-between">
                <span className="font-display text-base">Total</span>
                <span className="font-display text-2xl text-gold-gradient font-bold">₹{subtotal.toLocaleString()}</span>
              </div>
              <button className="btn-3d mt-3 w-full py-3 rounded-2xl bg-gold-bar font-display font-bold text-base text-[color:oklch(0.13_0.06_18)] shadow-gold-glow">
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
