import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Lock, Sparkles, RefreshCw, Loader2, ExternalLink, Palette, Link2, Download, Megaphone } from "lucide-react";
import type { LandingTheme } from "./QrProjectCard";

/**
 * Full-screen theme preview: the merchant sees the real customer landing page
 * inside a phone frame and can switch styles / colours / links live.
 */
export function ThemePreviewSheet({
  open,
  onClose,
  title,
  landingUrl,
  themes,
  currentKey,
  accent,
  premium,
  saving,
  onApply,
  onAccent,
  onLinks,
  onPoster,
  onCampaign,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  landingUrl: string;
  themes: LandingTheme[];
  currentKey: string;
  accent: string;
  premium: boolean;
  saving: boolean;
  onApply: (t: LandingTheme) => void;
  onAccent: (color: string) => void;
  onLinks: () => void;
  onPoster: () => void;
  onCampaign: () => void;
}) {
  const [nonce, setNonce] = useState(0);
  const [showThemes, setShowThemes] = useState(true);
  const colorRef = useRef<HTMLInputElement | null>(null);
  const active = themes.find((t) => t.key === currentKey);
  const src = landingUrl ? `${landingUrl}${landingUrl.includes("?") ? "&" : "?"}preview=${nonce}` : "";

  // Any theme/colour change reflects instantly in the frame
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setNonce((n) => n + 1), 600);
    return () => clearTimeout(t);
  }, [currentKey, accent, open]);


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="absolute inset-x-0 bottom-0 top-6 flex flex-col rounded-t-[30px] bg-gradient-to-b from-amber-50 to-white"
          >
            <div className="flex items-center gap-3 px-4 pt-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">Customer preview</p>
                <h2 className="truncate font-display text-xl font-bold text-slate-900">{title}</h2>
              </div>
              <button
                onClick={() => setNonce((n) => n + 1)}
                aria-label="Refresh preview"
                className="ml-auto h-9 w-9 shrink-0 grid place-items-center rounded-full bg-white text-amber-700 border border-amber-200 active:scale-90"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close preview"
                className="h-9 w-9 shrink-0 grid place-items-center rounded-full bg-slate-100 text-slate-700 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Phone frame */}
            <div className="flex-1 min-h-0 px-4 pt-3">
              <div className="mx-auto h-full w-full max-w-[340px] overflow-hidden rounded-[30px] border-[7px] border-slate-900 bg-white shadow-2xl">
                {src ? (
                  <iframe key={nonce} src={src} title="Landing preview" className="h-full w-full" />
                ) : (
                  <div className="grid h-full place-items-center text-[12px] text-slate-500">Preview loading…</div>
                )}
              </div>
            </div>

            {/* Theme strip */}
            <div className="shrink-0 border-t border-amber-200/70 bg-white/90 px-3 py-3">
              <div className="mb-2 flex items-center gap-2 px-1">
                <p className="text-[11px] font-bold text-slate-700">
                  Style: <span className="text-amber-700">{active?.name ?? currentKey}</span>
                </p>
                {landingUrl && (
                  <a
                    href={landingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-amber-700"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {themes.map((t) => {
                  const locked = t.is_premium && !premium;
                  const isActive = t.key === currentKey;
                  return (
                    <motion.button
                      key={t.key}
                      whileTap={{ scale: 0.96 }}
                      disabled={locked || saving}
                      onClick={() => {
                        onApply(t);
                        setTimeout(() => setNonce((n) => n + 1), 700);
                      }}
                      className={`relative w-[128px] shrink-0 overflow-hidden rounded-2xl border text-left ${isActive ? "border-amber-500 ring-2 ring-amber-300" : "border-black/10"} ${locked ? "opacity-70" : ""}`}
                    >
                      <div className="h-16 p-2 flex flex-col justify-end" style={{ background: `linear-gradient(160deg, ${t.bg_from}, ${t.bg_to})` }}>
                        <span className="mb-1 h-4 w-4 rounded-full" style={{ background: t.accent_color }} />
                        <span className="block h-1.5 w-10 rounded-full bg-black/15" />
                      </div>
                      <div className="bg-white px-2 py-1.5">
                        <p className="truncate text-[11.5px] font-bold text-slate-900">{t.name}</p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700">
                          {t.style === "chat" ? "Chat style" : t.style === "reels" ? "Reels style" : "Shop style"}
                        </p>
                      </div>
                      {t.is_premium && (
                        <span className={`absolute right-1.5 top-1.5 inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[8.5px] font-bold text-white ${locked ? "bg-black/70" : "bg-purple-600"}`}>
                          {locked ? <Lock className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />} PRO
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-slate-500">
                Tap koi bhi style — turant customer landing page par apply ho jayega.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
