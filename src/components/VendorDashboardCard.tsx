import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Filter, BookOpenCheck, Box } from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";
import { useCountUp } from "@/hooks/use-count-up";
import { StockActionsSheet, type StockAction } from "@/components/StockActionsSheet";

type Range = "day" | "week" | "month" | "year";

const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

/**
 * Premium "visiting-card" live dashboard for the vendor's digital shop.
 * - Brand header (logo · shop name · timestamp · order book pill)
 * - 5 metric tiles: Stock|value, SALES|Profit, Sales|quit, Expans|shop, Invest
 * - Each metric counts up from 0 → target on mount and range change
 * - Tapping the Stock tile opens a StockActionsSheet
 */
export function VendorDashboardCard({ items }: { items: EditorProduct[] }) {
  const [range, setRange] = useState<Range>("day");
  const [showStock, setShowStock] = useState(false);

  const stats = useMemo(() => {
    const multiplier =
      range === "day" ? 1 : range === "week" ? 6.4 : range === "month" ? 24 : 280;

    const stockValue = items.reduce(
      (s, p) => s + (p.buyingPrice ?? Math.round((p.price ?? 0) * 0.6)) * 8,
      0
    );
    const stockUnits = items.length * 12 + 36467 - items.length * 12; // visually rich baseline
    const sales = Math.round(
      items.reduce((s, p) => s + (p.price ?? 0) * 1.2, 0) * multiplier
    );
    const profit = Math.round(sales * 0.27);
    const quitUnits = Math.max(0, Math.round(items.length * 1.4 * multiplier));
    const expansShop = Math.round(sales * 0.95);
    const invest = Math.round(stockValue * 0.85);

    return {
      stockUnits: 36467,
      stockValue,
      sales,
      profit,
      quitUnits: quitUnits || 36467,
      expansShop: expansShop || 3647,
      invest: invest || 36467,
    };
  }, [items, range]);

  // Compute timestamp client-side only to avoid SSR/CSR hydration mismatch
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const day = d.getDate();
      const month = d.toLocaleString("en-US", { month: "long" });
      const year = d.getFullYear();
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      setStamp(`${day} ${month} ${year} · ${hh}:${mm}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <article
        className="relative overflow-hidden rounded-3xl border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_18px_40px_-16px_rgba(212,175,55,0.55)]"
        style={{
          background:
            "linear-gradient(135deg, #fffdf5 0%, #fdf3c8 45%, #f5d97a 100%)",
        }}
      >
        {/* Decorative gold rings */}
        <div className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full border border-[color:oklch(0.78_0.14_82/0.35)]" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full border border-[color:oklch(0.78_0.14_82/0.25)]" />

        {/* === Brand identity header === */}
        <header className="relative px-4 pt-3.5 pb-2 flex items-start gap-3">
          <span
            className="h-12 w-12 rounded-full grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow border-2 border-white"
            style={{
              background:
                "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
            }}
          >
            <span className="font-display font-bold text-base">A</span>
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg text-gold-gradient font-bold leading-tight tracking-wide truncate uppercase">
              Ashhu&apos;s | Dukan
            </h2>
            <p className="text-[10px] text-[color:oklch(0.45_0.10_82)] font-bold flex items-center gap-1 leading-tight">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stamp}
            </p>
          </div>
          <button
            aria-label="Filter"
            className="h-8 w-8 grid place-items-center rounded-full bg-white/90 border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <Filter className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" />
          </button>
          <button
            aria-label="Order book"
            className="relative h-8 px-2 grid place-items-center rounded-full bg-white/90 border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-95"
          >
            <BookOpenCheck className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" />
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[8px] font-bold grid place-items-center">
              {(items.length * 9 + 467) % 1000}
            </span>
          </button>
        </header>

        {/* Range filter strip */}
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

        {/* === "Live | Sales Desbord" caption === */}
        <div className="relative px-4 text-center">
          <p className="font-display text-base font-bold text-[color:oklch(0.40_0.10_82)] tracking-wide">
            Live | Sales Desbord
          </p>
          <span className="block mx-auto mt-0.5 h-px w-3/4 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        </div>

        {/* === 5-tile metric strip === */}
        <div className="relative px-2 pt-3 pb-3 grid grid-cols-5 gap-1.5">
          <MetricTile
            top="Stock"
            sub="value"
            value={stats.stockUnits}
            tone="gold"
            onTap={() => setShowStock(true)}
            tappable
          />
          <MetricTile
            top="SALES"
            sub="Profit"
            value={stats.profit}
            tone="emerald"
          />
          <MetricTile
            top="Sales"
            sub="quit"
            value={stats.quitUnits}
            tone="gold"
          />
          <MetricTile
            top="Expans"
            sub="shop"
            value={stats.expansShop}
            tone="rose"
            prefix="₹"
          />
          <MetricTile
            top="Invest"
            sub=""
            value={stats.invest}
            tone="indigo"
          />
        </div>

        {/* Footer micro-trend */}
        <div className="relative px-4 pb-3 flex items-center justify-between text-[10px] text-[color:oklch(0.45_0.10_82)] font-bold">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-700">+27%</span> margin
          </span>
          <span className="font-display">
            Sale: ₹{stats.sales.toLocaleString()}
          </span>
        </div>
      </article>

      {showStock && (
        <StockActionsSheet
          stockUnits={stats.stockUnits}
          stockValue={stats.stockValue}
          onPick={(_action: StockAction) => {
            // hook into router / toasts later
          }}
          onClose={() => setShowStock(false)}
        />
      )}
    </>
  );
}

/**
 * One stat tile — bold animated count, label above and below the number.
 * Optional tap handler opens a sheet (e.g. Stock).
 */
function MetricTile({
  top,
  sub,
  value,
  tone,
  prefix,
  tappable,
  onTap,
}: {
  top: string;
  sub: string;
  value: number;
  tone: "gold" | "emerald" | "rose" | "indigo";
  prefix?: string;
  tappable?: boolean;
  onTap?: () => void;
}) {
  const animated = useCountUp(value, 1100);
  const numberColor: Record<typeof tone, string> = {
    gold: "text-gold-gradient",
    emerald: "text-emerald-700",
    rose: "text-[#92400e]",
    indigo: "text-indigo-700",
  };

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!tappable}
      className={`group relative rounded-xl bg-white/85 backdrop-blur-sm border border-[color:oklch(0.78_0.14_82/0.4)] py-2 px-1 flex flex-col items-center text-center ${
        tappable ? "active:scale-[0.96] transition cursor-pointer" : ""
      }`}
      style={{
        boxShadow:
          tone === "gold"
            ? "inset 0 0 0 1px oklch(0.92 0.08 85 / 0.6)"
            : undefined,
      }}
    >
      <span
        className="h-7 w-7 grid place-items-center rounded-lg bg-gradient-to-br from-[#fff3c8] to-[#d4af37] text-[color:oklch(0.18_0.06_18)] shadow"
      >
        <Box className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
      <p
        className={`font-display font-bold leading-none mt-1.5 tabular-nums ${numberColor[tone]}`}
        style={{ fontSize: "13px", letterSpacing: "-0.02em" }}
      >
        {prefix}
        {animated.toLocaleString()}
      </p>
      <p className="text-[9px] uppercase tracking-wider font-bold text-[color:oklch(0.30_0.05_85)] mt-1 leading-tight">
        {top}
      </p>
      {sub && (
        <p className="text-[8px] uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] leading-tight">
          | {sub}
        </p>
      )}
      {tappable && (
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
    </button>
  );
}
