import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic, Plus, Star, ShieldCheck,
  FileText, Wrench, Building2, Building, Cloud, Sparkles, Zap, Truck, ChefHat, Hammer, Paintbrush2,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NeedsSheet } from "@/components/NeedsSheet";
import { VariationSheet, type VariationItem } from "@/components/VariationSheet";
import { FindingVendorOverlay } from "@/components/FindingVendorOverlay";
import { VendorListSheet } from "@/components/VendorListSheet";
import { SearchOverlay } from "@/components/SearchOverlay";
import { useGeolocation, type GeoState } from "@/hooks/use-geolocation";
import { useActiveTypeId } from "@/hooks/use-active-type";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import avatarUser from "@/assets/avatar-user.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import svcAc from "@/assets/svc-ac.png";
import svcCarpenter from "@/assets/svc-carpenter.png";
import svcElectronics from "@/assets/svc-electronics.png";

export const Route = createFileRoute("/quick")({
  head: () => ({
    meta: [
      { title: "Quick Service — Karo Online" },
      { name: "description", content: "Live map of nearby vendors. Tap a category to filter, drop your need, and get instant quotes." },
    ],
  }),
  component: QuickPage,
});

// ---------- DB Types ----------
type DBType = { id: string; code: string; name: string; icon: string | null; sort_order: number };
type DBCategory = { id: string; type_id: string | null; parent_id: string | null; name: string; slug: string; icon: string | null; image_url: string | null; sort_order: number };
type DBItem = { id: string; category_id: string; name: string; slug: string; description: string | null; icon: string | null; image_url: string | null; price_min: number | null; price_max: number | null; sort_order: number };

type Vendor = {
  id: string;
  name: string;
  area: string;
  km: number;
  status: "Office" | "Online";
  avatar: string;
  x: number; y: number;
  cat: string;
};

// Lucide icon fallback per sub-category slug
const SLUG_ICON: Record<string, LucideIcon> = {
  "basic-ac": Zap,
  "basic-carpenter": Hammer,
  "basic-electronics": Sparkles,
  "basic-painter": Paintbrush2,
  "basic-movers": Truck,
  "basic-chef": ChefHat,
  "basic-plumber": Wrench,
  "basic-cleaner": Sparkles,
  "legal-services": FileText,
  "finance-services": Building2,
  "basic-services": Wrench,
  "more-services": Sparkles,
};

const SLUG_IMAGE: Record<string, string> = {
  "basic-ac": svcAc,
  "basic-carpenter": svcCarpenter,
  "basic-electronics": svcElectronics,
  "basic-painter": svcCarpenter,
  "basic-movers": svcCarpenter,
  "basic-chef": svcCarpenter,
  "basic-plumber": svcCarpenter,
  "basic-cleaner": svcCarpenter,
};

// Sub-category slug → demo vendor pool key
const SLUG_TO_VENDOR_KEY: Record<string, string> = {
  "basic-ac": "ac",
  "basic-carpenter": "carpenter",
  "basic-electronics": "electronics",
  "basic-painter": "paint",
  "basic-movers": "movers",
  "basic-chef": "chef",
  "basic-plumber": "carpenter",
  "basic-cleaner": "carpenter",
};

const CAT_ICON: Record<string, LucideIcon> = {
  ac: Zap, carpenter: Hammer, electronics: Sparkles, paint: Paintbrush2,
  movers: Truck, chef: ChefHat, doc: FileText, tools: Wrench, bank: Building2,
  biz: Building, cloud: Cloud, blank: Sparkles,
};

