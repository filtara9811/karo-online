import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, BellRing, Loader2 } from "lucide-react";
import { brandOf, withAlpha, shade } from "./landing-shared";

export type GateTarget = { id: string; label: string; url: string };

/** Stable per-shop + per-platform subscribe flag. */
function gateKey(shopCode: string, id: string) {
  return `karo:sub:${shopCode}:${id}`;
}

function readGate(shopCode: string, id: string) {
  try {
    return localStorage.getItem(gateKey(shopCode, id)) === "1";
  } catch {
    return false;
  }
}

/** Real in-page embed URL for the platform (profile timelines included). */
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\.|^mobile\./, "");
    const path = u.pathname.replace(/\/+$/, "");

    if (host === "youtu.be") return `https://www.youtube.com/embed/${path.slice(1)}?autoplay=1&loop=1&playlist=${path.slice(1)}&playsinline=1`;
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      const shorts = path.match(/\/shorts\/([^/?]+)/);
      const id = v || shorts?.[1];
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&playsinline=1`;
      const channelId = path.match(/\/channel\/(UC[\w-]+)/)?.[1];
      // Channel uploads playlist: UC… -> UU…
      if (channelId) return `https://www.youtube.com/embed/videoseries?list=UU${channelId.slice(2)}&autoplay=1&playsinline=1`;
      const handle = path.match(/\/(?:@|c\/|user\/)([^/?]+)/)?.[1];
      if (handle) return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(handle)}&autoplay=1&playsinline=1`;
      return null;
    }

    if (host.endsWith("instagram.com")) {
      const post = path.match(/\/(?:p|reel|reels|tv)\/([^/?]+)/)?.[1];
      if (post) return `https://www.instagram.com/p/${post}/embed`;
      const user = path.split("/").filter(Boolean)[0];
      if (user) return `https://www.instagram.com/${user}/embed`;
      return null;
    }

    if (host.endsWith("facebook.com") || host.endsWith("fb.com") || host.endsWith("fb.me")) {
      return `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&width=500&height=1000&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;
    }

    if (host.endsWith("twitter.com") || host.endsWith("x.com")) {
      const user = path.split("/").filter(Boolean)[0];
      if (user) return `https://syndication.twitter.com/srv/timeline-profile/screen-name/${user}?dnt=true`;
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/** Platform-native follow/subscribe intent for the given profile URL. */
function followUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\.|^mobile\./, "");
    if (host.endsWith("youtube.com") || host === "youtu.be") {
      u.searchParams.set("sub_confirmation", "1");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}


/** Pause + silence every video on the page while the gate is open. */
function freezeMedia(freeze: boolean) {
  document.querySelectorAll("video").forEach((v) => {
    if (freeze) {
      v.muted = true;
      v.pause();
    } else if (v.paused) {
      void v.play().catch(() => undefined);
    }
  });
}

/**
 * 90vh immersive social gate: the visitor must Subscribe/Follow before the
 * "Open in App" redirect unlocks.
 */
export function SocialGateSheet({
  target,
  accent,
  shopName,
  shopCode,
  onClose,
}: {
  target: GateTarget | null;
  accent: string;
  shopName: string;
  shopCode: string;
  onClose: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);

  const brand = useMemo(() => (target ? brandOf(target.url, target.label) : null), [target]);
  const frameSrc = useMemo(() => (target ? embedUrl(target.url) : null), [target]);
  const isYouTube = /youtu/i.test(target?.url ?? "");
  const actionLabel = isYouTube ? "Subscribe" : "Follow";
  const doneLabel = isYouTube ? "Subscribed" : "Following";

  useEffect(() => {
    if (!target) return;
    setUnlocked(readGate(shopCode, target.id));
    setFrameReady(false);
    setFrameFailed(!frameSrc);
    freezeMedia(true);
    return () => {
      freezeMedia(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, shopCode, frameSrc]);

  const subscribe = useCallback(() => {
    if (!target) return;
    try {
      localStorage.setItem(gateKey(shopCode, target.id), "1");
    } catch {
      /* private mode — session-only unlock */
    }
    setUnlocked(true);
    window.open(followUrl(target.url), "_blank", "noopener,noreferrer");
  }, [target, shopCode]);


  const openInApp = useCallback(() => {
    if (!target || !unlocked) return;
    window.open(target.url, "_blank", "noopener,noreferrer");
  }, [target, unlocked]);

  const Icon = brand?.icon;

  return (
    <AnimatePresence>
      {target && brand && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280, mass: 0.9 }}
            className="fixed inset-x-0 bottom-0 z-[95] flex h-[90vh] flex-col overflow-hidden rounded-t-[28px] border-t bg-white/85 shadow-2xl backdrop-blur-xl"
            style={{ borderColor: withAlpha(accent, 0.55) }}
          >
            {/* Control bar */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                style={{ background: withAlpha(brand.color, 0.14), color: brand.color }}
              >
                {Icon && <Icon className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-slate-900">{shopName}</p>
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {brand.name}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900/90 text-white active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Embed area — isolated so the frame never bleeds past the rounded shell */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-950">
              {frameSrc && !frameFailed && (
                <iframe
                  src={frameSrc}
                  title={`${brand.name} · ${shopName}`}
                  onLoad={() => setFrameReady(true)}
                  onError={() => setFrameFailed(true)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  scrolling="yes"
                  className="absolute inset-0 h-full w-full border-0 bg-white"
                />
              )}
              {frameSrc && !frameReady && !frameFailed && (
                <div className="absolute inset-0 grid place-items-center text-white/70">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {frameFailed && (
                <div className="absolute inset-0 grid place-items-center px-8 text-center">
                  <div>
                    <span
                      className="mx-auto grid h-20 w-20 place-items-center rounded-3xl"
                      style={{ background: withAlpha(brand.color, 0.18), color: brand.color }}
                    >
                      {Icon && <Icon className="h-10 w-10" />}
                    </span>
                    <p className="mt-4 text-[15px] font-extrabold text-white">
                      {shopName} on {brand.name}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                      Tap {actionLabel} below to open the official page.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Control layer */}
            <div className="shrink-0 border-t border-white/60 bg-white/80 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
              <div className="grid grid-cols-2 gap-2.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={subscribe}
                  className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[13px] font-extrabold text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${brand.color}, ${shade(brand.color, -0.22)})` }}
                >
                  <BellRing className="h-4 w-4" />
                  {unlocked ? `${doneLabel} ✓` : actionLabel}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: unlocked ? 0.96 : 1 }}
                  onClick={openInApp}
                  disabled={!unlocked}
                  aria-disabled={!unlocked}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-[13px] font-extrabold transition-opacity disabled:pointer-events-none disabled:opacity-50"
                  style={{ borderColor: withAlpha(accent, 0.7), color: shade(accent, -0.35) }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in App
                </motion.button>
              </div>
              <p className="pt-2 text-center text-[10px] font-semibold text-slate-500">
                {unlocked
                  ? "Unlocked · opens in a new tab, switch back anytime"
                  : `Tap ${actionLabel} first to unlock "Open in App"`}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
