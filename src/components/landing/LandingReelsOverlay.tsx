import { useState } from "react";
import { BadgeCheck, Eye, Heart, MessageCircle, Share2, ShoppingBag, UserPlus } from "lucide-react";
import type { VideoProduct } from "@/lib/landing-types";
import { trackQrEvent } from "@/lib/qr-track";
import { LandingProductRail } from "./LandingProductRail";

export function LandingReelsOverlay({
  code,
  project,
  shopName,
  avatarUrl,
  verified,
  products,
  accent,
  onOpenProduct,
}: {
  code: string;
  project?: string | null;
  shopName: string;
  avatarUrl?: string | null;
  verified?: boolean;
  products: VideoProduct[];
  accent: string;
  onOpenProduct: (product: VideoProduct) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const lead = products[0];
  const caption = lead?.description?.split("\n")[0] || "Discover our latest collection — style, quality and trust in one place.";

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: shopName, text: `Shop ${shopName}`, url });
      else await navigator.clipboard.writeText(url);
      void trackQrEvent("CAMPAIGN_CLICK", { code, project, meta: { action: "share" } });
    } catch { /* cancelled */ }
  };

  const toggleFollow = () => {
    setFollowed((value) => {
      const next = !value;
      void trackQrEvent("CAMPAIGN_CLICK", { code, project, meta: { action: next ? "follow" : "unfollow" } });
      return next;
    });
  };

  const action = "grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/95 text-slate-950 shadow-xl backdrop-blur active:scale-90";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-white">
      <aside className="pointer-events-auto absolute bottom-[338px] right-2.5 flex flex-col items-center gap-2.5">
        <Action icon={<Eye className="h-5 w-5" />} label="Views" value="—" className={action} />
        <Action
          icon={<Heart className={`h-5 w-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />}
          label="Like"
          value={liked ? "1" : "0"}
          className={action}
          onClick={() => setLiked((v) => !v)}
        />
        <Action icon={<MessageCircle className="h-5 w-5" />} label="Comments" value="0" className={action} />
        <Action icon={<Share2 className="h-5 w-5" />} label="Share" value="0" className={action} onClick={share} />
        <Action icon={<ShoppingBag className="h-5 w-5" />} label="Products" value={String(products.length)} className={action} />
        <button onClick={toggleFollow} className="mt-1 flex flex-col items-center gap-1" aria-label={followed ? "Following" : "Follow"}>
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-black/45 text-white backdrop-blur">
            <UserPlus className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-bold drop-shadow">{followed ? "Following" : "Follow"}</span>
        </button>
      </aside>

      <div className="absolute inset-x-0 bottom-[226px] bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-2 pt-20 pr-16">
        <h2 className="font-sans text-[18px] font-extrabold text-white">{lead?.name || "Featured Collection"} ✨</h2>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/90">{caption}</p>
        <p className="mt-1.5 text-[11px] font-bold" style={{ color: accent }}>#ShopLocal&nbsp;&nbsp; #NewCollection&nbsp;&nbsp; #KaroOnline</p>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2" style={{ borderColor: accent }}>
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-bold">{shopName[0]}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1"><span className="truncate text-[12px] font-extrabold">{shopName}</span>{verified && <BadgeCheck className="h-3.5 w-3.5 text-amber-400" />}</div>
            <span className="text-[10px] text-white/75">Trusted Karo Online</span>
          </div>
          <button onClick={toggleFollow} className="pointer-events-auto rounded-lg bg-white px-3 py-2 text-[11px] font-extrabold text-slate-950 active:scale-95">
            {followed ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      <div className="pointer-events-auto absolute inset-x-0 bottom-[76px] h-[150px] bg-black/70 pt-1 backdrop-blur-md">
        <LandingProductRail products={products} accent={accent} onOpen={onOpenProduct} compact />
      </div>
    </div>
  );
}

function Action({ icon, label, value, className, onClick }: { icon: React.ReactNode; label: string; value: string; className: string; onClick?: () => void }) {
  return <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-0.5"><span className={className}>{icon}</span><span className="text-[9px] font-bold drop-shadow">{value}</span></button>;
}