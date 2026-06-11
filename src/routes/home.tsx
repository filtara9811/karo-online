import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Package, Mic, Search } from "lucide-react";
import { QuickServiceMap } from "@/components/QuickServiceMap";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSheet } from "@/components/ProfileSheet";
import { SearchOverlay } from "@/components/SearchOverlay";
import { useNavigate } from "@tanstack/react-router";
import { SheetStackProvider, useSheetStack } from "@/components/StackedSheet";
import { VendorFeedCard, type FeedVendor } from "@/components/VendorFeedCard";
import { ShopOverlay } from "@/components/ShopOverlay";
import { ProductOverlay } from "@/components/ProductOverlay";
import avatarUser from "@/assets/avatar-user.png";
import avatarAryan from "@/assets/avatar-aryan.png";
import avatarRani from "@/assets/avatar-rani.png";
import avatarRaj from "@/assets/avatar-raj.png";
import productCosmetics from "@/assets/product-cosmetics.jpg";
import productBags from "@/assets/product-bags.jpg";
import productPerfume from "@/assets/product-perfume.jpg";
import productCleaning from "@/assets/product-cleaning.jpg";
import svcElectronics from "@/assets/svc-electronics.png";
import svcCarpenter from "@/assets/svc-carpenter.png";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Karo Online — Marketplace" },
      { name: "description", content: "Discover nearby digital shops and vendors on a live map." },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <SheetStackProvider>
      <HomePage />
    </SheetStackProvider>
  );
}

