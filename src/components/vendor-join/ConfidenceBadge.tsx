import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { colorFor, levelFor, pctString } from "@/lib/scan-confidence";

export function ConfidenceDot({ score }: { score: number | null | undefined }) {
  const c = colorFor(levelFor(score));
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${c.dot}`}
      aria-label={`Confidence ${c.label}`}
      title={`Confidence: ${c.label} (${pctString(score)})`}
    />
  );
}

export function ConfidencePill({
  score,
  size = "sm",
}: {
  score: number | null | undefined;
  size?: "sm" | "md";
}) {
  const level = levelFor(score);
  const c = colorFor(level);
  const Icon =
    level === "high" ? ShieldCheck : level === "medium" ? ShieldQuestion : ShieldAlert;
  const cls =
    size === "md"
      ? "text-[11px] px-2 py-1"
      : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${cls} ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon className="h-3 w-3" />
      {pctString(score)}
    </span>
  );
}

export function ConfidenceBar({
  score,
  className = "",
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const level = levelFor(score);
  const c = colorFor(level);
  const pct = Math.round((score ?? 0) * 100);
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-2.5 ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={`text-[11px] font-extrabold uppercase tracking-wide ${c.text}`}>
          Overall confidence
        </div>
        <div className={`text-sm font-extrabold ${c.text}`}>
          {pctString(score)} · {c.label}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white overflow-hidden">
        <div
          className={`h-full ${c.dot}`}
          style={{ width: `${pct}%`, transition: "width .4s ease" }}
        />
      </div>
    </div>
  );
}
