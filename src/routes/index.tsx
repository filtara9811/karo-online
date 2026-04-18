import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import goldTicket from "@/assets/gold-ticket.png";
import goldQuestion from "@/assets/gold-question-sphere.png";
import goldPin from "@/assets/gold-pin.png";
import goldUser from "@/assets/gold-user.png";
import goldPhone from "@/assets/gold-phone.png";
import goldOtp from "@/assets/gold-otp.png";
import goldMail from "@/assets/gold-mail.png";
import goldWhatsapp from "@/assets/gold-whatsapp.png";

export const Route = createFileRoute("/")({
  component: Index,
});

type FieldProps = {
  icon: string;
  label: string;
  placeholder: string;
  type?: string;
  showTicket?: boolean;
  rightSlot?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
};

function LuxField({ icon, label, placeholder, type = "text", showTicket, rightSlot, onFocus, onBlur }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative flex items-start gap-4 animate-fade-up">
      {/* Icon column with timeline */}
      <div className="relative flex flex-col items-center pt-6">
        <div className="relative h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-[#3a1418] to-[#1a0709] border border-[color:oklch(0.82_0.14_85/0.4)] shadow-gold-glow">
          <img src={icon} alt="" loading="lazy" className="h-9 w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
        </div>
        <div className="w-px flex-1 mt-2 bg-gradient-to-b from-[color:oklch(0.82_0.14_85/0.6)] via-[color:oklch(0.82_0.14_85/0.2)] to-transparent min-h-12" />
      </div>

      {/* Input column */}
      <div className="flex-1 pt-5 pb-4 relative">
        <label className="block text-xs uppercase tracking-[0.18em] mb-1.5 text-gold-gradient font-medium">
          {label}
        </label>
        <div className="relative flex items-center">
          <input
            type={type}
            placeholder={placeholder}
            onFocus={() => { setFocused(true); onFocus?.(); }}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            className="w-full bg-transparent border-0 border-b border-[color:oklch(0.82_0.14_85/0.35)] focus:border-[color:oklch(0.82_0.14_85)] outline-none py-2 pr-10 text-base font-display text-foreground placeholder:text-[color:oklch(0.78_0.06_85/0.45)] transition-colors"
          />
          {rightSlot}
          {/* underline shimmer */}
          <span
            className={`absolute left-0 right-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#f5d97a] to-transparent transition-opacity duration-500 ${focused ? "opacity-100" : "opacity-0"}`}
          />
          {/* Ticket pop for name field */}
          {showTicket && focused && (
            <img
              src={goldTicket}
              alt=""
              className="absolute right-0 -top-10 h-16 w-auto pointer-events-none drop-shadow-[0_8px_18px_rgba(245,217,122,0.45)]"
              style={{ animation: "ticket-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Decorative gold orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.82_0.14_85/0.18),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.18_22/0.35),transparent_70%)] blur-2xl" />

      <div className="relative max-w-md mx-auto px-5 pt-10 pb-32">
        {/* Top bar with floating question sphere */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.82_0.14_85/0.7)]">Maison</p>
            <p className="font-display text-lg text-gold-gradient -mt-1">Karo · Online</p>
          </div>
          <button
            aria-label="Help"
            className="relative h-14 w-14 grid place-items-center rounded-full"
          >
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,217,122,0.35),transparent_70%)] blur-md" />
            <img
              src={goldQuestion}
              alt="Help"
              className="relative h-12 w-12 object-contain drop-shadow-[0_8px_16px_rgba(245,217,122,0.45)]"
              style={{ animation: "float-y 3.6s ease-in-out infinite" }}
            />
          </button>
        </header>

        {/* Hero card */}
        <section className="glass-wine rounded-3xl p-7 relative">
          {/* corner ornaments */}
          <div className="absolute top-3 left-3 h-6 w-6 border-t border-l border-[color:oklch(0.82_0.14_85/0.6)] rounded-tl-xl" />
          <div className="absolute top-3 right-3 h-6 w-6 border-t border-r border-[color:oklch(0.82_0.14_85/0.6)] rounded-tr-xl" />
          <div className="absolute bottom-3 left-3 h-6 w-6 border-b border-l border-[color:oklch(0.82_0.14_85/0.6)] rounded-bl-xl" />
          <div className="absolute bottom-3 right-3 h-6 w-6 border-b border-r border-[color:oklch(0.82_0.14_85/0.6)] rounded-br-xl" />

          <div className="text-center mb-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.82_0.14_85/0.7)] mb-2">
              ✦ Private Registration ✦
            </p>
            <h1 className="text-4xl font-display text-gold-gradient leading-tight">
              Karo <span className="italic font-light">| Online</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground italic">
              An invitation to the gilded experience
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-7">
            {[true, false, false].map((active, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    active
                      ? "bg-gradient-to-br from-[#fff3b0] to-[#b8860b] shadow-[0_0_10px_rgba(245,217,122,0.7)]"
                      : "bg-[color:oklch(0.82_0.14_85/0.25)]"
                  }`}
                />
                {i < 2 && <span className="h-px w-10 bg-[color:oklch(0.82_0.14_85/0.25)]" />}
              </div>
            ))}
          </div>

          {/* Form fields */}
          <div className="space-y-1">
            <LuxField icon={goldUser} label="Full Name" placeholder="Enter your full name" showTicket />
            <LuxField icon={goldPhone} label="Mobile Number" placeholder="+91 ·  ·  ·  ·  ·  ·  ·  ·  ·  ·" type="tel" />
            <LuxField icon={goldOtp} label="OTP Verification" placeholder="6-digit secure code" />
            <LuxField icon={goldMail} label="Email Address" placeholder="you@maison.com" type="email" />
            <LuxField
              icon={goldPin}
              label="Address & Location"
              placeholder="Your residence"
              rightSlot={
                <img
                  src={goldPin}
                  alt=""
                  className="absolute right-1 h-7 w-7 object-contain drop-shadow-[0_4px_8px_rgba(245,217,122,0.4)]"
                />
              }
            />
          </div>

          {/* Consent */}
          <label className="mt-6 flex items-start gap-3 cursor-pointer group">
            <span
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 h-5 w-5 rounded-md border flex-shrink-0 grid place-items-center transition-all ${
                agreed
                  ? "bg-gradient-to-br from-[#fff3b0] to-[#b8860b] border-[color:oklch(0.82_0.14_85)] shadow-[0_0_10px_rgba(245,217,122,0.5)]"
                  : "border-[color:oklch(0.82_0.14_85/0.5)] bg-transparent"
              }`}
            >
              {agreed && (
                <svg viewBox="0 0 16 16" className="h-3 w-3 text-[color:oklch(0.18_0.07_18)]" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I accept the <span className="text-gold-gradient font-medium">public terms</span> and acknowledge the <span className="text-gold-gradient font-medium">privacy policy</span> of the Maison.
            </span>
          </label>
        </section>

        {/* CTA Button */}
        <button
          className="mt-8 w-full relative overflow-hidden rounded-2xl py-4 px-6 bg-gold-bar text-[color:oklch(0.18_0.07_18)] font-semibold text-base tracking-wide flex items-center justify-center gap-3"
          style={{ animation: "breathe 2.6s ease-in-out infinite" }}
        >
          {/* shimmer overlay */}
          <span
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }}
          />
          <img src={goldWhatsapp} alt="" className="relative h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          <span className="relative font-display text-lg">Join via WhatsApp</span>
        </button>

        <p className="text-center mt-6 text-[11px] uppercase tracking-[0.3em] text-[color:oklch(0.82_0.14_85/0.5)]">
          ✦ Crafted for the discerning ✦
        </p>
      </div>
    </main>
  );
}
