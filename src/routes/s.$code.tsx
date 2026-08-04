import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScanVisitorGate } from "@/components/ScanVisitorGate";
import { LandingTopBar } from "@/components/landing/LandingTopBar";
import { LandingStoryMedia } from "@/components/landing/LandingStoryMedia";
import { LandingProfileSheet } from "@/components/landing/LandingProfileSheet";
import { LandingCategoryDock, buildDockCategories } from "@/components/landing/LandingCategoryDock";
import type { ExtraLink } from "@/components/landing/landing-shared";


import karoCoverAsset from "@/assets/karo-cover.png.asset.json";
const DEFAULT_COVER_URL = karoCoverAsset.url;

export const Route = createFileRoute("/s/$code")({
  head: ({ params }) => {
    const url = `https://karoonline.in/s/${encodeURIComponent(params.code)}`;
    const image = `https://karoonline.in/api/public/share-image/qr/${encodeURIComponent(params.code)}`;
    return {
      meta: [
        { title: `Visit ${params.code} — Karo Online` },
        { name: "description", content: "Trusted merchant scan page on Karo Online." },
        { name: "theme-color", content: "#ffffff" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "Scan & Join Karo Online" },
        { property: "og:description", content: "Open the smart QR link for app download, vendor info, benefits and wallet rewards." },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:type", content: "image/svg+xml" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ScanLandingPage,
  errorComponent: () => <Fallback message="Something went wrong loading this page." />,
  notFoundComponent: () => <Fallback message="This merchant page was not found." />,
});

type MediaItem = { type: "image" | "video" | "url"; src: string };

type Landing = {
  ok: boolean;
  merchant?: { name?: string; shop_name?: string; avatar_url?: string; verified?: boolean; code?: string; cover_url?: string };
  links?: {
    poster_bg_url?: string;
    poster_bg_urls?: string[];
    poster_media?: MediaItem[];
    play_store_enabled?: boolean;
    payment_enabled?: boolean;
    payment_provider?: string;
    payment_upi_id?: string;
    payment_label?: string;
    payment_amount_inr?: number | string | null;
    digital_shop_enabled?: boolean;
    digital_shop_url?: string;
    extra_links?: Array<{ id: string; label: string; url: string; enabled: boolean }>;
  };
  landing?: {
    top_banner_url?: string;
    top_banner_link?: string;
    bottom_banner_url?: string;
    bottom_banner_link?: string;
    announcement_text?: string;
    announcement_active?: boolean;
    ios_app_url?: string;
  };
  theme?: {
    key?: string;
    preset?: string;
    accent_color?: string;
    bg_from?: string;
    bg_to?: string;
  };
  ads?: Array<{ name?: string; trade?: string | null; image?: string | null; url?: string | null }>;
};


const PLAY_STORE = "https://play.google.com/store/apps/details?id=app.karoonline.twa";
const APP_STORE_FALLBACK = "https://apps.apple.com/app/karo-online/id0000000000";
const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);


const CACHE_KEY = (c: string) => `karo-landing:${c}`;
function readCache(code: string): Landing | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(code));
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (Date.now() - t > 5 * 60_000) return null;
    return data as Landing;
  } catch { return null; }
}
function writeCache(code: string, data: Landing) {
  try { sessionStorage.setItem(CACHE_KEY(code), JSON.stringify({ t: Date.now(), data })); } catch { /* noop */ }
}

function normalizeAmount(value: unknown): string {
  const raw = String(value ?? "").replace(/[^0-9.]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2).replace(/\.00$/, "") : "";
}

function buildUpiUri(vpa: string, merchantName: string, amount: string) {
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: merchantName.trim() || "Karo Merchant",
    cu: "INR",
  });
  if (amount) params.set("am", amount);
  return `upi://pay?${params.toString()}`;
}

