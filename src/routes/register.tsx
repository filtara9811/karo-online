import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import goldTicket from "@/assets/gold-ticket.png";
import goldQuestion from "@/assets/gold-question-sphere.png";
import goldPin from "@/assets/gold-pin.png";
import goldUser from "@/assets/gold-user.png";
import goldPhone from "@/assets/gold-phone.png";
import goldOtp from "@/assets/gold-otp.png";
import goldMail from "@/assets/gold-mail.png";
import goldWhatsapp from "@/assets/gold-whatsapp.png";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import goldGoogle from "@/assets/gold-google.png";
import goldSimJio from "@/assets/gold-sim-jio.png";
import goldSimAirtel from "@/assets/gold-sim-airtel.png";
import goldSimVi from "@/assets/gold-sim-vi.png";
import goldSimBsnl from "@/assets/gold-sim-bsnl.png";
import { LuxPicker, type PickerOption } from "@/components/LuxPicker";

export const Route = createFileRoute("/register")({
  component: Index,
});

type StepKey = "name" | "phone" | "otp" | "email" | "address";

const STEP_ORDER: StepKey[] = ["name", "phone", "otp", "email", "address"];

const GENDER_OPTIONS: PickerOption[] = [
  { value: "male", label: "Male", sub: "His Highness", icon: goldMale },
  { value: "female", label: "Female", sub: "Her Ladyship", icon: goldFemale },
  { value: "other", label: "Other", sub: "Beyond labels", icon: goldOther },
];

const SIM_OPTIONS: PickerOption[] = [
  { value: "jio", label: "Jio", sub: "Reliance · +91 70/89/91", icon: goldSimJio },
  { value: "airtel", label: "Airtel", sub: "Bharti · +91 70/96/98", icon: goldSimAirtel },
  { value: "vi", label: "Vi", sub: "Vodafone Idea · +91 70/97", icon: goldSimVi },
  { value: "bsnl", label: "BSNL", sub: "State carrier · +91 94/95", icon: goldSimBsnl },
];

const EMAIL_OPTIONS: PickerOption[] = [
  { value: "primary@gmail.com", label: "Aarav Maison", sub: "primary@gmail.com", icon: goldGoogle },
  { value: "studio@gmail.com", label: "Maison Studio", sub: "studio@gmail.com", icon: goldGoogle },
  { value: "private@gmail.com", label: "Private", sub: "private@gmail.com", icon: goldGoogle },
];

