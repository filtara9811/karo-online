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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karo Online — Reselling & Vendor Marketplace" },
      { name: "description", content: "Premium reselling and vendor program. Quick services, lead-selling business and curated products from the Karo Online maison." },
      { property: "og:title", content: "Karo Online — Reselling & Vendor Marketplace" },
      { property: "og:description", content: "Premium reselling and vendor program from the Karo Online maison." },
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
  Fashion: [
    { name: "Silk Anarkali Suit", price: "₹4,299", seller: "Aanya · Delhi" },
    { name: "Embroidered Lehenga", price: "₹12,500", seller: "Vihaan · Mumbai" },
    { name: "Designer Kurti Set", price: "₹1,899", seller: "Riya · Jaipur" },
    { name: "Cotton Saree", price: "₹2,450", seller: "Karan · Chennai" },
  ],
  Beauty: [
    { name: "Maison Cosmetics Kit", price: "₹2,199", seller: "Aanya · Delhi" },
    { name: "Aurum Perfume 100ml", price: "₹3,499", seller: "Karan · Hyderabad" },
    { name: "24K Gold Face Serum", price: "₹1,799", seller: "Myra · Pune" },
    { name: "Luxe Lipstick Set", price: "₹999", seller: "Diya · Goa" },
  ],
  Grocery: [
    { name: "Premium Basmati 5kg", price: "₹699", seller: "Arjun · Punjab" },
    { name: "Organic Honey 500g", price: "₹449", seller: "Veer · Kashmir" },
    { name: "Saffron 2g", price: "₹1,299", seller: "Ishaan · Srinagar" },
    { name: "Cold-pressed Oil 1L", price: "₹599", seller: "Anaya · Kerala" },
  ],
  Electronics: [
    { name: "55\" 4K Smart TV", price: "₹38,999", seller: "Ayaan · Delhi" },
    { name: "Wireless Earbuds Pro", price: "₹4,499", seller: "Reyansh · Bangalore" },
    { name: "Smart Watch Gold", price: "₹6,799", seller: "Kabir · Mumbai" },
    { name: "Bluetooth Speaker", price: "₹2,299", seller: "Krish · Pune" },
  ],
  Home: [
    { name: "Eco Cleaning Kit", price: "₹899", seller: "Riya · Bangalore" },
    { name: "Velvet Cushion Set", price: "₹1,499", seller: "Diya · Jaipur" },
    { name: "Brass Diya Set", price: "₹699", seller: "Anaya · Varanasi" },
    { name: "Premium Bedsheet", price: "₹2,199", seller: "Myra · Lucknow" },
  ],
  Jewellery: [
    { name: "22K Gold Earrings", price: "₹18,500", seller: "Ishaan · Hyderabad" },
    { name: "Diamond Pendant", price: "₹24,999", seller: "Aarav · Mumbai" },
    { name: "Kundan Necklace", price: "₹8,799", seller: "Vihaan · Jaipur" },
    { name: "Silver Anklet Pair", price: "₹3,499", seller: "Aanya · Rajkot" },
  ],
  Footwear: [
    { name: "Croc Leather Loafers", price: "₹5,999", seller: "Kabir · Mumbai" },
    { name: "Bridal Juttis", price: "₹2,499", seller: "Diya · Jaipur" },
    { name: "Sports Sneakers", price: "₹3,799", seller: "Arjun · Delhi" },
    { name: "Suede Heels", price: "₹4,299", seller: "Myra · Bangalore" },
  ],
  Decor: [
    { name: "Marble Vase", price: "₹2,999", seller: "Anaya · Agra" },
    { name: "Gold Wall Mirror", price: "₹4,499", seller: "Diya · Delhi" },
    { name: "Crystal Lamp", price: "₹3,799", seller: "Veer · Mumbai" },
    { name: "Hand-painted Tray", price: "₹1,299", seller: "Riya · Udaipur" },
  ],
  Wellness: [
    { name: "Ayurvedic Spa Kit", price: "₹2,499", seller: "Anaya · Kerala" },
    { name: "Aromatherapy Oils", price: "₹1,899", seller: "Myra · Rishikesh" },
    { name: "Yoga Mat Premium", price: "₹1,499", seller: "Arjun · Pune" },
    { name: "Herbal Tea Box", price: "₹799", seller: "Veer · Darjeeling" },
  ],
  Sports: [
    { name: "Cricket Bat Pro", price: "₹4,999", seller: "Arjun · Mumbai" },
    { name: "Football Match Ball", price: "₹1,799", seller: "Veer · Goa" },
    { name: "Badminton Racket Set", price: "₹2,499", seller: "Kabir · Delhi" },
    { name: "Gym Dumbbell Pair", price: "₹3,299", seller: "Aarav · Bangalore" },
  ],
  Kids: [
    { name: "Premium Teddy Bear", price: "₹1,499", seller: "Myra · Delhi" },
    { name: "Kids Festive Outfit", price: "₹2,299", seller: "Diya · Jaipur" },
    { name: "Educational Toy Set", price: "₹1,799", seller: "Anaya · Pune" },
    { name: "Baby Skincare Box", price: "₹999", seller: "Riya · Chennai" },
  ],
  Auto: [
    { name: "Premium Car Cover", price: "₹3,499", seller: "Veer · Delhi" },
    { name: "Leather Seat Covers", price: "₹8,999", seller: "Arjun · Mumbai" },
    { name: "Dashboard Polish Kit", price: "₹699", seller: "Kabir · Pune" },
    { name: "Tyre Care Combo", price: "₹1,299", seller: "Aarav · Bangalore" },
  ],
};

