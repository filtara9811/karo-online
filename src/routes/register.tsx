import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Sun, User, Phone, ShieldCheck, Mail, MapPin } from "lucide-react";
import mascotHolding from "@/assets/mascot-holding.png";
import { LuxPicker, type PickerOption } from "@/components/LuxPicker";
import { OtpModal } from "@/components/OtpModal";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import goldGoogle from "@/assets/gold-google.png";
import goldSimJio from "@/assets/gold-sim-jio.png";
import goldSimAirtel from "@/assets/gold-sim-airtel.png";

export const Route = createFileRoute("/register")({
  component: Register,
});

type StepKey = "name" | "phone" | "otp" | "email" | "address";
const STEP_ORDER: StepKey[] = ["name", "phone", "otp", "email", "address"];

const GENDER_OPTIONS: PickerOption[] = [
  { value: "male", label: "Male", sub: "His Highness", icon: goldMale },
  { value: "female", label: "Female", sub: "Her Ladyship", icon: goldFemale },
  { value: "other", label: "Other", sub: "Beyond labels", icon: goldOther },
];

const SIM_OPTIONS: (PickerOption & { number: string })[] = [
  { value: "jio", label: "Jio · SIM 1", sub: "+91 89 2847 6391", number: "+91 89284 76391", icon: goldSimJio },
  { value: "airtel", label: "Airtel · SIM 2", sub: "+91 98 1156 7204", number: "+91 98115 67204", icon: goldSimAirtel },
];

const EMAIL_OPTIONS: PickerOption[] = [
  { value: "primary@gmail.com", label: "Aarav Maison", sub: "primary@gmail.com", icon: goldGoogle },
  { value: "studio@gmail.com", label: "Maison Studio", sub: "studio@gmail.com", icon: goldGoogle },
  { value: "private@gmail.com", label: "Private", sub: "private@gmail.com", icon: goldGoogle },
];

