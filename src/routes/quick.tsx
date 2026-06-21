import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Mic, Plus, Star, ShieldCheck, Package, ArrowRight,
  FileText, Wrench, Building2, Building, Cloud, Sparkles, Zap, Truck, ChefHat, Hammer, Paintbrush2,
  type LucideIcon,
} from "lucide-react";
import { VendorModeToggle } from "@/components/VendorModeToggle";
import { AnimatePresence, motion } from "framer-motion";
import { MyNeedsSheet } from "@/components/MyNeedsSheet";
import { VariationSheet, type VariationItem } from "@/components/VariationSheet";
import { FindingVendorOverlay } from "@/components/FindingVendorOverlay";
import { VendorListSheet } from "@/components/VendorListSheet";
import { useActiveInquiry, setActiveInquiry } from "@/hooks/use-active-inquiry";
import { SearchOverlay } from "@/components/SearchOverlay";
// RadiusSlider removed from home — now lives inside NoVendorsFallback ("Try again" sheet)
import { useGeolocation } from "@/hooks/use-geolocation";
import { QuickServiceMap } from "@/components/QuickServiceMap";
import { useActiveTypeId } from "@/hooks/use-active-type";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSheet } from "@/components/ProfileSheet";
import { QuickOrdersSheet } from "@/components/QuickOrdersSheet";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";
import { useAuthGate } from "@/components/AuthGate";
import { useServerFn } from "@tanstack/react-start";
import { getNearbyOnlineVendors } from "@/lib/quick-vendors.functions";
import { cachePeek, cacheSet } from "@/lib/offline/cache";
import { enqueue } from "@/lib/offline/queue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { LocationPickerSheet, type PickedLocation } from "@/components/LocationPickerSheet";
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
      { title: "Quick Service — Find Local Vendors Near You | Karo Online" },
      { name: "description", content: "Live map of nearby vendors on Karo Online. Filter by category, drop your need, and get instant quotes from trusted local professionals." },
      { property: "og:title", content: "Quick Service — Find Local Vendors Near You" },
      { property: "og:description", content: "Live map of nearby vendors. Tap a category, drop your need, get instant quotes." },
      { property: "og:url", content: "https://karoonline.in/quick" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/quick" }],
  }),
  component: QuickPage,
});

// ---------- DB Types ----------
type DBType = { id: string; code: string; name: string; icon: string | null; sort_order: number };
type DBCategory = { id: string; type_id: string | null; parent_id: string | null; name: string; slug: string; icon: string | null; image_url: string | null; sort_order: number };
type DBItem = { id: string; category_id: string; name: string; slug: string; description: string | null; icon: string | null; image_url: string | null; price_min: number | null; price_max: number | null; sort_order: number };
type CatalogData = { types: DBType[]; categories: DBCategory[]; items: DBItem[] };

