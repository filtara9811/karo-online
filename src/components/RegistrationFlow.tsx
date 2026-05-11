import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Phone, Mail, MapPin, UserCheck, Gift, QrCode, ArrowRight, ShieldCheck,
  KeyRound, UserCircle2, ChevronRight, Locate, X, Star, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import goldMale from "@/assets/gold-male.png";
import goldFemale from "@/assets/gold-female.png";
import goldOther from "@/assets/gold-other.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarUser from "@/assets/avatar-user.png";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { finalizeCustomerRegistration, sendOtp, verifyOtp } from "@/lib/otp.functions";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const CUSTOMER_ONBOARDED_KEY = "ko-customer-onboarded";
const CUSTOMER_DRAFT_KEY = "ko-customer-registration-draft-v3";

type CustomerDraft = {
  step?: Step;
  gender?: string | null;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  pincode?: string;
  manager?: string | null;
  referral?: string;
  agreed?: boolean;
};

const readDraft = (): CustomerDraft => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(CUSTOMER_DRAFT_KEY) || "{}"); } catch { return {}; }
};

const formatIndianMobile = (digits: string) => "+91 " + digits.slice(0, 5) + " " + digits.slice(5);

type Manager = { value: string; name: string; area: string; rating: number; vendors: number; customers: number; reviews: number; avatar: string };
const MANAGERS: Manager[] = [
  { value: "aryan", name: "Aryan Sharma", area: "Karol Bagh · 1.2 km", rating: 4.8, vendors: 142, customers: 980, reviews: 312, avatar: avatarAryan },
  { value: "priya", name: "Priya Verma", area: "Old Delhi · 2.1 km", rating: 4.7, vendors: 98, customers: 740, reviews: 245, avatar: avatarRani },
  { value: "rahul", name: "Rahul Mehta", area: "Patel Nagar · 3.4 km", rating: 4.6, vendors: 76, customers: 510, reviews: 198, avatar: avatarRaj },
  { value: "neha", name: "Neha Singh", area: "Rajouri · 4.0 km", rating: 4.9, vendors: 184, customers: 1240, reviews: 402, avatar: avatarUser },
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

export function RegistrationFlow({ transparent, onBack, onComplete }: RegistrationFlowProps) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const draft = useMemo(readDraft, []);

  const [step, setStep] = useState<Step>(draft.step ?? 1);

  const [phone, setPhone] = useState(draft.phone ?? "");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [gender, setGender] = useState<string | null>(draft.gender ?? null);
  const [name, setName] = useState(draft.name ?? "");
  const [email, setEmail] = useState(draft.email ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [pincode, setPincode] = useState(draft.pincode ?? "");
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

  const [otp, setOtp] = useState("");
  const [otpSeconds, setOtpSeconds] = useState(45);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [genderSheet, setGenderSheet] = useState(false);
  const [emailSheet, setEmailSheet] = useState(false);
  const [managerSheet, setManagerSheet] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);
  const finalizeCustomerFn = useServerFn(finalizeCustomerRegistration);

  // Prefill from session
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const metaName = meta?.full_name || meta?.name;
    if (metaName && !name) setName(metaName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist draft (resume on reopen)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMER_DRAFT_KEY, JSON.stringify({
      step, gender, name, phone, email, address, pincode, manager, referral, agreed,
    }));
  }, [step, gender, name, phone, email, address, pincode, manager, referral, agreed]);

  // OTP timer
  useEffect(() => {
    if (step !== 2 || otpSeconds <= 0) return;
    const t = setTimeout(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, otpSeconds]);

  const goNext = (target: Step) => setStep(target);

  // Auto-verify OTP when 4 digits
  useEffect(() => {
    if (step !== 2 || otp.length !== 4 || otpVerifying) return;
    handleOtpVerify(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  // === Step 1 send OTP ===
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
      // Lookup existing
      try {
        const { data, error } = await supabase.rpc("lookup_customer_by_phone", { _phone: phone });
        if (!error && data && data.length > 0) {
          const row = data[0] as { name: string | null; gender: string | null; email: string | null; address: string | null };
          if (row.name) setName(row.name);
          if (row.gender) setGender(row.gender);
          if (row.email) setEmail(row.email);
          if (row.address) setAddress(row.address);
          if (row.name && row.address) {
            toast.success(`Welcome back, ${row.name}`);
            await finalizeNow({
              name: row.name,
              gender: row.gender ?? "",
              email: row.email ?? "",
              address: row.address,
            });
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

  // === Final save ===
  const finalizeNow = async (override?: { name: string; gender: string; email: string; address: string }) => {
    if (finalizing) return;
    setFinalizing(true);
    try {
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
      try {
        const { applyPendingReferralCode } = await import("@/hooks/use-referral");
        await applyPendingReferralCode();
      } catch { /* ignore */ }
      // Show success → user clicks Home
      setSuccessOpen(true);
    } finally {
      setFinalizing(false);
    }
  };

  const handleSuccessHome = () => {
    setSuccessOpen(false);
    onComplete?.();
    try { navigate({ to: "/quick" }); } catch { /* ignore */ }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    toast.message("Detecting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setAddress(`Detected · ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        toast.success("Location detected");
      },
      () => toast.error("Allow location access in browser"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const managerMeta = MANAGERS.find((m) => m.value === manager);

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

          {/* Centered step pill (no back/X — flow only goes forward) */}
          <div className="px-5 pt-1 flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
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
            Step {step} / 7
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
                  />
                )}
                {step === 3 && (
                  <NameStep
                    name={name}
                    gender={gender}
                    onName={setName}
                    onGenderClick={() => setGenderSheet(true)}
                    onNext={() => name.trim() && gender && goNext(4)}
                  />
                )}
                {step === 4 && (
                  <EmailStep
                    email={email}
                    onEmail={setEmail}
                    onPick={() => setEmailSheet(true)}
                    onNext={() => /^\S+@\S+\.\S+$/.test(email) && goNext(5)}
                  />
                )}
                {step === 5 && (
                  <AddressStep
                    address={address}
                    pincode={pincode}
                    onPincode={(v) => {
                      setPincode(v);
                      if (v.length === 6) setAddress((a) => a || `Pincode ${v}`);
                    }}
                    onAddress={setAddress}
                    onAllow={detectLocation}
                    onSkip={() => goNext(6)}
                    onNext={() => goNext(6)}
                  />
                )}
                {step === 6 && (
                  <ManagerStep
                    manager={managerMeta}
                    onOpenPicker={() => setManagerSheet(true)}
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
                    submitting={finalizing}
                    onSubmit={() => finalizeNow()}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Gender sheet — vertical list */}
      <BottomSheet open={genderSheet} title="Choose Gender" subtitle="Helps personalise your experience" onClose={() => setGenderSheet(false)}>
        <div className="flex flex-col gap-2.5 mt-2">
          {GENDER_CHIPS.map((g) => (
            <button
              key={g.value}
              onClick={() => { setGender(g.value); setGenderSheet(false); }}
              className={`w-full flex items-center gap-4 rounded-2xl border-2 px-4 py-4 transition-all active:scale-[0.99] ${
                gender === g.value
                  ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.6)]"
                  : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/85"
              }`}
            >
              <span className="h-14 w-14 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-2 border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_4px_10px_-3px_rgba(212,175,55,0.5)] flex-shrink-0">
                <img src={g.icon} alt="" className="h-10 w-10 object-contain" />
              </span>
              <span className="flex-1 text-left font-display text-lg font-bold text-[color:oklch(0.28_0.06_85)]">{g.label}</span>
              {gender === g.value ? (
                <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b6508] grid place-items-center text-white text-xs">✓</span>
              ) : (
                <ChevronRight className="h-5 w-5 text-[color:oklch(0.50_0.10_82)]" />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Email picker sheet */}
      <BottomSheet open={emailSheet} title="Choose Email" subtitle="Pick from your accounts" onClose={() => setEmailSheet(false)}>
        <div className="space-y-2.5 mt-2">
          {user?.email && (
            <button
              onClick={() => { setEmail(user.email!); setEmailSheet(false); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.45)] bg-white/85 active:scale-[0.99]"
            >
              <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] grid place-items-center font-bold text-[color:oklch(0.30_0.10_82)]">
                {user.email[0].toUpperCase()}
              </span>
              <div className="flex-1 text-left">
                <div className="text-[10px] uppercase tracking-widest text-[color:oklch(0.50_0.10_82)]">Signed in</div>
                <div className="text-sm font-semibold text-[color:oklch(0.28_0.06_85)] truncate">{user.email}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-[color:oklch(0.50_0.10_82)]" />
            </button>
          )}
          <button
            onClick={() => setEmailSheet(false)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.4)] bg-white/60 active:scale-[0.99]"
          >
            <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] grid place-items-center">
              <Mail className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
            </span>
            <div className="flex-1 text-left text-sm font-semibold text-[color:oklch(0.32_0.06_85)]">Type manually</div>
            <ChevronRight className="h-4 w-4 text-[color:oklch(0.50_0.10_82)]" />
          </button>
        </div>
      </BottomSheet>

      {/* Manager sheet (premium profile cards) */}
      <BottomSheet open={managerSheet} title="Choose Your Relation Manager" subtitle="Top managers near you" onClose={() => setManagerSheet(false)}>
        <div className="space-y-2.5 mt-2 max-h-[420px] overflow-y-auto pb-2">
          {MANAGERS.map((m) => (
            <button
              key={m.value}
              onClick={() => { setManager(m.value); setManagerSheet(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                manager === m.value
                  ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a]"
                  : "border-[color:oklch(0.78_0.14_82/0.4)] bg-white/85"
              }`}
            >
              <div className="relative h-14 w-14 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-[0_4px_10px_-3px_rgba(212,175,55,0.55)]">
                <img src={m.avatar} alt={m.name} className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-display text-base font-bold text-[color:oklch(0.28_0.06_85)] leading-tight truncate">{m.name}</div>
                <div className="text-[11px] text-[color:oklch(0.50_0.08_85)] truncate">{m.area}</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[color:oklch(0.40_0.12_82)] bg-[color:oklch(0.95_0.06_85)] px-1.5 py-0.5 rounded">
                    <Star className="h-2.5 w-2.5 fill-current" /> {m.rating} ({m.reviews})
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[color:oklch(0.40_0.10_82)]">
                    <Users className="h-2.5 w-2.5" /> {m.vendors} vendors · {m.customers} cust.
                  </span>
                </div>
              </div>
              {manager === m.value ? (
                <span className="h-5 w-5 rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b6508] grid place-items-center text-white text-xs">✓</span>
              ) : (
                <ChevronRight className="h-4 w-4 text-[color:oklch(0.50_0.10_82)]" />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      {scannerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-6" onClick={() => setScannerOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
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

      <SuccessOverlay open={successOpen} name={name} ctaLabel="Open Services" onDone={handleSuccessHome} />
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

// Bottom sheet wrapper
function BottomSheet({ open, title, subtitle, children, onClose }: { open: boolean; title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <motion.button
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[oklch(0.10_0.03_85/0.55)] backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="relative w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-7"
            style={{
              background: "linear-gradient(180deg,rgba(255,255,255,0.98) 0%,rgba(251,243,217,0.98) 100%)",
              boxShadow: "0 -22px 60px -16px rgba(212,175,55,0.55), 0 0 0 1.5px rgba(255,255,255,0.7) inset",
            }}
          >
            <div className="grid place-items-center pb-2">
              <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
            </div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display text-xl font-bold text-gold-gradient leading-tight">{title}</h3>
                {subtitle && <p className="text-[11px] text-[color:oklch(0.50_0.08_85)] italic mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/80 border border-[color:oklch(0.78_0.14_82/0.4)] grid place-items-center">
                <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
  useEffect(() => { setTimeout(() => ref.current?.focus(), 320); }, []);
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
          placeholder="98765 43210"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xl font-semibold tracking-wide text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)]"
        />
      </FieldShell>
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <NextButton disabled={d.length !== 10 || sending} label={sending ? "Sending OTP…" : "Send OTP"} onClick={() => onSubmit(d)} />
    </div>
  );
}

// ============================================================
// Step 2: OTP — single input (paste-friendly), 4 visual boxes
// ============================================================
function OtpStep({ phone, otp, onOtp, seconds, onResend, onPaste, verifying }: {
  phone: string;
  otp: string;
  onOtp: (v: string) => void;
  seconds: number;
  onResend: () => void;
  onPaste: () => void;
  verifying: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 320); }, []);
  return (
    <div>
      <StepHeader Icon={KeyRound} title="Enter OTP" subtitle="Auto-detect or paste from SMS" />
      <div className="mb-4 flex items-center justify-center gap-2 text-sm">
        <span className="font-display font-semibold text-[color:oklch(0.32_0.06_85)]">{phone}</span>
      </div>

      <div className="relative mx-auto w-fit">
        <input
          ref={ref}
          value={otp}
          onChange={(e) => onOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
    </div>
  );
}

// ============================================================
// Step 3: Name (gender first via bottom sheet)
// ============================================================
function NameStep({ name, gender, onName, onGenderClick, onNext }: {
  name: string;
  gender: string | null;
  onName: (v: string) => void;
  onGenderClick: () => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (gender) {
      setTimeout(() => ref.current?.focus(), 320);
    }
  }, [gender]);

  const genderChip = GENDER_CHIPS.find((g) => g.value === gender);

  return (
    <div>
      <StepHeader Icon={UserCircle2} title="Enter full name" subtitle={gender ? "As you'd like to be addressed" : "Tap the box — choose gender first"} />

      {/* Gender pill — visible state, tap to change */}
      {gender && (
        <button
          onClick={onGenderClick}
          className="mx-auto mb-3 flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] active:scale-[0.97]"
        >
          {genderChip && <img src={genderChip.icon} alt="" className="h-5 w-5" />}
          <span className="text-xs font-display font-semibold text-[color:oklch(0.30_0.10_82)]">{genderChip?.label}</span>
          <span className="text-[10px] text-[color:oklch(0.45_0.10_82)] underline ml-1">change</span>
        </button>
      )}

      <FieldShell Icon={UserCircle2}>
        <input
          ref={ref}
          value={name}
          readOnly={!gender}
          onFocus={() => { if (!gender) { ref.current?.blur(); onGenderClick(); } }}
          onClick={() => { if (!gender) onGenderClick(); }}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && gender) onNext(); }}
          inputMode="text"
          autoCapitalize="words"
          autoComplete="name"
          placeholder={gender ? "Your full name" : "Tap to choose gender…"}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.6)] cursor-pointer read-only:cursor-pointer"
        />
      </FieldShell>

      <NextButton disabled={!name.trim() || !gender} onClick={onNext} />
    </div>
  );
}

// ============================================================
// Step 4: Email (tap → bottom sheet)
// ============================================================
function EmailStep({ email, onEmail, onPick, onNext }: { email: string; onEmail: (v: string) => void; onPick: () => void; onNext: () => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [manual, setManual] = useState(!!email);
  // Auto-open picker on entry if no email yet & not manual
  useEffect(() => {
    if (!email && !manual) {
      const t = setTimeout(() => onPick(), 280);
      return () => clearTimeout(t);
    }
    if (manual) setTimeout(() => ref.current?.focus(), 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual]);
  const valid = /^\S+@\S+\.\S+$/.test(email);
  return (
    <div>
      <StepHeader Icon={Mail} title="Choose email ID" subtitle="Tap the box to pick from your accounts" />
      <FieldShell Icon={Mail}>
        <input
          ref={ref}
          value={email}
          readOnly={!manual && !email}
          onFocus={() => { if (!manual && !email) { ref.current?.blur(); onPick(); } }}
          onClick={() => { if (!manual && !email) onPick(); }}
          onChange={(e) => { setManual(true); onEmail(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter" && valid) onNext(); }}
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          placeholder="Tap to pick Gmail / email…"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)] cursor-pointer"
        />
        {email && (
          <button onClick={onPick} className="text-[10px] underline text-[color:oklch(0.45_0.10_82)] flex-shrink-0">change</button>
        )}
      </FieldShell>
      <button onClick={() => { setManual(true); setTimeout(() => ref.current?.focus(), 50); }} className="w-full mt-2 text-[11px] underline text-[color:oklch(0.45_0.10_82)] text-center">
        Type manually
      </button>
      <NextButton disabled={!valid} onClick={onNext} />
    </div>
  );
}

// ============================================================
// Step 5: Address — pincode + allow + skip
// ============================================================
function AddressStep({ address, pincode, onPincode, onAddress, onAllow, onSkip, onNext }: {
  address: string;
  pincode: string;
  onPincode: (v: string) => void;
  onAddress: (v: string) => void;
  onAllow: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader Icon={MapPin} title="Your address" subtitle="Pincode, GPS or skip — your choice" />

      <FieldShell Icon={MapPin}>
        <input
          value={pincode}
          onChange={(e) => onPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Area pincode (6 digits)"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.55_0.08_85/0.5)] tracking-widest"
        />
        {pincode.length === 6 && (
          <span className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold">OK</span>
        )}
      </FieldShell>

      <button
        onClick={onAllow}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl py-3 border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 font-display font-semibold text-sm text-[color:oklch(0.32_0.10_82)] active:scale-[0.98]"
      >
        <Locate className="h-4 w-4" /> Allow current location
      </button>

      {address && (
        <div className="mt-3 rounded-xl bg-[color:oklch(0.96_0.05_85)] border border-[color:oklch(0.78_0.14_82/0.35)] px-3 py-2 text-xs text-[color:oklch(0.30_0.06_85)]">
          <span className="font-semibold">Address:</span> <span className="line-clamp-2">{address}</span>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 rounded-2xl py-3.5 font-display font-semibold text-sm text-[color:oklch(0.45_0.10_82)] border-2 border-[color:oklch(0.78_0.14_82/0.4)] bg-white/70 active:scale-[0.98]"
        >
          Skip
        </button>
        <button
          onClick={onNext}
          className="flex-[2] rounded-2xl py-3.5 font-display text-base font-bold text-[color:oklch(0.18_0.06_18)] flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{
            background: "linear-gradient(180deg,#fff3c8 0%,#f5d97a 35%,#d4af37 70%,#8b6508 100%)",
            boxShadow: "0 8px 24px -6px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          Next <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 6: Manager
// ============================================================
function ManagerStep({ manager, onOpenPicker, onNext }: {
  manager?: Manager;
  onOpenPicker: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader Icon={UserCheck} title="Choose manager" subtitle="Verified franchise & relation managers" />
      <button
        onClick={onOpenPicker}
        className="w-full text-left rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.5)] bg-white/85 px-4 py-3.5 flex items-center gap-3 active:scale-[0.99]"
      >
        {manager ? (
          <>
            <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-[0_4px_10px_-3px_rgba(212,175,55,0.55)]">
              <img src={manager.avatar} alt={manager.name} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-bold text-[color:oklch(0.28_0.06_85)] truncate">{manager.name}</div>
              <div className="text-[10px] text-[color:oklch(0.50_0.08_85)] truncate">{manager.area}</div>
              <div className="mt-1 flex items-center gap-2 text-[10px]">
                <span className="inline-flex items-center gap-0.5 font-bold text-[color:oklch(0.40_0.12_82)]">
                  <Star className="h-2.5 w-2.5 fill-current" /> {manager.rating}
                </span>
                <span className="text-[color:oklch(0.45_0.10_82)]">·</span>
                <span className="text-[color:oklch(0.45_0.10_82)]">{manager.vendors} vendors</span>
              </div>
            </div>
            <span className="text-[10px] underline text-[color:oklch(0.45_0.10_82)]">change</span>
          </>
        ) : (
          <>
            <span className="h-9 w-9 rounded-full grid place-items-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#fff8dc,#f5d97a)" }}>
              <UserCheck className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
            </span>
            <span className="flex-1 min-w-0 text-sm text-[color:oklch(0.55_0.08_85/0.7)] italic">Tap to choose nearby manager</span>
            <ChevronRight className="h-4 w-4 text-[color:oklch(0.50_0.10_82)]" />
          </>
        )}
      </button>
      <NextButton disabled={!manager} onClick={onNext} />
    </div>
  );
}

// ============================================================
// Step 7: Referral + Terms
// ============================================================
function ReferralStep({ referral, onReferral, agreed, onAgreed, onScan, submitting, onSubmit }: {
  referral: string;
  onReferral: (v: string) => void;
  agreed: boolean;
  onAgreed: (v: boolean) => void;
  onScan: () => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div>
      <StepHeader Icon={Gift} title="Referral code" subtitle="Optional · earn rewards" />
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

      <button
        type="button"
        onClick={() => onAgreed(!agreed)}
        aria-pressed={agreed}
        className={`mt-5 w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all active:scale-[0.99] ${
          agreed
            ? "border-[color:oklch(0.78_0.14_82)] bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.55)]"
            : "border-dashed border-[color:oklch(0.78_0.14_82/0.7)] bg-white/85 animate-[pulse_2.4s_ease-in-out_infinite]"
        }`}
      >
        <span
          className={`h-7 w-7 rounded-md border-2 flex-shrink-0 grid place-items-center transition-all ${
            agreed
              ? "bg-gradient-to-br from-[#d4af37] to-[#8b6508] border-[#d4af37]"
              : "border-[color:oklch(0.55_0.10_82/0.7)] bg-white"
          }`}
        >
          {agreed && (
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="flex-1 text-sm font-semibold text-[color:oklch(0.32_0.06_85)] leading-snug">
          {agreed ? "Accepted — " : "Tap here to accept "}
          <span className="underline decoration-[color:oklch(0.78_0.14_82)]">Terms &amp; Conditions</span> and Privacy Policy
        </span>
      </button>

      <NextButton disabled={!agreed || submitting} label={submitting ? "Saving…" : "Sign Up"} icon={false} onClick={onSubmit} />
      {agreed && !submitting && (
        <p className="mt-2 text-center text-[11px] text-[color:oklch(0.50_0.08_85)] flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-600" /> Ready to submit
        </p>
      )}
    </div>
  );
}
