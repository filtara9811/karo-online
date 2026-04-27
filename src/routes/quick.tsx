import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Mic, Plus, Star, ShieldCheck,
  FileText, Wrench, Building2, Building, Cloud, Sparkles, Zap, Truck, ChefHat, Hammer, Paintbrush2,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NeedsSheet } from "@/components/NeedsSheet";
import { VariationSheet, type VariationItem } from "@/components/VariationSheet";
import { FindingVendorOverlay } from "@/components/FindingVendorOverlay";
import { VendorListSheet } from "@/components/VendorListSheet";
import { SearchOverlay } from "@/components/SearchOverlay";
import { useGeolocation } from "@/hooks/use-geolocation";
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

// Map category key → Lucide icon for map pin badge
const CAT_ICON: Record<string, LucideIcon> = {
  ac: Zap,
  carpenter: Hammer,
  electronics: Sparkles,
  paint: Paintbrush2,
  movers: Truck,
  chef: ChefHat,
  doc: FileText,
  tools: Wrench,
  bank: Building2,
  biz: Building,
  cloud: Cloud,
  blank: Sparkles,
};

// Different vendor sets per category — count varies (5 for AC, 6 for carpenter, 4 for electronics, etc.)
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

type ServiceItem = { id: string; title: string; img: string; rating: number; reviews: number; verified: boolean; selected?: boolean };
const SERVICES: ServiceItem[] = [
  { id: "ac", title: "AC | service", img: svcAc, rating: 4.3, reviews: 555, verified: true, selected: true },
  { id: "carpenter", title: "Carpenter | Service", img: svcCarpenter, rating: 4.5, reviews: 412, verified: true },
  { id: "mubaul", title: "Mubaul | Service", img: svcElectronics, rating: 4.2, reviews: 287, verified: true },
];

// Variation items per category
const VARIATIONS: Record<string, VariationItem[]> = {
  ac: [
    { id: "ac-svc", title: "AC | service", sub: "Filter | wholesaler", price: "₹499 – 999", img: svcAc },
    { id: "ac-rep", title: "AC | Repairing", sub: "Filter | wholesaler", price: "₹699 – 1,499", img: svcCarpenter, tone: "green" },
    { id: "ac-ins", title: "AC | installation", sub: "Filter | wholesaler", price: "₹1,299 – 2,499", img: svcElectronics },
  ],
  carpenter: [
    { id: "cp-furn", title: "Furniture | Repair", sub: "Filter | wholesaler", price: "₹399 – 899", img: svcCarpenter },
    { id: "cp-door", title: "Door | Fitting", sub: "Filter | wholesaler", price: "₹599 – 1,299", img: svcCarpenter, tone: "green" },
    { id: "cp-cust", title: "Custom | Wood Work", sub: "Filter | wholesaler", price: "₹1,499 – 4,999", img: svcCarpenter },
  ],
  electronics: [
    { id: "el-mob", title: "Mobile | Repair", sub: "Filter | wholesaler", price: "₹299 – 1,999", img: svcElectronics },
    { id: "el-tv", title: "TV | Service", sub: "Filter | wholesaler", price: "₹499 – 2,499", img: svcElectronics, tone: "green" },
    { id: "el-app", title: "Appliance | Fix", sub: "Filter | wholesaler", price: "₹399 – 1,499", img: svcElectronics },
  ],
};

const DEFAULT_VARIATION = VARIATIONS.ac;

