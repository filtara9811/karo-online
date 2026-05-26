import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Phone, Gift, ArrowRight, ShieldCheck, KeyRound, UserCircle2, X, Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { finalizeCustomerRegistration, sendOtp, verifyOtp } from "@/lib/otp.functions";

type Step = 1 | 2 | 3;
export const CUSTOMER_ONBOARDED_KEY = "ko-customer-onboarded";
const CUSTOMER_DRAFT_KEY = "ko-customer-registration-draft-v5";
const STALE_CUSTOMER_DRAFT_KEYS = [
  "ko-customer-registration-draft",
  "ko-customer-registration-draft-v1",
  "ko-customer-registration-draft-v2",
  "ko-customer-registration-draft-v3",
  "ko-customer-registration-draft-v4",
];

type CustomerDraft = {
  step?: Step;
  gender?: string | null;
  name?: string;
  phone?: string;
  referral?: string;
};

const normalizeStep = (value: unknown): Step => (value === 1 || value === 2 || value === 3 ? value : 1);

// ── Hindi voice prompts ───────────────────────────────────────────────
let __voicesPrimed = false;
const primeVoices = () => {
  if (__voicesPrimed || typeof window === "undefined" || !window.speechSynthesis) return;
  __voicesPrimed = true;
  try { window.speechSynthesis.getVoices(); } catch { /* */ }
};
const speakHi = (text: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    primeVoices();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    u.rate = 0.95;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const hi = voices.find((v) => v.lang?.toLowerCase().startsWith("hi"));
    if (hi) u.voice = hi;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
};
const STEP_VOICE: Record<Step, string> = {
  1: "मोबाइल नंबर दर्ज करें",
  2: "ओ टी पी दर्ज करें",
  3: "अपना नाम और जेंडर चुनें",
};

const clearStaleCustomerDrafts = () => {
  if (typeof window === "undefined") return;
  try {
    STALE_CUSTOMER_DRAFT_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch { /* ignore */ }
};

const readDraft = (): CustomerDraft => {
  if (typeof window === "undefined") return {};
  clearStaleCustomerDrafts();
  try {
    const raw = JSON.parse(window.localStorage.getItem(CUSTOMER_DRAFT_KEY) || "{}") as CustomerDraft;
    return { ...raw, step: normalizeStep(raw.step) };
  } catch { return {}; }
};

const formatIndianMobile = (digits: string) => "+91 " + digits.slice(0, 5) + " " + digits.slice(5);

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
  /** "vendor" enables vendor-claim-by-phone fast path + skips /quick navigation. */
  flow?: "customer" | "vendor";
};

function readReferralFromContext(): { code: string; locked: boolean } {
  if (typeof window === "undefined") return { code: "", locked: false };
  const u = new URLSearchParams(window.location.search);
  const fromUrl = u.get("ref") || u.get("referral");
  if (fromUrl) return { code: fromUrl.toUpperCase(), locked: true };
  try {
    const fromStorage = window.localStorage.getItem("ko-pending-referral-code");
    if (fromStorage) return { code: fromStorage.toUpperCase(), locked: true };
  } catch { /* ignore */ }
  const m = document.cookie.match(/(?:^|;\s*)ko_ref=([^;]+)/);
  if (m) {
    try { return { code: decodeURIComponent(m[1]).toUpperCase(), locked: true }; }
    catch { return { code: m[1].toUpperCase(), locked: true }; }
  }
  return { code: "", locked: false };
}

