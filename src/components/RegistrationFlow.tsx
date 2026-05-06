import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Sun, User, Phone, ShieldCheck, Mail, MapPin, UserCheck, Gift, QrCode, CheckCircle2 } from "lucide-react";
import { motion, useMotionValue, animate } from "framer-motion";
import { LuxPicker, type PickerOption } from "@/components/LuxPicker";
import { AddressPicker, type AddressResult } from "@/components/AddressPicker";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";

import goldSimJio from "@/assets/gold-sim-jio.png";
import goldSimAirtel from "@/assets/gold-sim-airtel.png";
import goldWhatsapp from "@/assets/gold-whatsapp.png";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Stage A = phone + OTP only. Stage B = full signup progress. */
type Stage = "auth" | "signup";
type StepKey = "name" | "email" | "address" | "manager" | "referral";
const STEP_ORDER: StepKey[] = ["name", "email", "address", "manager", "referral"];
export const CUSTOMER_ONBOARDED_KEY = "ko-customer-onboarded";

const CUSTOMER_DRAFT_KEY = "ko-customer-registration-draft";

type CustomerDraft = {
  gender?: string | null;
  name?: string;
  operator?: string | null;
  phone?: string;
  phoneVerified?: boolean;
  email?: string;
  address?: string;
  manager?: string | null;
  referral?: string;
  referralVerified?: boolean;
  agreed?: boolean;
};

const readCustomerDraft = (): CustomerDraft => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CUSTOMER_DRAFT_KEY) || "{}") as CustomerDraft;
  } catch {
    return {};
  }
};

const GENDER_OPTIONS: PickerOption[] = [
  { value: "male", label: "Male", sub: "His Highness", icon: goldMale },
  { value: "female", label: "Female", sub: "Her Ladyship", icon: goldFemale },
  { value: "other", label: "Other", sub: "Beyond labels", icon: goldOther },
];

const SIM_OPTIONS: (PickerOption & { number: string })[] = [
  { value: "jio", label: "Jio · SIM 1", sub: "+91 89 2847 6391", number: "+91 89284 76391", icon: goldSimJio },
  { value: "airtel", label: "Airtel · SIM 2", sub: "+91 98 1156 7204", number: "+91 98115 67204", icon: goldSimAirtel },
  { value: "manual", label: "Other · Manual", sub: "Type number yourself", number: "", icon: goldOther },
];

const MANAGER_OPTIONS: (PickerOption & { rating: number; vendors: number })[] = [
  { value: "aryan", label: "Aryan Sharma", sub: "Karol Bagh · 1.2 km", rating: 4.8, vendors: 142, icon: goldMale },
  { value: "priya", label: "Priya Verma", sub: "Old Delhi · 2.1 km", rating: 4.7, vendors: 98, icon: goldFemale },
  { value: "rahul", label: "Rahul Mehta", sub: "Patel Nagar · 3.4 km", rating: 4.6, vendors: 76, icon: goldMale },
  { value: "neha", label: "Neha Singh", sub: "Rajouri · 4.0 km", rating: 4.9, vendors: 184, icon: goldFemale },
];

const _UNUSED_EMAIL_OPTIONS_REMOVED = true;

export type RegistrationFlowProps = {
  /** When true, the outer page background is omitted so caller can show its own (e.g. translucent overlay). */
  transparent?: boolean;
  /** Hide the back/close arrow in the top-left. */
  hideBack?: boolean;
  /** Called when user clicks the back arrow (only if hideBack is false). */
  onBack?: () => void;
  /** Called after success overlay finishes. */
  onComplete?: () => void;
};

