import { useEffect, useState } from "react";
import { X, Check, Tag, Sparkles } from "lucide-react";

export type Coupon = {
  code: string;
  /** percent off subtotal */
  percent?: number;
  /** flat ₹ off */
  flat?: number;
  label?: string;
};

const PRESETS: Coupon[] = [
  { code: "WELCOME10", percent: 10, label: "10% off your bill" },
  { code: "FESTIVE15", percent: 15, label: "Festive 15% off" },
  { code: "FLAT100", flat: 100, label: "₹100 off" },
  { code: "FLAT500", flat: 500, label: "₹500 off (orders > ₹2000)" },
  { code: "VIPGOLD", percent: 25, label: "VIP Gold member 25%" },
];

type Props = {
  current: Coupon | null;
  onApply: (c: Coupon | null) => void;
  onClose: () => void;
};

export function CouponSheet({ current, onApply, onClose }: Props) {
  const [code, setCode] = useState(current?.code ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const apply = (c: Coupon) => {
    onApply(c);
    onClose();
  };

  const tryCode = () => {
    const found = PRESETS.find(
      (p) => p.code.toLowerCase() === code.trim().toLowerCase(),
    );
    if (!found) {
      setError("Invalid coupon code");
      return;
    }
    apply(found);
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
          <div className="flex items-center gap-2">
            <span
              className="h-9 w-9 rounded-full grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
              style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)" }}
            >
              <Tag className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
                ✦ Coupon ✦
              </p>
              <h3 className="font-display text-base text-gold-gradient font-bold">
                Apply Discount Code
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Code input */}
        <div className="px-5 pb-3">
          <div className="flex items-stretch gap-2">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white font-display font-bold text-sm tracking-wider outline-none focus:border-[#d4af37] uppercase"
            />
            <button
              onClick={tryCode}
              disabled={!code.trim()}
              className="btn-3d px-4 rounded-xl font-display font-bold text-[12px] text-[color:oklch(0.18_0.06_18)] shadow-gold-glow disabled:opacity-40"
              style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
            >
              Apply
            </button>
          </div>
          {error && (
            <p className="text-[10px] text-rose-600 font-bold mt-1.5">{error}</p>
          )}
        </div>

        {/* Active */}
        {current && (
          <div className="px-5 pb-2">
            <div className="rounded-xl p-2.5 border-2 border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-white flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-700" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-display font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                  {current.code} applied
                </p>
                <p className="text-[9px] text-[color:oklch(0.45_0.08_85)] truncate">
                  {current.percent ? `${current.percent}% off` : `₹${current.flat} off`}
                </p>
              </div>
              <button
                onClick={() => {
                  onApply(null);
                  onClose();
                }}
                className="text-[10px] font-bold text-rose-600 px-2 py-1 rounded-full bg-rose-50 active:scale-90"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Suggested */}
        <div className="px-5 pb-5">
          <div className="flex items-center gap-1.5 mb-2 mt-1">
            <Sparkles className="h-3 w-3 text-[#d4af37]" />
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
              Suggested coupons
            </p>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {PRESETS.map((c) => {
              const active = current?.code === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => apply(c)}
                  className={`w-full flex items-center gap-3 rounded-xl p-2.5 border-2 transition active:scale-[0.98] ${
                    active
                      ? "border-[#d4af37] bg-gradient-to-br from-[#fff8dc] to-white shadow-gold-glow"
                      : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white"
                  }`}
                >
                  <span
                    className="h-9 w-12 rounded-md grid place-items-center text-[10px] font-display font-bold text-[color:oklch(0.18_0.06_18)] shadow-sm border border-dashed border-[#d4af37] flex-shrink-0"
                    style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a)" }}
                  >
                    {c.percent ? `${c.percent}%` : `₹${c.flat}`}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] truncate">
                      {c.code}
                    </p>
                    <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] truncate">
                      {c.label}
                    </p>
                  </div>
                  {active && (
                    <Check className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
