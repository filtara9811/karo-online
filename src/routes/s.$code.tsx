import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScanVisitorGate } from "@/components/ScanVisitorGate";
import { readExtras } from "@/components/oneqr/landing-extras";

import { LandingTopBar } from "@/components/landing/LandingTopBar";
import { LandingStoryMedia } from "@/components/landing/LandingStoryMedia";
import { LandingProfileSheet } from "@/components/landing/LandingProfileSheet";
import { LandingChatWelcome } from "@/components/landing/LandingChatWelcome";
import { LandingMenuSheet } from "@/components/landing/LandingMenuSheet";
import { LandingSkeleton } from "@/components/landing/LandingSkeleton";
import { useLandingInstall } from "@/components/landing/use-landing-install";
import { LandingInstallPrompt } from "@/components/landing/LandingInstallPrompt";
import { LandingCategoryDock, buildDockCategories } from "@/components/landing/LandingCategoryDock";
import type { ExtraLink } from "@/components/landing/landing-shared";
import { trackQrEvent } from "@/lib/qr-track";
import { getLandingPayload } from "@/lib/landing.functions";
import type { LandingPayload, LandingMediaItem, VideoProduct } from "@/lib/landing-types";
import { LandingProductRail } from "@/components/landing/LandingProductRail";
import { LandingProductSheet } from "@/components/landing/LandingProductSheet";
import { LandingReelsOverlay } from "@/components/landing/LandingReelsOverlay";
import { LandingReelsDock } from "@/components/landing/LandingReelsDock";
import { optimizedImage, IMG } from "@/lib/img";




import karoCoverAsset from "@/assets/karo-cover.png.asset.json";
const DEFAULT_COVER_URL = karoCoverAsset.url;

export const Route = createFileRoute("/s/$code")({
  // Server-rendered shell: name, avatar, theme and first media arrive in the HTML.
  loader: ({ params }) => getLandingPayload({ data: { code: params.code } }),
  head: ({ params, loaderData }) => {
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
      links: [
        { rel: "canonical", href: url },
        ...(firstLandingImage(loaderData)
          ? [{ rel: "preload", as: "image", href: firstLandingImage(loaderData)!, fetchpriority: "high" }]
          : []),
      ],
    };
  },
  component: ScanLandingPage,
  errorComponent: () => <Fallback message="Something went wrong loading this page." />,
  notFoundComponent: () => <Fallback message="This merchant page was not found." />,
});

type MediaItem = LandingMediaItem;

type Landing = LandingPayload;


const PLAY_STORE = "https://play.google.com/store/apps/details?id=app.karoonline.twa";
const APP_STORE_FALLBACK = "https://apps.apple.com/app/karo-online/id0000000000";
const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);