export function RegistrationFlow({ transparent, hideBack, onBack, onComplete }: RegistrationFlowProps) {
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const draft = useMemo(readCustomerDraft, []);
  const [googleBusy, setGoogleBusy] = useState(false);

  const [stage, setStage] = useState<Stage>(draft.phoneVerified ? "signup" : "auth");

  // Profile fields
  const [agreed, setAgreed] = useState(!!draft.agreed);
  const [gender, setGender] = useState<string | null>(draft.gender ?? null);
  const [name, setName] = useState(draft.name ?? "");
  const [operator, setOperator] = useState<string | null>(draft.operator ?? null);
  const [phone, setPhone] = useState(draft.phone ?? "");
  const [phoneVerified, setPhoneVerified] = useState(!!draft.phoneVerified);
  const [email, setEmail] = useState(draft.email ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [manager, setManager] = useState<string | null>(draft.manager ?? null);
  const [referral, setReferral] = useState<string>(() => {
    if (draft.referral) return draft.referral;
    if (typeof window !== "undefined") {
      const url = new URLSearchParams(window.location.search);
      return url.get("ref") || url.get("referral") || "";
    }
    return "";
  });
  const [referralVerified, setReferralVerified] = useState(!!draft.referralVerified);

  const [picker, setPicker] = useState<null | "gender" | "sim" | "manager">(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Inline OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [otpSeconds, setOtpSeconds] = useState(45);
  const [lookupBusy, setLookupBusy] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Prefill email/name from Google session
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const metaName = meta?.full_name || meta?.name;
    if (metaName && !name) setName(metaName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [vh, setVh] = useState(800);
  // Auth stage = compact peek; signup stage = larger
  const SNAP_AUTH = vh * 0.55;
  const SNAP_AUTH_OTP = vh * 0.42;
  const SNAP_SIGNUP_HALF = vh * 0.25;
  const SNAP_SIGNUP_FULL = vh * 0.06;

  const y = useMotionValue(SNAP_AUTH);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const snapTo = (target: number) => {
    animate(y, target, { type: "spring", stiffness: 260, damping: 30 });
  };

  // Snap based on stage and progress
  useEffect(() => {
    if (stage === "auth") {
      snapTo(phone ? SNAP_AUTH_OTP : SNAP_AUTH);
    } else {
      snapTo(SNAP_SIGNUP_FULL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, phone, vh]);

  const reachedStep = useMemo<StepKey>(() => {
    if (!name.trim()) return "name";
    if (!email.trim()) return "email";
    if (!address.trim()) return "address";
    if (!manager) return "manager";
    return "referral";
  }, [name, email, address, manager]);

  const visibleSteps = useMemo(() => {
    const idx = STEP_ORDER.indexOf(reachedStep);
    return STEP_ORDER.slice(0, idx + 1);
  }, [reachedStep]);

  const operatorMeta = SIM_OPTIONS.find((o) => o.value === operator);
  const managerMeta = MANAGER_OPTIONS.find((m) => m.value === manager);

  // Persist draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: CustomerDraft = {
      gender, name, operator, phone, phoneVerified, email, address, manager, referral, referralVerified, agreed,
    };
    window.localStorage.setItem(CUSTOMER_DRAFT_KEY, JSON.stringify(payload));
  }, [address, agreed, email, gender, name, operator, phone, phoneVerified, manager, referral, referralVerified]);

  // After OTP verified → check if mobile already registered
  const handlePhoneVerified = async () => {
    setPhoneVerified(true);
    setLookupBusy(true);
    try {
      const { data, error } = await supabase.rpc("lookup_customer_by_phone", { _phone: phone });
      if (isAuthenticated && !error && data && data.length > 0) {
        const row = data[0] as { name: string | null; gender: string | null; email: string | null; address: string | null };
        // Already registered → auto login & complete
        if (row.name) setName(row.name);
        if (row.gender) setGender(row.gender);
        if (row.email) setEmail(row.email);
        if (row.address) setAddress(row.address);
        toast.success(`Welcome back${row.name ? ", " + row.name : ""}!`);
        window.localStorage.setItem(CUSTOMER_ONBOARDED_KEY, "true");
        window.localStorage.removeItem(CUSTOMER_DRAFT_KEY);
        await refreshProfile();
        setTimeout(() => onComplete?.(), 800);
        return;
      }
    } catch (e) {
      console.error("[lookup_customer_by_phone]", e);
    } finally {
      setLookupBusy(false);
    }
    // New user → move to signup progress
    setTimeout(() => {
      setStage("signup");
      setTimeout(() => nameInputRef.current?.focus(), 350);
    }, 600);
  };

  useEffect(() => {
    if (stage === "signup" && phoneVerified && !name) {
      setTimeout(() => nameInputRef.current?.focus(), 250);
    }
  }, [stage, phoneVerified, name]);

  const startInlineOtp = () => {
    setOtpDigits(["", "", "", ""]);
    setOtpSeconds(45);
    const AUTO = "4829";
    let i = 0;
    const fill = () => {
      if (i >= AUTO.length) {
        setTimeout(handlePhoneVerified, 500);
        return;
      }
      setOtpDigits((prev) => {
        const next = [...prev];
        next[i] = AUTO[i];
        return next;
      });
      i++;
      setTimeout(fill, 280);
    };
    setTimeout(fill, 1500);
  };

  const handleSimSelect = (value: string) => {
    const sim = SIM_OPTIONS.find((s) => s.value === value);
    if (!sim) return;
    setOperator(value);
    setPicker(null);
    if (value === "manual") {
      setPhone("");
      setTimeout(() => {
        const v = window.prompt("Apna 10-digit mobile number daaliye");
        if (v && v.replace(/\D/g, "").length >= 10) {
          const digits = v.replace(/\D/g, "").slice(-10);
          setPhone("+91 " + digits.slice(0, 5) + " " + digits.slice(5));
          setTimeout(startInlineOtp, 400);
        }
      }, 250);
      return;
    }
    setPhone(sim.number);
    setTimeout(startInlineOtp, 600);
  };

  // OTP timer
  useEffect(() => {
    if (!phone || phoneVerified || otpSeconds <= 0) return;
    const t = setTimeout(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phone, phoneVerified, otpSeconds]);

  // Auto-verify when 4 digits manually entered
  useEffect(() => {
    if (phoneVerified) return;
    if (otpDigits.every((d) => d !== "") && otpDigits.join("").length === 4) {
      setTimeout(handlePhoneVerified, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpDigits, phoneVerified]);

  const handleOtpChange = (idx: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 3) otpRefs.current[idx + 1]?.focus();
  };

  const handleResendOtp = () => {
    setOtpSeconds(45);
    setOtpDigits(["", "", "", ""]);
    toast.success("OTP resent");
    startInlineOtp();
  };

  const handleReferralVerify = (code: string) => {
    const c = code.trim();
    setReferral(c);
    if (c.length >= 4) setTimeout(() => setReferralVerified(true), 600);
    else setReferralVerified(false);
  };

  const handleFinish = async () => {
    if (user) {
      const { error } = await supabase
        .from("customers")
        .upsert(
          {
            user_id: user.id,
            name: name.trim() || null,
            gender: gender || null,
            phone: phone || null,
            email: email || user.email || null,
            address: address || null,
          },
          { onConflict: "user_id" },
        );
      if (error) {
        console.error("[customers upsert]", error);
        toast.error("Profile save fail hua — phir try karo");
      } else {
        window.localStorage.setItem(CUSTOMER_ONBOARDED_KEY, "true");
        window.localStorage.removeItem(CUSTOMER_DRAFT_KEY);
        await refreshProfile();
      }
    } else {
      toast.error("Pehle Gmail se login karein — tabhi request real vendor tak jayegi.");
      return;
    }
    setSuccessOpen(false);
    onComplete?.();
  };

  const handleGoogleSignIn = async () => {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google");
      if (result.error) {
        toast.error("Google sign-in fail hua. Phir try karo.");
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Google account connected ✓");
    } catch (e) {
      console.error(e);
      toast.error("Google sign-in fail hua");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={
        transparent
          ? { background: "transparent" }
          : {
              background:
                "radial-gradient(ellipse at top, #fffaf0 0%, transparent 55%), radial-gradient(ellipse at bottom, #fdf6dd 0%, transparent 60%), linear-gradient(160deg, #fffdf5 0%, #fbf3d9 60%, #f5e9b8 100%)",
            }
      }
    >
      {!transparent && (
        <>
          <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.30),transparent_70%)] blur-2xl" />
          <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.10_92/0.35),transparent_70%)] blur-2xl" />
        </>
      )}

      {!hideBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/80 backdrop-blur-md border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center shadow-md"
          aria-label="Close"
        >
          <svg className="h-5 w-5 text-[color:oklch(0.42_0.10_82)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <motion.section
        style={{ y, height: vh }}
        className="absolute inset-x-0 top-0 z-20 will-change-transform"
      >
        <div
          className="relative h-full mx-auto max-w-md rounded-t-[32px] overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,253,245,0.92) 35%, rgba(251,243,217,0.94) 100%)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow:
              "0 -20px 60px -12px rgba(212,175,55,0.45), 0 0 0 1.5px rgba(255,255,255,0.7) inset",
          }}
        >
          <div className="pt-3 pb-1 grid place-items-center">
            <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37] shadow-[0_1px_4px_rgba(212,175,55,0.5)]" />
          </div>

          <div
            className="h-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain px-6 pb-32"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="text-center mb-3 pt-2">
              <h1
                className="font-display font-bold text-[28px] leading-none text-gold-gradient"
                style={{
                  textDecoration: "underline",
                  textDecorationColor: "rgba(212,175,55,0.6)",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "5px",
                }}
              >
                Karo <span className="font-light">|</span> Online
              </h1>
              <p className="mt-1.5 text-sm font-display italic text-[color:oklch(0.45_0.10_85)]">
                {stage === "auth"
                  ? phoneVerified
                    ? lookupBusy
                      ? "Checking your account…"
                      : "Verified ✓"
                    : phone
                      ? "Enter OTP"
                      : "Enter your mobile"
                  : "Complete your profile"}
              </p>
            </div>

            {/* === STAGE A: Phone + OTP only === */}
            {stage === "auth" && (
              <div className="space-y-3 mt-2">
                <GoldField
                  Icon={Phone}
                  label="Pick and enter mobile number"
                  hint={
                    operator
                      ? `${operatorMeta?.label} · auto-filled`
                      : phone
                        ? "Tap to change"
                        : "Tap → SIM 1 / SIM 2 / Manual"
                  }
                  value={phone}
                  placeholder=""
                  filled={phoneVerified}
                  readOnly
                  onClick={() => {
                    if (!phoneVerified) setPicker("sim");
                  }}
                />

                {phone && (
                  <div
                    className="relative flex items-start gap-3"
                    style={{ animation: "step-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}
                  >
                    <div className="relative flex flex-col items-center pt-3.5">
                      <div
                        className={`relative h-9 w-9 rounded-full grid place-items-center border-2 ${
                          phoneVerified ? "border-white" : "border-[color:oklch(0.78_0.14_82/0.4)]"
                        }`}
                        style={{
                          background: phoneVerified
                            ? "linear-gradient(135deg, #f5d97a 0%, #d4af37 50%, #8b6508 100%)"
                            : "linear-gradient(135deg, #fff8dc 0%, #f5e9b8 100%)",
                        }}
                      >
                        <ShieldCheck
                          className={phoneVerified ? "h-4 w-4 text-white" : "h-4 w-4 text-[color:oklch(0.42_0.10_82)]"}
                          strokeWidth={2.4}
                        />
                      </div>
                    </div>
                    <div className="flex-1 pt-1 pb-3">
                      <div className="rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.4)] bg-white/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-[color:oklch(0.50_0.10_82)] mb-2 text-center">
                          Enter your OTP
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          {[0, 1, 2, 3].map((i) => (
                            <input
                              key={i}
                              ref={(el) => { otpRefs.current[i] = el; }}
                              value={otpDigits[i]}
                              onChange={(e) => handleOtpChange(i, e.target.value)}
                              inputMode="numeric"
                              maxLength={1}
                              disabled={phoneVerified}
                              className={`h-14 w-12 text-center text-3xl font-display rounded-lg border-2 outline-none ${
                                phoneVerified
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                  : otpDigits[i]
                                  ? "border-[color:oklch(0.78_0.14_82)] bg-white text-[color:oklch(0.30_0.05_85)]"
                                  : "border-[color:oklch(0.78_0.14_82/0.35)] bg-white/80 text-[color:oklch(0.55_0.10_82)]"
                              }`}
                              placeholder=""
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={otpSeconds > 0 && !phoneVerified}
                            className="text-[color:oklch(0.45_0.10_82)] underline disabled:opacity-50 disabled:no-underline"
                          >
                            Resend OTP
                          </button>
                          <span className="text-[color:oklch(0.45_0.10_82)] tabular-nums">
                            {phoneVerified ? "Verified ✓" : `00:${String(otpSeconds).padStart(2, "0")}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === STAGE B: Full signup progress === */}
            {stage === "signup" && (
              <>
                <div className="space-y-1 relative">
                  {/* Phone summary chip (read-only) */}
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">{phone}</span>
                    <span className="text-emerald-600/70">· verified</span>
                  </div>

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

                  {visibleSteps.includes("email") && (
                    <GoldField
                      Icon={Mail}
                      label="Gmail account choice"
                      hint={
                        isAuthenticated
                          ? "Verified ✓"
                          : googleBusy
                            ? "Opening Google…"
                            : "Tap to sign in with Google"
                      }
                      value={email}
                      placeholder=""
                      filled={!!email.trim() && isAuthenticated}
                      readOnly
                      onClick={() => {
                        if (!isAuthenticated && !googleBusy) handleGoogleSignIn();
                      }}
                    />
                  )}

                  {visibleSteps.includes("address") && (
                    <GoldField
                      Icon={MapPin}
                      label="Choice location and address"
                      hint={address ? "Tap to change" : "Live location · or manual"}
                      value={address}
                      placeholder=""
                      filled={!!address.trim()}
                      readOnly
                      onClick={() => setAddressOpen(true)}
                    />
                  )}

                  {visibleSteps.includes("manager") && (
                    <GoldField
                      Icon={UserCheck}
                      label="Choice your manager relation"
                      hint={managerMeta ? `${managerMeta.label} · ★ ${managerMeta.rating}` : "Tap → choose nearby manager"}
                      value={managerMeta?.label ?? ""}
                      placeholder=""
                      filled={!!manager}
                      readOnly
                      onClick={() => setPicker("manager")}
                    />
                  )}

                  {visibleSteps.includes("referral") && (
                    <div
                      className="relative flex items-start gap-3"
                      style={{ animation: "step-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}
                    >
                      <div className="relative flex flex-col items-center pt-3.5">
                        <div
                          className={`relative h-9 w-9 rounded-full grid place-items-center border-2 ${
                            referralVerified ? "border-white" : "border-[color:oklch(0.78_0.14_82/0.4)]"
                          }`}
                          style={{
                            background: referralVerified
                              ? "linear-gradient(135deg, #f5d97a 0%, #d4af37 50%, #8b6508 100%)"
                              : "linear-gradient(135deg, #fff8dc 0%, #f5e9b8 100%)",
                          }}
                        >
                          <Gift
                            className={referralVerified ? "h-4 w-4 text-white" : "h-4 w-4 text-[color:oklch(0.42_0.10_82)]"}
                            strokeWidth={2.4}
                          />
                        </div>
                      </div>
                      <div className="flex-1 pt-2 pb-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={referral}
                            onChange={(e) => handleReferralVerify(e.target.value)}
                            placeholder="Enter your referral code"
                            className="flex-1 bg-transparent border-0 text-[15px] font-medium text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.45_0.08_85/0.7)] outline-none py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => setScannerOpen(true)}
                            className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border border-[color:oklch(0.78_0.14_82/0.6)] grid place-items-center"
                            aria-label="Scan QR"
                          >
                            <QrCode className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
                          </button>
                        </div>
                        <div
                          className="h-px w-full"
                          style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.7) 0%, rgba(212,175,55,0.3) 100%)" }}
                        />
                        <p className="text-[10px] mt-1 italic flex items-center gap-1">
                          {referralVerified ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Aryan verified
                            </span>
                          ) : (
                            <span className="text-[color:oklch(0.50_0.08_85/0.85)]">
                              Optional · scan QR or paste code
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {visibleSteps.includes("referral") && (
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
                      Tram and condition privacy<br />policy review and accept
                    </span>
                  </label>
                )}

                {visibleSteps.includes("referral") && agreed && (
                  <button
                    onClick={() => setSuccessOpen(true)}
                    className="btn-3d mt-5 w-full rounded-2xl py-3.5 font-display font-bold text-xl tracking-wide flex items-center justify-center gap-3 text-[color:oklch(0.18_0.06_18)]"
                    style={{
                      background:
                        "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
                      boxShadow:
                        "0 8px 24px -6px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
                      animation: "breathe 2.6s ease-in-out infinite",
                    }}
                  >
                    <img src={goldWhatsapp} alt="" className="h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                    <span>Thanks for you</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.section>

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
        open={picker === "manager"}
        title="Choose Your Relation Manager"
        subtitle="Nearby · ratings · vendors handled"
        options={MANAGER_OPTIONS}
        onSelect={(v) => { setManager(v); setPicker(null); }}
        onClose={() => setPicker(null)}
      />

      {scannerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center">
            <QrCode className="h-12 w-12 mx-auto text-[color:oklch(0.42_0.10_82)]" />
            <h3 className="font-display text-lg mt-3">Scan referral QR</h3>
            <p className="text-xs text-muted-foreground mt-1">Point camera at QR — auto-fills code</p>
            <button
              onClick={() => {
                handleReferralVerify("ARYAN500");
                setScannerOpen(false);
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-br from-[#f5d97a] to-[#d4af37] font-bold text-[color:oklch(0.18_0.06_18)]"
            >
              Simulate scan
            </button>
            <button
              onClick={() => setScannerOpen(false)}
              className="mt-2 w-full py-2 text-xs uppercase tracking-widest text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
        onDone={handleFinish}
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
      <div className="relative flex flex-col items-center pt-3.5">
        <div
          className={`relative h-9 w-9 rounded-full grid place-items-center border-2 transition-all ${
            filled ? "border-white" : "border-[color:oklch(0.78_0.14_82/0.4)]"
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
