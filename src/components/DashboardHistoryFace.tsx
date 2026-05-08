import { TrendingUp, TrendingDown, RotateCcw, Trophy } from "lucide-react";

type Row = {
  label: string;
  yesterday: string;
  today: string;
  delta: number; // % change
};

/**
 * Back face of the visiting-card dashboard.
 * Shows yesterday vs today comparison with up/down deltas.
 */
export function DashboardHistoryFace({
  onFlipBack,
}: {
  onFlipBack: () => void;
}) {
  const rows: Row[] = [
    { label: "Sales", yesterday: "₹14,820", today: "₹19,197", delta: 29.5 },
    { label: "Orders", yesterday: "42", today: "57", delta: 35.7 },
    { label: "Customers", yesterday: "31", today: "48", delta: 54.8 },
    { label: "Avg Bill", yesterday: "₹353", today: "₹399", delta: 13.0 },
    { label: "Profit", yesterday: "₹3,240", today: "₹4,470", delta: 37.9 },
    { label: "Loss", yesterday: "₹260", today: "₹180", delta: -30.7 },
  ];

  return (
    <article
      className="relative overflow-hidden rounded-3xl border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_18px_40px_-16px_rgba(212,175,55,0.55)] h-full"
      style={{
        background:
          "linear-gradient(135deg, #fdf3c8 0%, #f5d97a 55%, #d4af37 100%)",
      }}
    >
      <div className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full border border-white/40" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full border border-white/30" />

      <header className="relative px-4 pt-3.5 pb-2 flex items-center gap-3">
        <span
          className="h-10 w-10 rounded-full grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow border-2 border-white"
          style={{
            background:
              "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
          }}
        >
          <Trophy className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.42_0.10_82)] font-bold">
            ✦ History ✦
          </p>
          <h2 className="font-display text-base text-[color:oklch(0.22_0.08_30)] font-bold leading-tight truncate uppercase">
            Yesterday vs Today
          </h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlipBack();
          }}
          aria-label="Flip back to live"
          className="h-8 w-8 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.55_0.14_82/0.6)] active:scale-90"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" />
        </button>
      </header>

      <div className="relative px-3 pb-3">
        <div className="rounded-2xl bg-white/85 backdrop-blur-sm border border-white/60 divide-y divide-[color:oklch(0.78_0.14_82/0.25)]">
          {rows.map((r) => {
            const positive = r.delta >= 0;
            return (
              <div
                key={r.label}
                className="grid grid-cols-12 items-center px-3 py-1.5 text-[11px]"
              >
                <span className="col-span-3 font-display font-bold text-[color:oklch(0.30_0.05_85)]">
                  {r.label}
                </span>
                <span className="col-span-3 text-[10px] text-[color:oklch(0.55_0.10_82)] tabular-nums">
                  {r.yesterday}
                </span>
                <span className="col-span-3 font-display font-bold text-[color:oklch(0.18_0.06_18)] tabular-nums">
                  {r.today}
                </span>
                <span
                  className={`col-span-3 flex items-center justify-end gap-0.5 font-bold tabular-nums ${
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
              </div>
            );
          })}
        </div>

        <div className="mt-2 rounded-xl bg-white/85 border border-white/60 px-3 py-1.5 flex items-center justify-between text-[10px]">
          <span className="font-display font-bold text-[color:oklch(0.30_0.05_85)]">
            Top Product
          </span>
          <span className="font-display font-bold text-gold-gradient">
            Aurum Perfume · 18 sold
          </span>
        </div>

        <p className="text-center text-[9px] uppercase tracking-[0.25em] text-[color:oklch(0.32_0.08_60)] font-bold mt-2">
          ↺ Long-press or tap ⟲ to flip back
        </p>
      </div>
    </article>
  );
}
