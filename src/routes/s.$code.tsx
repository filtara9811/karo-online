import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CreditCard, Store, BadgeCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/s/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Visit ${params.code} — Karo Online` },
      { name: "description", content: "Trusted merchant scan page on Karo Online." },
      { name: "theme-color", content: "#0a0700" },
    ],
  }),
  component: ScanLandingPage,
  errorComponent: () => <Fallback message="Something went wrong loading this page." />,
  notFoundComponent: () => <Fallback message="This merchant page was not found." />,
});

type Landing = {
  ok: boolean;
  merchant?: { name?: string; shop_name?: string; avatar_url?: string; verified?: boolean; code?: string };
  links?: {
    poster_bg_url?: string;
    poster_bg_urls?: string[];
    play_store_enabled?: boolean;
    payment_enabled?: boolean;
    payment_provider?: string;
    payment_upi_id?: string;
    payment_label?: string;
    digital_shop_enabled?: boolean;
    digital_shop_url?: string;
    extra_links?: Array<{ id: string; label: string; url: string; enabled: boolean }>;
  };
  landing?: {
    top_banner_url?: string;
    top_banner_link?: string;
    bottom_banner_url?: string;
    bottom_banner_link?: string;
    admob_publisher_id?: string;
    admob_top_slot?: string;
    admob_bottom_slot?: string;
    announcement_text?: string;
    announcement_active?: boolean;
  };
};

const PLAY_STORE = "https://play.google.com/store/apps/details?id=app.karoonline.twa";
// Tiny session cache so repeat scans render instantly.
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
    const t = setTimeout(() => setSheetUp(true), 320);
    return () => { cancelled = true; clearTimeout(t); };
  }, [code]);

  if (data && !data.ok) return <Fallback message="This QR code is not active yet." />;
  if (!data) return <Fallback message="Loading merchant…" spinner />;

  const m = data.merchant ?? {};
  const links = data.links ?? {};
  const landing = data.landing ?? {};
  const playUrl = `${PLAY_STORE}&referrer=${encodeURIComponent(`code=${m.code ?? code}`)}`;

  return (
    <div className="min-h-screen bg-[#0a0700] text-amber-50 selection:bg-[#d4af37] selection:text-black">
      {/* gradient backdrop */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0a0700] via-[#120a00] to-black" />
      <div className="fixed inset-0 -z-10 opacity-25 pointer-events-none"
           style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.35), transparent 60%), radial-gradient(circle at 50% 100%, rgba(212,175,55,0.18), transparent 50%)" }} />

      {/* AdMob top */}
      <div className="px-3 pt-3">
        <AdSlot publisherId={landing.admob_publisher_id} slot={landing.admob_top_slot} height={90} />
      </div>

      {/* Merchant identity header */}
      <header className="px-4 pt-4">
        <div className="rounded-2xl border border-[#d4af37]/60 bg-gradient-to-b from-[#1c1200]/80 to-[#0a0700]/80 backdrop-blur p-4 flex items-center gap-3 shadow-[0_8px_30px_rgba(212,175,55,0.18)]">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#d4af37] bg-black grid place-items-center text-2xl font-display text-[#d4af37]">
            {m.avatar_url
              ? <img src={m.avatar_url} alt={m.name || "Merchant"} className="h-full w-full object-cover" loading="eager" decoding="async" />
              : (m.name?.[0] ?? "K").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="truncate font-display text-xl text-[#fdf6e3]">
                {m.shop_name || m.name || "Karo Online Merchant"}
              </span>
              {m.verified && <BadgeCheck className="h-5 w-5 text-emerald-400 shrink-0" />}
            </div>
            {m.shop_name && m.name && (
              <p className="text-xs text-amber-200/80 truncate">{m.name}</p>
            )}
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4af37]/90 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Trusted Karo Online Merchant
            </p>
          </div>
        </div>

        {landing.announcement_active && landing.announcement_text && (
          <div className="mt-3 rounded-xl border border-[#d4af37]/40 bg-[#1c1200]/70 px-3 py-2 text-sm text-amber-100">
            📣 {landing.announcement_text}
          </div>
        )}

        {landing.top_banner_url && (
          <a href={landing.top_banner_link || "#"} className="block mt-3 rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow">
            <img src={landing.top_banner_url} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
          </a>
        )}
      </header>

      {/* Featured shop image */}
      {(links.poster_bg_urls?.[0] || links.poster_bg_url) && (
        <div className="px-4 mt-4">
          <img
            src={links.poster_bg_urls?.[0] || links.poster_bg_url}
            alt={m.shop_name || "Shop"}
            loading="eager"
            decoding="async"
            className="w-full rounded-2xl border border-[#d4af37]/50 object-cover max-h-72 shadow"
          />
        </div>
      )}

      <div className="h-[460px]" />

      {landing.bottom_banner_url && (
        <a href={landing.bottom_banner_link || "#"} className="block mx-4 mb-3 rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow">
          <img src={landing.bottom_banner_url} alt="Promotion" loading="lazy" decoding="async" className="w-full h-auto block" />
        </a>
      )}

      <div className="px-3 pb-4">
        <AdSlot publisherId={landing.admob_publisher_id} slot={landing.admob_bottom_slot} height={100} />
      </div>

      {/* Premium bottom sheet — 3 vertical pill buttons stacked */}
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
  const providerHref = useMemo(() => {
    if (!links.payment_upi_id) return null;
    const base = `pa=${encodeURIComponent(links.payment_upi_id)}&pn=${encodeURIComponent(merchant.shop_name || merchant.name || "Merchant")}&cu=INR`;
    switch (links.payment_provider) {
      case "phonepe": return `phonepe://pay?${base}`;
      case "paytm":   return `paytmmp://pay?${base}`;
      case "gpay":    return `tez://upi/pay?${base}`;
      default:        return `upi://pay?${base}`;
    }
  }, [links.payment_upi_id, links.payment_provider, merchant]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 240 }}
          className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t-2 border-[#d4af37] bg-gradient-to-b from-[#120a00] via-[#0a0700] to-black shadow-[0_-20px_60px_rgba(212,175,55,0.25)]"
        >
          <div className="mx-auto h-1.5 w-14 rounded-full bg-[#d4af37]/60 mt-2.5" />
          <div className="px-5 pt-3 pb-6 space-y-3 max-w-md mx-auto">
            <p className="text-center text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">
              Continue with
            </p>

            {links.payment_enabled && providerHref && (
              <PillButton
                href={providerHref}
                icon={<CreditCard className="h-5 w-5" />}
                title="Make Trusted Payment"
                subtitle={`${(links.payment_provider || "UPI").toUpperCase()} · ${links.payment_upi_id}`}
                gradient="from-[#d4af37] via-[#b8860b] to-[#7a5200]"
                textDark
              />
            )}

            {links.digital_shop_enabled && links.digital_shop_url && (
              <PillButton
                href={links.digital_shop_url}
                icon={<Store className="h-5 w-5" />}
                title="Visit Digital Shop"
                subtitle="Browse the merchant's catalogue"
                gradient="from-[#1f2937] via-[#111827] to-black"
              />
            )}

            {(links.play_store_enabled ?? true) && (
              <PillButton
                href={playUrl}
                icon={<Download className="h-5 w-5" />}
                title="Download Mobile App"
                subtitle="Install Karo Online · Free"
                gradient="from-emerald-600 via-emerald-700 to-emerald-900"
              />
            )}

            {(links.extra_links ?? []).filter((l) => l.enabled && l.url).map((l) => (
              <PillButton
                key={l.id}
                href={l.url}
                icon={<ExternalLink className="h-5 w-5" />}
                title={l.label || "Link"}
                subtitle={l.url}
                gradient="from-slate-700 to-slate-900"
              />
            ))}

            <p className="text-center text-[10px] text-[#d4af37]/70 pt-2">
              Powered by <Link to="/" className="font-bold text-[#d4af37] underline">Karo Online</Link>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PillButton({
  href, icon, title, subtitle, gradient, textDark,
}: {
  href: string; icon: React.ReactNode; title: string; subtitle: string;
  gradient: string; textDark?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-full px-5 py-4 shadow-lg active:scale-[0.98] transition bg-gradient-to-r ${gradient} ${textDark ? "text-black" : "text-white"} border ${textDark ? "border-[#fdf6e3]" : "border-white/10"}`}
    >
      <div className={`h-11 w-11 grid place-items-center rounded-full ${textDark ? "bg-black/15" : "bg-white/15"} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold leading-tight">{title}</div>
        <div className={`text-[11px] truncate ${textDark ? "opacity-80" : "opacity-90"}`}>{subtitle}</div>
      </div>
    </a>
  );
}

function Fallback({ message, spinner }: { message: string; spinner?: boolean }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#0a0700] to-black text-amber-50 p-6">
      <div className="text-center max-w-sm">
        {spinner && <div className="h-10 w-10 rounded-full border-4 border-[#d4af37] border-t-transparent animate-spin mx-auto mb-4" />}
        <h1 className="font-display text-2xl mb-2 text-[#d4af37]">Karo Online</h1>
        <p className="text-sm text-amber-200/80">{message}</p>
      </div>
    </div>
  );
}
