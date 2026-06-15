import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { X, Star, Search, Share2 } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/products";
import { ProductDetailSheet } from "./ProductDetailSheet";
import { buildShopDeepLink, shareLink } from "@/lib/share";
import { toast } from "sonner";

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

const SNAP_POINTS = [0.78, 0.97] as const;

export function VendorShopSheet({
  vendor,
  open,
  onClose,
  initialProductId,
}: {
  vendor: ShopVendor | null;
  open: boolean;
  onClose: () => void;
  initialProductId?: string;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);

  // Auto-open a product when a deep link supplies productId
  useEffect(() => {
    if (open && initialProductId) {
      const p = PRODUCTS.find((x) => x.id === initialProductId);
      if (p) setProduct(p);
    }
  }, [open, initialProductId]);

  const handleShare = async () => {
    if (!vendor) return;
    const url = buildShopDeepLink(vendor.id);
    const r = await shareLink({
      title: vendor.title,
      text: `Check out ${vendor.title} on Karo Online — ${vendor.tagline}`,
      url,
    });
    if (r === "copied") toast.success("Shop link copied to clipboard");
    if (r === "failed") toast.error("Could not share link");
  };

  const list = query.trim()
    ? PRODUCTS.filter((p) =>
        (p.name + " " + p.tagline + " " + p.category)
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : PRODUCTS;

  return (
    <>
      <Drawer.Root
        open={open}
        onOpenChange={(o) => !o && onClose()}
        snapPoints={[...SNAP_POINTS]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[97vh] max-w-md flex-col rounded-t-[28px] border-t border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-b from-white via-white to-[#fffaf0] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.45)] outline-none"
          >
            <Drawer.Title className="sr-only">{vendor?.title ?? "Vendor shop"}</Drawer.Title>

            {/* Drag handle */}
            <div className="relative pt-2 pb-1 flex items-center justify-center">
              <div className="h-1.5 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.55)]" />
            </div>

            {/* Fixed top-right controls: Share + Close */}
            <div className="absolute top-3 right-3 z-30 flex gap-2">
              <button
                onClick={handleShare}
                aria-label="Share shop"
                className="h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.72_0.01_260/0.4)] shadow active:scale-90"
              >
                <Share2 className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.72_0.01_260/0.5)] shadow active:scale-90"
              >
                <X className="h-4 w-4 text-[color:oklch(0.25_0.05_60)]" strokeWidth={2.6} />
              </button>
            </div>

            {vendor && (
              <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
                {/* Header */}
                <div className="px-5 pt-3 pb-3 flex items-center gap-3">
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

                {/* Stats */}
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
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <ProductDetailSheet
        product={product}
        vendorId={vendor?.id}
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
