import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const ONBOARDING_SEEN_KEY = "ko-onboarding-seen-v1";

type Slide = {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  media_type: "image" | "video" | "lottie" | "animation";
  media_url: string;
  cta_label: string;
  skip_allowed: boolean;
};

export function OnboardingCarousel({
  audience = "customer",
  onDone,
}: {
  audience?: "customer" | "vendor";
  onDone: () => void;
}) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("onboarding_slides" as never)
        .select("id,position,title,subtitle,media_type,media_url,cta_label,skip_allowed")
        .in("audience", [audience, "all"])
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (cancelled) return;
      const list = ((data as unknown) as Slide[]) ?? [];
      if (list.length === 0) {
        finish();
        return;
      }
      setSlides(list);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {}
    onDone();
  };

  const next = () => {
    if (!slides) return;
    if (idx + 1 >= slides.length) finish();
    else setIdx(idx + 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (dx < -40) next();
    else if (dx > 40 && idx > 0) setIdx(idx - 1);
  };

  if (!slides || slides.length === 0) return null;
  const s = slides[idx];

  return (
    <div
      className="fixed inset-0 z-[80] bg-gradient-to-b from-[#1a1208] via-[#2a1a08] to-[#0a0604] text-white flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {s.skip_allowed && (
        <button
          onClick={finish}
          className="absolute top-4 right-4 z-10 h-9 px-3 rounded-full bg-white/10 backdrop-blur text-sm text-white/80 hover:bg-white/20 flex items-center gap-1"
        >
          Skip <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md flex flex-col items-center text-center"
          >
            <div className="w-full aspect-square max-h-[55vh] rounded-3xl overflow-hidden bg-white/5 border border-[#d4af37]/30 grid place-items-center mb-6">
              {s.media_url ? (
                s.media_type === "video" ? (
                  <video src={s.media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="text-[#d4af37]/40 text-sm">No media</div>
              )}
            </div>
            <h2 className="font-display text-3xl bg-gradient-to-r from-[#fff8dc] via-[#f5d97a] to-[#d4af37] bg-clip-text text-transparent font-bold mb-3">
              {s.title}
            </h2>
            <p className="text-white/70 text-base leading-relaxed">{s.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 pt-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-8 bg-[#d4af37]" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full max-w-md h-12 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#b45309] text-black font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
        >
          {idx + 1 === slides.length ? "Get Started" : s.cta_label || "Next"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
