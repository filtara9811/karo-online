import { motion } from "framer-motion";
import {
  Clock,
  Shield,
  Award,
  Star,
  Pencil,
  MoreHorizontal,
  Package,
} from "lucide-react";

const GOLD = "linear-gradient(135deg, #f5d97a 0%, #d4af37 55%, #b8860b 100%)";

export type ListingCardData = {
  id: string;
  name: string;
  subtitle: string;
  image?: string | null;
  priceMin: number | null;
  priceMax: number | null;
  isActive: boolean;
  updatedLabel: string;
  duration?: string;
  serviceType?: string;
  grade?: string;
  rating?: number | null;
  reviews?: number | null;
  orders?: number;
  leads?: number;
  views?: number | string;
  responseRate?: string;
};

type Props = {
  data: ListingCardData;
  index: number;
  saving?: boolean;
  onToggle: () => void;
  onEditPrice: () => void;
  onMore: () => void;
};

export function ListingCard({ data, index, saving, onToggle, onEditPrice, onMore }: Props) {
  const d = data;
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: "easeOut" }}
      className="rounded-2xl bg-white border border-[color:oklch(0.90_0.03_82)] shadow-[0_2px_10px_-4px_rgba(184,134,11,0.15)] overflow-hidden"
    >
      <div className="p-3 flex gap-3">
        <div className="h-[72px] w-[72px] rounded-2xl bg-[color:oklch(0.96_0.02_82)] overflow-hidden flex-shrink-0 grid place-items-center border border-[color:oklch(0.90_0.03_82)]">
          {d.image ? (
            <img src={d.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-7 w-7 text-[color:oklch(0.60_0.05_60)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-[14px] font-bold text-[color:oklch(0.22_0.05_60)] truncate leading-tight">
                {d.name}
              </p>
              <p className="text-[10.5px] font-semibold text-[color:oklch(0.48_0.04_60)] truncate mt-0.5">
                {d.subtitle}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${
                  d.isActive
                    ? "bg-[color:oklch(0.94_0.10_150)] text-[color:oklch(0.38_0.14_150)]"
                    : "bg-[color:oklch(0.94_0.02_60)] text-[color:oklch(0.45_0.03_60)]"
                }`}
              >
                {d.isActive ? "Active" : "Inactive"}
              </span>
              <button
                disabled={saving}
                onClick={onToggle}
                className="relative h-5 w-9 rounded-full transition-all"
                style={
                  d.isActive
                    ? { background: GOLD }
                    : { background: "oklch(0.88 0.02 60)" }
                }
                aria-label="Toggle active"
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    d.isActive ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 gap-2">
            <p className="font-display text-[13px] font-bold text-[color:oklch(0.40_0.10_65)] tabular-nums truncate">
              {d.priceMin != null || d.priceMax != null
                ? `₹${d.priceMin ?? "—"} – ₹${d.priceMax ?? "—"}`
                : "Price not set"}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onEditPrice}
                className="h-6 w-6 rounded-md border border-[color:oklch(0.85_0.05_82)] grid place-items-center active:scale-90"
                aria-label="Edit price"
              >
                <Pencil className="h-3 w-3 text-[color:oklch(0.45_0.10_65)]" />
              </button>
              <span className="text-[9.5px] text-[color:oklch(0.55_0.03_60)]">
                {d.updatedLabel}
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {d.duration && (
              <Meta icon={Clock} label={d.duration} />
            )}
            {d.serviceType && <Meta icon={Shield} label={d.serviceType} />}
            {d.grade && <Meta icon={Award} label={d.grade} />}
            {d.rating != null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[color:oklch(0.40_0.12_65)]">
                <Star className="h-3 w-3 fill-current" />
                {d.rating.toFixed(1)}
                {d.reviews ? (
                  <span className="text-[9px] font-normal text-[color:oklch(0.50_0.04_60)]">
                    ({d.reviews})
                  </span>
                ) : null}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 border-t border-[color:oklch(0.94_0.02_82)] bg-[color:oklch(0.98_0.01_82)] py-2 px-3 items-center">
        <KPI label="Orders" value={d.orders ?? 0} color="oklch(0.45 0.15 150)" />
        <KPI label="Leads" value={d.leads ?? 0} color="oklch(0.45 0.15 240)" />
        <KPI label="Views" value={d.views ?? 0} color="oklch(0.42 0.14 290)" />
        <KPI label="Resp" value={d.responseRate ?? "—"} color="oklch(0.45 0.15 150)" />
        <button
          onClick={onMore}
          className="h-7 w-7 rounded-full grid place-items-center border border-[color:oklch(0.88_0.03_82)] bg-white active:scale-90"
          aria-label="More"
        >
          <MoreHorizontal className="h-4 w-4 text-[color:oklch(0.50_0.04_60)]" />
        </button>
      </div>
    </motion.li>
  );
}

function Meta({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-[color:oklch(0.45_0.04_60)]">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col">
      <p className="text-[8.5px] uppercase tracking-wide text-[color:oklch(0.55_0.04_60)]">
        {label}
      </p>
      <p className="font-display text-[13px] font-bold tabular-nums leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
