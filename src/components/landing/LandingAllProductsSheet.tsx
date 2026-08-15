import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Tag, Star } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { resolveCta } from "./product-cta";

/**
 * Full-screen catalog of every product this merchant has attached to any video,
 * sorted A–Z, with a quick search — an Instagram-store style browse view.
 */
export function LandingAllProductsSheet({
  open,
  products,
  accent,
  shopName,
  phone,
  onClose,
  onOpen,
  onCta,
}: {
  open: boolean;
  products: VideoProduct[];
  accent: string;
  shopName: string;
  phone?: string | null;
  onClose: () => void;
  onOpen: (p: VideoProduct) => void;
  onCta?: (p: VideoProduct) => void;
}) {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const seen = new Set<string>();
    const unique = products.filter((p) => {
      const key = p.id || p.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const needle = q.trim().toLowerCase();
    return unique
      .filter((p) => !needle || p.name?.toLowerCase().includes(needle))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
  }, [products, q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 top-0 flex flex-col bg-white"
          >
            <header className="flex items-center gap-2 border-b border-slate-100 px-4 pb-3 pt-[env(safe-area-inset-top)]">
              <div className="min-w-0 flex-1 pt-3">
                <h2 className="truncate text-[15px] font-extrabold text-slate-900">All products</h2>
                <p className="truncate text-[11px] text-slate-500">{shopName} · {list.length} items</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close catalog"
                className="mt-3 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </header>

            <div className="px-4 py-2">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products"
                  className="h-10 w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
              {list.length === 0 ? (
                <p className="py-16 text-center text-[13px] text-slate-400">No products yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {list.map((p) => {
                    const cta = resolveCta(p, { shopName, phone });
                    return (
                      <article key={p.id || p.name} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <button onClick={() => onOpen(p)} className="block w-full text-left">
                          <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                            {p.image ? (
                              <img
                                src={optimizedImage(p.image, IMG.tile) ?? p.image}
                                alt={p.name}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <span className="grid h-full w-full place-items-center text-slate-300">
                                <Tag className="h-6 w-6" />
                              </span>
                            )}
                          </div>
                          <div className="px-2.5 pt-2">
                            <h5 className="truncate text-[12.5px] font-bold text-slate-900">{p.name}</h5>
                            <div className="mt-0.5 flex items-baseline gap-1">
                              <span className="text-[12.5px] font-extrabold text-slate-900">{p.price || "Ask price"}</span>
                              {p.mrp && <span className="text-[10px] font-semibold text-slate-400 line-through">{p.mrp}</span>}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" style={{ color: accent }} />
                              <span className="text-[10px] font-bold text-slate-600">{p.rating ?? 4.8}</span>
                            </div>
                          </div>
                        </button>
                        <a
                          href={cta.href}
                          target={cta.external ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={() => onCta?.(p)}
                          className="mx-2.5 mb-2.5 mt-2 flex h-[30px] items-center justify-center rounded-xl text-[11.5px] font-extrabold text-white active:scale-[0.98]"
                          style={{ background: cta.color }}
                        >
                          {cta.label}
                        </a>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