// Demo vendor pools (fallback while real vendor mappings come online)
const VENDORS_BY_CAT: Record<string, Vendor[]> = {
  ac: [
    { id: "ac1", name: "Aryan | Bansal", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarAryan, x: 28, y: 28, cat: "ac" },
    { id: "ac2", name: "Rani | kumari", area: "Delhi sadar bazar", km: 2.8, status: "Office", avatar: avatarRani, x: 78, y: 32, cat: "ac" },
    { id: "ac3", name: "Ashu | Qureshi", area: "Karol Bagh", km: 4.2, status: "Online", avatar: avatarUser, x: 22, y: 60, cat: "ac" },
    { id: "ac4", name: "Raj | kumar", area: "Old Delhi", km: 1.9, status: "Office", avatar: avatarRaj, x: 65, y: 65, cat: "ac" },
    { id: "ac5", name: "Aryan | Bansal", area: "CP Market", km: 3.1, status: "Online", avatar: avatarAryan, x: 50, y: 80, cat: "ac" },
  ],
  carpenter: [
    { id: "c1", name: "Raj | kumar", area: "Delhi sadar bazar", km: 2.1, status: "Office", avatar: avatarRaj, x: 25, y: 22, cat: "carpenter" },
    { id: "c2", name: "Aryan | Bansal", area: "Karol Bagh", km: 3.8, status: "Office", avatar: avatarAryan, x: 72, y: 25, cat: "carpenter" },
    { id: "c3", name: "Ashu | Qureshi", area: "Old Delhi", km: 2.5, status: "Online", avatar: avatarUser, x: 18, y: 50, cat: "carpenter" },
    { id: "c4", name: "Rani | kumari", area: "CP Market", km: 4.0, status: "Office", avatar: avatarRani, x: 80, y: 55, cat: "carpenter" },
    { id: "c5", name: "Raj | kumar", area: "Sadar Bazar", km: 1.5, status: "Office", avatar: avatarRaj, x: 35, y: 75, cat: "carpenter" },
    { id: "c6", name: "Aryan | Bansal", area: "Chandni Chowk", km: 3.2, status: "Online", avatar: avatarAryan, x: 65, y: 80, cat: "carpenter" },
  ],
  electronics: [
    { id: "e1", name: "Ashu | Qureshi", area: "Nehru Place", km: 5.1, status: "Online", avatar: avatarUser, x: 30, y: 30, cat: "electronics" },
    { id: "e2", name: "Aryan | Bansal", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarAryan, x: 70, y: 35, cat: "electronics" },
    { id: "e3", name: "Raj | kumar", area: "Lajpat Nagar", km: 4.4, status: "Office", avatar: avatarRaj, x: 25, y: 65, cat: "electronics" },
    { id: "e4", name: "Rani | kumari", area: "Karol Bagh", km: 2.9, status: "Online", avatar: avatarRani, x: 75, y: 70, cat: "electronics" },
  ],
  paint: [
    { id: "p1", name: "Aryan | Bansal", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarAryan, x: 30, y: 28, cat: "paint" },
    { id: "p2", name: "Raj | kumar", area: "Karol Bagh", km: 2.7, status: "Online", avatar: avatarRaj, x: 70, y: 35, cat: "paint" },
    { id: "p3", name: "Rani | kumari", area: "Old Delhi", km: 4.1, status: "Office", avatar: avatarRani, x: 50, y: 75, cat: "paint" },
  ],
  movers: [
    { id: "m1", name: "Raj | kumar", area: "Sadar Bazar", km: 2.3, status: "Office", avatar: avatarRaj, x: 25, y: 30, cat: "movers" },
    { id: "m2", name: "Ashu | Qureshi", area: "Karol Bagh", km: 3.6, status: "Online", avatar: avatarUser, x: 70, y: 28, cat: "movers" },
    { id: "m3", name: "Aryan | Bansal", area: "CP Market", km: 4.5, status: "Office", avatar: avatarAryan, x: 35, y: 70, cat: "movers" },
    { id: "m4", name: "Rani | kumari", area: "Old Delhi", km: 1.9, status: "Office", avatar: avatarRani, x: 75, y: 75, cat: "movers" },
    { id: "m5", name: "Raj | kumar", area: "Chandni Chowk", km: 3.0, status: "Online", avatar: avatarRaj, x: 55, y: 50, cat: "movers" },
  ],
  chef: [
    { id: "ch1", name: "Rani | kumari", area: "Delhi sadar bazar", km: 2.6, status: "Office", avatar: avatarRani, x: 28, y: 30, cat: "chef" },
    { id: "ch2", name: "Aryan | Bansal", area: "Karol Bagh", km: 3.9, status: "Online", avatar: avatarAryan, x: 72, y: 35, cat: "chef" },
    { id: "ch3", name: "Raj | kumar", area: "CP Market", km: 4.2, status: "Office", avatar: avatarRaj, x: 50, y: 75, cat: "chef" },
  ],
};
const DEFAULT_VENDORS: Vendor[] = VENDORS_BY_CAT.ac;

