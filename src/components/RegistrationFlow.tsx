import { useEffect, useMemo, useRef, useState } from "react";
import { User, Phone, Mail, MapPin, UserCheck, Gift, QrCode, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LuxPicker, type PickerOption } from "@/components/LuxPicker";
import { AddressPicker, type AddressResult } from "@/components/AddressPicker";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { finalizeCustomerRegistration, sendOtp, verifyOtp } from "@/lib/otp.functions";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const CUSTOMER_ONBOARDED_KEY = "ko-customer-onboarded";
const CUSTOMER_DRAFT_KEY = "ko-customer-registration-draft-v3";

type CustomerDraft = {
  gender?: string | null;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  manager?: string | null;
  referral?: string;
  agreed?: boolean;
};

const readDraft = (): CustomerDraft => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(CUSTOMER_DRAFT_KEY) || "{}"); } catch { return {}; }
};

const formatIndianMobile = (digits: string) => "+91 " + digits.slice(0, 5) + " " + digits.slice(5);

const MANAGER_OPTIONS: (PickerOption & { rating: number; vendors: number })[] = [
  { value: "aryan", label: "Aryan Sharma", sub: "Karol Bagh · 1.2 km", rating: 4.8, vendors: 142, icon: goldMale },
  { value: "priya", label: "Priya Verma", sub: "Old Delhi · 2.1 km", rating: 4.7, vendors: 98, icon: goldFemale },
  { value: "rahul", label: "Rahul Mehta", sub: "Patel Nagar · 3.4 km", rating: 4.6, vendors: 76, icon: goldMale },
  { value: "neha", label: "Neha Singh", sub: "Rajouri · 4.0 km", rating: 4.9, vendors: 184, icon: goldFemale },
];

const GENDER_CHIPS: { value: string; label: string; icon: string }[] = [
  { value: "male", label: "Male", icon: goldMale },
  { value: "female", label: "Female", icon: goldFemale },
  { value: "other", label: "Other", icon: goldOther },
];

export type RegistrationFlowProps = {
  transparent?: boolean;
  hideBack?: boolean;
  onBack?: () => void;
  onComplete?: () => void;
};

