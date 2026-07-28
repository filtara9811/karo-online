import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useHomeBanners } from "@/hooks/use-home-content";

/** Auto-sliding, clickable banner rail. Content is managed from Admin → Home Content. */
export function HomeBannerRail() {
  const { banners, loading } = useHomeBanners();
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 3800);
    return () => clearInterval(t);
  }, [banners.length]);

  useEffect(() => {
    const el = scrollRef.current;
    const child = el?.children[idx] as HTMLElement | undefined;
    if (el && child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, [idx]);

  const open = (link?: string) => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.open(link, "_blank", "noopener,noreferrer");
    else navigate({ to: link as string });
  };

  if (loading) {
    return <div className="mx-4 h-36 rounded-3xl bg-white/70 animate-pulse" />;
  }
  if (banners.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / (el.clientWidth * 0.9));
          if (i !== idx && i >= 0 && i < banners.length) setIdx(i);
        }}
      >
        {banners.map((b) => (
          <button
            key={b.id}
            onClick={() => open(b.link)}
            className="snap-center shrink-0 w-[88%] h-36 rounded-3xl overflow-hidden relative text-left active:scale-[0.98] transition shadow-[0_14px_30px_-18px_rgba(0,0,0,0.45)] border border-white"
          >
            <img src={b.image_url} alt={b.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            {(b.title || b.subtitle) && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
                <div className="relative h-full flex flex-col justify-center px-4 max-w-[70%]">
                  {b.title && <h3 className="text-white font-black text-[17px] leading-tight drop-shadow">{b.title}</h3>}
                  {b.subtitle && <p className="text-white/85 text-[11.5px] font-semibold mt-1">{b.subtitle}</p>}
                </div>
              </>
            )}
          </button>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIdx(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-orange-500" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
