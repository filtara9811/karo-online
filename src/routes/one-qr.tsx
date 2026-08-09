import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, QrCode, Loader2, Users, Plus, Megaphone, Bell, Star, MapPin, Store, LayoutGrid,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrPosterSheet } from "@/components/QrPosterSheet";
import { MerchantLinksSetupSheet } from "@/components/MerchantLinksSetupSheet";
import { useReferralOverview } from "@/hooks/use-referral";
import { SponsoredAdsRail, useSponsoredAds } from "@/components/oneqr/SponsoredAdsRail";
import { QrProjectCard, type QrProject, type LandingTheme, type CardProfile } from "@/components/oneqr/QrProjectCard";
import { OneQrGuideSheet } from "@/components/oneqr/OneQrGuideSheet";
import { AdServicesSheet } from "@/components/oneqr/AdServicesSheet";
import { VisitorChatSheet, type VisitorRow } from "@/components/oneqr/VisitorChatSheet";
import { QrCodeSheet } from "@/components/oneqr/QrCodeSheet";
import { LandingEditorSheet } from "@/components/oneqr/LandingEditorSheet";
import { OneQrHubSheet } from "@/components/oneqr/OneQrHubSheet";
import { BusinessProfileSheet, type BusinessProfileForm } from "@/components/oneqr/BusinessProfileSheet";

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
type Tab = "projects" | "vendors" | "ads";

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
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [projects, setProjects] = useState<QrProject[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [posterFor, setPosterFor] = useState<QrProject | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [campaignFor, setCampaignFor] = useState<QrProject | null>(null);
  const [visitorOpen, setVisitorOpen] = useState<VisitorRow | null>(null);
  const [qrFor, setQrFor] = useState<QrProject | null>(null);
  const [editorFor, setEditorFor] = useState<QrProject | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);


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
      if (uid) {
        await loadProjects(uid);
        const { data: vendor } = await supabase
          .from("vendors")
          .select("business_name, shop_bio, avatar_url, cover_image_url")
          .eq("user_id", uid)
          .maybeSingle();
        setProfile((vendor as CardProfile) ?? null);
      } else setProjects([]);
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

  const leadCount = useMemo(() => (visits ?? []).filter((r) => r.visitor_phone).length, [visits]);

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
    setEditorFor((e) => (e && e.id === id ? { ...e, ...patch } : e));
    setSavingId(id);
    const { error } = await supabase.from("qr_projects").update(patch as never).eq("id", id);
    // Theme choice must reach the customer landing page, which reads the merchant setting.
    if (patch.theme_key) {
      const { data: res } = await supabase.rpc("set_qr_landing_theme" as never, {
        _key: patch.theme_key,
        _accent: patch.accent_color ?? null,
      } as never);
      const ok = (res as { ok?: boolean } | null)?.ok !== false;
      if (ok) {
        setThemeData((t) => (t ? { ...t, current: patch.theme_key as string, accent: patch.accent_color ?? t.accent } : t));
        toast.success("Theme customer ke landing page par lag gaya");
      } else {
        toast.error("Yeh theme premium hai — unlock karein");
      }
    }
    setSavingId(null);
    if (error) toast.error("Save nahi hua");
  };

  const deleteProject = async (id: string) => {
    setProjects((p) => (p ?? []).filter((x) => x.id !== id));
    const { error } = await supabase.from("qr_projects").delete().eq("id", id);
    if (error) toast.error("Delete nahi hua");
  };

  const projectUrl = (p: QrProject | null) =>
    p && baseUrl ? `${baseUrl}?p=${encodeURIComponent(p.slug)}` : baseUrl;

  const shareProject = async (p: QrProject) => {
    const url = projectUrl(p);
    if (!url) return;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copy ho gaya"); }
    } catch { /* dismissed */ }
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

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[16px] font-bold text-slate-900">One QR Business</h1>
            <p className="truncate text-[10.5px] text-slate-500">{profile?.business_name || "My digital shop"}</p>
          </div>

          <button
            aria-label="Notifications"
            className="relative h-11 w-11 shrink-0 grid place-items-center rounded-full bg-amber-50 text-amber-700 active:scale-90"
          >
            <Bell className="h-5 w-5" />
            {leadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold grid place-items-center">
                {leadCount}
              </span>
            )}
          </button>
        </div>
      </header>

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
                        profile={profile}
                        landingUrl={projectUrl(p)}
                        onPatch={(patch) => patchProject(p.id, patch)}
                        onDelete={() => deleteProject(p.id)}
                        onPoster={() => setPosterFor(p)}
                        onLinks={() => setLinksOpen(true)}
                        onCampaign={() => setCampaignFor(p)}
                        onVisitor={(v) => setVisitorOpen(v)}
                        onQr={() => setQrFor(p)}
                        onPreview={() => setEditorFor(p)}
                        onGuide={() => setGuideOpen(true)}
                        onProfile={() => setProfileOpen(true)}

                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "vendors" && (
              <>
                <SponsoredAdsRail ads={ads} />
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-700" />
                    <h2 className="font-display font-bold text-[15px] text-slate-900">Nearby sponsored vendors</h2>
                  </div>
                  {ads.length === 0 ? (
                    <p className="text-xs text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-4">
                      Nearby koi sponsored vendor nahi mila.
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
                </section>
              </>
            )}

            {tab === "ads" && (
              <section className="rounded-3xl border border-amber-200 bg-white p-4">
                <h2 className="font-display font-bold text-sm text-slate-900 mb-1">Ads manager</h2>
                <p className="text-[11px] text-slate-500 mb-3">
                  Har project ke liye alag ad campaign chalayein — budget aur clicks yahin se manage karein.
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
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom pill */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto m-3 flex h-14 items-center rounded-full bg-slate-900 px-1.5 text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]">
          <PillBtn label="My Project" active={tab === "projects"} onClick={() => setTab("projects")} />
          <button
            onClick={() => setHubOpen(true)}
            aria-label="Wallet and business profile"
            className="mx-1 h-11 w-11 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white active:scale-90"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <PillBtn label="Vendors" active={tab === "vendors"} onClick={() => setTab("vendors")} />
          <PillBtn label="Ads" active={tab === "ads"} onClick={() => setTab("ads")} />
        </div>
      </nav>

      <QrPosterSheet
        open={!!posterFor}
        onOpenChange={(v) => !v && setPosterFor(null)}
        code={code}
        shareUrl={projectUrl(posterFor)}
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
      <QrCodeSheet
        open={!!qrFor}
        onClose={() => setQrFor(null)}
        title={qrFor?.title ?? ""}
        landingUrl={projectUrl(qrFor)}
        onPoster={() => qrFor && setPosterFor(qrFor)}
        onShare={() => qrFor && shareProject(qrFor)}
      />
      <LandingEditorSheet
        open={!!editorFor}
        onClose={() => setEditorFor(null)}
        title={editorFor?.title ?? ""}
        landingUrl={projectUrl(editorFor)}
        themes={themes}
        currentKey={editorFor?.theme_key ?? themeData?.current ?? ""}
        accent={editorFor?.accent_color || themeData?.accent || "#f59e0b"}
        premium={premium}
        saving={savingId === editorFor?.id}
        onApply={(t) => editorFor && patchProject(editorFor.id, { theme_key: t.key, accent_color: t.accent_color })}
        onAccent={(color) => editorFor && patchProject(editorFor.id, { accent_color: color })}
        onLinks={() => setLinksOpen(true)}
      />
      <OneQrHubSheet
        open={hubOpen}
        onClose={() => setHubOpen(false)}
        onProfileSaved={(p) => setProfile(p)}
      />
      <VisitorChatSheet visitor={visitorOpen} onClose={() => setVisitorOpen(null)} />
      <OneQrGuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}

function PillBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-11 flex-1 rounded-full text-[12.5px] font-extrabold transition active:scale-95 ${active ? "text-slate-900" : "text-white/70"}`}
    >
      {active && (
        <motion.span
          layoutId="oneqr-pill"
          className="absolute inset-0 rounded-full bg-white"
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        />
      )}
      <span className="relative inline-flex items-center justify-center gap-1.5">
        {label === "My Project" && <QrCode className="h-3.5 w-3.5" />}
        {label === "Vendors" && <Users className="h-3.5 w-3.5" />}
        {label === "Ads" && <Megaphone className="h-3.5 w-3.5" />}
        {label}
      </span>
    </button>
  );
}
