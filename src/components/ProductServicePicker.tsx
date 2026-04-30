import { useEffect } from "react";
import { Package, Wrench, Sparkles, X, Crown, ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

type StaticType = {
  code: "product" | "service" | "other";
  name: string;
  sub: string;
  Icon: LucideIcon;
};

/** Static catalog types — no DB. Matches Reselling Program picker style (long cards). */
const TYPES: StaticType[] = [
  { code: "product", name: "Product", sub: "Browse products & shop categories", Icon: Package },
  { code: "service", name: "Service", sub: "Book trusted services nearby", Icon: Wrench },
  { code: "other", name: "Other", sub: "Everything else · special needs", Icon: Sparkles },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mode is the catalog type code ('product' | 'service' | 'other'). */
  onCategoryPick: (mode: string, category: string) => void;
};

export function ProductServicePicker({ open, onClose, onCategoryPick }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.5)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 max-h-[85vh] flex flex-col"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />

        {/* Top bar — Admin pill + Close */}
        <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
          <Link
            to="/admin"
            onClick={onClose}
            className="group inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full border border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-r from-[#1a1208] via-[#2a1d0a] to-[#1a1208] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.5)] active:scale-95 transition"
            aria-label="Open Admin Panel"
          >
            <span
              className="h-5 w-5 rounded-full grid place-items-center"
              style={{ background: "linear-gradient(180deg,#fff8dc,#d4af37 60%,#8b6508)" }}
            >
              <Crown className="h-3 w-3 text-[#1a1208]" strokeWidth={2.5} />
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.22em]"
              style={{
                background: "linear-gradient(180deg,#fff8dc,#f5d97a 40%,#d4af37)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Admin
            </span>
          </Link>

          <button
            onClick={onClose}
            className="btn-3d h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.55_0.10_82)]">
            ✦ Select ✦
          </p>
          <h2 className="font-display text-2xl text-gold-gradient leading-tight">
            What you want?
          </h2>
          <p className="text-xs italic text-[color:oklch(0.45_0.06_85)] mt-1">
            Choose a catalog to browse
          </p>
        </div>

        {/* 3 long cards — Product / Service / Other */}
        <div className="flex flex-col gap-3 pb-2">
          {TYPES.map((t, i) => {
            const Icon = t.Icon;
            return (
              <button
                key={t.code}
                onClick={() => onCategoryPick(t.code, t.name)}
                className="btn-3d group relative flex items-center gap-3 w-full p-3 rounded-2xl bg-gradient-to-br from-white to-[#fdf8e8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] hover:shadow-gold-glow active:scale-[0.98] transition-all text-left"
                style={{ animation: `fade-up 0.5s ease-out ${i * 0.08}s both` }}
              >
                <span
                  className="h-14 w-14 flex-shrink-0 rounded-2xl grid place-items-center border border-[color:oklch(0.78_0.14_82/0.55)] shadow-inner"
                  style={{ background: "linear-gradient(180deg,#fff8dc,#f5e9b8 60%,#e8d27a)" }}
                >
                  <Icon className="h-7 w-7 text-[color:oklch(0.32_0.10_82)]" strokeWidth={2.2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-lg text-gold-gradient font-bold leading-tight">
                    {t.name}
                  </span>
                  <span className="block text-xs text-[color:oklch(0.42_0.06_85)] leading-snug truncate">
                    {t.sub}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-[color:oklch(0.55_0.10_82)] flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