export function RegistrationFlow({ transparent, onBack, onComplete, flow = "customer" }: RegistrationFlowProps) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const draft = useMemo(readDraft, []);

  const initialRef = useMemo(readReferralFromContext, []);

  const [step, setStep] = useState<Step>(normalizeStep(draft.step));

  const [phone, setPhone] = useState(draft.phone ?? "");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [gender, setGender] = useState<string | null>(draft.gender ?? null);
  const [name, setName] = useState(draft.name ?? "");
  const [referral, setReferral] = useState<string>(initialRef.code || draft.referral || "");
  const referralLocked = initialRef.locked && !!initialRef.code;

  const [otp, setOtp] = useState("");
  const [otpSeconds, setOtpSeconds] = useState(45);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);
  const finalizeCustomerFn = useServerFn(finalizeCustomerRegistration);

  // Prefill name from session
  useEffect(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const metaName = meta?.full_name || meta?.name;
    if (metaName && !name) setName(metaName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMER_DRAFT_KEY, JSON.stringify({
      step, gender, name, phone, referral,
    }));
  }, [step, gender, name, phone, referral]);

  // OTP timer
  useEffect(() => {
    if (step !== 2 || otpSeconds <= 0) return;
    const t = setTimeout(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, otpSeconds]);

  // Hindi voice prompt per step (gated until first user gesture)
  const spokenSteps = useRef<Set<Step>>(new Set());
  useEffect(() => {
    const fire = () => {
      if (spokenSteps.current.has(step)) return;
      spokenSteps.current.add(step);
      speakHi(STEP_VOICE[step]);
    };
    // try immediately; if blocked (no gesture yet), fire on first interaction
    const t = setTimeout(fire, 250);
    const onGesture = () => { fire(); cleanup(); };
    const cleanup = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => { clearTimeout(t); cleanup(); };
  }, [step]);

  const goNext = (target: Step) => setStep(target);

  // NOTE: auto-verify removed — user must explicitly tap "Verify OTP" button.



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
      setOtp("");
      setOtpSeconds(45);
      goNext(2);
      toast.success("OTP sent to " + formatIndianMobile(digits));
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpVerify = async (code: string) => {
    setOtpVerifying(true);
    try {
      const res = await verifyOtpFn({ data: { phone, code } });
      if (!res.ok) {
        toast.error(res.error || "Wrong OTP");
        setOtp("");
        return;
      }
      // Vendor flow: relink existing vendor row to current auth user (handles
      // duplicate-auth-identity case) and skip the customer name/gender step.
      if (flow === "vendor") {
        try {
          const { data: v } = await supabase.rpc("vendor_claim_by_phone", { _phone: phone });
          const row = Array.isArray(v) ? v[0] : v;
          if (row?.user_id) {
            try { window.localStorage.setItem(CUSTOMER_ONBOARDED_KEY, "true"); } catch { /* */ }
            try { window.localStorage.removeItem(CUSTOMER_DRAFT_KEY); } catch { /* */ }
            toast.success(`Welcome back, ${row.business_name || "Vendor"}`);
            onComplete?.();
            return;
          }
        } catch (e) { console.warn("[vendor_claim_by_phone]", e); }
      }
      // Lookup existing customer by phone
      try {
        const { data, error } = await supabase.rpc("lookup_customer_by_phone", { _phone: phone });
        if (!error && data && data.length > 0) {
          const row = data[0] as { name: string | null; gender: string | null };
          if (row.name) {
            setName(row.name);
            if (row.gender) setGender(row.gender);
            toast.success(`Welcome back, ${row.name}`);
            await finalizeNow({ name: row.name, gender: row.gender ?? "" });
            return;
          }
        }
      } catch { /* ignore */ }
      goNext(3);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = () => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    setOtp("");
    setOtpSeconds(45);
    handleSendOtp(digits);
  };

  const pasteOtp = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      const digits = (txt || "").replace(/\D/g, "").slice(0, 4);
      if (digits) setOtp(digits);
    } catch { /* permission denied */ }
  };

  const finalizeNow = async (override?: { name: string; gender: string }) => {
    if (finalizing) return;
    setFinalizing(true);
    try {
      const payload = {
        name: (override?.name ?? name).trim(),
        gender: override?.gender ?? gender ?? "",
        phone,
        email: "",
        address: "",
      };
      try {
        if (user) {
          const { error } = await supabase.rpc("save_customer_profile", {
            _name: payload.name,
            _gender: payload.gender,
            _phone: payload.phone,
            _email: user.email || "",
            _address: "",
          });
          if (error) {
            console.error("save_customer_profile error", error);
            toast.error(error.message || "Profile save fail hua");
            return;
          }
          window.localStorage.setItem(CUSTOMER_ONBOARDED_KEY, "true");
          window.localStorage.removeItem(CUSTOMER_DRAFT_KEY);
          await refreshProfile();
          try { window.dispatchEvent(new Event("ko-customer-onboarded")); } catch { /* ignore */ }
        } else {
          const result = await finalizeCustomerFn({ data: payload });
          if (!result.ok) {
            console.error("finalizeCustomer error", result.error);
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
      } catch (err) {
        console.error("finalizeNow exception", err);
        toast.error((err as Error)?.message || "Sign up fail hua, dobara try karein");
        return;
      }
      // Apply referral
      try {
        if (referral && referral.trim()) {
          window.localStorage.setItem("ko-pending-referral-code", referral.trim().toUpperCase());
        }
        const { applyPendingReferralCode } = await import("@/hooks/use-referral");
        await applyPendingReferralCode();
      } catch (err) { console.error("apply referral error", err); }

      toast.success(`Thank you for login, ${payload.name}`);
      setSuccessOpen(true);
    } finally {
      setFinalizing(false);
    }
  };

  const handleSuccessHome = () => {
    setSuccessOpen(false);
    onComplete?.();
    // Customer flow falls back to /quick; vendor flow's onComplete navigates itself.
    if (flow !== "vendor") {
      try { navigate({ to: "/quick" }); } catch { /* ignore */ }
    }
  };

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={transparent ? { background: "transparent" } : { background: "linear-gradient(160deg,#fffdf5 0%,#fbf3d9 60%,#f5e9b8 100%)" }}
    >
      {transparent && (
        <div className="absolute inset-0 bg-[oklch(0.10_0.03_85/0.35)] backdrop-blur-[2px]" />
      )}

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
            background: "linear-gradient(180deg,rgba(255,255,255,0.97) 0%,rgba(251,243,217,0.97) 100%)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 -22px 60px -16px rgba(212,175,55,0.55), 0 0 0 1.5px rgba(255,255,255,0.7) inset",
            minHeight: 380,
          }}
        >
          <div className="pt-3 pb-1 grid place-items-center">
            <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
          </div>

          <div className="px-5 pt-1 flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === step ? "w-7 bg-gradient-to-r from-[#d4af37] to-[#8b6508]" :
                    n < step ? "w-3 bg-[color:oklch(0.78_0.14_82/0.7)]" :
                    "w-3 bg-[color:oklch(0.78_0.14_82/0.25)]"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="mt-1 text-center text-[10px] uppercase tracking-[0.35em] text-[color:oklch(0.50_0.10_82)] font-semibold">
            Step {step} / 3
          </p>

          <div className="px-6 pb-8 pt-3 min-h-[320px] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
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
                    otp={otp}
                    onOtp={setOtp}
                    seconds={otpSeconds}
                    onResend={handleResendOtp}
                    onPaste={pasteOtp}
                    verifying={otpVerifying}
                    onVerify={() => handleOtpVerify(otp)}
                  />
                )}
                {step === 3 && (
                  <ProfileStep
                    name={name}
                    gender={gender}
                    referral={referral}
                    referralLocked={referralLocked}
                    onName={setName}
                    onGender={setGender}
                    onReferral={setReferral}
                    submitting={finalizing}
                    onSubmit={() => finalizeNow()}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      <SuccessOverlay
        open={successOpen}
        name={name}
        ctaLabel="Go to Home"
        autoClose
        onDone={handleSuccessHome}
      />
    </main>
  );
}

