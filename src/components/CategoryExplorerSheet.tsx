import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Send, Sparkles, SlidersHorizontal, Wrench, MapPin, Star,
  ShieldCheck, Check, Zap,
} from "lucide-react";

/* ------------------------------- Types ---------------------------------- */
export type ExpCat = {
  id: string;
  name: string;
  image_url: string | null;
  icon: string | null;
  parent_id: string | null;
};
export type ExpItem = {
  id: string;
  name: string;
  category_id: string;
  image_url: string | null;
  group_tag: string | null;
};
export type LeadFilters = {
  vendorTypes: string[];
  radiusKm: number;
  verifiedOnly: boolean;
  onlineOnly: boolean;
};

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  vendorTypes: ["wholesaler", "retailer", "manufacturer"],
  radiusKm: 1,
  verifiedOnly: false,
  onlineOnly: false,
};

const VENDOR_TYPES = [
  { code: "wholesaler", label: "Wholesaler" },
  { code: "retailer", label: "Retailer" },
  { code: "manufacturer", label: "Manufacturer" },
  { code: "service", label: "Service pro" },
];
const RADII = [1, 3, 5, 10, 25];

function isEmojiLike(s: string | null | undefined): boolean {
  if (!s) return false;
  if (s.startsWith("http")) return false;
  return [...s].length <= 4 && !/\s/.test(s);
}

function Glyph({ cat, size = 24 }: { cat: { image_url: string | null; icon: string | null }; size?: number }) {
  const url = cat.image_url && cat.image_url.startsWith("http") ? cat.image_url : null;
  if (url) return <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />;
  if (isEmojiLike(cat.image_url) || isEmojiLike(cat.icon))
    return <span style={{ fontSize: size }}>{cat.image_url ?? cat.icon}</span>;
  return <Wrench style={{ height: size, width: size }} className="text-orange-400" strokeWidth={2.1} />;
}

/* ------------------------------ Component -------------------------------- */
type Props = {
  open: boolean;
  rootName: string;
  rootGlyph: { image_url: string | null; icon: string | null } | null;
  subs: ExpCat[];
  itemsBySub: Map<string, ExpItem[]>;
  activeSubId: string | null;
  onActiveSubChange: (id: string) => void;
  submittingId: string | null;
  filters: LeadFilters;
  onFiltersChange: (f: LeadFilters) => void;
  onClose: () => void;
  /** itemName === null → general request for the whole sub-category. */
  onFindVendor: (sub: ExpCat, itemName: string | null, filters: LeadFilters) => void;
};

