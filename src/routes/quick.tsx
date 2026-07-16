import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Wrench, MapPin, ChevronDown, ChevronRight, Star, ShieldCheck, Users, Send,
  Mic, Home, Landmark, Scale, Sparkles, X,
} from "lucide-react";
import { QuickServiceMap, type QuickMapVendor } from "@/components/QuickServiceMap";
import { LocationPickerSheet, type PickedLocation } from "@/components/LocationPickerSheet";
import { ProductServicePicker } from "@/components/ProductServicePicker";
import { useActiveTypeId } from "@/hooks/use-active-type";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import avatarUser from "@/assets/avatar-user.png";
import avatarRaj from "@/assets/avatar-raj.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import svcCarpenter from "@/assets/svc-carpenter.png";
import svcAc from "@/assets/svc-ac.png";
import svcElectronics from "@/assets/svc-electronics.png";

export const Route = createFileRoute("/quick")({
  head: () => ({
    meta: [
      { title: "Quick Service — Find Local Vendors Near You | Karo Online" },
      { name: "description", content: "Live map of nearby vendors. Pick a category, choose a variation, tap Find Vendor to get instant quotes from trusted local pros." },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/quick" }],
  }),
  component: QuickPage,
});

/* ----------------------------- Static catalog ----------------------------- */
type RootCat = { key: string; name: string; Icon: typeof Home; tint: string };
const ROOT_CATS: RootCat[] = [
  { key: "home", name: "Home Service", Icon: Home, tint: "text-orange-500" },
  { key: "finance", name: "Finance Service", Icon: Landmark, tint: "text-slate-700" },
  { key: "legal", name: "Legal Service", Icon: Scale, tint: "text-slate-700" },
  { key: "basic", name: "Basic Service", Icon: Wrench, tint: "text-slate-700" },
];

type SubCat = {
  key: string; title: string; tagline: string; img: string;
  rating: number; ratingCount: number; verified: number; available: number;
  variations: string[]; root: string;
};
const SUB_CATS: SubCat[] = [
  { key: "plumber", title: "Plumber Service", tagline: "All types of plumbing work", img: svcCarpenter, rating: 4.8, ratingCount: 120, verified: 120, available: 32, variations: ["Tap Repair", "Pipe Leakage", "Bathroom Fitting", "Water Tank"], root: "home" },
  { key: "carpenter", title: "Carpenter Service", tagline: "Wood work, furniture & repair", img: svcCarpenter, rating: 4.7, ratingCount: 98, verified: 98, available: 25, variations: ["Door Repair", "Furniture Making", "Modular Kitchen", "Wardrobe"], root: "home" },
  { key: "electrician", title: "Electrician Service", tagline: "All types of electrical work", img: svcElectronics, rating: 4.6, ratingCount: 85, verified: 85, available: 20, variations: ["Wiring", "Fan Repair", "Switch Board", "Inverter"], root: "home" },
  { key: "ac", title: "AC Service", tagline: "Installation, repair & gas fill", img: svcAc, rating: 4.8, ratingCount: 210, verified: 210, available: 44, variations: ["Split AC", "Window AC", "Gas Refill", "Deep Clean"], root: "home" },
];

const DEMO_VENDORS: QuickMapVendor[] = [
  { id: "v1", name: "Ravi Plumber", avatar: avatarRaj, x: 22, y: 40, area: "Sadar", km: 0.4, status: "Online" },
  { id: "v2", name: "Amit Carpenter", avatar: avatarAryan, x: 78, y: 42, area: "Karol Bagh", km: 0.6, status: "Online" },
];

/* -------------------------------- Page ----------------------------------- */
function QuickPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { requireAuth } = useAuthGate();
  const geo = useGeolocation();
  const [, setActiveType] = useActiveTypeId();

  useEffect(() => { setActiveType("service"); }, [setActiveType]);

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string>("home");
  const [expandedSub, setExpandedSub] = useState<string | null>("carpenter");
  const [variationBySub, setVariationBySub] = useState<Record<string, string>>({ carpenter: "Door Repair" });
  const [variationSheet, setVariationSheet] = useState<SubCat | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const effectiveCenter = pickedLocation
    ? { lat: pickedLocation.lat, lng: pickedLocation.lng }
    : (geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null);
  const effectiveLabel = pickedLocation?.address ?? geo.label ?? "Delhi";
  const shortLocation = useMemo(() => {
    const s = effectiveLabel || "Delhi";
    return s.split(",")[0].trim().slice(0, 18);
  }, [effectiveLabel]);

  const visibleSubs = SUB_CATS.filter((s) => s.root === selectedRoot);

  const handleFindVendor = async (sub: SubCat) => {
    requireAuth(async () => {
      const variation = variationBySub[sub.key];
      if (!variation) { setVariationSheet(sub); return; }
      setSubmitting(sub.key);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error("Please sign in"); return; }
        const { data: prof } = await supabase.from("customers").select("name, phone, address").eq("user_id", user.id).maybeSingle();
        const leadPayload = {
          customer_id: user.id,
          customer_name: (prof as { name?: string } | null)?.name ?? null,
          customer_phone: (prof as { phone?: string } | null)?.phone ?? null,
          sub_category_name: sub.title,
          item_names: [variation],
          note: `${sub.title} · ${variation}`,
          address: pickedLocation?.address ?? (prof as { address?: string } | null)?.address ?? geo.label ?? null,
          lat: effectiveCenter?.lat ?? geo.lat,
          lng: effectiveCenter?.lng ?? geo.lng,
          search_radius_km: 10,
          max_slots: 5,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("leads").insert(leadPayload as any);
        if (error) throw error;
        toast.success(`Vendor request sent for ${sub.title}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not send request");
      } finally {
        setSubmitting(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-[#f7f7f7] flex flex-col overflow-hidden">
      {/* ==================== TOP MAP ==================== */}
      <section className="relative flex-shrink-0" style={{ height: "34vh", minHeight: 240 }}>
        {(geo.status !== "loading" || pickedLocation) ? (
          <QuickServiceMap
            center={effectiveCenter}
            vendors={DEMO_VENDORS}
            userAvatar={profile?.avatar_url || avatarUser}
            userLabel={shortLocation}
            geoStatus={geo.status}
            showControls={false}
            onLocationTap={() => setLocationSheetOpen(true)}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-amber-50 to-white animate-pulse" />
        )}
      </section>

      {/* ==================== SCROLL AREA ==================== */}
      <div className="flex-1 overflow-y-auto pb-32 -mt-4 rounded-t-3xl bg-[#f7f7f7] relative z-10">
        {/* Type + Location pills */}
        <div className="px-4 pt-4 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setTypePickerOpen(true)}
            className="flex-1 h-12 rounded-full bg-white shadow-[0_4px_14px_-8px_rgba(0,0,0,0.2)] border border-black/5 flex items-center gap-2 px-4 active:shadow-sm"
          >
            <Wrench className="h-4 w-4 text-orange-500" />
            <span className="flex-1 text-left font-bold text-[15px] text-slate-800">Service</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setLocationSheetOpen(true)}
            className="flex-1 h-12 rounded-full bg-white shadow-[0_4px_14px_-8px_rgba(0,0,0,0.2)] border border-black/5 flex items-center gap-2 px-4"
          >
            <MapPin className="h-4 w-4 text-orange-500" />
            <span className="flex-1 text-left font-bold text-[15px] text-slate-800 truncate">{shortLocation}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </motion.button>
        </div>

        {/* All Categories header */}
        <div className="px-4 pt-5 flex items-center justify-between">
          <button onClick={() => setAllCatsOpen(true)} className="font-semibold text-[15px] text-slate-800">
            All Categories
          </button>
          <button onClick={() => setAllCatsOpen(true)} className="flex items-center gap-1 text-orange-500 text-sm font-semibold">
            View <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 4 root category tiles */}
        <div className="mt-3 px-4">
          <div className="grid grid-cols-4 gap-2.5">
            {ROOT_CATS.map((c) => {
              const isActive = selectedRoot === c.key;
              const Icon = c.Icon;
              return (
                <motion.button
                  key={c.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedRoot(c.key)}
                  className={`relative rounded-2xl bg-white p-2.5 flex flex-col items-center justify-center gap-1.5 h-[92px] border-2 transition-colors ${
                    isActive ? "border-orange-400 bg-orange-50/60" : "border-transparent"
                  }`}
                >
                  {isActive && (
                    <motion.span layoutId="root-cat-glow" className="absolute inset-0 rounded-2xl ring-2 ring-orange-300/60 pointer-events-none" transition={{ type: "spring", stiffness: 350, damping: 28 }} />
                  )}
                  <Icon className={`h-7 w-7 ${isActive ? "text-orange-500" : "text-slate-700"}`} strokeWidth={2.1} />
                  <span className={`text-[10.5px] font-semibold text-center leading-tight ${isActive ? "text-orange-600" : "text-slate-700"}`}>
                    {c.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Sub Category View label */}
        <div className="px-4 pt-5 pb-2">
          <span className="text-[13px] text-slate-500 font-medium">Sub Category View</span>
        </div>

        {/* Sub-category cards */}
        <div className="px-4 space-y-3">
          {visibleSubs.map((s) => {
            const isOpen = expandedSub === s.key;
            const variation = variationBySub[s.key];
            return (
              <motion.article
                key={s.key}
                layout
                onClick={() => setExpandedSub(isOpen ? null : s.key)}
                className={`rounded-2xl overflow-hidden border-2 bg-white shadow-[0_6px_18px_-10px_rgba(0,0,0,0.25)] cursor-pointer ${
                  isOpen ? "border-orange-400 bg-orange-50/40" : "border-transparent"
                }`}
                transition={{ layout: { type: "spring", stiffness: 340, damping: 32 } }}
              >
                <div className="flex items-stretch gap-3 p-3">
                  <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-amber-50 to-white grid place-items-center overflow-hidden shrink-0">
                    <img src={s.img} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-display font-extrabold text-[17px] text-slate-900 leading-tight truncate">{s.title}</h3>
                    <p className="text-[12px] text-slate-500 truncate">{s.tagline}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-[13px] font-bold text-slate-800">{s.rating}</span>
                      <span className="text-[11px] text-slate-400">({s.ratingCount})</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10.5px] text-slate-600">
                      <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /><span className="truncate">Verified {s.verified}</span></div>
                      <div className="flex items-center gap-1"><Users className="h-3 w-3 text-sky-500" /><span className="truncate">Available {s.available}</span></div>
                    </div>
                  </div>
                  {!isOpen && (
                    <div className="self-center h-8 w-8 rounded-full bg-white shadow grid place-items-center shrink-0">
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 34 }}
                      className="overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 pb-3 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setVariationSheet(s); }}
                          className="flex-1 h-11 rounded-xl bg-white border border-slate-200 flex items-center gap-2 px-3 active:scale-[0.98] transition-transform"
                        >
                          <span className="h-6 w-6 rounded-full bg-orange-100 grid place-items-center shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                          </span>
                          <span className="flex-1 text-left text-[13px] font-semibold text-slate-800 truncate">
                            {variation || "Select variation"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        </button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          disabled={submitting === s.key}
                          onClick={(e) => { e.stopPropagation(); handleFindVendor(s); }}
                          className="h-11 px-4 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-[14px] flex items-center gap-2 shadow-[0_8px_18px_-6px_rgba(249,115,22,0.55)] disabled:opacity-60"
                        >
                          {submitting === s.key ? "Sending…" : "Find Vendor"}
                          <Send className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
          {visibleSubs.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 text-sm">
              No sub-categories yet in this section.
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Floating mic FAB (bottom-right, above dock) */}
      <button
        aria-label="Voice search"
        onClick={() => navigate({ to: "/quicklegacy" })}
        className="fixed right-4 bottom-28 z-30 h-14 w-14 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[0_10px_24px_-8px_rgba(249,115,22,0.65)] grid place-items-center active:scale-95"
      >
        <Mic className="h-6 w-6" strokeWidth={2.3} />
      </button>

      {/* Sheets */}
      <ProductServicePicker open={typePickerOpen} onClose={() => setTypePickerOpen(false)} onCategoryPick={() => setTypePickerOpen(false)} />
      <LocationPickerSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        bias={effectiveCenter ?? undefined}
        currentLabel={effectiveLabel}
        onPick={(loc) => { setPickedLocation(loc); setLocationSheetOpen(false); }}
      />

      {/* Variation bottom sheet (inline lightweight) */}
      <AnimatePresence>
        {variationSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end"
            onClick={() => setVariationSheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-lg">{variationSheet.title}</h3>
                  <p className="text-xs text-slate-500">Select a variation</p>
                </div>
                <button onClick={() => setVariationSheet(null)} className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
                {variationSheet.variations.map((v) => {
                  const isSel = variationBySub[variationSheet.key] === v;
                  return (
                    <motion.button
                      key={v}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setVariationBySub((prev) => ({ ...prev, [variationSheet.key]: v }));
                        setVariationSheet(null);
                      }}
                      className={`rounded-xl border-2 py-4 px-3 text-[13px] font-semibold ${
                        isSel ? "border-orange-400 bg-orange-50 text-orange-600" : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {v}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Categories bottom sheet */}
      <AnimatePresence>
        {allCatsOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end"
            onClick={() => setAllCatsOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
              style={{ maxHeight: "80vh" }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h3 className="font-display font-bold text-slate-900 text-lg">All Categories</h3>
                <button onClick={() => setAllCatsOpen(false)} className="h-9 w-9 rounded-full grid place-items-center bg-black/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2.5 overflow-y-auto">
                {ROOT_CATS.map((c) => {
                  const Icon = c.Icon;
                  return (
                    <button
                      key={c.key}
                      onClick={() => { setSelectedRoot(c.key); setAllCatsOpen(false); }}
                      className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 border-2 ${
                        selectedRoot === c.key ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${selectedRoot === c.key ? "text-orange-500" : "text-slate-700"}`} />
                      <span className="text-[11px] font-semibold text-center text-slate-700">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
