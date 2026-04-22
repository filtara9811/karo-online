import { useEffect, useState } from "react";
import { X, Check, Minus, Plus } from "lucide-react";

export type ValueMode = {
  /** unit/key id for outer state — caller decides what to do with it */
  id: string;
  /** label shown in the toggle pill */
  label: string;
  /** unit applied to the value when this mode is active */
  unit: "%" | "₹";
  /** sign — positive adds, negative subtracts */
  sign?: 1 | -1;
};

type Props = {
  title: string;
  subtitle?: string;
  /** Current value (sign of value reflects sign of mode) */
  value: number;
  presets: number[];
  min?: number;
  max?: number;
  step?: number;
  /** Picker tone */
  tone?: "gold" | "rose" | "emerald" | "indigo";
  /**
   * Optional set of modes (flat/percent, include/add gst, +/- discount).
   * When provided the sheet shows a segmented mode switcher and returns mode id.
   */
  modes?: ValueMode[];
  /** Currently active mode id (must match one of `modes`) */
  modeId?: string;
  /**
   * Single-mode shortcut — used when modes is omitted.
   */
  unit?: "%" | "₹";
  onPick: (v: number, modeId?: string) => void;
  onClose: () => void;
};

const TONES = {
  gold: {
    accent: "#d4af37",
    bg: "linear-gradient(180deg, #fff8dc, #f5d97a)",
    text: "oklch(0.30 0.10 82)",
  },
  rose: {
    accent: "#e11d48",
    bg: "linear-gradient(180deg, #fde7eb, #f9c4cc)",
    text: "oklch(0.35 0.18 18)",
  },
  emerald: {
    accent: "#059669",
    bg: "linear-gradient(180deg, #d1fae5, #6ee7b7)",
    text: "oklch(0.30 0.12 160)",
  },
  indigo: {
    accent: "#4f46e5",
    bg: "linear-gradient(180deg, #e0e7ff, #a5b4fc)",
    text: "oklch(0.30 0.15 270)",
  },
};

export function ValuePickerSheet({
  title,
  subtitle,
  value,
  presets,
  min = 0,
  max = 100,
  step = 1,
  tone = "gold",
  modes,
  modeId,
  unit,
  onPick,
  onClose,
}: Props) {
  const initialMode = modes?.find((m) => m.id === modeId) ?? modes?.[0];
  const [activeId, setActiveId] = useState<string | undefined>(initialMode?.id);
  const active = modes?.find((m) => m.id === activeId);
  const effectiveUnit = (active?.unit ?? unit ?? "%") as "%" | "₹";
  const [v, setV] = useState(Math.abs(value));
  const t = TONES[tone];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const apply = () => {
    const sign = active?.sign ?? 1;
    onPick(v * sign, active?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 50%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ {title} ✦
            </p>
            {subtitle && (
              <p className="text-[11px] text-[color:oklch(0.45_0.08_85)]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode segmented switcher */}
        {modes && modes.length > 1 && (
          <div className="px-5 pb-3">
            <div className="grid gap-1 p-1 rounded-xl bg-white/80 border border-[color:oklch(0.78_0.14_82/0.4)]"
              style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
            >
              {modes.map((m) => {
                const isActive = activeId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveId(m.id)}
                    className={`py-1.5 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 ${
                      isActive
                        ? "text-[color:oklch(0.18_0.06_18)] shadow"
                        : "text-[color:oklch(0.55_0.10_82)]"
                    }`}
                    style={
                      isActive
                        ? { background: t.bg, border: `1px solid ${t.accent}` }
                        : undefined
                    }
                  >
                    {m.sign === -1 && <Minus className="h-3 w-3" strokeWidth={3} />}
                    {m.sign === 1 && <Plus className="h-3 w-3" strokeWidth={3} />}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Big value display */}
        <div className="px-5 pb-3 grid place-items-center">
          <div
            className="rounded-3xl px-8 py-4 border-2 shadow-md flex items-baseline gap-1"
            style={{ borderColor: t.accent, background: t.bg }}
          >
            {active?.sign === -1 && (
              <span className="font-display font-bold text-2xl" style={{ color: t.text }}>
                −
              </span>
            )}
            <span className="font-display font-bold text-4xl" style={{ color: t.text }}>
              {effectiveUnit === "₹" ? "₹" : ""}
              {v}
            </span>
            {effectiveUnit === "%" && (
              <span className="font-display font-bold text-xl" style={{ color: t.text }}>
                %
              </span>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="px-5 pb-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setV((x) => clamp(x - step))}
            className="h-11 w-11 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center active:scale-90 shadow-sm"
          >
            <Minus className="h-5 w-5" />
          </button>
          <input
            type="number"
            value={v}
            onChange={(e) => setV(clamp(Number(e.target.value) || 0))}
            inputMode="numeric"
            className="w-24 text-center bg-white rounded-xl border border-[color:oklch(0.78_0.14_82/0.5)] py-2 font-display text-lg font-bold outline-none focus:border-[#d4af37]"
          />
          <button
            onClick={() => setV((x) => clamp(x + step))}
            className="h-11 w-11 rounded-full grid place-items-center active:scale-90 shadow-gold-glow text-[color:oklch(0.18_0.06_18)]"
            style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)" }}
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        {/* Presets */}
        <div className="px-5 pb-4">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-2">
            Quick pick
          </p>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => {
              const isActive = v === p;
              return (
                <button
                  key={p}
                  onClick={() => setV(p)}
                  className={`py-2 rounded-xl font-display font-bold text-sm border-2 transition active:scale-95 ${
                    isActive
                      ? "shadow-gold-glow text-[color:oklch(0.18_0.06_18)]"
                      : "bg-white text-[color:oklch(0.42_0.10_82)] border-[color:oklch(0.78_0.14_82/0.4)]"
                  }`}
                  style={
                    isActive
                      ? { background: t.bg, borderColor: t.accent }
                      : undefined
                  }
                >
                  {effectiveUnit === "₹" ? "₹" : ""}
                  {p}
                  {effectiveUnit === "%" ? "%" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={apply}
            className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-base text-[color:oklch(0.18_0.06_18)] shadow-gold-glow flex items-center justify-center gap-2"
            style={{
              background:
                "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
            }}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
            Apply {active?.sign === -1 ? "−" : ""}
            {effectiveUnit === "₹" ? "₹" : ""}
            {v}
            {effectiveUnit === "%" ? "%" : ""}
            {active ? ` · ${active.label}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
