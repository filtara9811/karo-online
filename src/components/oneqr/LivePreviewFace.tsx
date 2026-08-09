import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RotateCcw, RefreshCw, ExternalLink, Sparkles, Link2, Package, Video, Check, Lock, Loader2, Palette, Settings,
} from "lucide-react";
import type { LandingTheme } from "./QrProjectCard";

/**
 * Live customer preview — shown on the flipped back face of a One QR project card.
 * Merchant can change theme / brand colour / links and watch the real landing
 * page update inside the phone frame instantly.
 */
export function LivePreviewFace({
  title,
  landingUrl,
  themes,
  currentKey,
  accent,
  premium,
  saving,
  onFlipBack,
  onApply,
  onAccent,
  onLinks,
  onProducts,
  onVideos,
  onSettings,
}: {
  title: string;
  landingUrl: string;
  themes: LandingTheme[];
  currentKey: string;
  accent: string;
  premium: boolean;
  saving: boolean;
  onFlipBack: () => void;
  onApply: (t: LandingTheme) => void;
  onAccent: (color: string) => void;
  onLinks: () => void;
  onProducts?: () => void;
  onVideos?: () => void;
  onSettings?: () => void;
}) {
  const [nonce, setNonce] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const colorRef = useRef<HTMLInputElement | null>(null);
  const active = themes.find((t) => t.key === currentKey);
  const src = landingUrl ? `${landingUrl}${landingUrl.includes("?") ? "&" : "?"}preview=${nonce}` : "";

  // Any theme / colour change reflects in the frame right away
  useEffect(() => {
    const t = setTimeout(() => setNonce((n) => n + 1), 600);
    return () => clearTimeout(t);
  }, [currentKey, accent]);


  return (
    <div className="flex h-full flex-col rounded-[28px] bg-white border border-amber-200/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5">
        <div className="min-w-0">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-amber-700">Live customer preview</p>
          <h3 className="truncate font-display text-[15px] font-bold text-slate-900">{title}</h3>
        </div>
        <button
          onClick={() => setNonce((n) => n + 1)}
          aria-label="Refresh preview"
          className="ml-auto h-8 w-8 shrink-0 grid place-items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 active:scale-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onFlipBack}
          aria-label="Back to dashboard"
          className="h-8 w-8 shrink-0 grid place-items-center rounded-full bg-slate-900 text-white active:scale-90"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Realistic phone frame — renders a true 390px viewport, scaled down */}
      <div className="min-h-0 flex-1 px-4 pt-3">
        <div className="mx-auto h-full w-full max-w-[258px]">
          <div className="relative mx-auto h-full w-full rounded-[38px] bg-slate-900 p-[7px] shadow-[0_18px_40px_-18px_rgba(15,23,42,0.65)] ring-1 ring-white/10">
            {/* side buttons */}
            <span className="absolute -left-[2px] top-[92px] h-9 w-[3px] rounded-l bg-slate-700" />
            <span className="absolute -left-[2px] top-[136px] h-14 w-[3px] rounded-l bg-slate-700" />
            <span className="absolute -right-[2px] top-[116px] h-16 w-[3px] rounded-r bg-slate-700" />
            <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-white">
              {/* dynamic island */}
              <span className="pointer-events-none absolute left-1/2 top-1.5 z-10 h-[14px] w-[62px] -translate-x-1/2 rounded-full bg-slate-900" />
              {src ? (
                <iframe
                  key={nonce}
                  src={src}
                  title="Landing preview"
                  className="h-full w-full origin-top-left border-0"
                  style={{ width: 390, height: "calc(100% / 0.626)", transform: "scale(0.626)" }}
                />
              ) : (
                <div className="grid h-full place-items-center text-[11px] text-slate-500">Preview loading…</div>
              )}
              {/* home indicator */}
              <span className="pointer-events-none absolute bottom-1.5 left-1/2 h-[3px] w-16 -translate-x-1/2 rounded-full bg-slate-900/25" />
            </div>
          </div>
        </div>
      </div>


      {/* Editor */}
      <div className="shrink-0 px-3 pb-3 pt-2.5">
        <div className="mb-2 flex items-center gap-2 px-1">
          <p className="truncate text-[10.5px] font-bold text-slate-600">
            Style: <span className="text-amber-700">{active?.name ?? currentKey}</span>
          </p>
          {landingUrl && (
            <a
              href={landingUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-amber-700"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showThemes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {themes.map((t) => {
                  const locked = t.is_premium && !premium;
                  const isActive = t.key === currentKey;
                  return (
                    <motion.button
                      key={t.key}
                      whileTap={{ scale: 0.96 }}
                      disabled={locked || saving}
                      onClick={() => onApply(t)}
                      className={`relative w-[112px] shrink-0 overflow-hidden rounded-2xl border text-left ${isActive ? "border-amber-500 ring-2 ring-amber-300" : "border-black/10"} ${locked ? "opacity-70" : ""}`}
                    >
                      <div
                        className="h-12 p-2 flex flex-col justify-end"
                        style={{ background: `linear-gradient(160deg, ${t.bg_from}, ${t.bg_to})` }}
                      >
                        <span className="mb-1 h-3.5 w-3.5 rounded-full" style={{ background: t.accent_color }} />
                        <span className="block h-1.5 w-8 rounded-full bg-black/15" />
                      </div>
                      <div className="bg-white px-2 py-1.5">
                        <p className="truncate text-[10.5px] font-bold text-slate-900">{t.name}</p>
                        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-700">
                          {t.style === "chat" ? "Chat style" : t.style === "reels" ? "Reels style" : "Shop style"}
                        </p>
                      </div>
                      {t.is_premium && (
                        <span className={`absolute right-1.5 top-1.5 inline-flex h-4 items-center gap-1 rounded-full px-1.5 text-[7.5px] font-bold text-white ${locked ? "bg-black/70" : "bg-purple-600"}`}>
                          {locked ? <Lock className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />} PRO
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute left-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-white">
                          {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean round tool row */}
        <div className="flex items-start justify-between gap-1 rounded-[22px] border border-amber-200 bg-amber-50/70 px-2.5 py-2">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => colorRef.current?.click()}
              className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-white shadow active:scale-95"
              style={{ background: accent }}
              aria-label="Brand colour"
            >
              <Palette className="h-4 w-4 text-white drop-shadow" />
              <input
                ref={colorRef}
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#f59e0b"}
                onChange={(e) => onAccent(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </button>
            <span className="text-[8.5px] font-bold text-slate-500">Colour</span>
          </div>
          <Tool label="Theme" icon={Sparkles} active={showThemes} onClick={() => setShowThemes((v) => !v)} />
          <Tool label="Links | add" icon={Link2} onClick={onLinks} />
          <Tool label="Product | add" icon={Package} onClick={onLinks} />
          <Tool label="Videos | add" icon={Video} onClick={onLinks} />
        </div>
      </div>
    </div>
  );
}

function Tool({
  label, icon: Icon, onClick, active,
}: { label: string; icon: typeof Link2; onClick: () => void; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onClick}
        aria-label={label}
        className={`grid h-10 w-10 place-items-center rounded-full border transition ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-amber-800 border-amber-200"}`}
      >
        <Icon className="h-4 w-4" />
      </motion.button>
      <span className="text-[8.5px] font-bold text-slate-500">{label}</span>
    </div>
  );
}
