import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star, MapPin, Store, X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/use-geolocation";

export type SponsoredAd = {
  user_id: string;
  business_name: string | null;
  trade: string | null;
  deals_in: string | null;
  cover_image_url: string | null;
  avatar_url: string | null;
  website: string | null;
  is_premium: boolean | null;
  lat: number | null;
  lng: number | null;
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function normUrl(u?: string | null) {
  if (!u) return undefined;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/** Stable pseudo rating so the UI never shows an empty slot. */
function pseudoRating(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return (4 + (h % 10) / 10).toFixed(1);
}

export function useSponsoredAds(category?: string | null) {
  const geo = useGeolocation();
  const [ads, setAds] = useState<SponsoredAd[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("user_id, business_name, trade, deals_in, cover_image_url, avatar_url, website, is_premium, lat, lng")
        .eq("verified", true)
        .eq("is_blocked", false)
        .limit(60);
      setAds(((data as SponsoredAd[]) ?? []).filter((v) => v.cover_image_url || v.avatar_url));
    })();
  }, []);

  return useMemo(() => {
    const list = ads.map((a) => ({
      ...a,
      distanceKm:
        geo.lat != null && geo.lng != null && a.lat != null && a.lng != null
          ? haversineKm(geo.lat, geo.lng, a.lat, a.lng)
          : null,
    }));
    const cat = (category ?? "").trim().toLowerCase();
    const relevant = cat
      ? list.filter((a) => `${a.trade ?? ""} ${a.deals_in ?? ""}`.toLowerCase().includes(cat))
      : [];
    const rest = list.filter((a) => !relevant.includes(a));
    return [...relevant, ...rest].sort((a, b) => {
      if (a.is_premium !== b.is_premium) return a.is_premium ? -1 : 1;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });
  }, [ads, geo.lat, geo.lng, category]);
}

type AdWithDistance = SponsoredAd & { distanceKm: number | null };

/** Top auto-scrolling sponsored vendor ads carousel. */
export function SponsoredAdsRail({ ads }: { ads: AdWithDistance[] }) {
  const [allOpen, setAllOpen] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);
  const top = ads.slice(0, 10);

  useEffect(() => {
    if (top.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % top.length), 3600);
    return () => clearInterval(t);
  }, [top.length]);

  useEffect(() => {
    const el = railRef.current;
    const child = el?.children[idx] as HTMLElement | undefined;
    if (el && child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft - 8, behavior: "smooth" });
  }, [idx]);

  if (top.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-bold inline-flex items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5" /> Sponsored shops
        </p>
        <button
          onClick={() => setAllOpen(true)}
          className="h-7 px-3 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold tracking-wide active:scale-95"
        >
          VIEW ALL
        </button>
      </div>

      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-1"
      >
        {top.map((a, i) => (
          <AdCard key={a.user_id + i} ad={a} className="snap-center shrink-0 w-[86%]" />
        ))}
      </div>

      <div className="flex justify-center gap-1 mt-1.5">
        {top.map((a, i) => (
          <span
            key={a.user_id + i}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-amber-500" : "w-1.5 bg-amber-200"}`}
          />
        ))}
      </div>

      <AnimatePresence>
        {allOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-white overflow-y-auto"
          >
            <header className="sticky top-0 bg-white/90 backdrop-blur border-b border-amber-100 px-4 h-14 flex items-center gap-3">
              <button
                onClick={() => setAllOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-full bg-amber-50 text-amber-700 active:scale-90"
                aria-label="Close all ads"
              >
                <X className="h-4 w-4" />
              </button>
              <div>
                <h2 className="font-display font-bold text-[15px] text-slate-900">All nearby ads</h2>
                <p className="text-[11px] text-slate-500">{ads.length} active vendor ads</p>
              </div>
            </header>
            <div className="p-4 space-y-3 pb-16">
              {ads.map((a, i) => (
                <AdCard key={a.user_id + "all" + i} ad={a} className="w-full" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function AdCard({ ad, className = "" }: { ad: AdWithDistance; className?: string }) {
  const img = (ad.cover_image_url || ad.avatar_url) as string;
  const href = normUrl(ad.website);
  const rating = pseudoRating(ad.user_id);
  return (
    <article
      className={`rounded-3xl overflow-hidden bg-white border border-amber-200/80 shadow-[0_14px_34px_-20px_rgba(180,120,20,0.55)] ${className}`}
    >
      <div className="relative h-36">
        <img src={img} alt={ad.business_name ?? "Shop"} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        {ad.distanceKm != null && (
          <span className="absolute top-2 right-2 h-7 px-2.5 rounded-full bg-white/90 text-[10px] font-extrabold text-slate-800 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-amber-600" />
            {ad.distanceKm < 1 ? `${Math.max(0.1, +ad.distanceKm.toFixed(1))} km` : `${ad.distanceKm.toFixed(1)} km`}
          </span>
        )}
        {ad.is_premium && (
          <span className="absolute top-2 left-2 h-7 px-2.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold inline-flex items-center">
            SPONSORED
          </span>
        )}
      </div>
      <div className="px-3.5 py-3">
        <p className="font-display font-bold text-[14px] text-slate-900 truncate">
          {ad.business_name ?? "Karo Shop"}
        </p>
        <p className="text-[11px] text-slate-500 truncate">{ad.trade ?? ad.deals_in ?? "Verified shop"}</p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-7 px-2 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {rating}
          </span>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`ml-auto h-9 px-4 rounded-full bg-amber-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 active:scale-95 ${href ? "" : "opacity-50 pointer-events-none"}`}
          >
            <Store className="h-3.5 w-3.5" /> Shop Visit
          </a>
        </div>
      </div>
    </article>
  );
}
