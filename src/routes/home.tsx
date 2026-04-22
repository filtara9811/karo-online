import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Shirt, Sparkles, ShoppingBasket, Tv, Home as HomeIcon, Gem,
  Footprints, Lamp, Flower2, Trophy, Baby, Car, X, Flame, Crown, Star, Plus, Check,
  type LucideIcon,
} from "lucide-react";
import goldBriefcase from "@/assets/gold-briefcase.png";
import vendorDelivery from "@/assets/vendor-delivery.png";
import avatarUser from "@/assets/avatar-user.png";
import { PRODUCTS, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { HomeBasket } from "@/components/HomeBasket";

type FlyingItem = { id: number; src: string; from: DOMRect; to: DOMRect };

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Karo Online — Reselling & Vendor Marketplace" },
      { name: "description", content: "Premium reselling and vendor program. Quick services, lead-selling business and curated products from the Karo Online maison." },
    ],
  }),
  component: HomePage,
});

const BUSINESS_SLIDES = [
  { tag: "Business · Partnership · Teamwork", title: "BUSINESS", sub: "Cooperation · Success" },
  { tag: "Vendor Network", title: "GROWTH", sub: "Sell · Earn · Repeat" },
  { tag: "Lead Selling", title: "LEADS", sub: "Qualified · High-intent" },
  { tag: "Affiliate Maison", title: "RESELL", sub: "Curated · Premium" },
];

type Category = { cat: string; icon: LucideIcon; tint: string };

const CATEGORIES: Category[] = [
  { cat: "Fashion", icon: Shirt, tint: "from-[#fff4d6] to-[#f5dfa0]" },
  { cat: "Beauty", icon: Sparkles, tint: "from-[#fff8e6] to-[#f7e6b0]" },
  { cat: "Grocery", icon: ShoppingBasket, tint: "from-[#fff5d8] to-[#f3d98c]" },
  { cat: "Electronics", icon: Tv, tint: "from-[#fdf3c8] to-[#ecd07a]" },
  { cat: "Home", icon: HomeIcon, tint: "from-[#fff8dc] to-[#f5e9b8]" },
  { cat: "Jewellery", icon: Gem, tint: "from-[#fff0c8] to-[#e8c574]" },
  { cat: "Footwear", icon: Footprints, tint: "from-[#fdf5d2] to-[#f0d68a]" },
  { cat: "Decor", icon: Lamp, tint: "from-[#fff6d8] to-[#efd590]" },
  { cat: "Wellness", icon: Flower2, tint: "from-[#fdf8e0] to-[#eedd9a]" },
  { cat: "Sports", icon: Trophy, tint: "from-[#fff2c8] to-[#e8c878]" },
  { cat: "Kids", icon: Baby, tint: "from-[#fff8e0] to-[#f3e0a4]" },
  { cat: "Auto", icon: Car, tint: "from-[#fdf2c0] to-[#e6c270]" },
];

