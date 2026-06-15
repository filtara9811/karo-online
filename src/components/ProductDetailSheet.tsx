import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Drawer } from "vaul";
import { X, Star, MessageCircle, Zap, Heart, Share2, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/products";
import { buildShopDeepLink, shareLink } from "@/lib/share";
import { toast } from "sonner";

const SNAP_POINTS = [0.78, 0.97] as const;

export function ProductDetailSheet({
  product,
  open,
  onClose,
  vendorId,
  bookLabel = "Book now",
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  vendorId?: string;
  bookLabel?: "Book now" | "Buy now";
}) {
  const navigate = useNavigate();
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);

  const handleShare = async () => {
    if (!product) return;
    const url = buildShopDeepLink(vendorId ?? "shop", product.id);
    const r = await shareLink({
      title: product.name,
      text: `${product.name} — ₹${product.price.toLocaleString()} on Karo Online`,
      url,
    });
    if (r === "copied") toast.success("Product link copied to clipboard");
    if (r === "failed") toast.error("Could not share link");
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => !o && onClose()}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[97vh] max-w-md flex-col rounded-t-[28px] border-t border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-b from-white via-white to-[#fffaf0] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.45)] outline-none"
        >
          <Drawer.Title className="sr-only">{product?.name ?? "Product details"}</Drawer.Title>

          {/* Drag handle */}
          <div className="relative pt-2 pb-1 flex items-center justify-center">
            <div className="h-1.5 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.55)]" />
          </div>

          {/* Fixed top-right controls */}
          <div className="absolute top-3 right-3 z-30 flex gap-2">
            <button
              onClick={handleShare}
              aria-label="Share"
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

          {product && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Scroll body */}
              <div className="flex-1 overflow-y-auto overscroll-contain pb-28">
                {/* Hero image */}
                <div className="relative h-72 w-full bg-gradient-to-b from-[#fff8dc] to-[#fdf3c8]">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  <button
                    aria-label="Like"
                    className="absolute top-3 left-3 h-9 w-9 grid place-items-center rounded-full bg-white/95 shadow active:scale-90"
                  >
                    <Heart className="h-4 w-4 text-[color:oklch(0.45_0.18_25)]" />
                  </button>
                  {product.badge && (
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider">
                      {product.badge}
                    </span>
                  )}
                </div>

                <div className="px-5 pt-4 space-y-4">
                  <div>
                    <h2 className="font-display text-xl text-[color:oklch(0.22_0.04_60)] font-bold leading-tight">
                      {product.name}
                    </h2>
                    <p className="text-xs text-[color:oklch(0.45_0.05_85)] mt-1">{product.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl text-gold-gradient font-bold">
                      ₹{product.price.toLocaleString()}
                    </span>
                    {product.mrp > product.price && (
                      <>
                        <span className="text-sm line-through text-[color:oklch(0.55_0.05_85)]">
                          ₹{product.mrp.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.45)] text-[11px] font-bold text-[color:oklch(0.40_0.10_82)]">
                      <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
                      {product.rating} ({product.reviews})
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] font-bold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" />
                      Trusted
                    </span>
                  </div>

                  {product.variations && product.variations.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-[color:oklch(0.45_0.05_85)] mb-1.5">
                        Variations
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {product.variations.map((v) => (
                          <span
                            key={v.value}
                            className="px-3 py-1.5 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] text-[11px] font-semibold text-[color:oklch(0.30_0.05_85)]"
                          >
                            {v.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-bold text-[color:oklch(0.45_0.05_85)] mb-1.5">
                      About this product
                    </p>
                    <p className="text-sm text-[color:oklch(0.30_0.05_85)] leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-[#fffaf0] to-[#fff3d6] border border-[color:oklch(0.78_0.14_82/0.35)] p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[color:oklch(0.45_0.10_82)]">
                      Sold by
                    </p>
                    <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_60)]">
                      {product.seller}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky action bar */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-white/95 backdrop-blur border-t border-[color:oklch(0.78_0.14_82/0.4)] flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate({
                      to: "/chat",
                      search: {
                        productId: product.id,
                        productName: product.name,
                        productImage: product.image,
                        productPrice: product.price,
                        mode: "inquiry",
                      } as never,
                    });
                  }}
                  className="flex-1 h-12 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.7)] text-[color:oklch(0.30_0.05_85)] font-display font-bold italic flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enquiry now
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate({
                      to: "/checkout",
                      search: { productId: product.id } as never,
                    });
                  }}
                  className="flex-1 h-12 rounded-full bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] border border-[color:oklch(0.78_0.14_82/0.7)] text-[color:oklch(0.20_0.05_60)] shadow-[0_6px_20px_-6px_rgba(212,175,55,0.7)] font-display font-bold italic flex items-center justify-center gap-2 active:scale-95"
                >
                  <Zap className="h-4 w-4" />
                  {bookLabel}
                </button>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
