import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Star, Heart, Search, ShoppingBasket, MoreHorizontal, Camera, Share2, ChevronDown, Award, ShieldCheck, Truck, MessageCircle, Zap, Check } from "lucide-react";
import { getProduct, PRODUCTS, type Product } from "@/lib/products";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

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

function buildBulkTiers(price: number) {
  return [
    { qty: "Min. order: 20 pieces", price: Math.round(price * 1.0) },
    { qty: "200-999 pieces", price: Math.round(price * 0.95) },
    { qty: "1,000-9,999 pieces", price: Math.round(price * 0.90) },
  ];
}

const COLOR_VARIATIONS = [
  { id: "red", label: "Red", swatch: "#dc2626" },
  { id: "white", label: "White", swatch: "#f8fafc" },
  { id: "gold", label: "Gold", swatch: "#d4af37" },
  { id: "black", label: "Black", swatch: "#111827" },
];

const SIZE_VARIATIONS = ["S", "M", "L", "XL"];

const REVIEWS = [
  { name: "Aryan Bansal", avatar: avatarAryan, rating: 5, text: "Premium quality! Packaging was elegant and delivery was super fast. Worth every rupee.", time: "2 days ago" },
  { name: "Rani Kumari", avatar: avatarRani, rating: 5, text: "Loved the finish and the gold tones. Exactly as shown in photos. Will reorder for my store.", time: "1 week ago" },
  { name: "Raj Kumar", avatar: avatarRaj, rating: 4, text: "Solid product, vendor was responsive on chat. Bulk pricing is competitive.", time: "2 weeks ago" },
  { name: "Ashu Qureshi", avatar: avatarUser, rating: 5, text: "Best in class. The maison really delivers on the premium promise.", time: "3 weeks ago" },
];