// ---- Sample vendor feed (used until real DB feed wired) ----
const SAMPLE_VENDORS: FeedVendor[] = [
  {
    id: "v-beauty-maison",
    shopName: "Beauty | Maison",
    tagline: "Premium cosmetics · curated palettes",
    area: "Sadar Bazar, Delhi",
    rating: 4.9,
    reviews: 628,
    trusted: true,
    assured: true,
    heroImage: productPerfume,
    vendorAvatar: avatarRani,
    vendorLabel: "Vendor",
    awningTone: "amber",
  },
  {
    id: "v-electronics-hub",
    shopName: "Electronics | Hub",
    tagline: "Repairs · gadgets · accessories",
    area: "Karol Bagh, Delhi",
    rating: 4.7,
    reviews: 412,
    trusted: true,
    heroImage: svcElectronics,
    vendorAvatar: avatarAryan,
    vendorLabel: "Vendor",
    awningTone: "amber",
  },
  {
    id: "v-bag-bazaar",
    shopName: "Bag | Bazaar",
    tagline: "Heritage leather · briefcases · totes",
    area: "Chandni Chowk, Delhi",
    rating: 4.8,
    reviews: 521,
    assured: true,
    heroImage: productBags,
    vendorAvatar: avatarRaj,
    vendorLabel: "Vendor",
    awningTone: "red",
  },
  {
    id: "v-clean-co",
    shopName: "Clean | Co.",
    tagline: "Home services · deep clean · pest",
    area: "Old Delhi",
    rating: 4.6,
    reviews: 287,
    trusted: true,
    heroImage: productCleaning,
    vendorAvatar: avatarUser,
    awningTone: "gold",
  },
  {
    id: "v-cosmetics-luxe",
    shopName: "Cosmetics | Luxe",
    tagline: "Luxury palettes · brushes · skincare",
    area: "CP Market, Delhi",
    rating: 4.9,
    reviews: 731,
    trusted: true,
    assured: true,
    heroImage: productCosmetics,
    vendorAvatar: avatarRani,
    awningTone: "amber",
  },
  {
    id: "v-carpenter-craft",
    shopName: "Carpenter | Craft",
    tagline: "Custom furniture · woodwork · repairs",
    area: "Nehru Place, Delhi",
    rating: 4.5,
    reviews: 198,
    heroImage: svcCarpenter,
    vendorAvatar: avatarRaj,
    awningTone: "red",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const { profile } = useAuth();
  const { push } = useSheetStack();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [page, setPage] = useState(1); // infinite-scroll pagination over sample data
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite duplication of sample list (simulates DB pagination)
  const vendors = useMemo(() => {
    const all: FeedVendor[] = [];
    for (let p = 0; p < page; p++) {
      SAMPLE_VENDORS.forEach((v, i) => all.push({ ...v, id: `${v.id}-p${p}-${i}` }));
    }
    return all;
  }, [page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setPage((p) => Math.min(p + 1, 8));
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const openShop = (vendor: FeedVendor) => {
    push(
      <ShopOverlay
        vendor={vendor}
        onInquiry={() => navigate({ to: "/chat" })}
        onOpenProduct={(productId) =>
          push(<ProductOverlay productId={productId} onInquiry={() => navigate({ to: "/chat" })} />)
        }
      />,
    );
  };

  return (
    <div className="-mx-4 -mt-3">
      {/* MAP HEADER */}
      <section className="relative" style={{ height: "calc(36vh + env(safe-area-inset-top))", minHeight: 280 }}>
        <QuickServiceMap
          center={geo.lat != null && geo.lng != null ? { lat: geo.lat, lng: geo.lng } : null}
          vendors={vendors.slice(0, 8).map((v, i) => {
            const positions = [[28, 28], [72, 30], [22, 60], [70, 65], [50, 78], [40, 22], [80, 48], [18, 42]];
            const [x, y] = positions[i % positions.length];
            return {
              id: v.id,
              name: v.shopName,
              avatar: v.vendorAvatar,
              x, y,
              area: v.area,
              km: 0,
              status: "Online" as const,
              onClick: () => openShop(v),
            };
          })}
          userAvatar={profile?.avatar_url || avatarUser}
          userLabel={geo.label}
          geoStatus={geo.status}
          radiusKm={10}
        />
      </section>

      {/* CONTROL BAR (lifted over map edge, like /quick) */}
      <section className="relative bg-white rounded-t-3xl -mt-6 z-20 pt-3 px-4 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate({ to: "/orders" })}
            aria-label="My Orders"
            className="h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a] border-2 border-[color:oklch(0.78_0.14_82/0.7)] shadow-sm active:scale-90 flex-shrink-0"
            title="My Orders"
          >
            <Package className="h-5 w-5 text-[color:oklch(0.35_0.12_60)]" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2 rounded-full bg-[#f5f5f5] border border-[color:oklch(0.78_0.14_82/0.3)] px-4 py-2.5 active:scale-[0.98] transition-transform"
            aria-label="Open search"
          >
            <Search className="h-4 w-4 text-[#9ca3af]" />
            <span className="flex-1 text-left text-sm text-[#9ca3af]">Search shops, products…</span>
            <Mic className="h-4 w-4 text-[#9ca3af]" />
          </button>
          <button
            onClick={() => setProfileOpen(true)}
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
            Nearby Shops · 10 km
          </span>
          <span className="font-display text-sm italic underline underline-offset-4 decoration-[color:oklch(0.78_0.14_82)] text-gold-gradient font-bold">
            Digital | dukaan
          </span>
        </div>
      </section>

      {/* VENDOR FEED — ~3 cards per mobile viewport */}
      <section className="px-4 pt-2 space-y-3 bg-white">
        {vendors.map((v, i) => (
          <div key={v.id} style={{ animation: `fade-up 0.35s ease-out ${Math.min(i, 5) * 0.04}s both` }}>
            <VendorFeedCard
              vendor={v}
              onOpen={() => openShop(v)}
              onInquiry={() => navigate({ to: "/chat" })}
            />
          </div>
        ))}
        <div ref={sentinelRef} className="h-12 grid place-items-center text-[11px] text-[color:oklch(0.55_0.10_82)]">
          {page < 8 ? "Loading more shops…" : "You're all caught up"}
        </div>
      </section>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
