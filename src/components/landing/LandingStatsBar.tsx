import { Eye, Forward, Package, MessageSquare, ShoppingBag, Tag } from "lucide-react";
import type { LandingStats } from "@/lib/landing-types";

function fmt(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/**
 * Thin translucent engagement strip under the playing video plus a small
 * right-aligned "Tag Karo" pill. Kept see-through so the video stays visible.
 */
export function LandingStatsBar({
  stats,
  productCount,
  accent,
  onTag,
  onShare,
  onProducts,
}: {
  stats: LandingStats | null;
  productCount: number;
  accent: string;
  onTag: () => void;
  onShare: () => void;
  onProducts: () => void;
}) {
  const items = [
    stats ? { key: "views", icon: Eye, value: fmt(stats.views), label: "Views", action: undefined } : null,
    stats ? { key: "shares", icon: Forward, value: fmt(stats.shares), label: "Shares", action: onShare } : null,
    productCount > 0
      ? { key: "products", icon: Package, value: String(productCount), label: "Products", action: onProducts }
      : null,
    stats ? { key: "inq", icon: MessageSquare, value: fmt(stats.inquiries), label: "Inquiries", action: undefined } : null,
    stats && stats.orders > 0
      ? { key: "orders", icon: ShoppingBag, value: fmt(stats.orders), label: "Orders", action: undefined }
      : null,
  ].filter(Boolean) as Array<{ key: string; icon: typeof Eye; value: string; label: string; action?: () => void }>;

  if (!items.length) return null;

  return (
    <div className="pointer-events-auto space-y-1.5 px-3">
      <div className="flex justify-end">
        <button
          onClick={onTag}
          className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-white backdrop-blur-sm active:scale-95"
        >
          <Tag className="h-3 w-3" style={{ color: "#fda4af" }} />
          <span className="text-[10.5px] font-bold">Tag Karo</span>
          {stats ? <span className="text-[10px] font-semibold text-white/70">{fmt(stats.tags)}</span> : null}
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 rounded-full bg-black/32 px-2.5 py-1.5 backdrop-blur-sm">
        {items.map(({ key, icon: Icon, value, label, action }) => (
          <button
            key={key}
            onClick={action}
            disabled={!action}
            className="flex min-w-0 flex-1 items-center justify-center gap-1"
          >
            <Icon className="h-3 w-3 shrink-0" style={{ color: accent }} />
            <span className="truncate text-[10.5px] font-extrabold text-white">{value}</span>
            <span className="truncate text-[9px] font-semibold text-white/65">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
