import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check, Loader2 } from "lucide-react";

export type PricingValues = {
  price_min: number | null;
  price_max: number | null;
  notes: string;
  variations: string[];
};

const DEFAULT_VARIATIONS = ["Wholesale", "Retail", "Manufacture"];

export function ItemPricingSheet({
  open,
  itemName,
  initial,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  itemName: string;
  initial?: Partial<PricingValues>;
  busy?: boolean;
  onClose: () => void;
  onSave: (v: PricingValues) => void;
}) {
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [notes, setNotes] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [customChips, setCustomChips] = useState<string[]>([]);
  const [adding, setAdding] = useState("");

  useEffect(() => {
    if (!open) return;
    setPriceMin(initial?.price_min != null ? String(initial.price_min) : "");
    setPriceMax(initial?.price_max != null ? String(initial.price_max) : "");
    setNotes(initial?.notes ?? "");
    const init = initial?.variations ?? [];
    setVariations(init);
    setCustomChips(init.filter((v) => !DEFAULT_VARIATIONS.includes(v)));
    setAdding("");
  }, [open, initial]);

  const toggle = (v: string) =>
    setVariations((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));

  const addCustom = () => {
    const v = adding.trim();
    if (!v) return;
    if (!customChips.includes(v)) setCustomChips((arr) => [...arr, v]);
    if (!variations.includes(v)) setVariations((arr) => [...arr, v]);
    setAdding("");
  };

  const canSave =
    (priceMin === "" || !isNaN(Number(priceMin))) &&
    (priceMax === "" || !isNaN(Number(priceMax)));

  const allChips = [...DEFAULT_VARIATIONS, ...customChips];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[81] rounded-t-[28px] flex flex-col max-h-[88vh]"
            style={{
              background: "linear-gradient(180deg, #1a1208 0%, #0f0a04 100%)",
              borderTop: "1px solid rgba(212,175,55,0.35)",
              boxShadow: "0 -24px 60px -10px rgba(0,0,0,0.8)",
            }}
          >
            <div className="pt-2.5 pb-1 grid place-items-center">
              <span className="block h-1.5 w-12 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />
            </div>

            <div className="px-5 pb-3 pt-1 flex items-start gap-3 border-b border-[#d4af37]/15">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/70 font-bold">
                  Enable service
                </p>
                <h3 className="font-display text-lg font-bold text-[#f5f6f8] truncate">
                  {itemName}
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="h-8 w-8 rounded-full grid place-items-center border border-[#a8acb3]/30 text-[#f5f6f8] bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Price range */}
              <div>
                <label className="text-[11px] uppercase tracking-[0.2em] text-[#d8dde3]/60 font-bold">
                  Your rate (₹)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="flex-1 h-11 px-3 rounded-xl bg-white/5 border border-[#d4af37]/25 text-[#f5f6f8] text-sm outline-none focus:border-[#d4af37]/60"
                  />
                  <span className="text-[#d8dde3]/50">–</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="flex-1 h-11 px-3 rounded-xl bg-white/5 border border-[#d4af37]/25 text-[#f5f6f8] text-sm outline-none focus:border-[#d4af37]/60"
                  />
                </div>
              </div>

              {/* Variations / deal types */}
              <div>
                <label className="text-[11px] uppercase tracking-[0.2em] text-[#d8dde3]/60 font-bold">
                  Deal types — multi-select
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allChips.map((v) => {
                    const on = variations.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggle(v)}
                        className={`px-3 h-9 rounded-full text-xs font-bold border flex items-center gap-1.5 transition ${
                          on
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                            : "bg-white/5 border-[#d4af37]/30 text-[#d8dde3]/80"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                        {v}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={adding}
                    onChange={(e) => setAdding(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustom();
                      }
                    }}
                    placeholder="Add custom…"
                    className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-[#d4af37]/20 text-[#f5f6f8] text-xs outline-none focus:border-[#d4af37]/60"
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    className="h-10 w-10 rounded-xl grid place-items-center bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] uppercase tracking-[0.2em] text-[#d8dde3]/60 font-bold">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Short description…"
                  className="mt-2 w-full px-3 py-2 rounded-xl bg-white/5 border border-[#d4af37]/25 text-[#f5f6f8] text-sm outline-none focus:border-[#d4af37]/60 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#d4af37]/15 flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),12px)]">
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl bg-white/5 border border-[#a8acb3]/30 text-[#f5f6f8] font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!canSave || busy}
                onClick={() =>
                  onSave({
                    price_min: priceMin === "" ? null : Number(priceMin),
                    price_max: priceMax === "" ? null : Number(priceMax),
                    notes: notes.trim(),
                    variations,
                  })
                }
                className="flex-1 h-12 rounded-2xl font-bold text-[#0f0a04] disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(180deg, #fff8dc 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
                  boxShadow: "0 8px 22px -8px rgba(212,175,55,0.55)",
                }}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Enable"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
