import { Search, Star, ShieldCheck, BadgeCheck, MapPin, MessageCircle } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/products";
import type { FeedVendor } from "./VendorFeedCard";

/**
 * Boutique-style shop view rendered INSIDE a StackedSheet (no own header bar — sheet provides X).
 * Tapping a product calls onOpenProduct so caller can push ProductOverlay on top.
 */
export function ShopOverlay({
  vendor,
  onOpenProduct,
  onInquiry,
}: {
  vendor: FeedVendor;
  onOpenProduct: (productId: string) => void;
  onInquiry: () => void;
}) {
  return (
    <div className="pb-32">
      {/* Awning header */}
      <div className="relative h-12 w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, #dc2626 0 28px, #ffffff 28px 56px, #991b1b 56px 84px, #fff 84px 112px)",
          }}
        />
        <svg className="absolute bottom-0 left-0 right-0 w-full h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d="M0,0 Q5,10 10,0 T20,0 T30,0 T40,0 T50,0 T60,0 T70,0 T80,0 T90,0 T100,0 V10 H0 Z" fill="#fff" />
        </svg>
      </div>

      {/* Hero — vendor showcase image */}
      <div className="relative w-full aspect-[16/9] bg-[#f5f5f5] overflow-hidden">
        <img src={vendor.heroImage} alt={vendor.shopName} className="h-full w-full object-cover" />
        <button
          aria-label="Search in shop"
          className="absolute top-3 right-12 h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-black/10 shadow-md active:scale-90"
        >
          <Search className="h-4 w-4 text-[#1f2937]" strokeWidth={2.4} />
        </button>
      </div>

      {/* Vendor identity strip */}
      <section className="px-4 -mt-8 relative z-10">
        <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-3 shadow-[0_6px_18px_-8px_rgba(212,175,55,0.4)]">
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#d4af37] shrink-0">
              <img src={vendor.vendorAvatar} alt="" className="h-full w-full object-cover" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl text-gold-gradient font-bold leading-tight truncate">
                {vendor.shopName}
              </h2>
              <p className="text-[11px] text-[#6b7280] truncate">{vendor.tagline}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6b7280]">
                <MapPin className="h-3 w-3" /> {vendor.area}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff8dc] border border-[color:oklch(0.78_0.14_82/0.5)]">
              <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
              <span className="text-[11px] font-bold text-[#1f2937]">{vendor.rating.toFixed(1)}</span>
              <span className="text-[10px] text-[#6b7280]">· {vendor.reviews}</span>
            </span>
            {vendor.trusted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                <BadgeCheck className="h-3 w-3" /> Trusted
              </span>
            )}
            {vendor.assured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
                <ShieldCheck className="h-3 w-3" /> Assured
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Products grid */}
      <section className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-display text-base text-gold-gradient font-bold">In the shop</h3>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)]">
            {PRODUCTS.length} items
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((p) => (
            <ProductTile key={p.id} product={p} onClick={() => onOpenProduct(p.id)} />
          ))}
        </div>
      </section>

      {/* Sticky inquiry CTA */}
      <div className="fixed inset-x-0 bottom-0 px-4 py-3 bg-gradient-to-t from-white via-white to-white/0 pointer-events-none">
        <button
          onClick={onInquiry}
          className="pointer-events-auto w-full max-w-md mx-auto flex items-center justify-center gap-2 py-3 rounded-full bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-bold shadow-gold-glow active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
          Send Inquiry to {vendor.vendorLabel ?? "Vendor"}
        </button>
      </div>
    </div>
  );
}

function ProductTile({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)] shadow-sm active:scale-[0.97] transition"
    >
      <div className="relative aspect-square bg-[#f3f4f6] overflow-hidden">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        {product.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[9px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider shadow">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-2">
        <h4 className="text-xs font-semibold text-[#1f2937] truncate">{product.name}</h4>
        <p className="text-[10px] text-[#6b7280] truncate">{product.tagline}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-display text-sm text-gold-gradient font-bold">
            ₹{product.price.toLocaleString()}
          </span>
          <span className="text-[9px] text-[#6b7280] line-through">₹{product.mrp.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-0.5 mt-0.5">
          <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
          <span className="text-[10px] font-semibold">{product.rating}</span>
          <span className="text-[10px] text-[#6b7280]">({product.reviews})</span>
        </div>
      </div>
    </button>
  );
}
