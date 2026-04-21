import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Shirt, Sparkles, ShoppingBasket, Tv, Home as HomeIcon, Gem,
  Footprints, Lamp, Flower2, Trophy, Baby, Car, X,
  type LucideIcon,
} from "lucide-react";
import goldBriefcase from "@/assets/gold-briefcase.png";
import vendorDelivery from "@/assets/vendor-delivery.png";
import avatarUser from "@/assets/avatar-user.png";
import goldPin from "@/assets/gold-pin.png";
import productCosmetics from "@/assets/product-cosmetics.jpg";
import productBags from "@/assets/product-bags.jpg";
import productCleaning from "@/assets/product-cleaning.jpg";
import productPerfume from "@/assets/product-perfume.jpg";

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

const RESALE_PRODUCTS = [
  { name: "Maison Cosmetics", desc: "Premium beauty kit · Add a little touch of luxury", img: productCosmetics, seller: "Aanya · Delhi" },
  { name: "Croc Briefcase", desc: "Hand-crafted leather · Heritage line", img: productBags, seller: "Vihaan · Mumbai" },
  { name: "Home Essentials", desc: "Eco-friendly cleaning · Citrus blend", img: productCleaning, seller: "Riya · Bangalore" },
  { name: "Aurum Perfume", desc: "24K gold cap · Oud & amber notes", img: productPerfume, seller: "Karan · Hyderabad" },
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

const CATEGORY_PRODUCTS: Record<string, { name: string; price: string; seller: string }[]> = {
  Fashion: [{ name: "Silk Anarkali", price: "₹4,299", seller: "Aanya · Delhi" }],
  Beauty: [{ name: "Maison Kit", price: "₹2,199", seller: "Aanya · Delhi" }],
  Grocery: [{ name: "Basmati 5kg", price: "₹699", seller: "Arjun · Punjab" }],
  Electronics: [{ name: "4K Smart TV", price: "₹38,999", seller: "Ayaan · Delhi" }],
  Home: [{ name: "Eco Cleaning", price: "₹899", seller: "Riya · Bangalore" }],
  Jewellery: [{ name: "Gold Earrings", price: "₹18,500", seller: "Ishaan · HYD" }],
  Footwear: [{ name: "Loafers", price: "₹5,999", seller: "Kabir · Mumbai" }],
  Decor: [{ name: "Marble Vase", price: "₹2,999", seller: "Anaya · Agra" }],
  Wellness: [{ name: "Spa Kit", price: "₹2,499", seller: "Anaya · Kerala" }],
  Sports: [{ name: "Cricket Bat", price: "₹4,999", seller: "Arjun · Mumbai" }],
  Kids: [{ name: "Teddy Bear", price: "₹1,499", seller: "Myra · Delhi" }],
  Auto: [{ name: "Car Cover", price: "₹3,499", seller: "Veer · Delhi" }],
};

function HomePage() {
  const [slide, setSlide] = useState(0);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % BUSINESS_SLIDES.length), 3800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-5">
      <section style={{ animation: "fade-up 0.7s ease-out both" }}>
        <div className="relative rounded-3xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)] shadow-gold-glow">
          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#fefcf6] via-white to-[#f9f5e8]">
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
          </div>
        </div>
      </section>

      <section ref={productsRef as never}>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Resand products</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {RESALE_PRODUCTS.map((p) => (
            <article key={p.name} className="snap-start flex-shrink-0 w-[78%] rounded-2xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)]">
              <div className="aspect-[5/3] overflow-hidden">
                <img src={p.img} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <h4 className="font-display text-base text-gold-gradient font-semibold">{p.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{p.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Recommended <span className="font-light italic">| vendor</span></h3>
        <article className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#fff8dc] via-[#fdf3c8] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.6)] p-4">
          <div className="flex items-center gap-3">
            <img src={vendorDelivery} alt="" className="h-32 w-28 object-contain" />
            <div className="flex-1">
              <h4 className="font-display text-2xl text-gold-gradient font-bold">Product Name</h4>
              <p className="text-xs mt-1">Premium curation</p>
            </div>
          </div>
          <Link to="/services" className="text-[10px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)]">View ›</Link>
        </article>
      </section>

      <section>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Categories</h3>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.cat} onClick={() => setActiveCat(c.cat)} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                <span className={`relative h-14 w-14 rounded-2xl grid place-items-center border-2 border-[color:oklch(0.78_0.14_82/0.6)] bg-gradient-to-br ${c.tint}`}>
                  <Icon className="h-7 w-7 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
                </span>
                <span className="text-[10px] font-semibold text-[color:oklch(0.30_0.05_85)]">{c.cat}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeCat && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end" onClick={() => setActiveCat(null)}>
          <div className="w-full bg-white rounded-t-3xl p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl text-gold-gradient">{activeCat}</h3>
              <button onClick={() => setActiveCat(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              {(CATEGORY_PRODUCTS[activeCat] ?? []).map((p) => (
                <div key={p.name} className="rounded-xl border border-[color:oklch(0.78_0.14_82/0.4)] p-3 flex items-center gap-3">
                  <img src={avatarUser} alt="" className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.seller}</p>
                  </div>
                  <span className="font-display text-sm text-gold-gradient font-bold">{p.price}</span>
                </div>
              ))}
            </div>
            <img src={goldPin} alt="" className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
