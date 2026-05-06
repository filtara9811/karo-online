import { useEffect, useRef, useState } from "react";
import { fmtShort } from "@/lib/format";

/**
 * Animates 0 → target with easeOutCubic. Re-runs when target changes.
 * If `format` is provided, uses it; otherwise uses Indian short-scale.
 */
export function AnimatedNumber({
  value,
  duration = 1100,
  format,
  className,
  style,
  prefix = "",
  suffix = "",
  digits = 2,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
  digits?: number;
}) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = Number(value) || 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setN(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  const out = format ? format(n) : fmtShort(n, digits);
  return (
    <span className={className}>
      {prefix}
      {out}
      {suffix}
    </span>
  );
}
