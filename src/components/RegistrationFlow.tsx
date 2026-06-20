import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Phone, Gift, ArrowRight, ShieldCheck, KeyRound, UserCircle2, X, Pencil,
  Mail, ChevronDown, Volume2, VolumeX, Play, Check, Languages, Calendar, MapPin,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import { LanguageSheet, getStoredLang, type AppLang } from "@/components/LanguageSheet";
import { DobWheelPicker } from "@/components/DobWheelPicker";
import { AddressPicker, type AddressResult } from "@/components/AddressPicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { checkTestAccountPhone, finalizeCustomerRegistration, sendOtp, verifyOtp } from "@/lib/otp.functions";

type Step = 1 | 2 | 3 | 4;
export const CUSTOMER_ONBOARDED_KEY = "ko-customer-onboarded";
const CUSTOMER_DRAFT_KEY = "ko-customer-registration-draft-v6";
const STALE_CUSTOMER_DRAFT_KEYS = [
  "ko-customer-registration-draft",
  "ko-customer-registration-draft-v1",
  "ko-customer-registration-draft-v2",
  "ko-customer-registration-draft-v3",
  "ko-customer-registration-draft-v4",
  "ko-customer-registration-draft-v5",
];

type CustomerDraft = {
  step?: Step;
  gender?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  referral?: string;
  dob?: string | null;
  address?: string;
  agreedTerms?: boolean;
};

const normalizeStep = (value: unknown): Step =>
  (value === 1 || value === 2 || value === 3 || value === 4 ? value : 1);

