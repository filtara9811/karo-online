import { Star, ShieldCheck, BadgeCheck, MessageCircle, MapPin, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

export type FeedVendor = {
  id: string;
  shopName: string;
  tagline: string;
  area: string;
  rating: number;
  reviews: number;
  trusted?: boolean;
  assured?: boolean;
  heroImage: string;
  vendorAvatar: string;
  vendorLabel?: string;
  awningTone?: "amber" | "red" | "gold";
};

const AWNING_GRADIENT: Record<NonNullable<FeedVendor["awningTone"]>, string> = {
  amber:
    "repeating-linear-gradient(90deg, #f97316 0 22px, #ffffff 22px 44px, #c2410c 44px 66px, #fff 66px 88px)",
  red:
    "repeating-linear-gradient(90deg, #dc2626 0 22px, #ffffff 22px 44px, #991b1b 44px 66px, #fff 66px 88px)",
  gold:
    "repeating-linear-gradient(90deg, #d4af37 0 22px, #fff8dc 22px 44px, #8b6508 44px 66px, #fffaeb 66px 88px)",
};

export function VendorFeedCard({
  vendor,
  onOpen,
  onInquiry,
}: {
  vendor: FeedVendor;
  onOpen: () => void;
  onInquiry: () => void;
}) {
  const [muted, setMuted] = useState(true);
  const awning = AWNING_GRADIENT[vendor.awningTone ?? "amber"];

  return (
    <article
      onClick={onOpen}
      className="relative w-full rounded-3xl overflow-hidden bg-white border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_6px_20px_-8px_rgba(212,175,55,0.45)] active:scale-[0.99] transition cursor-pointer"
    >
      {/* Awning / shop canopy */}
      <div className="relative h-7 w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: awning,
            // Scalloped bottom edge
            maskImage:
              "radial-gradient(circle at 11px 7px, #000 6px, transparent 6.5px) repeat-x 0 100%/22px 14px, linear-gradient(#000,#000)",
            maskComposite: "subtract",
            WebkitMaskImage:
              "radial-gradient(circle at 11px 7px, #000 6px, transparent 6.5px) repeat-x 0 100%/22px 14px, linear-gradient(#000,#000)",
            WebkitMaskComposite: "source-out" as any,
          }}
        />
        {/* Scalloped overlay using SVG for clean look */}
        <svg className="absolute bottom-0 left-0 right-0 w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
          <path d="M0,0 Q5,10 10,0 T20,0 T30,0 T40,0 T50,0 T60,0 T70,0 T80,0 T90,0 T100,0 V10 H0 Z" fill="#fff" />
        </svg>
      </div>

      {/* Hero image */}
      <div className="relative w-full aspect-[16/10] bg-[#f5f5f5] overflow-hidden">
        <img src={vendor.heroImage} alt={vendor.shopName} className="h-full w-full object-cover" loading="lazy" />
        {/* Vendor avatar bottom-right circle */}
        <div className="absolute bottom-2 right-2 h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
          <img src={vendor.vendorAvatar} alt="" className="h-full w-full object-cover" />
        </div>
        {/* Vendor pill bottom-left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/95 border border-black/5 shadow-sm">
          <span className="h-4 w-4 rounded-full overflow-hidden">
            <img src={vendor.vendorAvatar} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="text-[10px] font-bold text-[#1f2937]">{vendor.vendorLabel ?? "Vendor"}</span>
        </div>
        {/* Mute btn — looks like media card */}
        <button
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-black/50 text-white active:scale-90"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Rating + badges */}
      <div className="px-3 pt-2.5 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff8dc] border border-[color:oklch(0.78_0.14_82/0.5)]">
          <Star className="h-3 w-3 fill-[#d4af37] text-[#d4af37]" />
          <span className="text-[11px] font-bold text-[#1f2937]">{vendor.rating.toFixed(1)}</span>
          <span className="text-[10px] text-[#6b7280]">· {vendor.reviews}</span>
        </span>
        {vendor.trusted && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3 w-3" /> Trusted
          </span>
        )}
        {vendor.assured && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
            <ShieldCheck className="h-3 w-3" /> Assured
          </span>
        )}
      </div>

      {/* Shop name + tagline */}
      <div className="px-3 pt-1.5">
        <h3 className="font-display text-lg text-gold-gradient font-bold leading-tight">
          {vendor.shopName}
        </h3>
        <p className="text-[11px] text-[#6b7280] truncate">{vendor.tagline}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6b7280]">
          <MapPin className="h-3 w-3" /> {vendor.area}
        </p>
      </div>

      {/* Inquiry CTA */}
      <div className="p-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onInquiry(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display text-sm font-bold shadow-gold-glow active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
          Send Inquiry now
        </button>
      </div>
    </article>
  );
}
