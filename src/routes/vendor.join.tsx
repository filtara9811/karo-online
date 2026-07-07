import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  MoreVertical,
  Volume2,
  VolumeX,
  Play,
  Store,
  ClipboardList,
  TrendingUp,
  Users,
  Gift,
  BadgeCheck,
  Languages,
  Lock,
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
import { QrPaymentSheet } from "@/components/vendor-join/QrPaymentSheet";

export const Route = createFileRoute("/vendor/join")({
  head: () => ({
    meta: [
      { title: "Vendor Onboarding — Karo Online" },
      { name: "description", content: "Complete your setup in 2 simple steps." },
    ],
  }),
  component: VendorJoinPage,
});

type StepKey = "business" | "inventory";
type PlanChoice = "trial" | "premium";

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

const DRAFT_KEY = "ko-vendor-onboard-v4";

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
  { code: "bn", label: "বাংলা" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

const FALLBACK_VIDEO =
  "https://cdn.coverr.co/videos/coverr-a-vendor-arranging-products-4747/1080p.mp4";
const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop";

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id)
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1`;
    }
  } catch {}
  return null;
}

function VendorJoinPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => readDraft());
  const [openSheet, setOpenSheet] = useState<
    null | "business" | "inventory" | "qr" | "lang" | "menu"
  >(null);
  const [muted, setMuted] = useState(true);
  const [lang, setLang] = useState("en");
  const [videoUrl, setVideoUrl] = useState<string>(FALLBACK_VIDEO);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => saveDraft(draft), [draft]);

  // Load admin-controlled onboarding video URL
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "vendor_onboarding_video")
        .maybeSingle();
      const v = (data?.value as any)?.url as string | undefined;
      if (v) setVideoUrl(v);
    })();
  }, []);

  const ytEmbed = useMemo(() => toYouTubeEmbed(videoUrl), [videoUrl]);

  const bothDone = draft.completed.business && draft.completed.inventory;
  const completed = Object.values(draft.completed).filter(Boolean).length;

  const saveBusinessInfo = async () => {
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
      const { error } = await supabase.from("vendors").upsert(
        {
          user_id: user.id,
          owner_name: b.owner_name,
          business_name: b.shop_name,
          entity: b.business_nature,
          deals_in: b.main_dealing,
          whatsapp: b.whatsapp,
          lat: b.lat,
          lng: b.lng,
          cover_image_url: b.front_image || null,
          intro_video_url: b.shop_video || null,
          gallery_urls: [b.front_image, b.inside_image, b.another_image].filter(Boolean),
          onboarding_step: 2,
          role: b.shop_type || null,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      setDraft({ ...draft, completed: { ...draft.completed, business: true } });
      toast.success("Business info saved");
      setOpenSheet(null);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const saveInventory = async () => {
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
        toast.error("Please fill Business Info first");
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
    }
  };

  const pickPlan = (plan: PlanChoice) => {
    if (!bothDone) {
      toast.error("Complete both steps first");
      return;
    }
    setDraft({ ...draft, plan });
    if (plan === "trial") {
      toast.success("Your 15-day trial has been activated");
      setTimeout(() => navigate({ to: "/vendor/dashboard" }), 900);
    } else {
      setOpenSheet("qr");
    }
  };

  const progressPct = videoDuration > 0 ? Math.min(100, (videoTime / videoDuration) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col">
      {/* ============ VIDEO (top ~62%) ============ */}
      <div className="relative h-[62vh] min-h-[380px] w-full overflow-hidden">
        {ytEmbed ? (
          <iframe
            src={ytEmbed}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            title="Onboarding video"
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={videoUrl}
            poster={FALLBACK_POSTER}
            autoPlay
            loop
            playsInline
            muted={muted}
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

        {/* Top controls */}
        <div
          className="absolute top-0 left-0 right-0 px-4 pt-3 pb-2 flex items-center gap-2 z-10"
          style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
        >
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-11 pl-3 pr-4 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center gap-2 text-white text-sm font-semibold"
          >
            <span className="h-7 w-7 rounded-full bg-white/15 grid place-items-center">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </span>
            {muted ? "Sound Off" : "Sound On"}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setOpenSheet("menu")}
            className="h-11 w-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 grid place-items-center text-white"
            aria-label="Menu"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Chips over video (left side) */}
        <div className="absolute left-4 top-24 flex flex-col gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-lg">
            <TrendingUp className="h-3.5 w-3.5" /> More Leads
          </span>
          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-lg">
            <Users className="h-3.5 w-3.5" /> More Business
          </span>
        </div>

        {/* Center play */}
        {!ytEmbed && (
          <button
            onClick={() => videoRef.current?.play()}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/25 backdrop-blur-md border border-white/40 grid place-items-center text-white"
            aria-label="Play"
          >
            <Play className="h-7 w-7 ml-0.5" />
          </button>
        )}

        {/* Setup Progress bar */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center gap-3 text-white">
          <span className="text-xs font-semibold whitespace-nowrap">Setup Progress</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${Math.max(progressPct, completed * 35)}%` }}
            />
          </div>
          <span className="text-xs font-semibold whitespace-nowrap">
            {Math.round(Math.max(progressPct, completed * 35))}% Completed
          </span>
        </div>
      </div>

      {/* ============ BOTTOM SHEET (cream) ============ */}
      <div
        className="relative z-20 flex-1 min-h-0 overflow-y-auto bg-[#FFF8ED] rounded-t-[28px] -mt-6 shadow-[0_-20px_50px_rgba(0,0,0,0.35)] px-5 pt-3 pb-6"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300/70 mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-neutral-900 leading-tight">
              Vendor Onboarding
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Complete your setup in just 2 simple steps
            </p>
          </div>
          <button
            onClick={() => setOpenSheet("lang")}
            className="h-11 w-11 rounded-full bg-amber-100 grid place-items-center shrink-0"
            aria-label="Language"
          >
            <Languages className="h-5 w-5 text-amber-700" />
          </button>
        </div>

        {/* Vertical step rail */}
        <StepRow
          n={1}
          Icon={Store}
          title="Business Information"
          desc="Add your business details and location"
          done={draft.completed.business}
          onClick={() => setOpenSheet("business")}
          showConnector
        />
        <StepRow
          n={2}
          Icon={ClipboardList}
          title="Category Mapping"
          desc="Map your products and services for better reach"
          done={draft.completed.inventory}
          disabled={!draft.completed.business}
          onClick={() => setOpenSheet("inventory")}
        />

        {/* Choose Your Plan */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex-1 h-px bg-amber-300/70" />
            <span className="text-amber-500 text-xs">✦</span>
            <h3 className="text-base font-extrabold text-neutral-900">Choose Your Plan</h3>
            <span className="text-amber-500 text-xs">✦</span>
            <span className="flex-1 h-px bg-amber-300/70" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => pickPlan("trial")}
              disabled={!bothDone}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                draft.plan === "trial"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-emerald-200 bg-white"
              } ${!bothDone ? "opacity-60" : "active:scale-[.98]"}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 grid place-items-center shrink-0">
                  <Gift className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 text-sm leading-tight">
                    Free 2 Trial
                  </div>
                  <div className="text-[11px] text-neutral-500">15 Days Full Access</div>
                </div>
              </div>
              <div className="text-neutral-900">
                <span className="text-xs text-neutral-500">Just </span>
                <span className="text-lg font-black">₹1</span>
              </div>
              <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                Auto E-CSS Setup
              </div>
            </button>

            <button
              type="button"
              onClick={() => pickPlan("premium")}
              disabled={!bothDone}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                draft.plan === "premium"
                  ? "border-orange-500 bg-orange-50"
                  : "border-orange-200 bg-white"
              } ${!bothDone ? "opacity-60" : "active:scale-[.98]"}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-orange-100 grid place-items-center shrink-0">
                  <BadgeCheck className="h-4.5 w-4.5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 text-sm leading-tight">
                    Premium Plan
                  </div>
                  <div className="text-[11px] text-neutral-500">One Time Payment</div>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-neutral-400 line-through">₹1000</span>
                <span className="text-lg font-black text-orange-600">₹599</span>
              </div>
              <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold">
                Get Full Access
              </div>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            <Lock className="h-3 w-3" /> Secure Payment • No Hidden Charges
          </div>
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
              onClose={() => setOpenSheet(null)}
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
              onClose={() => setOpenSheet(null)}
            />
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
              Voiceover and subtitles in your language
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

      <Drawer open={openSheet === "menu"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[50vh]">
          <div className="px-5 pt-2 pb-6 space-y-2">
            <div className="mx-auto w-10 h-1 rounded-full bg-neutral-200 mb-4" />
            <button
              onClick={() => {
                setOpenSheet(null);
                navigate({ to: "/quick" });
              }}
              className="w-full h-12 rounded-xl bg-neutral-100 text-neutral-800 font-semibold flex items-center justify-between px-4"
            >
              Skip Onboarding <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setOpenSheet(null);
                setOpenSheet("lang");
              }}
              className="w-full h-12 rounded-xl bg-neutral-100 text-neutral-800 font-semibold flex items-center justify-between px-4"
            >
              Change Language <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function StepRow({
  n,
  Icon,
  title,
  desc,
  done,
  disabled,
  onClick,
  showConnector,
}: {
  n: number;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  done: boolean;
  disabled?: boolean;
  onClick: () => void;
  showConnector?: boolean;
}) {
  return (
    <div className="flex items-stretch gap-3">
      {/* Rail with number */}
      <div className="flex flex-col items-center pt-2">
        <div
          className={`h-9 w-9 rounded-full grid place-items-center text-sm font-bold shrink-0 ${
            done
              ? "bg-emerald-500 text-white"
              : "bg-neutral-300 text-white"
          }`}
        >
          {done ? <Check className="h-4.5 w-4.5" /> : n}
        </div>
        {showConnector && (
          <div className="flex-1 w-px bg-neutral-300 my-1" />
        )}
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 mb-3 rounded-2xl bg-white border border-neutral-200 p-3 flex items-center gap-3 text-left shadow-sm ${
          disabled ? "opacity-60" : "active:scale-[.99]"
        }`}
      >
        <div className="h-11 w-11 rounded-2xl bg-amber-100 grid place-items-center shrink-0">
          <Icon className="h-5 w-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-neutral-900 leading-tight">{title}</div>
          <div className="text-[11px] text-neutral-500 leading-snug mt-0.5">{desc}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-bold ${
              done ? "text-emerald-600" : "text-orange-500"
            }`}
          >
            {done ? "Completed" : "Pending"}
          </span>
          <ChevronRight className="h-4 w-4 text-neutral-400" />
        </div>
      </button>
    </div>
  );
}
