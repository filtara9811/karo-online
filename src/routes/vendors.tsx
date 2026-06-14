import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic, Star, ShieldCheck, Play, BadgeCheck, MessageCircle,
  MapPin, ChevronLeft, ChevronRight, Flame, Sparkles, Tag, Volume2, VolumeX,
  FileText, Wrench, Building2, Building, Cloud, Zap, Truck, ChefHat, Hammer, Paintbrush2, Plus,
  Package, SlidersHorizontal, Check, X,
  type LucideIcon,
} from "lucide-react";
import { ShopLiveToggle } from "@/components/ShopLiveToggle";
import goldPin from "@/assets/gold-pin.png";
import { ActionPicker, type ActionOption } from "@/components/ActionPicker";
import { ProductServicePicker } from "@/components/ProductServicePicker";
import goldServices from "@/assets/gold-services.png";
import goldRepair from "@/assets/gold-cat-repair.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import { NeedsSheet } from "@/components/NeedsSheet";
import { SearchOverlay } from "@/components/SearchOverlay";
import { getNearbyDigitalShops, type DigitalShop } from "@/lib/digital-shops.functions";
import { QuickServiceMap } from "@/components/QuickServiceMap";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Cat = { key: string; label: string; Icon: LucideIcon; tone: "active" | "muted" | "dim" };
const CATS: Cat[] = [
  { key: "doc", label: "Docs", Icon: FileText, tone: "muted" },
  { key: "tools", label: "Tools", Icon: Wrench, tone: "active" },
  { key: "blank", label: "More", Icon: Sparkles, tone: "dim" },
  { key: "bank", label: "Bank", Icon: Building2, tone: "muted" },
  { key: "biz", label: "Business", Icon: Building, tone: "muted" },
  { key: "cloud", label: "Cloud", Icon: Cloud, tone: "muted" },
  { key: "ac", label: "AC", Icon: Zap, tone: "muted" },
  { key: "carpenter", label: "Carpentry", Icon: Hammer, tone: "muted" },
  { key: "paint", label: "Painter", Icon: Paintbrush2, tone: "muted" },
  { key: "movers", label: "Movers", Icon: Truck, tone: "muted" },
  { key: "chef", label: "Chef", Icon: ChefHat, tone: "muted" },
];

const RESELLING_OPTIONS: ActionOption[] = [
  { value: "quick", label: "Quick Service", sub: "Instant repairs · cleaning · beauty", icon: goldRepair, badge: "FAST" },
  { value: "vendor", label: "Vendor", sub: "Onboard your business · sell services", icon: goldBriefcase },
  { value: "all", label: "All", sub: "Quick service + vendor combined", icon: goldServices },
];
import avatarUser from "@/assets/avatar-user.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import svcAc from "@/assets/svc-ac.png";
import svcCarpenter from "@/assets/svc-carpenter.png";
import svcElectronics from "@/assets/svc-electronics.png";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useDistanceMatrix } from "@/hooks/use-distance-matrix";
import productCosmetics from "@/assets/product-cosmetics.jpg";
import productCleaning from "@/assets/product-cleaning.jpg";
import productPerfume from "@/assets/product-perfume.jpg";
import productBags from "@/assets/product-bags.jpg";

export const Route = createFileRoute("/vendors")({
  head: () => ({
    meta: [
      { title: "All Vendors — Karo Online" },
      { name: "description", content: "Browse every vendor's digital storefront — services, products, ratings and verified profiles." },
      { property: "og:title", content: "All Vendors — Karo Online" },
      { property: "og:description", content: "Quick service + vendor combined. Discover digital dukans, tap to chat and book." },
    ],
  }),
  component: VendorsPage,
});

type VendorPin = {
  id: string; name: string; area: string; km: number; status: "Office" | "Online";
  avatar: string; x: number; y: number;
};

const PINS: VendorPin[] = [
  { id: "p1", name: "Aryan | Bansal", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarAryan, x: 24, y: 32 },
  { id: "p2", name: "Raj | kumar", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarRaj, x: 56, y: 22 },
  { id: "p3", name: "Aryan | Bansal", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarAryan, x: 78, y: 38 },
  { id: "p4", name: "Ashu | Qureshi", area: "Delhi sadar bazar", km: 3.5, status: "Online", avatar: avatarUser, x: 18, y: 58 },
  { id: "p5", name: "Rani | kumari", area: "Delhi sadar bazar", km: 3.5, status: "Office", avatar: avatarRani, x: 78, y: 70 },
];

type ShopKind = "gallery" | "video" | "carousel" | "spotlight";

type Vendor = {
  id: string;
  title: string;
  tagline: string;
  rating: number;
  reviews: number;
  km: number;
  lat: number;
  lng: number;
  address: string;
  verified: boolean;
  avatar: string;
  hero: string;
  gallery: string[];
  category: "service" | "product";
  kind: ShopKind;
  badge?: "HOT" | "NEW" | "LOW PRICE" | "TRENDING";
  priceFrom?: number;
};