// Filter SERVICES by category — different products per category
const SERVICES_BY_CAT: Record<string, ServiceItem[]> = {
  ac: [
    { id: "ac", title: "AC | service", img: svcAc, rating: 4.3, reviews: 555, verified: true, selected: true },
    { id: "ac-rep", title: "AC | Repairing", img: svcCarpenter, rating: 4.4, reviews: 312, verified: true },
    { id: "ac-ins", title: "AC | Installation", img: svcElectronics, rating: 4.5, reviews: 198, verified: true },
    { id: "ac-gas", title: "AC | Gas Refill", img: svcAc, rating: 4.2, reviews: 142, verified: true },
  ],
  carpenter: [
    { id: "carpenter", title: "Carpenter | Service", img: svcCarpenter, rating: 4.5, reviews: 412, verified: true, selected: true },
    { id: "cp-furn", title: "Furniture | Repair", img: svcCarpenter, rating: 4.3, reviews: 287, verified: true },
    { id: "cp-door", title: "Door | Fitting", img: svcCarpenter, rating: 4.6, reviews: 156, verified: true },
    { id: "cp-cust", title: "Custom | Wood Work", img: svcCarpenter, rating: 4.7, reviews: 98, verified: true },
  ],
  electronics: [
    { id: "mubaul", title: "Mobile | Repair", img: svcElectronics, rating: 4.2, reviews: 287, verified: true, selected: true },
    { id: "el-tv", title: "TV | Service", img: svcElectronics, rating: 4.4, reviews: 198, verified: true },
    { id: "el-app", title: "Appliance | Fix", img: svcElectronics, rating: 4.3, reviews: 156, verified: true },
  ],
  paint: [
    { id: "paint", title: "Painter | Service", img: svcCarpenter, rating: 4.4, reviews: 234, verified: true, selected: true },
    { id: "paint-int", title: "Interior | Paint", img: svcCarpenter, rating: 4.5, reviews: 178, verified: true },
    { id: "paint-ext", title: "Exterior | Paint", img: svcCarpenter, rating: 4.3, reviews: 134, verified: true },
  ],
  movers: [
    { id: "movers", title: "Movers | Packers", img: svcCarpenter, rating: 4.3, reviews: 312, verified: true, selected: true },
    { id: "movers-loc", title: "Local | Shifting", img: svcCarpenter, rating: 4.4, reviews: 234, verified: true },
    { id: "movers-out", title: "Outstation | Moving", img: svcCarpenter, rating: 4.2, reviews: 156, verified: true },
  ],
  chef: [
    { id: "chef", title: "Chef | Booking", img: svcCarpenter, rating: 4.6, reviews: 178, verified: true, selected: true },
    { id: "chef-party", title: "Party | Chef", img: svcCarpenter, rating: 4.5, reviews: 124, verified: true },
  ],
  doc: [
    { id: "doc", title: "Document | Service", img: svcElectronics, rating: 4.4, reviews: 198, verified: true, selected: true },
    { id: "doc-print", title: "Printing | Service", img: svcElectronics, rating: 4.3, reviews: 145, verified: true },
  ],
  tools: [
    { id: "tools", title: "Tools | Rental", img: svcCarpenter, rating: 4.2, reviews: 167, verified: true, selected: true },
  ],
  bank: [
    { id: "bank", title: "Bank | Services", img: svcElectronics, rating: 4.5, reviews: 245, verified: true, selected: true },
  ],
  biz: [
    { id: "biz", title: "Business | Setup", img: svcElectronics, rating: 4.4, reviews: 178, verified: true, selected: true },
  ],
  cloud: [
    { id: "cloud", title: "Cloud | Service", img: svcElectronics, rating: 4.6, reviews: 134, verified: true, selected: true },
  ],
  blank: SERVICES,
};

