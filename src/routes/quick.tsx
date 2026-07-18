import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { SubmittingRequestOverlay, type SubmitPhase } from "@/components/SubmittingRequestOverlay";
import { useActiveTypeId } from "@/hooks/use-active-type";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { getNearbyOnlineVendors } from "@/lib/quick-vendors.functions";
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
  group_tag: string | null;
};
type RecentSub = { id: string; name: string; image: string | null };

const SERVICE_TYPE_ID = "8a13aacc-a4d1-4c93-8556-fddd8f0a67a3";
const PRODUCT_TYPE_ID = "5db3a5c5-0c8e-4c86-8b43-ecc73a95e5ff";
const OTHER_TYPE_ID = "6761c6e5-7d35-4876-9cdc-01cee81a8c40";
type TypeCode = "service" | "product" | "other";
const TYPE_ID_BY_CODE: Record<TypeCode, string> = {
  service: SERVICE_TYPE_ID,
  product: PRODUCT_TYPE_ID,
  other: OTHER_TYPE_ID,
};
const QUICK_FALLBACK_CENTER = { lat: 28.6562, lng: 77.241 };

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
  const fetchNearbyVendors = useServerFn(getNearbyOnlineVendors);
  const geo = useGeolocation();
  const [, setActiveType] = useActiveTypeId();
  const [typeCode, setTypeCode] = useState<TypeCode>("service");

  useEffect(() => { setActiveType(typeCode); }, [typeCode, setActiveType]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [variationBySub, setVariationBySub] = useState<Record<string, string>>({});
  const [variationSheet, setVariationSheet] = useState<DBCategory | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<{
    phase: SubmitPhase;
    category: string | null;
    variation: string | null;
    error: string | null;
    retry: (() => void) | null;
  } | null>(null);
  const [finder, setFinder] = useState<{ leadId: string; category: string; categoryImage: string | null } | null>(null);
  const [recent, setRecent] = useState<RecentSub[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("ko-recent-subs") ?? "[]")); } catch { /* noop */ }
  }, []);

  /* ------------------------ Data: admin-managed catalog ------------------ */
  const catQ = useQuery({
    queryKey: ["quick-categories", typeCode],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,image_url,icon,parent_id,sort_order,keywords,type_id")
        .eq("is_active", true)
        .eq("type_id", TYPE_ID_BY_CODE[typeCode])
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DBCategory[];
    },
    staleTime: 60_000,
  });

  const rootCats = useMemo(() => (catQ.data ?? []).filter((c) => !c.parent_id), [catQ.data]);
  const allSubs = useMemo(() => (catQ.data ?? []).filter((c) => !!c.parent_id), [catQ.data]);

  // Reset root selection whenever the active type changes
  useEffect(() => { setSelectedRoot(null); setExpandedSub(null); }, [typeCode]);
  useEffect(() => {
    if (!selectedRoot && rootCats.length > 0) setSelectedRoot(rootCats[0].id);
  }, [rootCats, selectedRoot]);

  const visibleSubs = useMemo(
    () => allSubs.filter((s) => s.parent_id === selectedRoot),
    [allSubs, selectedRoot],
  );

  const selectedSub = useMemo(
    () => visibleSubs.find((s) => s.id === expandedSub) ?? visibleSubs[0] ?? null,
    [expandedSub, visibleSubs],
  );

  const selectedSubIcon = useMemo(() => {
    if (!selectedSub) return undefined;
    if (selectedSub.image_url?.startsWith("http")) return selectedSub.image_url;
    if (isEmojiLike(selectedSub.image_url)) return selectedSub.image_url ?? undefined;
    if (isEmojiLike(selectedSub.icon)) return selectedSub.icon ?? undefined;
    return undefined;
  }, [selectedSub]);

  // Auto-expand first sub whenever the visible list changes (so one card is always "selected")
  useEffect(() => {
    if (visibleSubs.length === 0) { setExpandedSub(null); return; }
    if (!expandedSub || !visibleSubs.some((s) => s.id === expandedSub)) {
      setExpandedSub(visibleSubs[0].id);
    }
  }, [visibleSubs, expandedSub]);

  // Items (used for variations + search overlay live mode)
  const itemsQ = useQuery({
    queryKey: ["quick-service-items"],
    queryFn: async (): Promise<DBItem[]> => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("id,name,category_id,image_url,keywords,group_tag")
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
  const mapCenter = effectiveCenter ?? QUICK_FALLBACK_CENTER;
  const effectiveLabel = pickedLocation?.address ?? geo.label ?? "Delhi";
  const shortLocation = useMemo(() => {
    const s = effectiveLabel || "Delhi";
    return s.split(",")[0].trim().slice(0, 18);
  }, [effectiveLabel]);

  /* ---------------------------- Lead creation ---------------------------- */
  const selectedMapItemIds = useMemo(() => {
    if (!selectedSub) return [];
    const items = itemsBySub.get(selectedSub.id) ?? [];
    const variation = variationBySub[selectedSub.id];
    return (variation ? items.filter((it) => it.name === variation) : items).map((it) => it.id);
  }, [itemsBySub, selectedSub, variationBySub]);

  const mapVendorsQ = useQuery({
    queryKey: [
      "quick-map-vendors",
      mapCenter.lat,
      mapCenter.lng,
      selectedSub?.id ?? null,
      selectedMapItemIds.join(","),
    ],
    queryFn: () => fetchNearbyVendors({
      data: {
        origin: mapCenter,
        radiusKm: 10,
        subCategoryId: selectedSub?.id ?? null,
        itemIds: selectedMapItemIds.slice(0, 50),
      },
    }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const mapVendors: QuickMapVendor[] = useMemo(() => {
    const rows = (mapVendorsQ.data as any)?.ok ? ((mapVendorsQ.data as any).vendors ?? []) : [];
    if (!rows.length) return selectedSub ? [] : DEMO_VENDORS;
    return rows.map((v: any, index: number) => ({
      id: String(v.id ?? v.user_id ?? index),
      name: v.business_name || v.owner_name || `${selectedSub?.name ?? "Service"} vendor`,
      avatar: v.avatar_url || avatarUser,
      x: 18 + ((index * 23) % 64),
      y: 30 + ((index * 17) % 42),
      area: v.area || (typeof v.km === "number" ? `${v.km.toFixed(1)} km away` : "Nearby"),
      km: typeof v.km === "number" ? v.km : undefined,
      status: v.is_online ? "Online" : "Office",
      lat: typeof v.lat === "number" ? v.lat : Number(v.lat),
      lng: typeof v.lng === "number" ? v.lng : Number(v.lng),
    }));
  }, [mapVendorsQ.data, selectedSub]);

  const createLead = async (sub: DBCategory, variation: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); return null; }
    const { data: prof } = await supabase
      .from("customers")
      .select("name, phone, address")
      .eq("user_id", user.id)
      .maybeSingle();
    const matchedItems = (itemsBySub.get(sub.id) ?? []).filter((it) => it.name === variation);
    const itemIds = matchedItems.map((it) => it.id);
    const leadPayload = {
      customer_id: user.id,
      customer_name: (prof as { name?: string } | null)?.name ?? null,
      customer_phone: (prof as { phone?: string } | null)?.phone ?? null,
      type_id: SERVICE_TYPE_ID,
      root_category_id: sub.parent_id ?? selectedRoot,
      sub_category_id: sub.id,
      sub_category_name: sub.name,
      item_ids: itemIds,
      item_names: [variation],
      group_name: matchedItems[0]?.group_tag ?? null,
      note: `${sub.name} · ${variation}`,
      address: pickedLocation?.address ?? (prof as { address?: string } | null)?.address ?? geo.label ?? null,
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      search_radius_km: 10,
      max_slots: 5,
      source: "quick_home",
      status: "new",
      vendor_types: ["wholesaler", "retailer", "manufacturer"],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from("leads").insert(leadPayload as any).select("id").single();
    if (error) throw error;
    const leadId = (data as { id: string } | null)?.id ?? null;
    if (leadId) {
      // Safety net: the DB trigger also broadcasts ring 0; this keeps the
      // customer radar reliable even if a scheduled fan-out is delayed.
      void (async () => {
        try {
          await supabase.rpc("broadcast_next_lead_batch", {
            _lead_id: leadId,
            _batch_size: 5,
            _ring_index: 0,
          });
        } catch {
          // Non-blocking: the DB trigger/scheduler still handles fan-out.
        }
      })();
    }
    return leadId;
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

  const submitLead = async (sub: DBCategory, useVariation: string) => {
    const attempt = async () => {
      setSubmitting(sub.id);
      setSubmitState({ phase: "submitting", category: sub.name, variation: useVariation, error: null, retry: null });
      try {
        const leadId = await createLead(sub, useVariation);
        pushRecent(sub);
        if (!leadId) throw new Error("Could not create lead");
        setSubmitState({ phase: "success", category: sub.name, variation: useVariation, error: null, retry: null });
        toast.success("Request submitted — finding vendors");
        // brief success celebration, then hand off to the radar
        setTimeout(() => {
          setSubmitState(null);
          setFinder({ leadId, category: sub.name, categoryImage: sub.image_url });
        }, 700);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not send request";
        setSubmitState({ phase: "error", category: sub.name, variation: useVariation, error: msg, retry: attempt });
      } finally {
        setSubmitting(null);
      }
    };
    await attempt();
  };

  const handleFindVendor = async (sub: DBCategory) => {
    requireAuth(async () => {
      const items = itemsBySub.get(sub.id) ?? [];
      const variation = variationBySub[sub.id];
      if (!variation && items.length > 0) { setVariationSheet(sub); return; }
      await submitLead(sub, variation ?? sub.name);
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
    if (pick.itemIds.length > 0) {
      setVariationBySub((prev) => ({ ...prev, [target.id]: pick.label }));
      requireAuth(async () => { await submitLead(target, pick.label); });
    } else {
      if (sub?.parent_id) setSelectedRoot(sub.parent_id);
      setExpandedSub(target.id);
      setVariationSheet(target);
    }
  };


  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="fixed inset-0 bg-[#f5f6f8] flex flex-col overflow-hidden">
      {/* ==================== MAP HERO (top ~45%) with GLASS overlays ==================== */}
      <section className="relative flex-shrink-0" style={{ height: "46vh", minHeight: 320 }}>
        {(geo.status !== "loading" || pickedLocation) ? (
          <QuickServiceMap
            center={mapCenter}
            vendors={mapVendors}
            userAvatar={profile?.avatar_url || avatarUser}
            userLabel={shortLocation}
            geoStatus={geo.status}
            showControls={false}
            radiusKm={10}
            categoryIcon={selectedSubIcon}
            onLocationTap={() => setLocationSheetOpen(true)}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-amber-50 to-white animate-pulse" />
        )}

        {/* Glass Type + Location header — floats on the map */}
        <div className="absolute left-3 right-3 top-3 z-20 flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setSearchOpen(true)}
            className="flex-1 h-11 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.35)] flex items-center gap-2 px-4"
          >
            <Wrench className="h-4 w-4 text-orange-500" />
            <span className="flex-1 text-left font-bold text-[14px] text-slate-900 drop-shadow-sm">Service</span>
            <ChevronDown className="h-4 w-4 text-slate-700" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setLocationSheetOpen(true)}
            className="flex-1 h-11 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.35)] flex items-center gap-2 px-4"
          >
            <MapPin className="h-4 w-4 text-orange-500" />
            <span className="flex-1 text-left font-bold text-[14px] text-slate-900 truncate drop-shadow-sm">{shortLocation}</span>
            <ChevronDown className="h-4 w-4 text-slate-700" />
          </motion.button>
        </div>

        {/* Floating GLASS category rail — pinned near the bottom of the map */}
        <div className="absolute inset-x-0 bottom-2 z-20 px-2">
            <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
              {catQ.isLoading && rootCats.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-[52px] h-[68px] rounded-2xl bg-white/35 animate-pulse" />
                ))
              ) : (
                <>
                  {rootCats.map((c) => {
                    const isActive = selectedRoot === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setSelectedRoot(c.id)}
                        className={`relative shrink-0 snap-start flex flex-col items-center justify-start gap-0.5 transition-all ${
                          isActive
                            ? "w-[56px] h-[72px]"
                            : "w-[52px] h-[68px]"
                        }`}
                      >
                        <span className={`relative h-10 w-10 rounded-2xl grid place-items-center backdrop-blur-xl border shadow-[0_8px_18px_-10px_rgba(0,0,0,0.45)] ${
                          isActive ? "bg-white/90 border-amber-400" : "bg-white/45 border-white/60"
                        }`}>
                          {isActive && (
                            <motion.span
                              layoutId="root-cat-glow"
                              className="absolute -inset-0.5 rounded-2xl ring-2 ring-amber-300/80 pointer-events-none"
                              transition={{ type: "spring", stiffness: 340, damping: 28 }}
                            />
                          )}
                          <CategoryGlyph cat={c} active={isActive} size={isActive ? 22 : 20} />
                        </span>
                        <span className={`w-full text-[8.5px] font-black text-center leading-[1.05] line-clamp-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] ${
                          isActive ? "text-orange-700" : "text-slate-900"
                        }`}>
                          {c.name}
                        </span>
                      </motion.button>
                    );
                  })}
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setAllCatsOpen(true)}
                    className="shrink-0 snap-start w-[52px] h-[68px] flex flex-col items-center justify-start gap-0.5"
                  >
                    <span className="h-10 w-10 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 grid place-items-center shadow-[0_8px_18px_-10px_rgba(0,0,0,0.45)]">
                      <ChevronRight className="h-4 w-4 text-slate-700" />
                    </span>
                    <span className="text-[8.5px] font-black text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">More</span>
                  </motion.button>
                </>
              )}
            </div>
        </div>
      </section>

      {/* ==================== SCROLL AREA (Recent + Sub cards) ==================== */}
      <div className="flex-1 overflow-y-auto pb-32 bg-[#f5f6f8] relative z-10">

        {/* Recent History rail */}
        {recent.length > 0 && (
          <>
            <div className="px-4 pt-4 flex items-center justify-between">
              <span className="font-semibold text-[14px] text-slate-800">Recent</span>
              <button
                onClick={() => { localStorage.removeItem("ko-recent-subs"); setRecent([]); }}
                className="text-orange-500 text-xs font-semibold"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recent.map((r) => {
                const full = allSubs.find((s) => s.id === r.id);
                return (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { if (full) { setExpandedSub(full.id); setTimeout(() => handleFindVendor(full), 40); } }}
                    className="shrink-0 h-9 px-3 rounded-full bg-white border border-slate-200 flex items-center gap-2 shadow-sm"
                  >
                    {r.image && r.image.startsWith("http") ? (
                      <img src={r.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : isEmojiLike(r.image) ? (
                      <span className="text-base">{r.image}</span>
                    ) : (
                      <Wrench className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    <span className="text-[12px] font-semibold text-slate-700 whitespace-nowrap">{r.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {/* Recommended header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="font-semibold text-[15px] text-slate-900">Recommended</span>
          <span className="text-[11px] text-slate-400">{visibleSubs.length} services</span>
        </div>

        {/* Sub-category cards — compact by default, selected expands to premium card */}
        <div className="px-4 space-y-2.5">
          {visibleSubs.map((s) => {
            const isOpen = expandedSub === s.id;
            const variation = variationBySub[s.id];
            const items = itemsBySub.get(s.id) ?? [];
            const thumb = s.image_url && s.image_url.startsWith("http") ? s.image_url : null;
            const variationRequired = items.length > 0;
            const canFind = !variationRequired || !!variation;
            return (
              <motion.article
                key={s.id}
                layout
                onClick={() => setExpandedSub(s.id)}
                className={`rounded-2xl overflow-hidden bg-white cursor-pointer transition-shadow ${
                  isOpen
                    ? "border-2 border-amber-400 shadow-[0_16px_36px_-16px_rgba(217,119,6,0.55)]"
                    : "border border-slate-200 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.15)]"
                }`}
                transition={{ layout: { type: "spring", stiffness: 340, damping: 32 } }}
              >
                <div className={`flex items-center gap-3 ${isOpen ? "p-3.5" : "p-2.5"}`}>
                  <motion.div
                    layout
                    className={`rounded-xl bg-gradient-to-br from-amber-50 to-white grid place-items-center overflow-hidden shrink-0 ${
                      isOpen ? "w-24 h-24" : "w-14 h-14"
                    }`}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : isEmojiLike(s.image_url) ? (
                      <span className={isOpen ? "text-5xl" : "text-2xl"}>{s.image_url}</span>
                    ) : (
                      <img src={svcCarpenter} alt="" className="h-full w-full object-contain" />
                    )}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-display font-bold text-slate-900 leading-tight line-clamp-1 ${
                      isOpen ? "text-[17px]" : "text-[14px]"
                    }`}>{s.name}</h3>
                    {isOpen ? (
                      <>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-[12px] font-bold text-slate-800">4.8</span>
                          <span className="text-[11px] text-slate-400">(120)</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] text-slate-600">
                          <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /><span>98 Verified</span></div>
                          <div className="flex items-center gap-1"><Users className="h-3 w-3 text-sky-500" /><span>56 Available</span></div>
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-orange-500" /><span>0.6 km</span></div>
                          <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /><span>{items.length || "—"} options</span></div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {items.length > 0 ? `${items.length} services · Tap to select` : "Tap to book"}
                      </p>
                    )}
                  </div>
                  {!isOpen && (
                    <div className="h-7 w-7 rounded-full bg-slate-50 grid place-items-center shrink-0">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
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
                          onClick={(e) => { e.stopPropagation(); if (variationRequired) setVariationSheet(s); }}
                          disabled={!variationRequired}
                          className="flex-1 h-11 rounded-xl bg-white border border-slate-200 flex items-center gap-2 px-3 active:scale-[0.98] transition-transform disabled:opacity-70"
                        >
                          <span className="h-6 w-6 rounded-full bg-orange-100 grid place-items-center shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                          </span>
                          <span className={`flex-1 text-left text-[13px] font-semibold truncate ${
                            variation ? "text-orange-600" : "text-slate-700"
                          }`}>
                            {variation || (variationRequired ? "Select variation" : "General request")}
                          </span>
                          {variationRequired && <ChevronDown className="h-4 w-4 text-slate-500" />}
                        </button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          disabled={submitting === s.id || !canFind}
                          onClick={(e) => { e.stopPropagation(); handleFindVendor(s); }}
                          className={`h-11 px-4 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all ${
                            canFind
                              ? "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-[0_8px_18px_-6px_rgba(249,115,22,0.55)]"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          } disabled:opacity-60`}
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
      <SubmittingRequestOverlay
        open={!!submitState}
        phase={submitState?.phase ?? "submitting"}
        category={submitState?.category ?? null}
        variation={submitState?.variation ?? null}
        errorMessage={submitState?.error ?? null}
        onRetry={() => submitState?.retry?.()}
        onClose={() => setSubmitState(null)}
      />

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
