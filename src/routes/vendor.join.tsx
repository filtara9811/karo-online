import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  LayoutGrid,
  Crown,
  ShieldCheck,
  Lock,
  Store,
  X,
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
import { SubscriptionSheet } from "@/components/vendor-join/SubscriptionSheet";

export const Route = createFileRoute("/vendor/join")({
  head: () => ({
    meta: [
      { title: "Vendor Onboarding — Karo Online" },
      { name: "description", content: "3 simple steps me apna business Karo Online pe list karein aur leads paayein." },
    ],
  }),
  component: VendorJoinPage,
});

type StepKey = "business" | "inventory" | "subscription";

type Draft = {
  business: BusinessInfoDraft;
  items: string[];
  completed: Record<StepKey, boolean>;
};

const EMPTY: Draft = {
  business: EMPTY_BUSINESS,
  items: [],
  completed: { business: false, inventory: false, subscription: false },
};

const DRAFT_KEY = "ko-vendor-onboard-v2";

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

const STEPS: Array<{
  key: StepKey;
  num: number;
  title: string;
  short: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: "business",
    num: 1,
    title: "Business Info",
    short: "Business Info",
    desc: "Add your business name, location, type and contact details.",
    icon: MapPin,
  },
  {
    key: "inventory",
    num: 2,
    title: "Mapping (Category)",
    short: "Mapping",
    desc: "Map your services / products with category and sub category.",
    icon: LayoutGrid,
  },
  {
    key: "subscription",
    num: 3,
    title: "Subscription (Plan)",
    short: "Subscription",
    desc: "Choose a plan and start receiving quality leads.",
    icon: Crown,
  },
];

function VendorJoinPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => readDraft());
  const [openSheet, setOpenSheet] = useState<StepKey | null>(null);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingInv, setSavingInv] = useState(false);

  useEffect(() => saveDraft(draft), [draft]);

  // If user returns from Cashfree with cf_sub_order, auto-open subscription
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("cf_sub_order")) {
      setOpenSheet("subscription");
    }
  }, []);

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
      const { error } = await supabase.from("vendors").upsert(payload, { onConflict: "user_id" });
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
        const rows = draft.items.map((item_id) => ({
          vendor_id: vendor.id,
          item_id,
        }));
        const { error } = await supabase.from("vendor_item_mappings").insert(rows);
        if (error) throw error;
      }
      await supabase
        .from("vendors")
        .update({ onboarding_step: 3 })
        .eq("id", vendor.id);
      setDraft({ ...draft, completed: { ...draft.completed, inventory: true } });
      toast.success("Inventory saved");
      setOpenSheet(null);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingInv(false);
    }
  };

  const onSubscribed = () => {
    setDraft({ ...draft, completed: { ...draft.completed, subscription: true } });
    setOpenSheet(null);
    setTimeout(() => navigate({ to: "/vendor/dashboard" }), 800);
  };

  const canOpen = (k: StepKey) => {
    if (k === "business") return true;
    if (k === "inventory") return draft.completed.business;
    return draft.completed.business && draft.completed.inventory;
  };

  const activeStepNum = draft.completed.business
    ? draft.completed.inventory
      ? 3
      : 2
    : 1;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/quick" })}
          className="h-9 w-9 rounded-full grid place-items-center hover:bg-neutral-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-neutral-900">Vendor Onboarding</h1>
          <p className="text-xs text-neutral-500">{completedCount}/3 steps complete</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-5">
        {/* Hero card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 p-5 overflow-hidden">
          <div className="max-w-[62%]">
            <h2 className="text-2xl font-extrabold text-neutral-900 leading-tight">
              Grow Your Business
              <br />
              Get More Leads
            </h2>
            <p className="text-sm text-neutral-700 mt-2 leading-snug">
              Join thousands of vendors and grow your business with real-time leads.
            </p>
          </div>
          <div className="absolute right-2 top-3 text-6xl">🏪</div>
        </div>

        {/* Step tracker */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-neutral-200" />
            {STEPS.map((s) => {
              const done = draft.completed[s.key];
              const active = activeStepNum === s.num;
              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`h-8 w-8 rounded-full grid place-items-center font-bold text-sm border-2 ${
                      done
                        ? "bg-green-500 border-green-500 text-white"
                        : active
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-neutral-300 text-neutral-500"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <div
                    className={`text-[11px] font-semibold text-center leading-tight ${
                      active ? "text-amber-600" : "text-neutral-700"
                    }`}
                  >
                    {s.short}
                    <br />
                    {s.key === "inventory" && "(Category)"}
                    {s.key === "subscription" && "(Plan)"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Your Onboarding */}
        <div>
          <h3 className="text-xl font-extrabold text-neutral-900">Complete Your Onboarding</h3>
          <p className="text-sm text-neutral-500 mb-4">Just 3 simple steps to start getting leads</p>

          <div className="relative">
            <div className="absolute left-[15px] top-6 bottom-6 w-px bg-neutral-200" />
            <div className="space-y-3">
              {STEPS.map((s) => {
                const done = draft.completed[s.key];
                const enabled = canOpen(s.key);
                return (
                  <div key={s.key} className="flex items-start gap-3">
                    <div
                      className={`relative z-10 h-8 w-8 rounded-full grid place-items-center font-bold text-sm shrink-0 ${
                        done
                          ? "bg-green-500 text-white"
                          : enabled
                            ? "bg-amber-500 text-white"
                            : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : s.num}
                    </div>
                    <button
                      type="button"
                      disabled={!enabled}
                      onClick={() => setOpenSheet(s.key)}
                      className={`flex-1 rounded-2xl border p-3.5 flex items-center gap-3 text-left ${
                        enabled
                          ? "bg-white border-neutral-200 hover:border-amber-400"
                          : "bg-neutral-100 border-neutral-200 opacity-60"
                      }`}
                    >
                      <div className="h-12 w-12 rounded-2xl bg-amber-50 grid place-items-center text-amber-600 shrink-0">
                        <s.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-neutral-900">{s.title}</div>
                        <p className="text-xs text-neutral-500 leading-snug">{s.desc}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-amber-500 shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Safety footer */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-400 grid place-items-center text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-neutral-900">Your Information is Safe</div>
            <div className="text-xs text-neutral-600">We never share your data with anyone.</div>
          </div>
          <Lock className="h-5 w-5 text-amber-600" />
        </div>
      </main>

      {/* Sheets */}
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

      <Drawer open={openSheet === "subscription"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <DrawerContent className="max-h-[95vh]">
          <div className="overflow-y-auto">
            <SubscriptionSheet onPaid={onSubscribed} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
