import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Wrench, MapPin, ChevronDown, ChevronRight, Star, ShieldCheck, Users, Send,
  Mic, Sparkles, X, Store, ArrowRight, LayoutGrid, Map as MapIcon,
} from "lucide-react";

import { QuickServiceMap, type QuickMapVendor } from "@/components/QuickServiceMap";
import { HomeBannerRail } from "@/components/HomeBannerRail";
import { HomeVideoRail } from "@/components/HomeVideoRail";
import { TypeCategoryDeck } from "@/components/TypeCategoryDeck";



import { LocationPickerSheet, type PickedLocation } from "@/components/LocationPickerSheet";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FindingVendorOverlay } from "@/components/FindingVendorOverlay";
import { SubmittingRequestOverlay, type SubmitPhase } from "@/components/SubmittingRequestOverlay";
import { VendorListSheet } from "@/components/VendorListSheet";
import { VendorChatHub } from "@/components/VendorChatHub";
import { useActiveTypeId } from "@/hooks/use-active-type";
import { useActiveInquiry, setActiveInquiry } from "@/hooks/use-active-inquiry";
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
  const { inquiry } = useActiveInquiry();
  const { requireAuth } = useAuthGate();
  const fetchNearbyVendors = useServerFn(getNearbyOnlineVendors);
  const geo = useGeolocation();
  const [, setActiveType] = useActiveTypeId();
  const [typeCode, setTypeCode] = useState<TypeCode>("service");

  useEffect(() => { setActiveType(typeCode); }, [typeCode, setActiveType]);

  const [searchOpen, setSearchOpen] = useState(false);
  /** Home has two views: the existing content home, and the new map home. */
  const [homeView, setHomeView] = useState<"content" | "map">("content");
  useEffect(() => {
    const saved = localStorage.getItem("ko-home-view");
    if (saved === "map" || saved === "content") setHomeView(saved);
  }, []);
  useEffect(() => { localStorage.setItem("ko-home-view", homeView); }, [homeView]);
  const isMapView = homeView === "map";

  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState(1);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [variationBySub, setVariationBySub] = useState<Record<string, string>>({});
  const [variationSheet, setVariationSheet] = useState<DBCategory | null>(null);
  const [variationGender, setVariationGender] = useState<string | null>(null);
  useEffect(() => { setVariationGender(null); }, [variationSheet?.id]);


  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const [rootSheet, setRootSheet] = useState<DBCategory | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<{
    phase: SubmitPhase;
    category: string | null;
    variation: string | null;
    error: string | null;
    retry: (() => void) | null;
  } | null>(null);
  const [finder, setFinder] = useState<{ leadId: string; category: string; categoryImage: string | null } | null>(null);
  const [hub, setHub] = useState<{ leadId: string; category: string; categoryImage: string | null } | null>(null);
  const [allVendorsOpen, setAllVendorsOpen] = useState(false);
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
    if (selectedRoot || rootCats.length === 0) return;
    const preferredHome = rootCats.find((c) => /home/i.test(c.name));
    setSelectedRoot((preferredHome ?? rootCats[0]).id);
  }, [rootCats, selectedRoot]);

  const visibleSubs = useMemo(
    () => allSubs.filter((s) => s.parent_id === selectedRoot),
    [allSubs, selectedRoot],
  );

  /** Every root category → its sub-categories (drives the horizontal decks). */
  const subsByRoot = useMemo(() => {
    const m = new Map<string, DBCategory[]>();
    allSubs.forEach((s) => {
      if (!s.parent_id) return;
      const arr = m.get(s.parent_id) ?? [];
      arr.push(s);
      m.set(s.parent_id, arr);
    });
    return m;
  }, [allSubs]);



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
      radiusKm,
      selectedSub?.id ?? null,
      selectedMapItemIds.join(","),
    ],
    queryFn: () => fetchNearbyVendors({
      data: {
        origin: mapCenter,
        radiusKm,
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
      type_id: TYPE_ID_BY_CODE[typeCode],
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
      search_radius_km: radiusKm,
      radius_km: radiusKm,
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
      // Auto-match: instantly attach every eligible in-radius vendor as "accepted"
      // so the customer sees profiles right after the radar animation — no vendor
      // action needed. The DB broadcast trigger still fires in parallel to notify
      // vendors via push/whatsapp.
      void (async () => {
        try {
          await supabase.rpc("auto_match_lead_vendors", { _lead_id: leadId });
        } catch { /* non-blocking */ }
        try {
          await supabase.rpc("broadcast_next_lead_batch", {
            _lead_id: leadId,
            _batch_size: 5,
            _ring_index: 0,
          });
        } catch { /* non-blocking */ }
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

  /* ---- Compact circular root-category rail (shared by both home views) ---- */
  const circleRail = (
    <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
      {catQ.isLoading && rootCats.length === 0 ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[52px] h-[62px] rounded-2xl bg-white/40 animate-pulse" />
        ))
      ) : (
        <>
          {rootCats.map((c) => {
            const isActive = selectedRoot === c.id;
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => { setSelectedRoot(c.id); setRootSheet(c); }}
                className="relative shrink-0 snap-start w-[52px] flex flex-col items-center justify-start gap-0.5"
              >
                <span className={`relative h-10 w-10 rounded-full grid place-items-center backdrop-blur-2xl border shadow-[0_6px_14px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.9)] ${
                  isActive ? "bg-white/95 border-amber-400" : "bg-white/70 border-white/80"
                }`}>
                  <CategoryGlyph cat={c} active={isActive} size={19} />
                </span>
                <span className={`w-full text-[8px] font-black text-center leading-[1.05] line-clamp-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] ${
                  isActive ? "text-orange-700" : "text-slate-900"
                }`}>
                  {c.name}
                </span>
              </motion.button>
            );
          })}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setAllCatsOpen(true)}
            className="shrink-0 snap-start w-[52px] flex flex-col items-center justify-start gap-0.5"
          >
            <span className="h-10 w-10 rounded-full bg-white/70 backdrop-blur-2xl border border-white/80 grid place-items-center shadow-[0_6px_14px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <ChevronRight className="h-4 w-4 text-slate-700" />
            </span>
            <span className="text-[8px] font-black text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">More</span>
          </motion.button>
        </>
      )}
    </div>
  );

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="fixed inset-0 bg-[#f5f6f8] flex flex-col overflow-hidden">
      {/* ==================== CONTENT-FEED HEADER (Map View = no map) ==================== */}
      {isMapView && (
        <header className="flex-shrink-0 bg-white border-b border-slate-100 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5">
          <div className="flex items-center gap-2">
            <Link to="/profile" className="shrink-0">
              <img
                src={profile?.avatar_url || avatarUser}
                alt="Profile"
                className="h-11 w-11 rounded-full object-cover border-2 border-orange-200 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.4)]"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/profile" className="block truncate text-[15px] font-black text-slate-900">
                {profile?.name || "Guest"}
              </Link>
              <button onClick={() => setLocationSheetOpen(true)} className="flex items-center gap-1 min-w-0 max-w-full">
                <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span className="truncate text-[11.5px] font-semibold text-slate-600">{effectiveLabel}</span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </button>
            </div>
            <Link
              to="/vendor/join"
              className="shrink-0 flex items-center gap-1.5 h-11 pl-2.5 pr-2 rounded-2xl bg-orange-50 border border-orange-200 active:scale-95 transition"
            >
              <Store className="h-5 w-5 text-orange-500" />
              <span className="leading-tight text-left">
                <span className="block text-[12.5px] font-black text-orange-600">Join Seller</span>
                <span className="block text-[9px] font-semibold text-slate-500">Start your business</span>
              </span>
              <ChevronRight className="h-4 w-4 text-orange-400" />
            </Link>
          </div>

          {/* Compact circular categories — same rail as content view */}
          <div className="mt-2 -mx-1 px-1">{circleRail}</div>
        </header>


      )}

      {/* ==================== MAP HERO — content view only ==================== */}
      {!isMapView && (
      <motion.section
        layout

        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className={`relative flex-shrink-0 overflow-hidden ${isMapView ? "rounded-b-[28px] shadow-[0_18px_36px_-24px_rgba(0,0,0,0.5)]" : ""}`}
        style={{ height: isMapView ? "52vh" : "40vh", minHeight: isMapView ? 360 : 290 }}
      >

        {/* Inner wrapper is 30px taller than the section so Google's attribution
            strip renders BELOW the visible clip area and never overlaps the rail. */}
        <div className="absolute inset-x-0 top-0" style={{ height: "calc(100% + 30px)" }}>
          {(geo.status !== "loading" || pickedLocation) ? (
            <QuickServiceMap
              center={mapCenter}
              vendors={mapVendors}
              userAvatar={profile?.avatar_url || avatarUser}
              userLabel={shortLocation}
              geoStatus={geo.status}
              showControls={false}
              radiusKm={radiusKm}
              categoryIcon={selectedSubIcon}
              onLocationTap={() => setLocationSheetOpen(true)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-amber-50 to-white animate-pulse" />
          )}
        </div>

        {/* ---- MAP VIEW chrome: glass profile + Join Seller ---- */}
        {isMapView && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="absolute left-3 top-3 z-20 flex items-center gap-2 max-w-[54%]"
            >
              <Link to="/profile" className="shrink-0">
                <img
                  src={profile?.avatar_url || avatarUser}
                  alt="Profile"
                  className="h-11 w-11 rounded-full object-cover border-2 border-white/80 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]"
                />
              </Link>
              <div className="min-w-0">
                <Link to="/profile" className="block truncate text-[15px] font-black text-slate-900 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
                  {profile?.name || "Guest"}
                </Link>
                <button
                  onClick={() => setLocationSheetOpen(true)}
                  className="flex items-center gap-1 min-w-0"
                >
                  <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="truncate text-[11.5px] font-semibold text-slate-700 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
                    {effectiveLabel}
                  </span>
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="absolute right-3 top-3 z-20">
              <Link
                to="/vendor/join"
                className="flex items-center gap-2 h-12 pl-3 pr-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_10px_26px_-12px_rgba(0,0,0,0.45)] active:scale-95 transition"
              >
                <Store className="h-5 w-5 text-orange-500" />
                <span className="leading-tight text-left">
                  <span className="block text-[13px] font-black text-orange-600">Join Seller</span>
                  <span className="block text-[9.5px] font-semibold text-slate-600">Start your business</span>
                </span>
                <ArrowRight className="h-4 w-4 text-orange-500" />
              </Link>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setLocationSheetOpen(true)}
              className="absolute right-3 top-[68px] z-20 h-9 rounded-full bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] flex items-center gap-1.5 px-3"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              <span className="max-w-[110px] truncate text-[12px] font-bold text-slate-900">{shortLocation}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
            </motion.button>
          </>
        )}

        {/* ---- CONTENT VIEW chrome (unchanged) ---- */}
        {!isMapView && (
          <>
            {/* Top-right location pill */}
            <div className="absolute right-3 top-3 z-20">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setLocationSheetOpen(true)}
                className="h-10 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.35)] flex items-center gap-2 px-3.5"
              >
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="max-w-[110px] text-left font-bold text-[13px] text-slate-900 truncate drop-shadow-sm">{shortLocation}</span>
                <ChevronDown className="h-4 w-4 text-slate-700" />
              </motion.button>
            </div>

            {/* Segmented Service / Product / Other selector */}
            <div className="absolute left-3 top-14 z-20">
              <div className="inline-flex h-10 p-0.5 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.35)]">
                {(["service","product","other"] as TypeCode[]).map((code) => {
                  const active = typeCode === code;
                  const label = code === "service" ? "Service" : code === "product" ? "Product" : "Other";
                  return (
                    <motion.button
                      key={code}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setTypeCode(code)}
                      className={`relative px-3 h-full rounded-full text-[12px] font-bold transition-colors ${active ? "text-white" : "text-slate-800"}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="type-seg-active"
                          className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_4px_12px_-4px_rgba(249,115,22,0.6)]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative">{label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ---- View switch: Content View | Map View ---- */}
        <div className={`absolute left-3 z-20 ${isMapView ? "bottom-3" : "bottom-[92px]"}`}>
          <div className="inline-flex h-10 p-0.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_10px_26px_-12px_rgba(0,0,0,0.45)]">
            {([
              { code: "content" as const, label: "Content View", Icon: LayoutGrid },
              { code: "map" as const, label: "Map View", Icon: MapIcon },
            ]).map(({ code, label, Icon }) => {
              const active = homeView === code;
              return (
                <motion.button
                  key={code}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setHomeView(code)}
                  className={`relative px-3 h-full rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors ${active ? "text-white" : "text-slate-800"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="home-view-seg"
                      className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_4px_12px_-4px_rgba(249,115,22,0.6)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>


        {/* Floating GLASS category rail — pinned at the very bottom of the map (content view only) */}
        <div className={`absolute inset-x-0 bottom-0 z-20 px-2 pb-0.5 ${isMapView ? "hidden" : ""}`}>
          {circleRail}
        </div>


      </motion.section>
      )}

      {/* ==================== SCROLL AREA (Recent + Sub cards) ==================== */}
      <div className="flex-1 overflow-y-auto pb-32 bg-[#f5f6f8] relative z-10">

        {/* Banners + videos — map home only (admin managed) */}
        {isMapView && (
          <div className="pt-3">
            <HomeBannerRail />

            {/* Tiny view toggle — right under the banner, right aligned */}
            <div className="mt-1.5 px-4 flex justify-end">
              <div className="inline-flex h-6 p-[2px] rounded-full bg-slate-100 border border-slate-200 shadow-sm">
                {([
                  { code: "content" as const, label: "Content", Icon: LayoutGrid },
                  { code: "map" as const, label: "Map", Icon: MapIcon },
                ]).map(({ code, label, Icon }) => {
                  const active = homeView === code;
                  return (
                    <motion.button
                      key={code}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setHomeView(code)}
                      className={`relative px-2 h-full rounded-full text-[9.5px] font-bold flex items-center gap-1 transition-colors ${active ? "text-white" : "text-slate-600"}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="home-view-seg"
                          className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-400 to-orange-600"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="relative h-2.5 w-2.5" />
                      <span className="relative">{label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <HomeVideoRail />

          </div>
        )}




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

        {/* Type rail (fixed left) + per-category horizontal card decks */}
        <div className="pt-3">
          <TypeCategoryDeck
            typeCode={typeCode}
            onTypeChange={(t) => setTypeCode(t)}
            rootCats={rootCats}
            subsByRoot={subsByRoot}
            itemsBySub={itemsBySub}
            variationBySub={variationBySub}
            submittingId={submitting}
            onOpenSub={(s) => {
              const full = allSubs.find((x) => x.id === s.id);
              if (!full) return;
              setSelectedRoot(full.parent_id);
              setExpandedSub(full.id);
              setVariationSheet(full);
            }}
            onFindVendor={(s) => {
              const full = allSubs.find((x) => x.id === s.id);
              if (full) handleFindVendor(full);
            }}
            onViewAll={(root) => { setSelectedRoot(root.id); setAllCatsOpen(true); }}
          />
          {!catQ.isLoading && rootCats.length === 0 && (
            <div className="mx-4 rounded-2xl bg-white p-8 text-center text-slate-500 text-sm">
              No categories yet in this section.
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
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
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
              {(() => {
                const allItems = itemsBySub.get(variationSheet.id) ?? [];
                const groups = Array.from(new Set(allItems.map((i) => (i.group_tag || "").trim()).filter(Boolean)));
                const [activeGroup, setActiveGroup] = [
                  variationGender ?? (groups[0] || null),
                  setVariationGender,
                ] as const;
                const filtered = activeGroup
                  ? allItems.filter((i) => (i.group_tag || "").trim() === activeGroup)
                  : allItems;
                return (
                  <>
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <div>
                        <h3 className="font-display font-bold text-slate-900 text-lg">{variationSheet.name}</h3>
                        <p className="text-xs text-slate-500">Select a variation</p>
                      </div>
                      <button onClick={() => setVariationSheet(null)} className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {groups.length > 1 && (
                      <div className="px-4 pb-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {groups.map((g) => {
                          const isSel = activeGroup === g;
                          return (
                            <button
                              key={g}
                              onClick={() => setActiveGroup(g)}
                              className={`shrink-0 px-3.5 h-8 rounded-full text-[12px] font-bold border transition-colors ${
                                isSel
                                  ? "bg-orange-500 border-orange-500 text-white"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              {g}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="px-4 pb-4 grid grid-cols-3 gap-2.5 max-h-[55vh] overflow-y-auto">
                      {filtered.map((it) => {
                        const isSel = variationBySub[variationSheet.id] === it.name;
                        const img = it.image_url && it.image_url.startsWith("http") ? it.image_url : null;
                        return (
                          <motion.button
                            key={it.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              setVariationBySub((prev) => ({ ...prev, [variationSheet.id]: it.name }));
                              setVariationSheet(null);
                            }}
                            className={`rounded-2xl border-2 overflow-hidden flex flex-col text-left transition-all ${
                              isSel ? "border-orange-400 bg-orange-50 shadow-[0_6px_16px_-6px_rgba(249,115,22,0.5)]" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="aspect-square w-full bg-gradient-to-br from-amber-50 to-white grid place-items-center overflow-hidden">
                              {img ? (
                                <img src={img} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <Wrench className="h-6 w-6 text-orange-400" />
                              )}
                            </div>
                            <div className={`px-2 py-1.5 text-[11.5px] font-semibold leading-tight ${isSel ? "text-orange-700" : "text-slate-800"}`}>
                              {it.name}
                            </div>
                          </motion.button>
                        );
                      })}
                      {filtered.length === 0 && (
                        <div className="col-span-3 text-center text-sm text-slate-500 py-6">
                          No variations yet. Tap Find Vendor to send a general request.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single category → its subcategory cards bottom sheet */}
      <AnimatePresence>
        {rootSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end"
            onClick={() => setRootSheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)] flex flex-col"
              style={{ maxHeight: "82vh" }}
            >
              <div className="pt-2 flex justify-center"><span className="h-1 w-10 rounded-full bg-slate-200" /></div>
              <div className="flex items-center justify-between px-5 pt-2 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CategoryGlyph cat={rootSheet} active size={24} />
                  <h3 className="font-display font-bold text-slate-900 text-lg truncate">{rootSheet.name}</h3>
                </div>
                <button onClick={() => setRootSheet(null)} className="h-9 w-9 rounded-full grid place-items-center bg-black/5 active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pb-5 grid grid-cols-3 gap-2.5 overflow-y-auto">
                {(subsByRoot.get(rootSheet.id) ?? []).map((s, i) => {
                  const full = allSubs.find((x) => x.id === s.id);
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.25), type: "spring", stiffness: 320, damping: 26 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!full) return;
                        setSelectedRoot(full.parent_id);
                        setExpandedSub(full.id);
                        setRootSheet(null);
                        setVariationSheet(full);
                      }}
                      className="rounded-2xl p-2.5 flex flex-col items-center gap-1.5 border border-slate-200 bg-white shadow-[0_8px_18px_-14px_rgba(0,0,0,0.5)]"
                    >
                      <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-50 to-white grid place-items-center overflow-hidden">
                        <CategoryGlyph cat={(full ?? s) as DBCategory} active={false} size={30} />
                      </span>
                      <span className="text-[11px] font-semibold text-center text-slate-700 line-clamp-2">{s.name}</span>
                    </motion.button>
                  );
                })}
                {(subsByRoot.get(rootSheet.id) ?? []).length === 0 && (
                  <div className="col-span-3 py-10 text-center text-slate-400 text-sm">No items in this category yet.</div>
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
                      onClick={() => { setSelectedRoot(c.id); setAllCatsOpen(false); setRootSheet(c); }}
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
        onComplete={() => {
          if (finder) {
            setActiveInquiry({
              leadId: finder.leadId,
              category: finder.category,
              productImage: finder.categoryImage,
              startedAt: Date.now(),
              vendorCount: 0,
              approved: null,
              open: false,
            });
            setHub({
              leadId: finder.leadId,
              category: finder.category,
              categoryImage: finder.categoryImage,
            });
          }
          setFinder(null);
        }}
        onClose={() => setFinder(null)}
      />

      <VendorChatHub
        open={!!hub}
        leadId={hub?.leadId ?? null}
        category={hub?.category ?? null}
        productImage={hub?.categoryImage ?? null}
        onClose={() => setHub(null)}
        onOpenAllVendors={() => setAllVendorsOpen(true)}
      />

      <VendorListSheet
        open={allVendorsOpen || !!inquiry?.open}
        leadId={hub?.leadId ?? inquiry?.leadId ?? null}
        category={hub?.category ?? inquiry?.category ?? null}
        productImage={hub?.categoryImage ?? inquiry?.productImage ?? null}
        expectedVendors={5}
        onClose={() => setAllVendorsOpen(false)}
        onMinimize={() => setAllVendorsOpen(false)}
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
