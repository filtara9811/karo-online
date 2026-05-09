import { lazy, Suspense, useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

const Lottie = lazy(() => import("lottie-react"));

/**
 * Detect the type of a media value.
 * - "lottie" → URL ending in .json (or .lottie)
 * - "image"  → http(s) URL or storage path with image extension
 * - "emoji"  → short text / emoji
 * - "empty"  → nothing
 */
export type MediaKind = "lottie" | "image" | "emoji" | "empty";

export function detectMediaKind(v?: string | null): MediaKind {
  if (!v) return "empty";
  const s = v.trim();
  if (!s) return "empty";
  if (/\.(json|lottie)(\?.*)?$/i.test(s)) return "lottie";
  if (/^(https?:|data:|blob:|\/)/i.test(s)) return "image";
  if (/\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(s)) return "image";
  // Short string with no slashes → treat as emoji/text
  if (s.length <= 6 && !s.includes("/")) return "emoji";
  return "image";
}

/**
 * Universal media renderer.
 * Accepts a single `src` (image URL / lottie URL / emoji) or legacy
 * (`url` + `icon`) pair where url wins.
 */
export function SmartMedia({
  src,
  url,
  icon,
  size = 40,
  className = "",
  rounded = "rounded-lg",
  alt = "",
}: {
  src?: string | null;
  url?: string | null;
  icon?: string | null;
  size?: number;
  className?: string;
  rounded?: string;
  alt?: string;
}) {
  const value = src ?? url ?? icon ?? null;
  const kind = detectMediaKind(value);
  const [animData, setAnimData] = useState<any | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (kind !== "lottie" || !value) {
      setAnimData(null);
      return;
    }
    let cancel = false;
    fetch(value)
      .then((r) => r.json())
      .then((j) => !cancel && setAnimData(j))
      .catch(() => !cancel && setBroken(true));
    return () => {
      cancel = true;
    };
  }, [value, kind]);

  const box = `shrink-0 grid place-items-center overflow-hidden ${rounded} ${className}`;
  const style = { width: size, height: size };

  if (kind === "empty" || broken) {
    return (
      <div
        className={`${box} border border-[#d4af37]/20 bg-black/30 text-[#d4af37]/40`}
        style={style}
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }

  if (kind === "emoji") {
    return (
      <div
        className={`${box} border border-[#d4af37]/20 bg-black/30 text-lg`}
        style={style}
      >
        <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{value}</span>
      </div>
    );
  }

  if (kind === "lottie") {
    return (
      <div className={box} style={style}>
        <Suspense fallback={<div className="w-full h-full bg-black/20" />}>
          {animData ? (
            <Lottie animationData={animData} loop autoplay style={style} />
          ) : (
            <div className="w-full h-full bg-black/20 animate-pulse" />
          )}
        </Suspense>
      </div>
    );
  }

  return (
    <img
      src={value!}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={`${box} object-cover border border-[#d4af37]/20`}
      style={style}
    />
  );
}