export function CategoryExplorerSheet({
  open, rootName, rootGlyph, subs, itemsBySub, activeSubId, onActiveSubChange,
  submittingId, filters, onFiltersChange, onClose, onFindVendor,
}: Props) {
  const activeSub = useMemo(
    () => subs.find((s) => s.id === activeSubId) ?? subs[0] ?? null,
    [subs, activeSubId],
  );
  const items = activeSub ? (itemsBySub.get(activeSub.id) ?? []) : [];
  const groups = useMemo(
    () => Array.from(new Set(items.map((i) => (i.group_tag || "").trim()).filter(Boolean))),
    [items],
  );
  const [group, setGroup] = useState<string | null>(null);
  useEffect(() => { setGroup(null); }, [activeSub?.id]);
  const visibleItems = group ? items.filter((i) => (i.group_tag || "").trim() === group) : items;

  const [filterFor, setFilterFor] = useState<{ sub: ExpCat; item: string | null } | null>(null);
  const [draft, setDraft] = useState<LeadFilters>(filters);
  useEffect(() => { if (filterFor) setDraft(filters); }, [filterFor, filters]);

  const activeFilterCount =
    (filters.vendorTypes.length !== DEFAULT_LEAD_FILTERS.vendorTypes.length ? 1 : 0) +
    (filters.radiusKm !== DEFAULT_LEAD_FILTERS.radiusKm ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.onlineOnly ? 1 : 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 330 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto bg-[#fdfbf7] rounded-t-[28px] overflow-hidden flex flex-col shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.6)]"
            style={{ maxHeight: "90vh" }}
          >
            <div className="pt-2.5 flex justify-center shrink-0">
              <span className="h-1.5 w-11 rounded-full bg-slate-300/80" />
            </div>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-2 pb-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-10 w-10 shrink-0 rounded-2xl overflow-hidden grid place-items-center bg-gradient-to-br from-amber-100 to-white border border-amber-200 shadow-sm">
                  {rootGlyph ? <Glyph cat={rootGlyph} size={22} /> : <Wrench className="h-5 w-5 text-orange-400" />}
                </span>
                <h3 className="truncate font-display text-[19px] font-black text-slate-900">{rootName}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => activeSub && setFilterFor({ sub: activeSub, item: null })}
                  className="relative h-9 px-3 rounded-full bg-white border border-slate-200 flex items-center gap-1.5 text-[12px] font-bold text-slate-700 active:scale-95 transition"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-orange-500" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-black grid place-items-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button onClick={onClose} className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 1 — Sub-category rail (all categories, straight on top) */}
            <div className="shrink-0 px-3 pb-2">
              <div className="flex gap-2 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
                {subs.map((s) => {
                  const on = activeSub?.id === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onActiveSubChange(s.id)}
                      className={`relative shrink-0 snap-start w-[86px] rounded-[20px] p-1.5 border-2 transition-colors ${
                        on
                          ? "border-orange-400 bg-white shadow-[0_12px_26px_-14px_rgba(249,115,22,0.8)]"
                          : "border-amber-100 bg-white/80"
                      }`}
                    >
                      <span className="block h-[62px] w-full rounded-2xl overflow-hidden grid place-items-center bg-gradient-to-br from-amber-50 to-white">
                        <Glyph cat={s} size={30} />
                      </span>
                      <span className={`mt-1 block text-[11px] font-bold leading-tight line-clamp-2 ${on ? "text-orange-700" : "text-slate-700"}`}>
                        {s.name}
                      </span>
                    </motion.button>
                  );
                })}
                {subs.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-400 w-full">No sub-categories yet.</div>
                )}
              </div>
            </div>

            {/* 2 — Variation groups (Gents / Ladies / Kids …) */}
            {groups.length > 0 && (
              <div className="shrink-0 px-3 pb-1.5">
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
                  <button
                    onClick={() => setGroup(null)}
                    className={`shrink-0 h-9 px-3.5 rounded-full text-[12px] font-bold border-2 transition-colors ${
                      group === null ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-amber-100 text-slate-700"
                    }`}
                  >
                    All
                  </button>
                  {groups.map((g) => {
                    const on = group === g;
                    return (
                      <button
                        key={g}
                        onClick={() => setGroup(g)}
                        className={`shrink-0 h-9 pl-1.5 pr-3.5 rounded-full text-[12px] font-bold border-2 flex items-center gap-2 transition-colors ${
                          on ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-amber-100 text-slate-700"
                        }`}
                      >
                        <span className="h-6 w-6 rounded-full overflow-hidden grid place-items-center bg-amber-50">
                          <Glyph cat={activeSub ?? { image_url: null, icon: null }} size={14} />
                        </span>
                        {g}
                      </button>
                    );
                  })}
                </div>
                <p className="pl-1 text-[10.5px] font-semibold text-slate-400">Variation..</p>
              </div>
            )}

            {/* 3 — Products / variations list */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-[104px] pt-1 space-y-2.5">
              {activeSub && visibleItems.length === 0 && (
                <ProductRow
                  title={activeSub.name}
                  glyph={activeSub}
                  filterLabel="Choice filter"
                  busy={submittingId === activeSub.id}
                  onFilter={() => setFilterFor({ sub: activeSub, item: null })}
                  onFind={() => onFindVendor(activeSub, null, filters)}
                  hint="General request"
                />
              )}
              {activeSub && visibleItems.map((it, i) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.24), type: "spring", stiffness: 320, damping: 30 }}
                >
                  <ProductRow
                    title={it.name}
                    glyph={{ image_url: it.image_url ?? activeSub.image_url, icon: activeSub.icon }}
                    filterLabel="Choice filter"
                    busy={submittingId === activeSub.id}
                    onFilter={() => setFilterFor({ sub: activeSub, item: it.name })}
                    onFind={() => onFindVendor(activeSub, it.name, filters)}
                  />
                </motion.div>
              ))}
              <div className="h-2" />
            </div>

            {/* Choice-filter panel */}
            <AnimatePresence>
              {filterFor && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-end"
                  onClick={() => setFilterFor(null)}
                >
                  <motion.div
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 34, stiffness: 340 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-white rounded-t-[26px] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+104px)] max-h-[88%] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between pb-3">
                      <div className="min-w-0">
                        <h4 className="font-display text-[17px] font-black text-slate-900">Choice filter</h4>
                        <p className="truncate text-[11.5px] text-slate-500">
                          {filterFor.item ?? filterFor.sub.name}
                        </p>
                      </div>
                      <button onClick={() => setFilterFor(null)} className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Vendor type</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {VENDOR_TYPES.map((t) => {
                        const on = draft.vendorTypes.includes(t.code);
                        return (
                          <button
                            key={t.code}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                vendorTypes: on
                                  ? d.vendorTypes.filter((v) => v !== t.code)
                                  : [...d.vendorTypes, t.code],
                              }))
                            }
                            className={`h-9 px-3.5 rounded-full text-[12.5px] font-bold border-2 flex items-center gap-1.5 transition-colors ${
                              on ? "bg-orange-50 border-orange-400 text-orange-700" : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {on && <Check className="h-3.5 w-3.5" />}
                            {t.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">Nearby distance</p>
                    <div className="mt-2 flex gap-2">
                      {RADII.map((km) => {
                        const on = draft.radiusKm === km;
                        return (
                          <button
                            key={km}
                            onClick={() => setDraft((d) => ({ ...d, radiusKm: km }))}
                            className={`flex-1 h-10 rounded-2xl text-[12.5px] font-black border-2 transition-colors ${
                              on ? "bg-gradient-to-b from-orange-400 to-orange-500 border-orange-500 text-white" : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {km} km
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 space-y-2">
                      <ToggleRow
                        icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
                        label="Verified vendors only"
                        on={draft.verifiedOnly}
                        onToggle={() => setDraft((d) => ({ ...d, verifiedOnly: !d.verifiedOnly }))}
                      />
                      <ToggleRow
                        icon={<Zap className="h-4 w-4 text-amber-500" />}
                        label="Online right now"
                        on={draft.onlineOnly}
                        onToggle={() => setDraft((d) => ({ ...d, onlineOnly: !d.onlineOnly }))}
                      />
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        onClick={() => setDraft(DEFAULT_LEAD_FILTERS)}
                        className="h-12 px-4 rounded-2xl bg-white border border-slate-200 text-[13px] font-bold text-slate-600 active:scale-95 transition"
                      >
                        Reset
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          onFiltersChange(draft);
                          const target = filterFor;
                          setFilterFor(null);
                          if (target) onFindVendor(target.sub, target.item, draft);
                        }}
                        className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-black text-[14.5px] flex items-center justify-center gap-2 shadow-[0_14px_28px_-12px_rgba(249,115,22,0.8)]"
                      >
                        Search & find vendor
                        <Send className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Sub-parts -------------------------------- */
