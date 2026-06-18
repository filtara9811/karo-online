import { useEffect, useRef } from "react";

/**
 * Google AdSense / AdMob-for-Web slot.
 * Renders a real <ins class="adsbygoogle"> when admin has configured both
 * `publisherId` (ca-pub-…) and `slot`. Otherwise renders a tasteful
 * "Advertise here" skeleton so the layout is always reserved.
 */
declare global {
  interface Window { adsbygoogle?: unknown[] }
}

export function AdSlot({
  publisherId,
  slot,
  format = "auto",
  className = "",
  height = 100,
}: {
  publisherId?: string | null;
  slot?: string | null;
  format?: "auto" | "fluid" | "rectangle";
  className?: string;
  height?: number;
}) {
  const pushed = useRef(false);
  const ready = Boolean(publisherId && slot);

  useEffect(() => {
    if (!ready || pushed.current) return;
    const id = "adsense-loader";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ignore */
    }
  }, [ready, publisherId]);

  if (!ready) {
    return (
      <div
        className={`w-full grid place-items-center rounded-xl border border-dashed border-[#d4af37]/40 bg-[#fdf6e3]/50 text-[#8b6508] text-[10px] uppercase tracking-widest ${className}`}
        style={{ minHeight: height }}
        aria-label="Sponsored slot"
      >
        Advertise Here
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block", minHeight: height, width: "100%" }}
      data-ad-client={publisherId!}
      data-ad-slot={slot!}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
