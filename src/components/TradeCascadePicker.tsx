import { useEffect, useState } from "react";
import { Check, ChevronRight, Store, X } from "lucide-react";
import { TRADE_TREE, type TradeNode, type TradeSelection } from "@/lib/trade-tree";

/**
 * TradeCascadePicker
 *
 * Nested dependent picker for Step 1 of vendor onboarding.
 * - Slides one sheet at a time; each child sheet is pushed onto a stack.
 * - Every level shows an "Other" option that reveals an inline text input.
 * - Selection shows a maroon checkmark on the chosen row before transitioning.
 *
 * Palette is Creamy Ivory + Gold border + Maroon accent — matches the onboarding
 * sheet spec from the screenshot.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (selection: TradeSelection) => void;
  initial?: TradeSelection | null;
};

// ── palette tokens (kept inline to match the onboarding sheet exactly) ──
const IVORY = "#FBF3DC";
const IVORY_DEEP = "#F5E7BE";
const GOLD = "#C8A24A";
const MAROON = "#7A1F2B";
const MAROON_INK = "#5A1620";

type Level = {
  /** Parent label (e.g. "Manufacturer") shown at the top. Root level has no parent. */
  parentLabel?: string;
  options: TradeNode[];
};

export function TradeCascadePicker({ open, onClose, onComplete, initial }: Props) {
  // Stack of levels currently visible. We always render only the TOP level (animated slide).
  const [stack, setStack] = useState<Level[]>([{ options: TRADE_TREE }]);
  // Path of chosen nodes so far (root → current parent).
  const [path, setPath] = useState<TradeSelection["path"]>([]);
  // Per-level "Other" UI state.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  // Visual confirmation tick on the just-picked row.
  const [justPicked, setJustPicked] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStack([{ options: TRADE_TREE }]);
    setPath([]);
    setOtherOpen(false);
    setOtherText("");
    setJustPicked(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, initial]);

  if (!open) return null;

  const current = stack[stack.length - 1];
  const depth = stack.length - 1;

  const pickNode = (node: TradeNode) => {
    setJustPicked(node.value);
    const nextPath = [...path, { value: node.value, label: node.label }];
    setTimeout(() => {
      setJustPicked(null);
      setOtherOpen(false);
      setOtherText("");
      if (node.children && node.children.length > 0) {
        // Push next level
        setPath(nextPath);
        setStack((s) => [...s, { parentLabel: node.label, options: node.children! }]);
      } else {
        // Leaf — done
        onComplete({ path: nextPath });
      }
    }, 220);
  };

  const submitOther = () => {
    const txt = otherText.trim();
    if (!txt) return;
    const nextPath = [...path, { value: "__other__", label: "Other", customText: txt }];
    onComplete({ path: nextPath });
  };

  const goBackLevel = () => {
    if (stack.length === 1) {
      onClose();
      return;
    }
    setStack((s) => s.slice(0, -1));
    setPath((p) => p.slice(0, -1));
    setOtherOpen(false);
    setOtherText("");
  };

  const breadcrumb = path.map((p) => p.label).join(" › ");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Overlay */}
      <button
        aria-label="Close picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        key={depth /* re-mount per level → slide animation */}
        className="relative w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-7 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.35)]"
        style={{
          background: `linear-gradient(180deg, ${IVORY} 0%, ${IVORY_DEEP} 100%)`,
          border: `1.5px solid ${GOLD}`,
          borderBottom: "none",
          animation: "sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* grab handle */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full" style={{ background: GOLD, opacity: 0.5 }} />

        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goBackLevel}
            className="text-xs uppercase tracking-[0.2em] font-bold"
            style={{ color: MAROON }}
          >
            {depth === 0 ? "Cancel" : "‹ Back"}
          </button>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold" style={{ color: MAROON_INK }}>
            What you do
          </p>
          <button onClick={onClose} aria-label="Close" style={{ color: MAROON }}>
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* title + breadcrumb */}
        <div className="mb-4">
          <h2
            className="font-display text-[22px] leading-tight font-bold"
            style={{ color: MAROON_INK }}
          >
            {current.parentLabel ?? "Pick your trade line"}
          </h2>
          {breadcrumb && (
            <p className="mt-1 text-[11px] italic" style={{ color: `${MAROON}99` }}>
              {breadcrumb}
            </p>
          )}
        </div>

        {/* options list */}
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
          {current.options.map((opt, i) => {
            const picked = justPicked === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => pickNode(opt)}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all"
                style={{
                  background: picked ? `${MAROON}10` : "rgba(255,255,255,0.55)",
                  border: `1.5px solid ${picked ? MAROON : `${GOLD}88`}`,
                  boxShadow: picked
                    ? `0 0 0 3px ${MAROON}22, inset 0 1px 0 rgba(255,255,255,0.8)`
                    : "inset 0 1px 0 rgba(255,255,255,0.8)",
                  animation: `fade-up 0.4s ease-out ${i * 0.04}s both`,
                }}
              >
                <span
                  className="h-10 w-10 rounded-xl grid place-items-center flex-shrink-0"
                  style={{
                    background: IVORY,
                    border: `1.5px solid ${GOLD}`,
                    color: MAROON,
                  }}
                >
                  <Store className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-display text-[15px] font-bold leading-tight"
                    style={{ color: MAROON_INK }}
                  >
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span className="block text-[11px] mt-0.5" style={{ color: `${MAROON_INK}99` }}>
                      {opt.sub}
                    </span>
                  )}
                </span>
                <span
                  className="h-6 w-6 rounded-md grid place-items-center flex-shrink-0"
                  style={{
                    background: picked ? MAROON : "transparent",
                    border: `1.5px solid ${picked ? MAROON : `${GOLD}99`}`,
                    color: "#fff",
                    transition: "all 0.18s ease",
                  }}
                >
                  {picked ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : opt.children && opt.children.length > 0 ? (
                    <ChevronRight className="h-4 w-4" style={{ color: MAROON }} strokeWidth={2.5} />
                  ) : null}
                </span>
              </button>
            );
          })}

          {/* OTHER row — always at bottom of every level */}
          <div
            className="rounded-2xl px-3.5 py-3"
            style={{
              background: otherOpen ? `${MAROON}10` : "rgba(255,255,255,0.55)",
              border: `1.5px dashed ${otherOpen ? MAROON : `${GOLD}88`}`,
            }}
          >
            <button
              onClick={() => setOtherOpen((v) => !v)}
              className="w-full flex items-center gap-3 text-left"
            >
              <span
                className="h-10 w-10 rounded-xl grid place-items-center flex-shrink-0 font-display text-lg font-bold"
                style={{
                  background: IVORY,
                  border: `1.5px solid ${GOLD}`,
                  color: MAROON,
                }}
              >
                +
              </span>
              <span className="flex-1">
                <span
                  className="block font-display text-[15px] font-bold leading-tight"
                  style={{ color: MAROON_INK }}
                >
                  Other
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: `${MAROON_INK}99` }}>
                  Type your own category
                </span>
              </span>
              <span
                className="h-6 w-6 rounded-md grid place-items-center flex-shrink-0"
                style={{
                  background: otherOpen ? MAROON : "transparent",
                  border: `1.5px solid ${otherOpen ? MAROON : `${GOLD}99`}`,
                  color: "#fff",
                }}
              >
                {otherOpen && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
            </button>

            {otherOpen && (
              <div className="mt-3 flex gap-2" style={{ animation: "fade-up 0.25s ease-out both" }}>
                <input
                  autoFocus
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitOther()}
                  placeholder="e.g. Solar panel installation"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-white outline-none"
                  style={{
                    border: `1.5px solid ${GOLD}`,
                    color: MAROON_INK,
                  }}
                  maxLength={80}
                />
                <button
                  onClick={submitOther}
                  disabled={!otherText.trim()}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-40"
                  style={{
                    background: MAROON,
                    boxShadow: `0 4px 12px -2px ${MAROON}66`,
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
