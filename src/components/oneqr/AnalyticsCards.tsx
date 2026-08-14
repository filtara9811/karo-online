import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Users, UserRound, IndianRupee } from "lucide-react";

export type DayStat = {
  day: string;
  visitors: number;
  unique: number;
  customers: number;
  downloads: number;
  feedback: number;
  inquiries: number;
  orders: number;
  pending: number;
  earnings: number;
};

export type Totals = {
  visits: number;
  unique: number;
  customers: number;
  bounced: number;
  downloads: number;
  feedback: number;
  inquiries: number;
  orders: number;
  pending: number;
  earnings: number;
};

export const EMPTY_TOTALS: Totals = {
  visits: 0, unique: 0, customers: 0, bounced: 0, downloads: 0,
  feedback: 0, inquiries: 0, orders: 0, pending: 0, earnings: 0,
};

/** 0 → value count-up (spring-timed, respects reduced motion). */
export function CountUp({
  value, format, className,
}: { value: number; format?: (n: number) => string; className?: string }) {
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (still) { setShown(value); from.current = value; return; }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
      onComplete: () => { from.current = value; },
    });
    return () => controls.stop();
  }, [value, still]);

  const n = Math.round(shown);
  return <span className={className}>{format ? format(n) : n.toLocaleString("en-IN")}</span>;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Three high-density analytics cards for the selected day, with lifetime
 * sub-metrics underneath. All numbers come from real merchant rows.
 */
export function AnalyticsCards({
  day, totals, accent, dayLabel,
}: { day: DayStat; totals: Totals; accent: string; dayLabel: string }) {
  const bounce = totals.visits > 0 ? Math.round((totals.bounced / totals.visits) * 100) : 0;
  const aov = totals.orders > 0 ? Math.round(totals.earnings / totals.orders) : 0;

  return (
    <div className="space-y-2">
      <Card
        icon={Users}
        accent={accent}
        title={`${dayLabel} visitors`}
        big={day.visitors}
        subs={[
          { label: "Total visits", value: totals.visits },
          { label: "Unique", value: totals.unique },
          { label: "Bounce", value: bounce, format: (n) => `${n}%` },
        ]}
        extra={{ label: "Downloads", value: day.downloads }}
      />
      <Card
        icon={UserRound}
        accent={accent}
        title={`${dayLabel} customers`}
        big={day.customers}
        subs={[
          { label: "Total customers", value: totals.customers },
          { label: "Feedback", value: totals.feedback },
          { label: "Inquiry", value: totals.inquiries },
        ]}
      />
      <Card
        icon={IndianRupee}
        accent={accent}
        title={`${dayLabel} earnings`}
        big={day.earnings}
        bigFormat={inr}
        subs={[
          { label: "Total orders", value: totals.orders },
          { label: "Pending", value: totals.pending },
          { label: "Avg order", value: aov, format: inr },
        ]}
      />
    </div>
  );
}

function Card({
  icon: Icon, title, big, bigFormat, subs, accent, extra,
}: {
  icon: typeof Users;
  title: string;
  big: number;
  bigFormat?: (n: number) => string;
  subs: { label: string; value: number; format?: (n: number) => string }[];
  accent: string;
  extra?: { label: string; value: number };
}) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="rounded-2xl bg-white border border-black/5 px-3 py-2.5"
      style={{ boxShadow: "0 10px 26px -20px rgba(15,23,42,0.55)" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="h-9 w-9 shrink-0 grid place-items-center rounded-xl"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">{title}</p>
          <CountUp
            value={big}
            format={bigFormat}
            className="block text-[24px] leading-none font-extrabold text-slate-900 tabular-nums"
          />
        </div>
        {extra && (
          <div className="ml-auto text-right">
            <p className="text-[9px] font-bold uppercase text-slate-400">{extra.label}</p>
            <CountUp value={extra.value} className="text-[15px] font-extrabold text-slate-800 tabular-nums" />
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {subs.map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50 px-2 py-1.5 min-w-0">
            <CountUp
              value={s.value}
              format={s.format}
              className="block text-[13px] font-extrabold text-slate-900 leading-none tabular-nums"
            />
            <p className="text-[9px] text-slate-500 mt-0.5 truncate">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
