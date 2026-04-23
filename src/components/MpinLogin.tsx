import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Delete, Fingerprint } from "lucide-react";

/**
 * Premium 4-digit MPIN entry for returning vendors.
 * - Tap-to-enter dots, calm animation, no input flicker.
 * - Demo PIN: 1234 (replace with auth call later).
 */
export function MpinLogin({
  onSuccess,
  onSwitchToSignup,
}: {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (pin.length !== 4) return;
    // Demo: accept any 4-digit pin (or hard-check 1234).
    const t = setTimeout(() => {
      if (pin === "1234" || pin.length === 4) {
        onSuccess();
        navigate({ to: "/vendor/dashboard" });
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [pin, navigate, onSuccess]);

  const press = (digit: string) => {
    if (pin.length >= 4) return;
    setPin((p) => p + digit);
  };
  const erase = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="flex flex-col items-center pt-6 pb-8">
      <div
        className="h-16 w-16 rounded-full grid place-items-center mb-3 shadow-md border-2 border-white"
        style={{
          background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
        }}
      >
        <Fingerprint className="h-8 w-8 text-[color:oklch(0.18_0.06_18)]" strokeWidth={2.2} />
      </div>

      <h2 className="font-display text-2xl text-gold-gradient font-bold tracking-wide">
        Welcome back
      </h2>
      <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-1">
        Enter your 4-digit MPIN to continue
      </p>

      {/* 4 Dots */}
      <div
        className={`mt-6 flex items-center gap-4 transition-transform ${
          error ? "animate-[shake_0.4s_ease-in-out]" : ""
        }`}
        style={
          error
            ? { animation: "shake 0.45s cubic-bezier(.36,.07,.19,.97) both" }
            : undefined
        }
      >
        {[0, 1, 2, 3].map((i) => {
          const filled = pin.length > i;
          return (
            <span
              key={i}
              className="h-4 w-4 rounded-full border-2 transition-all"
              style={{
                borderColor: error
                  ? "#dc2626"
                  : filled
                  ? "#d4af37"
                  : "rgba(184,134,11,0.45)",
                background: filled
                  ? "linear-gradient(180deg, #fff3c8, #d4af37 70%, #8b6508)"
                  : "transparent",
                transform: filled ? "scale(1.05)" : "scale(1)",
                boxShadow: filled
                  ? "0 2px 6px -1px rgba(212,175,55,0.55)"
                  : "none",
              }}
            />
          );
        })}
      </div>

      {error && (
        <p className="text-[11px] text-red-600 font-bold mt-3">
          Wrong MPIN — try again
        </p>
      )}

      {/* Keypad */}
      <div className="mt-7 grid grid-cols-3 gap-3 w-full max-w-[260px]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton key={d} onPress={() => press(d)}>
            {d}
          </KeypadButton>
        ))}
        <button
          onClick={onSwitchToSignup}
          className="text-[10px] uppercase tracking-wider font-bold text-[color:oklch(0.45_0.10_82)] active:scale-95"
        >
          Sign-up
        </button>
        <KeypadButton onPress={() => press("0")}>0</KeypadButton>
        <button
          onClick={erase}
          aria-label="Delete"
          className="h-14 grid place-items-center rounded-2xl bg-white/70 border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-95"
        >
          <Delete className="h-5 w-5 text-[color:oklch(0.42_0.10_82)]" />
        </button>
      </div>

      <button
        className="mt-5 text-[11px] underline text-[color:oklch(0.45_0.10_82)] font-semibold"
        onClick={() => alert("MPIN reset link sent to your registered number.")}
      >
        Forgot MPIN?
      </button>
    </div>
  );
}

function KeypadButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className="h-14 rounded-2xl font-display text-2xl font-bold text-[color:oklch(0.25_0.05_85)] bg-gradient-to-b from-white to-[#fdfaf0] border border-[color:oklch(0.78_0.14_82/0.45)] shadow-[0_2px_8px_-3px_rgba(212,175,55,0.4)] active:scale-95 active:shadow-inner transition-transform"
    >
      {children}
    </button>
  );
}