function ProductRow({
  title, glyph, filterLabel, busy, onFilter, onFind, hint,
}: {
  title: string;
  glyph: { image_url: string | null; icon: string | null };
  filterLabel: string;
  busy: boolean;
  onFilter: () => void;
  onFind: () => void;
  hint?: string;
}) {
  return (
    <article className="rounded-[24px] bg-white border border-amber-200 shadow-[0_14px_30px_-20px_rgba(217,119,6,0.55)] overflow-hidden">
      <div className="flex items-center gap-3 p-2.5">
        <span className="h-[76px] w-[76px] shrink-0 rounded-2xl overflow-hidden grid place-items-center bg-gradient-to-br from-amber-50 to-white border border-amber-100">
          <Glyph cat={glyph} size={34} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-[16.5px] font-black leading-tight text-slate-900 line-clamp-2">{title}</h4>
          {hint && <p className="text-[11.5px] font-semibold text-slate-500">{hint}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] font-semibold text-slate-500">
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />4.8</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" />Verified</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-orange-500" />Nearby</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-amber-100">
        <button
          onClick={onFilter}
          className="h-12 flex items-center justify-center gap-1.5 text-[13px] font-black text-slate-700 active:bg-amber-50 transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-orange-500" />
          {filterLabel}
        </button>
        <button
          disabled={busy}
          onClick={onFind}
          className="h-12 border-l border-amber-100 flex items-center justify-center gap-1.5 text-[13px] font-black text-emerald-600 active:bg-emerald-50 disabled:opacity-60 transition-colors"
        >
          {busy ? "Sending…" : "Find vendor"}
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function ToggleRow({ icon, label, on, onToggle }: { icon: React.ReactNode; label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full h-12 rounded-2xl bg-slate-50 border border-slate-200 px-3 flex items-center gap-2.5 active:scale-[0.99] transition"
    >
      {icon}
      <span className="flex-1 text-left text-[13px] font-bold text-slate-700">{label}</span>
      <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${on ? "bg-orange-500" : "bg-slate-300"}`}>
        <motion.span layout className={`block h-5 w-5 rounded-full bg-white shadow ${on ? "ml-5" : "ml-0"}`} />
      </span>
    </button>
  );
}
