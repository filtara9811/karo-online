import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Eye } from "lucide-react";

export type VisitRow = { id: string; created_at: string; visitor_phone?: string | null };

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
] as const;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Visitors + today's scans chart with a selectable date range. */
export function QrAnalyticsChart({ visits, accent }: { visits: VisitRow[]; accent: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7");
  const days = RANGES.find((r) => r.key === range)!.days;

  const series = useMemo(() => {
    const buckets: { label: string; short: string; count: number; leads: number; isToday: boolean }[] = [];
    const now = new Date();
    const step = days <= 7 ? 1 : days <= 30 ? 3 : 9;
    for (let i = days - 1; i >= 0; i -= step) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + step);
      const rows = visits.filter((v) => {
        const t = new Date(v.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
      buckets.push({
        label: start.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        short: start.toLocaleDateString(undefined, step === 1 ? { weekday: "narrow" } : { day: "numeric" }),
        count: rows.length,
        leads: rows.filter((r) => r.visitor_phone).length,
        isToday: dayKey(start) === dayKey(now),
      });
    }
    return buckets;
  }, [visits, days]);

  const max = Math.max(1, ...series.map((s) => s.count));
  const windowStart = Date.now() - days * 864e5;
  const inRange = visits.filter((v) => new Date(v.created_at).getTime() >= windowStart);
  const todayCount = visits.filter(
    (v) => dayKey(new Date(v.created_at)) === dayKey(new Date()),
  ).length;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" style={{ color: accent }} />
        <p className="text-[12px] font-bold text-slate-800">QR analytics</p>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
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

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-amber-50/70 px-2.5 py-2">
          <p className="text-[10px] text-amber-800/80 inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> Visitors
          </p>
          <p className="text-[17px] font-extrabold text-slate-900 leading-none mt-0.5">{inRange.length}</p>
        </div>
        <div className="rounded-xl bg-amber-50/70 px-2.5 py-2">
          <p className="text-[10px] text-amber-800/80 inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> Today's scans
          </p>
          <p className="text-[17px] font-extrabold text-slate-900 leading-none mt-0.5">{todayCount}</p>
        </div>
      </div>

      <div className="mt-3 flex items-end gap-1.5 h-24">
        {series.map((s, i) => (
          <div key={s.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 leading-none">{s.count || ""}</span>
            <motion.span
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (s.count / max) * 100)}%` }}
              transition={{ delay: i * 0.02, type: "spring", stiffness: 220, damping: 24 }}
              className="w-full rounded-t-md"
              style={{
                background: s.isToday ? accent : `${accent}55`,
                minHeight: 4,
              }}
              title={`${s.label}: ${s.count} visitors, ${s.leads} leads`}
            />
            <span className="text-[8px] text-slate-400 truncate w-full text-center">{s.short}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
