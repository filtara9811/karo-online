import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, MessageCircle, ShoppingBag, Star, Tag, Minus, Plus, ExternalLink } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { normalizeUrl } from "./landing-shared";

/** Full product detail sheet with Inquiry (in-app chat) + Order actions. */
export function LandingProductSheet({
  product,
  accent,
  shopName,
  onClose,
  onInquiry,
  onOrder,
  busy,
}: {
  product: VideoProduct | null;
  accent: string;
  shopName: string;
  onClose: () => void;
  onInquiry: (product: VideoProduct, quantity: number) => void;
  onOrder: (product: VideoProduct, quantity: number) => void;
  busy?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const buyUrl = product?.url?.trim() ? normalizeUrl(product.url) : null;

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-end bg-black/60"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex max-h-[92svh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)]"
          >
            <div className="relative h-[42vh] w-full shrink-0 bg-slate-100">
              {product.image ? (
                <img
                  src={optimizedImage(product.image, IMG.hero) ?? product.image}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-slate-400"><Tag className="h-8 w-8" /></span>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 [-webkit-overflow-scrolling:touch]">
              <div className="flex items-start gap-3">
                <h3 className="min-w-0 flex-1 font-display text-[18px] font-bold text-slate-900">{product.name}</h3>
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                  <Star className="h-3 w-3 fill-current" style={{ color: accent }} />
                  {product.rating ?? 4.8}
                  {product.reviews ? <span className="ml-0.5 text-slate-400">({product.reviews})</span> : null}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-[20px] font-extrabold" style={{ color: accent }}>
                  {product.price || "Price on enquiry"}
                </p>
                {product.mrp && <span className="text-[13px] font-semibold text-slate-400 line-through">{product.mrp}</span>}
              </div>
              {product.quantity ? (
                <p className="mt-1 text-[11.5px] font-bold text-emerald-600">{product.quantity} in stock</p>
              ) : null}

              <div className="mt-3 flex items-center gap-3">
                <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">Qty</span>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-sm active:scale-90">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-6 text-center text-[14px] font-extrabold">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} aria-label="Increase" className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-sm active:scale-90">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-slate-600">
                  {product.description}
                </p>
              )}
              {buyUrl && (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold"
                  style={{ color: accent }}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View product link
                </a>
              )}
              <p className="mt-3 text-[11px] text-slate-400">{shopName}</p>
            </div>

            <div className="flex gap-2 border-t border-black/5 px-4 py-3">
              <button
                onClick={() => onInquiry(product, qty)}
                disabled={busy}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 text-[13px] font-extrabold active:scale-[0.98] disabled:opacity-60"
                style={{ borderColor: accent, color: accent }}
              >
                <MessageCircle className="h-4 w-4" /> Inquiry
              </button>
              <button
                onClick={() => onOrder(product, qty)}
                disabled={busy}
                className="flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-2xl text-[13px] font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
                style={{ background: accent, boxShadow: `0 10px 24px -12px ${accent}` }}
              >
                <ShoppingBag className="h-4 w-4" /> Order
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
