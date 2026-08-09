import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import {
  QrCode, Share2, Download, Users, Megaphone, Trash2, MoreVertical,
  Settings as SettingsIcon, Link2, HelpCircle, Phone, MessageCircle, Store,
} from "lucide-react";
import { QrAnalyticsChart } from "./QrAnalyticsChart";
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

export type CardProfile = {
  business_name?: string | null;
  shop_bio?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
};

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

/**
 * Clean One QR project card: cover + identity + exactly four action tiles
 * (QR, campaign, landing page editor, links) then analytics and visitors.
 */
export function QrProjectCard({
  project, stats, themes, landingUrl, visits, profile,
  onPatch, onDelete, onPoster, onLinks, onCampaign, onVisitor, onQr, onPreview, onGuide, onProfile,
}: {
  project: QrProject;
  stats: ProjectStats;
  themes: LandingTheme[];
  landingUrl: string;
  visits: VisitorRow[];
  profile?: CardProfile | null;
  onPatch: (patch: Partial<QrProject>) => void;
  onDelete: () => void;
  onPoster: () => void;
  onLinks: () => void;
  onCampaign: () => void;
  onVisitor: (v: VisitorRow) => void;
  onQr: () => void;
  onPreview: () => void;
  onGuide: () => void;
  onProfile: () => void;
}) {
  const qrTileRef = useRef<HTMLCanvasElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const accent = project.accent_color || themes.find((t) => t.key === project.theme_key)?.accent_color || "#f59e0b";
  const theme = themes.find((t) => t.key === project.theme_key);

  useEffect(() => {
    if (!qrTileRef.current || !landingUrl) return;
    QRCode.toCanvas(qrTileRef.current, landingUrl, { width: 72, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
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
      className="relative rounded-[28px] bg-white/95 border border-amber-200/80 overflow-hidden"
      style={{ boxShadow: `0 0 0 1px ${accent}22, 0 18px 44px -26px rgba(180,120,20,0.55)` }}
    >
      {/* Cover */}
      <div
        className="relative h-36"
        style={{ background: `linear-gradient(150deg, ${theme?.bg_from ?? "#fde68a"}, ${theme?.bg_to ?? "#fef3c7"})` }}
      >
        {profile?.cover_image_url && (
          <img src={profile.cover_image_url} alt={profile.business_name ?? project.title} className="h-full w-full object-cover" loading="lazy" />
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Project options"
          className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-white/85 backdrop-blur text-slate-700 active:scale-90"
        >
          <MoreVertical className="h-4.5 w-4.5" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              className="absolute top-14 right-3 z-20 w-48 rounded-2xl bg-white border border-black/10 shadow-xl overflow-hidden"
            >
              <MenuItem icon={Share2} label="Share link" onClick={() => { setMenuOpen(false); share(); }} />
              <MenuItem icon={Download} label="Download poster" onClick={() => { setMenuOpen(false); onPoster(); }} />
              <MenuItem icon={HelpCircle} label="Help & guide" onClick={() => { setMenuOpen(false); onGuide(); }} />
              <MenuItem icon={Trash2} label="Delete project" danger onClick={() => { setMenuOpen(false); onDelete(); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Identity — tap to open the full business profile form */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onProfile}
          aria-label="Edit business profile"
          className="relative -mt-11 h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full bg-amber-50 ring-4 ring-white grid place-items-center"
          style={{ color: accent }}
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.business_name ?? project.title} className="h-full w-full object-cover" loading="lazy" />
            : <Store className="h-6 w-6" />}
        </motion.button>
        <button
          onClick={onProfile}
          className="flex-1 min-w-0 text-left active:opacity-70"
        >
          <p className="truncate font-display font-bold text-[16px] text-slate-900">
            {profile?.business_name || project.title}
          </p>
          <p className="truncate text-[11.5px] text-slate-500">
            {profile?.shop_bio || `/${project.slug}`}
          </p>
        </button>
      </div>

      {/* Four action tiles */}
      <div className="mt-2.5 mx-4 grid grid-cols-4 gap-2">
        <Tile accent={accent} value={stats.total} label="Qr | visitor" onClick={onQr} pulse>
          <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-[4px] bg-white">
            <canvas ref={qrTileRef} className="h-6 w-6" />
          </span>
        </Tile>
        <Tile accent={accent} value={stats.clicks} label="Add campaign" onClick={onCampaign} icon={Megaphone} />
        <Tile accent={accent} label="My landing page" onClick={onPreview} icon={SettingsIcon} />
        <Tile accent={accent} label="Add | link" onClick={onLinks} icon={Link2} />
      </div>


      {/* Analytics */}
      <div className="mt-3 mx-4">
        <QrAnalyticsChart visits={visits} accent={accent} />
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

      {/* Visitors */}
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

      <div className="mb-4" />
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
  icon: Icon, value, label, accent, onClick, children, pulse,
}: {
  icon?: typeof Users; value?: number; label: string; accent: string;
  onClick: () => void; children?: React.ReactNode; pulse?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      onClick={onClick}
      className="relative rounded-2xl border border-amber-200/80 bg-amber-50/70 px-1.5 py-2.5 text-center active:bg-amber-100/70"
    >
      <span className="relative mx-auto grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
        {pulse && (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${accent}` }}
          />
        )}
        {children ?? (Icon ? <Icon className="h-4 w-4" style={{ color: accent }} /> : null)}
      </span>
      {value != null && <p className="text-[15px] font-extrabold text-slate-900 leading-none mt-1.5">{value}</p>}
      <p className="text-[9px] text-slate-500 mt-1 truncate">{label}</p>
    </motion.button>
  );
}

