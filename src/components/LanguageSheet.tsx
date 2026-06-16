import { useEffect } from "react";
import { X, Check, Languages } from "lucide-react";

export type AppLang = "en" | "hi";
export const LANG_KEY = "ko-app-lang";

export function getStoredLang(): AppLang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function setStoredLang(l: AppLang) {
  try {
    window.localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
}

const OPTIONS: { value: AppLang; label: string; native: string; sub: string }[] = [
  { value: "en", label: "English", native: "English", sub: "Default" },
  { value: "hi", label: "Hindi", native: "हिन्दी", sub: "Bharat" },
];

export function LanguageSheet({
  open,
  value,
  onSelect,
  onClose,
}: {
  open: boolean;
  value: AppLang;
  onSelect: (v: AppLang) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
            <h3 className="font-display text-lg font-bold text-gold-gradient">Choose language</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full grid place-items-center bg-white/80 border border-[color:oklch(0.78_0.14_82/0.45)] active:scale-95"
          >
            <X className="h-4 w-4 text-[color:oklch(0.40_0.10_82)]" />
          </button>
        </div>

        <div className="space-y-2">
          {OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setStoredLang(o.value);
                  onSelect(o.value);
                }}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition active:scale-[0.99] ${
                  active
                    ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]"
                    : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/85"
                }`}
              >
                <span
                  className="h-11 w-11 rounded-xl grid place-items-center font-display font-bold text-base text-[color:oklch(0.22_0.10_82)]"
                  style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}
                >
                  {o.value === "en" ? "A" : "अ"}
                </span>
                <div className="flex-1 text-left">
                  <div className="font-display text-base font-bold text-[color:oklch(0.26_0.06_85)] leading-tight">
                    {o.native}
                  </div>
                  <div className="text-[11px] uppercase tracking-widest text-[color:oklch(0.50_0.08_85)]">
                    {o.label} · {o.sub}
                  </div>
                </div>
                {active && <Check className="h-5 w-5 text-emerald-700" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