type FieldShellProps = {
  icon: string;
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  filled: boolean;
  isLast?: boolean;
  showTicket?: boolean;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  delay?: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function LuxField({
  icon, label, value, placeholder, type = "text",
  filled, isLast, showTicket, rightSlot,
  onClick, onChange, readOnly, delay = 0, inputRef,
}: FieldShellProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="relative flex items-start gap-4"
      style={{ animation: `step-reveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both` }}
    >
      {/* Icon column with timeline */}
      <div className="relative flex flex-col items-center pt-6">
        <div
          className={`relative h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-[oklch(0.26_0.13_22)] to-[oklch(0.10_0.04_14)] border transition-all ${
            filled
              ? "border-[color:oklch(0.84_0.15_85/0.9)] shadow-gold-glow"
              : "border-[color:oklch(0.84_0.15_85/0.4)]"
          }`}
        >
          <img
            src={icon}
            alt=""
            loading="lazy"
            width={48}
            height={48}
            className="h-9 w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          />
          {filled && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-[#fff3b0] to-[#b8860b] grid place-items-center shadow-[0_0_10px_rgba(245,217,122,0.7)]">
              <svg viewBox="0 0 16 16" className="h-3 w-3 text-[color:oklch(0.13_0.06_18)]" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-2 bg-gradient-to-b from-[color:oklch(0.84_0.15_85/0.6)] via-[color:oklch(0.84_0.15_85/0.2)] to-transparent min-h-12" />
        )}
      </div>

      {/* Input column */}
      <div className="flex-1 pt-5 pb-4 relative">
        <label className="block text-xs uppercase tracking-[0.18em] mb-1.5 text-gold-gradient font-medium">
          {label}
        </label>
        <div className="relative flex items-center" onClick={onClick}>
          <input
            ref={inputRef}
            type={type}
            value={value}
            placeholder={placeholder}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`w-full bg-transparent border-0 border-b py-2 pr-10 text-base font-display text-foreground placeholder:text-[color:oklch(0.78_0.06_85/0.45)] outline-none transition-colors ${
              focused
                ? "border-[color:oklch(0.84_0.15_85)]"
                : "border-[color:oklch(0.84_0.15_85/0.35)]"
            } ${readOnly ? "cursor-pointer" : ""}`}
          />
          {rightSlot}
          <span
            className={`absolute left-0 right-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#f5d97a] to-transparent transition-opacity duration-500 ${focused ? "opacity-100" : "opacity-0"}`}
          />
          {showTicket && filled && (
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
  const [gender, setGender] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [picker, setPicker] = useState<null | "gender" | "sim" | "email">(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  // Step progression
  const reachedStep = useMemo<StepKey>(() => {
    if (!name.trim()) return "name";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return "phone";
    if (otp.length < 6) return "otp";
    if (!email.trim()) return "email";
    return "address";
  }, [name, phone, otp, email]);

  const visibleSteps = useMemo(() => {
    const idx = STEP_ORDER.indexOf(reachedStep);
    return STEP_ORDER.slice(0, idx + 1);
  }, [reachedStep]);

  const progressIndex = useMemo(() => {
    if (address.trim() && agreed) return 2;
    if (visibleSteps.length >= 4) return 1;
    return 0;
  }, [visibleSteps.length, address, agreed]);

  const operatorMeta = SIM_OPTIONS.find((o) => o.value === operator);

  // Auto-focus the name input after a gender is selected
  useEffect(() => {
    if (gender) setTimeout(() => nameInputRef.current?.focus(), 250);
  }, [gender]);

  useEffect(() => {
    if (operator) setTimeout(() => phoneInputRef.current?.focus(), 250);
  }, [operator]);

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.16),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.45_0.18_22/0.4),transparent_70%)] blur-2xl" />

      <div className="relative max-w-md mx-auto px-5 pt-10 pb-32">
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.7)]">Maison</p>
            <p className="font-display text-lg text-gold-gradient -mt-1">Karo · Online</p>
          </div>
          <button aria-label="Help" className="relative h-14 w-14 grid place-items-center rounded-full">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,217,122,0.35),transparent_70%)] blur-md" />
            <img
              src={goldQuestion}
              alt="Help"
              className="relative h-12 w-12 object-contain drop-shadow-[0_8px_16px_rgba(245,217,122,0.45)]"
              style={{ animation: "float-y 3.6s ease-in-out infinite" }}
            />
          </button>
        </header>

        <section className="glass-wine rounded-3xl p-7 relative">
          <div className="absolute top-3 left-3 h-6 w-6 border-t border-l border-[color:oklch(0.84_0.15_85/0.6)] rounded-tl-xl" />
          <div className="absolute top-3 right-3 h-6 w-6 border-t border-r border-[color:oklch(0.84_0.15_85/0.6)] rounded-tr-xl" />
          <div className="absolute bottom-3 left-3 h-6 w-6 border-b border-l border-[color:oklch(0.84_0.15_85/0.6)] rounded-bl-xl" />
          <div className="absolute bottom-3 right-3 h-6 w-6 border-b border-r border-[color:oklch(0.84_0.15_85/0.6)] rounded-br-xl" />

          <div className="text-center mb-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.84_0.15_85/0.7)] mb-2">
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
            {[0, 1, 2].map((i) => {
              const active = i <= progressIndex;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                      active
                        ? "bg-gradient-to-br from-[#fff3b0] to-[#b8860b] shadow-[0_0_10px_rgba(245,217,122,0.7)]"
                        : "bg-[color:oklch(0.84_0.15_85/0.25)]"
                    }`}
                  />
                  {i < 2 && <span className="h-px w-10 bg-[color:oklch(0.84_0.15_85/0.25)]" />}
                </div>
              );
            })}
          </div>

          {/* Form fields — revealed step-by-step */}
          <div className="space-y-1">
            <LuxField
              icon={goldUser}
              label={gender ? `Full Name · ${gender[0].toUpperCase() + gender.slice(1)}` : "Full Name"}
              value={name}
              placeholder={gender ? "Enter your full name" : "Tap to begin · choose a salutation"}
              filled={!!name.trim()}
              showTicket
              readOnly={!gender}
              onClick={() => !gender && setPicker("gender")}
              onChange={(v) => setName(v)}
              inputRef={nameInputRef}
            />

            {visibleSteps.includes("phone") && (
              <LuxField
                icon={operatorMeta?.icon ?? goldPhone}
                label={operator ? `Mobile · ${operatorMeta?.label}` : "Mobile Number"}
                value={phone}
                placeholder={operator ? "Enter 10-digit number" : "Tap to choose your operator"}
                type="tel"
                filled={phone.replace(/\D/g, "").length >= 10}
                readOnly={!operator}
                onClick={() => !operator && setPicker("sim")}
                onChange={(v) => setPhone(v.replace(/[^\d\s+]/g, "").slice(0, 14))}
                inputRef={phoneInputRef}
                delay={0.1}
              />
            )}

            {visibleSteps.includes("otp") && (
              <LuxField
                icon={goldOtp}
                label="OTP Verification"
                value={otp}
                placeholder="6-digit secure code"
                filled={otp.length === 6}
                onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                delay={0.1}
              />
            )}

            {visibleSteps.includes("email") && (
              <LuxField
                icon={goldMail}
                label="Email Address"
                value={email}
                placeholder="Tap to choose a Google account"
                type="email"
                filled={!!email.trim()}
                readOnly
                onClick={() => setPicker("email")}
                delay={0.1}
              />
            )}

            {visibleSteps.includes("address") && (
              <LuxField
                icon={goldPin}
                label="Address & Location"
                value={address}
                placeholder="Your residence"
                filled={!!address.trim()}
                isLast
                onChange={(v) => setAddress(v)}
                rightSlot={
                  <img
                    src={goldPin}
                    alt=""
                    className="absolute right-1 h-7 w-7 object-contain drop-shadow-[0_4px_8px_rgba(245,217,122,0.4)] pointer-events-none"
                  />
                }
                delay={0.1}
              />
            )}
          </div>

          {/* Consent — appears when address step reached */}
          {visibleSteps.includes("address") && (
            <label
              className="mt-6 flex items-start gap-3 cursor-pointer group"
              style={{ animation: "step-reveal 0.55s ease-out 0.15s both" }}
            >
              <span
                onClick={() => setAgreed(!agreed)}
                className={`mt-0.5 h-5 w-5 rounded-md border flex-shrink-0 grid place-items-center transition-all ${
                  agreed
                    ? "bg-gradient-to-br from-[#fff3b0] to-[#b8860b] border-[color:oklch(0.84_0.15_85)] shadow-[0_0_10px_rgba(245,217,122,0.5)]"
                    : "border-[color:oklch(0.84_0.15_85/0.5)] bg-transparent"
                }`}
              >
                {agreed && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 text-[color:oklch(0.13_0.06_18)]" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I accept the <span className="text-gold-gradient font-medium">public terms</span> and acknowledge the <span className="text-gold-gradient font-medium">privacy policy</span> of the Maison.
              </span>
            </label>
          )}
        </section>

        {/* CTA Button — only when address + consent */}
        {address.trim() && agreed && (
          <button
            className="mt-8 w-full relative overflow-hidden rounded-2xl py-4 px-6 bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-semibold text-base tracking-wide flex items-center justify-center gap-3"
            style={{ animation: "breathe 2.6s ease-in-out infinite, step-reveal 0.6s ease-out both" }}
          >
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
        )}

        <p className="text-center mt-6 text-[11px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.5)]">
          ✦ Crafted for the discerning ✦
        </p>
      </div>

      {/* Pickers */}
      <LuxPicker
        open={picker === "gender"}
        title="Choose Your Salutation"
        subtitle="A discreet preference for the Maison"
        options={GENDER_OPTIONS}
        onSelect={(v) => { setGender(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <LuxPicker
        open={picker === "sim"}
        title="Select Your Operator"
        subtitle="We'll route the verification accordingly"
        options={SIM_OPTIONS}
        onSelect={(v) => { setOperator(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <LuxPicker
        open={picker === "email"}
        title="Choose a Google Account"
        subtitle="Tap one of your signed-in accounts"
        options={EMAIL_OPTIONS}
        onSelect={(v) => { setEmail(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
    </main>
  );
}
