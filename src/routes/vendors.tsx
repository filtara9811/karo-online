import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import {
  ArrowLeft, Languages, Mic, Star, ShieldCheck, Play, BadgeCheck, MessageCircle,
  MapPin, ChevronLeft, ChevronRight, Flame, Sparkles, Tag, Volume2, VolumeX,
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import svcAc from "@/assets/svc-ac.png";
import svcCarpenter from "@/assets/svc-carpenter.png";
import svcElectronics from "@/assets/svc-electronics.png";
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
  const [activePin, setActivePin] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return VENDORS;
    const q = query.toLowerCase();
    return VENDORS.filter((v) => v.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="fixed inset-0 bg-white overflow-hidden">
      {/* MAP — fills entire screen, sheet sits on top */}
      <section className="absolute inset-0">
        <MapBg />

        {/* Header */}
        <div className="absolute top-2 left-0 right-0 z-10 px-3 flex items-center justify-between" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Back"
            className="h-10 w-10 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-md active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1.5">
            <button className="h-9 w-9 rounded-full bg-gradient-to-br from-[#fef3c7] to-[#fde68a] grid place-items-center border border-white shadow-md">
              <span className="text-xs">💡</span>
            </button>
            <button className="h-9 w-9 rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] grid place-items-center border border-white shadow-md">
              <Languages className="h-4 w-4 text-[color:oklch(0.45_0.18_55)]" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Pins */}
        <AnimatePresence>
          {PINS.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: -16, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.06 }}
              onClick={() => setActivePin(activePin === p.id ? null : p.id)}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-xl pl-1 pr-2 py-1 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-md">
                <span className="relative h-7 w-7 rounded-full overflow-hidden border-2 border-white">
                  <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                    <svg viewBox="0 0 12 16" className="h-3 w-2.5 text-[color:oklch(0.55_0.18_55)] drop-shadow"><path d="M6 0 C2 0 0 3 0 6 C0 11 6 16 6 16 C6 16 12 11 12 6 C12 3 10 0 6 0 Z" fill="currentColor" /></svg>
                  </span>
                </span>
                <div className="leading-tight text-left">
                  <p className="font-display text-[10px] font-bold text-[color:oklch(0.25_0.05_85)] whitespace-nowrap">{p.name}</p>
                  <p className="text-[7px] text-[color:oklch(0.45_0.08_85)]">📍 {p.area}</p>
                  <p className="text-[7px]">
                    <span className="text-[color:oklch(0.45_0.08_85)]">{p.km} km. </span>
                    <span className={`underline ${p.status === "Online" ? "text-emerald-600" : "text-[color:oklch(0.45_0.18_55)]"} font-semibold`}>{p.status}</span>
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Center "My current location" */}
        <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
          <div className="relative">
            <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(212,175,55,0.45)" }} />
            <svg viewBox="0 0 32 40" className="relative h-14 w-11 drop-shadow-[0_4px_8px_rgba(212,175,55,0.5)]">
              <path d="M16 0 C7 0 0 7 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7 25 0 16 0 Z" fill="oklch(0.55 0.18 82)" stroke="white" strokeWidth="1.5" />
              <circle cx="16" cy="15" r="9" fill="white" />
            </svg>
            <span className="absolute top-[6px] left-1/2 -translate-x-1/2 h-[18px] w-[18px] rounded-full overflow-hidden">
              <img src={avatarRaj} alt="" className="h-full w-full object-cover" />
            </span>
          </div>
          <span className="mt-1 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-display font-bold text-[color:oklch(0.25_0.05_85)] shadow whitespace-nowrap">
            My current location
          </span>
        </div>
      </section>

      {/* DRAGGABLE BOTTOM SHEET */}
      <DraggableSheet>
        <SheetBody
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          onOpen={(id) => navigate({ to: "/home", search: { vendor: id } as never })}
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
      </DraggableSheet>
    </div>
  );
}

/* -------- Draggable Sheet (peek / half / 90%) -------- */

