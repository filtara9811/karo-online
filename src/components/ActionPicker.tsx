import { useEffect, useRef, useState } from "react";
import { Home as HomeIcon, Pin } from "lucide-react";

export type ActionOption = {
  value: string;
  label: string;
  sub?: string;
  icon: string;
  badge?: string;
};

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  options: ActionOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
  accent?: "gold" | "wine";
  /** Currently-pinned default home value (shows a badge). */
  defaultValue?: string;
  /** Fires when the user long-presses an option to pin it as default home. */
  onSetDefault?: (value: string) => void;
  /** Optional element rendered in the top-right corner of the sheet (e.g. Admin chip). */
  topRightAction?: React.ReactNode;
};

export function ActionPicker({
  open,
  title,
  subtitle,
  options,
  onSelect,
  onClose,
  defaultValue,
  onSetDefault,
  topRightAction,
}: Props) {
  const [pressing, setPressing] = useState<string | null>(null);
  const longPressFiredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const startPress = (value: string) => {
    if (!onSetDefault) return;
    longPressFiredRef.current = false;
    setPressing(value);
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onSetDefault(value);
      setPressing(null);
      // haptic feedback if available
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(40); } catch { /* noop */ }
      }
    }, 650);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(null);
  };


  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.45)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />

        <div className="absolute top-5 left-4 h-5 w-5 border-t border-l border-[color:oklch(0.78_0.14_82/0.6)] rounded-tl-lg" />
        <div className="absolute top-5 right-4 h-5 w-5 border-t border-r border-[color:oklch(0.78_0.14_82/0.6)] rounded-tr-lg" />

        {topRightAction && (
          <div className="absolute top-3 right-3 z-10">{topRightAction}</div>
        )}
        <div className="text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.55_0.10_82)] mb-1">
            ✦ Select ✦
          </p>
          <h2 className="font-display text-2xl text-gold-gradient leading-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground italic">{subtitle}</p>}
          {onSetDefault && (
            <p className="mt-1.5 text-[9px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82/0.85)]">
              ✦ Long-press to pin as Home ✦
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {options.map((opt, i) => {
            const isDefault = defaultValue === opt.value;
            const isPressing = pressing === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (longPressFiredRef.current) {
                    longPressFiredRef.current = false;
                    return;
                  }
                  onSelect(opt.value);
                }}
                onPointerDown={() => startPress(opt.value)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                className={`btn-3d group relative w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 bg-white/90 border transition-all overflow-hidden ${
                  isDefault
                    ? "border-[color:oklch(0.78_0.14_82)] shadow-gold-glow"
                    : "border-[color:oklch(0.78_0.14_82/0.45)] hover:border-[color:oklch(0.78_0.14_82)] hover:shadow-gold-glow"
                }`}
                style={{
                  animation: `fade-up 0.5s ease-out ${i * 0.07}s both`,
                  touchAction: "manipulation",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
              >
                {/* Long-press fill indicator */}
                {isPressing && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#fff8dc] via-[#f5d97a] to-[#d4af37]/70 pointer-events-none"
                    style={{ animation: "longpress-fill 650ms linear forwards" }}
                  />
                )}
                <div className="relative h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow flex-shrink-0 z-10">
                  <img
                    src={opt.icon}
                    alt=""
                    loading="lazy"
                    width={56}
                    height={56}
                    className="h-11 w-11 object-contain drop-shadow-[0_3px_6px_rgba(212,175,55,0.4)] group-hover:scale-110 transition-transform"
                  />
                  {opt.badge && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b6508] text-[9px] font-bold text-white shadow-md">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left z-10">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-lg text-gold-gradient leading-tight">{opt.label}</p>
                    {isDefault && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#8b6508] text-[8px] font-bold uppercase tracking-wider text-white shadow">
                        <HomeIcon className="h-2 w-2" strokeWidth={3} /> Home
                      </span>
                    )}
                  </div>
                  {opt.sub && <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>}
                </div>
                <span className="text-[color:oklch(0.55_0.10_82)] group-hover:text-[color:oklch(0.78_0.14_82)] transition-colors text-xl z-10">
                  {isDefault ? <Pin className="h-4 w-4 fill-[#d4af37] text-[#d4af37]" /> : "›"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-xs uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)] hover:text-[color:oklch(0.78_0.14_82)] py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