function ScanLandingPage() {
  const { code } = Route.useParams();
  const [data, setData] = useState<Landing | null>(() => readCache(code));
  const [profileOpen, setProfileOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: res, error } = await supabase.rpc("get_public_landing" as never, { _code: code } as never);
      if (cancelled) return;
      const next = (res as unknown as Landing) ?? { ok: false };
      if (error) console.error("[landing] rpc", error);
      setData(next);
      if (next.ok) writeCache(code, next);
    })();
    // Log visit (QR scans land here)
    import("@/lib/visit-fp").then(({ getVisitFp }) => {
      supabase.rpc("log_referral_visit", {
        _code: code,
        _source: "qr",
        _fp_hash: getVisitFp(),
        _ip_hash: undefined,
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
    });
    return () => { cancelled = true; };
  }, [code]);

  if (!data) return <Fallback message="Loading merchant…" spinner />;

  const m = data.merchant ?? {};
  const links = data.links ?? {};
  const landing = data.landing ?? {};
  const playUrl = isIOS()
    ? (landing.ios_app_url || APP_STORE_FALLBACK)
    : `${PLAY_STORE}&referrer=${encodeURIComponent(`code=${m.code ?? code}`)}`;

  const mediaList: MediaItem[] = (links.poster_media && links.poster_media.length)
    ? links.poster_media.filter((x) => x?.src)
    : (links.poster_bg_urls?.length
        ? links.poster_bg_urls.map((src) => ({ type: "image" as const, src }))
        : (links.poster_bg_url
            ? [{ type: "image" as const, src: links.poster_bg_url }]
            : (m.cover_url ? [{ type: "image" as const, src: m.cover_url }] : [{ type: "image" as const, src: DEFAULT_COVER_URL }])));

  const theme = data.theme ?? {};
  const preset = theme.preset ?? "classic";
  const accent = theme.accent_color ?? "#f59e0b";
  const isDark = preset === "royal" || preset === "neon";
  const ads = (data.ads ?? []).filter((a) => a.image);
  const merchantName = m.shop_name || m.name || "Karo Online Merchant";
  const pageUrl = typeof window !== "undefined"
    ? window.location.href
    : `https://karoonline.in/s/${encodeURIComponent(code)}`;

  const categories = buildDockCategories({
    extraLinks: (links.extra_links ?? []) as ExtraLink[],
    paymentEnabled: links.payment_enabled,
    paymentUpiId: links.payment_upi_id,
    onPayment: () => setPaymentOpen(true),
    digitalShopEnabled: links.digital_shop_enabled,
    digitalShopUrl: links.digital_shop_url,
    playStoreEnabled: links.play_store_enabled,
    playUrl,
  });

  return (
    <div
      className={`min-h-screen ${isDark ? "text-white" : "text-slate-900"}`}
      style={{ background: `linear-gradient(180deg, ${theme.bg_from ?? "#fffbeb"}, ${theme.bg_to ?? "#ffffff"})` }}
    >
      <LandingTopBar
        name={merchantName}
        avatarUrl={m.avatar_url}
        verified={m.verified}
        accent={accent}
        onProfile={() => setProfileOpen(true)}
        onMenu={() => setProfileOpen(true)}
      />

      {/* Status-style media: one progress segment per uploaded photo / video / link */}
      <LandingStoryMedia media={mediaList} alt={merchantName} accent={accent} className="h-[62svh]">
        {landing.announcement_active && landing.announcement_text && (
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow backdrop-blur">
            📣 {landing.announcement_text}
          </div>
        )}
      </LandingStoryMedia>

      {/* Same-category shop ads — swipeable rail */}
      {ads.length > 0 && (
        <div className="mt-3 px-3">
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ads.map((a, i) => (
              <a
                key={i}
                href={a.url ? (/^https?:\/\//i.test(a.url) ? a.url : `https://${a.url}`) : undefined}
                target="_blank"
                rel="noreferrer"
                className="relative snap-start shrink-0 w-[70%] h-28 rounded-2xl overflow-hidden border shadow-sm"
                style={{ borderColor: accent }}
              >
                <img src={a.image as string} alt={a.name ?? "Shop"} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5">
                  <p className="text-white text-[12px] font-bold truncate">{a.name ?? "Karo Shop"}</p>
                  <p className="text-white/80 text-[10px] truncate">{a.trade ?? "Verified shop"}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Admin-controlled banners (render only if configured) */}
      {landing.top_banner_url && (
        <a href={landing.top_banner_link || "#"} className="block mx-3 mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={landing.top_banner_url} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      {landing.bottom_banner_url && (
        <a href={landing.bottom_banner_link || "#"} className="block mx-3 mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={landing.bottom_banner_url} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      <p className="mt-4 text-center text-[10px] text-slate-500">
        Powered by <Link to="/" className="font-bold underline" style={{ color: accent }}>Karo Online</Link>
      </p>

      {/* Space for the fixed category dock */}
      <div className="h-28" />

      <LandingCategoryDock categories={categories} accent={accent} />

      <LandingProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        accent={accent}
        merchant={m}
        pageUrl={pageUrl}
      />

      <UpiPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        merchantName={merchantName}
        upiId={links.payment_upi_id ?? ""}
        defaultAmount={normalizeAmount(links.payment_amount_inr ?? links.payment_label)}
      />

      <ScanVisitorGate code={code} source="qr" />
    </div>
  );
}


function UpiPaymentModal({
  open, onClose, merchantName, upiId, defaultAmount,
}: {
  open: boolean; onClose: () => void; merchantName: string; upiId: string; defaultAmount: string;
}) {
  const [amount, setAmount] = useState(defaultAmount);

  useEffect(() => {
    if (open) setAmount(defaultAmount);
  }, [defaultAmount, open]);

  const cleanAmount = normalizeAmount(amount);
  const upiUri = useMemo(() => buildUpiUri(upiId, merchantName, cleanAmount), [upiId, merchantName, cleanAmount]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-5 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-700">Secure UPI</p>
            <h2 className="mt-1 truncate font-display text-2xl font-bold text-slate-950">{merchantName}</h2>
            <p className="mt-1 truncate text-xs text-slate-500">{upiId}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block text-xs font-semibold text-slate-600" htmlFor="upi-amount">Amount</label>
        <div className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-amber-500">
          <span className="text-2xl font-bold text-slate-950">₹</span>
          <input
            id="upi-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Enter amount"
            className="ml-2 min-w-0 flex-1 bg-transparent text-2xl font-bold text-slate-950 outline-none placeholder:text-slate-400"
          />
        </div>

        <a
          href={cleanAmount ? upiUri : undefined}
          aria-disabled={!cleanAmount}
          onClick={(e) => {
            if (!cleanAmount) {
              e.preventDefault();
              document.getElementById("upi-amount")?.focus();
              return;
            }
            setTimeout(onClose, 600);
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-700 px-5 py-4 text-base font-extrabold text-white shadow-lg active:scale-[0.98] aria-disabled:opacity-55"
        >
          <Smartphone className="h-5 w-5" /> Pay via UPI App
        </a>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
          Opens your phone's UPI app selector. No payment gateway, no copied ID.
        </p>
      </motion.div>
    </motion.div>
  );
}

function Fallback({ message, spinner }: { message: string; spinner?: boolean }) {
  return (
    <div className="min-h-screen grid place-items-center bg-white text-slate-900 p-6">
      <div className="text-center max-w-sm">
        {spinner && <div className="h-10 w-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto mb-4" />}
        <h1 className="font-display text-2xl mb-2 text-amber-700">Karo Online</h1>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
