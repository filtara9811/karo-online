import { useEffect, useRef, useState } from "react";
import goldOtp from "@/assets/gold-otp.png";

type Props = {
  open: boolean;
  phone: string;
  onVerified: (code: string) => void;
  onClose: () => void;
};

const AUTO_OTP = "482917";
const AUTO_DELAY = 900; // ms before demo OTP auto-verify

export function OtpModal({ open, phone, onVerified, onClose }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [seconds, setSeconds] = useState(45);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // reset on open
  useEffect(() => {
    if (!open) return;
    setDigits(Array(6).fill(""));
    setSeconds(45);
    setVerifying(false);
    setVerified(false);
    setTimeout(() => inputs.current[0]?.focus(), 250);
  }, [open]);

  // countdown
  useEffect(() => {
    if (!open || verified) return;
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, seconds, verified]);

  // auto-fill OTP and auto-verify
  useEffect(() => {
    if (!open) return;
    let idx = 0;
    const timeouts: number[] = [];
    const start = window.setTimeout(() => {
      const tick = () => {
        if (idx >= AUTO_OTP.length) return;
        setDigits((prev) => {
          const next = [...prev];
          next[idx] = AUTO_OTP[idx];
          return next;
        });
        idx += 1;
        if (idx < AUTO_OTP.length) {
          timeouts.push(window.setTimeout(tick, 220));
        } else {
          // all filled — auto verify
          timeouts.push(
            window.setTimeout(() => {
              setVerifying(true);
              timeouts.push(
                window.setTimeout(() => {
                  setVerified(true);
                  timeouts.push(
                    window.setTimeout(() => {
                      onVerified(AUTO_OTP);
                    }, 900),
                  );
                }, 1100),
              );
            }, 350),
          );
        }
      };
      tick();
    }, AUTO_DELAY);
    return () => {
      window.clearTimeout(start);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [open, onVerified]);

  if (!open) return null;

  const handleChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[i] = v;
    setDigits(nextDigits);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (nextDigits.join("").length === 6) {
      setVerifying(true);
      window.setTimeout(() => {
        setVerified(true);
        window.setTimeout(() => onVerified(nextDigits.join("")), 500);
      }, 650);
    }
  };

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-6 pt-3 pb-8"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />
        <div className="absolute top-5 left-4 h-5 w-5 border-t border-l border-[color:oklch(0.78_0.14_82/0.6)] rounded-tl-lg" />
        <div className="absolute top-5 right-4 h-5 w-5 border-t border-r border-[color:oklch(0.78_0.14_82/0.6)] rounded-tr-lg" />

        <div className="text-center mb-6">
          <div
            className="mx-auto mb-3 h-20 w-20 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] shadow-gold-glow border border-[color:oklch(0.78_0.14_82/0.5)]"
            style={{ animation: verified ? "breathe 1.2s ease-in-out infinite" : "float-y 3s ease-in-out infinite" }}
          >
            <img src={goldOtp} alt="" className="h-14 w-14 object-contain drop-shadow-[0_4px_8px_rgba(212,175,55,0.5)]" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.55_0.10_82)] mb-1">
            ✦ Verification ✦
          </p>
          <h2 className="font-display text-2xl text-gold-gradient leading-tight">
            {verified ? "Verified!" : "Enter OTP"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {verified
              ? "Welcome to the Maison"
              : verifying
              ? "Verifying your code..."
              : `Demo OTP: ${AUTO_OTP} · ${phone}`}
          </p>
        </div>

        {/* OTP boxes */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              inputMode="numeric"
              maxLength={1}
              className={`h-14 w-11 text-center text-2xl font-display rounded-xl border-2 bg-white/80 outline-none transition-all ${
                verified
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  : d
                  ? "border-[color:oklch(0.78_0.14_82)] shadow-gold-glow text-[color:oklch(0.30_0.05_85)]"
                  : "border-[color:oklch(0.78_0.14_82/0.35)] text-[color:oklch(0.30_0.05_85)]"
              }`}
              style={{ animation: d ? "ticket-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" : undefined }}
            />
          ))}
        </div>

        {/* Timer + status */}
        <div className="flex items-center justify-between text-xs mb-5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${verified ? "bg-emerald-500" : "bg-[color:oklch(0.78_0.14_82)]"}`} style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }} />
            <span className="text-muted-foreground">
              {verified ? "OTP matched" : verifying ? "Verifying..." : "Auto OTP filling"}
            </span>
          </div>
          <div className="font-display text-[color:oklch(0.45_0.10_82)] tabular-nums">
            {mins}:{secs}
          </div>
        </div>

        <div className="h-3" />
      </div>
    </div>
  );
}
