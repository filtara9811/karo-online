import { TrendingUp, TrendingDown } from "lucide-react";

type Row = {
  label: string;
  yesterday: string;
  today: string;
  delta: number;
};

const ROWS: Row[] = [
  { label: "Sales", yesterday: "₹14,820", today: "₹19,197", delta: 29.5 },
  { label: "Orders", yesterday: "42", today: "57", delta: 35.7 },
  { label: "Customers", yesterday: "31", today: "48", delta: 54.8 },
  { label: "Avg Bill", yesterday: "₹353", today: "₹399", delta: 13.0 },
  { label: "Profit", yesterday: "₹3,240", today: "₹4,470", delta: 37.9 },
  { label: "Loss", yesterday: "₹260", today: "₹180", delta: -30.7 },
  { label: "Top Product", yesterday: "—", today: "Aurum Perfume · 18", delta: 0 },
];

/**
 * Horizontal marquee strip — Yesterday vs Today stats.
 * Replaces the big flip-card so the upload area gets the spotlight.
 */
export function ShopStatsTicker() {
  // Duplicate the list so the marquee loops seamlessly
  const reel = [...ROWS, ...ROWS];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[color:oklch(0.72_0.01_260/0.45)] bg-white/85 backdrop-blur-sm shadow-sm h-10"
      aria-label="Yesterday vs today"
    >
      <div
        className="flex items-center gap-5 h-full whitespace-nowrap"
        style={{ animation: "shop-ticker 32s linear infinite" }}
      >
        {reel.map((r, i) => {
          const positive = r.delta >= 0;
          return (
            <span key={i} className="flex items-center gap-1.5 text-[11px] shrink-0 px-2">
              <span className="font-display font-bold text-[color:oklch(0.30_0.05_85)] uppercase tracking-wider text-[10px]">
                {r.label}
              </span>
              <span className="text-[10px] text-[color:oklch(0.55_0.10_82)] tabular-nums">
                {r.yesterday}
              </span>
              <span className="text-[color:oklch(0.55_0.10_82)]">→</span>
              <span className="font-display font-bold text-[color:oklch(0.20_0.01_260)] tabular-nums">
                {r.today}
              </span>
              {r.delta !== 0 && (
                <span
                  className={`flex items-center gap-0.5 font-bold tabular-nums ${
                    positive ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {positive ? (
                    <TrendingUp className="h-3 w-3" strokeWidth={2.6} />
                  ) : (
                    <TrendingDown className="h-3 w-3" strokeWidth={2.6} />
                  )}
                  {Math.abs(r.delta).toFixed(1)}%
                </span>
              )}
              <span className="text-[color:oklch(0.78_0.05_85)] ml-1">•</span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes shop-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