function HomePage() {
  const [slide, setSlide] = useState(0);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % BUSINESS_SLIDES.length), 3800);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll for resand products
  useEffect(() => {
    const el = productsRef.current;
    if (!el) return;
    let dir = 1;
    const t = setInterval(() => {
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = el.clientWidth * 0.78;
      let next = el.scrollLeft + step * dir;
      if (next >= max - 4) { next = max; dir = -1; }
      else if (next <= 0) { next = 0; dir = 1; }
      el.scrollTo({ left: next, behavior: "smooth" });
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-5">
      {/* BUSINESS Carousel — sliding left to right */}
      <section style={{ animation: "fade-up 0.7s ease-out both" }}>
        <div className="relative rounded-3xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)] shadow-gold-glow">
          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#fefcf6] via-white to-[#f9f5e8]">
            {/* Sliding track */}
            <div
              className="flex h-full transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${slide * 100}%)`, width: `${BUSINESS_SLIDES.length * 100}%` }}
            >
              {BUSINESS_SLIDES.map((s, i) => (
                <div
                  key={i}
                  className="relative h-full grid place-items-center shrink-0"
                  style={{ width: `${100 / BUSINESS_SLIDES.length}%` }}
                >
                  <div className="absolute inset-0 grid place-items-center opacity-25 pointer-events-none">
                    <div className="font-display text-[10px] uppercase tracking-widest text-[color:oklch(0.45_0.08_85)] text-center leading-tight rotate-[-6deg] scale-110">
                      Partnership · Teamwork · Cooperation · Success · Business
                      <br />
                      Network · Maison · Affiliate · Reselling · Growth · Trust
                    </div>
                  </div>
                  <div className="relative text-center px-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.55_0.10_82)] mb-2">
                      ✦ {s.tag} ✦
                    </p>
                    <h2 className="font-display text-5xl text-gold-gradient font-bold tracking-wide leading-none">
                      {s.title}
                    </h2>
                    <p className="mt-2 text-xs text-muted-foreground italic">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Floating briefcase */}
            <img
              src={goldBriefcase}
              alt=""
              className="absolute -right-6 top-4 h-24 w-auto object-contain rotate-12 drop-shadow-[0_8px_18px_rgba(212,175,55,0.5)] pointer-events-none"
              style={{ animation: "float-y 4s ease-in-out infinite" }}
            />
          </div>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
            {BUSINESS_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === slide
                    ? "w-6 bg-gradient-to-r from-[#d4af37] to-[#8b6508] shadow-gold-glow"
                    : "w-2 bg-[color:oklch(0.78_0.14_82/0.35)]"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <p className="text-center mt-2 text-[10px] uppercase tracking-[0.35em] text-[color:oklch(0.55_0.10_82)]">
          Affiliate <span className="text-[color:oklch(0.78_0.14_82)]">|</span> Products
        </p>
      </section>

      {/* Resand Products — horizontal scroll */}
      <section style={{ animation: "fade-up 0.7s ease-out 0.05s both" }}>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Resand products</h3>
        <div ref={productsRef} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide scroll-smooth">
          {RESALE_PRODUCTS.map((p, i) => (
            <article
              key={p.name}
              className="snap-start flex-shrink-0 w-[78%] rounded-2xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.45)] shadow-[0_6px_20px_-8px_rgba(212,175,55,0.3)]"
              style={{ animation: `fade-up 0.55s ease-out ${0.1 + i * 0.06}s both` }}
            >
              <div className="aspect-[5/3] overflow-hidden bg-[oklch(0.96_0.01_90)]">
                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1 text-[8px] uppercase tracking-[0.18em] text-[color:oklch(0.45_0.08_85)] mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-[oklch(0.94_0.06_88)]">GST avail</span>
                  <span className="px-1.5 py-0.5 rounded bg-[oklch(0.94_0.06_88)]">Retailer</span>
                  <span className="px-1.5 py-0.5 rounded bg-[oklch(0.94_0.06_88)]">Delhi</span>
                </div>
                <h4 className="font-display text-base text-gold-gradient leading-tight font-semibold">{p.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{p.desc}</p>
                <button className="btn-3d mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2 bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-semibold text-sm shadow-gold-glow">
                  <span className="h-6 w-6 rounded-full overflow-hidden border border-white/60 bg-white">
                    <img src={avatarUser} alt="" className="h-full w-full object-cover" />
                  </span>
                  Sellers
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Recommended Vendor — hero card */}
      <section style={{ animation: "fade-up 0.7s ease-out 0.1s both" }}>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Recommended <span className="font-light italic">| vendor</span></h3>
        <article className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#fff8dc] via-[#fdf3c8] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.6)] shadow-gold-glow p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-32 w-28 flex-shrink-0">
              <img
                src={vendorDelivery}
                alt="Vendor"
                loading="lazy"
                className="h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
              />
              <span className="absolute top-1 left-1 h-7 w-7 rounded-full bg-white/90 grid place-items-center shadow-md border border-[color:oklch(0.78_0.14_82/0.5)]">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[color:oklch(0.55_0.10_82)]" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display text-2xl text-gold-gradient font-bold leading-tight">Product Name</h4>
              <p className="text-xs text-[color:oklch(0.30_0.05_85)] mt-1 leading-snug">
                Add a little bit of body text — premium curation
              </p>
              <ul className="mt-2 space-y-1 text-[10px] text-[color:oklch(0.40_0.05_85)]">
                <li className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-white/80 grid place-items-center text-[color:oklch(0.55_0.10_82)]">⛬</span>
                  GST · Available
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-white/80 grid place-items-center text-[color:oklch(0.55_0.10_82)]">🏷</span>
                  Tag · Retailer
                </li>
                <li className="flex items-center gap-1.5">
                  <img src={goldPin} alt="" className="h-3.5 w-3.5 object-contain" />
                  Delivery · 17 · Day
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-white/80 grid place-items-center text-[color:oklch(0.55_0.10_82)]">⚡</span>
                  Delivery · 17 · Day
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0">
              <img src={avatarUser} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-sm text-[color:oklch(0.30_0.05_85)] font-semibold">
              Filtara Fashion
            </span>
            <Link
              to="/services"
              className="btn-3d ml-auto text-[10px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)] hover:text-[color:oklch(0.78_0.14_82)] font-medium"
            >
              View ›
            </Link>
          </div>
        </article>
      </section>

      {/* Categories — themed gold icons, click to open product sheet */}
      <section style={{ animation: "fade-up 0.7s ease-out 0.15s both" }}>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Categories</h3>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <button
                key={c.cat}
                onClick={() => setActiveCat(c.cat)}
                className="btn-3d flex-shrink-0 flex flex-col items-center gap-1.5 active:scale-95"
                style={{ animation: `fade-up 0.5s ease-out ${0.18 + i * 0.03}s both` }}
                aria-label={`Browse ${c.cat}`}
              >
                <span className={`relative h-14 w-14 rounded-2xl grid place-items-center border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-gold-glow bg-gradient-to-br ${c.tint}`}>
                  <Icon className="h-7 w-7 text-[color:oklch(0.42_0.10_82)] drop-shadow-[0_2px_3px_rgba(212,175,55,0.5)]" strokeWidth={2.2} />
                </span>
                <span className="text-[10px] text-[color:oklch(0.30_0.05_85)] font-semibold leading-none">{c.cat}</span>
              </button>
            );
          })}
        </div>
      </section>

      <ProductSheet category={activeCat} onClose={() => setActiveCat(null)} />
    </div>
  );
}

function ProductSheet({ category, onClose }: { category: string | null; onClose: () => void }) {
  const open = !!category;
  const products = category ? CATEGORY_PRODUCTS[category] ?? [] : [];
  const cat = category ? CATEGORIES.find((c) => c.cat === category) : null;
  const Icon = cat?.icon;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-400 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="max-w-md mx-auto bg-gradient-to-b from-white via-[#fffdf5] to-[#fdf8e8] border-t-2 border-[color:oklch(0.78_0.14_82/0.6)] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(212,175,55,0.4)] max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-center pt-2.5 pb-1">
            <span className="h-1 w-12 rounded-full bg-gradient-to-r from-[#d4af37] to-[#8b6508]" />
          </div>
          <div className="px-5 pt-2 pb-3 flex items-center gap-3 border-b border-[color:oklch(0.78_0.14_82/0.25)]">
            {Icon && cat && (
              <span className={`h-12 w-12 rounded-2xl grid place-items-center border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-gold-glow bg-gradient-to-br ${cat.tint}`}>
                <Icon className="h-6 w-6 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.2} />
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl text-gold-gradient font-bold leading-tight">{category}</h3>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)] mt-0.5">
                {products.length} curated picks
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn-3d h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm active:scale-90"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4 grid grid-cols-2 gap-3">
            {products.map((p, i) => (
              <article
                key={p.name}
                className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2.5 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.3)]"
                style={{ animation: `fade-up 0.4s ease-out ${i * 0.05}s both` }}
              >
                <div className={`aspect-square rounded-xl mb-2 grid place-items-center bg-gradient-to-br ${cat?.tint ?? "from-[#fff8dc] to-[#f5e9b8]"} border border-[color:oklch(0.78_0.14_82/0.35)]`}>
                  {Icon && <Icon className="h-10 w-10 text-[color:oklch(0.42_0.10_82)] drop-shadow-[0_2px_4px_rgba(212,175,55,0.5)]" strokeWidth={1.8} />}
                </div>
                <h4 className="font-display text-xs text-[color:oklch(0.25_0.05_85)] font-semibold leading-tight line-clamp-2 min-h-[2rem]">
                  {p.name}
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{p.seller}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-display text-sm text-gold-gradient font-bold">{p.price}</span>
                  <button className="btn-3d h-6 px-2 rounded-full bg-gold-bar text-[color:oklch(0.13_0.06_18)] text-[9px] font-bold uppercase tracking-wider shadow-gold-glow active:scale-90">
                    Buy
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
