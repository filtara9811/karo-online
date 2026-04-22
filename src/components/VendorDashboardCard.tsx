import { useMemo, useState } from "react";
import {
  TrendingUp,
  Package,
  IndianRupee,
  ShoppingBag,
  Wallet,
  Sparkles,
} from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";

type Range = "day" | "week" | "month" | "year";

const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

/**
 * Visiting-card style live dashboard for the vendor's digital shop.
 * Shows buying value, sale value, sold count, available stock and live margin.
 * Numbers are derived deterministically from products + range so the demo feels real.
 */
export function VendorDashboardCard({ items }: { items: EditorProduct[] }) {
  const [range, setRange] = useState<Range>("day");

  const stats = useMemo(() => {
    const multiplier =
      range === "day" ? 1 : range === "week" ? 6.4 : range === "month" ? 24 : 280;

    const buyingValue = items.reduce(
      (s, p) => s + (p.buyingPrice ?? Math.round((p.price ?? 0) * 0.6)) * 8,
      0
    );
    const stockUnits = items.length * 12;
    const saleValue = Math.round(
      items.reduce((s, p) => s + (p.price ?? 0) * 1.2, 0) * multiplier
    );
    const soldUnits = Math.round(items.length * 1.4 * multiplier);
    const cogs = Math.round(
      items.reduce((s, p) => s + (p.buyingPrice ?? p.price * 0.6), 0) *
        1.4 *
        multiplier
    );
    const profit = Math.max(0, saleValue - cogs);
    const margin = saleValue > 0 ? Math.round((profit / saleValue) * 100) : 0;

    return { buyingValue, stockUnits, saleValue, soldUnits, profit, margin };
  }, [items, range]);

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_10px_30px_-12px_rgba(212,175,55,0.55)]"
      style={{
        background:
          "linear-gradient(135deg, #fffdf5 0%, #fdf3c8 45%, #f5d97a 100%)",
      }}
    >
      {/* Decorative gold rings */}
      <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full border border-[color:oklch(0.78_0.14_82/0.35)]" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full border border-[color:oklch(0.78_0.14_82/0.25)]" />

      {/* Header — visiting card identity */}
      <header className="relative px-4 pt-3.5 pb-2 flex items-start gap-3">
        <span
          className="h-11 w-11 rounded-xl grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow"
          style={{
            background:
              "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
          }}
        >
          <Sparkles className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.45_0.10_82)] font-bold">
            ✦ Live Dashboard ✦
          </p>
          <h2 className="font-display text-base text-gold-gradient font-bold leading-tight truncate">
            Ashhu's Dukan · Snapshot
          </h2>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
        </span>
      </header>

      {/* Range filter */}
      <div className="relative px-3 pb-2">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/70 backdrop-blur-sm p-1 border border-[color:oklch(0.78_0.14_82/0.35)]">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`py-1.5 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition ${
                range === r.key
                  ? "text-[color:oklch(0.18_0.06_18)] shadow"
                  : "text-[color:oklch(0.55_0.10_82)]"
              }`}
              style={
                range === r.key
                  ? {
                      background:
                        "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)",
                    }
                  : undefined
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Headline metric — sale value */}
      <div className="relative px-4 pb-2 flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-[color:oklch(0.45_0.10_82)] font-bold">
            Sale Value
          </p>
          <p className="font-display text-3xl text-gold-gradient font-bold leading-none">
            ₹{stats.saleValue.toLocaleString()}
          </p>
          <p className="text-[10px] text-[color:oklch(0.45_0.10_82)] mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-700 font-bold">+{stats.margin}%</span>{" "}
            net margin
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[color:oklch(0.45_0.10_82)] font-bold">
            Profit
          </p>
          <p className="font-display text-lg font-bold text-emerald-700 leading-none">
            ₹{stats.profit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stat grid */}
      <div className="relative grid grid-cols-2 gap-2 px-3 pb-3 pt-1">
        <StatCell
          icon={<ShoppingBag className="h-3.5 w-3.5" />}
          label="Sold Units"
          value={`${stats.soldUnits}`}
          tone="gold"
        />
        <StatCell
          icon={<Package className="h-3.5 w-3.5" />}
          label="Available Stock"
          value={`${stats.stockUnits}`}
          tone="neutral"
        />
        <StatCell
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Buying Value"
          value={`₹${stats.buyingValue.toLocaleString()}`}
          tone="neutral"
        />
        <StatCell
          icon={<IndianRupee className="h-3.5 w-3.5" />}
          label="Sale Pricing"
          value={`₹${Math.round(stats.saleValue / Math.max(1, stats.soldUnits)).toLocaleString()}`}
          tone="gold"
          suffix="avg"
        />
      </div>
    </article>
  );
}

function StatCell({
  icon,
  label,
  value,
  tone,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "gold" | "neutral";
  suffix?: string;
}) {
  return (
    <div
      className="rounded-xl bg-white/85 backdrop-blur-sm border border-[color:oklch(0.78_0.14_82/0.4)] px-2.5 py-2"
      style={{
        boxShadow:
          tone === "gold"
            ? "inset 0 0 0 1px oklch(0.92 0.08 85 / 0.6)"
            : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`h-5 w-5 grid place-items-center rounded-md ${
            tone === "gold"
              ? "bg-gradient-to-br from-[#fff3c8] to-[#d4af37] text-[color:oklch(0.18_0.06_18)]"
              : "bg-[color:oklch(0.95_0.02_85)] text-[color:oklch(0.42_0.10_82)]"
          }`}
        >
          {icon}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-[color:oklch(0.45_0.10_82)] font-bold truncate">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
        {value}
        {suffix && (
          <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] font-normal ml-1">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
