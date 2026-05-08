import { useEffect, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { OtpModal } from "@/components/OtpModal";

type Props = {
  open: boolean;
  onVerified: (phone: string) => void;
};

export function CustomerMobileLoginSheet({ open, onVerified }: Props) {
  const [phone, setPhone] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhone("");
    setOtpOpen(false);
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || phone.length !== 10 || otpOpen) return;
    const id = window.setTimeout(() => setOtpOpen(true), 280);
    return () => window.clearTimeout(id);
  }, [open, phone, otpOpen]);

  if (!open) return null;

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10));
  };

  const formattedPhone = phone.length === 10 ? `+91 ${phone}` : "+91";

  return (
    <>
      <div className="fixed inset-0 z-[75] flex items-end justify-center">
        <div className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.48)] backdrop-blur-sm" />
        <div
          role="dialog"
          aria-modal="true"
          className="glass-sheet relative w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))]"
          style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <div className="mx-auto mb-7 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />

          <div className="text-center mb-6">
            <p className="text-[10px] uppercase tracking-[0.42em] text-[color:oklch(0.55_0.10_82)] mb-2">
              ✦ Mobile ✦
            </p>
            <h2 className="font-display text-3xl text-gold-gradient leading-tight">
              Enter Mobile Number
            </h2>
            <p className="mt-2 text-sm italic text-[color:oklch(0.35_0.06_85)]">
              10 digit complete hote hi OTP khul jayega
            </p>
          </div>

          <label className="block rounded-3xl border-2 border-[color:oklch(0.78_0.14_82/0.45)] bg-white/75 px-5 py-4 shadow-[0_8px_24px_-12px_rgba(212,175,55,0.45)]">
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[color:oklch(0.55_0.10_82)] font-bold mb-2">
              <Phone className="h-3.5 w-3.5" /> Mobile Number
            </span>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl text-[color:oklch(0.45_0.08_85)]">+91</span>
              <input
                ref={inputRef}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                className="min-w-0 flex-1 bg-transparent outline-none font-display text-3xl font-bold tracking-wide text-[color:oklch(0.18_0.04_85)] placeholder:text-[color:oklch(0.78_0.08_85/0.35)]"
                placeholder="9540068380"
              />
            </div>
          </label>
        </div>
      </div>

      <OtpModal
        open={otpOpen}
        phone={formattedPhone}
        onVerified={() => onVerified(phone)}
        onClose={() => setOtpOpen(false)}
      />
    </>
  );
}