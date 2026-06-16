import { useEffect } from "react";
import { Home } from "lucide-react";

type Props = {
  open: boolean;
  name?: string;
  ctaLabel?: string;
  autoClose?: boolean;
  onDone: () => void;
};

export function SuccessOverlay({ open, name, ctaLabel = "Go to Home", autoClose = false, onDone }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    let t: ReturnType<typeof setTimeout> | undefined;
    if (autoClose) t = setTimeout(onDone, 2600);
    return () => {
      if (t) clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open, onDone, autoClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #fffdf5 0%, #fbf3d9 55%, #f5e9b8 100%)",
        animation: "overlay-in 0.4s ease-out",
      }}
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute block rounded-full"
          style={{
            width: `${6 + (i % 4) * 4}px`,
            height: `${6 + (i % 4) * 4}px`,
            left: `${(i * 73) % 100}%`,
            top: `${(i * 53) % 100}%`,
            background:
              i % 3 === 0
                ? "linear-gradient(135deg,#fff3c8,#d4af37)"
                : i % 3 === 1
                ? "linear-gradient(135deg,#f5d97a,#8b6508)"
                : "linear-gradient(135deg,#ffffff,#f5e9b8)",
            boxShadow: "0 4px 10px rgba(212,175,55,0.45)",
            animation: `confetti-fall ${1.6 + (i % 5) * 0.25}s cubic-bezier(0.22,1,0.36,1) ${i * 0.05}s both`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        <div
          className="relative h-28 w-28 rounded-full grid place-items-center mb-6"
          style={{
            background:
              "linear-gradient(135deg,#fff3c8 0%,#f5d97a 35%,#d4af37 70%,#8b6508 100%)",
            boxShadow:
              "0 18px 40px -10px rgba(212,175,55,0.65), inset 0 2px 0 rgba(255,255,255,0.7)",
            animation: "success-pop 0.7s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(255,255,255,0.7)", animation: "ring-pulse 1.6s ease-out infinite" }}
          />
          <svg viewBox="0 0 52 52" className="h-14 w-14" fill="none" stroke="white" strokeWidth="4">
            <path
              d="M14 27 l8 8 l16 -18"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: "check-draw 0.55s ease-out 0.35s forwards",
              }}
            />
          </svg>
        </div>

        <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.42_0.08_85)] mb-2 font-semibold">
          ✦ Registration Successful ✦
        </p>
        <h1
          className="font-display font-bold text-[34px] leading-tight text-gold-gradient"
          style={{ animation: "fade-up 0.6s ease-out 0.3s both", letterSpacing: "-0.01em" }}
        >
          Thank you for joining us! 🎉
        </h1>
        <p
          className="mt-3 text-base font-semibold text-[color:oklch(0.28_0.08_85)] max-w-sm"
          style={{ animation: "fade-up 0.6s ease-out 0.42s both" }}
        >
          आपका बहुत-बहुत शुक्रिया{name ? `, ${name.split(" ")[0]}` : ""}।
        </p>
        <p
          className="mt-2 text-[13px] text-[color:oklch(0.35_0.06_85)] max-w-sm leading-relaxed"
          style={{ animation: "fade-up 0.6s ease-out 0.5s both" }}
        >
          You are now officially registered as a valued partner of <span className="font-semibold text-[color:oklch(0.30_0.10_82)]">Karo Online</span>.
        </p>

        <button
          onClick={onDone}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 font-display text-base font-bold text-[color:oklch(0.18_0.06_18)] active:scale-[0.97] transition-transform"
          style={{
            background: "linear-gradient(180deg,#fff3c8 0%,#f5d97a 35%,#d4af37 70%,#8b6508 100%)",
            boxShadow: "0 10px 28px -8px rgba(212,175,55,0.65), inset 0 1px 0 rgba(255,255,255,0.7)",
            animation: "fade-up 0.6s ease-out 0.55s both",
          }}
        >
          <Home className="h-5 w-5" />
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