function QuickPage() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLElement | null>(null);
  const geo = useGeolocation();
  const [activeTypeCode] = useActiveTypeId();
  const typeCode = activeTypeCode ?? "service";

  // ---- DB-loaded catalog ----
  const [types, setTypes] = useState<DBType[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [items, setItems] = useState<DBItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, c, i] = await Promise.all([
        supabase.from("catalog_types").select("id,code,name,icon,sort_order").eq("is_active", true).order("sort_order"),
        supabase.from("categories").select("id,type_id,parent_id,name,slug,icon,image_url,sort_order").eq("is_active", true).order("sort_order"),
        supabase.from("catalog_items").select("id,category_id,name,slug,description,icon,image_url,price_min,price_max,sort_order").eq("is_active", true).order("sort_order"),
      ]);
      setTypes((t.data ?? []) as DBType[]);
      setCategories((c.data ?? []) as DBCategory[]);
      setItems((i.data ?? []) as DBItem[]);
      setLoading(false);
    })();
  }, []);

  const activeType = useMemo(
    () => types.find((t) => t.code === typeCode) ?? types[0] ?? null,
    [types, typeCode],
  );

  // Root categories under selected type (e.g. Legal / Finance / Basic / More)
  const rootCategories = useMemo<DBCategory[]>(
    () => (activeType ? categories.filter((c) => c.type_id === activeType.id && !c.parent_id) : []),
    [categories, activeType],
  );

  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  useEffect(() => {
    if (!rootCategories.length) {
      setSelectedRootId(null);
      return;
    }
    if (!rootCategories.find((c) => c.id === selectedRootId)) {
      const preferred = rootCategories.find((c) => c.slug === "basic-services") ?? rootCategories[0];
      setSelectedRootId(preferred.id);
    }
  }, [rootCategories, selectedRootId]);

  const selectedRoot = useMemo(
    () => rootCategories.find((c) => c.id === selectedRootId) ?? null,
    [rootCategories, selectedRootId],
  );

  // Sub-categories under the selected root (AC, Carpenter, Painter…)
  const subCategories = useMemo<DBCategory[]>(
    () => (selectedRoot ? categories.filter((c) => c.parent_id === selectedRoot.id) : []),
    [categories, selectedRoot],
  );

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedSubId(subCategories[0]?.id ?? null);
  }, [selectedRootId, subCategories.length]);

  const selectedSub = useMemo(
    () => subCategories.find((c) => c.id === selectedSubId) ?? null,
    [subCategories, selectedSubId],
  );

  // Items under selected sub-category (AC Service / Repair / Installation)
  const subItems = useMemo<DBItem[]>(
    () => (selectedSub ? items.filter((it) => it.category_id === selectedSub.id) : []),
    [items, selectedSub],
  );

  // Items become "variations" inside the variation sheet
  const variationItems = useMemo<VariationItem[]>(() => {
    if (!selectedSub) return [];
    return subItems.map((it, idx) => ({
      id: it.id,
      title: it.name,
      sub: it.description ?? "Filter | wholesaler",
      price:
        it.price_min != null && it.price_max != null
          ? `₹${Number(it.price_min).toLocaleString()} – ${Number(it.price_max).toLocaleString()}`
          : "—",
      img: it.image_url || SLUG_IMAGE[selectedSub.slug] || svcAc,
      tone: idx === 1 ? "green" as const : undefined,
    }));
  }, [subItems, selectedSub]);

  // ---- Real vendors mapped to current sub-category ----
  const [realVendors, setRealVendors] = useState<Vendor[]>([]);
  const [realVendorsLoading, setRealVendorsLoading] = useState(false);

  useEffect(() => {
    if (!selectedSub) {
      setRealVendors([]);
      return;
    }
    const subItemIds = items.filter((it) => it.category_id === selectedSub.id).map((it) => it.id);
    if (subItemIds.length === 0) {
      setRealVendors([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRealVendorsLoading(true);
      const { data: mappings } = await supabase
        .from("vendor_item_mappings")
        .select("vendor_id")
        .in("item_id", subItemIds)
        .eq("is_active", true);
      const vendorIds = Array.from(new Set((mappings ?? []).map((m: any) => m.vendor_id)));
      if (vendorIds.length === 0) {
        if (!cancelled) setRealVendors([]);
        setRealVendorsLoading(false);
        return;
      }
      const { data: vs } = await supabase
        .from("vendors")
        .select("id, user_id, business_name, owner_name, avatar_url, status, is_blocked")
        .in("user_id", vendorIds)
        .eq("is_blocked", false);
      if (cancelled) return;
      // Scatter real vendors deterministically across the map
      const mapped: Vendor[] = (vs ?? []).slice(0, 8).map((v: any, i: number) => {
        const positions = [
          [28, 28], [72, 30], [22, 60], [70, 65], [50, 78],
          [40, 22], [80, 48], [18, 42],
        ];
        const [x, y] = positions[i % positions.length];
        return {
          id: v.id,
          name: v.business_name || v.owner_name || "Vendor",
          area: "Nearby",
          km: 1 + Math.round(((i * 13) % 50) / 10),
          status: i % 2 === 0 ? "Office" : "Online",
          avatar: v.avatar_url || avatarUser,
          x, y,
          cat: SLUG_TO_VENDOR_KEY[selectedSub.slug] ?? "ac",
        };
      });
      setRealVendors(mapped);
      setRealVendorsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedSub, items]);

  const filteredVendors = useMemo(() => realVendors, [realVendors]);

  // ---- UI state ----
  const [needsOpen, setNeedsOpen] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState<string>("");
  const [findingOpen, setFindingOpen] = useState(false);
  const [vendorListOpen, setVendorListOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [matchInfo, setMatchInfo] = useState<{ notified: number; requestedAt: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Tap a root category circle → switch the service-card list
  const handleRootTap = (id: string) => {
    setSelectedRootId(id);
    const root = rootCategories.find((c) => c.id === id);
    if (root) setPulseKey(`${root.slug}-${Date.now()}`);
  };

  // Tap a service card (sub-category): 1st tap selects + filters map; 2nd tap on same → variations
  const handleServiceCardTap = (subId: string) => {
    if (selectedSubId === subId) {
      setVariationOpen(true);
      return;
    }
    setSelectedSubId(subId);
    const sub = subCategories.find((c) => c.id === subId);
    if (sub) setPulseKey(`${sub.slug}-${Date.now()}`);
  };

  useEffect(() => {
    const resetScroll = () => contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
    resetScroll();
    const id = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="relative min-h-dvh bg-white flex flex-col overflow-hidden isolate"
      style={{ paddingBottom: "calc(150px + env(safe-area-inset-bottom))" }}
    >
      {/* MAP */}
      <section className="relative flex-shrink-0" style={{ height: "calc(30vh + env(safe-area-inset-top))", minHeight: 230 }}>
        <FakeMap vendors={filteredVendors} pulseKey={pulseKey} geo={geo} />
      </section>

      {/* MIDDLE — search + service cards */}
      <section
        ref={contentRef}
        className="relative min-h-0 bg-white rounded-t-3xl -mt-6 z-20 flex-1 overflow-y-auto pt-3 px-4 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.15)]"
        onTouchStart={(e) => {
          (e.currentTarget as HTMLElement).dataset.sx = String(e.touches[0].clientX);
          (e.currentTarget as HTMLElement).dataset.sy = String(e.touches[0].clientY);
        }}
        onTouchEnd={(e) => {
          const el = e.currentTarget as HTMLElement;
          const sx = Number(el.dataset.sx ?? 0);
          const sy = Number(el.dataset.sy ?? 0);
          const dx = e.changedTouches[0].clientX - sx;
          const dy = e.changedTouches[0].clientY - sy;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4 && dx > 0) {
            navigate({ to: "/vendors" });
          }
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2 rounded-full bg-[#f5f5f5] border border-[color:oklch(0.78_0.14_82/0.3)] px-4 py-2.5 active:scale-[0.98] transition-transform"
            aria-label="Open search"
          >
            <span className="flex-1 text-left text-sm text-[#9ca3af]">Search.......</span>
            <Mic className="h-4 w-4 text-[#9ca3af]" />
          </button>
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="h-11 w-11 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-sm flex-shrink-0"
            aria-label="Profile"
          >
            <img src={avatarUser} alt="" className="h-full w-full object-cover" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2 mb-3">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">
            {activeType?.name ?? "Service"} {selectedRoot ? `· ${selectedRoot.name}` : ""}
          </span>
          <span className="font-display text-sm italic underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82)] text-gold-gradient font-bold">
            Quick | sarvic
          </span>
        </div>

        {/* Service cards = sub-categories of the selected root */}
        <div className="space-y-2.5 pb-4">
          {loading && (
            <div className="text-center py-10 text-sm text-[color:oklch(0.45_0.08_85)]">
              Loading services…
            </div>
          )}
          {!loading && subCategories.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.4)] p-6 text-center">
              <p className="font-display text-sm font-bold text-[color:oklch(0.30_0.05_85)]">
                {selectedRoot ? `No sub-categories under ${selectedRoot.name} yet.` : "No categories yet."}
              </p>
              <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-1">
                Admin will add them shortly.
              </p>
            </div>
          )}
          {subCategories.map((s, i) => {
            const img = SLUG_IMAGE[s.slug] || s.image_url || svcAc;
            const isSelected = selectedSubId === s.id;
            const itemCount = items.filter((it) => it.category_id === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => handleServiceCardTap(s.id)}
                className={`w-full text-left relative rounded-2xl bg-white border-2 p-2.5 flex items-center gap-3 transition-all active:scale-[0.99] ${
                  isSelected
                    ? "border-[color:oklch(0.78_0.14_82)] shadow-gold-glow"
                    : "border-[color:oklch(0.78_0.14_82/0.25)]"
                }`}
                style={{ animation: `fade-up 0.5s ease-out ${i * 0.06}s both` }}
              >
                <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.4)] grid place-items-center flex-shrink-0 overflow-hidden">
                  <img src={img} alt={s.name} loading="lazy" className="h-full w-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg text-[color:oklch(0.25_0.05_85)] font-bold leading-tight">
                    {s.name} | Service
                  </h3>
                  <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-0.5">Basic Details</p>
                  <p className="text-xs text-[color:oklch(0.45_0.08_85)]">
                    {itemCount > 0 ? `${itemCount} options · tap again for variations` : "tap again for variations"}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
                    <span className="text-[10px] font-bold text-emerald-700">4.4</span>
                    <span className="text-[10px] text-emerald-600">({filteredVendors.length} vendor)</span>
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    <span className="text-[10px] font-semibold text-emerald-700">Verified</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* BOTTOM — root categories circle row (Legal / Finance / Basic / More) */}
      <section
        className="fixed left-0 right-0 z-30 pt-2 pb-1 px-4 border-t border-[color:oklch(0.78_0.14_82/0.3)] shadow-[0_-6px_18px_-6px_rgba(0,0,0,0.12)] backdrop-blur-md"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,250,235,0.78) 100%)",
        }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
            {rootCategories.map((c, i) => {
              const FallbackIcon = SLUG_ICON[c.slug] ?? Sparkles;
              const isActive = selectedRootId === c.id;
              const isPulsing = pulseKey.startsWith(`${c.slug}-`);
              const hasEmoji = !!(c.icon && /\p{Emoji}/u.test(c.icon));
              return (
                <button
                  key={c.id}
                  onClick={() => handleRootTap(c.id)}
                  className="group flex-shrink-0 flex flex-col items-center gap-1 w-14"
                  style={{ animation: `fade-up 0.4s ease-out ${i * 0.03}s both` }}
                  aria-label={c.name}
                >
                  <span
                    key={isPulsing ? pulseKey : c.id}
                    className={`btn-3d relative h-11 w-11 rounded-full grid place-items-center border-2 transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-br from-[#d97706] to-[#c2410c] border-[#c2410c] shadow-[0_6px_16px_-2px_rgba(194,65,12,0.55)]"
                        : "bg-white border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm"
                    }`}
                    style={{
                      animation: isPulsing ? "cat-lift 0.45s cubic-bezier(0.22,1,0.36,1)" : undefined,
                      transform: isActive && !isPulsing ? "translateY(-3px) scale(1.08)" : undefined,
                    }}
                  >
                    {isPulsing && (
                      <span
                        className="absolute inset-0 rounded-full bg-[color:oklch(0.78_0.14_82/0.55)]"
                        style={{ animation: "ping-slow 0.7s ease-out 1" }}
                      />
                    )}
                    {hasEmoji ? (
                      <span className={`relative text-lg ${isActive ? "scale-110" : ""}`}>{c.icon}</span>
                    ) : (
                      <FallbackIcon
                        className={`relative h-5 w-5 transition-transform ${isActive ? "text-white scale-110" : "text-[color:oklch(0.45_0.08_85)]"}`}
                        strokeWidth={2.2}
                      />
                    )}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </span>
                  <span
                    className={`text-[9px] font-display font-semibold tracking-tight leading-none truncate w-full text-center ${
                      isActive ? "text-[color:oklch(0.35_0.15_45)]" : "text-[color:oklch(0.45_0.08_85)]"
                    }`}
                  >
                    {c.name.replace(/ Services?$/i, "")}
                  </span>
                </button>
              );
            })}
            {!loading && rootCategories.length === 0 && (
              <span className="text-xs text-[color:oklch(0.45_0.08_85)] py-3 px-2">
                No categories — add some from Admin → Catalog.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Floating + button */}
      <button
        onClick={() => setNeedsOpen(true)}
        aria-label="Add need"
        className="btn-3d fixed z-40 right-5 grid place-items-center"
        style={{ bottom: "calc(150px + env(safe-area-inset-bottom))" }}
      >
        <span className="relative h-16 w-16 rounded-full grid place-items-center bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] border-4 border-white shadow-[0_8px_22px_-4px_rgba(0,0,0,0.4)]">
          <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(220,38,38,0.4)" }} />
          <Plus className="relative h-8 w-8 text-[color:oklch(0.30_0.05_85)]" strokeWidth={3} />
        </span>
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-display font-semibold text-[color:oklch(0.30_0.05_85)] underline underline-offset-2 whitespace-nowrap">
          Add | Neds
        </span>
      </button>

      <NeedsSheet
        open={needsOpen}
        category={selectedSub?.name ?? null}
        onClose={() => setNeedsOpen(false)}
        onSubmit={() => setNeedsOpen(false)}
      />

      <VariationSheet
        open={variationOpen}
        category={selectedSub?.name ?? "Service"}
        vendorLabel="Filter | wholesaler"
        items={variationItems}
        onClose={() => setVariationOpen(false)}
        onSubmit={async (payload) => {
          setVariationOpen(false);
          // Create lead + fan out to mapped vendors
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !selectedSub) {
              toast.error("Pehle customer login complete karein, phir request vendor ko jayegi.");
              setTimeout(() => setFindingOpen(true), 200);
              return;
            }
            const cartIds = payload.cart;
            const cartItems = subItems.filter((it) => cartIds.includes(it.id));
            const itemNames = cartItems.map((it) => it.name);
            const [{ data: profile }, { data: subCat }, { data: defaults }] = await Promise.all([
              supabase.from("customers").select("name, phone, address").eq("user_id", user.id).maybeSingle(),
              supabase.from("categories").select("lead_price_inr, max_vendors_per_lead").eq("id", selectedSub.id).maybeSingle(),
              supabase.from("app_settings").select("value").eq("key", "lead_defaults").maybeSingle(),
            ]);
            const def = (defaults as any)?.value ?? {};
            const price = (subCat as any)?.lead_price_inr ?? def.default_price_inr ?? 0;
            const maxSlots = (subCat as any)?.max_vendors_per_lead ?? def.max_vendors_per_lead ?? 5;
            const { data: lead, error: leadErr } = await supabase
              .from("leads")
              .insert({
                customer_id: user.id,
                customer_name: (profile as any)?.name ?? null,
                customer_phone: (profile as any)?.phone ?? null,
                type_id: selectedRoot?.type_id ?? null,
                root_category_id: selectedRoot?.id ?? null,
                sub_category_id: selectedSub.id,
                sub_category_name: selectedSub.name,
                item_ids: cartIds,
                item_names: itemNames,
                note: payload.note || null,
                images: payload.images ?? [],
                address: (profile as any)?.address ?? geo.label ?? null,
                lat: geo.lat,
                lng: geo.lng,
                max_slots: maxSlots,
                lead_price_inr: price,
              })
              .select("id")
              .single();
            if (leadErr || !lead) {
              toast.error(leadErr?.message || "Request create nahi ho paayi");
              setTimeout(() => setFindingOpen(true), 200);
              return;
            }
            setActiveLeadId(lead.id);
            // Sequential radius search: 1km → 3km → 5km → 10km → 20km, stop at 5 nearest vendors
            const { data: matchRes, error: matchErr } = await supabase.rpc("match_lead_vendors", {
              _lead_id: lead.id,
            });
            const notified = Number((matchRes as any)?.notified ?? 0);
            setMatchInfo({ notified, requestedAt: Date.now() });
            if (matchErr) {
              toast.error(matchErr.message || "Vendor matching fail");
            } else if (notified > 0) {
              toast.success(`Aapke nearest ${notified} vendor ko request bhej di gayi`);
            } else {
              toast.info("Aapke area me abhi vendor available nahi hain.");
            }
          } catch (e) {
            console.error("lead create failed", e);
            toast.error("Request send fail hui — login/profile check karein");
          }
          setTimeout(() => setFindingOpen(true), 200);
        }}
      />

      <FindingVendorOverlay
        open={findingOpen}
        category={selectedSub?.name ?? "Service"}
        onClose={() => setFindingOpen(false)}
        onComplete={() => {
          setFindingOpen(false);
          setVendorListOpen(true);
        }}
      />

      <VendorListSheet
        open={vendorListOpen}
        category={selectedSub?.name ?? "Service"}
        leadId={activeLeadId}
        expectedVendors={matchInfo?.notified ?? 0}
        onTryAgain={async () => {
          if (!activeLeadId) return;
          setVendorListOpen(false);
          setFindingOpen(true);
          const { data } = await supabase.rpc("match_lead_vendors", { _lead_id: activeLeadId });
          setMatchInfo({ notified: Number((data as any)?.notified ?? 0), requestedAt: Date.now() });
        }}
        onClose={() => setVendorListOpen(false)}
      />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(q) => {
          console.log("Search:", q);
        }}
      />
    </div>
  );
}

