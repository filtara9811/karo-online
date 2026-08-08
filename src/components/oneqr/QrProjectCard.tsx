import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import {
  QrCode, Share2, Download, Users, Eye, MousePointerClick, Palette, Link2,
  Megaphone, Check, Lock, Sparkles, Trash2, Loader2, MoreVertical, Eye as EyeIcon, X, Phone, MessageCircle,
} from "lucide-react";
import { QrAnalyticsChart } from "./QrAnalyticsChart";
import { ThemePreviewSheet } from "./ThemePreviewSheet";
import type { VisitorRow } from "./VisitorChatSheet";

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
  key: string; name: string; description: string | null; preset: string; style?: string;
  accent_color: string; bg_from: string; bg_to: string; is_premium: boolean;
};

export type ProjectStats = { total: number; today: number; leads: number; clicks: number };

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

export function QrProjectCard({
  project, stats, themes, premium, landingUrl, saving, visits,
  onPatch, onDelete, onPoster, onLinks, onCampaign, onVisitor,
}: {
  project: QrProject;
  stats: ProjectStats;
  themes: LandingTheme[];
  premium: boolean;
  landingUrl: string;
  saving: boolean;
  visits: VisitorRow[];
  onPatch: (patch: Partial<QrProject>) => void;
  onDelete: () => void;
  onPoster: () => void;
  onLinks: () => void;
  onCampaign: () => void;
  onVisitor: (v: VisitorRow) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [themePreviewOpen, setThemePreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const accent = project.accent_color || themes.find((t) => t.key === project.theme_key)?.accent_color || "#f59e0b";
  const theme = themes.find((t) => t.key === project.theme_key);

  useEffect(() => {
    if (!canvasRef.current || !landingUrl) return;
    QRCode.toCanvas(canvasRef.current, landingUrl, { width: 168, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .catch(() => { /* ignore */ });
  }, [landingUrl]);

  useEffect(() => {
    if (!qrOpen || !bigCanvasRef.current || !landingUrl) return;
    QRCode.toCanvas(bigCanvasRef.current, landingUrl, { width: 260, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .catch(() => { /* ignore */ });
  }, [qrOpen, landingUrl]);

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
      className="relative rounded-[28px] bg-white/95 border border-amber-200/80 overflow-hidden"
      style={{ boxShadow: `0 0 0 1px ${accent}22, 0 18px 44px -26px rgba(180,120,20,0.55)` }}
    >
      {/* Banner */}
      <div
        className="relative h-28"
        style={{ background: `linear-gradient(150deg, ${theme?.bg_from ?? "#fde68a"}, ${theme?.bg_to ?? "#fef3c7"})` }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Project options"
          className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-white/85 backdrop-blur text-slate-700 active:scale-90"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              className="absolute top-14 right-3 z-20 w-48 rounded-2xl bg-white border border-black/10 shadow-xl overflow-hidden"
            >
              <MenuItem icon={EyeIcon} label="Preview landing page" onClick={() => { setMenuOpen(false); setPreviewOpen(true); }} />
              <MenuItem icon={Palette} label="Change theme" onClick={() => { setMenuOpen(false); setThemePreviewOpen(true); }} />
              <MenuItem icon={Link2} label="Manage links" onClick={() => { setMenuOpen(false); onLinks(); }} />
              <MenuItem icon={Download} label="Download poster" onClick={() => { setMenuOpen(false); onPoster(); }} />
              <MenuItem icon={Trash2} label="Delete project" danger onClick={() => { setMenuOpen(false); onDelete(); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Identity row with QR avatar */}
      <div className="px-4 -mt-8 flex items-end gap-3">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setQrOpen(true)}
          aria-label="Preview QR code"
          className="h-16 w-16 shrink-0 rounded-full bg-slate-900 grid place-items-center ring-4 ring-white overflow-hidden"
        >
          <canvas ref={canvasRef} className="h-12 w-12 rounded-md bg-white" />
        </motion.button>
        <div className="flex-1 min-w-0 pb-1">
          <input
            value={project.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            className="w-full bg-transparent font-display font-bold text-[16px] text-slate-900 outline-none focus:bg-amber-50/70 rounded-lg px-1 -ml-1"
          />
          <p className="text-[11px] text-slate-500 truncate px-1 -ml-1">/{project.slug}</p>
        </div>
        <button onClick={share} className="mb-1 h-9 px-3 rounded-full bg-amber-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 active:scale-95">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>

      {/* Quick action tiles */}
      <div className="mt-3.5 mx-4 grid grid-cols-4 gap-2">
        <Tile icon={Users} value={stats.total} label="QR visitor" accent={accent} />
        <Tile icon={Megaphone} value={stats.clicks} label="Add campaign" accent={accent} onClick={onCampaign} highlight />
        <Tile icon={MousePointerClick} value={stats.leads} label="Leads" accent={accent} />
        <Tile icon={Link2} label="Add | link" accent={accent} onClick={onLinks} />
      </div>

      {/* Analytics chart */}
      <div className="mt-3 mx-4">
        <QrAnalyticsChart visits={visits} accent={accent} />
      </div>

      {/* Theme preview — the fastest way to see what the customer gets */}
      <div className="mt-3 mx-4">
        <button
          onClick={() => setThemePreviewOpen(true)}
          className="w-full h-12 rounded-2xl text-white text-[13px] font-extrabold inline-flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${accent}, #f97316)` }}
        >
          <Eye className="h-4 w-4" /> Preview & change theme
        </button>
      </div>

      {/* Theme accordion */}
      <div className="mt-3 mx-4 rounded-2xl border border-black/10 overflow-hidden">
        <button
          onClick={() => setThemeOpen((v) => !v)}
          className="w-full h-11 px-3 flex items-center gap-2 bg-amber-50/70 active:scale-[0.99]"
        >
          <Palette className="h-4 w-4 text-amber-700" />
          <span className="text-[12px] font-bold text-slate-800">Landing page theme</span>
          <span className="ml-auto text-[11px] text-slate-500">{theme?.name ?? project.theme_key}</span>
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
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700">
                      {t.style === "chat" ? "Chat style" : t.style === "reels" ? "Reels style" : "Shop style"}
                    </p>
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

      {/* Ads */}
      <div className="mt-3 mx-4 grid grid-cols-2 gap-2">
        <button onClick={onPoster} className="h-11 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95">
          <Download className="h-4 w-4" /> Poster
        </button>
        <button
          onClick={onCampaign}
          className={`h-11 rounded-2xl text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95 ${project.ads_enabled ? "bg-amber-500 text-white" : "border border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          <Megaphone className="h-4 w-4" /> {project.ads_enabled ? "Ads running" : "Add campaign"}
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
        </div>
      )}

      {/* Visitors — WhatsApp style */}
      <div className="mt-3.5 mx-4">
        <p className="text-[11px] font-bold text-slate-600 mb-1.5 inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-amber-600" /> Landing page visitors
        </p>
        {visits.length === 0 ? (
          <p className="text-[11px] text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-3">
            Abhi koi visitor nahi — QR share karke shuru karein.
          </p>
        ) : (
          <ul className="rounded-2xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
            {visits.slice(0, 6).map((r) => {
              const name = (r.visitor_name || "").trim();
              return (
                <li key={r.id}>
                  <button onClick={() => onVisitor(r)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-amber-50">
                    <span className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-white font-bold" style={{ background: `linear-gradient(135deg, ${accent}, #f59e0b)` }}>
                      {name ? name.charAt(0).toUpperCase() : <QrCode className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[14px] font-semibold text-slate-900 truncate">{name || "Anonymous visitor"}</p>
                        <span className="ml-auto text-[10px] text-slate-400 shrink-0">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 truncate">
                        {r.visitor_phone ? `+91 ${r.visitor_phone}` : "Number nahi diya"}
                      </p>
                    </div>
                    {r.visitor_phone && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="h-8 w-8 grid place-items-center rounded-full bg-amber-50 text-amber-700"><Phone className="h-3.5 w-3.5" /></span>
                        <span className="h-8 w-8 grid place-items-center rounded-full bg-emerald-500 text-white"><MessageCircle className="h-3.5 w-3.5" /></span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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

      {/* QR preview modal */}
      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 grid place-items-center p-6"
            onClick={() => setQrOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-[28px] bg-white p-5 text-center"
            >
              <div className="flex items-center">
                <p className="font-display font-bold text-[15px] text-slate-900 truncate">{project.title}</p>
                <button onClick={() => setQrOpen(false)} aria-label="Close QR preview" className="ml-auto h-8 w-8 grid place-items-center rounded-full bg-slate-100 text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <canvas ref={bigCanvasRef} className="mx-auto mt-3 h-[220px] w-[220px]" />
              <p className="mt-2 text-[10px] text-slate-500 break-all">{landingUrl}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={share} className="h-10 rounded-2xl bg-amber-500 text-white text-[12px] font-extrabold active:scale-95">Share</button>
                <button onClick={() => { setQrOpen(false); onPoster(); }} className="h-10 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-[12px] font-extrabold active:scale-95">Poster</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
          <ThemePreviewSheet
        open={themePreviewOpen}
        onClose={() => setThemePreviewOpen(false)}
        title={project.title}
        landingUrl={landingUrl}
        themes={themes}
        currentKey={project.theme_key}
        premium={premium}
        saving={saving}
        onApply={(t) => onPatch({ theme_key: t.key, accent_color: t.accent_color })}
      />

</motion.article>
  );
}

function MenuItem({
  icon: Icon, label, onClick, danger,
}: { icon: typeof QrCode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-[12.5px] font-semibold active:bg-slate-50 ${danger ? "text-rose-600" : "text-slate-700"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Tile({
  icon: Icon, value, label, accent, onClick, highlight,
}: { icon: typeof Users; value?: number; label: string; accent: string; onClick?: () => void; highlight?: boolean }) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={`rounded-2xl border px-1.5 py-2.5 text-center ${highlight ? "border-transparent" : "border-black/10"} bg-amber-50/70`}
      style={highlight ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
    >
      <Icon className="h-4 w-4 mx-auto" style={{ color: accent }} />
      {value != null && <p className="text-[15px] font-extrabold text-slate-900 leading-none mt-1">{value}</p>}
      <p className="text-[9px] text-slate-500 mt-1 truncate">{label}</p>
    </Comp>
  );
}
