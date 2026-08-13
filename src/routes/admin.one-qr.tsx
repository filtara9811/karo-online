import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QrCode, Loader2, Users, Palette, Link2, MessageCircle, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader, GoldButton } from "@/components/admin/AdminLayout";
import { TutorialVideosPanel } from "@/components/admin/TutorialVideosPanel";

export const Route = createFileRoute("/admin/one-qr")({
  head: () => ({
    meta: [
      { title: "One QR Business — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOneQrPage,
});

type Visit = {
  id: string;
  created_at: string;
  source: string | null;
  visitor_name: string | null;
  visitor_phone: string | null;
};

type ThemeRow = {
  key: string;
  name: string;
  preset: string;
  accent_color: string;
  bg_from: string;
  bg_to: string;
  is_premium: boolean;
  is_active: boolean;
};

type MerchantRow = {
  user_id: string;
  landing_theme_key: string | null;
  updated_at: string | null;
};

function AdminOneQrPage() {
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);

  useEffect(() => {
    (async () => {
      const [v, t, m] = await Promise.all([
        supabase
          .from("referral_link_visits")
          .select("id, created_at, source, visitor_name, visitor_phone")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("qr_landing_themes")
          .select("key, name, preset, accent_color, bg_from, bg_to, is_premium, is_active")
          .order("is_premium", { ascending: true }),
        supabase
          .from("merchant_link_settings")
          .select("user_id, landing_theme_key, updated_at")
          .order("updated_at", { ascending: false })
          .limit(200),
      ]);
      setVisits((v.data as Visit[]) ?? []);
      setThemes((t.data as ThemeRow[]) ?? []);
      setMerchants((m.data as MerchantRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const weekAgo = Date.now() - 7 * 864e5;
    const qr = visits.filter((r) => (r.source ?? "qr") === "qr");
    const themeCount = new Map<string, number>();
    merchants.forEach((m) => {
      const k = m.landing_theme_key ?? "default";
      themeCount.set(k, (themeCount.get(k) ?? 0) + 1);
    });
    return {
      totalScans: qr.length,
      today: qr.filter((r) => new Date(r.created_at).toDateString() === today).length,
      week: qr.filter((r) => new Date(r.created_at).getTime() > weekAgo).length,
      leads: qr.filter((r) => r.visitor_phone).length,
      shops: merchants.length,
      themeCount: [...themeCount.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [visits, merchants]);

  const toggleTheme = async (key: string, next: boolean) => {
    setThemes((p) => p.map((t) => (t.key === key ? { ...t, is_active: next } : t)));
    await supabase.from("qr_landing_themes").update({ is_active: next }).eq("key", key);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="One QR Business"
        subtitle="Scans, visitor leads, landing themes aur merchant link settings — sab ek jagah"
        action={
          <Link to="/admin/qr-assets">
            <GoldButton variant="outline" size="sm">QR Printing →</GoldButton>
          </Link>
        }
      />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat label="Total scans" value={stats.totalScans} icon={QrCode} />
            <Stat label="Today" value={stats.today} icon={QrCode} />
            <Stat label="7 days" value={stats.week} icon={QrCode} />
            <Stat label="Captured leads" value={stats.leads} icon={Users} />
            <Stat label="One QR shops" value={stats.shops} icon={Link2} />
          </div>

          <GoldCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4 text-[#d4af37]" />
              <h3 className="font-display font-bold text-[#fff8dc]">Landing themes</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {themes.map((t) => (
                <div key={t.key} className="rounded-xl overflow-hidden border border-[#d4af37]/25">
                  <div
                    className="h-16"
                    style={{ background: `linear-gradient(160deg, ${t.bg_from}, ${t.bg_to})` }}
                  />
                  <div className="px-3 py-2.5 bg-black/30 flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full shrink-0" style={{ background: t.accent_color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#fff8dc] truncate">{t.name}</p>
                      <p className="text-[10px] text-[#f5d97a]/60 truncate">
                        {t.preset} · {t.is_premium ? "PRO" : "Free"} ·{" "}
                        {stats.themeCount.find(([k]) => k === t.key)?.[1] ?? 0} shops
                      </p>
                    </div>
                    <GoldButton
                      size="sm"
                      variant={t.is_active ? "primary" : "outline"}
                      onClick={() => toggleTheme(t.key, !t.is_active)}
                    >
                      {t.is_active ? "Live" : "Off"}
                    </GoldButton>
                  </div>
                </div>
              ))}
              {themes.length === 0 && (
                <p className="text-xs text-[#f5d97a]/60">Koi theme configured nahi hai.</p>
              )}
            </div>
          </GoldCard>

          <GoldCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-4 w-4 text-[#d4af37]" />
              <h3 className="font-display font-bold text-[#fff8dc]">Sheet tutorial videos</h3>
            </div>
            <p className="mb-3 text-[11px] text-[#f5d97a]/60">
              Har config sheet ke top par shopkeeper ko yeh video dikhega — YouTube link ya MP4 upload.
            </p>
            <TutorialVideosPanel />
          </GoldCard>

          <GoldCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-[#d4af37]" />
              <h3 className="font-display font-bold text-[#fff8dc]">Recent QR visitors</h3>
            </div>
            <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {visits.slice(0, 100).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-[#d4af37]/20 bg-black/25 px-3 py-2.5"
                >
                  <span className="h-8 w-8 rounded-full bg-[#d4af37]/15 grid place-items-center text-[#f5d97a]">
                    <QrCode className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#fff8dc] truncate">{r.visitor_name || "Anonymous visitor"}</p>
                    <p className="text-[11px] text-[#f5d97a]/60 truncate">
                      {r.visitor_phone ? `+91 ${r.visitor_phone} · ` : ""}
                      {r.source ?? "qr"} · {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  {r.visitor_phone && (
                    <a
                      href={`https://wa.me/91${r.visitor_phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 w-8 grid place-items-center rounded-full bg-emerald-500/15 text-emerald-300"
                      aria-label="WhatsApp visitor"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
              {visits.length === 0 && (
                <p className="text-xs text-[#f5d97a]/60">Abhi koi scan record nahi hai.</p>
              )}
            </ul>
          </GoldCard>
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof QrCode }) {
  return (
    <GoldCard className="p-4">
      <Icon className="h-4 w-4 text-[#d4af37] mb-2" />
      <p className="text-2xl font-extrabold text-[#fff8dc] leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/60 mt-1.5">{label}</p>
    </GoldCard>
  );
}
