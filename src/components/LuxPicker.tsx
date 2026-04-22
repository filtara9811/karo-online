import { useEffect } from "react";

export type PickerOption = {
  value: string;
  label: string;
  sub?: string;
  icon: string;
};

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function LuxPicker({ open, title, subtitle, options, onSelect, onClose }: Props) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <button
        aria-label="Close picker"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* grab handle */}
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#f5d97a] to-transparent opacity-70" />

        {/* corner ornaments */}
        <div className="absolute top-5 left-4 h-5 w-5 border-t border-l border-[color:oklch(0.84_0.15_85/0.6)] rounded-tl-lg" />
        <div className="absolute top-5 right-4 h-5 w-5 border-t border-r border-[color:oklch(0.84_0.15_85/0.6)] rounded-tr-lg" />

        <div className="text-center mb-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.84_0.15_85/0.7)] mb-1">
            ✦ Select ✦
          </p>
          <h2 className="font-display text-2xl text-gold-gradient leading-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground italic">{subtitle}</p>}
        </div>

        <div className="space-y-2.5">
          {options.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className="btn-3d group w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 bg-gradient-to-br from-white to-[#fffaf0] border border-[color:oklch(0.78_0.14_82/0.45)] hover:border-[color:oklch(0.78_0.14_82)] hover:shadow-gold-glow transition-all"
              style={{ animation: `fade-up 0.5s ease-out ${i * 0.06}s both` }}
            >
              <div className="relative h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow flex-shrink-0">
                <img
                  src={opt.icon}
                  alt=""
                  loading="lazy"
                  width={56}
                  height={56}
                  className="h-11 w-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform"
                />
              </div>
              <div className="flex-1 text-left">
                <p className="font-display text-lg text-gold-gradient leading-tight">{opt.label}</p>
                {opt.sub && <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>}
              </div>
              <span className="text-[color:oklch(0.84_0.15_85/0.6)] group-hover:text-[color:oklch(0.84_0.15_85)] transition-colors text-xl">
                ›
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-xs uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.6)] hover:text-[color:oklch(0.84_0.15_85)] py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
