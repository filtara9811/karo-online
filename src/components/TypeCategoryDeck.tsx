import { motion, AnimatePresence } from "framer-motion";
import { Star, ShieldCheck, Users, MapPin, Sparkles, Send, ChevronRight, Wrench, Package, Layers } from "lucide-react";

export type DeckCategory = {
  id: string;
  name: string;
  image_url: string | null;
  icon?: string | null;
  parent_id: string | null;
};

export type DeckItem = { id: string; name: string; image_url: string | null };

export type DeckTypeCode = "service" | "product" | "other";

const TYPE_TABS: { code: DeckTypeCode; label: string; sub: string }[] = [
  { code: "service", label: "Sarvice", sub: "Taype" },
  { code: "product", label: "Products", sub: "taype" },
  { code: "other", label: "Other", sub: "Taype" },
];

function isEmojiLike(s: string | null | undefined): boolean {
  if (!s) return false;
  if (s.startsWith("http")) return false;
  return [...s].length <= 4 && !/\s/.test(s);
}

function Thumb({ cat, className }: { cat: DeckCategory; className?: string }) {
  const url = cat.image_url && cat.image_url.startsWith("http") ? cat.image_url : null;
  if (url) return <img src={url} alt={cat.name} loading="lazy" className={`h-full w-full object-cover ${className ?? ""}`} />;
  if (isEmojiLike(cat.image_url)) return <span className="text-4xl">{cat.image_url}</span>;
  if (isEmojiLike(cat.icon)) return <span className="text-4xl">{cat.icon}</span>;
  return <Wrench className="h-8 w-8 text-orange-400" />;
}

/**
 * Left = fixed Type rail (Service / Product / Other).
 * Right = one horizontally-scrolling deck of overlapping cards per root category.
 */
export function TypeCategoryDeck({
  typeCode,
  onTypeChange,
  rootCats,
  subsByRoot,
  itemsBySub,
  variationBySub,
  submittingId,
  onOpenSub,
  onFindVendor,
  onViewAll,
}: {
  typeCode: DeckTypeCode;
  onTypeChange: (t: DeckTypeCode) => void;
  rootCats: DeckCategory[];
  subsByRoot: Map<string, DeckCategory[]>;
  itemsBySub: Map<string, DeckItem[]>;
  variationBySub: Record<string, string>;
  submittingId: string | null;
  onOpenSub: (sub: DeckCategory) => void;
  onFindVendor: (sub: DeckCategory) => void;
  onViewAll: (root: DeckCategory) => void;
}) {
  return (
    <div className="flex gap-2 pl-1.5 pr-1">
      {/* ---------------- Fixed left TYPE rail ---------------- */}
      <div className="shrink-0 w-[54px] sticky top-1 self-start z-20">
        <div className="flex flex-col gap-2 rounded-3xl bg-white/85 backdrop-blur-xl border border-orange-100 p-1.5 shadow-[0_12px_28px_-16px_rgba(0,0,0,0.35)]">
          {TYPE_TABS.map(({ code, label, sub }) => {
            const active = typeCode === code;
            return (
              <motion.button
                key={code}
                whileTap={{ scale: 0.92 }}
                onClick={() => onTypeChange(code)}
                className={`relative h-[70px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? "text-white" : "text-slate-600"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="deck-type-active"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_8px_18px_-8px_rgba(249,115,22,0.8)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative grid place-items-center">
                  {code === "service" ? (
                    <Wrench className="h-4 w-4" />
                  ) : code === "product" ? (
                    <Package className="h-4 w-4" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                </span>
                <span className="relative text-[9.5px] font-black leading-[1.05] text-center">{label}</span>
                <span className={`relative text-[8px] font-bold ${active ? "text-white/80" : "text-slate-400"}`}>{sub}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ---------------- Right: per-root horizontal decks ---------------- */}
      <div className="flex-1 min-w-0 space-y-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={typeCode}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="space-y-3"
          >
            {rootCats.map((root, ri) => {
              const subs = subsByRoot.get(root.id) ?? [];
              if (subs.length === 0) return null;
              return (
                <motion.section
                  key={root.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * ri, type: "spring", stiffness: 300, damping: 28 }}
                >
                  <div className="flex items-center justify-between pr-2">
                    <span className="inline-flex items-center h-7 px-3 rounded-full bg-orange-500 text-white text-[11px] font-black shadow-[0_6px_14px_-8px_rgba(249,115,22,0.9)]">
                      {root.name}
                    </span>
                    <button
                      onClick={() => onViewAll(root)}
                      className="flex items-center gap-0.5 text-[11px] font-bold text-slate-500 active:scale-95"
                    >
                      View all <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-1.5 flex gap-1 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {subs.map((s) => (
                      <DeckCard
                        key={s.id}
                        sub={s}
                        optionCount={(itemsBySub.get(s.id) ?? []).length}
                        variation={variationBySub[s.id]}
                        busy={submittingId === s.id}
                        onOpen={() => onOpenSub(s)}
                        onFind={() => onFindVendor(s)}
                      />
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DeckCard({
  sub,
  optionCount,
  variation,
  busy,
  onOpen,
  onFind,
}: {
  sub: DeckCategory;
  optionCount: number;
  variation?: string;
  busy: boolean;
  onOpen: () => void;
  onFind: () => void;
}) {
  return (
    <div className="relative shrink-0 snap-center w-[92%] px-2.5 py-2">
      {/* stacked paper layers behind the card */}
      <span className="pointer-events-none absolute inset-y-4 left-0 right-0 rounded-[26px] bg-white border border-amber-200/70 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.4)]" />
      <span className="pointer-events-none absolute inset-y-3 left-1.5 right-1.5 rounded-[26px] bg-white border border-amber-300/80 shadow-[0_10px_20px_-14px_rgba(0,0,0,0.45)]" />

      <motion.article
        whileTap={{ scale: 0.975 }}
        onClick={onOpen}
        className="relative rounded-[24px] bg-white border-2 border-amber-300 shadow-[0_16px_34px_-18px_rgba(217,119,6,0.65)] overflow-hidden cursor-pointer"
      >
        <div className="flex items-center gap-3 p-3">
          <motion.div
            layout
            className="w-[92px] h-[92px] rounded-2xl bg-gradient-to-br from-amber-50 to-white grid place-items-center overflow-hidden shrink-0"
          >
            <Thumb cat={sub} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-black text-slate-900 text-[17px] leading-tight line-clamp-1">{sub.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-[12px] font-bold text-slate-800">4.8</span>
              <span className="text-[11px] text-slate-400">(120)</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] text-slate-600">
              <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /><span>98 Verified</span></div>
              <div className="flex items-center gap-1"><Users className="h-3 w-3 text-sky-500" /><span>56 Available</span></div>
              <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-orange-500" /><span>0.6 km away</span></div>
              <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /><span>{optionCount || "—"} options</span></div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="flex-1 h-11 rounded-2xl bg-white border border-slate-200 flex items-center gap-2 px-3 active:scale-[0.98] transition-transform"
          >
            <span className="h-6 w-6 rounded-full bg-orange-100 grid place-items-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            </span>
            <span className={`flex-1 text-left text-[13px] font-semibold truncate ${variation ? "text-orange-600" : "text-slate-600"}`}>
              {variation || "General request"}
            </span>
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={busy}
            onClick={(e) => { e.stopPropagation(); onFind(); }}
            className="h-11 px-4 rounded-2xl font-black text-[14px] flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-[0_10px_20px_-8px_rgba(249,115,22,0.7)] disabled:opacity-60"
          >
            {busy ? "Sending…" : "Find Vendor"}
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.article>
    </div>
  );
}