function Register() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [, setOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [picker, setPicker] = useState<null | "gender" | "sim" | "email">(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const reachedStep = useMemo<StepKey>(() => {
    if (!name.trim()) return "name";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) return "phone";
    if (!phoneVerified) return "otp";
    if (!email.trim()) return "email";
    return "address";
  }, [name, phone, phoneVerified, email]);

  const visibleSteps = useMemo(() => {
    const idx = STEP_ORDER.indexOf(reachedStep);
    return STEP_ORDER.slice(0, idx + 1);
  }, [reachedStep]);

  const operatorMeta = SIM_OPTIONS.find((o) => o.value === operator);

  useEffect(() => {
    if (gender) setTimeout(() => nameInputRef.current?.focus(), 250);
  }, [gender]);

  const handleSimSelect = (value: string) => {
    const sim = SIM_OPTIONS.find((s) => s.value === value);
    if (!sim) return;
    setOperator(value);
    setPicker(null);
    setPhone(sim.number);
    setTimeout(() => setOtpOpen(true), 600);
  };

  const handleOtpVerified = (code: string) => {
    setOtp(code);
    setPhoneVerified(true);
    setOtpOpen(false);
    setTimeout(() => setPicker("email"), 500);
  };

  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #fff5f0 0%, transparent 55%), radial-gradient(ellipse at bottom, #fce0d4 0%, transparent 50%), linear-gradient(160deg, #fff8f3 0%, #fbe4d6 50%, #f7d6c2 100%)",
      }}
    >
      <div className="relative max-w-md mx-auto px-5 pt-8 pb-32">
        {/* Mascot — peeking from behind the card, holding it */}
        <div className="relative mx-auto" style={{ width: "min(100%, 380px)" }}>
          <img
            src={mascotHolding}
            alt="Welcome concierge"
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-[78%] pointer-events-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.15)] z-10"
            style={{ animation: "mascot-wave 3s ease-in-out infinite", transformOrigin: "50% 90%" }}
          />

          {/* Pink card — mascot's hands appear to be holding it */}
          <section
            className="relative rounded-[28px] mt-[210px] px-6 pt-6 pb-7 z-20"
            style={{
              background: "linear-gradient(170deg, #fde2da 0%, #fbd4c5 50%, #f8c4b1 100%)",
              boxShadow: "0 20px 60px -12px rgba(214, 102, 78, 0.35), 0 0 0 1.5px rgba(255,255,255,0.6) inset",
              animation: "step-reveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            {/* Top icons row */}
            <div className="absolute top-3 right-4 flex items-center gap-2">
              <button className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-white/70 grid place-items-center shadow-md">
                <Languages className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
              </button>
              <button className="h-9 w-9 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center shadow-md">
                <Sun className="h-4 w-4 text-[color:oklch(0.55_0.18_60)]" strokeWidth={2.4} />
              </button>
            </div>

            {/* Heading */}
            <div className="text-center mb-7 pt-1">
              <h1
                className="font-display font-bold text-[34px] leading-none"
                style={{ color: "#c2410c", textDecoration: "underline", textDecorationThickness: "2px", textUnderlineOffset: "5px" }}
              >
                Karo <span className="font-light">|</span> Online
              </h1>
              <p
                className="mt-2 text-base font-display italic"
                style={{ color: "#9a3412", textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: "3px" }}
              >
                Sign - up
              </p>
            </div>

            {/* Form fields with timeline */}
            <div className="space-y-1 relative">
              <PinkField
                Icon={User}
                label="Enter full name"
                hint={gender ? `Choose · ${gender}` : "Choe gander"}
                value={name}
                placeholder=""
                filled={!!name.trim()}
                readOnly={!gender}
                onClick={() => !gender && setPicker("gender")}
                onChange={setName}
                inputRef={nameInputRef}
              />

              {visibleSteps.includes("phone") && (
                <PinkField
                  Icon={Phone}
                  label="Enter  number choice"
                  hint={operator ? `${operatorMeta?.label} · auto-filled` : "Choe Number"}
                  value={phone}
                  placeholder=""
                  filled={phoneVerified}
                  readOnly
                  onClick={() => {
                    if (!operator) setPicker("sim");
                    else if (!phoneVerified) setOtpOpen(true);
                  }}
                />
              )}

              {visibleSteps.includes("otp") && (
                <PinkField
                  Icon={ShieldCheck}
                  label="Enter your OTP"
                  hint={phoneVerified ? "Verified ✓" : "Ato | otp"}
                  value={phoneVerified ? "● ● ● ● ● ●" : ""}
                  placeholder=""
                  filled={phoneVerified}
                  readOnly
                  onClick={() => !phoneVerified && setOtpOpen(true)}
                />
              )}

              {visibleSteps.includes("email") && (
                <PinkField
                  Icon={Mail}
                  label="Gmail account choice"
                  hint="Choe gmail"
                  value={email}
                  placeholder=""
                  filled={!!email.trim()}
                  readOnly
                  onClick={() => setPicker("email")}
                />
              )}

              {visibleSteps.includes("address") && (
                <PinkField
                  Icon={MapPin}
                  label="Address | location"
                  hint="Choe | address"
                  value={address}
                  placeholder=""
                  filled={!!address.trim()}
                  isLast
                  onChange={setAddress}
                />
              )}
            </div>

            {/* Consent */}
            {visibleSteps.includes("address") && (
              <label
                className="mt-6 flex items-start gap-3 cursor-pointer"
                style={{ animation: "step-reveal 0.55s ease-out 0.15s both" }}
              >
                <span
                  onClick={() => setAgreed(!agreed)}
                  className={`mt-0.5 h-5 w-5 rounded-md border-2 flex-shrink-0 grid place-items-center transition-all ${
                    agreed
                      ? "bg-[#c2410c] border-[#c2410c]"
                      : "border-[#9a3412]/40 bg-white/60"
                  }`}
                >
                  {agreed && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                <span className="text-sm text-[#7c2d12] leading-snug">
                  Public condition except<br />privacy policy
                </span>
              </label>
            )}

            {/* CTA — Join | watsapp */}
            {address.trim() && agreed && (
              <button
                onClick={() => navigate({ to: "/" })}
                className="btn-3d mt-5 w-full rounded-2xl py-3.5 text-white font-display font-bold text-xl tracking-wide grid place-items-center"
                style={{
                  background: "linear-gradient(180deg, #d97706 0%, #c2410c 100%)",
                  boxShadow: "0 8px 24px -6px rgba(194, 65, 12, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                  textDecoration: "underline",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "4px",
                  animation: "breathe 2.6s ease-in-out infinite",
                }}
              >
                Join | watsapp
              </button>
            )}
          </section>
        </div>
      </div>

      {/* Pickers */}
      <LuxPicker
        open={picker === "gender"}
        title="Choose Your Salutation"
        subtitle="A discreet preference"
        options={GENDER_OPTIONS}
        onSelect={(v) => { setGender(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <LuxPicker
        open={picker === "sim"}
        title="Select Your SIM"
        subtitle="Tap a SIM — we'll auto-fill & verify"
        options={SIM_OPTIONS}
        onSelect={handleSimSelect}
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

      <OtpModal
        open={otpOpen}
        phone={phone}
        onVerified={handleOtpVerified}
        onClose={() => setOtpOpen(false)}
      />
    </main>
  );
}

type PinkFieldProps = {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  filled: boolean;
  isLast?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  onChange?: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function PinkField({ Icon, label, hint, value, filled, isLast, readOnly, onClick, onChange, inputRef }: PinkFieldProps) {
  return (
    <div
      className="relative flex items-start gap-3"
      style={{ animation: "step-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      {/* Icon column with timeline */}
      <div className="relative flex flex-col items-center pt-3.5">
        <div
          className={`relative h-9 w-9 rounded-full grid place-items-center border-2 transition-all ${
            filled
              ? "bg-[#7c2d12] border-[#fef3c7]"
              : "bg-[#7c2d12]/85 border-[#9a3412]/30"
          }`}
        >
          <Icon className="h-4 w-4 text-[#fdba74]" strokeWidth={2.4} />
          {filled && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#16a34a] grid place-items-center border border-white">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5">
                <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1 bg-gradient-to-b from-[#c2410c]/50 to-transparent min-h-[44px]" />
        )}
      </div>

      {/* Field */}
      <div className="flex-1 pt-2 pb-3">
        <div onClick={onClick} className={readOnly ? "cursor-pointer" : ""}>
          <input
            ref={inputRef}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={label}
            className="w-full bg-transparent border-0 text-[15px] font-medium text-[#7c2d12] placeholder:text-[#9a3412]/70 outline-none py-0.5"
          />
          <div className="h-px w-full bg-[#c2410c]/60" />
          <p className="text-[10px] text-[#9a3412]/70 mt-1 italic">{hint}</p>
        </div>
      </div>
    </div>
  );
}