// ============================================================
// Reusable bits
// ============================================================

function PremiumIcon({ Icon }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <div
      className="mx-auto h-16 w-16 rounded-2xl grid place-items-center mb-3"
      style={{
        background: "linear-gradient(135deg,#fff8dc 0%,#f5d97a 45%,#d4af37 100%)",
        boxShadow: "0 10px 22px -8px rgba(212,175,55,0.65), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -2px 0 rgba(139,101,8,0.25)",
      }}
    >
      <Icon className="h-8 w-8 text-[color:oklch(0.28_0.10_82)]" strokeWidth={1.7} />
    </div>
  );
}

function StepHeader({ Icon, title, subtitle }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-5">
      <PremiumIcon Icon={Icon} />
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

// ============================================================
// Step 1: Phone
// ============================================================
function PhoneStep({ initialDigits, onChangeDigits, sending, error, onSubmit }: {
  initialDigits: string;
  onChangeDigits: (v: string) => void;
  sending: boolean;
  error: string | null;
  onSubmit: (digits: string) => void;
}) {
  const [d, setD] = useState(initialDigits);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 320);
  }, []);
  const change = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 10);
    setD(clean);
    onChangeDigits(clean);
  };
  return (
    <div>
      <StepHeader Icon={Phone} title="Enter mobile number" subtitle="10-digit Indian mobile · OTP via SMS" />
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
          placeholder="Mobile number"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xl font-semibold tracking-wide text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.45)] placeholder:font-normal placeholder:text-base"
        />
      </FieldShell>
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <NextButton disabled={d.length !== 10 || sending} label={sending ? "Sending OTP…" : "Send OTP"} onClick={() => onSubmit(d)} />
    </div>
  );
}

