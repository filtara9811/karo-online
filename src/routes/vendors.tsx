import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Languages, Mic, Plus, Star, ShieldCheck, Play, BadgeCheck,
  FileText, Wrench, Building2, Building, Cloud, Sparkles,
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

type Tab = "retail" | "all" | "filter";

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

type Vendor = {
  id: string;
  title: string;
  sub: string;
  rating: number;
  reviews: number;
  verified: boolean;
  avatar: string;
  hero: string;
  gallery: string[];
  category: "service" | "product";
};

const VENDORS: Vendor[] = [
  {
    id: "v1",
    title: "Carpenter | Service",
    sub: "Available | Vander",
    rating: 4.9,
    reviews: 555,
    verified: true,
    avatar: avatarRaj,
    hero: svcCarpenter,
    gallery: [productCosmetics, svcCarpenter, productCleaning, productPerfume],
    category: "service",
  },
  {
    id: "v2",
    title: "Car | Service",
    sub: "Basic Details",
    rating: 4.7,
    reviews: 412,
    verified: true,
    avatar: avatarAryan,
    hero: svcAc,
    gallery: [svcAc, svcElectronics, productCosmetics, productPerfume],
    category: "service",
  },
  {
    id: "v3",
    title: "Beauty | Maison",
    sub: "Available | Vander",
    rating: 4.8,
    reviews: 628,
    verified: true,
    avatar: avatarRani,
    hero: productCosmetics,
    gallery: [productCosmetics, productPerfume, productCleaning, svcCarpenter],
    category: "product",
  },
  {
    id: "v4",
    title: "Electronics | Hub",
    sub: "Available | Vander",
    rating: 4.6,
    reviews: 287,
    verified: true,
    avatar: avatarUser,
    hero: svcElectronics,
    gallery: [svcElectronics, productCleaning, svcAc, productCosmetics],
    category: "product",
  },
];

const ROUND_ICONS = [
  { Icon: FileText, tone: "amber" as const },
  { Icon: Wrench, tone: "amber-fill" as const },
  { Icon: Sparkles, tone: "white" as const },
  { Icon: Building2, tone: "amber" as const },
  { Icon: Building, tone: "amber" as const },
  { Icon: Cloud, tone: "amber" as const },
];

function VendorsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [activePin, setActivePin] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return VENDORS;
    const q = query.toLowerCase();
    return VENDORS.filter((v) => v.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden" style={{ paddingBottom: "calc(78px + env(safe-area-inset-bottom))" }}>
      {/* MAP */}
      <section className="relative flex-shrink-0" style={{ height: "32vh", minHeight: 240 }}>
        <MapBg />

        {/* Header */}
        <div className="absolute top-2 left-0 right-0 z-10 px-3 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1.5">
            <button className="h-8 w-8 rounded-full bg-gradient-to-br from-[#fef3c7] to-[#fde68a] grid place-items-center border border-white shadow">
              <span className="text-[10px]">💡</span>
            </button>
            <button className="h-8 w-8 rounded-full bg-gradient-to-br from-[#bfdbfe] to-[#60a5fa] grid place-items-center border border-white shadow">
              <Languages className="h-4 w-4 text-white" strokeWidth={2.4} />
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
                    <svg viewBox="0 0 12 16" className="h-3 w-2.5 text-red-600 drop-shadow"><path d="M6 0 C2 0 0 3 0 6 C0 11 6 16 6 16 C6 16 12 11 12 6 C12 3 10 0 6 0 Z" fill="currentColor" /></svg>
                  </span>
                </span>
                <div className="leading-tight text-left">
                  <p className="font-display text-[10px] font-bold text-[color:oklch(0.25_0.05_85)] whitespace-nowrap">{p.name}</p>
                  <p className="text-[7px] text-[color:oklch(0.45_0.08_85)]">📍 {p.area}</p>
                  <p className="text-[7px]">
                    <span className="text-[color:oklch(0.45_0.08_85)]">{p.km} km. </span>
                    <span className={`underline ${p.status === "Online" ? "text-emerald-600" : "text-blue-600"} font-semibold`}>{p.status}</span>
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Center "My current location" */}
        <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
          <div className="relative">
            <span className="absolute inset-0 rounded-full" style={{ animation: "ping-slow 2s ease-out infinite", background: "rgba(34,197,94,0.45)" }} />
            <svg viewBox="0 0 32 40" className="relative h-14 w-11 drop-shadow-[0_4px_8px_rgba(34,197,94,0.5)]">
              <path d="M16 0 C7 0 0 7 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7 25 0 16 0 Z" fill="#16a34a" stroke="white" strokeWidth="1.5" />
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

        {/* Scale bar */}
        <div className="absolute bottom-1 left-3 right-3 z-30 pointer-events-none">
          <div className="flex items-center justify-between text-[8px] font-bold text-[color:oklch(0.30_0.05_85)] mb-0.5 px-1">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => <span key={n}>{n}</span>)}
          </div>
          <div className="h-2 bg-white/80 border border-[color:oklch(0.30_0.05_85/0.4)] rounded-sm relative">
            <div className="absolute left-[35%] right-[55%] top-[-3px] bottom-[-3px] bg-[color:oklch(0.30_0.05_85/0.85)] rounded-sm" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-4 text-[9px] font-bold whitespace-nowrap">1 km</span>
            <span className="absolute right-0 -top-3 text-[8px] font-bold">⬆ N</span>
          </div>
        </div>
      </section>

      {/* SCROLLABLE BODY */}
      <section className="relative bg-white rounded-t-3xl -mt-5 z-20 flex-1 overflow-y-auto pt-3 px-4 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.15)]">
        {/* Search bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-[#f5f5f5] border border-[color:oklch(0.78_0.14_82/0.3)] px-4 py-2.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search......."
              className="flex-1 bg-transparent text-sm placeholder:text-[#9ca3af] outline-none"
            />
            <Mic className="h-4 w-4 text-[#9ca3af]" />
          </div>
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="h-11 w-11 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-sm flex-shrink-0 relative"
            aria-label="Profile"
          >
            <img src={avatarUser} alt="" className="h-full w-full object-cover" />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1 rounded bg-amber-500 text-white text-[7px] font-bold whitespace-nowrap">★ 4.9</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between text-[12px] font-display mb-3 border-b border-[color:oklch(0.78_0.14_82/0.25)]">
          {([
            { k: "retail", label: "Retail | wolsale | manufacture" },
            { k: "all", label: "All | saler" },
            { k: "filter", label: "Filter" },
          ] as { k: Tab; label: string }[]).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`pb-2 px-1 ${
                tab === t.k
                  ? "text-[color:oklch(0.45_0.18_55)] border-b-2 border-[color:oklch(0.78_0.14_82)] font-bold"
                  : "text-[color:oklch(0.55_0.05_85)]"
              }`}
            >
              <span className="underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82/0.3)]">{t.label}</span>
            </button>
          ))}
        </div>

        {/* HERO MEDIA STRIP — gallery + video */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.4)] mb-4 p-2">
          <div className="grid grid-cols-5 gap-1.5 h-32">
            <img src={productCosmetics} alt="" className="rounded-xl object-cover h-full w-full col-span-1" />
            <img src={productPerfume} alt="" className="rounded-xl object-cover h-full w-full col-span-1" />
            <div className="relative rounded-xl overflow-hidden col-span-1">
              <img src={productCosmetics} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <div className="h-9 w-9 rounded-full bg-white/95 grid place-items-center shadow">
                  <Play className="h-4 w-4 text-[color:oklch(0.45_0.18_55)] fill-current ml-0.5" />
                </div>
              </div>
              <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-amber-500 text-white text-[8px] font-bold flex items-center gap-0.5">
                <Star className="h-2 w-2 fill-current" /> 4.9
              </span>
            </div>
            <img src={productCleaning} alt="" className="rounded-xl object-cover h-full w-full col-span-1" />
            <img src={productPerfume} alt="" className="rounded-xl object-cover h-full w-full col-span-1" />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow">
            <span className="h-5 w-5 rounded-full overflow-hidden border border-amber-400">
              <img src={avatarRaj} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="text-[9px] font-display font-bold text-[color:oklch(0.30_0.05_85)] leading-tight">
              Basic Details<br /><span className="text-[7px] opacity-75">Available | Vander</span>
            </span>
          </div>
        </div>

        {/* VENDOR CARDS */}
        <div className="space-y-3 pb-4">
          {filtered.map((v, i) => (
            <motion.article
              key={v.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] p-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.35)]"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border border-amber-300 flex-shrink-0">
                  <img src={v.hero} alt={v.title} className="h-full w-full object-contain p-1" />
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/55 backdrop-blur-sm flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full overflow-hidden border border-white">
                      <img src={v.avatar} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="text-[7px] text-white font-display font-bold leading-none">
                      Basic Details<br /><span className="opacity-80 text-[6px]">Available | Vander</span>
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-lg text-gold-gradient font-bold leading-tight">{v.title}</h4>
                  <p className="text-[11px] text-[color:oklch(0.40_0.05_85)] mt-1">Basic Details</p>
                  <p className="text-[11px] text-[color:oklch(0.40_0.05_85)]">{v.sub}</p>
                  <div className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 w-fit">
                    <span className="text-[8px] font-bold text-emerald-700">⛬ {v.reviews}</span>
                    <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-600">
                      <Star className="h-2.5 w-2.5 fill-current" /> {v.rating} vendor
                    </span>
                    {v.verified && (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-700">
                        <BadgeCheck className="h-2.5 w-2.5 fill-current text-emerald-600" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}

          {/* Featured horizontal banner with FAB */}
          <div className="relative rounded-2xl overflow-hidden border border-amber-300 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-200">
            {/* Cartoon clouds & hills */}
            <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <ellipse cx="40" cy="20" rx="14" ry="6" fill="white" opacity="0.85" />
              <ellipse cx="100" cy="14" rx="16" ry="7" fill="white" opacity="0.8" />
              <ellipse cx="160" cy="22" rx="13" ry="5" fill="white" opacity="0.85" />
              <path d="M0 60 Q 50 40 100 55 T 200 50 L 200 80 L 0 80 Z" fill="#86efac" opacity="0.85" />
              <path d="M0 70 Q 60 55 120 65 T 200 62 L 200 80 L 0 80 Z" fill="#4ade80" opacity="0.7" />
            </svg>
            <div className="relative px-3 py-3 flex items-center gap-3">
              <span className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0">
                <img src={avatarRaj} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="flex-1 leading-tight">
                <p className="font-display text-base text-[color:oklch(0.30_0.05_85)] font-bold">Carpenter | Service</p>
                <p className="text-[10px] text-[color:oklch(0.40_0.05_85)]">Available | Vander</p>
              </div>
            </div>
            <div className="relative bg-amber-400/95 px-3 py-2">
              <p className="text-center font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)]">Car | Service</p>
              <p className="text-center text-[10px] text-[color:oklch(0.30_0.05_85)]">Basic Details</p>
            </div>
            <button
              aria-label="Add vendor"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border-4 border-white shadow-xl grid place-items-center active:scale-90 transition"
            >
              <Plus className="h-7 w-7 text-slate-700" strokeWidth={3} />
            </button>
          </div>

          {/* Round category icon row */}
          <div className="flex items-center justify-between gap-2 pt-2 pb-4">
            {ROUND_ICONS.map(({ Icon, tone }, i) => (
              <button
                key={i}
                className={`h-12 w-12 rounded-full grid place-items-center border-2 transition active:scale-90 ${
                  tone === "amber-fill"
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 shadow-lg"
                    : tone === "white"
                    ? "bg-white border-amber-300 shadow"
                    : "bg-white border-amber-400 shadow"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${tone === "amber-fill" ? "text-white" : "text-amber-700"}`}
                  strokeWidth={2}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom dock — vendor specific */}
      <div className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="relative rounded-3xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 border-2 border-amber-300 shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.5)] flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate({ to: "/quick" })}
              className="flex items-center gap-2 active:scale-95"
            >
              <ShieldCheck className="h-5 w-5 text-white" />
              <span className="font-display text-sm text-white font-bold italic">
                Sarvic | Products
              </span>
            </button>
            <div className="h-8 w-px bg-white/40" />
            <button className="flex items-center gap-2 active:scale-95">
              <span className="text-base">🏪</span>
              <span className="font-display text-sm text-amber-900 font-bold italic">
                Seller | vendor
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
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
    </div>
  );
}
