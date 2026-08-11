import { AnimatePresence, motion } from "framer-motion";
import { X, MessageCircle, ExternalLink, Star, Tag } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { normalizeUrl } from "./landing-shared";

/** Product detail sheet with Enquiry + Buy actions. */
export function LandingProductSheet({
  product,
  accent,
  shopName,
  phone,
  onClose,
}: {
  product: VideoProduct | null;
  accent: string;
  shopName: string;
  phone?: string;
  onClose: () => void;
}) {
  const waDigits = (phone ?? "").replace(/\D/g, "").slice(-10);
  const enquiryText = product
    ? (product.enquiry?.trim() || `Hi ${shopName}, mujhe "${product.name}" ke baare me jaankari chahiye.`)
    : "";
  const waUrl = waDigits.length === 10
    ? `https://wa.me/91${waDigits}?text=${encodeURIComponent(enquiryText)}`
    : null;
  const buyUrl = product?.url?.trim() ? normalizeUrl(product.url) : null;

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-end bg-black/60 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)]"
          >
            <div className="relative h-[46vh] w-full shrink-0 bg-slate-100">
              {product.image ? (
                <img
                  src={optimizedImage(product.image, IMG.hero) ?? product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
              <div className="flex items-start gap-3">
                <h3 className="min-w-0 flex-1 font-display text-[18px] font-bold text-slate-900">{product.name}</h3>
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                  <Star className="h-3 w-3 fill-current" style={{ color: accent }} />
                  {product.rating ?? 4.8}
                </span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold" style={{ color: accent }}>
                {product.price || "Price on enquiry"}
              </p>
              {product.description && (
                <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-slate-600">
                  {product.description}
                </p>
              )}
              <p className="mt-3 text-[11px] text-slate-400">{shopName}</p>
            </div>

            <div className="flex gap-2 border-t border-black/5 px-4 py-3">
              <a
                href={waUrl ?? `tel:${phone ?? ""}`}
                target={waUrl ? "_blank" : undefined}
                rel="noreferrer"
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 text-[13px] font-extrabold active:scale-[0.98]"
                style={{ borderColor: accent, color: accent }}
              >
                <MessageCircle className="h-4 w-4" /> Enquiry
              </a>
              {buyUrl && (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-2xl text-[13px] font-extrabold text-white shadow-lg active:scale-[0.98]"
                  style={{ background: accent, boxShadow: `0 10px 24px -12px ${accent}` }}
                >
                  <ExternalLink className="h-4 w-4" /> Buy now
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
