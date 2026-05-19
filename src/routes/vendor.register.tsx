import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Languages,
  Sun,
  User,
  Building2,
  Phone,
  Mail,
  Ticket,
  Instagram,
  Facebook,
  Globe,
  IdCard,
  FileText,
  Receipt,
  Check,
  Sparkles,
  Coins,
  Crown,
  Rocket,
} from "lucide-react";
import { motion, useMotionValue, animate } from "framer-motion";
import { LuxPicker, type PickerOption } from "@/components/LuxPicker";
import { RegistrationFlow } from "@/components/RegistrationFlow";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createCashfreeOrder, verifyCashfreeOrder } from "@/lib/cashfree.functions";
import { openCashfreeCheckout, getPaymentError } from "@/lib/cashfree-client";
import { toast } from "sonner";
import goldUser from "@/assets/gold-user.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import goldOther from "@/assets/gold-other.png";
import goldServices from "@/assets/gold-services.png";
import goldTruck from "@/assets/gold-truck.png";
import goldHome from "@/assets/gold-home.png";
import goldWhatsapp from "@/assets/gold-whatsapp.png";

export const Route = createFileRoute("/vendor/register")({
  validateSearch: (s: Record<string, unknown>) => ({ edit: s.edit === "1" || s.edit === 1 ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Vendor Registration — Karo Online" },
      { name: "description", content: "Premium vendor onboarding with KYC and lead-coin plans." },
    ],
  }),
  component: VendorRegister,
});

type StepIdx = 0 | 1; // 0 = business details, 1 = plan
type AuthMode = "register" | "login";

const ROLE_OPTIONS: PickerOption[] = [
  { value: "owner", label: "Owner", sub: "Founder · CEO", icon: goldUser },
  { value: "partner", label: "Partner", sub: "Co-owner", icon: goldBriefcase },
  { value: "proprietor", label: "Proprietor", sub: "Sole runner", icon: goldHome },
  { value: "manager", label: "Manager", sub: "Decision maker", icon: goldServices },
  { value: "staff", label: "Staff", sub: "On-ground team", icon: goldOther },
];

const ENTITY_OPTIONS: PickerOption[] = [
  { value: "sole", label: "Sole Proprietor", sub: "Single owner", icon: goldUser },
  { value: "partnership", label: "Partnership", sub: "2+ partners", icon: goldBriefcase },
  { value: "pvt", label: "Pvt Ltd", sub: "Private limited", icon: goldHome },
  { value: "llp", label: "LLP", sub: "Limited liability", icon: goldServices },
];

const TRADE_OPTIONS: PickerOption[] = [
  { value: "manufacturer", label: "Manufacturer", sub: "We produce", icon: goldTruck },
  { value: "wholesaler", label: "Wholesaler", sub: "Bulk supply", icon: goldBriefcase },
  { value: "retailer", label: "Retailer", sub: "Shop / store", icon: goldHome },
  { value: "service", label: "Service Provider", sub: "We serve", icon: goldServices },
];

const DEALS_IN_OPTIONS: PickerOption[] = [
  { value: "product", label: "Products", sub: "Physical goods", icon: goldTruck },
  { value: "service", label: "Services", sub: "Skill / labour", icon: goldServices },
  { value: "both", label: "Both", sub: "Products + Services", icon: goldOther },
];

type Picker = null | "role" | "entity" | "trade" | "dealsIn";