function DraggableSheet({ children }: { children: React.ReactNode }) {
  const [vh, setVh] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 720);
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Snap points expressed as `top` offsets from window top
  const SNAPS = useMemo(() => {
    const peek = vh * 0.55;   // sheet shows ~45% (map fully visible)
    const half = vh * 0.30;   // sheet shows ~70%
    const full = vh * 0.10;   // sheet shows ~90%
    return [full, half, peek];
  }, [vh]);

  const y = useMotionValue(SNAPS[2]);

  useEffect(() => {
    animate(y, SNAPS[2], { type: "spring", stiffness: 300, damping: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SNAPS[2]]);

  const snapTo = (target: number) => {
    animate(y, target, { type: "spring", stiffness: 320, damping: 32 });
  };

  const handleDragEnd = (_e: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    const current = y.get();
    const v = info.velocity.y;
    // pick nearest snap, biased by velocity
    const projected = current + v * 0.18;
    let nearest = SNAPS[0];
    let bestDist = Infinity;
    for (const s of SNAPS) {
      const d = Math.abs(s - projected);
      if (d < bestDist) { bestDist = d; nearest = s; }
    }
    snapTo(nearest);
  };

  return (
    <motion.aside
      drag="y"
      dragConstraints={{ top: SNAPS[0], bottom: SNAPS[2] }}
      dragElastic={0.04}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ y, top: 0, height: vh }}
      className="absolute left-0 right-0 z-20 will-change-transform"
    >
      <div
        className="h-full bg-gradient-to-b from-white via-white to-[#fffaf0] rounded-t-[28px] shadow-[0_-18px_40px_-12px_rgba(212,175,55,0.35),0_-2px_0_rgba(212,175,55,0.4)] border-t border-[color:oklch(0.78_0.14_82/0.5)] flex flex-col overflow-hidden"
      >
        {/* Drag handle */}
        <div className="flex flex-col items-center pt-2 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
          <span className="h-1.5 w-12 rounded-full bg-gradient-to-r from-[#e7c764] via-[#d4af37] to-[#e7c764]" />
          <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)] font-bold">
            All Digital Shops · Drag
          </span>
        </div>

        {/* Scrollable content — only scrolls when sheet at full height */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </motion.aside>
  );
}

/* -------- Sheet body -------- */

