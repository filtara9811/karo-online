import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, QrCode, Loader2, MessageCircle, Users, Phone, Plus,
  LayoutGrid, Megaphone, Settings as SettingsIcon, CalendarDays, Palette,
  Bell, Star, MapPin, Store, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrPosterSheet } from "@/components/QrPosterSheet";
import { MerchantLinksSetupSheet } from "@/components/MerchantLinksSetupSheet";
import { useReferralOverview } from "@/hooks/use-referral";
import { SponsoredAdsRail, useSponsoredAds } from "@/components/oneqr/SponsoredAdsRail";
import { QrProjectCard, type QrProject, type LandingTheme } from "@/components/oneqr/QrProjectCard";
import { AdServicesSheet } from "@/components/oneqr/AdServicesSheet";
import { VisitorChatSheet, type VisitorRow } from "@/components/oneqr/VisitorChatSheet";
import { toast } from "sonner";


export const Route = createFileRoute("/one-qr")({
  head: () => ({
    meta: [
      { title: "One QR Business — Karo Online" },
      { name: "description", content: "Manage multiple QR projects, sponsored ads, visitors and landing page themes." },
      { property: "og:title", content: "One QR Business — Karo Online" },
      { property: "og:description", content: "Multi-project QR dashboard with ads manager, CRM and landing themes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QrDashboardPage,
});

type ThemeData = { ok: boolean; premium?: boolean; current?: string; accent?: string | null; themes?: LandingTheme[] };
type Visit = {
  id: string; created_at: string; user_agent: string | null;
  visitor_name?: string | null; visitor_phone?: string | null; project_slug?: string | null;
};
type Tab = "projects" | "ads" | "crm" | "settings";

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `qr-${Date.now()}`;
}

function QrDashboardPage() {
  const { data: refData } = useReferralOverview();
  const code = refData?.code ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = code ? `${origin}/s/${encodeURIComponent(code)}` : "";

  const [tab, setTab] = useState<Tab>("projects");
  const [userId, setUserId] = useState<string | null>(null);
  const [themeData, setThemeData] = useState<ThemeData | null>(null);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [projects, setProjects] = useState<QrProject[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [posterFor, setPosterFor] = useState<QrProject | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [adsPage, setAdsPage] = useState(false);
  const [campaignFor, setCampaignFor] = useState<QrProject | null>(null);
  const [visitorOpen, setVisitorOpen] = useState<VisitorRow | null>(null);


  const ads = useSponsoredAds();

  const loadProjects = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("qr_projects")
      .select("id, title, slug, theme_key, accent_color, links, ads_enabled, ad_budget_inr, ad_clicks")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    setProjects((data as QrProject[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (uid) await loadProjects(uid);
      else setProjects([]);
    })();
    (async () => {
      const { data } = await supabase.rpc("get_qr_landing_themes" as never, {} as never);
      setThemeData((data as unknown as ThemeData) ?? { ok: false });
    })();
    (async () => {
      const { data } = await supabase.rpc("get_referral_visits", { _source: "qr", _limit: 200 });
      setVisits((data as unknown as Visit[]) ?? []);
    })();
  }, [loadProjects]);

  const themes = themeData?.themes ?? [];
  const premium = !!themeData?.premium;

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
      leads: rows.filter((r) => r.visitor_phone).length,
      days: [...byDay.entries()].slice(0, 10),
    };
  }, [visits]);

  const projectVisits = useCallback(
    (p: QrProject): VisitorRow[] => {
      const rows = (visits ?? []).filter((r) => (r.project_slug ?? "") === p.slug);
      return rows.length > 0 ? rows : (projects?.length ?? 0) <= 1 ? (visits ?? []) : [];
    },
    [visits, projects],
  );

  const projectStats = useCallback(
    (p: QrProject) => {
      const scoped = projectVisits(p);
      const today = new Date().toDateString();
      return {
        total: scoped.length,
        today: scoped.filter((r) => new Date(r.created_at).toDateString() === today).length,
        leads: scoped.filter((r) => r.visitor_phone).length,
        clicks: p.ad_clicks,
      };
    },
    [projectVisits],
  );


  const createProject = async () => {
    if (!userId) { toast.error("Login karein phir project banayein"); return; }
    setCreating(true);
    const n = (projects?.length ?? 0) + 1;
    const title = `QR Project ${n}`;
    const fallbackTheme = themes[0]?.key ?? "classic-amber";
    const { data, error } = await supabase
      .from("qr_projects")
      .insert({
        user_id: userId,
        title,
        slug: slugify(`${title}-${Date.now().toString(36)}`),
        theme_key: themeData?.current ?? fallbackTheme,
        accent_color: themeData?.accent ?? themes[0]?.accent_color ?? "#f59e0b",
      })
      .select("id, title, slug, theme_key, accent_color, links, ads_enabled, ad_budget_inr, ad_clicks")
      .single();
    setCreating(false);
    if (error || !data) { toast.error(error?.message ?? "Project ban nahi paya"); return; }
    setProjects((p) => [...(p ?? []), data as QrProject]);
    toast.success("Naya QR project ban gaya");
  };

  const patchProject = async (id: string, patch: Partial<QrProject>) => {
    setProjects((p) => (p ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setSavingId(id);
    const { error } = await supabase.from("qr_projects").update(patch as never).eq("id", id);
    setSavingId(null);
    if (error) toast.error("Save nahi hua");
  };

  const deleteProject = async (id: string) => {
    setProjects((p) => (p ?? []).filter((x) => x.id !== id));
    const { error } = await supabase.from("qr_projects").delete().eq("id", id);
    if (error) toast.error("Delete nahi hua");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white pb-32">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-md mx-auto px-3 h-16 flex items-center gap-2.5">
          <Link
            to="/"
            aria-label="Back to home"
            className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 grid place-items-center text-white font-extrabold ring-2 ring-white active:scale-90"
          >
            {code ? code.charAt(0).toUpperCase() : <ArrowLeft className="h-4 w-4" />}
          </Link>

          <div className="flex-1 min-w-0 h-11 rounded-full border border-amber-200 bg-amber-50/70 p-1 grid grid-cols-2">
            {[
              { key: false, label: "My project" },
              { key: true, label: "All sponsored ads" },
            ].map((s) => (
              <button
                key={String(s.key)}
                onClick={() => setAdsPage(s.key)}
                className={`relative rounded-full text-[12px] font-bold truncate px-2 ${adsPage === s.key ? "text-white" : "text-amber-800/70"}`}
              >
                {adsPage === s.key && (
                  <motion.span
                    layoutId="oneqr-seg"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                )}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>

          <button
            aria-label="Notifications"
            className="relative h-11 w-11 shrink-0 grid place-items-center rounded-full bg-amber-50 text-amber-700 active:scale-90"
          >
            <Bell className="h-5 w-5" />
            {stats.leads > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold grid place-items-center">
                {stats.leads}
              </span>
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {adsPage && (
          <motion.section
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed inset-x-0 top-16 bottom-0 z-20 bg-gradient-to-b from-amber-50 to-white overflow-y-auto"
          >
            <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-28">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-700" />
                <h2 className="font-display font-bold text-[15px] text-slate-900">All sponsored ads</h2>
                <button
                  onClick={() => setAdsPage(false)}
                  aria-label="Close sponsored ads"
                  className="ml-auto h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {ads.length === 0 ? (
                <p className="text-xs text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-4">
                  Nearby koi sponsored ad nahi mila.
                </p>
              ) : (
                ads.map((a, i) => (
                  <motion.article
                    key={a.user_id + i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="rounded-3xl overflow-hidden bg-white border border-amber-200 shadow-[0_14px_34px_-24px_rgba(180,120,20,0.55)]"
                  >
                    <div className="relative h-36">
                      <img
                        src={(a.cover_image_url || a.avatar_url) as string}
                        alt={a.business_name ?? "Sponsored shop"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {a.distanceKm != null && (
                        <span className="absolute top-2 right-2 h-7 px-2.5 rounded-full bg-white/90 text-[10px] font-extrabold text-slate-800 inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-amber-600" /> {a.distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="px-3.5 py-3">
                      <p className="font-display font-bold text-[14px] text-slate-900 truncate">{a.business_name ?? "Karo Shop"}</p>
                      <p className="text-[11px] text-slate-500 truncate">{a.trade ?? a.deals_in ?? "Verified shop"}</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="h-7 px-2 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.8
                        </span>
                        <span className="ml-auto h-9 px-4 rounded-full bg-amber-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5" /> Shop Visit
                        </span>
                      </div>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {tab === "projects" && (
              <>
                <SponsoredAdsRail ads={ads} />

                <button
                  onClick={createProject}
                  disabled={creating}
                  className="w-full h-14 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display font-extrabold text-[15px] inline-flex items-center justify-center gap-2 shadow-[0_16px_34px_-16px_rgba(245,158,11,0.9)] active:scale-[0.98]"
                >
                  {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" strokeWidth={3} />}
                  Create New Project / QR
                </button>

                {projects === null ? (
                  <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
                ) : projects.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-4">
                    Abhi koi QR project nahi hai — Shop Gate QR, Counter QR ya Table QR banakar shuru karein.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {projects.map((p) => (
                      <QrProjectCard
                        key={p.id}
                        project={p}
                        stats={projectStats(p)}
                        visits={projectVisits(p)}
                        themes={themes}
                        premium={premium}
                        saving={savingId === p.id}
                        landingUrl={baseUrl ? `${baseUrl}?p=${encodeURIComponent(p.slug)}` : ""}
                        onPatch={(patch) => patchProject(p.id, patch)}
                        onDelete={() => deleteProject(p.id)}
                        onPoster={() => setPosterFor(p)}
                        onLinks={() => setLinksOpen(true)}
                        onCampaign={() => setCampaignFor(p)}
                        onVisitor={(v) => setVisitorOpen(v)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}


            {tab === "ads" && (
              <>
                <SponsoredAdsRail ads={ads} />
                <section className="rounded-3xl border border-amber-200 bg-white p-4">
                  <h2 className="font-display font-bold text-sm text-slate-900 mb-1">Ads manager</h2>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Har project ke liye alag ad campaign chalayein. Ads Projects tab ke card se on/off hote hain.
                  </p>
                  <div className="space-y-2">
                    {(projects ?? []).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-black/10 px-3 py-2.5">
                        <span className="h-9 w-9 rounded-xl grid place-items-center text-white" style={{ background: p.accent_color || "#f59e0b" }}>
                          <Megaphone className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 truncate">{p.title}</p>
                          <p className="text-[11px] text-slate-500">₹{p.ad_budget_inr}/day · {p.ad_clicks} clicks</p>
                        </div>
                        <button
                          onClick={() => patchProject(p.id, { ads_enabled: !p.ads_enabled })}
                          className={`h-9 px-3 rounded-full text-[11px] font-extrabold active:scale-95 ${p.ads_enabled ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-800 border border-amber-300"}`}
                        >
                          {p.ads_enabled ? "ON" : "OFF"}
                        </button>
                      </div>
                    ))}
                    {(projects ?? []).length === 0 && (
                      <p className="text-xs text-slate-500">Pehle ek QR project banayein.</p>
                    )}
                  </div>
                </section>
              </>
            )}

            {tab === "crm" && (
              <>
                <section className="grid grid-cols-4 gap-2">
                  <StatCard label="Total" value={stats.total} />
                  <StatCard label="Today" value={stats.today} />
                  <StatCard label="7 days" value={stats.week} />
                  <StatCard label="Leads" value={stats.leads} />
                </section>

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
                        <div key={day} className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-3 py-2.5">
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

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-amber-700" />
                    <h2 className="font-display font-bold text-sm text-slate-900">Visitors</h2>
                  </div>
                  {visits === null ? (
                    <div className="py-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
                  ) : visits.length === 0 ? (
                    <p className="text-xs text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-4">
                      Abhi koi scan nahi hua — QR share karke shuru karein.
                    </p>
                  ) : (
                    <ul className="rounded-3xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
                      {visits.map((r) => {
                        const ua = r.user_agent ?? "";
                        const device = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : "Web";
                        const name = (r.visitor_name || "").trim();
                        return (
                          <li key={r.id} onClick={() => setVisitorOpen(r)} className="flex items-center gap-3 px-3 py-2.5 active:bg-amber-50/70">
                            <span
                              className="h-11 w-11 shrink-0 rounded-full grid place-items-center text-white font-bold text-base"
                              style={{ background: `linear-gradient(135deg, ${themeData?.accent || "#f59e0b"}, #f59e0b)` }}
                            >
                              {name ? name.charAt(0).toUpperCase() : <QrCode className="h-4 w-4" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <p className="text-[15px] font-semibold text-slate-900 truncate">{name || `Anonymous · ${device}`}</p>
                                <span className="ml-auto text-[10px] text-slate-400 shrink-0">{timeAgo(r.created_at)}</span>
                              </div>
                              <p className="text-[12px] text-slate-500 truncate">
                                {r.visitor_phone ? `+91 ${r.visitor_phone}` : "Number nahi diya"} · {r.project_slug ?? device}
                              </p>
                            </div>
                            {r.visitor_phone && (
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <a href={`tel:+91${r.visitor_phone}`} aria-label="Call visitor" className="h-9 w-9 grid place-items-center rounded-full bg-amber-50 text-amber-700 active:scale-90">
                                  <Phone className="h-4 w-4" />
                                </a>
                                <a href={`https://wa.me/91${r.visitor_phone}`} target="_blank" rel="noreferrer" aria-label="WhatsApp visitor" className="h-9 w-9 grid place-items-center rounded-full bg-emerald-500 text-white active:scale-90">
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}

            {tab === "settings" && (
              <section className="space-y-3">
                <div className="rounded-3xl border border-amber-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="h-4 w-4 text-amber-700" />
                    <h2 className="font-display font-bold text-sm text-slate-900">Shop links & showcase</h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    WhatsApp, Google Maps, catalog aur social links customer landing page par dikhte hain.
                  </p>
                  <button onClick={() => setLinksOpen(true)} className="h-11 w-full rounded-2xl bg-amber-500 text-white text-[12px] font-extrabold active:scale-95">
                    Open link manager
                  </button>
                </div>
                {baseUrl && (
                  <a
                    href={baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-3xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-center text-xs font-bold text-amber-900 active:scale-[0.98]"
                  >
                    Preview my main landing page
                  </a>
                )}
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto m-3 rounded-3xl border border-amber-200 bg-white/90 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] grid grid-cols-4 overflow-hidden">
          <TabBtn icon={LayoutGrid} label="Projects" active={tab === "projects"} onClick={() => setTab("projects")} />
          <TabBtn icon={Megaphone} label="Ads" active={tab === "ads"} onClick={() => setTab("ads")} />
          <TabBtn icon={Users} label="CRM" active={tab === "crm"} onClick={() => setTab("crm")} />
          <TabBtn icon={SettingsIcon} label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
        </div>
      </nav>

      <QrPosterSheet
        open={!!posterFor}
        onOpenChange={(v) => !v && setPosterFor(null)}
        code={code}
        shareUrl={posterFor && baseUrl ? `${baseUrl}?p=${encodeURIComponent(posterFor.slug)}` : baseUrl}
        defaultName={posterFor?.title ?? "Karo Online"}
      />
      <MerchantLinksSetupSheet open={linksOpen} onOpenChange={setLinksOpen} />
      <AdServicesSheet
        open={!!campaignFor}
        onOpenChange={(v) => { if (!v) setCampaignFor(null); }}
        projectTitle={campaignFor?.title ?? ""}
        onRequest={({ category, service }) => {
          setCampaignFor(null);
          toast.success(`${service} (${category}) campaign request bhej diya`);
        }}
      />
      <VisitorChatSheet visitor={visitorOpen} onClose={() => setVisitorOpen(null)} />


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

function TabBtn({
  icon: Icon, label, active, onClick,
}: { icon: typeof QrCode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 py-2.5 transition active:scale-95 ${active ? "text-amber-900" : "text-amber-700/60"}`}
    >
      {active && (
        <motion.span layoutId="oneqr-tab" className="absolute inset-1 rounded-2xl bg-amber-100" transition={{ type: "spring", stiffness: 320, damping: 28 }} />
      )}
      <Icon className="relative h-[18px] w-[18px]" />
      <span className="relative text-[10px] font-bold">{label}</span>
    </button>
  );
}
