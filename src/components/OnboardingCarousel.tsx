import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import slide1 from "@/assets/ko-onboard-1.png.asset.json";
import slide2 from "@/assets/ko-onboard-2.png.asset.json";
import slide3 from "@/assets/ko-onboard-3.png.asset.json";
import slide4 from "@/assets/ko-onboard-4.png.asset.json";

export const ONBOARDING_SEEN_KEY = "ko-onboarding-seen-v2";

const SLIDES = [slide1.url, slide2.url, slide3.url, slide4.url];

/**
 * 4-slide onboarding using uploaded creatives.
 * - Swipe left/right between slides
 * - Skip button on slides 1-3 (top-right)
 * - "Get Started" CTA on slide 4
 */
export function OnboardingCarousel({
  audience: _audience = "customer",
  onDone,
}: {
  audience?: "customer" | "vendor";
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_SEEN_KEY, "1"); } catch {}
    onDone();
  };

  const next = () => {
    if (idx + 1 >= SLIDES.length) finish();
    else setIdx(idx + 1);
  };
  const prev = () => { if (idx > 0) setIdx(idx - 1); };

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (dx < -40) next();
    else if (dx > 40) prev();
  };

  const isLast = idx === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#fdf4d4] select-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={next}
    >
      {!isLast && (
        <button
          onClick={(e) => { e.stopPropagation(); finish(); }}
          className="absolute top-4 right-4 z-20 h-9 px-3 rounded-full bg-white/90 border border-[#d4af37]/40 text-xs font-bold text-[#8b6508] shadow-md flex items-center gap-1 active:scale-95"
        >
          Skip <X className="h-3.5 w-3.5" />
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={SLIDES[idx]}
          alt={`Slide ${idx + 1}`}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </AnimatePresence>

      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-[#d4af37]" : "w-1.5 bg-[#d4af37]/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

