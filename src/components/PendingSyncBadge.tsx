import { Clock } from "lucide-react";

export function PendingSyncBadge({ label = "Pending sync" }: { label?: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold"
    >
      <Clock className="h-2.5 w-2.5" />
      Pending
    </span>
  );
}
