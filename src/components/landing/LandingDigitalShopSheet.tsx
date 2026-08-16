import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Tag, Star, Share2, ChevronRight, Store, ShoppingBag } from "lucide-react";
import type { VideoProduct, LandingStats } from "@/lib/landing-types";
import { optimizedImage, IMG } from "@/lib/img";
import { resolveCta } from "./product-cta";
import type { DockTile } from "./LandingCategoryDock";

function fmt(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/**
 * Merchant "Digital Shop" — a full-height storefront sheet on the shopper
 * landing page: identity header, search, thin stats strip, collection chips,
 * featured banner and a recommended grid of the merchant's real products.
 */
export function LandingDigitalShopSheet({
  open,
  products,
  accent,
  shopName,
  shopCategory,
  avatarUrl,
  coverUrl,
  phone,
  stats,
  shopLinks = [],
  onClose,
  onOpen,
  onCta,
  onShare,
}: {
  open: boolean;
  products: VideoProduct[];
  accent: string;
  shopName: string;
  shopCategory?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  phone?: string | null;
  stats?: LandingStats | null;
  shopLinks?: DockTile[];
  onClose: () => void;
  onOpen: (p: VideoProduct) => void;
  onCta?: (p: VideoProduct) => void;
  onShare?: () => void;
}) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<string>("all");

  const unique = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((p) => {
      const key = p.id || p.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [products]);

  const chips = useMemo(() => {
    const set = new Set<string>();
    for (const p of unique) if (p.badge) set.add(p.badge);
    return ["all", ...Array.from(set)];
  }, [unique]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return unique
      .filter((p) => (chip === "all" ? true : p.badge === chip))
      .filter((p) => !needle || (p.name ?? "").toLowerCase().includes(needle))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
  }, [unique, q, chip]);

  const featured = unique.find((p) => p.image) ?? null;

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
            className="absolute inset-x-0 bottom-0 top-0 mx-auto flex max-w-md flex-col bg-gradient-to-b from-white via-white to-slate-50"
          >
            {/* Identity header */}
            <header className="flex items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+12px)]">
              {avatarUrl ? (
                <img
                  src={optimizedImage(avatarUrl, IMG.avatarSm) ?? avatarUrl}
                  alt={shopName}
                  className="h-12 w-12 shrink-0 rounded-full border-2 object-cover"
                  style={{ borderColor: accent }}
                />
              ) : (
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white"
                  style={{ background: accent }}
                >
                  <Store className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>
                  Welcome
                </p>
                <h2 className="truncate text-[15px] font-extrabold text-slate-900">{shopName}</h2>
                <p className="truncate text-[10.5px] text-slate-500">{shopCategory || "Digital shop"}</p>
              </div>
              {onShare && (
                <button
                  onClick={onShare}
                  aria-label="Share shop"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close shop"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Search */}
            <div className="px-4">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products, brands"
                  className="h-11 w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Thin stats strip */}
            {stats && (
              <div className="mx-4 mt-2.5 flex items-center justify-between gap-1 rounded-full bg-slate-100/80 px-3 py-1.5">
                <Stat label="Views" value={fmt(stats.views)} />
                <Stat label="Inquiries" value={fmt(stats.inquiries)} />
                <Stat label="Orders" value={fmt(stats.orders)} />
                <Stat label="Products" value={String(unique.length)} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+24px)]">
              {/* Collections / shop links */}
              {(chips.length > 1 || shopLinks.length > 0) && (
                <div className="mt-3 px-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Collections</p>
                    <span className="flex items-center text-[11px] font-bold" style={{ color: accent }}>
                      Explore <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {chips.map((c) => (
                      <button
                        key={c}
                        onClick={() => setChip(c)}
                        className="flex w-[64px] shrink-0 flex-col items-center gap-1"
                      >
                        <span
                          className="grid h-14 w-14 place-items-center rounded-full border-2 text-[11px] font-extrabold"
                          style={{
                            borderColor: chip === c ? accent : "rgb(226 232 240)",
                            background: chip === c ? accent : "#fff",
                            color: chip === c ? "#fff" : accent,
                          }}
                        >
                          {c === "all" ? <ShoppingBag className="h-5 w-5" /> : c.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="w-full truncate text-center text-[10px] font-semibold text-slate-600">
                          {c === "all" ? "All" : c}
                        </span>
                      </button>
                    ))}
                    {shopLinks.map((t) => (
                      <a
                        key={t.id}
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-[64px] shrink-0 flex-col items-center gap-1"
                      >
                        <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-slate-200 bg-white text-slate-500">
                          <Store className="h-5 w-5" />
                        </span>
                        <span className="w-full truncate text-center text-[10px] font-semibold text-slate-600">
                          {t.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured banner */}
              {(coverUrl || featured?.image) && (
                <div className="mx-4 mt-3 overflow-hidden rounded-2xl shadow-sm">
                  <div className="relative h-[132px] w-full bg-slate-100">
                    <img
                      src={
                        optimizedImage(coverUrl ?? featured?.image ?? "", IMG.tile) ??
                        (coverUrl ?? featured?.image ?? "")
                      }
                      alt={`${shopName} collection`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                    <div className="absolute inset-x-3 bottom-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Featured</p>
                      <p className="text-[15px] font-extrabold text-white">Shop the Collection</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended grid */}
              <div className="mt-4 flex items-center justify-between px-4">
                <p className="text-[12.5px] font-extrabold text-slate-900">Recommended for you</p>
                <span className="text-[11px] font-semibold text-slate-500">{list.length} items</span>
              </div>

              <div className="px-4 pt-2">
                {list.length === 0 ? (
                  <p className="py-16 text-center text-[13px] text-slate-400">
                    Products coming soon — the shop is being set up.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {list.map((p) => {
                      const cta = resolveCta(p, { shopName, phone });
                      return (
                        <article
                          key={p.id || p.name}
                          className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                        >
                          <button onClick={() => onOpen(p)} className="block w-full text-left">
                            <div className="product-thumb-frame h-[128px]">
                              {p.image ? (
                                <img
                                  src={optimizedImage(p.image, IMG.tile) ?? p.image}
                                  alt={p.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="product-thumb-image"
                                />
                              ) : (
                                <span className="grid h-full w-full place-items-center text-slate-300">
                                  <Tag className="h-6 w-6" />
                                </span>
                              )}
                              {p.badge && (
                                <span
                                  className="absolute right-0 top-2 rounded-l-md px-1.5 py-0.5 text-[8.5px] font-extrabold text-white shadow"
                                  style={{ background: accent }}
                                >
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <div className="px-2.5 pt-2">
                              <h5 className="truncate text-[12.5px] font-bold text-slate-900">{p.name}</h5>
                              <div className="mt-0.5 flex items-baseline gap-1">
                                <span className="text-[12.5px] font-extrabold text-slate-900">
                                  {p.price || "Ask price"}
                                </span>
                                {p.mrp && (
                                  <span className="text-[10px] font-semibold text-slate-400 line-through">{p.mrp}</span>
                                )}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center leading-none">
      <span className="text-[11.5px] font-extrabold text-slate-900">{value}</span>
      <span className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    </span>
  );
}
