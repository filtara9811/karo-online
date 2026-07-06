import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  LayoutGrid,
  Volume2,
  VolumeX,
  Globe,
  Play,
  Sparkles,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  BusinessInfoSheet,
  EMPTY_BUSINESS,
  type BusinessInfoDraft,
} from "@/components/vendor-join/BusinessInfoSheet";
import { InventoryMappingSheet } from "@/components/vendor-join/InventoryMappingSheet";
import { PlanSelectionSheet, type PlanChoice } from "@/components/vendor-join/PlanSelectionSheet";
import { QrPaymentSheet } from "@/components/vendor-join/QrPaymentSheet";

export const Route = createFileRoute("/vendor/join")({
  head: () => ({
    meta: [
      { title: "Vendor Onboarding — Karo Online" },
      {
        name: "description",
        content: "3 simple steps me apna business Karo Online pe list karein.",
      },
    ],
  }),
  component: VendorJoinPage,
});

type StepKey = "business" | "inventory";

type Draft = {
  business: BusinessInfoDraft;
  items: string[];
  completed: Record<StepKey, boolean>;
  plan: PlanChoice | null;
};

const EMPTY: Draft = {
  business: EMPTY_BUSINESS,
  items: [],
  completed: { business: false, inventory: false },
  plan: null,
};

const DRAFT_KEY = "ko-vendor-onboard-v3";

function readDraft(): Draft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}
function saveDraft(d: Draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}

const LANGUAGES = [
  { code: "hi", label: "हिन्दी" },
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "bn", label: "বাংলা" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "اردو" },
];

// Placeholder — admin will manage video/poster/audio tracks/subtitles
const FALLBACK_VIDEO =
  "https://cdn.coverr.co/videos/coverr-a-vendor-arranging-products-4747/1080p.mp4";
const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop";

function VendorJoinPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => readDraft());
  const [openSheet, setOpenSheet] = useState<
    null | "business" | "inventory" | "plan" | "qr" | "lang"
  >(null);
  const [muted, setMuted] = useState(true);
  const [lang, setLang] = useState("hi");
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingInv, setSavingInv] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => saveDraft(draft), [draft]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("cf_sub_order")) {
      setOpenSheet("plan");
    }
  }, []);

  const bothDone = draft.completed.business && draft.completed.inventory;
  const completedCount = Object.values(draft.completed).filter(Boolean).length;

  const saveBusinessInfo = async () => {
    setSavingBiz(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Login required");
        navigate({ to: "/register" });
        return;
      }
      const b = draft.business;
      const payload = {
        user_id: user.id,
        owner_name: b.owner_name,
        business_name: b.shop_name,
        entity: b.business_nature,
        deals_in: b.main_dealing,
        experience_years:
          b.experience === "10+ yrs" ? 10 : parseInt(b.experience.split("-")[0]) || null,
        whatsapp: b.whatsapp,
        lat: b.lat,
        lng: b.lng,
        cover_image_url: b.front_image || null,
        intro_video_url: b.shop_video || null,
        gallery_urls: [b.front_image, b.inside_image, b.another_image].filter(Boolean),
        onboarding_step: 2,
        role: b.shop_type || null,
      };
      const { error } = await supabase
        .from("vendors")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      setDraft({ ...draft, completed: { ...draft.completed, business: true } });
      toast.success("Business info saved");
      setOpenSheet(null);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingBiz(false);
    }
  };

  const saveInventory = async () => {
    setSavingInv(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!vendor) {
        toast.error("Pehle Business Info bharein");
        return;
      }
      await supabase.from("vendor_item_mappings").delete().eq("vendor_id", vendor.id);
      if (draft.items.length) {
        const rows = draft.items.map((item_id) => ({ vendor_id: vendor.id, item_id }));
        const { error } = await supabase.from("vendor_item_mappings").insert(rows);
        if (error) throw error;
      }
      await supabase.from("vendors").update({ onboarding_step: 3 }).eq("id", vendor.id);
      setDraft({ ...draft, completed: { ...draft.completed, inventory: true } });
      toast.success("Categories mapped");
      setOpenSheet(null);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingInv(false);
    }
  };

  const onPickPlan = (plan: PlanChoice) => {
    setDraft({ ...draft, plan });
    if (plan === "trial") {
      // Free trial — ₹1 Razorpay setup fee (UI stub — backend hook remains)
      toast.success("Your 15-day trial has been activated successfully");
      setOpenSheet(null);
      setTimeout(() => navigate({ to: "/vendor/dashboard" }), 900);
    } else {
      setOpenSheet("qr");
    }
  };

  const publish = () => {
    if (!bothDone) return;
    setOpenSheet("plan");
  };

  const planLabel =
    draft.plan === "premium" ? "Premium ₹599" : draft.plan === "trial" ? "Free Trial" : "Free Trial";

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col">
      {/* ============ VIDEO (top ~75%) ============ */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={FALLBACK_VIDEO}
          poster={FALLBACK_POSTER}
          autoPlay
          loop
          playsInline
          muted={muted}
        />
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

        {/* Top controls */}
        <div
          className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 flex items-center gap-2 z-10"
          style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
        >
          <button
            onClick={() => navigate({ to: "/quick" })}
            className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 grid place-items-center text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-10 pl-3 pr-4 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-white text-xs font-semibold"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span>{muted ? "Sound Off" : "Sound On"}</span>
          </button>
          <button
            onClick={() => setOpenSheet("lang")}
            className="h-10 pl-3 pr-4 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-white text-xs font-semibold"
          >
            <Globe className="h-4 w-4" />
            {LANGUAGES.find((l) => l.code === lang)?.label ?? "हिन्दी"}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate({ to: "/quick" })}
            className="h-10 px-4 rounded-full bg-white/90 text-neutral-900 text-xs font-bold flex items-center gap-1"
          >
            Skip <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Center play affordance */}
        <button
          onClick={() => videoRef.current?.play()}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/25 backdrop-blur-md border border-white/40 grid place-items-center text-white"
          aria-label="Play"
        >
          <Play className="h-7 w-7 ml-0.5" />
        </button>

        {/* Brand overlay */}
        <div className="absolute bottom-6 left-4 right-4 text-white z-10">
          <div className="text-3xl font-black tracking-tight drop-shadow">Karo Online</div>
          <div className="text-sm text-white/85 drop-shadow">Grow Your Business. Get More Leads.</div>
        </div>
      </div>

      {/* ============ BOTTOM SHEET (~25%) ============ */}
      <div
        className="relative z-20 bg-[#FFF7ED] rounded-t-[28px] shadow-[0_-20px_50px_rgba(0,0,0,0.35)] px-4 pt-3 pb-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300/70 mb-2" />
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-extrabold text-neutral-900">Vendor Onboarding</h2>
            <p className="text-[11px] text-neutral-600">
              Complete your setup in just 2 simple steps · {completedCount}/2 done
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Two step cards */}
        <div className="grid grid-cols-2 gap-2">
          <StepCard
            n={1}
            title="Business Info"
            icon={MapPin}
            done={draft.completed.business}
            onClick={() => setOpenSheet("business")}
          />
          <StepCard
            n={2}
            title="Category Mapping"
            icon={LayoutGrid}
            done={draft.completed.inventory}
            disabled={!draft.completed.business}
            onClick={() => setOpenSheet("inventory")}
          />
        </div>

        {/* Sticky footer row */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setOpenSheet("plan")}
            className="h-14 flex-1 rounded-2xl bg-white border border-neutral-200 px-3 flex items-center gap-2 text-left"
          >
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 grid place-items-center">
              <Crown className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase">Current Plan</div>
              <div className="text-sm font-bold text-neutral-900 flex items-center gap-1">
                {planLabel} <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
          <button
            onClick={publish}
            disabled={!bothDone}
            className={`h-14 px-5 rounded-2xl font-bold text-sm text-white flex-[1.2] flex flex-col items-center justify-center leading-tight ${
              bothDone
                ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30"
                : "bg-neutral-300"
            }`}
          >
            <span>Publish Business</span>
            <span className="text-[10px] font-medium opacity-90">
              {completedCount}/2 Steps Completed
            </span>
          </button>
        </div>
      </div>

      {/* ============ Drawers ============ */}
      <Drawer open={openSheet === "business"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[95vh]">
          <div className="overflow-y-auto">
            <BusinessInfoSheet
              draft={draft.business}
              onChange={(b) => setDraft({ ...draft, business: b })}
              onSubmit={saveBusinessInfo}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={openSheet === "inventory"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[95vh]">
          <div className="overflow-y-auto">
            <InventoryMappingSheet
              selected={draft.items}
              onChange={(ids) => setDraft({ ...draft, items: ids })}
              onSubmit={saveInventory}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={openSheet === "plan"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto">
            <PlanSelectionSheet currentPlan={draft.plan} onSelect={onPickPlan} />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={openSheet === "qr"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[95vh]">
          <div className="overflow-y-auto">
            <QrPaymentSheet
              amount={599}
              onSubmitted={() => {
                setOpenSheet(null);
                setTimeout(() => navigate({ to: "/vendor/dashboard" }), 900);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={openSheet === "lang"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[70vh]">
          <div className="px-5 pt-2 pb-6">
            <div className="mx-auto w-10 h-1 rounded-full bg-neutral-200 mb-4" />
            <h3 className="text-lg font-extrabold text-neutral-900 mb-1">Select Language</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Voiceover aur subtitles is language me chalenge
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setOpenSheet(null);
                  }}
                  className={`h-12 rounded-xl border-2 text-sm font-semibold flex items-center justify-between px-4 ${
                    lang === l.code
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-neutral-200 bg-white text-neutral-800"
                  }`}
                >
                  {l.label}
                  {lang === l.code && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function StepCard({
  n,
  title,
  icon: Icon,
  done,
  disabled,
  onClick,
}: {
  n: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-2xl border p-3 text-left flex items-center gap-2.5 transition ${
        done
          ? "bg-emerald-50 border-emerald-300"
          : disabled
            ? "bg-neutral-100 border-neutral-200 opacity-60"
            : "bg-white border-neutral-200 active:scale-[.98]"
      }`}
    >
      <div
        className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
          done ? "bg-emerald-500 text-white" : "bg-amber-50 text-amber-600"
        }`}
      >
        {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-neutral-500 uppercase">Step {n}</div>
        <div className="text-sm font-bold text-neutral-900 leading-tight truncate">{title}</div>
        <div
          className={`text-[10px] font-semibold ${
            done ? "text-emerald-600" : "text-neutral-500"
          }`}
        >
          {done ? "Completed" : "Pending"}
        </div>
      </div>
    </button>
  );
}
