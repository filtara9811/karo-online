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

const RECOMMENDED_VENDORS = [
  { name: "Aarav", pending: false, cat: "Fashion" },
  { name: "Vihaan", pending: true, cat: "Beauty" },
  { name: "Reyansh", pending: false, cat: "Grocery" },
  { name: "Ayaan", pending: false, cat: "Electronics" },
  { name: "Krish", pending: true, cat: "Home" },
  { name: "Ishaan", pending: false, cat: "Jewellery" },
  { name: "Kabir", pending: false, cat: "Footwear" },
  { name: "Diya", pending: false, cat: "Decor" },
  { name: "Anaya", pending: true, cat: "Wellness" },
  { name: "Arjun", pending: false, cat: "Sports" },
  { name: "Myra", pending: false, cat: "Kids" },
  { name: "Veer", pending: false, cat: "Auto" },
].map((v, i) => ({ id: i, ...v }));

function HomePage() {
  const [slide, setSlide] = useState(0);
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

      {/* Recommended Vendors — avatar row with categories */}
      <section style={{ animation: "fade-up 0.7s ease-out 0.15s both" }}>
        <h3 className="font-display text-xl text-gold-gradient mb-2 px-1">Categories</h3>
        <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          {RECOMMENDED_VENDORS.map((v, i) => (
            <button
              key={v.id}
              className="btn-3d flex-shrink-0 flex flex-col items-center gap-1"
              style={{ animation: `fade-up 0.5s ease-out ${0.18 + i * 0.03}s both` }}
            >
              <span className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-[color:oklch(0.78_0.14_82/0.6)] shadow-gold-glow bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8]">
                <img src={avatarUser} alt={v.name} loading="lazy" className="h-full w-full object-cover" />
                {v.pending && (
                  <span className="absolute -bottom-0.5 inset-x-0 bg-gradient-to-r from-[#d4af37] to-[#8b6508] text-white text-[7px] font-bold py-0.5 text-center uppercase tracking-wider">
                    pending
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[color:oklch(0.30_0.05_85)] font-semibold leading-none">{v.cat}</span>
              <span className="text-[8px] text-[color:oklch(0.50_0.05_85)] leading-none">{v.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