type Vendor = {
  id: string;
  name: string;
  area: string;
  km: number;
  status: "Office" | "Online" | "Offline";
  avatar: string;
  x: number; y: number;
  lat?: number;
  lng?: number;
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

const CATALOG_CACHE_KEY = "ko-quick-catalog-v2";
const STATIC_TYPES: DBType[] = [
  { id: "static-service", code: "service", name: "Service", icon: "⚡", sort_order: 1 },
];
const STATIC_CATEGORIES: DBCategory[] = [
  { id: "static-basic", type_id: "static-service", parent_id: null, name: "Basic Services", slug: "basic-services", icon: "⚡", image_url: null, sort_order: 1 },
  { id: "static-legal", type_id: "static-service", parent_id: null, name: "Legal Services", slug: "legal-services", icon: "📄", image_url: null, sort_order: 2 },
  { id: "static-finance", type_id: "static-service", parent_id: null, name: "Finance Services", slug: "finance-services", icon: "🏦", image_url: null, sort_order: 3 },
  { id: "static-more", type_id: "static-service", parent_id: null, name: "More Services", slug: "more-services", icon: "✨", image_url: null, sort_order: 4 },
  { id: "static-ac", type_id: null, parent_id: "static-basic", name: "AC", slug: "basic-ac", icon: "⚡", image_url: null, sort_order: 1 },
  { id: "static-carpenter", type_id: null, parent_id: "static-basic", name: "Carpenter", slug: "basic-carpenter", icon: "🔨", image_url: null, sort_order: 2 },
  { id: "static-electronics", type_id: null, parent_id: "static-basic", name: "Electronics", slug: "basic-electronics", icon: "✨", image_url: null, sort_order: 3 },
  { id: "static-plumber", type_id: null, parent_id: "static-basic", name: "Plumber", slug: "basic-plumber", icon: "🔧", image_url: null, sort_order: 4 },
  { id: "static-painter", type_id: null, parent_id: "static-basic", name: "Painter", slug: "basic-painter", icon: "🎨", image_url: null, sort_order: 5 },
  { id: "static-cleaner", type_id: null, parent_id: "static-basic", name: "Cleaner", slug: "basic-cleaner", icon: "✨", image_url: null, sort_order: 6 },
];
const STATIC_ITEMS: DBItem[] = STATIC_CATEGORIES
  .filter((c) => c.parent_id === "static-basic")
  .map((c, idx) => ({
    id: `static-item-${c.slug}`,
    category_id: c.id,
    name: `${c.name} Service`,
    slug: `${c.slug}-service`,
    description: "Fast nearby service",
    icon: c.icon,
    image_url: null,
    price_min: null,
    price_max: null,
    sort_order: idx + 1,
  }));
function fallbackCatalog(types: DBType[] = STATIC_TYPES): CatalogData {
  const fallbackType = types.find((t) => t.code === "service") ?? types[0] ?? STATIC_TYPES[0];
  const basicId = `static-basic-${fallbackType.id}`;
  const categories = STATIC_CATEGORIES.map((c) => {
    if (!c.parent_id) return { ...c, id: `${c.id}-${fallbackType.id}`, type_id: fallbackType.id };
    return { ...c, id: `${c.id}-${fallbackType.id}`, parent_id: basicId };
  });
  const items = categories
    .filter((c) => c.parent_id === basicId)
    .map((c, idx) => {
      const fallbackItem = STATIC_ITEMS[idx % STATIC_ITEMS.length] ?? STATIC_ITEMS[0];
      return { ...fallbackItem, id: `static-item-${c.slug}-${fallbackType.id}`, category_id: c.id };
    });
  return { types, categories, items };
}

function loadCachedCatalog(): CatalogData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CatalogData>;
    if (!parsed.types?.length || !parsed.categories?.length) return null;
    return { types: parsed.types, categories: parsed.categories, items: parsed.items ?? STATIC_ITEMS };
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms = 1200): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Catalog request timed out")), ms)),
  ]);
}

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function QuickPage() {
  const navigate = useNavigate();
  const { profile, isAuthenticated, ready } = useAuth();
  const { requireAuth } = useAuthGate();
  const geo = useGeolocation();
  const [activeTypeCode] = useActiveTypeId();
  const typeCode = activeTypeCode ?? "service";

  // Onboarding carousel — first-visit only
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem("ko-onboarding-seen-v1")) {
        setShowOnboarding(true);
      }
    } catch {}
  }, []);

  // MANDATORY registration gate — after onboarding, force OTP + profile
  // before customer can access home. Vendor/admin routes have their own gates.
  const locallyOnboarded =
    typeof window !== "undefined" &&
    window.localStorage.getItem("ko-customer-onboarded") === "true";
  const profileComplete = locallyOnboarded || (isAuthenticated && !!profile?.name);
  useEffect(() => {
    if (!ready || showOnboarding || profileComplete) return;
    navigate({ to: "/register", replace: true });
  }, [ready, showOnboarding, profileComplete, navigate]);


  // ---- DB-loaded catalog ----
  const initialCatalog = useMemo<CatalogData>(() => fallbackCatalog(), []);
  const [types, setTypes] = useState<DBType[]>(initialCatalog.types);
  const [categories, setCategories] = useState<DBCategory[]>(initialCatalog.categories);
  const [items, setItems] = useState<DBItem[]>(initialCatalog.items);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cached = loadCachedCatalog();
        if (cached && !cancelled) {
          setTypes(cached.types);
          setCategories(cached.categories);
          setItems(cached.items);
        }
        const [t, c, i] = await withTimeout(Promise.all([
          supabase.from("catalog_types").select("id,code,name,icon,sort_order").eq("is_active", true).order("sort_order"),
          supabase.from("categories").select("id,type_id,parent_id,name,slug,icon,image_url,sort_order").eq("is_active", true).order("sort_order"),
          supabase.from("catalog_items").select("id,category_id,name,slug,description,icon,image_url,price_min,price_max,sort_order").eq("is_active", true).order("sort_order"),
        ]));
        if (cancelled) return;
        const nextTypes = ((t.data ?? []) as DBType[]).length ? (t.data ?? []) as DBType[] : STATIC_TYPES;
        const fb = fallbackCatalog(nextTypes);
        const nextCategories = ((c.data ?? []) as DBCategory[]).length ? (c.data ?? []) as DBCategory[] : fb.categories;
        const nextItems = ((i.data ?? []) as DBItem[]).length ? (i.data ?? []) as DBItem[] : fb.items;
        setTypes(nextTypes);
        setCategories(nextCategories);
        setItems(nextItems);
        window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ types: nextTypes, categories: nextCategories, items: nextItems }));
      } catch (e) {
        console.warn("Quick catalog using cached/static data", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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

  const defaultRootId = useMemo(
    () => (rootCategories.find((c) => c.slug === "basic-services") ?? rootCategories[0] ?? null)?.id ?? null,
    [rootCategories],
  );

  const [selectedRootId, setSelectedRootId] = useState<string | null>(defaultRootId);
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
    () => rootCategories.find((c) => c.id === (selectedRootId ?? defaultRootId)) ?? null,
    [rootCategories, selectedRootId, defaultRootId],
  );

  // Sub-categories under the selected root (AC, Carpenter, Painter…)
  const subCategories = useMemo<DBCategory[]>(
    () => (selectedRoot ? categories.filter((c) => c.parent_id === selectedRoot.id) : []),
    [categories, selectedRoot],
  );

  const defaultSubId = subCategories[0]?.id ?? null;
  const [selectedSubId, setSelectedSubId] = useState<string | null>(defaultSubId);
  useEffect(() => {
    setSelectedSubId(subCategories[0]?.id ?? null);
  }, [selectedRootId, subCategories.length]);

  const selectedSub = useMemo(
    () => subCategories.find((c) => c.id === (selectedSubId ?? defaultSubId)) ?? null,
    [subCategories, selectedSubId, defaultSubId],
  );

  // Items under selected sub-category (AC Service / Repair / Installation)
  const subItems = useMemo<DBItem[]>(
    () => (selectedSub ? items.filter((it) => it.category_id === selectedSub.id) : []),
    [items, selectedSub],
  );

  // Maps for the MyNeedsSheet picker — root → sub list, sub → items list.
  const subCategoriesByRoot = useMemo<Record<string, DBCategory[]>>(() => {
    const out: Record<string, DBCategory[]> = {};
    for (const r of rootCategories) {
      out[r.id] = categories.filter((c) => c.parent_id === r.id);
    }
    return out;
  }, [rootCategories, categories]);

  const itemsBySub = useMemo<Record<string, DBItem[]>>(() => {
    const out: Record<string, DBItem[]> = {};
    for (const c of categories) {
      const list = items.filter((it) => it.category_id === c.id);
      if (list.length) out[c.id] = list;
    }
    return out;
  }, [categories, items]);

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
  const getNearbyOnlineVendorsFn = useServerFn(getNearbyOnlineVendors);

  const isOnline = useOnlineStatus();

  // Manual location override (Uber-style picker) — declared early so the
  // vendor-load effect can route fetches to the user-selected city.
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(10);


  useEffect(() => {
    const isUuid = (value: string | null | undefined) =>
      !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    const origin = pickedLocation
      ? { lat: pickedLocation.lat, lng: pickedLocation.lng }
      : (geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null);
    const subCategoryId = isUuid(selectedSub?.id) ? selectedSub!.id : null;
    const selectedItemIds = subItems.map((it) => it.id).filter(isUuid);

    // Cache key: rounded geo (~1km grid) + sub-category, scoped to 10km local ring.
    const gridLat = origin ? Math.round(origin.lat * 100) / 100 : "nogeo";
    const gridLng = origin ? Math.round(origin.lng * 100) / 100 : "nogeo";
    const cacheKey = `nearby-10km:${gridLat}:${gridLng}:${subCategoryId ?? "all"}`;

    const positions = [[28, 28], [72, 30], [22, 60], [70, 65], [50, 78], [40, 22], [80, 48], [18, 42], [60, 18], [35, 50], [85, 70], [12, 75]];
    const toMapped = (realRows: any[]): Vendor[] =>
      realRows.slice(0, 20).map((v: any, i: number) => {
        const [x, y] = positions[i % positions.length];
        const distance = v.km != null ? `${v.km} km away` : null;
        const area = [v.area, distance].filter(Boolean).join(", ") || "Nearby";
        return { id: v.id, name: v.business_name || v.owner_name || "Vendor", area, km: v.km ?? 0, status: v.is_online ? "Online" : "Offline", avatar: v.avatar_url || avatarUser, x, y, lat: v.lat, lng: v.lng, cat: selectedSub?.slug ?? "all" };
      });

    let cancelled = false;

    // 1) Paint cached vendors INSTANTLY (offline-first).
    void cachePeek<any[]>(cacheKey).then((cached) => {
      if (!cancelled && cached && cached.length) setRealVendors(toMapped(cached));
    });

    const loadRealVendors = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Offline: keep showing cached list, skip network.
        setRealVendorsLoading(false);
        return;
      }
      setRealVendorsLoading(true);
      try {
        const res = await getNearbyOnlineVendorsFn({ data: { origin, radiusKm: searchRadiusKm, subCategoryId, itemIds: selectedItemIds } });
        if (cancelled) return;
        const realRows = res.ok ? res.vendors : [];
        setRealVendors(toMapped(realRows));
        // Persist fresh 10km list for offline re-entry (12h TTL).
        void cacheSet(cacheKey, realRows, 1000 * 60 * 60 * 12);
      } catch (e) {
        console.warn("quick map vendors failed", e);
      } finally {
        if (!cancelled) setRealVendorsLoading(false);
      }
    };
    loadRealVendors();
    const ch = supabase
      .channel(`quick-map-vendors-${selectedSub?.id ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, () => loadRealVendors())
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_item_mappings" }, () => loadRealVendors())
      .subscribe();
    const interval = window.setInterval(loadRealVendors, 60_000);
    // Reconnect → silently refresh & inject into cache.
    const onOnline = () => loadRealVendors();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(ch);
    };
  }, [selectedSub, subItems, geo.lat, geo.lng, isOnline, pickedLocation, searchRadiusKm]);

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
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [ordersSheetOpen, setOrdersSheetOpen] = useState(false);
  // pickedLocation/locationSheetOpen are declared earlier (above the vendor-load effect).
  const effectiveCenter = pickedLocation
    ? { lat: pickedLocation.lat, lng: pickedLocation.lng }
    : (geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null);
  const effectiveLabel = pickedLocation?.address ?? geo.label;
  // search radius now defaults to 10km; the "Try again" fallback sheet lets users expand it.




  // Tap a root category circle → switch the service-card list
  const handleRootTap = (id: string) => {
    setSelectedRootId(id);
    const root = rootCategories.find((c) => c.id === id);
    if (root) setPulseKey(`${root.slug}-${Date.now()}`);
  };

  // Tap a service card (sub-category): 1st tap selects + filters map; 2nd tap on same → variations
  const handleServiceCardTap = (subId: string) => {
    requireAuth(() => {
      if (selectedSubId === subId) {
        setVariationOpen(true);
        return;
      }
      setSelectedSubId(subId);
      const sub = subCategories.find((c) => c.id === subId);
      if (sub) setPulseKey(`${sub.slug}-${Date.now()}`);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-white isolate overflow-hidden flex flex-col"
      style={{ touchAction: "auto" }}
    >
      {showOnboarding && <OnboardingCarousel onDone={() => setShowOnboarding(false)} />}
      {/* MAP */}
      <section className="relative flex-shrink-0" style={{ height: "calc(34vh + env(safe-area-inset-top))", minHeight: 260 }}>
        <QuickServiceMap
          center={effectiveCenter}
          vendors={filteredVendors.map((v) => ({
            id: v.id, name: v.name, avatar: v.avatar, x: v.x, y: v.y,
            area: v.area, km: v.km, status: v.status, lat: v.lat, lng: v.lng,
          }))}
          userAvatar={profile?.avatar_url || avatarUser}
          userLabel={effectiveLabel}
          geoStatus={geo.status}
          radiusKm={searchRadiusKm}
          onLocationTap={() => setLocationSheetOpen(true)}
          categoryIcon={selectedSub?.image_url || (selectedSub ? SLUG_IMAGE[selectedSub.slug] : undefined) || undefined}
          onCenterChange={(c) => {
            // User dragged the map → re-route the search center to the new
            // coordinates so the floating vendor pins refresh around the
            // pinned center (Uber-style drag-to-search).
            setPickedLocation((prev) => {
              if (prev && Math.abs(prev.lat - c.lat) < 1e-4 && Math.abs(prev.lng - c.lng) < 1e-4) return prev;
              return {
                lat: c.lat,
                lng: c.lng,
                address: prev?.address && Math.abs(prev.lat - c.lat) < 0.02 && Math.abs(prev.lng - c.lng) < 0.02
                  ? prev.address
                  : `Pinned · ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`,
              };
            });
          }}
        />
        {/* Top-right: Join Business / Vendor on-off toggle */}
        <div className="absolute top-2 right-2 z-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <VendorModeToggle mode="customer" />
        </div>
      </section>

      {/* FIXED HEADER — search bar + avatar + label (does NOT scroll) */}
      <section className="relative bg-white rounded-t-3xl -mt-6 z-20 pt-3 px-4 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.15)] flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setOrdersSheetOpen(true)}
            className="relative h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-2 border-[color:oklch(0.78_0.14_82/0.7)] shadow-sm active:scale-90 flex-shrink-0"
            aria-label="My Orders"
            title="My Orders"
          >
            <Package className="h-5 w-5 text-[color:oklch(0.35_0.12_60)]" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => requireAuth(() => setSearchOpen(true))}
            className="flex-1 flex items-center gap-2 rounded-full bg-[#f5f5f5] border border-[color:oklch(0.78_0.14_82/0.3)] px-4 py-2.5 active:scale-[0.98] transition-transform"
            aria-label="Open search"
          >
            <span className="flex-1 text-left text-sm text-[#9ca3af]">Search.......</span>
            <Mic className="h-4 w-4 text-[#9ca3af]" />
          </button>
          <button
            onClick={() => setProfileSheetOpen(true)}
            className="h-11 w-11 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-sm flex-shrink-0"
            aria-label="Profile"
          >
            <img
              src={profile?.avatar_url || avatarUser}
              alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarUser; }}
              className="h-full w-full object-cover"
            />
          </button>
        </div>
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">
            {activeType?.name ?? "Service"} {selectedRoot ? `· ${selectedRoot.name}` : ""}
          </span>
          <span className="font-display text-sm italic underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82)] text-gold-gradient font-bold">
            Quick | sarvic
          </span>
        </div>
      </section>

      {/* SERVICE CARDS — only this inner list scrolls */}
      <section
        className="relative bg-white z-20 px-4 flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
      >

        {/* Service cards = sub-categories of the selected root */}
        <div className="space-y-2.5 pb-[190px]">
          {loading && subCategories.length === 0 && (
            <div className="text-center py-10 text-sm text-[color:oklch(0.45_0.08_85)]">
              Opening services…
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
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => handleServiceCardTap(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleServiceCardTap(s.id); }}
                className={`w-full text-left relative rounded-2xl bg-white border-2 p-2.5 flex items-center gap-3 transition-all active:scale-[0.99] cursor-pointer ${
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
                {/* Find Vendor pill — only on the selected card */}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requireAuth(() => setVariationOpen(true));
                    }}
                    aria-label="Find Vendor"
                    className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#e08820] to-[#d4af37] text-white text-[10px] font-display font-bold uppercase tracking-wider shadow-[0_4px_12px_-2px_rgba(212,175,55,0.6)] active:scale-95 transition animate-pulse"
                    style={{ animation: "fade-up 0.3s ease-out both" }}
                  >
                    Find Vendor
                    <ArrowRight className="h-3 w-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM — root categories circle row (Legal / Finance / Basic / More) */}
      {!needsOpen && (
      <section
        className="fixed inset-x-0 z-30 pt-5 pb-2 px-4 border-t border-[color:oklch(0.78_0.14_82/0.3)] shadow-[0_-6px_18px_-6px_rgba(0,0,0,0.12)] backdrop-blur-md"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,250,235,0.78) 100%)",
          touchAction: "pan-x",
        }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pt-2 pb-1 scrollbar-hide overscroll-x-contain" style={{ touchAction: "pan-x" }}>
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
            {loading && rootCategories.length > 0 && (
              <span className="text-[10px] text-[color:oklch(0.45_0.08_85)] py-3 px-2 whitespace-nowrap">
                Updating…
              </span>
            )}
            {!loading && rootCategories.length === 0 && (
              <span className="text-xs text-[color:oklch(0.45_0.08_85)] py-3 px-2">
                No categories — add some from Admin → Catalog.
              </span>
            )}
          </div>
        </div>
      </section>
      )}

      {/* (Search-radius slider removed — now shown only in the NoVendorsFallback "Try again" sheet) */}


      {/* Floating + button */}
      {!needsOpen && (
        <button
          onClick={() => requireAuth(() => setNeedsOpen(true))}
          aria-label="Add need"
          className="btn-3d fixed z-40 right-5 grid place-items-center"
          style={{ bottom: "calc(150px + env(safe-area-inset-bottom))", touchAction: "manipulation" }}
        >
          <span className="relative h-16 w-16 rounded-full grid place-items-center bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] border-4 border-white shadow-[0_8px_22px_-4px_rgba(0,0,0,0.4)]">
            <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(220,38,38,0.4)" }} />
            <Plus className="relative h-8 w-8 text-[color:oklch(0.30_0.05_85)]" strokeWidth={3} />
          </span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-display font-semibold text-[color:oklch(0.30_0.05_85)] underline underline-offset-2 whitespace-nowrap">
            Add | Neds
          </span>
        </button>
      )}

      <MyNeedsSheet
        open={needsOpen}
        onClose={() => setNeedsOpen(false)}
        typeId={activeType?.id ?? null}
        rootCategories={rootCategories}
        subCategoriesByRoot={subCategoriesByRoot}
        itemsBySub={itemsBySub}
        defaultRootId={selectedRootId}
        defaultSubId={selectedSubId}
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

            // ===== OFFLINE BRANCH — queue lead.create, auto-sync on reconnect =====
            if (typeof navigator !== "undefined" && !navigator.onLine) {
              const cartIds = payload.cart;
              const cartItems = subItems.filter((it) => cartIds.includes(it.id));
              const itemNames = cartItems.map((it) => it.name);
              const vendorTypes = payload.vendorTypes ?? ["wholesaler", "retailer", "manufacturer"];
              const isRemote = Boolean((payload as any).remote);
              const noteWithFilter = [
                payload.note?.trim() || "",
                `Vendor types: ${vendorTypes.join(", ")}`,
                isRemote ? "Mode: Remote/Online" : null,
              ].filter(Boolean).join(" • ");
              await enqueue("lead.create", {
                customer_id: user.id,
                type_id: selectedRoot?.type_id ?? null,
                root_category_id: selectedRoot?.id ?? null,
                sub_category_id: selectedSub.id,
                sub_category_name: selectedSub.name,
                item_ids: cartIds,
                item_names: itemNames,
                note: noteWithFilter || null,
                images: payload.images ?? [],
                address: effectiveLabel ?? null,
                lat: effectiveCenter?.lat ?? geo.lat,
                lng: effectiveCenter?.lng ?? geo.lng,
                search_radius_km: 10,
                vendor_types: vendorTypes,
                is_remote: isRemote,
              });
              toast.success("Request saved — internet aate hi vendors ko bhej denge.");
              return;
            }

            const cartIds = payload.cart;
            const cartItems = subItems.filter((it) => cartIds.includes(it.id));
            const itemNames = cartItems.map((it) => it.name);
            const vendorTypes = payload.vendorTypes ?? ["wholesaler", "retailer", "manufacturer"];
            const isRemote = Boolean((payload as any).remote);
            const filterParts = Object.entries(payload.filters ?? {})
              .filter(([, v]) => Array.isArray(v) && v.length > 0)
              .map(([k, v]) => `${k}: ${(v as string[]).join("/")}`);
            const noteWithFilter = [
              payload.note?.trim() || "",
              `Vendor types: ${vendorTypes.join(", ")}`,
              isRemote ? "Mode: Remote/Online" : null,
              ...filterParts,
            ]
              .filter(Boolean)
              .join(" • ");
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
                note: noteWithFilter || null,
                images: payload.images ?? [],
                address: pickedLocation?.address ?? (profile as any)?.address ?? geo.label ?? null,
                lat: effectiveCenter?.lat ?? geo.lat,
                lng: effectiveCenter?.lng ?? geo.lng,
                max_slots: maxSlots,
                lead_price_inr: price,
                search_radius_km: 10,
                vendor_types: vendorTypes,
                is_remote: isRemote,
              })
              .select("id")
              .single();
            if (leadErr || !lead) {
              toast.error(leadErr?.message || "Request create nahi ho paayi");
              setTimeout(() => setFindingOpen(true), 200);
              return;
            }
            setActiveLeadId(lead.id);
            // Batch-of-3 sequential broadcast — first batch only here.
            // FindingVendorOverlay re-broadcasts every 30s until cap/exhausted.
            const { data: matchRes, error: matchErr } = await supabase.rpc("broadcast_next_lead_batch", {
              _lead_id: lead.id,
              _batch_size: 5,
              _ring_index: 0, // Phase 3 — start at innermost ring (0–1 km)
            });
            const notified = Number((matchRes as any)?.notified ?? 0);
            const vendorIds: string[] = ((matchRes as any)?.vendor_ids ?? []) as string[];
            setMatchInfo({ notified, requestedAt: Date.now() });
            if (matchErr) {
              toast.error(matchErr.message || "Vendor matching fail");
            } else if (notified > 0) {
              toast.success(`Aapke ${notified} nearest vendor ko request bhej di gayi`);
              const { sendLeadPushToVendor } = await import("@/lib/push.functions");
              const leadIdLocal = lead.id;
              vendorIds.forEach((vid) => {
                sendLeadPushToVendor({ data: { vendor_id: vid, lead_id: leadIdLocal } })
                  .catch((e) => console.warn("lead push failed", vid, e));
              });
            } else {
              toast.info("Aapke 15 km area me abhi vendor available nahi hain.");
            }

          } catch (e) {
            console.error("lead create failed", e);
            toast.error("Request send fail hui — login/profile check karein");
          }
          setFindingOpen(true);
        }}
      />

      <FindingVendorOverlay
        open={findingOpen}
        category={selectedSub?.name ?? "Service"}
        categoryImage={selectedSub?.image_url || (selectedSub ? SLUG_IMAGE[selectedSub.slug] : null) || svcAc}
        leadId={activeLeadId}
        onClose={() => setFindingOpen(false)}
        onComplete={() => {
          setFindingOpen(false);
          const img = selectedSub?.image_url || (selectedSub ? SLUG_IMAGE[selectedSub.slug] : null) || svcAc;
          if (activeLeadId) {
            setActiveInquiry({
              leadId: activeLeadId,
              category: selectedSub?.name ?? "Service",
              productImage: img,
              startedAt: Date.now(),
              vendorCount: 0,
              approved: null,
              open: true,
            });
          }
          setVendorListOpen(true);
        }}
      />

      <VendorListSheet
        open={vendorListOpen}
        category={selectedSub?.name ?? "Service"}
        productImage={selectedSub?.image_url || (selectedSub ? SLUG_IMAGE[selectedSub.slug] : null) || svcAc}
        leadId={activeLeadId}
        expectedVendors={matchInfo?.notified ?? 0}
        onTryAgain={async () => {
          if (!activeLeadId) return;
          setVendorListOpen(false);
          setFindingOpen(true);
          const { data } = await supabase.rpc("broadcast_next_lead_batch", { _lead_id: activeLeadId, _batch_size: 3 });
          setMatchInfo({ notified: Number((data as any)?.notified ?? 0), requestedAt: Date.now() });
        }}
        onClose={() => setVendorListOpen(false)}
        onMinimize={() => setVendorListOpen(false)}
      />

      <QuickInquiryBridge
        onRestore={() => setVendorListOpen(true)}
      />


      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(q) => {
          console.log("Search:", q);
        }}
      />

      <ProfileSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
      <QuickOrdersSheet open={ordersSheetOpen} onOpenChange={setOrdersSheetOpen} />
      <LocationPickerSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onPreview={(loc) => {
          // Live-sync the map while the user is still browsing the sheet.
          setPickedLocation(loc);
        }}
        onPick={(loc) => {
          setPickedLocation(loc);
          toast.success(`Searching vendors in ${loc.address.split(",")[0]} · ${searchRadiusKm} km`);
        }}
        bias={geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : undefined}
        currentLabel={geo.label}
        radiusKm={searchRadiusKm}
        onRadiusChange={setSearchRadiusKm}
        onUseCurrent={() => {
          setPickedLocation(null);
          if (typeof window !== "undefined") window.dispatchEvent(new Event("ko-geo-refresh"));
        }}
      />
    </div>
  );
}

/** Watches the global active-inquiry store and restores the sheet on /quick
 *  when the user taps the floating widget elsewhere and lands back here. */
function QuickInquiryBridge({ onRestore }: { onRestore: () => void }) {
  const { inquiry } = useActiveInquiry();
  useEffect(() => {
    if (inquiry && inquiry.open) onRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry?.open, inquiry?.leadId]);
  return null;
}