function SheetBody({
  query, setQuery, filtered, onOpen, onInquiry,
}: {
  query: string;
  setQuery: (s: string) => void;
  filtered: Vendor[];
  onOpen: (id: string) => void;
  onInquiry: (v: Vendor) => void;
}) {
  return (
    <div className="px-4 pt-2">
      {/* Search */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-[#fdfaf0] border border-[color:oklch(0.78_0.14_82/0.45)] px-4 py-2.5 shadow-[0_2px_10px_-3px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search digital shops…"
            className="flex-1 bg-transparent text-sm placeholder:text-[color:oklch(0.55_0.05_85/0.7)] placeholder:italic outline-none"
          />
          <Mic className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" />
        </div>
        <button
          className="h-11 w-11 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-[0_2px_10px_-2px_rgba(212,175,55,0.5)] flex-shrink-0 relative"
          aria-label="Profile"
        >
          <img src={avatarUser} alt="" className="h-full w-full object-cover" />
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 rounded bg-gradient-to-r from-[#e7c764] to-[#d4af37] text-white text-[7px] font-bold whitespace-nowrap">★ 4.9</span>
        </button>
      </div>

      {/* All | Digital shop label */}
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="font-display text-sm italic underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82)] text-gold-gradient font-bold">
          All | Digital Shops
        </span>
        <span className="text-[10px] text-[color:oklch(0.55_0.10_82)] font-semibold">
          {filtered.length} stores nearby
        </span>
      </div>

      {/* Featured 3D card (first vendor, large) */}
      {filtered[0] && (
        <ShopCard3D vendor={filtered[0]} onOpen={onOpen} onInquiry={onInquiry} featured />
      )}

      {/* Section rails */}
      {SECTION_RAILS.map((rail) => (
        <section key={rail.id} className="mt-5">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h3 className="flex items-center gap-1.5 font-display text-[15px] text-gold-gradient font-bold">
              <rail.icon className="h-4 w-4 text-[color:oklch(0.55_0.18_60)]" />
              {rail.title}
            </h3>
            <span className="text-[10px] text-[color:oklch(0.55_0.10_82)] font-semibold">See all ›</span>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
            {rail.vendors.map((v) => (
              <div key={v.id + rail.id} className="snap-start flex-shrink-0 w-[78%]">
                <ShopCard3D vendor={v} onOpen={onOpen} onInquiry={onInquiry} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* All shops grid (vertical stream) */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h3 className="font-display text-[15px] text-gold-gradient font-bold">All Digital Shops</h3>
        </div>
        <div className="space-y-3">
          {filtered.slice(1).map((v, i) => (
            <motion.div
              key={v.id + "-all"}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04 }}
            >
              <ShopCard3D vendor={v} onOpen={onOpen} onInquiry={onInquiry} />
            </motion.div>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] text-[color:oklch(0.55_0.10_82)] font-semibold mt-6 mb-2 italic">
        ✦ End of digital marketplace ✦
      </p>
    </div>
  );
}

/* -------- 3D Shop Card with auto-sliding media -------- */

function ShopCard3D({
  vendor, onOpen, onInquiry, featured = false,
}: {
  vendor: Vendor;
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
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
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

      {/* Distance chip */}
      <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded-full bg-white/95 backdrop-blur border border-[color:oklch(0.78_0.14_82/0.5)] text-[9px] font-bold text-[color:oklch(0.30_0.05_85)] shadow flex items-center gap-1">
        <MapPin className="h-2.5 w-2.5 text-[color:oklch(0.55_0.18_55)]" />
        {vendor.km} km
      </div>

      {/* Media stage — calm, smooth, no metallic shimmer */}
      <div className={`relative ${featured ? "h-52" : "h-40"} rounded-2xl overflow-hidden bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.4)] shadow-inner`}>
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

      {/* Bottom info row */}
      <div className="pt-3 pb-1 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-base text-gold-gradient font-bold leading-tight truncate">
              {vendor.title}
            </h4>
            <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">{vendor.tagline}</p>
            <p className="text-[9px] text-[color:oklch(0.55_0.10_82)] mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{vendor.address}</span>
            </p>
          </div>
          {vendor.priceFrom !== undefined && (
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] font-bold">From</p>
              <p className="font-display text-sm text-gold-gradient font-bold leading-none">₹{vendor.priceFrom}</p>
            </div>
          )}
        </div>

        {/* Rating + verified row */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.45)] text-[9px] font-bold text-[color:oklch(0.40_0.10_82)]">
            <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
            {vendor.rating}
            <span className="opacity-70">· {vendor.reviews}</span>
          </span>
          {vendor.verified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-300 text-[9px] font-bold text-emerald-700">
              <BadgeCheck className="h-2.5 w-2.5 fill-emerald-600 text-white" />
              Trusted
            </span>
          )}
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.35)] text-[9px] font-bold text-[color:oklch(0.40_0.10_82)]">
            <ShieldCheck className="h-2.5 w-2.5 text-[color:oklch(0.55_0.18_55)]" />
            Assured
          </span>
        </div>

        {/* Inquiry CTA — calm gold button (no sweeping reflection) */}
        <button
          onClick={(e) => { e.stopPropagation(); onInquiry(vendor); }}
          className="btn-3d mt-3 w-full relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-gradient-to-b from-[#fff8dc] via-[#f5d97a] to-[#d4af37] border border-[color:oklch(0.78_0.14_82/0.7)] text-[color:oklch(0.20_0.05_60)] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.6),inset_0_1px_0_rgba(255,255,255,0.7)] active:scale-[0.97]"
        >
          <MessageCircle className="h-4 w-4 relative" strokeWidth={2.4} />
          <span className="font-display text-[13px] font-bold italic tracking-tight relative">
            Send Inquiry now
          </span>
        </button>
      </div>
    </motion.article>
  );
}

/* -------- Map background -------- */

function MapBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(160deg, #fff8e7 0%, #fdeec4 40%, #f8e1a0 100%)" }}
      />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M 0 30 Q 25 25 50 35 T 100 33" stroke="rgba(255,255,255,0.85)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 0 70 Q 35 75 55 65 T 100 72" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 25 0 Q 30 40 45 55 T 50 100" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 75 0 Q 70 35 80 55 T 78 100" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M -5 48 Q 30 55 55 47 Q 75 42 105 50" stroke="oklch(0.78 0.14 82)" strokeWidth="6" fill="none" opacity="0.55" />
        {[
          [10, 15, 6, 5], [60, 12, 8, 6], [85, 30, 5, 5],
          [12, 80, 7, 5], [45, 88, 6, 4], [88, 82, 5, 5],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="0.5" fill="rgba(255,255,255,0.6)" />
        ))}
      </svg>
    </div>
  );
}
