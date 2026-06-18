import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CreditCard, Store, BadgeCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdSlot } from "@/components/AdSlot";

export const Route = createFileRoute("/s/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Visit ${params.code} — Karo Online` },
      { name: "description", content: "Trusted merchant scan page on Karo Online." },
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

function ScanLandingPage() {
  const { code } = Route.useParams();
  const [data, setData] = useState<Landing | null>(null);
  const [sheetUp, setSheetUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: res } = await supabase.rpc("get_public_landing" as never, { _code: code } as never);
      if (cancelled) return;
      setData((res as unknown as Landing) ?? { ok: false });
      setTimeout(() => setSheetUp(true), 280);
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (data && !data.ok) return <Fallback message="This QR code is not active yet." />;
  if (!data) return <Fallback message="Loading merchant…" spinner />;

  const m = data.merchant!;
  const links = data.links ?? {};
  const landing = data.landing ?? {};
  const playUrl = `${PLAY_STORE}&referrer=${encodeURIComponent(`code=${m.code ?? code}`)}`;

  const upiHref = links.payment_upi_id
    ? `upi://pay?pa=${encodeURIComponent(links.payment_upi_id)}&pn=${encodeURIComponent(m.shop_name || m.name || "Merchant")}&cu=INR`
    : null;
  const providerHref = (() => {
    if (!links.payment_upi_id) return null;
    const base = `pa=${encodeURIComponent(links.payment_upi_id)}&pn=${encodeURIComponent(m.shop_name || m.name || "Merchant")}&cu=INR`;
    switch (links.payment_provider) {
      case "phonepe": return `phonepe://pay?${base}`;
      case "paytm":   return `paytmmp://pay?${base}`;
      case "gpay":    return `tez://upi/pay?${base}`;
      default:        return upiHref;
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6e3] via-[#f4e9c8] to-[#fdf6e3] text-[#1a1208]">
      {/* AdMob top */}
      <div className="px-3 pt-3">
        <AdSlot publisherId={landing.admob_publisher_id} slot={landing.admob_top_slot} height={90} />
      </div>

      {/* Merchant profile */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border-2 border-[#d4af37] bg-white/80 shadow-md p-4 flex items-center gap-3">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[#d4af37] bg-[#fdf6e3] grid place-items-center text-2xl font-display text-[#8b6508]">
            {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="h-full w-full object-cover" /> : (m.name?.[0] ?? "K").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-display text-lg leading-tight truncate">
              <span className="truncate">{m.shop_name || m.name || "Karo Online Merchant"}</span>
              {m.verified && <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />}
            </div>
            {m.name && m.shop_name && <p className="text-xs text-[#8b6508] truncate">{m.name}</p>}
            <p className="text-[10px] uppercase tracking-widest text-[#8b6508] mt-0.5">Trusted Karo Online Merchant</p>
          </div>
        </div>

        {landing.announcement_active && landing.announcement_text && (
          <div className="mt-3 rounded-xl border border-[#d4af37]/40 bg-amber-50 px-3 py-2 text-sm text-[#8b6508]">
            📣 {landing.announcement_text}
          </div>
        )}

        {landing.top_banner_url && (
          <a href={landing.top_banner_link || "#"} className="block mt-3 rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow">
            <img src={landing.top_banner_url} alt="Promotion" className="w-full h-auto block" />
          </a>
        )}
      </div>

      {/* Shop image filler so sheet has room */}
      {links.poster_bg_url && (
        <div className="px-4 mt-4">
          <img src={links.poster_bg_url} alt="Shop" className="w-full rounded-2xl border-2 border-[#d4af37]/40 object-cover max-h-64" />
        </div>
      )}

      <div className="h-72" />

      {landing.bottom_banner_url && (
        <a href={landing.bottom_banner_link || "#"} className="block mx-4 mb-3 rounded-2xl overflow-hidden border border-[#d4af37]/40 shadow">
          <img src={landing.bottom_banner_url} alt="Promotion" className="w-full h-auto block" />
        </a>
      )}

      <div className="px-3 pb-4">
        <AdSlot publisherId={landing.admob_publisher_id} slot={landing.admob_bottom_slot} height={100} />
      </div>

      {/* Action bottom sheet */}
      <AnimatePresence>
        {sheetUp && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-gradient-to-b from-[#fdf6e3] to-[#f4e9c8] border-t-2 border-[#d4af37] shadow-2xl"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[#d4af37]/40 mt-2.5" />
            <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
              <p className="text-center text-[10px] uppercase tracking-widest text-[#8b6508]">Continue with</p>

              {links.play_store_enabled && (
                <ActionButton
                  href={playUrl}
                  icon={<Download className="h-5 w-5" />}
                  bg="bg-gradient-to-r from-emerald-600 to-emerald-700"
                  title="Download Mobile App"
                  subtitle="Install Karo Online · Free"
                />
              )}

              {links.payment_enabled && providerHref && (
                <ActionButton
                  href={providerHref}
                  icon={<CreditCard className="h-5 w-5" />}
                  bg="bg-gradient-to-r from-[#d4af37] to-[#b45309]"
                  title="Make Trusted Payment"
                  subtitle={`Pay via ${links.payment_provider?.toUpperCase() || "UPI"} → ${links.payment_upi_id}`}
                  textDark
                />
              )}

              {links.digital_shop_enabled && links.digital_shop_url && (
                <ActionButton
                  href={links.digital_shop_url}
                  icon={<Store className="h-5 w-5" />}
                  bg="bg-gradient-to-r from-indigo-600 to-indigo-700"
                  title="Visit Digital Shop"
                  subtitle="Browse the merchant's catalogue"
                />
              )}

              {(links.extra_links ?? []).filter((l) => l.enabled && l.url).map((l) => (
                <ActionButton
                  key={l.id}
                  href={l.url}
                  icon={<ExternalLink className="h-5 w-5" />}
                  bg="bg-gradient-to-r from-slate-700 to-slate-800"
                  title={l.label || "Link"}
                  subtitle={l.url}
                />
              ))}

              <p className="text-center text-[10px] text-[#8b6508]/70 pt-1">
                Powered by <Link to="/" className="font-bold underline">Karo Online</Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  href, icon, bg, title, subtitle, textDark,
}: {
  href: string; icon: React.ReactNode; bg: string; title: string; subtitle: string; textDark?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-md active:scale-[0.98] transition ${bg} ${textDark ? "text-[#1a1208]" : "text-white"}`}
    >
      <div className={`h-10 w-10 grid place-items-center rounded-full ${textDark ? "bg-white/30" : "bg-white/20"}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold leading-tight">{title}</div>
        <div className={`text-[11px] truncate ${textDark ? "opacity-80" : "opacity-90"}`}>{subtitle}</div>
      </div>
    </a>
  );
}

function Fallback({ message, spinner }: { message: string; spinner?: boolean }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#fdf6e3] to-[#f4e9c8] text-[#1a1208] p-6">
      <div className="text-center max-w-sm">
        {spinner && <div className="h-10 w-10 rounded-full border-4 border-[#d4af37] border-t-transparent animate-spin mx-auto mb-4" />}
        <h1 className="font-display text-2xl mb-2">Karo Online</h1>
        <p className="text-sm text-[#8b6508]">{message}</p>
      </div>
    </div>
  );
}