function FakeMap({ vendors, pulseKey, geo }: { vendors: Vendor[]; pulseKey?: string; geo: GeoState }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const gestureRef = useRef<{
    mode: "none" | "pinch" | "pan";
    startDist: number;
    startScale: number;
    startMidX: number;
    startMidY: number;
    startTx: number;
    startTy: number;
    lastTap: number;
  }>({ mode: "none", startDist: 0, startScale: 1, startMidX: 0, startMidY: 0, startTx: 0, startTy: 0, lastTap: 0 });

  const MIN_SCALE = 1;
  const MAX_SCALE = 3.5;

  const clampPan = (scale: number, x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = ((scale - 1) * w) / 2;
    const maxY = ((scale - 1) * h) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      gestureRef.current = {
        ...gestureRef.current,
        mode: "pinch",
        startDist: dist,
        startScale: transform.scale,
        startMidX: (a.clientX + b.clientX) / 2,
        startMidY: (a.clientY + b.clientY) / 2,
        startTx: transform.x,
        startTy: transform.y,
      };
    } else if (e.touches.length === 1 && transform.scale > 1) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: "pan",
        startMidX: e.touches[0].clientX,
        startMidY: e.touches[0].clientY,
        startTx: transform.x,
        startTy: transform.y,
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (g.mode === "pinch" && e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, g.startScale * (dist / g.startDist)));
      const clamped = clampPan(newScale, g.startTx, g.startTy);
      setTransform({ scale: newScale, x: clamped.x, y: clamped.y });
    } else if (g.mode === "pan" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.startMidX;
      const dy = e.touches[0].clientY - g.startMidY;
      const clamped = clampPan(transform.scale, g.startTx + dx, g.startTy + dy);
      setTransform({ scale: transform.scale, x: clamped.x, y: clamped.y });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      const now = Date.now();
      if (now - gestureRef.current.lastTap < 300 && gestureRef.current.mode !== "pinch") {
        const next = transform.scale > 1.2 ? { scale: 1, x: 0, y: 0 } : { scale: 2.2, x: 0, y: 0 };
        setTransform(next);
        gestureRef.current.lastTap = 0;
      } else {
        gestureRef.current.lastTap = now;
      }
      gestureRef.current.mode = "none";
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={() => {
        const next = transform.scale > 1.2 ? { scale: 1, x: 0, y: 0 } : { scale: 2.2, x: 0, y: 0 };
        setTransform(next);
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: "center center",
          transition: gestureRef.current.mode === "none" ? "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, #fde8e4 0%, #fbd4cc 40%, #f8d6c8 100%)" }}
        />
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M 0 30 Q 25 25 50 35 T 100 33" stroke="rgba(255,255,255,0.85)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 0 70 Q 35 75 55 65 T 100 72" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 25 0 Q 30 40 45 55 T 50 100" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 75 0 Q 70 35 80 55 T 78 100" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M -5 48 Q 30 55 55 47 Q 75 42 105 50" stroke="#7dd3fc" strokeWidth="6" fill="none" opacity="0.85" />
          {[
            [10, 15, 6, 5], [60, 12, 8, 6], [85, 30, 5, 5],
            [12, 80, 7, 5], [45, 88, 6, 4], [88, 82, 5, 5],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="0.5" fill="rgba(255,255,255,0.55)" />
          ))}
        </svg>

        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <div className="relative">
            <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(220,38,38,0.5)" }} />
            <div className="relative">
              <svg viewBox="0 0 32 40" className="h-12 w-10 drop-shadow-[0_4px_8px_rgba(220,38,38,0.5)]">
                <path d="M16 0 C7 0 0 7 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7 25 0 16 0 Z" fill="#dc2626" stroke="white" strokeWidth="1.5" />
                <circle cx="16" cy="15" r="9" fill="white" />
              </svg>
              <span className="absolute top-[6px] left-1/2 -translate-x-1/2 h-[18px] w-[18px] rounded-full overflow-hidden">
                <img src={avatarRaj} alt="" className="h-full w-full object-cover" />
              </span>
            </div>
          </div>
          <span
            className="mt-1 px-2 py-0.5 rounded bg-white/95 text-[10px] font-display font-bold text-[color:oklch(0.25_0.05_85)] shadow whitespace-nowrap max-w-[180px] truncate"
            title={geo.label}
          >
            📍 {geo.status === "loading" || geo.status === "idle" ? "Detecting your location…" : geo.label}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {vendors.map((v, i) => {
            const CatIcon = CAT_ICON[v.cat] ?? Sparkles;
            return (
              <motion.div
                key={`${pulseKey ?? "static"}-${v.id}`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                initial={{ opacity: 0, y: -24, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.7, transition: { duration: 0.22, ease: "easeIn" } }}
                transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.07 }}
              >
                <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-xl pl-1 pr-2 py-1 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-md">
                  <span className="relative h-7 w-7 rounded-full overflow-hidden border-2 border-white">
                    <img src={v.avatar} alt="" className="h-full w-full object-cover" />
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                      <svg viewBox="0 0 12 16" className="h-3 w-2.5 text-red-600 drop-shadow"><path d="M6 0 C2 0 0 3 0 6 C0 11 6 16 6 16 C6 16 12 11 12 6 C12 3 10 0 6 0 Z" fill="currentColor" /></svg>
                    </span>
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] border border-white grid place-items-center shadow">
                      <CatIcon className="h-2 w-2 text-white" strokeWidth={3} />
                    </span>
                  </span>
                  <div className="leading-tight">
                    <p className="font-display text-[10px] font-bold text-[color:oklch(0.25_0.05_85)] whitespace-nowrap">{v.name}</p>
                    <p className="text-[7px] text-[color:oklch(0.45_0.08_85)] flex items-center gap-0.5">
                      <span>📍 {v.area}</span>
                    </p>
                    <p className="text-[7px]">
                      <span className="text-[color:oklch(0.45_0.08_85)]">{v.km} km. </span>
                      <span className={`underline ${v.status === "Online" ? "text-emerald-600" : "text-blue-600"} font-semibold`}>{v.status}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.div
        key={`count-${vendors[0]?.cat ?? "none"}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-20 left-3 z-30 px-2.5 py-1 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow text-[10px] font-display font-bold text-[color:oklch(0.30_0.05_85)]"
      >
        {vendors.length} nearby vendors
      </motion.div>

      <div className="absolute bottom-2 left-3 right-3 z-30">
        <div className="flex items-center justify-between text-[8px] font-bold text-[color:oklch(0.30_0.05_85)] mb-0.5 px-1 pointer-events-none">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <div
          className="relative h-3 bg-white/85 border border-[color:oklch(0.30_0.05_85/0.4)] rounded-sm cursor-ew-resize touch-none select-none"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const startScale = transform.scale;
            const onMove = (ev: PointerEvent) => {
              const dx = ev.clientX - startX;
              const delta = (dx / 140) * (MAX_SCALE - MIN_SCALE);
              const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale + delta));
              const clamped = clampPan(next, transform.x, transform.y);
              setTransform({ scale: next, x: clamped.x, y: clamped.y });
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#fbbf24] to-[#d97706] rounded-sm pointer-events-none"
            style={{ width: `${((transform.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%` }}
          />
          <div
            className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full bg-white border-2 border-[#d97706] shadow-md pointer-events-none"
            style={{ left: `${((transform.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%` }}
          />
          <div className="absolute left-1/2 -translate-x-1/2 -top-4 px-1.5 py-0.5 bg-white border border-[color:oklch(0.30_0.05_85/0.4)] rounded text-[9px] font-bold text-center pointer-events-none whitespace-nowrap">
            {(1 / transform.scale).toFixed(1)} km
          </div>
        </div>
        <div className="text-center mt-0.5 pointer-events-none">
          <span className="text-[8px]">⬆ N · drag bar to zoom</span>
        </div>
      </div>
    </div>
  );
}