/** First above-the-fold image (optimised) used for the preload hint. */
function firstLandingImage(d?: LandingPayload): string | undefined {
  if (!d?.ok) return undefined;
  const media = d.links?.poster_media?.find((m) => m?.type === "image" && m.src)?.src;
  const src = media ?? d.links?.poster_bg_urls?.[0] ?? d.links?.poster_bg_url ?? d.merchant?.cover_url;
  return optimizedImage(src, IMG.hero);
}

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
  const initial = Route.useLoaderData() as Landing | undefined;
  const [data, setData] = useState<Landing | null>(() => initial ?? readCache(code));
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const [openProduct, setOpenProduct] = useState<VideoProduct | null>(null);
  const project = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("p") : null;

  const themeAccent = data?.theme?.accent_color ?? "#f59e0b";
  const shopName = data?.merchant?.shop_name || data?.merchant?.name || "Karo Online Merchant";
  const installer = useLandingInstall({
    code,
    name: shopName,
    icon: data?.merchant?.avatar_url ?? null,
    accent: themeAccent,
  });
  const [installPromptOpen, setInstallPromptOpen] = useState(false);

  useEffect(() => {
    if (!data?.ok) return;
    void trackQrEvent("PRODUCT_VIEW", { code, project, meta: { media_index: activeMedia, surface: "reels" } });
  }, [activeMedia, code, data?.ok, project]);

  // Auto-offer the white-label install once per shop, shortly after load.
  const canOfferInstall = !!data?.ok && !installer.installed && !installer.standalone && !installer.seen;
  useEffect(() => {
    if (!canOfferInstall) return;
    const t = window.setTimeout(() => setInstallPromptOpen(true), 1500);
    return () => window.clearTimeout(t);
  }, [canOfferInstall]);

  // Store the sharer's referral code so signup credits the right wallet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      import("@/hooks/use-referral").then(({ REFERRAL_PENDING_KEY }) => {
        window.localStorage.setItem(REFERRAL_PENDING_KEY, ref);
      });
    }
  }, []);

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

    // Analytics is deferred so it never competes with first paint.
    const idle = (fn: () => void) =>
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(fn, { timeout: 2500 })
        : window.setTimeout(fn, 1200);
    idle(() => {
      import("@/lib/visit-fp").then(({ getVisitFp }) => {
        supabase.rpc("log_referral_visit", {
          _code: code,
          _source: "qr",
          _fp_hash: getVisitFp(),
          _ip_hash: undefined,
          _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
      });
      trackQrEvent("STORE_VIEW", { code, project });
    });

    const onInstalled = () => trackQrEvent("PWA_INSTALL", { code, project });
    window.addEventListener("appinstalled", onInstalled);
    return () => { cancelled = true; window.removeEventListener("appinstalled", onInstalled); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);


  if (!data) return <LandingSkeleton accent={themeAccent} />;


  const m = data.merchant ?? {};
  const links = data.links ?? {};
  const landing = data.landing ?? {};
  const landingExtras = readExtras((links.extra_links ?? []) as ExtraLink[]);

  const playUrl = isIOS()
    ? (landing.ios_app_url || APP_STORE_FALLBACK)
    : `${PLAY_STORE}&referrer=${encodeURIComponent(`code=${m.code ?? code}`)}`;

  const rawMedia: MediaItem[] = (links.poster_media && links.poster_media.length)
    ? links.poster_media.filter((x) => x?.src)
    : (links.poster_bg_urls?.length
        ? links.poster_bg_urls.map((src) => ({ type: "image" as const, src }))
        : (links.poster_bg_url
            ? [{ type: "image" as const, src: links.poster_bg_url }]
            : (m.cover_url ? [{ type: "image" as const, src: m.cover_url }] : [{ type: "image" as const, src: DEFAULT_COVER_URL }])));

  // Compressed, resized variants for images; videos/links pass through.
  const mediaList: MediaItem[] = rawMedia.map((item) =>
    item.type === "image" ? { ...item, src: optimizedImage(item.src, IMG.hero) ?? item.src } : item,
  );

  const theme = data.theme ?? {};
  const preset = theme.preset ?? "classic";
  const accent = theme.accent_color ?? "#f59e0b";
  const layoutStyle: "shop" | "chat" | "reels" =
    (theme.style as "shop" | "chat" | "reels" | undefined) ??
    (preset === "royal" || preset === "neon" ? "reels" : preset === "fresh" ? "chat" : "shop");
  const isDark = layoutStyle === "reels" || preset === "royal" || preset === "neon";
  const ads = (data.ads ?? []).filter((a) => a.image);
  const merchantName = m.shop_name || m.name || "Karo Online Merchant";
  const pageUrl = typeof window !== "undefined"
    ? window.location.href
    : `https://karoonline.in/s/${encodeURIComponent(code)}`;
  const reelsMode = layoutStyle !== "chat";

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
        avatarUrl={optimizedImage(m.avatar_url, IMG.avatarSm)}
        verified={m.verified}
        accent={accent}
        onProfile={() => setProfileOpen(true)}
        onMenu={() => setMenuOpen(true)}
        installed={installer.installed}
        onInstall={async () => {
          if (installer.installed) return;
          const r = await installer.install();
          if (r === "unavailable") setMenuOpen(true);
        }}
      />



      {/* Status-style media: one progress segment per uploaded photo / video / link */}
      <LandingStoryMedia
        media={mediaList}
        alt={merchantName}
        accent={accent}
        onIndexChange={setActiveMedia}
        className={layoutStyle === "chat" ? "h-[38svh]" : "h-[100svh]"}
      >
        {layoutStyle !== "chat" && (
          <LandingReelsOverlay
            code={code}
            project={project}
            shopName={merchantName}
            avatarUrl={optimizedImage(m.avatar_url, IMG.avatarSm)}
            verified={m.verified}
            products={mediaList[activeMedia]?.products ?? []}
            accent={accent}
            onOpenProduct={(product) => {
              setOpenProduct(product);
              void trackQrEvent("PRODUCT_VIEW", { code, project, ref: product.id, meta: { action: "open_product" } });
            }}
          />
        )}
        {landing.announcement_active && landing.announcement_text && (
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow backdrop-blur">
            📣 {landing.announcement_text}
          </div>
        )}
      </LandingStoryMedia>

      {/* Products attached to the video that is currently playing */}
      {layoutStyle === "chat" && <LandingProductRail products={mediaList[activeMedia]?.products ?? []} accent={accent} onOpen={setOpenProduct} />}

      <LandingProductSheet
        product={openProduct}
        accent={accent}
        shopName={merchantName}
        phone={m.phone}
        onClose={() => setOpenProduct(null)}
      />

      {layoutStyle === "chat" && (
        <LandingChatWelcome accent={accent} name={merchantName} links={(links.extra_links ?? []) as ExtraLink[]} />
      )}

      {/* Same-category shop ads — swipeable rail */}
      {layoutStyle !== "reels" && ads.length > 0 && (
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
                <img src={optimizedImage(a.image, IMG.card)} alt={a.name ?? "Shop"} loading="lazy" className="h-full w-full object-cover" />
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
      {layoutStyle !== "reels" && landing.top_banner_url && (
        <a href={landing.top_banner_link || "#"} className="block mx-3 mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={optimizedImage(landing.top_banner_url, IMG.card)} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      {layoutStyle !== "reels" && landing.bottom_banner_url && (
        <a href={landing.bottom_banner_link || "#"} className="block mx-3 mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={optimizedImage(landing.bottom_banner_url, IMG.card)} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      <p className={`mt-4 text-center text-[10px] ${layoutStyle === "reels" ? "hidden" : "text-slate-500"}`}>
        Powered by <Link to="/" className="font-bold underline" style={{ color: accent }}>Karo Online</Link>
      </p>

      {/* Space for the fixed category dock */}
      <div className="h-36" />

      {reelsMode ? (
        <LandingReelsDock
          canDownload={!installer.installed && !installer.standalone}
          onShare={async () => {
            try {
              if (navigator.share) await navigator.share({ title: merchantName, url: pageUrl });
              else await navigator.clipboard.writeText(pageUrl);
              void trackQrEvent("CAMPAIGN_CLICK", { code, project, meta: { action: "share_dock" } });
            } catch { /* cancelled */ }
          }}
          onShop={() => mediaList[activeMedia]?.products?.[0] && setOpenProduct(mediaList[activeMedia].products?.[0] ?? null)}
          onLinks={() => setMenuOpen(true)}
          onDownload={async () => {
            const result = await installer.install();
            if (result === "unavailable") setInstallPromptOpen(true);
          }}
        />
      ) : (
        <LandingCategoryDock categories={categories} accent={accent} merchantPhone={(m as { phone?: string }).phone} merchantName={merchantName} />
      )}

      <LandingProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        accent={accent}
        merchant={m}
        pageUrl={pageUrl}
        visitCode={code}
        project={project}
      />

      <LandingMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        accent={accent}
        merchantName={merchantName}
        pageUrl={pageUrl}
        canInstall={installer.canInstall}
        installed={installer.installed}
        isIOS={installer.isIOS}
        onInstall={installer.install}
      />


      <UpiPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        merchantName={merchantName}
        upiId={links.payment_upi_id ?? ""}
        defaultAmount={normalizeAmount(links.payment_amount_inr ?? links.payment_label)}
      />

      <ScanVisitorGate
        code={code}
        source="qr"
        project={typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("p") : null}
        enabled={landingExtras.gate_enabled}
        title={landingExtras.gate_title}
        message={landingExtras.gate_message}
      />

      <LandingInstallPrompt
        open={installPromptOpen}
        name={installer.appName || merchantName}
        icon={installer.appIcon || m.avatar_url || null}
        accent={accent}
        isIOS={installer.isIOS}
        onClose={() => { installer.markSeen(); setInstallPromptOpen(false); }}
        onInstall={installer.install}
      />


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