function HomePage() {
  const [slide, setSlide] = useState(0);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [flying, setFlying] = useState<FlyingItem[]>([]);
  const productsRef = useRef<HTMLDivElement>(null);
  const { add, triggerFly } = useCart();

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % BUSINESS_SLIDES.length), 3800);
    return () => clearInterval(t);
  }, []);

  const handleAdd = (p: Product, fromEl: HTMLElement) => {
    const target = document.querySelector<HTMLElement>("[data-cart-target]");
    if (target) {
      const from = fromEl.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setFlying((prev) => [...prev, { id, src: p.image, from, to }]);
      setTimeout(() => setFlying((prev) => prev.filter((f) => f.id !== id)), 850);
    }
    add({ id: p.id, name: p.name, price: p.price, image: p.image });
    triggerFly();
  };

  const recommended = PRODUCTS;
  const featured = [...PRODUCTS].reverse();
  const hotDeals = PRODUCTS.filter((p) => p.mrp - p.price > 1000);

  return (
    <div className="space-y-5">
      {/* Categories — first, just below the search */}
      <section style={{ animation: "fade-up 0.5s ease-out both" }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-display text-lg text-gold-gradient">Categories</h3>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)]">Explore ›</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.cat} onClick={() => setActiveCat(c.cat)} className="flex-shrink-0 flex flex-col items-center gap-1.5 group">
                <span className={`relative h-12 w-12 rounded-2xl grid place-items-center border border-[color:oklch(0.78_0.14_82/0.55)] bg-gradient-to-br ${c.tint} shadow-[0_2px_8px_-2px_rgba(212,175,55,0.3)] group-active:scale-95 transition`}>
                  <Icon className="h-6 w-6 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
                </span>
                <span className="text-[9px] font-semibold text-[color:oklch(0.30_0.05_85)]">{c.cat}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Hero business carousel */}
      <section style={{ animation: "fade-up 0.6s ease-out both" }}>
        <div className="relative rounded-3xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)] shadow-gold-glow">
          <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-[#fefcf6] via-white to-[#f9f5e8]">
            <div
              className="flex h-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${slide * 100}%)`, width: `${BUSINESS_SLIDES.length * 100}%` }}
            >
              {BUSINESS_SLIDES.map((s, i) => (
                <div key={i} className="relative h-full grid place-items-center shrink-0" style={{ width: `${100 / BUSINESS_SLIDES.length}%` }}>
                  <div className="relative text-center px-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.55_0.10_82)] mb-2">✦ {s.tag} ✦</p>
                    <h2 className="font-display text-5xl text-gold-gradient font-bold tracking-wide leading-none">{s.title}</h2>
                    <p className="mt-2 text-xs text-muted-foreground italic">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <img src={goldBriefcase} alt="" className="absolute -right-6 top-4 h-24 w-auto object-contain rotate-12 drop-shadow-[0_8px_18px_rgba(212,175,55,0.5)]" style={{ animation: "float-y 4s ease-in-out infinite" }} />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {BUSINESS_SLIDES.map((_, i) => (
                <span key={i} className={`h-1 rounded-full transition-all ${i === slide ? "w-6 bg-gold-bar" : "w-1.5 bg-[color:oklch(0.78_0.14_82/0.4)]"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Products */}
      <ProductRail title="Recommended" subtitle="for you" icon={<Crown className="h-3.5 w-3.5 text-[#d4af37]" />} products={recommended} ref={productsRef} />

      {/* Featured vendor card */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-display text-lg text-gold-gradient">
            Recommended <span className="font-light italic">| vendor</span>
          </h3>
        </div>
        <Link to="/vendors" className="block">
          <article className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#fff8dc] via-[#fdf3c8] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.6)] p-4 shadow-gold-glow">
            <div className="flex items-center gap-3">
              <img src={vendorDelivery} alt="" className="h-28 w-24 object-contain" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)]">Top Vendor</p>
                <h4 className="font-display text-2xl text-gold-gradient font-bold leading-tight">Aanya's Maison</h4>
                <p className="text-xs mt-1 text-muted-foreground italic">Beauty · Fashion · 4.9★</p>
                <span className="inline-flex mt-2 px-3 py-1 rounded-full bg-gold-bar text-[10px] font-bold text-[color:oklch(0.13_0.06_18)]">
                  Shop Now ›
                </span>
              </div>
            </div>
          </article>
        </Link>
      </section>

      {/* Featured Products */}
      <ProductRail title="Featured" subtitle="maison picks" icon={<Star className="h-3.5 w-3.5 fill-[#d4af37] text-[#d4af37]" />} products={featured} />

      {/* Hot Deals */}
      <ProductRail title="Hot Deals" subtitle="limited time" icon={<Flame className="h-3.5 w-3.5 text-[#e08820]" />} products={hotDeals} accent />

      {activeCat && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end" onClick={() => setActiveCat(null)} style={{ animation: "overlay-in 0.25s ease-out" }}>
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-4 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <div className="flex justify-center mb-3">
              <span className="h-1 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.5)]" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl text-gold-gradient">{activeCat}</h3>
              <button onClick={() => setActiveCat(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              {PRODUCTS.map((p) => (
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  key={p.id}
                  onClick={() => setActiveCat(null)}
                  className="rounded-xl border border-[color:oklch(0.78_0.14_82/0.4)] p-3 flex items-center gap-3 bg-white"
                >
                  <img src={p.image} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.seller}</p>
                  </div>
                  <span className="font-display text-sm text-gold-gradient font-bold">₹{p.price.toLocaleString()}</span>
                </Link>
              ))}
            </div>
            <img src={avatarUser} alt="" className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}

const ProductRail = ({
  title,
  subtitle,
  icon,
  products,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  products: Product[];
  accent?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}) => {
  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="font-display text-lg text-gold-gradient flex items-center gap-1.5">
          {icon}
          {title} <span className="font-light italic text-sm text-muted-foreground">| {subtitle}</span>
        </h3>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)]">See all ›</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {products.map((p) => (
          <Link
            to="/product/$id"
            params={{ id: p.id }}
            key={p.id}
            className="snap-start flex-shrink-0 w-[58%] rounded-2xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] active:scale-[0.97] transition"
          >
            <div className="relative aspect-square overflow-hidden">
              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              {accent && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#e08820] to-[#d4af37] text-[9px] font-bold text-white uppercase tracking-wider shadow">
                  -{Math.round(((p.mrp - p.price) / p.mrp) * 100)}%
                </span>
              )}
              {p.badge && !accent && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[9px] font-bold text-[color:oklch(0.42_0.10_82)] uppercase tracking-wider shadow">
                  {p.badge}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <h4 className="font-display text-sm font-semibold truncate">{p.name}</h4>
              <p className="text-[10px] text-muted-foreground truncate">{p.tagline}</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-display text-base text-gold-gradient font-bold">₹{p.price.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground line-through">₹{p.mrp.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37]" />
                <span className="text-[10px] font-semibold">{p.rating}</span>
                <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