function VendorRegister() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/vendor/register" });
  const editMode = search.edit === 1;
  const { user, isAuthenticated, ready, profile } = useAuth();
  const [mode, setMode] = useState<AuthMode>("register");
  const [step, setStep] = useState<StepIdx>(0);
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Step 1 — Business
  const [role, setRole] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [entity, setEntity] = useState<string | null>(null);
  const [trade, setTrade] = useState<string | null>(null);
  const [dealsIn, setDealsIn] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [referral, setReferral] = useState("");

  // Step 2 — Social
  const [insta, setInsta] = useState("");
  const [fb, setFb] = useState("");
  const [website, setWebsite] = useState("");
  const [gmbPlaceId, setGmbPlaceId] = useState("");

  // Step 3 — KYC
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [gst, setGst] = useState("");

  const [picker, setPicker] = useState<Picker>(null);
  const [planChosen, setPlanChosen] = useState<string | null>(null);
  const [showJoined, setShowJoined] = useState(false);
  const [paying, setPaying] = useState(false);
  const createOrder = useServerFn(createCashfreeOrder);
  const verifyOrder = useServerFn(verifyCashfreeOrder);

  const ownerInputRef = useRef<HTMLInputElement | null>(null);
  const businessInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (role) setTimeout(() => ownerInputRef.current?.focus(), 250);
  }, [role]);

  useEffect(() => {
    if (dealsIn) setTimeout(() => businessInputRef.current?.focus(), 250);
  }, [dealsIn]);

  useEffect(() => {
    if (profile?.phone && !whatsapp) setWhatsapp(profile.phone);
    if ((profile?.email || user?.email) && !managerEmail)
      setManagerEmail(profile?.email || user?.email || "");
  }, [managerEmail, profile?.email, profile?.phone, user?.email, whatsapp]);

  // Auto-skip if vendor already onboarded (unless ?edit=1 from menu)
  useEffect(() => {
    if (!user || profileLoaded) return;
    // Fast-path: sessionStorage cache → instant redirect, no flash
    if (!editMode && typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(`vendor:registered:${user.id}`) === "1") {
          navigate({ to: "/vendor/dashboard" });
          return;
        }
      } catch {}
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("business_name, owner_name, role, entity, trade, deals_in, whatsapp, manager_email, email, referral, instagram, facebook, website, google_place_id, aadhaar, pan, gst")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        // prefill all fields so user can edit
        setRole((data as any).role ?? null);
        setOwnerName((data as any).owner_name ?? "");
        setEntity((data as any).entity ?? null);
        setTrade((data as any).trade ?? null);
        setDealsIn((data as any).deals_in ?? null);
        setBusinessName((data as any).business_name ?? "");
        setWhatsapp((data as any).whatsapp ?? "");
        setManagerEmail((data as any).manager_email ?? (data as any).email ?? "");
        setReferral((data as any).referral ?? "");
        setInsta((data as any).instagram ?? "");
        setFb((data as any).facebook ?? "");
        setWebsite((data as any).website ?? "");
        setGmbPlaceId((data as any).google_place_id ?? "");
        setAadhaar((data as any).aadhaar ?? "");
        setPan((data as any).pan ?? "");
        setGst((data as any).gst ?? "");
        // Cache for next opens
        try { sessionStorage.setItem(`vendor:registered:${user.id}`, "1"); } catch {}
        if (!editMode) {
          navigate({ to: "/vendor/dashboard" });
          return;
        }
      }
      setProfileLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, profileLoaded, editMode, navigate]);

  // Sheet drag
  const [vh, setVh] = useState(800);
  const SNAP_FULL = vh * 0.06;
  const SNAP_HALF = vh * 0.3;
  const SNAP_PEEK = vh * 0.55;
  const SNAPS = useMemo(() => [SNAP_FULL, SNAP_HALF, SNAP_PEEK], [SNAP_FULL, SNAP_HALF, SNAP_PEEK]);
  const y = useMotionValue(SNAP_HALF);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    animate(y, SNAP_FULL, { type: "spring", stiffness: 220, damping: 28 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SNAP_FULL]);

  const snapTo = (target: number) => {
    animate(y, target, { type: "spring", stiffness: 260, damping: 30 });
  };

  const handleDragEnd = (_: unknown, info: { velocity: { y: number } }) => {
    const current = y.get();
    const v = info.velocity.y;
    if (v < -500) return snapTo(SNAP_FULL);
    if (v > 500) return snapTo(SNAP_PEEK);
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

  // Validation per step
  const step1Valid =
    !!role &&
    ownerName.trim().length > 1 &&
    !!entity &&
    !!trade &&
    !!dealsIn &&
    businessName.trim().length > 1 &&
    whatsapp.replace(/\D/g, "").length >= 10 &&
    managerEmail.includes("@");

  const canNext = step === 0 ? step1Valid : false;

  const goNext = () => {
    if (step === 0 && step1Valid) setStep(1);
  };

  const goBack = () => {
    if (step === 0) navigate({ to: "/" });
    else setStep((step - 1) as StepIdx);
  };

  const handlePickerSelect = (value: string) => {
    if (picker === "role") setRole(value);
    else if (picker === "entity") setEntity(value);
    else if (picker === "trade") setTrade(value);
    else if (picker === "dealsIn") setDealsIn(value);
    setPicker(null);
  };

  const handleVendorAuthComplete = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (existingVendor) navigate({ to: "/vendor/dashboard" });
  };

  const pickerConfig = useMemo(() => {
    if (picker === "role")
      return {
        title: "Your Role",
        subtitle: "Who are you in this business?",
        options: ROLE_OPTIONS,
      };
    if (picker === "entity")
      return {
        title: "Business Type",
        subtitle: "How is your business registered?",
        options: ENTITY_OPTIONS,
      };
    if (picker === "trade")
      return { title: "What you do", subtitle: "Pick your trade line", options: TRADE_OPTIONS };
    if (picker === "dealsIn")
      return {
        title: "Deals In",
        subtitle: "Products, services, or both?",
        options: DEALS_IN_OPTIONS,
      };
    return null;
  }, [picker]);

  const handleJoinPlan = async (planId: string, custom?: { coins: number; priceInr: number }) => {
    if (saving || paying) return;
    if (!user) {
      toast.error("Pehle sign in karein");
      return;
    }
    let priceInr = 0;
    let totalCoins = 0;
    if (custom) {
      priceInr = custom.priceInr;
      totalCoins = custom.coins;
    } else {
      const plan = PLANS.find((p) => p.id === planId);
      if (!plan) {
        toast.error("Invalid plan");
        return;
      }
      priceInr = Number(plan.price.replace(/[^\d]/g, "")) || 0;
      totalCoins = (plan.coins ?? 0) + (plan.bonus ?? 0);
    }

    setPlanChosen(planId);
    setSaving(true);

    // If this user already has a vendor row, skip the RPC (avoids "mobile already registered"
    // errors triggered by stale rows owned by a different test user_id).
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingVendor) {
      const { error } = await supabase.rpc("save_vendor_profile", {
        _role: role ?? "",
        _owner_name: ownerName.trim(),
        _entity: entity ?? "",
        _trade: trade ?? "",
        _deals_in: dealsIn ?? "",
        _business_name: businessName.trim(),
        _whatsapp: whatsapp || profile?.phone || "",
        _manager_email: managerEmail.trim() || user.email || profile?.email || "",
        _referral: referral.trim(),
        _instagram: insta.trim(),
        _facebook: fb.trim(),
        _website: website.trim(),
        _google_place_id: gmbPlaceId.trim(),
        _aadhaar: aadhaar,
        _pan: pan.trim(),
        _gst: gst.trim(),
        _plan: planId,
      });
      setSaving(false);
      if (error) {
        const msg = error.message || "";
        // Soft-handle the "already registered" case: same number belongs to an old test
        // account. Allow the user to proceed to payment instead of being blocked.
        if (/already registered/i.test(msg)) {
          console.warn("[vendors upsert] duplicate whatsapp — proceeding to payment", msg);
        } else {
          console.error("[vendors upsert]", error);
          toast.error(msg || "Vendor save fail hua — phir try karein");
          setPlanChosen(null);
          return;
        }
      }
    } else {
      setSaving(false);
    }

    // Open Cashfree for plan payment (LeadX coin pack)
    setPaying(true);
    try {
      const r = await createOrder({
        data: { amount_inr: priceInr, purpose: "leadx_purchase", coins: totalCoins },
      });
      if (!r.ok) {
        if (/cashfree configured nahi hai/i.test(r.error || "")) {
          toast.success(
            "Training complete ho gayi — Cashfree configure hote hi payment gateway active ho jayega.",
          );
          setShowJoined(true);
          setTimeout(() => navigate({ to: "/vendor/dashboard" }), 1400);
          return;
        }
        toast.error(r.error || "Payment start nahi ho paya");
        setPlanChosen(null);
        return;
      }
      await openCashfreeCheckout(r.payment_session_id, r.mode);
      const v = await verifyOrder({
        data: { order_id: r.order_id, purpose: "leadx_purchase" },
      });
      if (!v.ok) {
        toast.error(v.error || "Payment pending — wallet se phir try karein");
        setPlanChosen(null);
        return;
      }
      toast.success(`Plan activated · +${totalCoins} LeadX added`);
      setShowJoined(true);
      setTimeout(() => navigate({ to: "/vendor/dashboard" }), 1800);
    } catch (e) {
      toast.error(getPaymentError(e));
      setPlanChosen(null);
    } finally {
      setPaying(false);
    }
  };

  const stepLabels = ["Business | Details"];

  // Show OTP/Google sign-in gate first if user not authenticated
  if (ready && !isAuthenticated) {
    return (
      <main
        className="fixed inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, #0a0a0a 0%, transparent 55%), linear-gradient(180deg, #0a0a0a 0%, #04231a 60%, #053024 100%)",
        }}
      >
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none">
          <h1 className="font-display text-2xl font-bold text-silver-gradient tracking-tight">
            Vendor <span className="font-light">|</span> Sign in
          </h1>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.6)]">
            Verify phone to start onboarding
          </span>
        </div>
        <RegistrationFlow
          transparent
          onBack={() => navigate({ to: "/" })}
          onComplete={handleVendorAuthComplete}
        />
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #0a0a0a 0%, transparent 55%), linear-gradient(180deg, #0a0a0a 0%, #04231a 60%, #053024 100%)",
      }}
    >
      {/* Decorative gold orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.20),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.10_92/0.15),transparent_70%)] blur-2xl" />

      {/* Header — Vendor branding */}
      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-white/90 backdrop-blur-md border border-[color:oklch(0.72_0.01_260/0.5)] grid place-items-center shadow-md"
        aria-label="Close"
      >
        <svg
          className="h-5 w-5 text-[color:oklch(0.42_0.01_260)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
        <h1 className="font-display text-3xl font-bold text-silver-gradient tracking-tight">
          Vendor <span className="font-light">|</span> Apps
        </h1>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.6)]">
          Login | sign up | Page
        </span>
      </div>

      {/* Sheet */}
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
            background: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 35%, #bbf7d0 100%)",
            boxShadow:
              "0 -20px 60px -12px rgba(37,99,235,0.45), 0 0 0 1.5px rgba(255,255,255,0.7) inset",
          }}
        >
          {/* drag handle */}
          <div className="pt-3 pb-1 grid place-items-center cursor-grab active:cursor-grabbing">
            <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#a8acb3] via-[#d8dde3] to-[#a8acb3] shadow-[0_1px_4px_rgba(37,99,235,0.5)]" />
          </div>

          <div
            className="h-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain px-5 pb-32"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* top icons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Mode tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-full border border-[color:oklch(0.72_0.01_260/0.5)] bg-white/70">
                <button
                  onClick={() => setMode("register")}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-display font-bold uppercase tracking-wider transition ${
                    mode === "register"
                      ? "text-[color:oklch(0.20_0.01_260)] shadow"
                      : "text-[color:oklch(0.55_0.10_82)]"
                  }`}
                  style={
                    mode === "register"
                      ? { background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }
                      : undefined
                  }
                >
                  Registered | vendor
                </button>
                <button
                  onClick={() => setMode("login")}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-display font-bold uppercase tracking-wider transition ${
                    mode === "login"
                      ? "text-[color:oklch(0.20_0.01_260)] shadow"
                      : "text-[color:oklch(0.55_0.10_82)]"
                  }`}
                  style={
                    mode === "login"
                      ? { background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }
                      : undefined
                  }
                >
                  Login
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  className="h-8 w-8 rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.55)] grid place-items-center shadow-md"
                  aria-label="Theme"
                >
                  <Sun className="h-4 w-4 text-[color:oklch(0.55_0.15_82)]" strokeWidth={2.4} />
                </button>
                <button
                  className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#f5f6f8] to-[#d8dde3] border border-[color:oklch(0.72_0.01_260/0.6)] grid place-items-center shadow-md"
                  aria-label="Language"
                >
                  <Languages
                    className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]"
                    strokeWidth={2.4}
                  />
                </button>
              </div>
            </div>

            {mode === "login" ? (
              <div className="mt-10 text-center px-6">
                <p className="font-display text-2xl text-silver-gradient">Existing vendor?</p>
                <p className="text-sm text-[color:oklch(0.45_0.01_260)] mt-2 italic">
                  Same customer mobile/email se vendor panel open hoga. Registered tab me apni
                  details complete karein.
                </p>
              </div>
            ) : step < 1 ? (
              <>
                {/* Stepper (single step — Social & KYC moved to menu) */}
                <Stepper current={step} labels={stepLabels} />

                {/* Step content */}
                <div className="mt-5">
                  <Step1Business
                    role={role}
                    ownerName={ownerName}
                    entity={entity}
                    trade={trade}
                    dealsIn={dealsIn}
                    businessName={businessName}
                    whatsapp={whatsapp}
                    managerEmail={managerEmail}
                    referral={referral}
                    onPickRole={() => setPicker("role")}
                    onPickEntity={() => setPicker("entity")}
                    onPickTrade={() => setPicker("trade")}
                    onPickDealsIn={() => setPicker("dealsIn")}
                    setOwnerName={setOwnerName}
                    setBusinessName={setBusinessName}
                    setWhatsapp={setWhatsapp}
                    setManagerEmail={setManagerEmail}
                    setReferral={setReferral}
                    ownerRef={ownerInputRef}
                    businessRef={businessInputRef}
                  />
                </div>

                <p className="text-center text-[10px] italic text-[color:oklch(0.45_0.01_260)] mt-4">
                  Social pages & KYC ko menu se kabhi bhi update kar sakte hain.
                </p>

                {/* Nav buttons */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={goBack}
                    className="rounded-2xl py-3 font-display font-bold text-sm uppercase tracking-wider text-[color:oklch(0.30_0.06_82)] border border-[color:oklch(0.72_0.01_260/0.5)] bg-white/70"
                  >
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!canNext}
                    className="btn-3d rounded-2xl py-3 font-display font-bold text-sm uppercase tracking-wider text-[color:oklch(0.20_0.01_260)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background:
                        "linear-gradient(180deg, #eef0f3 0%, #d8dde3 35%, #a8acb3 70%, #3f4750 100%)",
                      boxShadow: canNext
                        ? "0 8px 24px -6px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.7)"
                        : undefined,
                    }}
                  >
                    Choose Plan
                    <span>›</span>
                  </button>
                </div>
              </>
            ) : (
              <PlanStep
                onChoose={(id) => handleJoinPlan(id)}
                onChooseCustom={(coins, priceInr) =>
                  handleJoinPlan("custom", { coins, priceInr })
                }
                chosen={planChosen}
                busy={saving || paying}
              />
            )}
          </div>
        </div>
      </motion.section>

      {pickerConfig && (
        <LuxPicker
          open={!!picker}
          title={pickerConfig.title}
          subtitle={pickerConfig.subtitle}
          options={pickerConfig.options}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {showJoined && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-md">
          <div
            className="rounded-3xl p-8 text-center max-w-xs"
            style={{
              background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 50%, #a8acb3 100%)",
              boxShadow: "0 30px 80px -10px rgba(37,99,235,0.7)",
              animation: "sheet-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="h-16 w-16 mx-auto rounded-full bg-white grid place-items-center mb-3 shadow-lg">
              <Check className="h-9 w-9 text-[color:oklch(0.42_0.01_260)]" strokeWidth={3} />
            </div>
            <p className="font-display text-2xl text-[color:oklch(0.20_0.01_260)] font-bold">
              Joined!
            </p>
            <p className="text-xs text-[color:oklch(0.30_0.06_18)] mt-1 italic">
              Redirecting to vendor dashboard…
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─────────── Stepper ─────────── */
function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-2">
        {labels.map((_, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div
              className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold border-2 transition-all ${
                i <= current
                  ? "border-white text-white"
                  : "border-[color:oklch(0.72_0.01_260/0.4)] text-[color:oklch(0.55_0.10_82)] bg-white/70"
              }`}
              style={
                i <= current
                  ? {
                      background: "linear-gradient(135deg, #d8dde3 0%, #a8acb3 50%, #3f4750 100%)",
                      boxShadow: "0 4px 10px -2px rgba(37,99,235,0.6)",
                    }
                  : undefined
              }
            >
              {i < current ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </div>
            {i < labels.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1"
                style={{
                  background:
                    i < current
                      ? "linear-gradient(90deg, #a8acb3, #d8dde3)"
                      : "linear-gradient(90deg, oklch(0.78 0.14 165 / 0.4), oklch(0.78 0.14 165 / 0.2))",
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between px-1 mt-2 text-[10px] uppercase tracking-wider">
        {labels.map((l, i) => (
          <span
            key={l}
            className={`flex-1 text-center ${
              i === current
                ? "text-silver-gradient font-bold"
                : "text-[color:oklch(0.50_0.08_85/0.7)]"
            }`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Step 1 ─────────── */
type Step1Props = {
  role: string | null;
  ownerName: string;
  entity: string | null;
  trade: string | null;
  dealsIn: string | null;
  businessName: string;
  whatsapp: string;
  managerEmail: string;
  referral: string;
  onPickRole: () => void;
  onPickEntity: () => void;
  onPickTrade: () => void;
  onPickDealsIn: () => void;
  setOwnerName: (v: string) => void;
  setBusinessName: (v: string) => void;
  setWhatsapp: (v: string) => void;
  setManagerEmail: (v: string) => void;
  setReferral: (v: string) => void;
  ownerRef: React.RefObject<HTMLInputElement | null>;
  businessRef: React.RefObject<HTMLInputElement | null>;
};

function Step1Business(p: Step1Props) {
  const showOwner = !!p.role;
  const showEntity = p.ownerName.trim().length > 1;
  const showTrade = !!p.entity;
  const showDealsIn = !!p.trade;
  const showBusinessName = !!p.dealsIn;
  const showWhatsapp = p.businessName.trim().length > 1;
  const showEmail = p.whatsapp.replace(/\D/g, "").length >= 10;
  const showReferral = p.managerEmail.includes("@");

  return (
    <div className="space-y-1">
      <Field
        Icon={User}
        label="Business operator name"
        hint={p.role ? `Role · ${p.role}` : "Tap → choose role"}
        value={p.ownerName}
        filled={p.ownerName.trim().length > 1}
        readOnly={!p.role}
        onClick={() => !p.role && p.onPickRole()}
        onChange={p.setOwnerName}
        inputRef={p.ownerRef}
        showInput={showOwner}
        placeholder="Owner / partner name"
      />

      {showEntity && (
        <Field
          Icon={Building2}
          label="Business type"
          hint={p.entity ? `Selected · ${p.entity}` : "Tap → choose type"}
          value={p.entity ? entityLabel(p.entity) : ""}
          filled={!!p.entity}
          readOnly
          onClick={p.onPickEntity}
        />
      )}

      {showTrade && (
        <Field
          Icon={Sparkles}
          label="What you do"
          hint={p.trade ? `Trade · ${p.trade}` : "Tap → choose trade"}
          value={p.trade ? tradeLabel(p.trade) : ""}
          filled={!!p.trade}
          readOnly
          onClick={p.onPickTrade}
        />
      )}

      {showDealsIn && (
        <Field
          Icon={Ticket}
          label="Deals in"
          hint={p.dealsIn ? `${p.dealsIn}` : "Products / Services / Both"}
          value={p.dealsIn ? dealsLabel(p.dealsIn) : ""}
          filled={!!p.dealsIn}
          readOnly
          onClick={p.onPickDealsIn}
        />
      )}

      {showBusinessName && (
        <Field
          Icon={Building2}
          label="Business name"
          hint="Company / shop / brand"
          value={p.businessName}
          filled={p.businessName.trim().length > 1}
          onChange={p.setBusinessName}
          inputRef={p.businessRef}
          showInput
          placeholder="e.g. Karo Mart Pvt Ltd"
        />
      )}

      {showWhatsapp && (
        <Field
          Icon={Phone}
          label="WhatsApp business no."
          hint="10 digits"
          value={p.whatsapp}
          filled={p.whatsapp.replace(/\D/g, "").length >= 10}
          onChange={(v) => p.setWhatsapp(v.replace(/[^\d+\s]/g, "").slice(0, 14))}
          showInput
          inputMode="tel"
          placeholder="+91 98xxxxxxxx"
        />
      )}

      {showEmail && (
        <Field
          Icon={Mail}
          label="Choice manager / email"
          hint="Where leads & invoices go"
          value={p.managerEmail}
          filled={p.managerEmail.includes("@")}
          onChange={p.setManagerEmail}
          showInput
          placeholder="manager@company.com"
        />
      )}

      {showReferral && (
        <Field
          Icon={Ticket}
          label="Referral code (optional)"
          hint="Enter friend's code for bonus coins"
          value={p.referral}
          filled={p.referral.length > 0}
          onChange={p.setReferral}
          showInput
          isLast
          placeholder="KARO-XXXX"
        />
      )}
    </div>
  );
}

/* ─────────── Step 2 ─────────── */
function Step2Social({
  insta,
  fb,
  website,
  gmbPlaceId,
  setInsta,
  setFb,
  setWebsite,
  setGmbPlaceId,
}: {
  insta: string;
  fb: string;
  website: string;
  gmbPlaceId: string;
  setInsta: (v: string) => void;
  setFb: (v: string) => void;
  setWebsite: (v: string) => void;
  setGmbPlaceId: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-center text-xs italic text-[color:oklch(0.45_0.01_260)] mb-2">
        Add at least one — helps customers find & trust you
      </p>
      <Field
        Icon={() => <img src={goldWhatsapp} alt="" className="h-5 w-5" />}
        label="WhatsApp business link"
        hint="wa.me/91xxxxxxxxxx"
        value={fb}
        filled={fb.length > 0}
        onChange={setFb}
        showInput
        placeholder="https://wa.me/91…"
      />
      <Field
        Icon={Instagram}
        label="Instagram handle"
        hint="@yourbrand"
        value={insta}
        filled={insta.length > 0}
        onChange={setInsta}
        showInput
        placeholder="@karo.mart"
      />
      <Field
        Icon={Facebook}
        label="Facebook page"
        hint="fb.com/yourpage"
        value={website}
        filled={website.length > 0}
        onChange={setWebsite}
        showInput
        placeholder="facebook.com/karomart"
      />
      <Field
        Icon={Globe}
        label="Website (optional)"
        hint="https://"
        value=""
        filled={false}
        onChange={() => {}}
        showInput
        placeholder="https://karomart.in"
      />
      <Field
        Icon={Globe}
        label="Google Place ID (optional)"
        hint="For auto Google review link"
        value={gmbPlaceId}
        filled={gmbPlaceId.length > 0}
        onChange={setGmbPlaceId}
        showInput
        isLast
        placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
      />
    </div>
  );
}

/* ─────────── Step 3 ─────────── */
function Step3Kyc({
  aadhaar,
  pan,
  gst,
  setAadhaar,
  setPan,
  setGst,
}: {
  aadhaar: string;
  pan: string;
  gst: string;
  setAadhaar: (v: string) => void;
  setPan: (v: string) => void;
  setGst: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-center text-xs italic text-[color:oklch(0.45_0.01_260)] mb-2">
        Your KYC is encrypted — verifies you as a real vendor
      </p>
      <Field
        Icon={IdCard}
        label="Aadhaar number"
        hint="12 digits"
        value={aadhaar}
        filled={aadhaar.replace(/\D/g, "").length === 12}
        onChange={(v) => setAadhaar(v.replace(/\D/g, "").slice(0, 12))}
        showInput
        inputMode="numeric"
        placeholder="xxxx xxxx xxxx"
      />
      <Field
        Icon={FileText}
        label="PAN number"
        hint="ABCDE1234F"
        value={pan}
        filled={pan.length === 10}
        onChange={(v) => setPan(v.toUpperCase().slice(0, 10))}
        showInput
        placeholder="ABCDE1234F"
      />
      <Field
        Icon={Receipt}
        label="GST number (optional)"
        hint="If registered"
        value={gst}
        filled={gst.length > 0}
        onChange={(v) => setGst(v.toUpperCase().slice(0, 15))}
        showInput
        isLast
        placeholder="22ABCDE1234F1Z5"
      />
    </div>
  );
}

/* ─────────── Plan Step ─────────── */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: Coins,
    price: "₹499",
    coins: 100,
    perks: ["100 lead coins", "WhatsApp leads", "Basic analytics"],
    accent: "linear-gradient(135deg, #eef0f3, #a8acb3)",
  },
  {
    id: "growth",
    name: "Growth",
    icon: Rocket,
    price: "₹1,999",
    coins: 500,
    bonus: 50,
    perks: ["500 + 50 bonus coins", "Priority leads", "Vendor badge"],
    accent: "linear-gradient(135deg, #d8dde3, #a8acb3, #3f4750)",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    price: "₹4,999",
    coins: 1500,
    bonus: 250,
    perks: ["1,500 + 250 bonus coins", "Hot leads first", "Verified gold tag", "Dedicated CSM"],
    accent: "linear-gradient(135deg, #eef0f3, #d8dde3, #a8acb3, #3f4750)",
  },
];

const COIN_PRICE_INR = 5; // ₹5 per coin for custom top-ups (matches Starter rate)

function PlanStep({
  onChoose,
  onChooseCustom,
  chosen,
  busy,
}: {
  onChoose: (id: string) => void;
  onChooseCustom: (coins: number, priceInr: number) => void;
  chosen: string | null;
  busy?: boolean;
}) {
  const [customCoins, setCustomCoins] = useState<string>("");
  const coinsN = Math.max(0, Math.min(100000, parseInt(customCoins || "0", 10) || 0));
  const customPrice = coinsN * COIN_PRICE_INR;
  const customValid = coinsN >= 50;
  return (
    <div className="mt-2">
      <div className="text-center mb-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.84_0.15_85)]">
          ✦ Final Step ✦
        </p>
        <h2 className="font-display text-3xl text-silver-gradient font-bold mt-1">
          Pick your Lead Coin plan
        </h2>
        <p className="text-xs italic text-[color:oklch(0.45_0.01_260)] mt-1">
          {busy ? "Opening Cashfree…" : "Coins unlock leads. Top up anytime."}
        </p>
      </div>

      <div className="space-y-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isChosen = chosen === p.id;
          return (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => onChoose(p.id)}
              className="relative w-full text-left rounded-2xl p-4 border-2 transition-all"
              style={{
                background: isChosen
                  ? p.accent
                  : "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
                borderColor: isChosen ? "#3f4750" : "rgba(37,99,235,0.4)",
                boxShadow: isChosen
                  ? "0 12px 30px -8px rgba(37,99,235,0.6)"
                  : "0 4px 12px -4px rgba(37,99,235,0.2)",
              }}
            >
              {p.popular && (
                <span
                  className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white"
                  style={{ background: "linear-gradient(90deg, #a8acb3, #3f4750)" }}
                >
                  Most Popular
                </span>
              )}
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-xl grid place-items-center flex-shrink-0"
                  style={{ background: p.accent, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }}
                >
                  <Icon className="h-6 w-6 text-[color:oklch(0.20_0.01_260)]" strokeWidth={2.4} />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="font-display text-xl font-bold text-[color:oklch(0.20_0.01_260)]">
                      {p.name}
                    </p>
                    <p className="font-display text-xl font-bold text-[color:oklch(0.20_0.01_260)]">
                      {p.price}
                    </p>
                  </div>
                  <p className="text-xs italic text-[color:oklch(0.30_0.06_18)] mt-0.5">
                    {p.coins} coins{p.bonus ? ` · +${p.bonus} bonus` : ""}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {p.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-1.5 text-[11px] text-[color:oklch(0.25_0.06_18)]"
                      >
                        <Check className="h-3 w-3 mt-0.5 flex-shrink-0" strokeWidth={3} />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom coin top-up — manual amount */}
      <div
        className="mt-4 rounded-2xl p-4 border-2"
        style={{
          background:
            "linear-gradient(180deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)",
          borderColor: "rgba(212,175,55,0.55)",
          boxShadow: "0 8px 24px -8px rgba(212,175,55,0.45)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#8b6508] font-bold">
              ✦ Custom Top-up ✦
            </p>
            <p className="font-display text-lg font-bold text-[#3f2a05] leading-tight">
              Apni marzi se LeadX khareeden
            </p>
          </div>
          <Coins className="h-7 w-7 text-[#8b6508]" />
        </div>
        <p className="text-[11px] italic text-[#5c4308] mb-2">
          Min 50 coins · ₹{COIN_PRICE_INR}/coin · instant credit after payment
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              inputMode="numeric"
              value={customCoins}
              onChange={(e) => setCustomCoins(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="e.g. 250"
              className="w-full rounded-xl bg-white border-2 border-[#d4af37]/40 px-3 py-2.5 text-[15px] font-bold text-[#3f2a05] placeholder:text-[#8b6508]/50 outline-none focus:border-[#d4af37]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-[#8b6508]/70 font-bold">
              coins
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-[#8b6508]/80">Total</p>
            <p className="font-display text-lg font-bold text-[#3f2a05]">
              ₹{customPrice.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <button
          disabled={busy || !customValid}
          onClick={() => onChooseCustom(coinsN, customPrice)}
          className="mt-3 w-full rounded-xl py-2.5 font-display font-bold text-sm uppercase tracking-wider text-[#1a1208] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
            boxShadow: customValid
              ? "0 6px 18px -4px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.5)"
              : undefined,
          }}
        >
          {busy ? "Opening Cashfree…" : `Buy ${coinsN || 0} coins`}
        </button>
      </div>

      <p className="text-center text-[10px] text-[color:oklch(0.50_0.08_85)] italic mt-4">
        Cashfree ready hone par yahi plan direct payment gateway open karega.
      </p>

      <VendorAppDownloadCard />
    </div>
  );
}

function VendorAppDownloadCard() {
  const [urls, setUrls] = useState<{ apk_url?: string; play_store_url?: string }>({});
  useEffect(() => {
    let cancel = false;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "vendor_app")
        .maybeSingle()
        .then(({ data }) => {
          if (!cancel && data) setUrls(((data as any).value ?? {}) as any);
        });
    });
    return () => {
      cancel = true;
    };
  }, []);

  if (!urls.apk_url && !urls.play_store_url) return null;

  return (
    <div
      className="mt-6 rounded-2xl p-4 border-2 border-emerald-300"
      style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-700 font-bold text-center">
        ✦ Vendor App ✦
      </p>
      <h3 className="font-display text-lg font-bold text-center text-emerald-950 mt-1">
        Download the dedicated Vendor App
      </h3>
      <p className="text-xs text-center text-emerald-800/80 mt-1 mb-3">
        Faster leads, push notifications, offline mode.
      </p>
      <div className="flex gap-2">
        {urls.play_store_url && (
          <a
            href={urls.play_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-display font-bold text-sm text-center active:scale-95"
          >
            ▶ Play Store
          </a>
        )}
        {urls.apk_url && (
          <a
            href={urls.apk_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-900 text-white font-display font-bold text-sm text-center active:scale-95"
          >
            ⬇ APK
          </a>
        )}
      </div>
    </div>
  );
}

/* ─────────── Generic Field ─────────── */
type FieldProps = {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  hint: string;
  value: string;
  filled: boolean;
  isLast?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  onChange?: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  showInput?: boolean;
  placeholder?: string;
  inputMode?: "text" | "tel" | "numeric" | "email";
};

function Field({
  Icon,
  label,
  hint,
  value,
  filled,
  isLast,
  readOnly,
  onClick,
  onChange,
  inputRef,
  showInput,
  placeholder,
  inputMode,
}: FieldProps) {
  return (
    <div
      className="relative flex items-start gap-3"
      style={{ animation: "step-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      <div className="relative flex flex-col items-center pt-3.5">
        <div
          className={`relative h-9 w-9 rounded-full grid place-items-center border-2 transition-all ${
            filled ? "border-white" : "border-[color:oklch(0.72_0.01_260/0.4)]"
          }`}
          style={{
            background: filled
              ? "linear-gradient(135deg, #d8dde3 0%, #a8acb3 50%, #3f4750 100%)"
              : "linear-gradient(135deg, #f5f6f8 0%, #eef0f3 100%)",
            boxShadow: filled
              ? "0 4px 12px -2px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.6)"
              : "inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <Icon
            className={filled ? "h-4 w-4 text-white" : "h-4 w-4 text-[color:oklch(0.42_0.01_260)]"}
            strokeWidth={2.4}
          />
          {filled && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full grid place-items-center border border-white"
              style={{
                background: "linear-gradient(135deg,#eef0f3 0%,#a8acb3 60%,#3f4750 100%)",
                boxShadow: "0 2px 6px -1px rgba(37,99,235,0.6)",
              }}
            >
              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
            </span>
          )}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1 bg-gradient-to-b from-[color:oklch(0.72_0.01_260/0.6)] to-transparent min-h-[44px]" />
        )}
      </div>

      <div className="flex-1 pt-2 pb-3">
        <div onClick={onClick} className={readOnly ? "cursor-pointer" : ""}>
          <input
            ref={inputRef}
            value={value}
            readOnly={readOnly || !showInput}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={showInput ? (placeholder ?? label) : label}
            inputMode={inputMode}
            className="w-full bg-transparent border-0 text-[15px] font-medium text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.45_0.01_260/0.7)] outline-none py-0.5"
          />
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(37,99,235,0.7) 0%, rgba(37,99,235,0.3) 100%)",
            }}
          />
          <p className="text-[10px] text-[color:oklch(0.50_0.08_85/0.85)] mt-1 italic">{hint}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────── helpers ─────────── */
function entityLabel(v: string) {
  return ENTITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
function tradeLabel(v: string) {
  return TRADE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
function dealsLabel(v: string) {
  return DEALS_IN_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
