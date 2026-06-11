import { useState } from "react";
import { Star, ChevronDown, Award, ShieldCheck, Truck, Check, MessageCircle, Zap, Share2 } from "lucide-react";
import { getProduct, PRODUCTS, type Product } from "@/lib/products";
import { useNavigate } from "@tanstack/react-router";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";

const COLOR_VARIATIONS = [
  { id: "red", label: "Red", swatch: "#dc2626" },
  { id: "white", label: "White", swatch: "#f8fafc" },
  { id: "gold", label: "Gold", swatch: "#d4af37" },
  { id: "black", label: "Black", swatch: "#111827" },
];
const SIZE_VARIATIONS = ["S", "M", "L", "XL"];

const REVIEWS = [
  { name: "Aryan Bansal", avatar: avatarAryan, rating: 5, text: "Premium quality! Packaging was elegant and delivery was super fast.", time: "2 days ago" },
  { name: "Rani Kumari", avatar: avatarRani, rating: 5, text: "Loved the finish and the gold tones. Exactly as shown in photos.", time: "1 week ago" },
  { name: "Raj Kumar", avatar: avatarRaj, rating: 4, text: "Solid product, vendor was responsive on chat.", time: "2 weeks ago" },
  { name: "Ashu Qureshi", avatar: avatarUser, rating: 5, text: "Best in class. The maison really delivers on the premium promise.", time: "3 weeks ago" },
];

function buildBulkTiers(price: number) {
  return [
    { qty: "Min. order: 20 pieces", price: Math.round(price * 1.0) },
    { qty: "200-999 pieces", price: Math.round(price * 0.95) },
    { qty: "1,000-9,999 pieces", price: Math.round(price * 0.9) },
  ];
}

/**
 * Product detail view rendered INSIDE a StackedSheet. Sheet provides its own X close button.
 */
export function ProductOverlay({ productId, onInquiry }: { productId: string; onInquiry?: () => void }) {
  const product = getProduct(productId) ?? PRODUCTS[0];
  const navigate = useNavigate();
  const [tab, setTab] = useState<"photos" | "reviews" | "highlights" | "specs">("photos");
  const [color, setColor] = useState(COLOR_VARIATIONS[0].id);
  const [size, setSize] = useState(SIZE_VARIATIONS[1]);
  const [qty, setQty] = useState(20);

  const tiers = buildBulkTiers(product.price);
  const recommended: Product[] = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  const goBook = () => navigate({ to: "/cart" });

  return (
    <div className="pb-32 bg-white">
      {/* Hero image */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-[#cfe7ee] to-[#a8d4e0]">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <div className="absolute bottom-3 left-3 right-16 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "photos", label: "Photos 1/6" },
            { id: "reviews", label: "Reviews" },
            { id: "highlights", label: "Highlights" },
            { id: "specs", label: "Dimensions" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
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
            <div key={i} className={`px-3 py-3.5 ${i < 2 ? "border-r border-white" : ""} ${i === 0 ? "bg-[#eef0f3]" : ""}`}>
              <p className="font-bold text-[#1f2937] text-base leading-tight">₹{t.price.toLocaleString()}</p>
              <p className="text-[10px] text-[#6b7280] mt-1 leading-tight">{t.qty}</p>
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
          <span className="px-2 py-1 rounded bg-[#fef3c7] text-[11px] text-[#92400e] font-medium">Certificates: CE, …</span>
          <span className="px-2 py-1 rounded bg-[#fef3c7] text-[11px] text-[#92400e] font-medium flex items-center gap-1">
            <Award className="h-3 w-3" /> #3 in {product.category}
          </span>
        </div>
      </section>

      <div className="my-3 h-2 bg-[#f3f4f6]" />

      {/* Variations */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#1f2937]">Color</h3>
          <span className="text-[11px] text-[#6b7280]">
            Selected: <span className="font-semibold text-[#1f2937]">{COLOR_VARIATIONS.find((c) => c.id === color)?.label}</span>
          </span>
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

        <div className="mt-4 flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#1f2937]">Size / Pack</h3>
          <span className="text-[11px] text-[#6b7280]">
            Selected: <span className="font-semibold text-[#1f2937]">{size}</span>
          </span>
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
                    ? "border-[#d4af37] bg-gradient-to-b from-[#fff8dc] to-[#fdf3c8] text-[#92400e]"
                    : "border-[#e5e7eb] bg-white text-[#374151]"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

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

      {/* Description */}
      <section className="px-4">
        <h3 className="text-sm font-bold text-[#1f2937] mb-2">Description</h3>
        <p className="text-[13px] text-[#374151] leading-relaxed">{product.description}</p>
      </section>

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
        <div className="space-y-3">
          {REVIEWS.slice(0, 2).map((r, i) => (
            <article key={i} className="rounded-xl border border-[#e5e7eb] p-3 bg-white">
              <div className="flex items-center gap-2.5">
                <img src={r.avatar} alt={r.name} className="h-9 w-9 rounded-full object-cover" />
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
            <div key={p.id} className="flex-shrink-0 w-32 rounded-xl overflow-hidden bg-white border border-[#e5e7eb]">
              <div className="aspect-square overflow-hidden bg-[#f3f4f6]">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs text-[#1f2937] truncate">{p.name}</p>
                <p className="text-sm font-bold text-[#1f2937]">₹{p.price.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="max-w-md mx-auto px-3 pb-3">
          <div className="pointer-events-auto rounded-3xl bg-white/98 border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_-8px_28px_-8px_rgba(212,175,55,0.45)] p-2 flex items-center gap-2">
            <button
              onClick={onInquiry}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-br from-white to-[#fdf6dd] border border-[color:oklch(0.78_0.14_82/0.55)] active:scale-95"
            >
              <MessageCircle className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.4} />
              <span className="font-display text-[13px] text-gold-gradient font-bold italic">Enquiry now</span>
            </button>
            <button
              onClick={goBook}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gold-bar text-[color:oklch(0.13_0.06_18)] shadow-gold-glow active:scale-95"
            >
              <Zap className="h-4 w-4" strokeWidth={2.6} />
              <span className="font-display text-[13px] font-bold italic">Book now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
