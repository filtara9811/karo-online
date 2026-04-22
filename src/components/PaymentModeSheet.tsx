import { useEffect } from "react";
import { X, Banknote, Smartphone, CreditCard, Wallet, Globe } from "lucide-react";

export type PayMode = "cash" | "upi" | "online" | "card-credit" | "card-debit";

const MODES: { id: PayMode; label: string; icon: typeof Banknote; tone: string }[] = [
  { id: "cash", label: "Cash", icon: Banknote, tone: "from-[#fff8dc] to-[#f5d97a]" },
  { id: "upi", label: "UPI / QR", icon: Smartphone, tone: "from-[#dcfce7] to-[#86efac]" },
  { id: "online", label: "Online", icon: Globe, tone: "from-[#dbeafe] to-[#93c5fd]" },
  { id: "card-credit", label: "Credit Card", icon: CreditCard, tone: "from-[#fce7f3] to-[#f9a8d4]" },
  { id: "card-debit", label: "Debit Card", icon: Wallet, tone: "from-[#ede9fe] to-[#c4b5fd]" },
];

type Props = {
  current: PayMode;
  onPick: (m: PayMode) => void;
  onClose: () => void;
};

export function PaymentModeSheet({ current, onPick, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
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
              ✦ Payment Mode ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">How will they pay?</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 grid grid-cols-2 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = current === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onPick(m.id);
                  onClose();
                }}
                className={`rounded-2xl p-3 flex flex-col items-start gap-2 border-2 active:scale-95 transition ${
                  active
                    ? "border-[#d4af37] shadow-gold-glow"
                    : "border-[color:oklch(0.78_0.14_82/0.3)]"
                }`}
                style={{
                  background: active
                    ? `linear-gradient(180deg, var(--tw-gradient-stops))`
                    : "white",
                }}
              >
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br ${m.tone}`}
                >
                  <Icon className="h-5 w-5 text-[color:oklch(0.25_0.05_85)]" />
                </span>
                <span className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)]">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