function QuickPage() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLElement | null>(null);
  // activeCat → drives MAP vendors. Only changes when a SERVICE CARD is tapped.
  const [activeCat, setActiveCat] = useState<string>("ac");
  // categoryFilter → drives PRODUCT LIST filter. Changes when a CATEGORY chip is tapped.
  const [categoryFilter, setCategoryFilter] = useState<string>("ac");
  const [needsOpen, setNeedsOpen] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);
  const [variationCat, setVariationCat] = useState<string>("ac");
  const [pulseKey, setPulseKey] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("ac");
  const [findingOpen, setFindingOpen] = useState(false);
  const [vendorListOpen, setVendorListOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredVendors = useMemo(
    () => VENDORS_BY_CAT[activeCat] ?? DEFAULT_VENDORS,
    [activeCat]
  );

  const filteredServices = useMemo(
    () => SERVICES_BY_CAT[categoryFilter] ?? SERVICES,
    [categoryFilter]
  );

  // Category chip tap → ONLY filter product list. NEVER opens variations.
  // Map stays untouched. Variations only open from double-tapping a SERVICE CARD above.
  const handleCatTap = (key: string) => {
    setCategoryFilter(key);
    setPulseKey(`${key}-${Date.now()}`);
  };

  // Service CARD: first tap → select + update map vendors. Second tap on same selected card → open variation sheet.
  const resolveMapKey = (id: string) => {
    const key = id === "mubaul" ? "electronics" : (id.split("-")[0] === "cp" ? "carpenter" : id.split("-")[0] === "el" ? "electronics" : id.split("-")[0]);
    return VENDORS_BY_CAT[key] ? key : "ac";
  };
  const handleServiceCardTap = (id: string) => {
    const mapKey = resolveMapKey(id);
    if (selectedServiceId === id) {
      setVariationCat(mapKey);
      setVariationOpen(true);
      return;
    }
    // First tap → update map vendors and select the card.
    setActiveCat(mapKey);
    setSelectedServiceId(id);
    setPulseKey(`${mapKey}-${Date.now()}`);
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
      style={{ paddingBottom: "calc(78px + env(safe-area-inset-bottom))" }}
    >
      {/* MAP — extends under device status bar (transparent) */}
      <section className="relative flex-shrink-0" style={{ height: "calc(30vh + env(safe-area-inset-top))", minHeight: 230 }}>
        <FakeMap vendors={filteredVendors} pulseKey={pulseKey} />

        {/* Header — back button only */}
        <div className="absolute left-0 right-0 z-10 px-3 flex items-center justify-between" style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}>
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Back"
            className="btn-3d h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* MIDDLE — scrollable white container with search + tabs + service cards */}
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
        {/* Search bar with profile */}
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

        {/* Section tabs — All | Digital shop  ↔  Quick | sarvic (swipe right to go to /vendors) */}
        <div className="flex items-center justify-between px-2 mb-3">
          <button
            onClick={() => navigate({ to: "/vendors" })}
            className="font-display text-sm italic underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82/0.5)] text-[color:oklch(0.55_0.10_82)] active:scale-95"
          >
            All | Digital shop
          </button>
          <span className="font-display text-sm italic underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82)] text-gold-gradient font-bold">
            Quick | sarvic
          </span>
        </div>

        {/* Vendor service cards — filtered by category chip; tap once to select, tap same card again for variations */}
        <div className="space-y-2.5 pb-4">
          {filteredServices.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handleServiceCardTap(s.id)}
              className={`w-full text-left relative rounded-2xl bg-white border-2 p-2.5 flex items-center gap-3 transition-all active:scale-[0.99] ${
                selectedServiceId === s.id
                  ? "border-[color:oklch(0.78_0.14_82)] shadow-gold-glow"
                  : "border-[color:oklch(0.78_0.14_82/0.25)]"
              }`}
              style={{ animation: `fade-up 0.5s ease-out ${i * 0.06}s both` }}
            >
              <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.4)] grid place-items-center flex-shrink-0 overflow-hidden">
                <img src={s.img} alt={s.title} loading="lazy" className="h-full w-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg text-[color:oklch(0.25_0.05_85)] font-bold leading-tight">{s.title}</h3>
                <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-0.5">Basic Details</p>
                <p className="text-xs text-[color:oklch(0.45_0.08_85)]">Available | Vander · tap again for variations</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
                  <span className="text-[10px] font-bold text-emerald-700">{s.rating}</span>
                  <span className="text-[10px] text-emerald-600">({s.reviews} vendor)</span>
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] font-semibold text-emerald-700">Verified</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* BOTTOM — FIXED categories only (golden hint+button strip removed) */}
      <section className="flex-shrink-0 bg-white border-t border-[color:oklch(0.78_0.14_82/0.3)] pt-2 pb-2 px-4 shadow-[0_-6px_18px_-6px_rgba(0,0,0,0.12)]">
        {/* Categories — circular icons. Tap once → filter products list only. */}
        <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
          {CATS.map((c, i) => {
            const Icon = c.Icon;
            const isActive = categoryFilter === c.key;
            const isPulsing = pulseKey.startsWith(`${c.key}-`);
            return (
              <button
                key={c.key}
                onClick={() => handleCatTap(c.key)}
                className={`btn-3d relative flex-shrink-0 h-11 w-11 rounded-full grid place-items-center border-2 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-[#d97706] to-[#c2410c] border-[#c2410c] shadow-[0_4px_14px_-2px_rgba(194,65,12,0.6)] scale-110"
                    : c.tone === "muted"
                    ? "bg-white border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm hover:scale-105"
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
                <Icon
                  className={`relative h-5 w-5 transition-transform ${isActive ? "text-white scale-110" : "text-[color:oklch(0.45_0.08_85)]"}`}
                  strokeWidth={2.2}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Floating + button — Add | Neds */}
      <button
        onClick={() => setNeedsOpen(true)}
        aria-label="Add need"
        className="btn-3d fixed z-40 right-5 grid place-items-center"
        style={{
          bottom: "calc(120px + env(safe-area-inset-bottom))",
        }}
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
        category={CATS.find((c) => c.key === activeCat)?.label ?? null}
        onClose={() => setNeedsOpen(false)}
        onSubmit={() => setNeedsOpen(false)}
      />

      <VariationSheet
        open={variationOpen}
        category={CATS.find((c) => c.key === variationCat)?.label ?? "Service"}
        vendorLabel="Filter | wholesaler"
        items={VARIATIONS[variationCat] ?? DEFAULT_VARIATION}
        onClose={() => setVariationOpen(false)}
        onSubmit={() => {
          setVariationOpen(false);
          // Tiny delay so sheet animates out before overlay covers the screen
          setTimeout(() => setFindingOpen(true), 200);
        }}
      />

      <FindingVendorOverlay
        open={findingOpen}
        category={CATS.find((c) => c.key === variationCat)?.label ?? "Service"}
        onClose={() => setFindingOpen(false)}
        onComplete={() => {
          setFindingOpen(false);
          setVendorListOpen(true);
        }}
      />

      <VendorListSheet
        open={vendorListOpen}
        category={CATS.find((c) => c.key === variationCat)?.label ?? "Ac"}
        onClose={() => setVendorListOpen(false)}
      />

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(q) => {
          // Could route to a search results page later; for now log
          console.log("Search:", q);
        }}
      />
    </div>
  );
}

function FakeMap({ vendors, pulseKey }: { vendors: Vendor[]; pulseKey?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const geo = useGeolocation();
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

  const resetZoom = () => setTransform({ scale: 1, x: 0, y: 0 });
  void resetZoom;


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
      {/* Map background — pinkish like screenshot */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(160deg, #fde8e4 0%, #fbd4cc 40%, #f8d6c8 100%)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Roads */}
        <path d="M 0 30 Q 25 25 50 35 T 100 33" stroke="rgba(255,255,255,0.85)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 0 70 Q 35 75 55 65 T 100 72" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 25 0 Q 30 40 45 55 T 50 100" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 75 0 Q 70 35 80 55 T 78 100" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Blue river */}
        <path d="M -5 48 Q 30 55 55 47 Q 75 42 105 50" stroke="#7dd3fc" strokeWidth="6" fill="none" opacity="0.85" />
        {/* Buildings (faint) */}
        {[
          [10, 15, 6, 5], [60, 12, 8, 6], [85, 30, 5, 5],
          [12, 80, 7, 5], [45, 88, 6, 4], [88, 82, 5, 5],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="0.5" fill="rgba(255,255,255,0.55)" />
        ))}
      </svg>

      {/* Customer center pin "My current location" */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className="relative">
          <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(220,38,38,0.5)" }} />
          <div className="relative">
            <svg viewBox="0 0 32 40" className="h-12 w-10 drop-shadow-[0_4px_8px_rgba(220,38,38,0.5)]">
              <path d="M16 0 C7 0 0 7 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7 25 0 16 0 Z"
                fill="#dc2626" stroke="white" strokeWidth="1.5" />
              <circle cx="16" cy="15" r="9" fill="white" />
            </svg>
            <span className="absolute top-[6px] left-1/2 -translate-x-1/2 h-[18px] w-[18px] rounded-full overflow-hidden">
              <img src={avatarRaj} alt="" className="h-full w-full object-cover" />
            </span>
          </div>
        </div>
        <span className="mt-1 px-2 py-0.5 rounded bg-white/95 text-[10px] font-display font-bold text-[color:oklch(0.25_0.05_85)] shadow whitespace-nowrap">
          My current location
        </span>
      </div>

      {/* Vendor pins with chips — animated cross-fade + stagger on category change */}
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
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 22,
                delay: i * 0.07,
              }}
            >
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-xl pl-1 pr-2 py-1 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-md">
                <span className="relative h-7 w-7 rounded-full overflow-hidden border-2 border-white">
                  <img src={v.avatar} alt="" className="h-full w-full object-cover" />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                    <svg viewBox="0 0 12 16" className="h-3 w-2.5 text-red-600 drop-shadow"><path d="M6 0 C2 0 0 3 0 6 C0 11 6 16 6 16 C6 16 12 11 12 6 C12 3 10 0 6 0 Z" fill="currentColor" /></svg>
                  </span>
                  {/* Category icon badge */}
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

      {/* Vendor count badge — fixed overlay (not zoomed) */}
      <motion.div
        key={`count-${vendors[0]?.cat ?? "none"}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-20 left-3 z-30 px-2.5 py-1 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow text-[10px] font-display font-bold text-[color:oklch(0.30_0.05_85)]"
      >
        {vendors.length} nearby vendors
      </motion.div>

      {/* Scale bar — drag left/right to zoom out/in */}
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
              // Drag right → zoom IN, drag left → zoom OUT. ~140px = full range.
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
          {/* Active fill showing zoom level */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#fbbf24] to-[#d97706] rounded-sm pointer-events-none"
            style={{ width: `${((transform.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%` }}
          />
          {/* Drag thumb */}
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
