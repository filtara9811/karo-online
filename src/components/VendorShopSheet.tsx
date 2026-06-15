import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, Star, ShieldCheck, ShoppingBasket, Search } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/products";
import { ProductDetailSheet } from "./ProductDetailSheet";

export type ShopVendor = {
  id: string;
  title: string;
  tagline: string;
  rating: number;
  reviews: number;
  avatar: string;
  hero: string;
};

const CATEGORIES = [
  { key: "fashion", label: "Fashion", emoji: "👗" },
  { key: "beauty", label: "Beauty", emoji: "💄" },
  { key: "grocery", label: "Grocery", emoji: "🛒" },
  { key: "electronics", label: "Electronics", emoji: "📺" },
  { key: "home", label: "Home", emoji: "🏠" },
  { key: "jewellery", label: "Jewellery", emoji: "💎" },
];

export function VendorShopSheet({
  vendor,
  open,
  onClose,
}: {
  vendor: ShopVendor | null;
  open: boolean;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");

  const list = query.trim()
    ? PRODUCTS.filter((p) =>
        (p.name + " " + p.tagline + " " + p.category)
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : PRODUCTS;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] p-0 h-[90vh] max-h-[90vh] overflow-hidden border-t border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-b from-white via-white to-[#fffaf0] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom duration-300"
        >
          {vendor && (
            <div className="relative h-full flex flex-col">
              {/* Top X */}
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 z-30 h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.72_0.01_260/0.5)] shadow active:scale-90"
              >
                <X className="h-4 w-4 text-[color:oklch(0.25_0.05_60)]" strokeWidth={2.6} />
              </button>

              {/* Scroll body */}
              <div className="flex-1 overflow-y-auto pb-6">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                  <img
                    src={vendor.avatar}
                    alt={vendor.title}
                    className="h-14 w-14 rounded-full object-cover border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)] font-bold">
                      Welcome
                    </p>
                    <h2 className="font-display text-base font-bold text-[color:oklch(0.22_0.04_60)] truncate">
                      {vendor.title}
                    </h2>
                    <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                      {vendor.tagline}
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="px-5">
                  <div className="flex items-center gap-2 px-4 h-12 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.45)] shadow-sm">
                    <Search className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search markets, brands..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:oklch(0.60_0.05_85)] text-[color:oklch(0.25_0.05_60)]"
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="px-5 mt-3">
                  <div className="grid grid-cols-4 rounded-full bg-gradient-to-r from-[#fffaf0] via-[#fff8dc] to-[#fffaf0] border border-[color:oklch(0.78_0.14_82/0.4)] py-2 px-3">
                    <Stat label="Rating" value={vendor.rating.toFixed(1)} starred />
                    <Stat label="Reviews" value={`${(vendor.reviews / 1000).toFixed(1)}k`} />
                    <Stat label="Happy" value="98%" />
                    <Stat label="Service" value="A+" />
                  </div>
                </div>

                {/* Categories */}
                <div className="px-5 mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_60)]">
                      Categories
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[color:oklch(0.55_0.10_82)]">
                      Explore ›
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.key}
                        className="flex-shrink-0 flex flex-col items-center gap-1.5"
                      >
                        <span className="h-14 w-14 rounded-full bg-gradient-to-b from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center text-2xl shadow-sm">
                          {c.emoji}
                        </span>
                        <span className="text-[10px] font-bold text-[color:oklch(0.30_0.05_85)]">
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner */}
                <div className="px-5 mt-5">
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-[#fff8dc] via-[#fdf3c8] to-[#f5d97a] border border-[color:oklch(0.78_0.14_82/0.45)] shadow-inner grid place-items-center">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[color:oklch(0.45_0.10_82)]">
                        ✦ Featured ✦
                      </p>
                      <p className="font-display text-lg font-bold text-gold-gradient">
                        Shop the Collection
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommended */}
                <div className="px-5 mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_60)]">
                      Recommended <span className="font-light italic">| for you</span>
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[color:oklch(0.55_0.10_82)]">
                      See All ›
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {list.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProduct(p)}
                        className="text-left rounded-2xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-[0.97] transition"
                      >
                        <div className="relative aspect-square bg-gradient-to-b from-[#fff8dc] to-[#fdf3c8]">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          {p.badge && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[9px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider shadow">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          <h4 className="font-display text-[12px] font-bold text-[color:oklch(0.25_0.05_60)] truncate">
                            {p.name}
                          </h4>
                          <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                            {p.tagline}
                          </p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="font-display text-sm text-gold-gradient font-bold">
                              ₹{p.price.toLocaleString()}
                            </span>
                            {p.mrp > p.price && (
                              <span className="text-[9px] line-through text-[color:oklch(0.55_0.05_85)]">
                                ₹{p.mrp.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
                            <span className="text-[9px] font-bold text-[color:oklch(0.30_0.05_85)]">
                              {p.rating}
                            </span>
                            <span className="text-[9px] text-[color:oklch(0.55_0.10_82)]">
                              ({p.reviews})
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Nested product detail sheet */}
      <ProductDetailSheet
        product={product}
        open={!!product}
        onClose={() => setProduct(null)}
      />
    </>
  );
}

function Stat({ label, value, starred }: { label: string; value: string; starred?: boolean }) {
  return (
    <div className="text-center">
      <p className="font-display text-sm font-bold text-[color:oklch(0.30_0.05_60)] flex items-center justify-center gap-0.5">
        {starred && <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />}
        {value}
      </p>
      <p className="text-[8px] uppercase tracking-wider font-bold text-[color:oklch(0.55_0.10_82)]">
        {label}
      </p>
    </div>
  );
}
