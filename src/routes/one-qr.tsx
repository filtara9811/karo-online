import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, QrCode, Loader2, Lock, Check, MessageCircle, Users,
  CalendarDays, Palette, Share2, Sparkles, ExternalLink, Link2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrPosterSheet } from "@/components/QrPosterSheet";
import { MerchantLinksSetupSheet } from "@/components/MerchantLinksSetupSheet";
import { useReferralOverview } from "@/hooks/use-referral";
import { toast } from "sonner";


export const Route = createFileRoute("/one-qr")({
  head: () => ({
    meta: [
      { title: "My QR Dashboard — Karo Online" },
      { name: "description", content: "Track QR scans, visitors and choose your shop landing page theme." },
      { property: "og:title", content: "My QR Dashboard — Karo Online" },
      { property: "og:description", content: "Scan counts, visitor list and premium QR landing themes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QrDashboardPage,
});

type Theme = {
  key: string; name: string; description: string | null; preset: string;
  accent_color: string; bg_from: string; bg_to: string; is_premium: boolean;
};
type ThemeData = { ok: boolean; premium?: boolean; current?: string; accent?: string | null; themes?: Theme[]; error?: string };
type Visit = {
  id: string; created_at: string; user_agent: string | null;
  visitor_name?: string | null; visitor_phone?: string | null;
};
type Ad = {
  business_name: string | null; trade: string | null;
  cover_image_url: string | null; avatar_url: string | null; website: string | null;
};

const ACCENTS = ["#f59e0b", "#ef4444", "#059669", "#2563eb", "#a855f7", "#ec4899", "#0f172a"];

function QrDashboardPage() {
  const { data: refData } = useReferralOverview();
  const code = refData?.code ?? "";
  const shareUrl = code && typeof window !== "undefined"
    ? `${window.location.origin}/s/${encodeURIComponent(code)}`
    : "";

  const [posterOpen, setPosterOpen] = useState(false);
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_qr_landing_themes" as never, {} as never);
      setThemeData((data as unknown as ThemeData) ?? { ok: false });
    })();
    (async () => {
      const { data } = await supabase.rpc("get_referral_visits", { _source: "qr", _limit: 100 });
      setVisits(((data as unknown as Visit[]) ?? []));
    })();
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("business_name, trade, cover_image_url, avatar_url, website")
        .eq("verified", true)
        .limit(12);
      const list = ((data as Ad[]) ?? []).filter((v) => v.cover_image_url || v.avatar_url);
      setAds(list.slice(0, 8));
    })();
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setAdIndex((i) => (i + 1) % ads.length), 3200);
    return () => clearInterval(t);
  }, [ads.length]);

  const stats = useMemo(() => {
    const rows = visits ?? [];
    const today = new Date().toDateString();
    const weekAgo = Date.now() - 7 * 864e5;
    const byDay = new Map<string, Visit[]>();
    rows.forEach((r) => {
      const k = new Date(r.created_at).toDateString();
      byDay.set(k, [...(byDay.get(k) ?? []), r]);
    });
    return {
      total: rows.length,
      today: rows.filter((r) => new Date(r.created_at).toDateString() === today).length,
      week: rows.filter((r) => new Date(r.created_at).getTime() > weekAgo).length,
      named: rows.filter((r) => r.visitor_phone).length,
      days: [...byDay.entries()].slice(0, 10),
    };
  }, [visits]);

  const currentTheme = themeData?.themes?.find((t) => t.key === themeData?.current);
  const accent = themeData?.accent || currentTheme?.accent_color || "#f59e0b";

  const applyTheme = async (key: string, nextAccent?: string) => {
    setSaving(key);
    const { data, error } = await supabase.rpc("set_qr_landing_theme" as never, {
      _key: key, _accent: nextAccent ?? themeData?.accent ?? null,
    } as never);
    setSaving(null);
    const res = data as unknown as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(
        res?.error === "premium_required"
          ? "Ye premium theme hai — premium plan lene ke baad unlock ho jayegi."
          : error?.message || "Theme save nahi ho payi",
      );
      return;
    }
    setThemeData((p) => (p ? { ...p, current: key, accent: nextAccent ?? p.accent } : p));
    toast.success("Landing theme updated");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white pb-32">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/referral" className="h-9 w-9 grid place-items-center rounded-full bg-amber-50 text-amber-700 active:scale-90">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-[15px] text-slate-900 truncate">My QR Dashboard</h1>
            <p className="text-[11px] text-slate-500 truncate">{code ? `Code ${code}` : "Loading code…"}</p>
          </div>
          <button
            onClick={() => setPosterOpen(true)}
            className="h-9 px-3 rounded-full bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5" /> Share QR
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-5 pt-4">
        {/* Category ads rail */}
        {ads.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-bold mb-2">Sponsored shops</p>
            <div className="relative h-36 rounded-2xl overflow-hidden border border-amber-200 shadow-sm bg-slate-100">
              {ads.map((a, i) => (
                <a
                  key={i}
                  href={a.website ? (/^https?:\/\//i.test(a.website) ? a.website : `https://${a.website}`) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: i === adIndex ? 1 : 0, pointerEvents: i === adIndex ? "auto" : "none" }}
                >
                  <img
                    src={(a.cover_image_url || a.avatar_url) as string}
                    alt={a.business_name ?? "Shop"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                    <p className="text-white text-sm font-bold truncate">{a.business_name ?? "Karo Shop"}</p>
                    <p className="text-white/80 text-[11px] truncate inline-flex items-center gap-1">
                      {a.trade ?? "Verified shop"} {a.website && <ExternalLink className="h-3 w-3" />}
                    </p>
                  </div>
                </a>
              ))}
              <div className="absolute right-2 top-2 flex gap-1">
                {ads.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === adIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Stat cards */}
        <section className="grid grid-cols-4 gap-2">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Today" value={stats.today} />
          <StatCard label="7 days" value={stats.week} />
          <StatCard label="Leads" value={stats.named} />
        </section>

        {/* Theme picker */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-amber-700" />
            <h2 className="font-display font-bold text-sm text-slate-900">Landing page theme</h2>
          </div>
          {!themeData ? (
            <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
          ) : !themeData.ok ? (
            <p className="text-xs text-slate-500">Login karne ke baad theme choose kar sakte hain.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {(themeData.themes ?? []).map((t) => {
                  const locked = t.is_premium && !themeData.premium;
                  const active = themeData.current === t.key;
                  return (
                    <motion.button
                      key={t.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => applyTheme(t.key)}
                      disabled={!!saving}
                      className={`relative rounded-2xl overflow-hidden border text-left ${active ? "border-amber-500 ring-2 ring-amber-300" : "border-black/10"}`}
                    >
                      <div
                        className="h-24 p-2.5 flex flex-col justify-end"
                        style={{ background: `linear-gradient(160deg, ${t.bg_from}, ${t.bg_to})` }}
                      >
                        <span className="h-6 w-6 rounded-full mb-1.5" style={{ background: t.accent_color }} />
                        <span className="block h-1.5 w-14 rounded-full bg-black/15" />
                        <span className="block h-1.5 w-9 rounded-full bg-black/10 mt-1" />
                      </div>
                      <div className="px-2.5 py-2 bg-white">
                        <p className="text-[12px] font-bold text-slate-900 truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{t.description ?? t.preset}</p>
                      </div>
                      {locked && (
                        <span className="absolute top-2 right-2 h-6 px-1.5 rounded-full bg-black/70 text-white text-[9px] font-bold inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> PRO
                        </span>
                      )}
                      {t.is_premium && !locked && (
                        <span className="absolute top-2 right-2 h-6 px-1.5 rounded-full bg-purple-600 text-white text-[9px] font-bold inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> PRO
                        </span>
                      )}
                      {active && (
                        <span className="absolute top-2 left-2 h-6 w-6 rounded-full bg-amber-500 text-white grid place-items-center">
                          {saving === t.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
                <p className="text-[11px] font-bold text-slate-700 mb-2">Accent colour</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => themeData.current && applyTheme(themeData.current, c)}
                      className={`h-8 w-8 rounded-full border-2 active:scale-90 ${accent.toLowerCase() === c ? "border-slate-900" : "border-white shadow"}`}
                      style={{ background: c }}
                      aria-label={`Accent ${c}`}
                    />
                  ))}
                </div>
              </div>

              {shareUrl && (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-xs font-bold text-amber-900 active:scale-[0.98]"
                >
                  <Share2 className="h-3.5 w-3.5" /> Preview my landing page
                </a>
              )}
            </>
          )}
        </section>

        {/* Day-wise visits */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-4 w-4 text-amber-700" />
            <h2 className="font-display font-bold text-sm text-slate-900">Scans by day</h2>
          </div>
          {visits === null ? (
            <div className="grid place-items-center py-6"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
          ) : stats.days.length === 0 ? (
            <p className="text-xs text-slate-500">Abhi koi scan nahi hua — QR share karke shuru karein.</p>
          ) : (
            <div className="space-y-2">
              {stats.days.map(([day, rows]) => (
                <div key={day} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2.5">
                  <div>
                    <p className="text-[12px] font-bold text-slate-800">{day}</p>
                    <p className="text-[10px] text-slate-500">{rows.filter((r) => r.visitor_phone).length} contacts captured</p>
                  </div>
                  <span className="text-sm font-extrabold text-amber-700">{rows.length}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Visitors */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-amber-700" />
            <h2 className="font-display font-bold text-sm text-slate-900">Visitors</h2>
          </div>
          <ul className="space-y-2">
            {(visits ?? []).map((r) => {
              const ua = r.user_agent ?? "";
              const device = /Android/i.test(ua) ? "📱 Android" : /iPhone|iPad/i.test(ua) ? "🍎 iOS" : "💻 Web";
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2.5">
                  <span className="h-8 w-8 rounded-full bg-amber-50 grid place-items-center text-amber-700">
                    <QrCode className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.visitor_name || device}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {r.visitor_phone ? `+91 ${r.visitor_phone} · ` : ""}{device} · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  {r.visitor_phone && (
                    <a
                      href={`https://wa.me/91${r.visitor_phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 w-8 grid place-items-center rounded-full bg-emerald-50 text-emerald-600 active:scale-90"
                      aria-label="WhatsApp visitor"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <QrPosterSheet
        open={posterOpen}
        onOpenChange={setPosterOpen}
        code={code}
        shareUrl={shareUrl}
        defaultName="Karo Online"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-2 py-3 text-center shadow-sm">
      <p className="text-lg font-extrabold text-slate-900 leading-none">{value}</p>
      <p className="text-[10px] text-slate-500 mt-1">{label}</p>
    </div>
  );
}
