import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  value?: string | null; // YYYY-MM-DD
  onClose: () => void;
  onSelect: (iso: string, age: number) => void;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const ROW_H = 40; // px per item

function calcAge(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date();
  let age = t.getFullYear() - y;
  const mDiff = t.getMonth() + 1 - m;
  if (mDiff < 0 || (mDiff === 0 && t.getDate() < d)) age -= 1;
  return age;
}

function Wheel({
  items,
  index,
  onIndex,
  width = 72,
  format,
}: {
  items: (number | string)[];
  index: number;
  onIndex: (i: number) => void;
  width?: number;
  format?: (v: number | string) => string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const settleRef = useRef<number | null>(null);

  // Sync scroll position when index changes externally
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: index * ROW_H, behavior: "smooth" });
  }, [index]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (settleRef.current) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      const i = Math.round(el.scrollTop / ROW_H);
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      if (clamped !== index) onIndex(clamped);
      el.scrollTo({ top: clamped * ROW_H, behavior: "smooth" });
    }, 120);
  };

  return (
    <div className="relative" style={{ width, height: ROW_H * 5 }}>
      {/* Center highlight band */}
      <div
        className="pointer-events-none absolute inset-x-0 rounded-xl border-y border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-r from-[#fff8dc]/60 via-[#fdf5d0]/85 to-[#fff8dc]/60"
        style={{ top: ROW_H * 2, height: ROW_H }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div style={{ height: ROW_H * 2 }} />
        {items.map((v, i) => {
          const dist = Math.abs(i - index);
          const active = dist === 0;
          return (
            <div
              key={i}
              className="snap-center grid place-items-center"
              style={{
                height: ROW_H,
                fontSize: active ? 22 : 17,
                fontWeight: active ? 800 : 500,
                color: active ? "oklch(0.22 0.10 82)" : "oklch(0.55 0.06 85 / 0.65)",
                transform: active ? "scale(1)" : `scale(${1 - dist * 0.06})`,
                transition: "color 0.2s, font-size 0.2s, transform 0.2s",
                letterSpacing: "0.02em",
              }}
            >
              {format ? format(v) : v}
            </div>
          );
        })}
        <div style={{ height: ROW_H * 2 }} />
      </div>
    </div>
  );
}

export function DobWheelPicker({ open, value, onClose, onSelect }: Props) {
  const today = new Date();
  const initial = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      return { d, m, y };
    }
    return { d: 15, m: 6, y: today.getFullYear() - 25 };
  }, [value]);

  const [dIdx, setDIdx] = useState(initial.d - 1);
  const [mIdx, setMIdx] = useState(initial.m - 1);
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = today.getFullYear() - 13; y >= today.getFullYear() - 90; y--) arr.push(y);
    return arr;
  }, [today]);
  const [yIdx, setYIdx] = useState(() => Math.max(0, years.indexOf(initial.y)));

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const yearVal = years[yIdx];
  const monthVal = mIdx + 1;
  const daysInMonth = new Date(yearVal, monthVal, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayVal = Math.min(dIdx + 1, daysInMonth);

  const iso = `${yearVal}-${String(monthVal).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`;
  const age = calcAge(iso);
  const validAge = age >= 13 && age <= 100;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.20_0.04_85/0.45)] backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-7"
        style={{
          background: "linear-gradient(180deg,#fffdf5 0%,#fbf3d9 100%)",
          boxShadow: "0 -22px 60px -16px rgba(212,175,55,0.55)",
          animation: "sheet-up 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div className="grid place-items-center pb-1">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg font-bold text-gold-gradient">Date of birth</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full grid place-items-center bg-white/80 border border-[color:oklch(0.78_0.14_82/0.45)] active:scale-95"
          >
            <X className="h-4 w-4 text-[color:oklch(0.40_0.10_82)]" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 justify-items-center">
          <Wheel
            items={days}
            index={Math.min(dIdx, days.length - 1)}
            onIndex={setDIdx}
            format={(v) => String(v).padStart(2, "0")}
          />
          <Wheel items={MONTHS} index={mIdx} onIndex={setMIdx} width={84} />
          <Wheel items={years} index={yIdx} onIndex={setYIdx} width={84} />
        </div>

        <p className="mt-3 text-center text-xs text-[color:oklch(0.40_0.08_85)] font-medium">
          {validAge
            ? <>Age: <span className="font-bold text-[color:oklch(0.28_0.10_82)]">{age} years</span></>
            : <span className="text-red-600">Age must be between 13 and 100</span>}
        </p>

        <button
          type="button"
          disabled={!validAge}
          onClick={() => onSelect(iso, age)}
          className="mt-4 w-full rounded-2xl py-3.5 font-display text-base font-bold text-[color:oklch(0.18_0.06_18)] disabled:opacity-40 active:scale-[0.98] transition-transform"
          style={{
            background: "linear-gradient(180deg,#fff3c8 0%,#f5d97a 35%,#d4af37 70%,#8b6508 100%)",
            boxShadow: "0 8px 22px -6px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          Confirm date of birth
        </button>
      </div>
    </div>
  );
}