export function RegistrationFlow({ transparent, hideBack, onBack, onComplete }: RegistrationFlowProps) {
  const { user, refreshProfile } = useAuth();
  const draft = useMemo(readDraft, []);

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [phone, setPhone] = useState(draft.phone ?? "");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [gender, setGender] = useState<string | null>(draft.gender ?? null);
  const [name, setName] = useState(draft.name ?? "");
  const [email, setEmail] = useState(draft.email ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [manager, setManager] = useState<string | null>(draft.manager ?? null);
  const [referral, setReferral] = useState<string>(() => {
    if (draft.referral) return draft.referral;
    if (typeof window !== "undefined") {
      const u = new URLSearchParams(window.location.search);
      return u.get("ref") || u.get("referral") || "";
    }
    return "";
  });
  const [agreed, setAgreed] = useState(!!draft.agreed);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [otpSeconds, setOtpSeconds] = useState(45);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [picker, setPicker] = useState<null | "manager">(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);
  const finalizeCustomerFn = useServerFn(finalizeCustomerRegistration);

  // Prefill from Google session
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const metaName = meta?.full_name || meta?.name;
    if (metaName && !name) setName(metaName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMER_DRAFT_KEY, JSON.stringify({
      gender, name, phone, email, address, manager, referral, agreed,
    }));
  }, [gender, name, phone, email, address, manager, referral, agreed]);

  // OTP timer
  useEffect(() => {
    if (step !== 2 || otpSeconds <= 0) return;
    const t = setTimeout(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, otpSeconds]);

  const goNext = (target: Step) => { setDirection(1); setStep(target); };
  const goBack = (target: Step) => { setDirection(-1); setStep(target); };

  // === Step 1: send OTP ===
  const handleSendOtp = async (digits: string) => {
    if (digits.length !== 10) {
      toast.error("10 digit mobile number daaliye");
      return;
    }
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await sendOtpFn({ data: { phone: digits } });
      if (!res.ok) {
        toast.error(res.error || "Could not send OTP");
        setOtpError(res.error || "Could not send OTP");
        return;
      }
      if (res.test_mode) {
        toast.error("Live OTP blocked: Admin SMS Test mode OFF karein.");
        setOtpError("Live OTP blocked: Admin SMS Test mode OFF karein.");
        return;
      }
      setPhone(formatIndianMobile(digits));
      setOtpDigits(["", "", "", ""]);
      setOtpSeconds(45);
      goNext(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 350);
      toast.success("OTP sent to " + formatIndianMobile(digits));
    } finally {
      setOtpSending(false);
    }
  };

  // === Step 2: verify OTP, then check existing ===
  const handleOtpFilled = async (code: string) => {
    if (otpVerifying) return;
    setOtpVerifying(true);
    try {
      const res = await verifyOtpFn({ data: { phone, code } });
      if (!res.ok) {
        toast.error(res.error || "Wrong OTP");
        setOtpDigits(["", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }
      // Lookup existing customer
      try {
        const { data, error } = await supabase.rpc("lookup_customer_by_phone", { _phone: phone });
        if (!error && data && data.length > 0) {
          const row = data[0] as { name: string | null; gender: string | null; email: string | null; address: string | null };
          if (row.name) setName(row.name);
          if (row.gender) setGender(row.gender);
          if (row.email) setEmail(row.email);
          if (row.address) setAddress(row.address);
          // Existing complete profile → instant login
          if (row.name && row.address) {
            toast.success(`Welcome back, ${row.name}`);
            // finalize directly with prefilled data
            await finalizeNow({
              name: row.name,
              gender: row.gender ?? "",
              email: row.email ?? "",
              address: row.address,
            });
            return;
          }
        }
      } catch { /* ignore lookup errors, go through full form */ }
      goNext(3);
    } finally {
      setOtpVerifying(false);
    }
  };

  useEffect(() => {
    if (step !== 2) return;
    const code = otpDigits.join("");
    if (code.length === 4 && otpDigits.every((d) => d !== "")) handleOtpFilled(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpDigits, step]);

  const handleResendOtp = () => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    setOtpDigits(["", "", "", ""]);
    setOtpSeconds(45);
    handleSendOtp(digits);
  };

  // === Final save ===
  const finalizeNow = async (override?: { name: string; gender: string; email: string; address: string }) => {
    const payload = {
      name: (override?.name ?? name).trim(),
      gender: override?.gender ?? gender ?? "",
      phone,
      email: override?.email ?? email,
      address: override?.address ?? address,
    };
    if (user) {
      const { error } = await supabase.rpc("save_customer_profile", {
        _name: payload.name,
        _gender: payload.gender,
        _phone: payload.phone,
        _email: payload.email || user.email || "",
        _address: payload.address,
      });
      if (error) {
        toast.error(error.message || "Profile save fail hua");
        setSuccessOpen(false);
        onComplete?.();
        return;
      }
      window.localStorage.setItem(CUSTOMER_ONBOARDED_KEY, "true");
      window.localStorage.removeItem(CUSTOMER_DRAFT_KEY);
      await refreshProfile();
      try { window.dispatchEvent(new Event("ko-customer-onboarded")); } catch { /* ignore */ }
    } else {
      const result = await finalizeCustomerFn({ data: payload });
      if (!result.ok) {
        toast.error(result.error || "Profile save fail hua");
        return;
      }
      if (result.session?.access_token && result.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }
      window.localStorage.setItem(CUSTOMER_ONBOARDED_KEY, "true");
      window.localStorage.removeItem(CUSTOMER_DRAFT_KEY);
      try { window.dispatchEvent(new Event("ko-customer-onboarded")); } catch { /* ignore */ }
    }
    setSuccessOpen(false);
    onComplete?.();
  };

  const managerMeta = MANAGER_OPTIONS.find((m) => m.value === manager);

  // === Render ===
  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={transparent ? { background: "transparent" } : { background: "linear-gradient(160deg,#fffdf5 0%,#fbf3d9 60%,#f5e9b8 100%)" }}
    >
      {/* Backdrop dim */}
      {transparent && (
        <button
          aria-label="Close"
          onClick={onBack}
          className="absolute inset-0 bg-[oklch(0.10_0.03_85/0.35)] backdrop-blur-[2px]"
        />
      )}

      {/* Bottom sheet */}
      <motion.section
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className="absolute inset-x-0 bottom-0 z-20 mx-auto max-w-md"
      >
        <div
          className="relative rounded-t-[32px] overflow-hidden"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,0.96) 0%,rgba(251,243,217,0.96) 100%)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 -22px 60px -16px rgba(212,175,55,0.55), 0 0 0 1.5px rgba(255,255,255,0.7) inset",
            minHeight: 360,
          }}
        >
          {/* Drag handle */}
          <div className="pt-3 pb-1 grid place-items-center">
            <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
          </div>

          {/* Top bar: back + close + step pill */}
          <div className="flex items-center justify-between px-5 pt-1">
            {step > 1 && step < 7 ? (
              <button
                onClick={() => goBack((step - 1) as Step)}
                className="h-9 w-9 rounded-full bg-white/80 border border-[color:oklch(0.78_0.14_82/0.45)] grid place-items-center active:scale-90"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
              </button>
            ) : <span className="h-9 w-9" />}

            <span className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.50_0.10_82)] font-semibold">
              Step {step} / 7
            </span>

            {!hideBack ? (
              <button
                onClick={onBack}
                className="h-9 w-9 rounded-full bg-white/80 border border-[color:oklch(0.78_0.14_82/0.45)] grid place-items-center active:scale-90"
                aria-label="Close"
              >
                <svg className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : <span className="h-9 w-9" />}
          </div>

          {/* Step body with slide animation */}
          <div className="px-6 pb-8 pt-4 min-h-[300px] relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 1 && (
                  <PhoneStep
                    initialDigits={phoneDigits}
                    onChangeDigits={setPhoneDigits}
                    sending={otpSending}
                    error={otpError}
                    onSubmit={handleSendOtp}
                  />
                )}
                {step === 2 && (
                  <OtpStep
                    phone={phone}
                    digits={otpDigits}
                    onDigitChange={(i, v) => {
                      const next = [...otpDigits];
                      next[i] = v.replace(/\D/g, "").slice(-1);
                      setOtpDigits(next);
                      if (v && i < 3) otpRefs.current[i + 1]?.focus();
                    }}
                    seconds={otpSeconds}
                    onResend={handleResendOtp}
                    onEditPhone={() => goBack(1)}
                    refs={otpRefs}
                    verifying={otpVerifying}
                  />
                )}
                {step === 3 && (
                  <NameStep
                    name={name}
                    gender={gender}
                    onName={setName}
                    onGender={setGender}
                    onNext={() => name.trim() && gender && goNext(4)}
                  />
                )}
                {step === 4 && (
                  <EmailStep
                    email={email}
                    onEmail={setEmail}
                    onNext={() => /^\S+@\S+\.\S+$/.test(email) && goNext(5)}
                  />
                )}
                {step === 5 && (
                  <AddressStep
                    address={address}
                    onOpenPicker={() => setAddressOpen(true)}
                    onClear={() => setAddress("")}
                    onNext={() => address.trim() && goNext(6)}
                  />
                )}
                {step === 6 && (
                  <ManagerStep
                    managerLabel={managerMeta?.label}
                    managerSub={managerMeta ? `★ ${managerMeta.rating} · ${managerMeta.vendors} vendors` : undefined}
                    onOpenPicker={() => setPicker("manager")}
                    onNext={() => manager && goNext(7)}
                  />
                )}
                {step === 7 && (
                  <ReferralStep
                    referral={referral}
                    onReferral={setReferral}
                    agreed={agreed}
                    onAgreed={setAgreed}
                    onScan={() => setScannerOpen(true)}
                    onSubmit={() => setSuccessOpen(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      <LuxPicker
        open={picker === "manager"}
        title="Choose Your Relation Manager"
        subtitle="Nearby · ratings · vendors handled"
        options={MANAGER_OPTIONS}
        onSelect={(v) => { setManager(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />

      <AddressPicker
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onSelect={(a: AddressResult) => { setAddress(a.full); setAddressOpen(false); }}
      />

      {scannerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center">
            <QrCode className="h-12 w-12 mx-auto text-[color:oklch(0.42_0.10_82)]" />
            <h3 className="font-display text-lg mt-3">Scan referral QR</h3>
            <button
              onClick={() => { setReferral("ARYAN500"); setScannerOpen(false); }}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-br from-[#f5d97a] to-[#d4af37] font-bold text-[color:oklch(0.18_0.06_18)]"
            >
              Simulate scan
            </button>
            <button onClick={() => setScannerOpen(false)} className="mt-2 w-full py-2 text-xs uppercase tracking-widest text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      <SuccessOverlay open={successOpen} name={name} onDone={() => finalizeNow()} />
    </main>
  );
}

// ============================================================
// Step components
// ============================================================

function StepHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-5">
      <div className="text-3xl mb-2">{icon}</div>
      <h2
        className="font-display text-2xl font-bold text-gold-gradient"
        style={{ textDecoration: "underline", textDecorationColor: "rgba(212,175,55,0.55)", textUnderlineOffset: 5 }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-xs text-[color:oklch(0.50_0.08_85)] mt-1 italic">{subtitle}</p>}
    </div>
  );
}

function NextButton({ disabled, label = "Next", onClick, icon = true }: { disabled?: boolean; label?: string; onClick: () => void; icon?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-6 w-full rounded-2xl py-4 font-display text-lg font-bold text-[color:oklch(0.18_0.06_18)] flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale active:scale-[0.98] transition-transform"
      style={{
        background: "linear-gradient(180deg,#fff3c8 0%,#f5d97a 35%,#d4af37 70%,#8b6508 100%)",
        boxShadow: "0 8px 24px -6px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {label}
      {icon && <ArrowRight className="h-5 w-5" />}
    </button>
  );
}

function FieldShell({ Icon, children }: { Icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 px-4 py-3.5 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.45)]">
      <span className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
        <Icon className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
      </span>
      {children}
    </div>
  );
}

// --- Step 1: Phone ---
function PhoneStep({ initialDigits, onChangeDigits, sending, error, onSubmit }: {
  initialDigits: string;
  onChangeDigits: (v: string) => void;
  sending: boolean;
  error: string | null;
  onSubmit: (digits: string) => void;
}) {
  const [d, setD] = useState(initialDigits);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 320); }, []);
  const change = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 10);
    setD(clean);
    onChangeDigits(clean);
  };
  return (
    <div>
      <StepHeader icon="📱" title="Enter mobile number" subtitle="10-digit Indian mobile · OTP via SMS" />
      <FieldShell Icon={Phone}>
        <span className="font-display text-lg text-[color:oklch(0.42_0.10_82)] font-semibold">+91</span>
        <input
          ref={ref}
          value={d}
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && d.length === 10) onSubmit(d); }}
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]*"
          maxLength={10}
          placeholder="98765 43210"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xl font-semibold tracking-wide text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)]"
        />
      </FieldShell>
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <NextButton disabled={d.length !== 10 || sending} label={sending ? "Sending OTP…" : "Send OTP"} onClick={() => onSubmit(d)} />
    </div>
  );
}

