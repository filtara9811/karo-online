import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Sun, User, Phone, ShieldCheck, Mail, MapPin } from "lucide-react";
import { motion, useMotionValue, animate } from "framer-motion";
import { LuxPicker, type PickerOption } from "@/components/LuxPicker";
import { OtpModal } from "@/components/OtpModal";
import { AddressPicker } from "@/components/AddressPicker";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import goldGoogle from "@/assets/gold-google.png";
import goldSimJio from "@/assets/gold-sim-jio.png";
import goldSimAirtel from "@/assets/gold-sim-airtel.png";
import goldWhatsapp from "@/assets/gold-whatsapp.png";

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
  const [addressOpen, setAddressOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Bottom-sheet drag setup — three snap points based on viewport height
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // Snap positions: y = translateY of the sheet (smaller = taller open)
  const SNAP_FULL = vh * 0.06;   // ~94% open
  const SNAP_HALF = vh * 0.30;   // ~70% open
  const SNAP_PEEK = vh * 0.55;   // ~45% open
  const SNAPS = useMemo(() => [SNAP_FULL, SNAP_HALF, SNAP_PEEK], [SNAP_FULL, SNAP_HALF, SNAP_PEEK]);
  const y = useMotionValue(SNAP_HALF);

  useEffect(() => {
    // Open with a slide-up entrance to the half snap
    animate(y, SNAP_HALF, { type: "spring", stiffness: 220, damping: 28 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapTo = (target: number) => {
    animate(y, target, { type: "spring", stiffness: 260, damping: 30 });
  };

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

  // As more steps reveal, auto-snap upward so the user can see them
  useEffect(() => {
    if (visibleSteps.length >= 4) snapTo(SNAP_FULL);
    else if (visibleSteps.length >= 2) snapTo(SNAP_HALF);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSteps.length]);

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

  const handleDragEnd = (_: unknown, info: { velocity: { y: number }; point: { y: number } }) => {
    const current = y.get();
    const v = info.velocity.y;

    // Velocity-based snapping
    if (v < -500) return snapTo(SNAP_FULL);
    if (v > 500) return snapTo(SNAP_PEEK);

    // Snap to nearest
    let nearest = SNAPS[0];
    let minDist = Math.abs(current - SNAPS[0]);
    for (const s of SNAPS) {
      const d = Math.abs(current - s);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    }
    snapTo(nearest);
  };

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #fffaf0 0%, transparent 55%), radial-gradient(ellipse at bottom, #fdf6dd 0%, transparent 60%), linear-gradient(160deg, #fffdf5 0%, #fbf3d9 60%, #f5e9b8 100%)",
      }}
    >
      {/* Decorative gold orbs in background */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.30),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.10_92/0.35),transparent_70%)] blur-2xl" />

      {/* Back button */}
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/80 backdrop-blur-md border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center shadow-md"
        aria-label="Close"
      >
        <svg className="h-5 w-5 text-[color:oklch(0.42_0.10_82)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Mascot hint badge — peeking from the top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="font-display text-2xl text-gold-gradient font-bold tracking-tight">
          Karo <span className="font-light">|</span> Online
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.45_0.08_85/0.85)]">
          Premium Onboarding
        </span>
      </div>

      {/* Draggable bottom sheet */}
      <motion.section
        drag="y"
        dragConstraints={{ top: SNAP_FULL, bottom: SNAP_PEEK }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ y, height: vh }}
        className="absolute inset-x-0 top-0 z-20 will-change-transform"
      >
        <div
          className="relative h-full mx-auto max-w-md rounded-t-[32px] overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
            boxShadow:
              "0 -20px 60px -12px rgba(212,175,55,0.45), 0 0 0 1.5px rgba(255,255,255,0.7) inset",
          }}
        >
          {/* Drag handle area — wider tappable region */}
          <div className="pt-3 pb-1 grid place-items-center cursor-grab active:cursor-grabbing">
            <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37] shadow-[0_1px_4px_rgba(212,175,55,0.5)]" />
          </div>

          {/* Scrollable content (so when fully open, fields are reachable) */}
          <div
            className="h-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain px-6 pb-32"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Top icons row */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[color:oklch(0.78_0.14_82/0.6)] grid place-items-center shadow-md"
                aria-label="Language"
              >
                <Languages className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.4} />
              </button>
              <button
                className="h-9 w-9 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.55)] grid place-items-center shadow-md"
                aria-label="Theme"
              >
                <Sun className="h-4 w-4 text-[color:oklch(0.55_0.15_82)]" strokeWidth={2.4} />
              </button>
            </div>

            {/* Heading */}
            <div className="text-center mb-6 pt-1">
              <h1
                className="font-display font-bold text-[34px] leading-none text-gold-gradient"
                style={{
                  textDecoration: "underline",
                  textDecorationColor: "rgba(212,175,55,0.6)",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "5px",
                }}
              >
                Karo <span className="font-light">|</span> Online
              </h1>
              <p className="mt-2 text-base font-display italic text-[color:oklch(0.45_0.10_85)]">
                <span style={{ borderBottom: "1px solid rgba(212,175,55,0.5)" }}>Sign - up</span>
              </p>
            </div>

            {/* Form fields with timeline */}
            <div className="space-y-1 relative">
              <GoldField
                Icon={User}
                label="Enter full name"
                hint={gender ? `Choose · ${gender}` : "Choose gender"}
                value={name}
                placeholder=""
                filled={!!name.trim()}
                readOnly={!gender}
                onClick={() => !gender && setPicker("gender")}
                onChange={setName}
                inputRef={nameInputRef}
              />

              {visibleSteps.includes("phone") && (
                <GoldField
                  Icon={Phone}
                  label="Enter number choice"
                  hint={operator ? `${operatorMeta?.label} · auto-filled` : "Choose number"}
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
                <GoldField
                  Icon={ShieldCheck}
                  label="Enter your OTP"
                  hint={phoneVerified ? "Verified ✓" : "Auto · OTP"}
                  value={phoneVerified ? "● ● ● ● ● ●" : ""}
                  placeholder=""
                  filled={phoneVerified}
                  readOnly
                  onClick={() => !phoneVerified && setOtpOpen(true)}
                />
              )}

              {visibleSteps.includes("email") && (
                <GoldField
                  Icon={Mail}
                  label="Gmail account choice"
                  hint="Choose gmail"
                  value={email}
                  placeholder=""
                  filled={!!email.trim()}
                  readOnly
                  onClick={() => setPicker("email")}
                />
              )}

              {visibleSteps.includes("address") && (
                <GoldField
                  Icon={MapPin}
                  label="Address | location"
                  hint={address ? "Tap to change" : "Choose address"}
                  value={address}
                  placeholder=""
                  filled={!!address.trim()}
                  isLast
                  readOnly
                  onClick={() => setAddressOpen(true)}
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
                      ? "bg-gradient-to-br from-[#d4af37] to-[#8b6508] border-[#d4af37]"
                      : "border-[color:oklch(0.55_0.10_82/0.5)] bg-white/70"
                  }`}
                >
                  {agreed && (
                    <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                <span className="text-sm text-[color:oklch(0.35_0.06_85)] leading-snug">
                  I accept the public terms<br />and the privacy policy
                </span>
              </label>
            )}

            {/* CTA — Join | whatsapp */}
            {address.trim() && agreed && (
              <button
                onClick={() => setSuccessOpen(true)}
                className="btn-3d mt-5 w-full rounded-2xl py-3.5 font-display font-bold text-xl tracking-wide flex items-center justify-center gap-3 text-[color:oklch(0.18_0.06_18)]"
                style={{
                  background:
                    "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
                  boxShadow:
                    "0 8px 24px -6px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
                  textDecoration: "underline",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "4px",
                  animation: "breathe 2.6s ease-in-out infinite",
                }}
              >
                <img src={goldWhatsapp} alt="" className="h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                <span>WhatsApp Join</span>
              </button>
            )}
          </div>
        </div>
      </motion.section>

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

      <AddressPicker
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onSelect={(a: AddressResult) => {
          setAddress(a.full);
          setAddressOpen(false);
        }}
      />

      <SuccessOverlay
        open={successOpen}
        name={name}
        onDone={() => {
          setSuccessOpen(false);
          navigate({ to: "/vendor/dashboard" });
        }}
      />
    </main>
  );
}

type GoldFieldProps = {
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

function GoldField({ Icon, label, hint, value, filled, isLast, readOnly, onClick, onChange, inputRef }: GoldFieldProps) {
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
              ? "border-white"
              : "border-[color:oklch(0.78_0.14_82/0.4)]"
          }`}
          style={{
            background: filled
              ? "linear-gradient(135deg, #f5d97a 0%, #d4af37 50%, #8b6508 100%)"
              : "linear-gradient(135deg, #fff8dc 0%, #f5e9b8 100%)",
            boxShadow: filled
              ? "0 4px 12px -2px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.6)"
              : "inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <Icon
            className={filled ? "h-4 w-4 text-white" : "h-4 w-4 text-[color:oklch(0.42_0.10_82)]"}
            strokeWidth={2.4}
          />
          {filled && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full grid place-items-center border border-white"
              style={{
                background: "linear-gradient(135deg,#fff3c8 0%,#d4af37 60%,#8b6508 100%)",
                boxShadow: "0 2px 6px -1px rgba(212,175,55,0.6)",
              }}
            >
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5">
                <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1 bg-gradient-to-b from-[color:oklch(0.78_0.14_82/0.6)] to-transparent min-h-[44px]" />
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
            className="w-full bg-transparent border-0 text-[15px] font-medium text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.45_0.08_85/0.7)] outline-none py-0.5"
          />
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(212,175,55,0.7) 0%, rgba(212,175,55,0.3) 100%)",
            }}
          />
          <p className="text-[10px] text-[color:oklch(0.50_0.08_85/0.85)] mt-1 italic">{hint}</p>
        </div>
      </div>
    </div>
  );
}