// ============================================================
// Step 2: OTP
// ============================================================
function OtpStep({ phone, otp, onOtp, seconds, onResend, onPaste, verifying, onVerify }: {
  phone: string;
  otp: string;
  onOtp: (v: string) => void;
  seconds: number;
  onResend: () => void;
  onPaste: () => void;
  verifying: boolean;
  onVerify: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 320);
  }, []);
  const ready = otp.length === 4 && !verifying;
  return (
    <div>
      <StepHeader Icon={KeyRound} title="Enter OTP" subtitle="Paste from SMS, then tap Verify" />
      <div className="mb-4 flex items-center justify-center gap-2 text-sm">
        <span className="font-display font-semibold text-[color:oklch(0.32_0.06_85)]">{phone}</span>
      </div>

      <div className="relative mx-auto w-fit">
        <input
          ref={ref}
          value={otp}
          onChange={(e) => onOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => { if (e.key === "Enter" && ready) onVerify(); }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={4}
          disabled={verifying}
          aria-label="OTP code"
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text tracking-[1.5em]"
        />
        <div className="flex items-center gap-3 pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-16 w-14 grid place-items-center text-3xl font-display font-bold rounded-xl border-2 ${
                otp[i]
                  ? "border-[color:oklch(0.78_0.14_82)] bg-white text-[color:oklch(0.30_0.05_85)] shadow-[0_0_12px_-2px_rgba(212,175,55,0.6)]"
                  : i === otp.length
                  ? "border-[color:oklch(0.78_0.14_82)] bg-white/90 ring-2 ring-[color:oklch(0.78_0.14_82/0.3)]"
                  : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/80"
              }`}
            >
              {otp[i] || ""}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs">
        <button
          onClick={onResend}
          disabled={seconds > 0}
          className="text-[color:oklch(0.45_0.10_82)] underline disabled:opacity-50 disabled:no-underline"
        >
          Resend OTP
        </button>
        <button
          onClick={onPaste}
          disabled={verifying}
          className="text-[color:oklch(0.45_0.10_82)] underline"
        >
          Paste OTP
        </button>
        <span className="text-[color:oklch(0.45_0.10_82)] tabular-nums font-semibold">
          {verifying ? "Verifying…" : `00:${String(seconds).padStart(2, "0")}`}
        </span>
      </div>

      <NextButton
        disabled={!ready}
        label={verifying ? "Verifying…" : "Verify OTP"}
        icon={false}
        onClick={onVerify}
      />
    </div>
  );
}

// ============================================================
// Step 3: Name + Gender + Referral (single screen) → Sign Up
// ============================================================
function ProfileStep({
  name, gender, referral, referralLocked,
  onName, onGender, onReferral,
  submitting, onSubmit,
}: {
  name: string;
  gender: string | null;
  referral: string;
  referralLocked: boolean;
  onName: (v: string) => void;
  onGender: (v: string) => void;
  onReferral: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 320); }, []);

  const ready = !!name.trim() && !!gender;

  return (
    <div>
      <StepHeader Icon={UserCircle2} title="Almost done" subtitle="Name, gender — that's it" />

      <FieldShell Icon={UserCircle2}>
        <input
          ref={ref}
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && ready) onSubmit(); }}
          inputMode="text"
          autoCapitalize="words"
          autoComplete="name"
          placeholder="Your full name"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.6)]"
        />
      </FieldShell>

      {/* Gender chips inline */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {GENDER_CHIPS.map((g) => (
          <button
            key={g.value}
            onClick={() => onGender(g.value)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 transition-all active:scale-[0.97] ${
              gender === g.value
                ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]"
                : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/85"
            }`}
          >
            <img src={g.icon} alt="" className="h-9 w-9 object-contain" />
            <span className="text-[11px] font-display font-bold text-[color:oklch(0.30_0.10_82)]">{g.label}</span>
          </button>
        ))}
      </div>

      {/* Referral — auto-locked if from invite, else editable */}
      {referralLocked ? (
        <div className="mt-4 rounded-2xl border-2 border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] px-4 py-3 flex items-center gap-3 shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]">
          <span className="h-9 w-9 rounded-full grid place-items-center bg-white/70">
            <Gift className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-[color:oklch(0.45_0.10_82)] font-semibold">Referral applied</div>
            <div className="font-display text-base font-bold text-[color:oklch(0.28_0.06_85)] truncate">{referral}</div>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
        </div>
      ) : (
        <div className="mt-4">
          <FieldShell Icon={Gift}>
            <input
              value={referral}
              onChange={(e) => onReferral(e.target.value.toUpperCase())}
              inputMode="text"
              autoCapitalize="characters"
              placeholder="Referral code (optional)"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)] uppercase tracking-wider"
            />
          </FieldShell>
        </div>
      )}

      <NextButton disabled={!ready || submitting} label={submitting ? "Signing in…" : "Sign Up"} icon={false} onClick={onSubmit} />
    </div>
  );
}

// Unused exports kept to avoid breaking imports elsewhere
export const __noop = () => {};
const _Unused: React.FC = () => <X className="hidden" />;
void _Unused;
