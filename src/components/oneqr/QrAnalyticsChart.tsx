import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, HelpCircle } from "lucide-react";
import { AnalyticsCards, EMPTY_TOTALS, type DayStat, type Totals } from "./AnalyticsCards";

export type VisitRow = { id: string; created_at: string; visitor_phone?: string | null };

export type DashboardAnalytics = { ok?: boolean; days?: DayStat[]; totals?: Totals };

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
] as const;

const EMPTY_DAY: DayStat = {
  day: "", visitors: 0, unique: 0, customers: 0, downloads: 0,
  feedback: 0, inquiries: 0, orders: 0, pending: 0, earnings: 0,
};

function labelFor(day: string) {
  const d = new Date(`${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Live QR analytics: three animated cards for the selected day plus a tappable
 * day timeline. Data comes from the merchant-scoped analytics RPC.
 */
export function QrAnalyticsChart({
  visits, accent, analytics, onRange, onGuide,
}: {
  visits: VisitRow[];
  accent: string;
  analytics?: DashboardAnalytics | null;
  onRange?: (days: number) => void;
  onGuide?: () => void;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7");
  const [picked, setPicked] = useState<string | null>(null);
  const days = RANGES.find((r) => r.key === range)!.days;

  useEffect(() => { onRange?.(days); }, [days, onRange]);

  /** Fallback buckets from raw visits so the strip never renders empty. */
  const series = useMemo<DayStat[]>(() => {
    const rows = analytics?.days;
    if (rows && rows.length) return rows;
    const out: DayStat[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(base);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const inDay = visits.filter((v) => {
        const t = new Date(v.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
      out.push({
        ...EMPTY_DAY,
        day: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
        visitors: inDay.length,
        unique: inDay.length,
        customers: inDay.filter((r) => r.visitor_phone).length,
      });
    }
    return out;
  }, [analytics, visits, days]);

  const totals = analytics?.totals ?? {
    ...EMPTY_TOTALS,
    visits: visits.length,
    unique: visits.length,
    customers: visits.filter((v) => v.visitor_phone).length,
    bounced: visits.filter((v) => !v.visitor_phone).length,
  };

  const selectedDay =
    series.find((s) => s.day === picked) ?? series[series.length - 1] ?? EMPTY_DAY;
  const max = Math.max(1, ...series.map((s) => s.visitors));
  const step = series.length > 32 ? 3 : 1;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" style={{ color: accent }} />
        <p className="text-[12px] font-bold text-slate-800">QR analytics</p>
        {onGuide && (
          <button onClick={onGuide} aria-label="How to read this" className="text-slate-400 active:scale-90">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => { setRange(r.key); setPicked(null); }}
              className={`relative h-7 px-2.5 rounded-full text-[10px] font-extrabold transition ${
                range === r.key ? "text-white" : "text-amber-800/70"
              }`}
            >
              {range === r.key && (
                <motion.span
                  layoutId={`range-${accent}`}
                  className="absolute inset-0 rounded-full"
                  style={{ background: accent }}
                  transition={{ type: "spring", stiffness: 340, damping: 28 }}
                />
              )}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5">
        <AnalyticsCards
          day={selectedDay}
          totals={totals}
          accent={accent}
          dayLabel={selectedDay.day ? labelFor(selectedDay.day) : "Today"}
        />
      </div>

      {/* Interactive day timeline — tap a bar to re-read every card for that day */}
      <div className="mt-3 flex items-end gap-1.5 h-24">
        {series.map((s, i) => {
          if (i % step !== 0 && i !== series.length - 1) return null;
          const active = s.day === selectedDay.day;
          const d = s.day ? new Date(`${s.day}T00:00:00`) : null;
          return (
            <button
              key={s.day || i}
              onClick={() => setPicked(s.day)}
              className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full justify-end"
              aria-label={`${s.day}: ${s.visitors} visitors`}
            >
              <span className="text-[9px] font-bold text-slate-500 leading-none">{s.visitors || ""}</span>
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (s.visitors / max) * 100)}%` }}
                transition={{ delay: i * 0.015, type: "spring", stiffness: 220, damping: 24 }}
                className="w-full rounded-t-md will-change-transform"
                style={{ background: active ? accent : `${accent}44`, minHeight: 4 }}
              />
              <span
                className={`text-[8px] truncate w-full text-center ${active ? "font-extrabold text-slate-700" : "text-slate-400"}`}
              >
                {d ? d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3) : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