// --- Step 2: OTP ---
function OtpStep({ phone, digits, onDigitChange, seconds, onResend, onEditPhone, refs, verifying }: {
  phone: string;
  digits: string[];
  onDigitChange: (i: number, v: string) => void;
  seconds: number;
  onResend: () => void;
  onEditPhone: () => void;
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  verifying: boolean;
}) {
  return (
    <div>
      <StepHeader icon="🔐" title="Enter your OTP" subtitle="Auto-detect on Android" />
      <div className="mb-4 flex items-center justify-center gap-2 text-sm">
        <span className="font-display font-semibold text-[color:oklch(0.32_0.06_85)]">{phone}</span>
        <button onClick={onEditPhone} className="text-[11px] underline text-[color:oklch(0.45_0.10_82)]">edit</button>
      </div>
      <div className="flex items-center justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={digits[i]}
            onChange={(e) => onDigitChange(i, e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            disabled={verifying}
            className={`h-16 w-14 text-center text-3xl font-display font-bold rounded-xl border-2 outline-none ${
              digits[i]
                ? "border-[color:oklch(0.78_0.14_82)] bg-white text-[color:oklch(0.30_0.05_85)] shadow-[0_0_12px_-2px_rgba(212,175,55,0.6)]"
                : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/80 text-[color:oklch(0.55_0.10_82)]"
            }`}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs">
        <button
          onClick={onResend}
          disabled={seconds > 0}
          className="text-[color:oklch(0.45_0.10_82)] underline disabled:opacity-50 disabled:no-underline"
        >
          Resend OTP
        </button>
        <span className="text-[color:oklch(0.45_0.10_82)] tabular-nums font-semibold">
          {verifying ? "Verifying…" : `00:${String(seconds).padStart(2, "0")}`}
        </span>
      </div>
    </div>
  );
}

// --- Step 3: Name + Gender ---
function NameStep({ name, gender, onName, onGender, onNext }: {
  name: string;
  gender: string | null;
  onName: (v: string) => void;
  onGender: (v: string) => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 320); }, []);
  return (
    <div>
      <StepHeader icon="👤" title="Enter full name" subtitle="As you'd like to be addressed" />
      <FieldShell Icon={User}>
        <input
          ref={ref}
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && gender) onNext(); }}
          inputMode="text"
          autoCapitalize="words"
          autoComplete="name"
          placeholder="Your full name"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)]"
        />
      </FieldShell>
      <p className="mt-5 mb-2 text-[11px] uppercase tracking-[0.25em] text-[color:oklch(0.50_0.10_82)] font-semibold">Choose gender</p>
      <div className="grid grid-cols-3 gap-2.5">
        {GENDER_CHIPS.map((g) => (
          <button
            key={g.value}
            onClick={() => onGender(g.value)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 transition-all ${
              gender === g.value
                ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] shadow-[0_4px_12px_-4px_rgba(212,175,55,0.6)]"
                : "border-[color:oklch(0.78_0.14_82/0.3)] bg-white/70"
            }`}
          >
            <img src={g.icon} alt="" className="h-9 w-9" />
            <span className="text-xs font-semibold text-[color:oklch(0.32_0.06_85)]">{g.label}</span>
          </button>
        ))}
      </div>
      <NextButton disabled={!name.trim() || !gender} onClick={onNext} />
    </div>
  );
}

// --- Step 4: Email ---
function EmailStep({ email, onEmail, onNext }: { email: string; onEmail: (v: string) => void; onNext: () => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 320); }, []);
  const valid = /^\S+@\S+\.\S+$/.test(email);
  return (
    <div>
      <StepHeader icon="✉️" title="Choose email ID" subtitle="For receipts & lead updates" />
      <FieldShell Icon={Mail}>
        <input
          ref={ref}
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && valid) onNext(); }}
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          placeholder="you@gmail.com"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)]"
        />
      </FieldShell>
      <NextButton disabled={!valid} onClick={onNext} />
    </div>
  );
}

// --- Step 5: Address ---
function AddressStep({ address, onOpenPicker, onClear, onNext }: {
  address: string;
  onOpenPicker: () => void;
  onClear: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader icon="📍" title="Your address" subtitle="Auto-detect or pick on map" />
      <button
        onClick={onOpenPicker}
        className="w-full text-left rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 px-4 py-3.5 flex items-center gap-3 active:scale-[0.99]"
      >
        <span className="h-9 w-9 rounded-full grid place-items-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
          <MapPin className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
        </span>
        <span className="flex-1 min-w-0 text-sm">
          {address ? (
            <span className="text-[color:oklch(0.28_0.06_85)] font-medium line-clamp-2">{address}</span>
          ) : (
            <span className="text-[color:oklch(0.55_0.08_85/0.7)] italic">Tap to detect or select address</span>
          )}
        </span>
        {address && (
          <span onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-[10px] underline text-[color:oklch(0.45_0.10_82)]">change</span>
        )}
      </button>
      <NextButton disabled={!address.trim()} onClick={onNext} />
    </div>
  );
}

// --- Step 6: Manager ---
function ManagerStep({ managerLabel, managerSub, onOpenPicker, onNext }: {
  managerLabel?: string;
  managerSub?: string;
  onOpenPicker: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader icon="🤝" title="Choose manager" subtitle="Nearby franchise & relation managers" />
      <button
        onClick={onOpenPicker}
        className="w-full text-left rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 px-4 py-3.5 flex items-center gap-3 active:scale-[0.99]"
      >
        <span className="h-9 w-9 rounded-full grid place-items-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
          <UserCheck className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
        </span>
        <span className="flex-1 min-w-0">
          {managerLabel ? (
            <>
              <div className="text-sm font-semibold text-[color:oklch(0.28_0.06_85)]">{managerLabel}</div>
              {managerSub && <div className="text-[11px] text-[color:oklch(0.50_0.08_85)]">{managerSub}</div>}
            </>
          ) : (
            <span className="text-sm text-[color:oklch(0.55_0.08_85/0.7)] italic">Tap to choose nearby manager</span>
          )}
        </span>
      </button>
      <NextButton disabled={!managerLabel} onClick={onNext} />
    </div>
  );
}

// --- Step 7: Referral + Terms ---
function ReferralStep({ referral, onReferral, agreed, onAgreed, onScan, onSubmit }: {
  referral: string;
  onReferral: (v: string) => void;
  agreed: boolean;
  onAgreed: (v: boolean) => void;
  onScan: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <StepHeader icon="🎁" title="Referral code" subtitle="Optional · earn rewards" />
      <div className="rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 px-4 py-3 flex items-center gap-3">
        <span className="h-9 w-9 rounded-full grid place-items-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
          <Gift className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
        </span>
        <input
          value={referral}
          onChange={(e) => onReferral(e.target.value.toUpperCase())}
          inputMode="text"
          autoCapitalize="characters"
          placeholder="Enter referral code"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)] uppercase tracking-wider"
        />
        <button onClick={onScan} className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[color:oklch(0.78_0.14_82/0.6)] grid place-items-center" aria-label="Scan QR">
          <QrCode className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
        </button>
      </div>

      <label className="mt-5 flex items-start gap-3 cursor-pointer">
        <span
          onClick={() => onAgreed(!agreed)}
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
        <input type="checkbox" checked={agreed} onChange={(e) => onAgreed(e.target.checked)} className="sr-only" />
        <span className="text-sm text-[color:oklch(0.35_0.06_85)] leading-snug">
          I accept Terms &amp; Conditions and Privacy Policy
        </span>
      </label>

      <NextButton disabled={!agreed} label="Thanks for you" icon={false} onClick={onSubmit} />
      {agreed && (
        <p className="mt-2 text-center text-[11px] text-[color:oklch(0.50_0.08_85)] flex items-center justify-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ready to submit
        </p>
      )}
    </div>
  );
}
