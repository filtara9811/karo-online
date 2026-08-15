import { LayoutGrid, Rows3 } from "lucide-react";
import type { RailVariant } from "./LandingProductRail";

/** Tiny control strip above the product rail: view switcher + "See All". */
export function LandingProductSectionHeader({
  variant,
  onToggle,
  onSeeAll,
  count,
}: {
  variant: RailVariant;
  onToggle: () => void;
  onSeeAll: () => void;
  count: number;
}) {
  return (
    <div className="pointer-events-auto flex items-center justify-end gap-1.5 px-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={variant === "cards" ? "Switch to compact view" : "Switch to card view"}
        className="flex h-[26px] items-center gap-1 rounded-full bg-black/45 px-2 text-[10px] font-bold text-white backdrop-blur active:scale-95"
      >
        {variant === "cards" ? <Rows3 className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
        {variant === "cards" ? "Compact" : "Cards"}
      </button>
      <button
        type="button"
        onClick={onSeeAll}
        className="flex h-[26px] items-center rounded-full bg-black/45 px-2.5 text-[10px] font-bold text-white backdrop-blur active:scale-95"
      >
        See All{count ? ` (${count})` : ""}
      </button>
    </div>
  );
}
