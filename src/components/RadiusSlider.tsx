import { Slider } from "@/components/ui/slider";
import { Infinity as InfinityIcon, MapPin } from "lucide-react";

type Props = {
  /** value in km; 0 = Unlimited */
  value: number;
  onChange: (km: number) => void;
  label?: string;
  /** Min km on the slider (1) */
  min?: number;
  /** Max km on the slider (50). One step beyond max = Unlimited (0). */
  max?: number;
  className?: string;
};

/**
 * Volume-style radius slider: 1 → 50 km, with one extra "Unlimited" stop.
 * Internal slider position uses 1..max+1 where (max+1) maps to value=0 (Unlimited).
 */
export function RadiusSlider({
  value,
  onChange,
  label = "Search radius",
  min = 1,
  max = 50,
  className,
}: Props) {
  const unlimitedPos = max + 1;
  const pos = value === 0 ? unlimitedPos : Math.min(Math.max(value, min), max);
  const isUnlimited = value === 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-display font-bold text-[color:oklch(0.30_0.05_85)]">
          <MapPin className="h-3.5 w-3.5 text-[color:oklch(0.45_0.10_82)]" />
          <span>{label}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#fff8dc] to-[#fbbf24] border border-[color:oklch(0.78_0.14_82/0.6)] text-[11px] font-display font-bold text-[color:oklch(0.30_0.05_85)] flex items-center gap-1">
          {isUnlimited ? (
            <>
              <InfinityIcon className="h-3 w-3" strokeWidth={2.5} />
              Unlimited
            </>
          ) : (
            <>{pos} km</>
          )}
        </span>
      </div>
      <Slider
        value={[pos]}
        min={min}
        max={unlimitedPos}
        step={1}
        onValueChange={(v) => {
          const p = v[0] ?? min;
          onChange(p >= unlimitedPos ? 0 : p);
        }}
      />
      <div className="flex justify-between text-[9px] text-[color:oklch(0.50_0.06_85)] mt-1 font-medium">
        <span>{min} km</span>
        <span>{Math.round(max / 2)} km</span>
        <span>{max} km</span>
        <span className="flex items-center gap-0.5">
          <InfinityIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}