const VENDORS: Vendor[] = [
  {
    id: "v1",
    title: "Beauty | Maison",
    tagline: "Premium cosmetics · curated palettes",
    rating: 4.9,
    reviews: 628,
    km: 1.2,
    lat: 28.6614,
    lng: 77.2199,
    address: "Sadar Bazar, Delhi",
    verified: true,
    avatar: avatarRani,
    hero: productCosmetics,
    gallery: [productCosmetics, productPerfume, productBags, productCleaning],
    category: "product",
    kind: "carousel",
    badge: "HOT",
    priceFrom: 499,
  },
  {
    id: "v2",
    title: "Electronics | Hub",
    tagline: "Repairs · gadgets · accessories",
    rating: 4.6,
    reviews: 287,
    km: 2.4,
    lat: 28.6519,
    lng: 77.1909,
    address: "Karol Bagh, Delhi",
    verified: true,
    avatar: avatarUser,
    hero: svcElectronics,
    gallery: [svcElectronics, productCleaning, svcAc, productCosmetics],
    category: "product",
    kind: "video",
    badge: "TRENDING",
    priceFrom: 199,
  },
  {
    id: "v3",
    title: "Carpenter | Service",
    tagline: "Furniture · interiors · on-demand",
    rating: 4.8,
    reviews: 555,
    km: 0.8,
    lat: 28.6448,
    lng: 77.2167,
    address: "Paharganj, Delhi",
    verified: true,
    avatar: avatarRaj,
    hero: svcCarpenter,
    gallery: [svcCarpenter, productBags, productCleaning, productPerfume],
    category: "service",
    kind: "spotlight",
    badge: "LOW PRICE",
    priceFrom: 299,
  },
  {
    id: "v4",
    title: "Aurum Perfumery",
    tagline: "Hand-blended oud · amber · musk",
    rating: 4.9,
    reviews: 412,
    km: 3.1,
    lat: 28.6315,
    lng: 77.2167,
    address: "Connaught Place, Delhi",
    verified: true,
    avatar: avatarAryan,
    hero: productPerfume,
    gallery: [productPerfume, productCosmetics, productBags, productCleaning],
    category: "product",
    kind: "gallery",
    badge: "NEW",
    priceFrom: 1299,
  },
  {
    id: "v5",
    title: "Car | Service",
    tagline: "Doorstep wash · detailing · AC",
    rating: 4.7,
    reviews: 318,
    km: 4.6,
    lat: 28.5677,
    lng: 77.2436,
    address: "Lajpat Nagar, Delhi",
    verified: true,
    avatar: avatarAryan,
    hero: svcAc,
    gallery: [svcAc, svcElectronics, productCleaning, productBags],
    category: "service",
    kind: "carousel",
    priceFrom: 599,
  },
  {
    id: "v6",
    title: "Home Essentials",
    tagline: "Eco-cleaning · refills · hampers",
    rating: 4.8,
    reviews: 246,
    km: 5.2,
    lat: 28.6469,
    lng: 77.1199,
    address: "Rajouri Garden, Delhi",
    verified: true,
    avatar: avatarRani,
    hero: productCleaning,
    gallery: [productCleaning, productCosmetics, productPerfume, productBags],
    category: "product",
    kind: "gallery",
    badge: "LOW PRICE",
    priceFrom: 149,
  },
];

const SECTION_RAILS: { id: string; title: string; icon: typeof Flame; vendors: Vendor[] }[] = [
  { id: "hot", title: "Hot Shops", icon: Flame, vendors: [VENDORS[0], VENDORS[1], VENDORS[3]] },
  { id: "recent", title: "Recently Active", icon: Sparkles, vendors: [VENDORS[2], VENDORS[4], VENDORS[5]] },
  { id: "low", title: "Low Price Picks", icon: Tag, vendors: [VENDORS[5], VENDORS[2], VENDORS[1]] },
];

function VendorsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const geo = useGeolocation();

  // Filter state (lifted up so map + sheet share the same visible set)
  const [city, setCity] = useState<string>("All");
  const [area, setArea] = useState<string>("All");
  const [trader, setTrader] = useState<"All" | "Wholesaler" | "Retailer">("All");
  const [maxKm, setMaxKm] = useState<number>(25);
  const [category, setCategory] = useState<string>("All");

  // Live origin for both Google ETA and real-data nearby query
  const origin0 = geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;

  // Real digital shops from DB (nearby + live). Falls back to dummy when empty.
  const [shops, setShops] = useState<DigitalShop[]>([]);
  useEffect(() => {
    let cancel = false;
    getNearbyDigitalShops({ data: { origin: origin0, radiusKm: 25 } })
      .then((res) => {
        if (cancel) return;
        if (res.ok) setShops(res.shops.filter((s) => s.is_online));
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [origin0?.lat, origin0?.lng]);

  const realVendors: Vendor[] = useMemo(() => {
    return shops.map((s: DigitalShop): Vendor => {
      const hero = s.cover_image_url || s.avatar_url || productCosmetics;
      const gallery = [hero];
      return {
        id: s.id,
        title: s.business_name || s.owner_name || "Digital Shop",
        tagline: s.deals_in || s.trade || "Verified digital store",
        rating: 4.8,
        reviews: 0,
        km: s.km ?? 0,
        lat: s.lat ?? 0,
        lng: s.lng ?? 0,
        address: s.trade || "Near you",
        verified: s.verified,
        avatar: s.avatar_url || avatarUser,
        hero,
        gallery,
        category: "product",
        kind: s.cover_video_url ? "video" : "carousel",
        priceFrom: undefined,
      };
    });
  }, [shops]);

  const sourceList: Vendor[] = realVendors.length > 0 ? realVendors : VENDORS;

  const filtered = useMemo(() => {
    if (!query.trim()) return sourceList;
    const q = query.toLowerCase();
    return sourceList.filter((v) => v.title.toLowerCase().includes(q));
  }, [query, sourceList]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((v) => {
      const c = v.address.split(",").map((s) => s.trim()).filter(Boolean).pop();
      if (c) set.add(c);
    });
    return ["All", ...Array.from(set)];
  }, [filtered]);
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((v) => {
      const parts = v.address.split(",").map((s) => s.trim()).filter(Boolean);
      const vCity = parts[parts.length - 1] ?? "";
      if (city !== "All" && vCity !== city) return;
      if (parts.length >= 2) set.add(parts[0]);
    });
    return ["All", ...Array.from(set)];
  }, [filtered, city]);

  const visible = useMemo(() => {
    const catLabel = CATS.find((c) => c.key === category)?.label.toLowerCase();
    return filtered.filter((v) => {
      const parts = v.address.split(",").map((s) => s.trim()).filter(Boolean);
      const vCity = parts[parts.length - 1] ?? "";
      const vArea = parts[0] ?? "";
      if (city !== "All" && vCity !== city) return false;
      if (area !== "All" && vArea !== area) return false;
      if (maxKm > 0 && v.km > maxKm) return false;
      if (trader === "Wholesaler" && !((v.priceFrom ?? 0) >= 500)) return false;
      if (trader === "Retailer" && !((v.priceFrom ?? 0) < 500)) return false;
      if (catLabel && category !== "All") {
        const hay = `${v.title} ${v.tagline}`.toLowerCase();
        if (!hay.includes(catLabel)) return false;
      }
      return true;
    });
  }, [filtered, city, area, maxKm, trader, category]);

  const origin = geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null;
  const dests = useMemo(() => visible.map((v) => ({ lat: v.lat, lng: v.lng })), [visible]);
  const etaList = useDistanceMatrix(origin, dests);
  const etas = useMemo(() => {
    const map: Record<string, { km: string; eta: string; live: boolean }> = {};
    visible.forEach((v, i) => {
      const e = etaList[i];
      if (e) map[v.id] = { km: e.kmText, eta: e.etaText, live: e.source === "google" };
    });
    return map;
  }, [visible, etaList]);

  const mapVendors = useMemo(
    () =>
      visible
        .filter((v) => v.lat && v.lng)
        .map((v) => ({
          id: v.id,
          name: v.title,
          avatar: v.avatar,
          x: 50,
          y: 50,
          area: v.address,
          km: v.km,
          status: "Office" as const,
          lat: v.lat,
          lng: v.lng,
        })),
    [visible],
  );

  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);
  const MAP_PCT = 42; // % of viewport for the map area — sheet lives below

  return (
    <div className="fixed inset-0 overflow-hidden bg-white isolate flex flex-col" style={{ touchAction: "auto" }}>
      {/* Real Google Map — locked to the top area. Sheet never covers it. */}
      <section
        className="relative z-0 flex-shrink-0"
        style={{ height: `${MAP_PCT}vh` }}
      >
        <QuickServiceMap
          center={origin}
          vendors={mapVendors}
          userAvatar={avatarUser}
          userLabel={geo.label}
          geoStatus={geo.status}
          radiusKm={maxKm}
        />

        {/* Top-right: shop on/off toggle — flipping ON jumps to vendor panel */}
        <div className="absolute top-3 right-3 z-30">
          <ShopLiveToggle redirectOnEnable />
        </div>
      </section>

      <VendorsSheet>
        <SheetBody
          query={query}
          setQuery={setQuery}
          visible={visible}
          etas={etas}
          city={city} setCity={setCity}
          area={area} setArea={setArea}
          trader={trader} setTrader={setTrader}
          maxKm={maxKm} setMaxKm={setMaxKm}
          category={category} setCategory={setCategory}
          cityOptions={cityOptions}
          areaOptions={areaOptions}
          onOpen={(id) => {
            const v = visible.find((x) => x.id === id) ?? sourceList.find((x) => x.id === id);
            if (v) setDetailVendor(v);
          }}
          onInquiry={(v) => navigate({
            to: "/chat",
            search: {
              productId: v.id,
              productName: v.title,
              productImage: v.hero,
              productPrice: v.priceFrom ?? 0,
              mode: "inquiry",
            } as never,
          })}
        />
      </VendorsSheet>

      {/* Product / shop detail sheet — opens smoothly with an X close in top-right */}
      <Sheet open={!!detailVendor} onOpenChange={(o) => !o && setDetailVendor(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[88vh] overflow-y-auto">
          {detailVendor && (
            <div className="relative">
              <button
                onClick={() => setDetailVendor(null)}
                aria-label="Close"
                className="absolute top-3 right-3 z-20 h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.72_0.01_260/0.5)] shadow-md active:scale-90"
              >
                <X className="h-4 w-4 text-[color:oklch(0.25_0.05_85)]" strokeWidth={2.6} />
              </button>
              <img
                src={detailVendor.hero}
                alt={detailVendor.title}
                className="w-full h-64 object-cover"
              />
              <div className="p-5 space-y-3">
                <div>
                  <h2 className="font-display text-lg text-gold-gradient font-bold leading-tight">
                    {detailVendor.title}
                  </h2>
                  <p className="text-xs text-[color:oklch(0.45_0.05_85)] mt-0.5">{detailVendor.tagline}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.45)] text-[11px] font-bold text-[color:oklch(0.40_0.10_82)]">
                    <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
                    {detailVendor.rating} ({detailVendor.reviews})
                  </span>
                  {detailVendor.verified && (
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] font-bold text-emerald-700">
                      <BadgeCheck className="h-3 w-3 fill-emerald-600 text-white" />
                      Trusted
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.4)] text-[11px] font-bold text-[color:oklch(0.30_0.05_85)]">
                    <MapPin className="h-3 w-3" /> {detailVendor.address}
                  </span>
                </div>
                {detailVendor.priceFrom !== undefined && (
                  <p className="font-display text-base text-gold-gradient font-bold">From ₹{detailVendor.priceFrom}</p>
                )}
                <button
                  onClick={() => {
                    const v = detailVendor;
                    setDetailVendor(null);
                    navigate({
                      to: "/chat",
                      search: {
                        productId: v.id,
                        productName: v.title,
                        productImage: v.hero,
                        productPrice: v.priceFrom ?? 0,
                        mode: "inquiry",
                      } as never,
                    });
                  }}
                  className="w-full h-12 rounded-full bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] border border-[color:oklch(0.78_0.14_82/0.7)] text-[color:oklch(0.20_0.05_60)] shadow font-display font-bold italic flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send Inquiry
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}


/* -------- Vendors Sheet -------- */

function VendorsSheet({ children }: { children: React.ReactNode }) {
  return (
    <aside className="relative z-20 -mt-1 flex-1 min-h-0">
      <div
        className="h-full bg-gradient-to-b from-white via-white to-[#fffaf0] rounded-t-[28px] shadow-[0_-18px_40px_-12px_rgba(212,175,55,0.35),0_-2px_0_rgba(212,175,55,0.4)] border-t border-[color:oklch(0.78_0.14_82/0.5)] flex flex-col overflow-hidden"
      >
        {/* Drag handle */}
        <div className="flex flex-col items-center pt-2 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
          <span className="h-1.5 w-12 rounded-full bg-gradient-to-r from-[#e7c764] via-[#d4af37] to-[#e7c764]" />
          <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)] font-bold">
            All Digital Shops
          </span>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}

