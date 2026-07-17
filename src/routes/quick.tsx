import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Wrench, MapPin, ChevronDown, ChevronRight, Star, ShieldCheck, Users, Send,
  Mic, Sparkles, X,
} from "lucide-react";
import { QuickServiceMap, type QuickMapVendor } from "@/components/QuickServiceMap";
import { LocationPickerSheet, type PickedLocation } from "@/components/LocationPickerSheet";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FindingVendorOverlay } from "@/components/FindingVendorOverlay";
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

/* -------------------------------- Types ---------------------------------- */
type DBCategory = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number | null;
  keywords: string[] | null;
  type_id: string | null;
};
type DBItem = {
  id: string;
  name: string;
  category_id: string;
  image_url: string | null;
  keywords: string[] | null;
};
type RecentSub = { id: string; name: string; image: string | null };

const SERVICE_TYPE_ID = "8a13aacc-a4d1-4c93-8556-fddd8f0a67a3";

const DEMO_VENDORS: QuickMapVendor[] = [
  { id: "v1", name: "Ravi Plumber", avatar: avatarRaj, x: 22, y: 40, area: "Sadar", km: 0.4, status: "Online" },
  { id: "v2", name: "Amit Carpenter", avatar: avatarAryan, x: 78, y: 42, area: "Karol Bagh", km: 0.6, status: "Online" },
];

/** True when the string looks like a short emoji/symbol rather than a URL. */
function isEmojiLike(s: string | null | undefined): boolean {
  if (!s) return false;
  if (s.startsWith("http")) return false;
  // 1-4 codepoints, no whitespace
  return [...s].length <= 4 && !/\s/.test(s);
}

