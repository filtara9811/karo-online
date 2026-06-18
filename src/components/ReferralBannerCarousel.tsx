import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type RemoteBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  cta_link: string | null;
  sort_order: number;
  is_active: boolean;
};

type Slide = {
  id: string;
  src: string;
  alt: string;
  href?: string | null;
};

/**
 * Hardware-accelerated auto-advancing carousel for the Refer & Earn hero.
 * Pulls active banners from `referral_banners` and falls back to a single
 * provided fallback image when the admin has none configured.
 */
export function ReferralBannerCarousel({
  fallbackSrc,
  fallbackAlt,
  intervalMs = 4500,
}: {
  fallbackSrc: string;
  fallbackAlt: string;
  intervalMs?: number;
}) {
  const [slides, setSlides] = useState<Slide[]>([
    { id: "fallback", src: fallbackSrc, alt: fallbackAlt },
  ]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("referral_banners")
        .select("id,title,subtitle,image_url,cta_link,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const rows = ((data as RemoteBanner[] | null) ?? []).filter(
        (r) => !!r.image_url,
      );
      if (rows.length > 0) {
        setSlides(
          rows.map((r) => ({
            id: r.id,
            src: r.image_url as string,
            alt: r.title ?? "Refer & Earn",
            href: r.cta_link,
          })),
        );
        setIdx(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  const active = slides[idx];

  return (
    <div className="relative w-full overflow-hidden" style={{ transform: "translateZ(0)" }}>
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={active.id}
            src={active.src}
            alt={active.alt}
            initial={{ opacity: 0, scale: 1.04, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -30 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {slides.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-6 bg-white shadow" : "w-1.5 bg-white/55"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