/* -------- Sheet body -------- */

function SheetBody({
  query, setQuery, visible, etas, onOpen, onInquiry,
  city, setCity, area, setArea, trader, setTrader, maxKm, setMaxKm,
  category, setCategory, cityOptions, areaOptions,
}: {
  query: string;
  setQuery: (s: string) => void;
  visible: Vendor[];
  etas: Record<string, { km: string; eta: string; live: boolean }>;
  onOpen: (id: string) => void;
  onInquiry: (v: Vendor) => void;
  city: string; setCity: (v: string) => void;
  area: string; setArea: (v: string) => void;
  trader: "All" | "Wholesaler" | "Retailer"; setTrader: (v: "All" | "Wholesaler" | "Retailer") => void;
  maxKm: number; setMaxKm: (v: number) => void;
  category: string; setCategory: (v: string) => void;
  cityOptions: string[];
  areaOptions: string[];
}) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [picker, setPicker] = useState<null | "reselling" | "browse">(null);
  const [defaultHome, setDefaultHome] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ac");
  const [pulseKey, setPulseKey] = useState<string>("");
  const [openPicker, setOpenPicker] = useState<null | "city" | "area" | "trader" | "range" | "category">(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDefaultHome(localStorage.getItem("ko-default-home"));
  }, [picker]);

  const handleResellingSelect = (value: string) => {
    setPicker(null);
    if (value === "quick") setTimeout(() => navigate({ to: "/quick" }), 250);
    else if (value === "vendor") setTimeout(() => navigate({ to: "/register" }), 250);
    else if (value === "all") setTimeout(() => navigate({ to: "/vendors" }), 250);
    else setTimeout(() => navigate({ to: "/" }), 250);
  };
  const handleSetDefault = (value: string) => {
    if (typeof window !== "undefined") localStorage.setItem("ko-default-home", value);
    setDefaultHome(value);
  };
  const handleBrowsePick = (mode: string) => {
    setPicker(null);
    setTimeout(() => navigate({ to: mode === "service" ? "/quick" : "/" }), 250);
  };

  const categoryLabel = category === "All" ? "All" : (CATS.find((c) => c.key === category)?.label ?? "All");
  const activeFilterCount =
    (city !== "All" ? 1 : 0) + (area !== "All" ? 1 : 0) + (trader !== "All" ? 1 : 0) +
    (category !== "All" ? 1 : 0) + (maxKm !== 25 ? 1 : 0);

  return (
    <div className="block">
      {/* SCROLLABLE TOP — search + product cards */}
      <div className="px-4 pt-2" style={{ paddingBottom: "16px", touchAction: "pan-y" }}>
        {/* Search row: My Orders | Search | Profile */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate({ to: "/orders" })}
            className="h-11 w-11 rounded-full grid place-items-center bg-gradient-to-b from-[#fff5e6] to-[#fde0b8] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_3px_10px_-2px_rgba(212,175,55,0.45)] active:scale-95 flex-shrink-0 relative"
            aria-label="My Orders"
          >
            <Package className="h-5 w-5 text-[color:oklch(0.50_0.18_50)]" strokeWidth={2.4} />
            <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-1 rounded-full bg-red-500 text-white text-[8px] font-bold grid place-items-center">•</span>
          </button>
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
            className="h-11 w-11 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-[0_2px_10px_-2px_rgba(212,175,55,0.5)] flex-shrink-0 relative"
            aria-label="Profile"
          >
            <img src={avatarUser} alt="" className="h-full w-full object-cover" />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 rounded bg-gradient-to-r from-[#e7c764] to-[#d4af37] text-white text-[7px] font-bold whitespace-nowrap">★ 4.9</span>
          </button>
        </div>

        {/* Filter pills — each opens a bottom-sheet picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide overscroll-x-contain">
          <button
            onClick={() => { setCity("All"); setArea("All"); setTrader("All"); setMaxKm(25); setCategory("All"); }}
            disabled={activeFilterCount === 0}
            className={`flex-shrink-0 h-8 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-bold border transition-all ${
              activeFilterCount > 0
                ? "bg-gradient-to-r from-[#d97706] to-[#c2410c] text-white border-[#c2410c] shadow"
                : "bg-white text-[color:oklch(0.55_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)] opacity-60"
            }`}
            aria-label="Reset filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 ? `Clear (${activeFilterCount})` : "Filters"}
          </button>
          <FilterPill label="City" value={city} onTap={() => setOpenPicker("city")} />
          <FilterPill label="Area" value={area} onTap={() => setOpenPicker("area")} />
          <FilterPill label="Category" value={categoryLabel} onTap={() => setOpenPicker("category")} />
          <FilterPill label="Trade" value={trader} onTap={() => setOpenPicker("trader")} />
          <FilterPill label="Range" value={`${maxKm} km`} onTap={() => setOpenPicker("range")} />
        </div>

        {/* Compact vendor cards — 3 visible per screen */}
        <div className="space-y-2">
          {visible.map((v) => (
            <div key={v.id}>
              <ShopCard3D vendor={v} eta={etas[v.id]} onOpen={onOpen} onInquiry={onInquiry} />
            </div>
          ))}
          {visible.length === 0 && (
            <div className="py-10 text-center text-xs text-[color:oklch(0.55_0.10_82)] font-semibold">
              No shops match these filters. Try clearing them.
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-[color:oklch(0.55_0.10_82)] font-semibold mt-6 mb-2 italic">
          ✦ End of digital marketplace ✦
        </p>
      </div>

      {/* Bottom-sheet pickers for filters */}
      <PickerSheet
        open={openPicker === "city"}
        title="Select City"
        options={cityOptions}
        value={city}
        onPick={(v) => { setCity(v); if (v !== city) setArea("All"); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        open={openPicker === "area"}
        title={city === "All" ? "Select Area" : `Areas in ${city}`}
        options={areaOptions}
        value={area}
        onPick={(v) => { setArea(v); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        open={openPicker === "trader"}
        title="Trade Type"
        options={["All", "Wholesaler", "Retailer"]}
        value={trader}
        onPick={(v) => { setTrader(v as typeof trader); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
      />
      <PickerSheet
        open={openPicker === "category"}
        title="Choose Category"
        options={["All", ...CATS.map((c) => c.label)]}
        value={categoryLabel}
        onPick={(label) => {
          if (label === "All") setCategory("All");
          else {
            const hit = CATS.find((c) => c.label === label);
            if (hit) setCategory(hit.key);
          }
          setOpenPicker(null);
        }}
        onClose={() => setOpenPicker(null)}
      />
      <Sheet open={openPicker === "range"} onOpenChange={(o) => !o && setOpenPicker(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Distance: within {maxKm} km</SheetTitle>
          </SheetHeader>
          <div className="pt-4 pb-2">
            <input
              type="range"
              min={1}
              max={50}
              value={maxKm}
              onChange={(e) => setMaxKm(parseInt(e.target.value))}
              className="w-full accent-[#d97706]"
            />
            <div className="flex justify-between text-[10px] text-[color:oklch(0.45_0.08_85)] font-bold mt-1">
              <span>1 km</span><span>25 km</span><span>50 km</span>
            </div>
            <button
              onClick={() => setOpenPicker(null)}
              className="mt-4 w-full h-11 rounded-full bg-gradient-to-r from-[#d97706] to-[#c2410c] text-white text-sm font-bold"
            >
              Apply
            </button>
          </div>
        </SheetContent>
      </Sheet>




      {/* STICKY BOTTOM (inside sheet) — categories chips + Sarvic|Products bar */}
      <div className="sticky bottom-0 z-30 bg-white border-t border-[color:oklch(0.78_0.14_82/0.3)] pt-2 pb-2 px-4 shadow-[0_-6px_18px_-6px_rgba(0,0,0,0.12)] relative">
        {/* Floating + button — Add | Neds */}
        <button
          onClick={() => setNeedsOpen(true)}
          aria-label="Add need"
          className="btn-3d absolute z-40 right-5 grid place-items-center"
          style={{ bottom: "calc(100% + 4px)" }}
        >
          <span className="relative h-14 w-14 rounded-full grid place-items-center bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] border-4 border-white shadow-[0_8px_22px_-4px_rgba(0,0,0,0.4)]">
            <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(220,38,38,0.4)" }} />
            <Plus className="relative h-7 w-7 text-[color:oklch(0.30_0.05_85)]" strokeWidth={3} />
          </span>
        </button>

        {/* Categories — same as Quick page */}
        <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide overscroll-x-contain">
          {CATS.map((c, i) => {
            const Icon = c.Icon;
            const isActive = categoryFilter === c.key;
            const isPulsing = pulseKey.startsWith(`${c.key}-`);
            return (
              <button
                key={c.key}
                onClick={() => { setCategoryFilter(c.key); setPulseKey(`${c.key}-${Date.now()}`); }}
                className={`btn-3d relative flex-shrink-0 h-11 w-11 rounded-full grid place-items-center border-2 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-[#d97706] to-[#c2410c] border-[#c2410c] shadow-[0_4px_14px_-2px_rgba(194,65,12,0.6)] scale-110"
                    : c.tone === "muted"
                    ? "bg-white border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm"
                    : "bg-white/60 border-[color:oklch(0.78_0.14_82/0.25)]"
                }`}
                style={{ animation: `fade-up 0.4s ease-out ${i * 0.03}s both` }}
                aria-label={c.label}
              >
                {isPulsing && (
                  <span
                    key={pulseKey}
                    className="absolute inset-0 rounded-full bg-[color:oklch(0.78_0.14_82/0.55)]"
                    style={{ animation: "ping-slow 0.7s ease-out 1" }}
                  />
                )}
                <Icon className={`relative h-5 w-5 ${isActive ? "text-white scale-110" : "text-[color:oklch(0.45_0.08_85)]"}`} strokeWidth={2.2} />
              </button>
            );
          })}
        </div>

        {/* Sarvic|Products  /  Quick|Sarvic bar */}
        <div className="mt-2 relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/98 to-[oklch(0.97_0.02_88)] border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_-4px_18px_-6px_rgba(212,175,55,0.35)] flex items-center justify-between px-2 py-2">
          <button
            onClick={() => setPicker("browse")}
            className="btn-3d flex items-center gap-1.5 active:scale-95 px-2 py-1 rounded-2xl"
            aria-label="Sarvic Products"
          >
            <span className="relative h-8 w-8 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border-2 border-[color:oklch(0.78_0.14_82/0.7)] shadow-gold-glow">
              <img src={goldPin} alt="" className="h-4 w-4 object-contain" />
            </span>
            <span className="font-display text-[13px] text-gold-gradient font-bold italic tracking-tight">
              Sarvic<span className="font-light"> | </span>Products
            </span>
            <span className="text-[color:oklch(0.78_0.14_82)] text-xs">▾</span>
          </button>

          <button
            onClick={() => setPicker("reselling")}
            className="btn-3d flex items-center gap-1.5 active:scale-95 px-2 py-1 rounded-2xl"
            aria-label="Quick Sarvic"
          >
            <span className="text-[color:oklch(0.55_0.18_60)] text-base">⚡</span>
            <span className="font-display text-[13px] text-gold-gradient font-bold italic tracking-tight">
              Quick<span className="font-light"> | </span>Sarvic
            </span>
            <span className="text-[color:oklch(0.78_0.14_82)] text-xs">▾</span>
          </button>
        </div>
      </div>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(q: string) => { setQuery(q); }}
      />
      <NeedsSheet
        open={needsOpen}
        category={CATS.find((c) => c.key === categoryFilter)?.label ?? null}
        onClose={() => setNeedsOpen(false)}
        onSubmit={() => setNeedsOpen(false)}
      />
      <ActionPicker
        open={picker === "reselling"}
        title="Reselling Program"
        subtitle="Choose how you want to engage"
        options={RESELLING_OPTIONS}
        onSelect={handleResellingSelect}
        onClose={() => setPicker(null)}
        defaultValue={defaultHome ?? undefined}
        onSetDefault={handleSetDefault}
      />
      <ProductServicePicker
        open={picker === "browse"}
        onClose={() => setPicker(null)}
        onCategoryPick={(mode) => handleBrowsePick(mode)}
      />
      {/* Suppress unused warning */}
      <span className="hidden" data-q={query} />
    </div>
  );
}

/* -------- 3D Shop Card with auto-sliding media -------- */

function ShopCard3D({
  vendor, eta, onOpen, onInquiry, featured = false,
}: {
  vendor: Vendor;
  eta?: { km: string; eta: string; live: boolean };
  onOpen: (id: string) => void;
  onInquiry: (v: Vendor) => void;
  featured?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const len = vendor.gallery.length;

  // Auto-slide for carousel/gallery/spotlight kinds — calm 2.6s cadence
  useEffect(() => {
    if (vendor.kind === "video") return;
    const id = setInterval(() => setIdx((i) => (i + 1) % len), 2600);
    return () => clearInterval(id);
  }, [vendor.kind, len]);

  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i + 1) % len); };
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i - 1 + len) % len); };

  const badgeColor =
    vendor.badge === "HOT" ? "from-[#f5d97a] to-[#d4af37]" :
    vendor.badge === "NEW" ? "from-[#fff8dc] to-[#e7c764]" :
    vendor.badge === "LOW PRICE" ? "from-[#fde68a] to-[#d4af37]" :
    "from-[#f5d97a] to-[#b8860b]";

  return (
    <motion.article
      initial={false}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={() => onOpen(vendor.id)}
      className={`group relative rounded-3xl overflow-hidden cursor-pointer
        bg-gradient-to-b from-white via-white to-[#fffaf0]
        border border-[color:oklch(0.78_0.14_82/0.5)]
        shadow-[0_8px_28px_-10px_rgba(212,175,55,0.45),0_2px_0_rgba(255,255,255,0.9)_inset,0_-2px_0_rgba(212,175,55,0.18)_inset]
        ${featured ? "p-3" : "p-2.5"}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Top badge ribbon */}
      {vendor.badge && (
        <div className={`absolute top-3 left-3 z-20 px-2 py-1 rounded-full bg-gradient-to-r ${badgeColor} text-[9px] font-display font-bold text-[color:oklch(0.20_0.05_60)] shadow-[0_3px_10px_-2px_rgba(212,175,55,0.7)] flex items-center gap-1 uppercase tracking-wider`}>
          {vendor.badge === "HOT" && <Flame className="h-2.5 w-2.5" />}
          {vendor.badge === "NEW" && <Sparkles className="h-2.5 w-2.5" />}
          {vendor.badge === "LOW PRICE" && <Tag className="h-2.5 w-2.5" />}
          {vendor.badge === "TRENDING" && <Flame className="h-2.5 w-2.5" />}
          {vendor.badge}
        </div>
      )}

      {/* Distance chip — live driving km + ETA from Google Distance Matrix */}
      <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded-full bg-white/95 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] text-[9px] font-bold text-[color:oklch(0.30_0.05_85)] shadow flex items-center gap-1">
        <MapPin className="h-2.5 w-2.5 text-[color:oklch(0.55_0.18_55)]" />
        {eta ? (
          <span className="flex items-center gap-1">
            {eta.km} · {eta.eta}
            {eta.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          </span>
        ) : (
          <span>{vendor.km} km</span>
        )}
      </div>

      {/* Shop "chhatri" — striped awning canopy on top of the media */}
      <div className="relative">
        <div
          aria-hidden
          className="h-3.5 w-full rounded-t-2xl border-x border-t border-[color:oklch(0.78_0.14_82/0.4)]"
          style={{
            background:
              "repeating-linear-gradient(135deg, #f97316 0 14px, #ffffff 14px 28px)",
            boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
        />
        <svg
          aria-hidden
          viewBox="0 0 120 8"
          preserveAspectRatio="none"
          className="-mt-px block h-2 w-full"
        >
          <path d="M0 0 L0 2 Q6 8 12 2 Q18 8 24 2 Q30 8 36 2 Q42 8 48 2 Q54 8 60 2 Q66 8 72 2 Q78 8 84 2 Q90 8 96 2 Q102 8 108 2 Q114 8 120 2 L120 0 Z" fill="#f97316" />
        </svg>
      </div>

      {/* Media stage — calm, smooth, no metallic shimmer */}
      <div className={`relative ${featured ? "h-40" : "h-20"} rounded-2xl overflow-hidden bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.4)] shadow-inner`}>
        {/* Horizontal sliding image track — banner style, ~700ms ease */}
        <div
          className="absolute inset-0 flex h-full"
          style={{
            width: `${len * 100}%`,
            transform: `translate3d(-${(idx * 100) / len}%, 0, 0)`,
            transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {vendor.gallery.map((src, i) => (
            <div
              key={i}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / len}%` }}
            >
              <img
                src={src}
                alt={vendor.title}
                loading="lazy"
                className="h-full w-full object-cover"
                draggable={false}
              />
              {/* Soft static bottom gradient for legibility — no mix-blend, no shimmer */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Video play overlay */}
        {vendor.kind === "video" && (
          <>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="h-14 w-14 rounded-full bg-white/95 grid place-items-center shadow-[0_6px_20px_rgba(212,175,55,0.55)] animate-pulse">
                <Play className="h-6 w-6 text-[color:oklch(0.45_0.18_55)] fill-current ml-0.5" />
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
              className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white grid place-items-center"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold uppercase tracking-wider">
              Live
            </span>
          </>
        )}

        {/* Carousel arrows */}
        {(vendor.kind === "carousel" || vendor.kind === "gallery") && len > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/85 text-[color:oklch(0.30_0.05_85)] grid place-items-center shadow active:scale-90 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/85 text-[color:oklch(0.30_0.05_85)] grid place-items-center shadow active:scale-90 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Slide dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {vendor.gallery.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === idx
                  ? "w-5 bg-gradient-to-r from-[#fff8dc] to-[#d4af37]"
                  : "w-1 bg-white/60"
              }`}
            />
          ))}
        </div>

        {/* Vendor mini profile chip on media */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-1.5 py-1 rounded-full bg-white/95 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] shadow">
          <span className="h-5 w-5 rounded-full overflow-hidden border border-[color:oklch(0.78_0.14_82/0.7)]">
            <img src={vendor.avatar} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="text-[9px] font-display font-bold text-[color:oklch(0.30_0.05_85)] leading-none pr-1">
            Vendor
          </span>
        </div>
      </div>

      {/* Bottom info row — compact */}
      <div className="pt-1.5 pb-0.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-[13px] text-gold-gradient font-bold leading-tight truncate">
              {vendor.title}
            </h4>
            <p className="text-[9px] text-[color:oklch(0.45_0.05_85)] truncate leading-tight">{vendor.tagline}</p>
          </div>
          {vendor.priceFrom !== undefined && (
            <div className="text-right flex-shrink-0">
              <p className="font-display text-[11px] text-gold-gradient font-bold leading-none">From ₹{vendor.priceFrom}</p>
            </div>
          )}
        </div>

        {/* Rating + verified + inquiry on one compact row */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.45)] text-[9px] font-bold text-[color:oklch(0.40_0.10_82)]">
            <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
            {vendor.rating}
          </span>
          {vendor.verified && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[9px] font-bold text-emerald-700">
              <BadgeCheck className="h-2.5 w-2.5 fill-emerald-600 text-white" />
              Trusted
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onInquiry(vendor); }}
            className="ml-auto flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] border border-[color:oklch(0.78_0.14_82/0.7)] text-[color:oklch(0.20_0.05_60)] shadow-[0_3px_10px_-3px_rgba(212,175,55,0.6)] active:scale-95"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span className="font-display text-[11px] font-bold italic tracking-tight">Inquiry</span>
          </button>
        </div>
      </div>
    </motion.article>

  );
}

/* -------- Filter pill (opens a bottom-sheet picker on tap) -------- */
function FilterPill({
  label, value, onTap,
}: {
  label: string;
  value: string;
  onTap: () => void;
}) {
  const active = value !== "All" && value !== "25 km";
  return (
    <button
      onClick={onTap}
      className={`flex-shrink-0 h-8 px-3 rounded-full flex items-center gap-1 text-[11px] font-bold border ${
        active
          ? "bg-gradient-to-r from-[#fff8dc] to-[#f5d97a] text-[color:oklch(0.30_0.05_85)] border-[color:oklch(0.78_0.14_82)] shadow-sm"
          : "bg-white text-[color:oklch(0.35_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
      }`}
    >
      <span className="opacity-70">{label}:</span>
      <span className="max-w-[90px] truncate">{value}</span>
      <span className="text-[9px] opacity-60">▾</span>
    </button>
  );
}

/* -------- Generic bottom-sheet picker -------- */
function PickerSheet({
  open, title, options, value, onPick, onClose,
}: {
  open: boolean;
  title: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="pt-3 pb-2 grid gap-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onPick(opt)}
              className={`w-full px-3 py-3 rounded-xl text-left text-sm font-semibold flex items-center justify-between transition ${
                opt === value
                  ? "bg-gradient-to-r from-[#fff8dc] to-[#f5d97a] text-[color:oklch(0.25_0.05_60)] border border-[color:oklch(0.78_0.14_82)]"
                  : "text-[color:oklch(0.30_0.05_85)] hover:bg-[#fffaf0] border border-transparent"
              }`}
            >
              <span className="truncate">{opt}</span>
              {opt === value && <Check className="h-4 w-4 text-[color:oklch(0.50_0.18_50)]" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

