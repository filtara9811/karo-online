import { useEffect } from "react";

type Props = {
  open: boolean;
  name?: string;
  onDone: () => void;
};

export function SuccessOverlay({ open, name, onDone }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(onDone, 2600);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open, onDone]);

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
      {/* Confetti orbs */}
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
        {/* Animated golden check */}
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
            style={{
              border: "2px solid rgba(255,255,255,0.7)",
              animation: "ring-pulse 1.6s ease-out infinite",
            }}
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

        <p className="text-[10px] uppercase tracking-[0.45em] text-[color:oklch(0.45_0.08_85)] mb-2">
          ✦ Login Successful ✦
        </p>
        <h1
          className="font-display font-bold text-[40px] leading-none text-gold-gradient"
          style={{ animation: "fade-up 0.6s ease-out 0.3s both" }}
        >
          Thank You{name ? `, ${name.split(" ")[0]}` : ""}!
        </h1>
        <p
          className="mt-3 text-sm text-[color:oklch(0.40_0.08_85)] italic max-w-xs"
          style={{ animation: "fade-up 0.6s ease-out 0.45s both" }}
        >
          Welcome to Karo · Online — your premium concierge experience begins now.
        </p>

        <div
          className="mt-8 h-1 w-40 rounded-full overflow-hidden bg-[color:oklch(0.78_0.14_82/0.25)]"
          style={{ animation: "fade-up 0.6s ease-out 0.6s both" }}
        >
          <span
            className="block h-full bg-gradient-to-r from-[#f5d97a] via-[#d4af37] to-[#8b6508]"
            style={{ animation: "progress-fill 2s linear forwards" }}
          />
        </div>
      </div>
    </div>
  );
}