function ProductPage() {
  const { product } = Route.useLoaderData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"photos" | "reviews" | "highlights" | "specs">("photos");
  const [color, setColor] = useState(COLOR_VARIATIONS[0].id);
  const [size, setSize] = useState(SIZE_VARIATIONS[1]);
  const [qty, setQty] = useState(20);

  const tiers = buildBulkTiers(product.price);
  const recommended: Product[] = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  const goChat = (mode: "chat" | "inquiry") => {
    navigate({
      to: "/chat",
      search: {
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        productPrice: product.price,
        mode,
      } as never,
    });
  };

  const goBook = () => {
    // Send to cart for payment / checkout flow
    navigate({ to: "/cart" });
  };

  return (
    <div className="min-h-screen bg-white pb-36" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Top search header */}
      <header className="sticky top-0 z-30 bg-white border-b border-black/5">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/home" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center -ml-1 active:scale-90"
          >
            <ArrowLeft className="h-5 w-5 text-[#1f2937]" strokeWidth={2.4} />
          </button>
          <label className="flex-1 flex items-center gap-2 rounded-full bg-[#f3f4f6] px-3.5 py-2">
            <Search className="h-4 w-4 text-[#6b7280]" strokeWidth={2.4} />
            <input
              defaultValue={product.name.toLowerCase()}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9ca3af] text-[#1f2937]"
              placeholder="Search"
            />
          </label>
          <button aria-label="Visual search" className="h-9 w-9 grid place-items-center active:scale-90">
            <Camera className="h-5 w-5 text-[#1f2937]" strokeWidth={2.2} />
          </button>
          <Link to="/cart" aria-label="Cart" className="h-9 w-9 grid place-items-center active:scale-90">
            <ShoppingBasket className="h-5 w-5 text-[#1f2937]" strokeWidth={2.2} />
          </Link>
          <button aria-label="More" className="h-9 w-9 grid place-items-center active:scale-90">
            <MoreHorizontal className="h-5 w-5 text-[#1f2937]" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* Hero image with floating actions */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-[#cfe7ee] to-[#a8d4e0]">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button aria-label="Wishlist" className="h-10 w-10 grid place-items-center rounded-full bg-white shadow-md active:scale-90">
            <Heart className="h-4 w-4 text-[#1f2937]" strokeWidth={2.2} />
          </button>
          <button aria-label="Visual" className="h-10 w-10 grid place-items-center rounded-full bg-white shadow-md active:scale-90">
            <Search className="h-4 w-4 text-[#1f2937]" strokeWidth={2.2} />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "photos", label: "Photos 1/6" },
            { id: "reviews", label: "Reviews" },
            { id: "highlights", label: "Highlights" },
            { id: "specs", label: "Dimension Diagram" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                tab === t.id ? "bg-black/85 text-white" : "bg-black/40 text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk pricing tiers */}
      <section className="mx-3 mt-3 rounded-xl bg-[#f3f4f6] overflow-hidden">
        <div className="grid grid-cols-3">
          {tiers.map((t, i) => (
            <div
              key={i}
              className={`px-3 py-3.5 ${i < 2 ? "border-r border-white" : ""} ${i === 0 ? "bg-[#eef0f3]" : ""}`}
            >
              <p className="font-bold text-[#1f2937] text-lg leading-tight">₹{t.price.toLocaleString()}</p>
              <p className="text-[11px] text-[#6b7280] mt-1 leading-tight">{t.qty}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Title + rating */}
      <section className="px-4 mt-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[15px] font-semibold text-[#1f2937] leading-snug flex-1">
            {product.name} · {product.tagline}
            <ChevronDown className="inline h-4 w-4 ml-1 text-[#6b7280]" />
          </h1>
          <button aria-label="Share" className="h-8 w-8 grid place-items-center active:scale-90 flex-shrink-0">
            <Share2 className="h-5 w-5 text-[#1f2937]" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
            ))}
          </span>
          <span className="font-bold text-[#1f2937]">{product.rating.toFixed(1)}</span>
          <span className="underline text-[#6b7280]">({product.reviews})</span>
          <span className="text-[#6b7280]">· {Math.round(product.reviews * 0.6)} sold</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="px-2 py-1 rounded bg-[#fef3c7] text-[11px] text-[#92400e] font-medium">
            Certificates: CE, …
          </span>
          <span className="px-2 py-1 rounded bg-[#fef3c7] text-[11px] text-[#92400e] font-medium flex items-center gap-1">
            <Award className="h-3 w-3" /> #3 most popular in {product.category}
          </span>
        </div>
      </section>

      <div className="my-3 h-2 bg-[#f3f4f6]" />

      {/* Variations — color */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#1f2937]">Color</h3>
          <span className="text-[11px] text-[#6b7280]">Selected: <span className="font-semibold text-[#1f2937]">{COLOR_VARIATIONS.find(c => c.id === color)?.label}</span></span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLOR_VARIATIONS.map((c) => {
            const active = color === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border transition ${
                  active
                    ? "border-[#d4af37] bg-gradient-to-b from-[#fff8dc] to-[#fdf3c8] shadow-[0_2px_8px_-2px_rgba(212,175,55,0.5)]"
                    : "border-[#e5e7eb] bg-white"
                }`}
              >
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.swatch }} />
                <span className="text-xs font-semibold text-[#1f2937]">{c.label}</span>
                {active && <Check className="h-3 w-3 text-[#92400e]" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {/* Size */}
        <div className="mt-4 flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#1f2937]">Size / Pack</h3>
          <span className="text-[11px] text-[#6b7280]">Selected: <span className="font-semibold text-[#1f2937]">{size}</span></span>
        </div>
        <div className="flex gap-2">
          {SIZE_VARIATIONS.map((s) => {
            const active = size === s;
            return (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${
                  active
                    ? "border-[#d4af37] bg-gradient-to-b from-[#fff8dc] to-[#fdf3c8] text-[#92400e] shadow-[0_2px_8px_-2px_rgba(212,175,55,0.5)]"
                    : "border-[#e5e7eb] bg-white text-[#374151]"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Qty */}
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1f2937]">Quantity</h3>
          <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] overflow-hidden">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9 grid place-items-center active:scale-90 text-lg font-bold">−</button>
            <span className="text-sm font-bold text-[#1f2937] w-10 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="h-9 w-9 grid place-items-center active:scale-90 text-lg font-bold">+</button>
          </div>
        </div>
      </section>

      <div className="my-3 h-2 bg-[#f3f4f6]" />

      {/* Verified Supplier card */}
      <section className="px-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg border border-[#e5e7eb] grid place-items-center bg-white text-[10px] font-bold text-[#1f2937] flex-shrink-0">
            KARO
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="text-[#3b82f6] font-bold">V</span>
              <span className="font-bold text-[#1f2937]">erified Supplier:</span>{" "}
              <span className="text-[#1f2937] font-medium">{product.seller} </span>
              <ChevronDown className="inline h-4 w-4 -rotate-90 text-[#6b7280]" />
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#6b7280]">
              <span>Minor customization</span>
              <span>Drawing-based customization</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="px-2 py-1 rounded bg-[#dbeafe] text-[11px] text-[#1e40af] font-medium">
                Multispecialty Supplier
              </span>
              <span className="px-2 py-1 rounded bg-[#dbeafe] text-[11px] text-[#1e40af] font-medium">
                #1 most popular in {product.category}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="my-3 h-2 bg-[#f3f4f6]" />

      {/* Description */}
      <section className="px-4">
        <h3 className="text-sm font-bold text-[#1f2937] mb-2">Description</h3>
        <p className="text-[13px] text-[#374151] leading-relaxed">{product.description}</p>
      </section>

      {/* Trust row */}
      <section className="px-4 mt-4 grid grid-cols-3 gap-2">
        {[
          { icon: ShieldCheck, label: "Trade Assurance" },
          { icon: Truck, label: "Fast shipping" },
          { icon: Award, label: "Quality verified" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
            <Icon className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-[10px] font-medium text-[#374151] text-center leading-tight">{label}</span>
          </div>
        ))}
      </section>

      <div className="my-3 h-2 bg-[#f3f4f6]" />

      {/* Reviews */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#1f2937]">Customer Reviews</h3>
          <span className="text-[11px] font-semibold text-[#92400e]">See all ›</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[#d4af37]/40 mb-3">
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-gold-gradient leading-none">{product.rating.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
              ))}
            </div>
            <p className="text-[10px] text-[#6b7280] mt-0.5">{product.reviews} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className="text-[10px] text-[#6b7280] w-3">{s}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/70 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#d4af37] to-[#fbbf24]"
                    style={{ width: `${s === 5 ? 78 : s === 4 ? 15 : s === 3 ? 5 : 1}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#6b7280] w-6 text-right">{s === 5 ? "78%" : s === 4 ? "15%" : s === 3 ? "5%" : "1%"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {REVIEWS.map((r, i) => (
            <article key={i} className="rounded-xl border border-[#e5e7eb] p-3 bg-white">
              <div className="flex items-center gap-2.5">
                <img src={r.avatar} alt={r.name} className="h-9 w-9 rounded-full object-cover border border-[#e5e7eb]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#1f2937]">{r.name}</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className={`h-2.5 w-2.5 ${j < r.rating ? "fill-[#f59e0b] text-[#f59e0b]" : "fill-[#e5e7eb] text-[#e5e7eb]"}`} />
                    ))}
                    <span className="text-[10px] text-[#6b7280] ml-1">· {r.time}</span>
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-[#374151] mt-2 leading-relaxed">{r.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Recommended */}
      <section className="px-4 mt-5">
        <h3 className="text-sm font-bold text-[#1f2937] mb-2">You may also like</h3>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          {recommended.map((p) => (
            <Link
              to="/product/$id"
              params={{ id: p.id }}
              key={p.id}
              className="flex-shrink-0 w-36 rounded-xl overflow-hidden bg-white border border-[#e5e7eb]"
            >
              <div className="aspect-square overflow-hidden bg-[#f3f4f6]">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs text-[#1f2937] truncate">{p.name}</p>
                <p className="text-sm font-bold text-[#1f2937]">₹{p.price.toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sticky golden bottom action bar */}
      <div
        className="fixed inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
        style={{ bottom: 0, animation: "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="max-w-md mx-auto px-4 pb-3">
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/98 to-[oklch(0.97_0.02_88)] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.45)] p-2.5 flex items-center gap-2"
            style={{ borderRadius: "24px" }}
          >
            <span
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 4s linear infinite",
              }}
            />
            {/* Inquiry now */}
            <button
              onClick={() => goChat("inquiry")}
              className="btn-3d relative flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-white to-[#fdf6dd] border border-[color:oklch(0.78_0.14_82/0.55)] active:scale-95"
              aria-label="Send inquiry"
            >
              <MessageCircle className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.4} />
              <span className="font-display text-[13px] text-gold-gradient font-bold italic tracking-tight">
                Enquiry now
              </span>
            </button>

            {/* Book now */}
            <button
              onClick={goBook}
              className="btn-3d relative flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gold-bar text-[color:oklch(0.13_0.06_18)] shadow-gold-glow active:scale-95"
              aria-label="Book now"
            >
              <Zap className="h-4 w-4" strokeWidth={2.6} />
              <span className="font-display text-[13px] font-bold italic tracking-tight">
                Book now
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
