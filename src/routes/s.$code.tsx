import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CreditCard, Store, BadgeCheck, ExternalLink, ShieldCheck, X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import karoCoverAsset from "@/assets/karo-cover.png.asset.json";
const DEFAULT_COVER_URL = karoCoverAsset.url;

export const Route = createFileRoute("/s/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Visit ${params.code} — Karo Online` },
      { name: "description", content: "Trusted merchant scan page on Karo Online." },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
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
};

const PLAY_STORE = "https://play.google.com/store/apps/details?id=app.karoonline.twa";
const APP_STORE_FALLBACK = "https://apps.apple.com/app/karo-online/id0000000000";
const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

function detectProvider(url: string): "youtube" | "instagram" | "video" {
  if (/youtu\.?be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  return "video";
}
function ytEmbed(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${m[1]}&controls=0&modestbranding=1` : url;
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
  const [data, setData] = useState<Landing | null>(() => readCache(code));
  const [sheetUp, setSheetUp] = useState(false);

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
    const t = setTimeout(() => setSheetUp(true), 280);
    return () => { cancelled = true; clearTimeout(t); };
  }, [code]);

  if (!data) return <Fallback message="Loading merchant…" spinner />;

  const m = data.merchant ?? {};
  const links = data.links ?? {};
  const landing = data.landing ?? {};
  const playUrl = isIOS()
    ? (landing.ios_app_url || APP_STORE_FALLBACK)
    : `${PLAY_STORE}&referrer=${encodeURIComponent(`code=${m.code ?? code}`)}`;

  const mediaList: MediaItem[] = (links.poster_media && links.poster_media.length)
    ? links.poster_media
    : (links.poster_bg_urls?.length
        ? links.poster_bg_urls.map((src) => ({ type: "image" as const, src }))
        : (links.poster_bg_url
            ? [{ type: "image" as const, src: links.poster_bg_url }]
            : (m.cover_url ? [{ type: "image" as const, src: m.cover_url }] : [{ type: "image" as const, src: DEFAULT_COVER_URL }])));

  const hero = mediaList[0];
  const heroIsVideo = hero.type === "video" || hero.type === "url";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Full-bleed hero media. Video/embeds fill the viewport so vendor reels feel cinematic. */}
      <div className={`relative w-full ${heroIsVideo ? "h-[100svh]" : "aspect-[4/5]"} bg-black overflow-hidden`}>
        {hero.type === "video" ? (
          <video src={hero.src} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : hero.type === "url" ? (
          detectProvider(hero.src) === "youtube" ? (
            <iframe
              src={ytEmbed(hero.src)}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ border: 0 }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <iframe src={hero.src} className="absolute inset-0 w-full h-full" style={{ border: 0 }} allowFullScreen />
          )
        ) : (
          <img src={hero.src} alt={m.shop_name || m.name || "Shop"} className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
        )}

        {/* Soft gradient at top + bottom so identity chip & announcements stay readable */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />

        {/* Floating identity chip */}
        <div className="absolute left-3 right-3 top-3 flex items-center gap-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-2 shadow-lg">
          <div className="h-11 w-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 grid place-items-center text-base font-bold text-slate-700 flex-shrink-0">
            {m.avatar_url
              ? <img src={m.avatar_url} alt={m.name || "Merchant"} className="h-full w-full object-cover" loading="eager" />
              : (m.shop_name?.[0] ?? m.name?.[0] ?? "K").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 leading-tight">
              <span className="truncate font-display font-bold text-[15px] text-slate-900">
                {m.shop_name || m.name || "Karo Online Merchant"}
              </span>
              {m.verified && <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Trusted Karo Merchant
            </p>
          </div>
        </div>

        {landing.announcement_active && landing.announcement_text && (
          <div className="absolute left-3 right-3 bottom-3 rounded-xl bg-white/90 backdrop-blur border border-amber-200 px-3 py-2 text-xs text-slate-800 shadow">
            📣 {landing.announcement_text}
          </div>
        )}
      </div>

      {/* Admin-controlled top banner (renders only if configured) */}
      {landing.top_banner_url && (
        <a href={landing.top_banner_link || "#"} className="block mx-3 mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={landing.top_banner_url} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      {/* Secondary media tiles (slots 2 & 3) shown as a thin gallery if vendor uploaded extras */}
      {mediaList.length > 1 && (
        <div className="px-3 mt-3 grid grid-cols-2 gap-2">
          {mediaList.slice(1, 3).map((item, i) => (
            <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square">
              {item.type === "video" ? (
                <video src={item.src} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : item.type === "url" ? (
                detectProvider(item.src) === "youtube"
                  ? <iframe src={ytEmbed(item.src)} className="w-full h-full" style={{ border: 0 }} allow="autoplay; encrypted-media" />
                  : <iframe src={item.src} className="w-full h-full" style={{ border: 0 }} />
              ) : (
                <img src={item.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom spacer so the bottom sheet doesn't cover content */}
      <div className="h-[360px]" />

      {landing.bottom_banner_url && (
        <a href={landing.bottom_banner_link || "#"} className="fixed inset-x-3 bottom-[340px] z-30 block rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
          <img src={landing.bottom_banner_url} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      <ActionSheet open={sheetUp} merchant={m} links={links} playUrl={playUrl} />
    </div>
  );
}

function ActionSheet({
  open, merchant, links, playUrl,
}: {
  open: boolean;
  merchant: NonNullable<Landing["merchant"]>;
  links: NonNullable<Landing["links"]>;
  playUrl: string;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const merchantName = merchant.shop_name || merchant.name || "Karo Online Merchant";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 240 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-amber-200 bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 mt-2.5" />
            <div className="px-5 pt-3 pb-6 space-y-2.5 max-w-md mx-auto">
              <p className="text-center text-[10px] uppercase tracking-[0.25em] text-amber-700 font-semibold">
                Continue with
              </p>

            {links.payment_enabled && links.payment_upi_id && (
              <PillButton
                onClick={() => setPaymentOpen(true)}
                icon={<CreditCard className="h-5 w-5" />}
                title="Make Trusted Payment"
                subtitle={`UPI App · ${links.payment_upi_id}`}
                gradient="from-orange-500 via-orange-600 to-amber-700"
              />
            )}

            {links.digital_shop_enabled && links.digital_shop_url && (
              <PillButton
                href={/^https?:\/\//i.test(links.digital_shop_url) ? links.digital_shop_url : `https://${links.digital_shop_url}`}
                icon={<Store className="h-5 w-5" />}
                title="Visit Digital Shop"
                subtitle={links.digital_shop_url}
                gradient="from-emerald-500 via-emerald-600 to-emerald-800"
              />
            )}

            {(links.extra_links ?? []).filter((l) => l.enabled && l.url).map((l) => (
              <PillButton
                key={l.id}
                href={/^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`}
                icon={<ExternalLink className="h-5 w-5" />}
                title={l.label || "Link"}
                subtitle={l.url}
                gradient="from-indigo-500 via-indigo-600 to-purple-700"
              />
            ))}

            {(links.play_store_enabled ?? true) && (
              <PillButton
                href={playUrl}
                icon={<Download className="h-5 w-5" />}
                title="Download Mobile App"
                subtitle="Install Karo Online · Free"
                gradient="from-slate-800 via-slate-900 to-black"
              />
            )}

            <p className="text-center text-[10px] text-slate-500 pt-1">
              Powered by <Link to="/" className="font-bold text-amber-700 underline">Karo Online</Link>
            </p>
          </div>

          </motion.div>

          <UpiPaymentModal
            open={paymentOpen}
            onClose={() => setPaymentOpen(false)}
            merchantName={merchantName}
            upiId={links.payment_upi_id ?? ""}
            defaultAmount={normalizeAmount(links.payment_amount_inr ?? links.payment_label)}
          />
        </>
      )}
    </AnimatePresence>
  );
}

function PillButton({
  href, onClick, icon, title, subtitle, gradient,
}: {
  href?: string; onClick?: () => void; icon: React.ReactNode; title: string; subtitle: string; gradient: string;
}) {
  const className = `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-md active:scale-[0.98] transition bg-gradient-to-r ${gradient} text-white`;
  const inner = (
    <>
      <div className="h-10 w-10 grid place-items-center rounded-full bg-white/20 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold leading-tight text-sm">{title}</div>
        <div className="text-[11px] truncate opacity-90">{subtitle}</div>
      </div>
    </>
  );

  if (!href) {
    return <button type="button" onClick={onClick} className={className}>{inner}</button>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {inner}
    </a>
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
          href={upiUri}
          onClick={() => setTimeout(onClose, 600)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-700 px-5 py-4 text-base font-extrabold text-white shadow-lg active:scale-[0.98]"
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