// ── Hindi voice prompts ───────────────────────────────────────────────
let __voicesPrimed = false;
const primeVoices = () => {
  if (__voicesPrimed || typeof window === "undefined" || !window.speechSynthesis) return;
  __voicesPrimed = true;
  try { window.speechSynthesis.getVoices(); } catch { /* */ }
};
const speakHi = (text: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try { if (localStorage.getItem("ko-tts-muted") === "1") return; } catch { /* */ }
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
  1: "अपना मोबाइल नंबर दर्ज करें",
  2: "अपना ओटीपी दर्ज करें",
  3: "रजिस्टर पेज, अपनी बेसिक डिटेल्स भरें",
  4: "वीडियो देखें और प्राइवेसी पॉलिसी स्वीकार करें",
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

const phoneDigitsFromValue = (value: string) => value.replace(/\D/g, "").slice(-10);
const formatIndianMobile = (digits: string) => "+91 " + digits.slice(0, 5) + " " + digits.slice(5);

const GENDER_CHIPS: { value: string; label: string; icon: string }[] = [
  { value: "male", label: "Male", icon: goldMale },
  { value: "female", label: "Female", icon: goldFemale },
  { value: "other", label: "Other", icon: goldOther },
];

const genderLabel = (v: string | null) =>
  GENDER_CHIPS.find((g) => g.value === v)?.label ?? "";

export type RegistrationFlowProps = {
  transparent?: boolean;
  hideBack?: boolean;
  onBack?: () => void;
  onComplete?: () => void;
  flow?: "customer" | "vendor";
};

function readReferralFromContext(): { code: string; locked: boolean } {
  if (typeof window === "undefined") return { code: "", locked: false };
  const u = new URLSearchParams(window.location.search);
  const fromUrl = u.get("ref") || u.get("referral");
  if (fromUrl) return { code: fromUrl.toUpperCase(), locked: false };
  try {
    const fromStorage = window.localStorage.getItem("ko-pending-referral-code");
    if (fromStorage) return { code: fromStorage.toUpperCase(), locked: false };
  } catch { /* ignore */ }
  const m = document.cookie.match(/(?:^|;\s*)ko_ref=([^;]+)/);
  if (m) {
    try { return { code: decodeURIComponent(m[1]).toUpperCase(), locked: false }; }
    catch { return { code: m[1].toUpperCase(), locked: false }; }
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
  const [phoneDigits, setPhoneDigits] = useState(() => phoneDigitsFromValue(draft.phone ?? ""));
  const [gender, setGender] = useState<string | null>(draft.gender ?? null);
  const [firstName, setFirstName] = useState(draft.firstName ?? "");
  const [lastName, setLastName] = useState(draft.lastName ?? "");
  const [email, setEmail] = useState(draft.email ?? "");
  const [referral, setReferral] = useState<string>(initialRef.code || draft.referral || "");
  const referralLocked = initialRef.locked && !!initialRef.code;

  const [genderSheetOpen, setGenderSheetOpen] = useState(false);
  const [dobSheetOpen, setDobSheetOpen] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [lang, setLang] = useState<AppLang>(() => getStoredLang());

  const [dob, setDob] = useState<string | null>(draft.dob ?? null);
  const [address, setAddress] = useState<string>(draft.address ?? "");
  const [agreedTerms, setAgreedTerms] = useState<boolean>(draft.agreedTerms ?? false);

  const [otp, setOtp] = useState("");
  const [otpSeconds, setOtpSeconds] = useState(45);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [testOtpCode, setTestOtpCode] = useState<string | null>(null);
  const [isTestNumber, setIsTestNumber] = useState(false);
  const autoVerifiedTestOtpRef = useRef<string | null>(null);
  const otpSendInFlightRef = useRef(false);

  const [successOpen, setSuccessOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);
  const checkTestAccountPhoneFn = useServerFn(checkTestAccountPhone);
  const finalizeCustomerFn = useServerFn(finalizeCustomerRegistration);

  // Prefill from session
  useEffect(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string; first_name?: string; last_name?: string } | undefined;
    if (meta?.first_name && !firstName) setFirstName(meta.first_name);
    if (meta?.last_name && !lastName) setLastName(meta.last_name);
    const metaName = meta?.full_name || meta?.name;
    if (metaName && !firstName && !lastName) {
      const parts = metaName.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    if (user?.email && !email) setEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMER_DRAFT_KEY, JSON.stringify({
      step, gender, firstName, lastName, email, phone, referral, dob, address, agreedTerms,
    }));
  }, [step, gender, firstName, lastName, email, phone, referral, dob, address, agreedTerms]);

  // OTP timer
  useEffect(() => {
    if (step !== 2 || otpSeconds <= 0) return;
    const t = setTimeout(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, otpSeconds]);

  // Hindi voice prompt per step
  const spokenSteps = useRef<Set<Step>>(new Set());
  useEffect(() => {
    const fire = () => {
      if (spokenSteps.current.has(step)) return;
      spokenSteps.current.add(step);
      speakHi(STEP_VOICE[step]);
    };
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

  useEffect(() => {
    if (step !== 1) return;
    if (phoneDigits.length !== 10) {
      setIsTestNumber(false);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await checkTestAccountPhoneFn({ data: { phone: phoneDigits } });
        if (!cancelled) setIsTestNumber(!!res.is_test_account);
      } catch {
        if (!cancelled) setIsTestNumber(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [step, phoneDigits, checkTestAccountPhoneFn]);

  const handleSendOtp = async (digits: string) => {
    if (otpSendInFlightRef.current) return;
    if (digits.length !== 10) {
      toast.error("10 digit mobile number daaliye");
      return;
    }
    otpSendInFlightRef.current = true;
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await sendOtpFn({ data: { phone: digits } });
      if (!res.ok) {
        const rawError = res.error || "Could not send OTP";
        const friendlyError = /No active SMS gateway|SMS gateway lookup/i.test(rawError)
          ? "OTP service temporary issue hai. Please dobara Send OTP try karein."
          : rawError;
        setOtpError(friendlyError);
        return;
      }
      const testerOtp = "otp_code" in res && typeof res.otp_code === "string" ? res.otp_code : null;
      const testNumber = "test_account" in res && !!res.test_account;
      const reusedOtp = "reused" in res && !!res.reused;
      const cooldownRemaining = "cooldown_remaining" in res && typeof res.cooldown_remaining === "number" ? res.cooldown_remaining : 45;
      setPhone(formatIndianMobile(digits));
      setIsTestNumber(testNumber);
      setTestOtpCode(testerOtp);
      setOtp(testerOtp ?? "");
      setOtpSeconds(reusedOtp ? Math.max(1, cooldownRemaining) : 45);
      goNext(2);
      toast.success(testNumber ? "Test number detected — auto verifying" : reusedOtp ? "OTP already sent — wahi OTP enter karein" : "OTP sent to " + formatIndianMobile(digits));
    } finally {
      otpSendInFlightRef.current = false;
      setOtpSending(false);
    }
  };

  useEffect(() => {
    if (step !== 2 || !testOtpCode || !phone || otpVerifying) return;
    const key = `${phone}:${testOtpCode}`;
    if (autoVerifiedTestOtpRef.current === key) return;
    autoVerifiedTestOtpRef.current = key;
    setOtp(testOtpCode);
    const t = window.setTimeout(() => handleOtpVerify(testOtpCode), 180);
    return () => window.clearTimeout(t);
  }, [step, testOtpCode, phone, otpVerifying]);

  const handleOtpVerify = async (code: string) => {
    setOtpVerifying(true);
    try {
      const res = await verifyOtpFn({ data: { phone, code } });
      if (!res.ok) {
        toast.error(res.error || "Wrong OTP");
        setOtp("");
        return;
      }
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
      try {
        const { data, error } = await supabase.rpc("lookup_customer_by_phone", { _phone: phone });
        if (!error && data && data.length > 0) {
          const row = data[0] as { name: string | null; gender: string | null };
          if (row.name) {
            const parts = (row.name || "").trim().split(" ");
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
            if (row.gender) setGender(row.gender);
            toast.success(`Welcome back, ${row.name}`);
            await finalizeNow({ name: row.name, gender: row.gender ?? "", email });
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
    setTestOtpCode(null);
    setIsTestNumber(false);
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

  const finalizeNow = async (override?: { name: string; gender: string; email: string }) => {
    if (finalizing) return;
    setFinalizing(true);
    try {
      const fullName = override?.name ?? `${firstName.trim()} ${lastName.trim()}`.trim();
      const payload = {
        name: fullName,
        gender: override?.gender ?? gender ?? "",
        phone,
        email: (override?.email ?? email ?? "").trim(),
        address: address || "",
      };
      try {
        if (user) {
          const { error } = await supabase.rpc("save_customer_profile", {
            _name: payload.name,
            _gender: payload.gender,
            _phone: payload.phone,
            _email: payload.email || user.email || "",
            _address: address || "",
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
      try {
        if (referral && referral.trim()) {
          window.localStorage.setItem("ko-pending-referral-code", referral.trim().toUpperCase());
        }
        const { applyPendingReferralCode } = await import("@/hooks/use-referral");
        await applyPendingReferralCode();
      } catch (err) { console.error("apply referral error", err); }

      toast.success(`Registered — ${payload.name}`);
      // If invoked via auto-finalize on lookup (override), go straight to success.
      // Otherwise, advance to the welcome video step.
      if (override) {
        setSuccessOpen(true);
      } else {
        goNext(4);
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleSuccessHome = () => {
    setSuccessOpen(false);
    onComplete?.();
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

          {/* Top bar: title (left) + language icon + close (right) */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="pointer-events-auto text-[11px] uppercase tracking-[0.3em] font-bold text-[color:oklch(0.30_0.10_82)]">
              Registered page
            </span>
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLangSheetOpen(true)}
                aria-label="Change language"
                className="h-9 w-9 rounded-full grid place-items-center bg-white/90 border border-[color:oklch(0.78_0.14_82/0.55)] shadow-sm active:scale-95"
              >
                <Languages className="h-4 w-4 text-[color:oklch(0.40_0.10_82)]" strokeWidth={2.2} />
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Close registration"
                  className="h-9 w-9 rounded-full grid place-items-center bg-white/90 border border-[color:oklch(0.78_0.14_82/0.55)] shadow-sm active:scale-95"
                >
                  <X className="h-4 w-4 text-[color:oklch(0.40_0.10_82)]" strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>


          <div className="px-5 pt-1 flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((n) => (
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
            Step {step} / 4
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
                    onChangeDigits={(d) => { setPhoneDigits(d); if (otpError) setOtpError(null); }}
                    isTestNumber={isTestNumber}
                    sending={otpSending}
                    error={otpError}
                    onSubmit={handleSendOtp}
                  />
                )}
                {step === 2 && (
                  <OtpStep
                    phone={phone}
                    otp={otp}
                    isTestNumber={isTestNumber}
                    onOtp={setOtp}
                    seconds={otpSeconds}
                    onResend={handleResendOtp}
                    onPaste={pasteOtp}
                    verifying={otpVerifying}
                    onVerify={() => handleOtpVerify(otp)}
                    onEdit={() => {
                      const digits = phoneDigitsFromValue(phone);
                      setPhoneDigits(digits);
                      setPhone(digits);
                      setOtp("");
                      setTestOtpCode(null);
                      setIsTestNumber(false);
                      autoVerifiedTestOtpRef.current = null;
                      setOtpSeconds(0);
                      setOtpError(null);
                      goNext(1);
                    }}
                  />
                )}
                {step === 3 && (
                  <ProfileStep
                    phone={phone}
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    gender={gender}
                    dob={dob}
                    address={address}
                    agreedTerms={agreedTerms}
                    referral={referral}
                    referralLocked={referralLocked}
                    onFirstName={setFirstName}
                    onLastName={setLastName}
                    onEmail={setEmail}
                    onOpenGender={() => setGenderSheetOpen(true)}
                    onOpenDob={() => setDobSheetOpen(true)}
                    onOpenAddress={() => setAddressSheetOpen(true)}
                    onToggleTerms={() => setAgreedTerms((v) => !v)}
                    onReferral={setReferral}
                    submitting={finalizing}
                    onSubmit={() => finalizeNow()}
                  />
                )}
                {step === 4 && (
                  <WelcomeVideoStep
                    onDone={() => setSuccessOpen(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Gender bottom sheet */}
      <AnimatePresence>
        {genderSheetOpen && (
          <GenderSheet
            value={gender}
            onSelect={(v) => { setGender(v); setGenderSheetOpen(false); }}
            onClose={() => setGenderSheetOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* DoB wheel picker */}
      <DobWheelPicker
        open={dobSheetOpen}
        value={dob}
        onClose={() => setDobSheetOpen(false)}
        onSelect={(iso) => { setDob(iso); setDobSheetOpen(false); }}
      />

      {/* Address picker */}
      <AddressPicker
        open={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
        onSelect={(a: AddressResult) => { setAddress(a.full); setAddressSheetOpen(false); }}
      />

      {/* Language switcher */}
      <LanguageSheet
        open={langSheetOpen}
        value={lang}
        onSelect={(l) => { setLang(l); setLangSheetOpen(false); }}
        onClose={() => setLangSheetOpen(false)}
      />

      <SuccessOverlay
        open={successOpen}
        name={`${firstName} ${lastName}`.trim() || "Friend"}
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
      type="button"
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

function FieldShell({ Icon, children }: { Icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 px-4 py-3.5 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.45)]">
      {Icon && (
        <span className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
          <Icon className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
        </span>
      )}
      {children}
    </div>
  );
}

// ============================================================
// Step 1: Phone
// ============================================================
function PhoneStep({ initialDigits, onChangeDigits, isTestNumber, sending, error, onSubmit }: {
  initialDigits: string;
  onChangeDigits: (v: string) => void;
  isTestNumber: boolean;
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
      {isTestNumber && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center shadow-sm">
          <p className="text-[11px] font-display font-bold uppercase tracking-[0.18em] text-emerald-700">
            ✓ Test number
          </p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-800">
            Test account use this number · OTP automatic verify hoga
          </p>
        </div>
      )}
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <NextButton disabled={d.length !== 10 || sending} label={sending ? "Sending OTP…" : "Send OTP"} onClick={() => onSubmit(d)} />
    </div>
  );
}

// ============================================================
// Step 2: OTP
// ============================================================
function OtpStep({ phone, otp, isTestNumber, onOtp, seconds, onResend, onPaste, verifying, onVerify, onEdit }: {
  phone: string;
  otp: string;
  isTestNumber: boolean;
  onOtp: (v: string) => void;
  seconds: number;
  onResend: () => void;
  onPaste: () => void;
  verifying: boolean;
  onVerify: () => void;
  onEdit: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 320);
  }, []);
  const boxCount = otp.length > 4 ? 6 : 4;
  const ready = (otp.length === 4 || otp.length === 6) && !verifying;
  return (
    <div>
      <StepHeader Icon={KeyRound} title="Enter OTP" subtitle={isTestNumber ? "Test number · auto verification" : "Auto-detect or paste from SMS"} />
      <button
        type="button"
        onClick={onEdit}
        disabled={verifying}
        aria-label="Edit mobile number"
        className="mb-4 mx-auto flex items-center gap-2 rounded-full border border-[color:oklch(0.78_0.14_82/0.5)] bg-white/80 px-4 py-1.5 shadow-sm active:scale-[0.97] transition disabled:opacity-50"
      >
        <span className="text-sm font-semibold tabular-nums tracking-wide text-[color:oklch(0.30_0.05_85)]" style={{ fontFeatureSettings: '"tnum"' }}>
          {phone}
        </span>
        <Pencil className="h-3.5 w-3.5 text-[color:oklch(0.55_0.10_82)]" strokeWidth={2.4} />
      </button>

      {isTestNumber && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center shadow-sm">
          <p className="text-[11px] font-display font-bold uppercase tracking-[0.18em] text-emerald-700">
            ✓ Test number
          </p>
          <p className="mt-0.5 text-xs font-semibold text-emerald-800">
            Test account use this number · OTP auto verified
          </p>
        </div>
      )}

      <div className="relative mx-auto w-fit">
        <input
          ref={ref}
          value={otp}
          onChange={(e) => onOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter" && ready) onVerify(); }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          disabled={verifying}
          aria-label="OTP code"
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text tracking-[1.5em]"
        />
        <div className="flex items-center gap-3 pointer-events-none">
          {Array.from({ length: boxCount }).map((_, i) => (
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
          type="button"
          onClick={onResend}
          disabled={seconds > 0}
          className="text-[color:oklch(0.45_0.10_82)] underline disabled:opacity-50 disabled:no-underline"
        >
          Resend OTP
        </button>
        <button
          type="button"
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
// Step 3: Registered page (first/last name, email, gender sheet, referral)
// ============================================================
function ProfileStep({
  phone,
  firstName, lastName, email, gender, dob, address, agreedTerms, referral, referralLocked,
  onFirstName, onLastName, onEmail, onOpenGender, onOpenDob, onOpenAddress, onToggleTerms,
  onReferral, submitting, onSubmit,
}: {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string | null;
  dob: string | null;
  address: string;
  agreedTerms: boolean;
  referral: string;
  referralLocked: boolean;
  onFirstName: (v: string) => void;
  onLastName: (v: string) => void;
  onEmail: (v: string) => void;
  onOpenGender: () => void;
  onOpenDob: () => void;
  onOpenAddress: () => void;
  onToggleTerms: () => void;
  onReferral: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const fnameRef = useRef<HTMLInputElement | null>(null);
  // Auto-focus first name once gender is picked (gating step satisfied)
  const prevGenderRef = useRef<string | null>(gender);
  useEffect(() => {
    if (!prevGenderRef.current && gender) {
      setTimeout(() => fnameRef.current?.focus(), 220);
    }
    prevGenderRef.current = gender;
  }, [gender]);

  const namesDisabled = !gender;
  const emailTrim = email.trim();
  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);

  // ── Email uniqueness check (debounced) ─────────────────────────────
  const [emailCheck, setEmailCheck] = useState<{
    status: "idle" | "checking" | "available" | "taken" | "error";
    ownerName?: string;
  }>({ status: "idle" });
  useEffect(() => {
    if (!emailFormatValid) { setEmailCheck({ status: "idle" }); return; }
    setEmailCheck({ status: "checking" });
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("check_customer_email_available", {
          _email: emailTrim,
          _phone: phone || undefined,
        });
        if (cancelled) return;
        if (error) { setEmailCheck({ status: "error" }); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.available) setEmailCheck({ status: "available" });
        else setEmailCheck({ status: "taken", ownerName: row?.owner_name || undefined });
      } catch {
        if (!cancelled) setEmailCheck({ status: "error" });
      }
    }, 500);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [emailTrim, emailFormatValid, phone]);

  // ── Referral lookup (debounced) ────────────────────────────────────
  const [referralCheck, setReferralCheck] = useState<{
    status: "idle" | "checking" | "valid" | "invalid";
    referrerName?: string;
  }>({ status: "idle" });
  useEffect(() => {
    const code = referral.trim().toUpperCase();
    if (!code) { setReferralCheck({ status: "idle" }); return; }
    if (code.length < 3) { setReferralCheck({ status: "invalid" }); return; }
    setReferralCheck({ status: "checking" });
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("lookup_referrer_by_code", { _code: code });
        if (cancelled) return;
        if (error) { setReferralCheck({ status: "invalid" }); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.valid) setReferralCheck({ status: "valid", referrerName: row?.referrer_name || undefined });
        else setReferralCheck({ status: "invalid" });
      } catch {
        if (!cancelled) setReferralCheck({ status: "invalid" });
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [referral]);

  const firstNameValid = firstName.trim().length >= 2;
  const lastNameValid = lastName.trim().length >= 1;

  const emailReady = emailFormatValid && emailCheck.status === "available";
  const referralReady = !referral.trim() || referralLocked || referralCheck.status === "valid";

  const ready =
    !!gender &&
    firstNameValid &&
    lastNameValid &&
    !!dob &&
    !!address.trim() &&
    emailReady &&
    referralReady &&
    agreedTerms;

  const dobLabel = useMemo(() => {
    if (!dob) return "";
    const [y, m, d] = dob.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d} ${months[Number(m) - 1]} ${y}`;
  }, [dob]);

  return (
    <div>
      <StepHeader Icon={UserCircle2} title="Registered page" subtitle="Apni basic details bharein" />

      {/* GATING: Gender FIRST */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[color:oklch(0.42_0.10_82)]">
          Step 1 · Gender
        </span>
        {!gender && (
          <span className="text-[10px] uppercase tracking-widest font-semibold text-red-600">
            Required
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenGender}
        className={`w-full rounded-2xl border-2 px-4 py-3.5 flex items-center gap-3 active:scale-[0.99] transition ${
          gender
            ? "border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90"
            : "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)] animate-pulse"
        }`}
      >
        <span className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
          <UserCircle2 className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
        </span>
        <span className={`flex-1 min-w-0 text-left text-base font-bold ${gender ? "text-[color:oklch(0.24_0.06_85)]" : "text-[color:oklch(0.30_0.10_82)]"}`}>
          {gender ? genderLabel(gender) : "Select your gender to begin"}
        </span>
        {gender && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        <ChevronDown className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" />
      </button>

      {/* First + Last name — DISABLED until gender picked */}
      <div className={`mt-3 grid grid-cols-2 gap-2 transition-opacity ${namesDisabled ? "opacity-45 pointer-events-none" : "opacity-100"}`}>
        <FieldShell>
          <input
            ref={fnameRef}
            value={firstName}
            onChange={(e) => onFirstName(e.target.value)}
            disabled={namesDisabled}
            inputMode="text"
            autoCapitalize="words"
            autoComplete="given-name"
            placeholder="First name"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-bold text-[color:oklch(0.22_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.6)] placeholder:font-normal"
          />
          {firstNameValid && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
        </FieldShell>
        <FieldShell>
          <input
            value={lastName}
            onChange={(e) => onLastName(e.target.value)}
            disabled={namesDisabled}
            inputMode="text"
            autoCapitalize="words"
            autoComplete="family-name"
            placeholder="Last name"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-bold text-[color:oklch(0.22_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.6)] placeholder:font-normal"
          />
          {lastNameValid && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
        </FieldShell>
      </div>

      {/* Email with live uniqueness + format validation */}
      <div className="mt-2.5">
        <FieldShell Icon={Mail}>
          <input
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            placeholder="Gmail address"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-bold text-[color:oklch(0.22_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.6)] placeholder:font-normal"
          />
          {emailTrim && !emailFormatValid && (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          )}
          {emailFormatValid && emailCheck.status === "checking" && (
            <Loader2 className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] animate-spin shrink-0" />
          )}
          {emailFormatValid && emailCheck.status === "available" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          {emailFormatValid && emailCheck.status === "taken" && (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          )}
        </FieldShell>
        {emailTrim && !emailFormatValid && (
          <p className="mt-1 text-[11px] text-red-600 pl-2 font-semibold">Please enter a valid email address</p>
        )}
        {emailFormatValid && emailCheck.status === "taken" && (
          <p className="mt-1 text-[11px] text-red-600 pl-2 font-semibold leading-snug">
            Email already registered{emailCheck.ownerName ? ` to ${emailCheck.ownerName}` : ""}. Please use a different email address.
          </p>
        )}
        {emailFormatValid && emailCheck.status === "available" && (
          <p className="mt-1 text-[11px] text-emerald-700 pl-2 font-semibold">Email available ✓</p>
        )}
      </div>

      {/* DoB */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={onOpenDob}
          className="w-full rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90 px-4 py-3.5 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.45)] active:scale-[0.99] transition"
        >
          <span className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
            <Calendar className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </span>
          <span className={`flex-1 min-w-0 text-left text-base font-bold ${dob ? "text-[color:oklch(0.22_0.06_85)]" : "text-[color:oklch(0.55_0.08_85/0.6)] font-normal"}`}>
            {dob ? dobLabel : "Date of birth"}
          </span>
          {dob && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          <ChevronDown className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" />
        </button>
      </div>

      {/* Address */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={onOpenAddress}
          className="w-full rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90 px-4 py-3.5 flex items-start gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.45)] active:scale-[0.99] transition text-left"
        >
          <span className="h-9 w-9 rounded-full grid place-items-center shrink-0" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
            <MapPin className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </span>
          <span className={`flex-1 min-w-0 text-base font-bold leading-snug ${address ? "text-[color:oklch(0.22_0.06_85)]" : "text-[color:oklch(0.55_0.08_85/0.6)] font-normal"}`}>
            {address || "Add delivery address"}
          </span>
          {address && <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />}
          <ChevronDown className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] mt-1" />
        </button>
      </div>

      {/* Referral with live lookup */}
      <div className="mt-2.5">
        {referralLocked ? (
          <div className="rounded-2xl border-2 border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] px-4 py-3 flex items-center gap-3 shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]">
            <span className="h-9 w-9 rounded-full grid place-items-center bg-white/70">
              <Gift className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-[color:oklch(0.45_0.10_82)] font-bold">Referral applied</div>
              <div className="font-display text-base font-bold text-[color:oklch(0.22_0.06_85)] truncate">{referral}</div>
              {referralCheck.status === "valid" && referralCheck.referrerName && (
                <div className="text-[11px] font-semibold text-emerald-700 truncate">Referred by: {referralCheck.referrerName}</div>
              )}
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>
        ) : (
          <>
            <FieldShell Icon={Gift}>
              <input
                value={referral}
                onChange={(e) => onReferral(e.target.value.toUpperCase())}
                inputMode="text"
                autoCapitalize="characters"
                placeholder="Referral code (optional)"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-bold text-[color:oklch(0.22_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)] placeholder:font-normal uppercase tracking-wider"
              />
              {referral.trim() && (
                <button
                  type="button"
                  onClick={() => onReferral("")}
                  aria-label="Clear referral code"
                  className="h-7 w-7 rounded-full bg-[color:oklch(0.92_0.06_82)] grid place-items-center text-[color:oklch(0.38_0.10_82)] active:scale-95 shrink-0"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
              )}
              {referral.trim() && referralCheck.status === "checking" && (
                <Loader2 className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] animate-spin shrink-0" />
              )}
              {referral.trim() && referralCheck.status === "valid" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              {referral.trim() && referralCheck.status === "invalid" && (
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              )}
            </FieldShell>
            {referral.trim() && referralCheck.status === "valid" && referralCheck.referrerName && (
              <p className="mt-1 text-[11px] text-emerald-700 pl-2 font-semibold">Referral code applied! Valid for {referralCheck.referrerName}.</p>
            )}
            {referral.trim() && referralCheck.status === "invalid" && (
              <p className="mt-1 text-[11px] text-red-600 pl-2 font-semibold">Referral code not found</p>
            )}
          </>
        )}
      </div>

      {/* Terms */}
      <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
        <span
          onClick={(e) => { e.preventDefault(); onToggleTerms(); }}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 grid place-items-center transition ${
            agreedTerms
              ? "bg-gradient-to-br from-[#d4af37] to-[#8b6508] border-[#8b6508]"
              : "border-[color:oklch(0.78_0.14_82)] bg-white"
          }`}
        >
          {agreedTerms && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </span>
        <input type="checkbox" checked={agreedTerms} onChange={onToggleTerms} className="sr-only" />
        <span className="text-[12px] text-[color:oklch(0.26_0.06_85)] font-semibold leading-snug">
          I agree to the{" "}
          <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="underline text-[color:oklch(0.40_0.12_82)]">terms</a>{" "}
          &amp;{" "}
          <a href="/privacy-policy" target="_blank" rel="noreferrer" className="underline text-[color:oklch(0.40_0.12_82)]">privacy policy</a>.
        </span>
      </label>

      <NextButton disabled={!ready || submitting} label={submitting ? "Registering…" : "Submit & continue"} icon={false} onClick={onSubmit} />
    </div>
  );
}


// ============================================================
// Step 4: Welcome video + privacy + Thank you
// ============================================================
function WelcomeVideoStep({ onDone }: { onDone: () => void }) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "welcome_video")
          .maybeSingle();
        if (cancelled) return;
        const v = (data?.value ?? {}) as { video_url?: string; message?: string };
        setVideoUrl(v.video_url ?? "");
        setMessage(v.message ?? "Welcome to Karo Online — let's get started!");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => { /* ignore */ }); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const onTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress(Math.min(100, (el.currentTime / el.duration) * 100));
  };

  return (
    <div>
      <div className="mb-3 text-center">
        <h2
          className="font-display text-xl font-bold text-gold-gradient"
          style={{ textDecoration: "underline", textDecorationColor: "rgba(212,175,55,0.55)", textUnderlineOffset: 4 }}
        >
          Welcome aboard
        </h2>
        {message && <p className="text-[11px] text-[color:oklch(0.50_0.08_85)] mt-1 italic">{message}</p>}
      </div>

      {/* Video card */}
      <div
        className="relative aspect-[9/12] w-full rounded-2xl overflow-hidden bg-black/85"
        style={{ boxShadow: "0 12px 30px -10px rgba(212,175,55,0.45)" }}
      >
        {loading ? (
          <div className="absolute inset-0 grid place-items-center text-[#f5d97a] text-xs">Loading…</div>
        ) : videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted={muted}
              onTimeUpdate={onTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              className="h-full w-full object-cover"
            />
            {!playing && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 grid place-items-center bg-black/30 active:bg-black/40"
                aria-label="Play"
              >
                <span className="h-16 w-16 rounded-full bg-white/85 grid place-items-center shadow-lg">
                  <Play className="h-7 w-7 text-[color:oklch(0.30_0.10_82)] fill-current ml-1" />
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/45 backdrop-blur grid place-items-center text-white active:scale-95"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </>
        ) : (
          // Graceful fallback when no welcome video is configured
          <div
            className="absolute inset-0 grid place-items-center text-center px-6"
            style={{
              background: "linear-gradient(160deg,#fff8dc 0%,#f5d97a 55%,#d4af37 100%)",
            }}
          >
            <div>
              <p className="font-display text-2xl font-bold text-[color:oklch(0.22_0.10_82)]">
                Welcome to Karo Online
              </p>
              <p className="mt-2 text-xs text-[color:oklch(0.32_0.10_82)] italic">
                Your premium services partner
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-[color:oklch(0.78_0.14_82/0.25)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37] to-[#8b6508] transition-all"
          style={{ width: `${videoUrl ? progress : 100}%` }}
        />
      </div>

      {/* Privacy policy checkbox */}
      <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
        <span
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 grid place-items-center transition ${
            agreed
              ? "bg-gradient-to-br from-[#d4af37] to-[#8b6508] border-[#8b6508]"
              : "border-[color:oklch(0.78_0.14_82)] bg-white"
          }`}
          onClick={() => setAgreed((v) => !v)}
        >
          {agreed && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </span>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="sr-only"
        />
        <span className="text-[12px] text-[color:oklch(0.32_0.08_85)] font-medium leading-snug">
          I agree to the <span className="underline text-[color:oklch(0.42_0.12_82)]">privacy policy</span> &amp; <span className="underline text-[color:oklch(0.42_0.12_82)]">terms</span>
        </span>
      </label>

      <NextButton
        disabled={!agreed}
        label="Thank you"
        icon={false}
        onClick={onDone}
      />
    </div>
  );
}

// ============================================================
// Gender bottom sheet
// ============================================================
function GenderSheet({ value, onSelect, onClose }: {
  value: string | null;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-md"
      >
        <div
          className="rounded-t-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(180deg,#fffdf5 0%,#fbf3d9 100%)",
            boxShadow: "0 -22px 60px -16px rgba(212,175,55,0.55)",
          }}
        >
          <div className="pt-3 pb-1 grid place-items-center">
            <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
          </div>
          <div className="px-6 pt-3 pb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-gold-gradient">Select gender</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 rounded-full grid place-items-center bg-white/70 active:scale-95"
            >
              <X className="h-4 w-4 text-[color:oklch(0.45_0.10_82)]" />
            </button>
          </div>
          <div className="px-6 pb-7 pt-2 space-y-2">
            {GENDER_CHIPS.map((g) => {
              const active = value === g.value;
              return (
                <button
                  type="button"
                  key={g.value}
                  onClick={() => onSelect(g.value)}
                  className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition active:scale-[0.99] ${
                    active
                      ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]"
                      : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/85"
                  }`}
                >
                  <img src={g.icon} alt="" className="h-10 w-10 object-contain" />
                  <span className="flex-1 text-left font-display text-base font-bold text-[color:oklch(0.30_0.10_82)]">
                    {g.label}
                  </span>
                  {active && <Check className="h-5 w-5 text-emerald-700" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Unused exports kept to avoid breaking imports elsewhere
export const __noop = () => {};
const _Unused: React.FC = () => <X className="hidden" />;
void _Unused;
