import { Eye, Forward, Package, MessageSquare, ShoppingBag, Tag, ChevronRight } from "lucide-react";
import type { LandingStats } from "@/lib/landing-types";

function fmt(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/**
 * Clean horizontal engagement bar shown right under the playing video, plus the
 * red "Tag Karo" row above it. Only real, tracked counts are rendered.
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
    <div className="pointer-events-auto space-y-2 px-3">
      <button
        onClick={onTag}
        className="flex w-full items-center gap-3 rounded-2xl bg-white/95 px-3 py-2.5 text-left shadow-lg backdrop-blur active:scale-[0.99]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
          <Tag className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold text-slate-900">Tag Karo</span>
          <span className="block text-[11px] font-bold text-rose-600">
            {stats ? `${fmt(stats.tags)} ne tag kiya` : "Tag karke share karein"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      <div className="flex items-stretch justify-between gap-1 rounded-2xl bg-white/95 px-2 py-2 shadow-lg backdrop-blur">
        {items.map(({ key, icon: Icon, value, label, action }, i) => (
          <button
            key={key}
            onClick={action}
            disabled={!action}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 ${i > 0 ? "border-l border-slate-200" : ""}`}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
            <span className="min-w-0 text-left">
              <span className="block truncate text-[12px] font-extrabold leading-tight text-slate-900">{value}</span>
              <span className="block truncate text-[9px] font-semibold leading-tight text-slate-500">{label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
