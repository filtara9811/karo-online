import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Star, Heart, Share2, ShieldCheck, Truck, RotateCcw, ShoppingBasket, X, Check } from "lucide-react";
import { getProduct, PRODUCTS } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "Product"} — Karo Online` },
      { name: "description", content: loaderData?.product.tagline ?? "Premium product from the Karo Online maison." },
      { property: "og:title", content: loaderData?.product.name },
      { property: "og:description", content: loaderData?.product.tagline },
      { property: "og:image", content: loaderData?.product.image },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-3xl text-gold-gradient">Product not found</h1>
        <Link to="/home" className="mt-4 inline-flex px-5 py-2 rounded-full bg-gold-bar text-sm font-semibold">
          Back to shop
        </Link>
      </div>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const navigate = useNavigate();
  const cart = useCart();
  const [variation, setVariation] = useState(product.variations?.[0]?.label ?? "");
  const [showBookSheet, setShowBookSheet] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [adding, setAdding] = useState(false);

  const recommended = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  const handleAdd = () => {
    setAdding(true);
    cart.add({ id: product.id, name: product.name, price: product.price, image: product.image, variation });
    cart.triggerFly();
    setTimeout(() => setAdding(false), 700);
  };

  const handleBook = (mode: "request" | "now") => {
    setBookingDone(true);
    if (mode === "now") {
      cart.add({ id: product.id, name: product.name, price: product.price, image: product.image, variation });
    }
    setTimeout(() => {
      setShowBookSheet(false);
      setBookingDone(false);
    }, 1600);
  };

  return (
    <div className="min-h-screen pb-28" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
      {/* Header overlay */}
      <header className="absolute left-0 right-0 z-20 px-4 flex items-center justify-between" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          className="h-10 w-10 grid place-items-center rounded-full bg-white/90 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] shadow"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2">
          <button aria-label="Share" className="h-10 w-10 grid place-items-center rounded-full bg-white/90 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] shadow">
            <Share2 className="h-4 w-4" />
          </button>
          <button aria-label="Wishlist" className="h-10 w-10 grid place-items-center rounded-full bg-white/90 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] shadow">
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Hero image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-[#fff8e6] to-[#f5e9b8]">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        {product.badge && (
          <span className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-gold-bar text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.13_0.06_18)] shadow-gold-glow">
            {product.badge}
          </span>
        )}
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-5">
        {/* Title block */}
        <section style={{ animation: "fade-up 0.5s ease-out both" }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">{product.category}</p>
          <h1 className="font-display text-3xl text-gold-gradient font-bold mt-1 leading-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground italic mt-1">{product.tagline}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color:oklch(0.55_0.15_140/0.12)] border border-[color:oklch(0.55_0.15_140/0.3)]">
              <Star className="h-3 w-3 fill-[color:oklch(0.55_0.15_140)] text-[color:oklch(0.55_0.15_140)]" />
              <span className="text-xs font-semibold text-[color:oklch(0.45_0.13_140)]">{product.rating}</span>
            </span>
            <span className="text-xs text-muted-foreground">{product.reviews} reviews</span>
            <span className="text-xs text-muted-foreground">· by {product.seller}</span>
          </div>
        </section>

        {/* Price */}
        <section className="flex items-baseline gap-3">
          <span className="font-display text-3xl text-gold-gradient font-bold">₹{product.price.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground line-through">₹{product.mrp.toLocaleString()}</span>
          <span className="text-xs font-bold text-[color:oklch(0.55_0.15_140)]">
            {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
          </span>
        </section>

        {/* Variations */}
        {product.variations && (
          <section>
            <h3 className="font-display text-sm uppercase tracking-[0.18em] text-[color:oklch(0.45_0.05_85)] mb-2">
              Variation
            </h3>
            <div className="flex gap-2 flex-wrap">
              {product.variations.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setVariation(v.label)}
                  className={`px-4 py-2 rounded-full border text-xs font-semibold transition ${
                    variation === v.label
                      ? "bg-gold-bar text-[color:oklch(0.13_0.06_18)] border-transparent shadow-gold-glow"
                      : "bg-white border-[color:oklch(0.78_0.14_82/0.5)] text-[color:oklch(0.42_0.10_82)]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        <section>
          <h3 className="font-display text-sm uppercase tracking-[0.18em] text-[color:oklch(0.45_0.05_85)] mb-2">
            Description
          </h3>
          <p className="text-sm text-foreground/85 leading-relaxed">{product.description}</p>
        </section>

        {/* Trust badges */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, label: "Authentic" },
            { icon: Truck, label: "Free delivery" },
            { icon: RotateCcw, label: "7-day return" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)]"
            >
              <Icon className="h-5 w-5 text-[color:oklch(0.55_0.10_82)]" />
              <span className="text-[10px] font-semibold text-center">{label}</span>
            </div>
          ))}
        </section>

        {/* Recommended */}
        <section>
          <h3 className="font-display text-xl text-gold-gradient mb-2">You may also like</h3>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
            {recommended.map((p) => (
              <Link
                to="/product/$id"
                params={{ id: p.id }}
                key={p.id}
                className="flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)]"
              >
                <div className="aspect-square overflow-hidden">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="font-display text-sm text-gold-gradient font-bold">₹{p.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl bg-white/95 border-t border-[color:oklch(0.78_0.14_82/0.4)]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={handleAdd}
            className={`btn-3d flex-1 py-3 rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.7)] bg-white text-[color:oklch(0.42_0.10_82)] font-display font-bold text-sm flex items-center justify-center gap-2 ${
              adding ? "scale-95" : ""
            }`}
          >
            <ShoppingBasket className={`h-4 w-4 ${adding ? "animate-bounce" : ""}`} />
            Add to Cart
          </button>
          <button
            onClick={() => setShowBookSheet(true)}
            className="btn-3d flex-1 py-3 rounded-2xl bg-gold-bar font-display font-bold text-sm text-[color:oklch(0.13_0.06_18)] shadow-gold-glow"
          >
            Book Now
          </button>
        </div>
      </div>

      {/* Flying cart pellet animation */}
      {cart.flying && (
        <div
          className="pointer-events-none fixed z-50 h-8 w-8 rounded-full bg-gradient-to-br from-[#fff3b0] to-[#d4af37] shadow-gold-glow"
          style={{
            left: "50%",
            top: "60%",
            animation: "fly-to-cart 0.85s cubic-bezier(0.5, -0.3, 0.7, 1) forwards",
          }}
        />
      )}
      <style>{`
        @keyframes fly-to-cart {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          70% { opacity: 0.9; }
          100% { transform: translate(120px, -60vh) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* Book Now bottom sheet */}
      {showBookSheet && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50" onClick={() => setShowBookSheet(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto rounded-t-3xl bg-white border-t border-[color:oklch(0.78_0.14_82/0.5)] p-5 pb-8"
            style={{ animation: "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <div className="flex justify-center mb-3">
              <span className="h-1 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.5)]" />
            </div>
            {bookingDone ? (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-[#fff3b0] to-[#d4af37] grid place-items-center shadow-gold-glow mb-3">
                  <Check className="h-8 w-8 text-white" strokeWidth={3} />
                </div>
                <h3 className="font-display text-2xl text-gold-gradient">Request Raised!</h3>
                <p className="text-sm text-muted-foreground mt-1">We'll confirm your booking shortly.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl text-gold-gradient">Book {product.name}</h3>
                    <p className="text-sm text-muted-foreground italic">Choose how you'd like to proceed</p>
                  </div>
                  <button onClick={() => setShowBookSheet(false)} aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => handleBook("request")}
                    className="btn-3d w-full p-4 rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.6)] bg-white flex items-center gap-3 text-left"
                  >
                    <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center text-lg">📩</span>
                    <span className="flex-1">
                      <span className="block font-display font-bold text-base">Request Now</span>
                      <span className="block text-xs text-muted-foreground">Vendor confirms · pay later</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleBook("now")}
                    className="btn-3d w-full p-4 rounded-2xl bg-gold-bar text-[color:oklch(0.13_0.06_18)] flex items-center gap-3 text-left shadow-gold-glow"
                  >
                    <span className="h-10 w-10 rounded-full bg-white/40 grid place-items-center text-lg">⚡</span>
                    <span className="flex-1">
                      <span className="block font-display font-bold text-base">Book Now</span>
                      <span className="block text-xs opacity-80">Instant confirm · ₹{product.price.toLocaleString()}</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
