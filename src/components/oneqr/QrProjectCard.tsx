import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  QrCode, Share2, Download, Users, Eye, MousePointerClick, Palette, Link2,
  Megaphone, Check, Lock, Sparkles, Trash2, Loader2, ChevronDown,
} from "lucide-react";

export type QrProject = {
  id: string;
  title: string;
  slug: string;
  theme_key: string;
  accent_color: string | null;
  links: unknown;
  ads_enabled: boolean;
  ad_budget_inr: number;
  ad_clicks: number;
};

export type LandingTheme = {
  key: string; name: string; description: string | null; preset: string;
  accent_color: string; bg_from: string; bg_to: string; is_premium: boolean;
};

export type ProjectStats = { total: number; today: number; leads: number; clicks: number };

export function QrProjectCard({
  project, stats, themes, premium, landingUrl, saving,
  onPatch, onDelete, onPoster, onLinks,
}: {
  project: QrProject;
  stats: ProjectStats;
  themes: LandingTheme[];
  premium: boolean;
  landingUrl: string;
  saving: boolean;
  onPatch: (patch: Partial<QrProject>) => void;
  onDelete: () => void;
  onPoster: () => void;
  onLinks: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const accent = project.accent_color || themes.find((t) => t.key === project.theme_key)?.accent_color || "#f59e0b";

  useEffect(() => {
    if (!canvasRef.current || !landingUrl) return;
    QRCode.toCanvas(canvasRef.current, landingUrl, { width: 168, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .catch(() => { /* ignore */ });
  }, [landingUrl]);

  const share = async () => {
    if (!landingUrl) return;
    try {
      if (navigator.share) await navigator.share({ title: project.title, url: landingUrl });
      else await navigator.clipboard.writeText(landingUrl);
    } catch { /* dismissed */ }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="rounded-[28px] bg-white/95 border border-amber-200/80 shadow-[0_18px_44px_-26px_rgba(180,120,20,0.6)] overflow-hidden"
      style={{ boxShadow: `0 0 0 1px ${accent}22, 0 18px 44px -26px rgba(180,120,20,0.55)` }}
    >
      {/* Head */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <span className="h-10 w-10 shrink-0 rounded-2xl grid place-items-center text-white" style={{ background: accent }}>
          <QrCode className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <input
            value={project.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            className="w-full bg-transparent font-display font-bold text-[15px] text-slate-900 outline-none focus:bg-amber-50/70 rounded-lg px-1 -ml-1"
          />
          <p className="text-[11px] text-slate-500 truncate px-1 -ml-1">/{project.slug}</p>
        </div>
        <button onClick={onDelete} aria-label="Delete project" className="h-8 w-8 grid place-items-center rounded-full bg-rose-50 text-rose-600 active:scale-90">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* QR + actions */}
      <div className="px-4 flex items-center gap-3">
        <div className="rounded-2xl border border-amber-200 bg-white p-2 shrink-0">
          <canvas ref={canvasRef} className="h-[84px] w-[84px]" />
        </div>
        <div className="flex-1 grid gap-2">
          <button onClick={share} className="h-10 rounded-2xl bg-amber-500 text-white text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95">
            <Share2 className="h-3.5 w-3.5" /> Share QR
          </button>
          <button onClick={onPoster} className="h-10 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95">
            <Download className="h-3.5 w-3.5" /> Download Poster
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-3.5 mx-4 grid grid-cols-4 gap-2">
        <Metric icon={Users} label="Visitors" value={stats.total} />
        <Metric icon={Eye} label="Today" value={stats.today} />
        <Metric icon={QrCode} label="Leads" value={stats.leads} />
        <Metric icon={MousePointerClick} label="Ad clicks" value={stats.clicks} />
      </div>

      {/* Theme accordion */}
      <div className="mt-3.5 mx-4 rounded-2xl border border-black/10 overflow-hidden">
        <button
          onClick={() => setThemeOpen((v) => !v)}
          className="w-full h-11 px-3 flex items-center gap-2 bg-amber-50/70 active:scale-[0.99]"
        >
          <Palette className="h-4 w-4 text-amber-700" />
          <span className="text-[12px] font-bold text-slate-800">Landing page theme</span>
          <ChevronDown className={`ml-auto h-4 w-4 text-slate-500 transition-transform ${themeOpen ? "rotate-180" : ""}`} />
        </button>
        <motion.div initial={false} animate={{ height: themeOpen ? "auto" : 0 }} className="overflow-hidden">
          <div className="p-3 grid grid-cols-2 gap-2.5 bg-white">
            {themes.map((t) => {
              const locked = t.is_premium && !premium;
              const active = project.theme_key === t.key;
              return (
                <motion.button
                  key={t.key}
                  whileTap={{ scale: 0.97 }}
                  disabled={locked || saving}
                  onClick={() => onPatch({ theme_key: t.key, accent_color: t.accent_color })}
                  className={`relative rounded-2xl overflow-hidden border text-left ${active ? "border-amber-500 ring-2 ring-amber-300" : "border-black/10"} ${locked ? "opacity-70" : ""}`}
                >
                  <div className="h-20 p-2.5 flex flex-col justify-end" style={{ background: `linear-gradient(160deg, ${t.bg_from}, ${t.bg_to})` }}>
                    <span className="h-5 w-5 rounded-full mb-1.5" style={{ background: t.accent_color }} />
                    <span className="block h-1.5 w-12 rounded-full bg-black/15" />
                  </div>
                  <div className="px-2.5 py-2 bg-white">
                    <p className="text-[12px] font-bold text-slate-900 truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{t.description ?? t.preset}</p>
                  </div>
                  {t.is_premium && (
                    <span className={`absolute top-2 right-2 h-6 px-1.5 rounded-full text-white text-[9px] font-bold inline-flex items-center gap-1 ${locked ? "bg-black/70" : "bg-purple-600"}`}>
                      {locked ? <Lock className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />} PRO
                    </span>
                  )}
                  {active && (
                    <span className="absolute top-2 left-2 h-6 w-6 rounded-full bg-amber-500 text-white grid place-items-center">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Links + ads */}
      <div className="mt-3 mx-4 grid grid-cols-2 gap-2">
        <button onClick={onLinks} className="h-11 rounded-2xl border border-black/10 bg-white text-[12px] font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 active:scale-95">
          <Link2 className="h-4 w-4 text-amber-600" /> Custom links
        </button>
        <button
          onClick={() => onPatch({ ads_enabled: !project.ads_enabled })}
          className={`h-11 rounded-2xl text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95 ${project.ads_enabled ? "bg-amber-500 text-white" : "border border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          <Megaphone className="h-4 w-4" /> {project.ads_enabled ? "Ads running" : "Run ads"}
        </button>
      </div>

      {project.ads_enabled && (
        <div className="mt-2 mx-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-[11px] font-bold text-amber-900 mb-1.5">Daily ad budget (₹)</p>
          <input
            type="number"
            min={0}
            value={project.ad_budget_inr}
            onChange={(e) => onPatch({ ad_budget_inr: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full h-10 rounded-xl border border-amber-300 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none"
          />
          <p className="text-[10px] text-amber-800/80 mt-1.5">
            Ye budget is project ke landing page ko nearby customers ko sponsored card me dikhata hai.
          </p>
        </div>
      )}

      {/* Live preview */}
      <div className="mt-3 mx-4 mb-4">
        <button
          onClick={() => setPreviewOpen((v) => !v)}
          className="w-full h-10 rounded-2xl border border-amber-300 bg-white text-[12px] font-bold text-amber-900 inline-flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Eye className="h-4 w-4" /> {previewOpen ? "Hide customer preview" : "Live customer preview"}
        </button>
        {previewOpen && landingUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 420 }}
            className="mt-2 rounded-3xl overflow-hidden border border-amber-200 bg-slate-50"
          >
            <iframe src={landingUrl} title={`${project.title} preview`} className="h-[420px] w-full" />
          </motion.div>
        )}
      </div>
    </motion.article>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-1.5 py-2.5 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-amber-600" />
      <p className="text-[15px] font-extrabold text-slate-900 leading-none mt-1">{value}</p>
      <p className="text-[9px] text-slate-500 mt-1 truncate">{label}</p>
    </div>
  );
}