/* -------------------------------- Page ----------------------------------- */
export function QuickPage() {
  const { profile } = useAuth();
  const { requireAuth } = useAuthGate();
  const geo = useGeolocation();
  const [, setActiveType] = useActiveTypeId();

  useEffect(() => { setActiveType("service"); }, [setActiveType]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [variationBySub, setVariationBySub] = useState<Record<string, string>>({});
  const [variationSheet, setVariationSheet] = useState<DBCategory | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [finder, setFinder] = useState<{ leadId: string; category: string; categoryImage: string | null } | null>(null);
  const [recent, setRecent] = useState<RecentSub[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("ko-recent-subs") ?? "[]")); } catch { /* noop */ }
  }, []);

  /* ------------------------ Data: admin-managed catalog ------------------ */
  const catQ = useQuery({
    queryKey: ["quick-service-categories"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,image_url,icon,parent_id,sort_order,keywords,type_id")
        .eq("is_active", true)
        .eq("type_id", SERVICE_TYPE_ID)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DBCategory[];
    },
    staleTime: 60_000,
  });

  const rootCats = useMemo(() => (catQ.data ?? []).filter((c) => !c.parent_id), [catQ.data]);
  const allSubs = useMemo(() => (catQ.data ?? []).filter((c) => !!c.parent_id), [catQ.data]);

  // Default selection to first root when data lands
  useEffect(() => {
    if (!selectedRoot && rootCats.length > 0) setSelectedRoot(rootCats[0].id);
  }, [rootCats, selectedRoot]);

  const visibleSubs = useMemo(
    () => allSubs.filter((s) => s.parent_id === selectedRoot),
    [allSubs, selectedRoot],
  );

  // Items (used for variations + search overlay live mode)
  const itemsQ = useQuery({
    queryKey: ["quick-service-items"],
    queryFn: async (): Promise<DBItem[]> => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("id,name,category_id,image_url,keywords")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DBItem[];
    },
    staleTime: 60_000,
  });

  const itemsBySub = useMemo(() => {
    const m = new Map<string, DBItem[]>();
    (itemsQ.data ?? []).forEach((it) => {
      const arr = m.get(it.category_id) ?? [];
      arr.push(it);
      m.set(it.category_id, arr);
    });
    return m;
  }, [itemsQ.data]);

  /* ------------------------------ Location ------------------------------- */
  const effectiveCenter = pickedLocation
    ? { lat: pickedLocation.lat, lng: pickedLocation.lng }
    : (geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null);
  const effectiveLabel = pickedLocation?.address ?? geo.label ?? "Delhi";
  const shortLocation = useMemo(() => {
    const s = effectiveLabel || "Delhi";
    return s.split(",")[0].trim().slice(0, 18);
  }, [effectiveLabel]);

  /* ---------------------------- Lead creation ---------------------------- */
  const createLead = async (sub: DBCategory, variation: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); return null; }
    const { data: prof } = await supabase
      .from("customers")
      .select("name, phone, address")
      .eq("user_id", user.id)
      .maybeSingle();
    const leadPayload = {
      customer_id: user.id,
      customer_name: (prof as { name?: string } | null)?.name ?? null,
      customer_phone: (prof as { phone?: string } | null)?.phone ?? null,
      sub_category_name: sub.name,
      item_names: [variation],
      note: `${sub.name} · ${variation}`,
      address: pickedLocation?.address ?? (prof as { address?: string } | null)?.address ?? geo.label ?? null,
      lat: effectiveCenter?.lat ?? geo.lat,
      lng: effectiveCenter?.lng ?? geo.lng,
      search_radius_km: 10,
      max_slots: 5,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from("leads").insert(leadPayload as any).select("id").single();
    if (error) throw error;
    return (data as { id: string } | null)?.id ?? null;
  };

  const pushRecent = (sub: DBCategory) => {
    try {
      const raw = localStorage.getItem("ko-recent-subs");
      const arr: RecentSub[] = raw ? JSON.parse(raw) : [];
      const next = [{ id: sub.id, name: sub.name, image: sub.image_url }, ...arr.filter((r) => r.id !== sub.id)].slice(0, 8);
      localStorage.setItem("ko-recent-subs", JSON.stringify(next));
      setRecent(next);
    } catch { /* noop */ }
  };

  const handleFindVendor = async (sub: DBCategory) => {
    requireAuth(async () => {
      const items = itemsBySub.get(sub.id) ?? [];
      const variation = variationBySub[sub.id];
      // Always show variation sheet when catalog has items — user needs to pick.
      if (!variation && items.length > 0) { setVariationSheet(sub); return; }
      const useVariation = variation ?? sub.name;
      setSubmitting(sub.id);
      try {
        const leadId = await createLead(sub, useVariation);
        pushRecent(sub);
        if (!leadId) throw new Error("Could not create lead");
        setFinder({ leadId, category: sub.name, categoryImage: sub.image_url });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not send request");
      } finally {
        setSubmitting(null);
      }
    });
  };

  /* --------- SearchOverlay quick-pick → treat as Find Vendor click -------- */
  const handleSearchPick = async (pick: { subId: string; subName: string; itemIds: string[]; label: string; image?: string | null }) => {
    setSearchOpen(false);
    const sub = allSubs.find((s) => s.id === pick.subId);
    const target: DBCategory = sub ?? {
      id: pick.subId, name: pick.subName, slug: null,
      image_url: pick.image ?? null, icon: null, parent_id: null,
      sort_order: 0, keywords: null, type_id: SERVICE_TYPE_ID,
    };
    // If user picked a specific item, use its label as variation, else defer to sheet
    if (pick.itemIds.length > 0) {
      setVariationBySub((prev) => ({ ...prev, [target.id]: pick.label }));
      requireAuth(async () => {
        setSubmitting(target.id);
        try {
          const leadId = await createLead(target, pick.label);
          if (leadId) setFinder({ leadId, category: target.name, categoryImage: target.image_url });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not send request");
        } finally { setSubmitting(null); }
      });
    } else {
      // Open the sub card + variation sheet
      if (sub?.parent_id) setSelectedRoot(sub.parent_id);
      setExpandedSub(target.id);
      setVariationSheet(target);
    }
  };

  /* --------------------------------- UI ---------------------------------- */
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
            onClick={() => setSearchOpen(true)}
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

        {/* Root category tiles — HORIZONTAL SCROLL RAIL */}
        <div className="mt-3">
          <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {catQ.isLoading && rootCats.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[92px] h-[96px] rounded-2xl bg-white/70 animate-pulse" />
              ))
            ) : rootCats.map((c) => {
              const isActive = selectedRoot === c.id;
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedRoot(c.id)}
                  className={`relative shrink-0 snap-start rounded-2xl bg-white p-2.5 flex flex-col items-center justify-center gap-1.5 w-[92px] h-[96px] border-2 transition-colors ${
                    isActive ? "border-orange-400 bg-orange-50/60" : "border-transparent"
                  }`}
                >
                  {isActive && (
                    <motion.span layoutId="root-cat-glow" className="absolute inset-0 rounded-2xl ring-2 ring-orange-300/60 pointer-events-none" transition={{ type: "spring", stiffness: 350, damping: 28 }} />
                  )}
                  <CategoryGlyph cat={c} active={isActive} size={28} />
                  <span className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 ${isActive ? "text-orange-600" : "text-slate-700"}`}>
                    {c.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Recent History rail */}
        {recent.length > 0 && (
          <>
            <div className="px-4 pt-5 flex items-center justify-between">
              <span className="font-semibold text-[15px] text-slate-800">Recent</span>
              <button
                onClick={() => { localStorage.removeItem("ko-recent-subs"); setRecent([]); }}
                className="text-orange-500 text-xs font-semibold"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recent.map((r) => {
                const full = allSubs.find((s) => s.id === r.id);
                return (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { if (full) { setExpandedSub(full.id); setTimeout(() => handleFindVendor(full), 40); } }}
                    className="shrink-0 w-[112px] rounded-2xl bg-white border border-slate-200 p-2 flex flex-col items-center gap-1.5 shadow-[0_4px_12px_-8px_rgba(0,0,0,0.2)]"
                  >
                    <span className="h-14 w-14 rounded-xl overflow-hidden bg-amber-50 grid place-items-center">
                      {r.image && r.image.startsWith("http") ? (
                        <img src={r.image} alt="" className="h-full w-full object-cover" />
                      ) : isEmojiLike(r.image) ? (
                        <span className="text-3xl">{r.image}</span>
                      ) : (
                        <Wrench className="h-6 w-6 text-orange-500" />
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 text-center line-clamp-2 leading-tight">{r.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {/* Sub Category View label */}
        <div className="px-4 pt-5 pb-2">
          <span className="text-[13px] text-slate-500 font-medium">Sub Category View</span>
        </div>

        {/* Sub-category cards */}
        <div className="px-4 space-y-3">
          {visibleSubs.map((s) => {
            const isOpen = expandedSub === s.id;
            const variation = variationBySub[s.id];
            const items = itemsBySub.get(s.id) ?? [];
            const thumb = s.image_url && s.image_url.startsWith("http") ? s.image_url : null;
            return (
              <motion.article
                key={s.id}
                layout
                onClick={() => setExpandedSub(isOpen ? null : s.id)}
                className={`rounded-3xl overflow-hidden border-2 bg-white shadow-[0_10px_28px_-14px_rgba(0,0,0,0.28)] cursor-pointer ${
                  isOpen ? "border-orange-400 bg-orange-50/40" : "border-transparent"
                }`}
                transition={{ layout: { type: "spring", stiffness: 340, damping: 32 } }}
              >
                <div className="flex items-stretch gap-3 p-4">
                  <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-amber-50 to-white grid place-items-center overflow-hidden shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : isEmojiLike(s.image_url) ? (
                      <span className="text-6xl">{s.image_url}</span>
                    ) : (
                      <img src={svcCarpenter} alt="" className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-display font-extrabold text-[19px] text-slate-900 leading-tight line-clamp-2">{s.name}</h3>
                    <p className="text-[12px] text-slate-500 line-clamp-1">
                      {items.length > 0 ? `${items.length} services available` : "Tap to book a service"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-[13px] font-bold text-slate-800">4.7</span>
                      <span className="text-[11px] text-slate-400">nearby</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10.5px] text-slate-600">
                      <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /><span className="truncate">Verified</span></div>
                      <div className="flex items-center gap-1"><Users className="h-3 w-3 text-sky-500" /><span className="truncate">Available</span></div>
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
                          disabled={items.length === 0}
                        >
                          <span className="h-6 w-6 rounded-full bg-orange-100 grid place-items-center shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                          </span>
                          <span className="flex-1 text-left text-[13px] font-semibold text-slate-800 truncate">
                            {variation || (items.length === 0 ? "General request" : "Select variation")}
                          </span>
                          {items.length > 0 && <ChevronDown className="h-4 w-4 text-slate-500" />}
                        </button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          disabled={submitting === s.id}
                          onClick={(e) => { e.stopPropagation(); handleFindVendor(s); }}
                          className="h-11 px-4 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-[14px] flex items-center gap-2 shadow-[0_8px_18px_-6px_rgba(249,115,22,0.55)] disabled:opacity-60"
                        >
                          {submitting === s.id ? "Sending…" : "Find Vendor"}
                          <Send className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
          {!catQ.isLoading && visibleSubs.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 text-sm">
              No sub-categories yet in this section.
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Floating mic FAB (bottom-right, above dock) — opens search */}
      <button
        aria-label="Voice search"
        onClick={() => setSearchOpen(true)}
        className="fixed right-4 bottom-28 z-30 h-14 w-14 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[0_10px_24px_-8px_rgba(249,115,22,0.65)] grid place-items-center active:scale-95"
      >
        <span className="absolute inset-0 rounded-full bg-orange-400/60 animate-ping pointer-events-none" />
        <span className="absolute inset-0 rounded-full ring-2 ring-orange-300/50 pointer-events-none" />
        <Mic className="relative h-6 w-6" strokeWidth={2.3} />
      </button>

      {/* Sheets */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={itemsQ.data ?? []}
        subCategories={allSubs}
        onQuickPick={handleSearchPick}
      />
      <LocationPickerSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        bias={effectiveCenter ?? undefined}
        currentLabel={effectiveLabel}
        onPick={(loc) => { setPickedLocation(loc); setLocationSheetOpen(false); }}
      />

      {/* Variation bottom sheet */}
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
                  <h3 className="font-display font-bold text-slate-900 text-lg">{variationSheet.name}</h3>
                  <p className="text-xs text-slate-500">Select a variation</p>
                </div>
                <button onClick={() => setVariationSheet(null)} className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto">
                {(itemsBySub.get(variationSheet.id) ?? []).map((it) => {
                  const isSel = variationBySub[variationSheet.id] === it.name;
                  return (
                    <motion.button
                      key={it.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setVariationBySub((prev) => ({ ...prev, [variationSheet.id]: it.name }));
                        setVariationSheet(null);
                      }}
                      className={`rounded-xl border-2 py-4 px-3 text-[13px] font-semibold ${
                        isSel ? "border-orange-400 bg-orange-50 text-orange-600" : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {it.name}
                    </motion.button>
                  );
                })}
                {(itemsBySub.get(variationSheet.id) ?? []).length === 0 && (
                  <div className="col-span-2 text-center text-sm text-slate-500 py-6">
                    No variations yet. Tap Find Vendor to send a general request.
                  </div>
                )}
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
                {rootCats.map((c) => {
                  const active = selectedRoot === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedRoot(c.id); setAllCatsOpen(false); }}
                      className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 border-2 ${
                        active ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <CategoryGlyph cat={c} active={active} size={28} />
                      <span className="text-[11px] font-semibold text-center text-slate-700 line-clamp-2">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finding vendor radar overlay */}
      <FindingVendorOverlay
        open={!!finder}
        leadId={finder?.leadId ?? null}
        category={finder?.category ?? null}
        categoryImage={finder?.categoryImage ?? null}
        onComplete={() => setFinder(null)}
        onClose={() => setFinder(null)}
      />
    </div>
  );
}

/* ------------------------- CategoryGlyph helper ------------------------- */
function CategoryGlyph({ cat, active, size = 24 }: { cat: DBCategory; active: boolean; size?: number }) {
  const url = cat.image_url && cat.image_url.startsWith("http") ? cat.image_url : null;
  if (url) {
    return (
      <span
        className="rounded-xl overflow-hidden grid place-items-center bg-white"
        style={{ height: size + 4, width: size + 4 }}
      >
        <img src={url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  if (isEmojiLike(cat.image_url) || isEmojiLike(cat.icon)) {
    return <span style={{ fontSize: size }}>{cat.image_url ?? cat.icon}</span>;
  }
  return <Wrench style={{ height: size, width: size }} className={active ? "text-orange-500" : "text-slate-700"} strokeWidth={2.1} />;
}
