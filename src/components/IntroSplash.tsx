import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import splash1 from "@/assets/splash-1.jpg";
import splash2 from "@/assets/splash-2.png";

export const SPLASH_SESSION_KEY = "ko-splash-seen-session";
const MUTE_KEY = "ko-tts-muted";

/**
 * Two-slide branded splash shown on cold app open.
 * Slide 1: location-pin hero (1.6s)
 * Slide 2: full Karo Online splash with logo + store badges (2.0s)
 * Plays single Hindi greeting once (mute toggle in top-right).
 * Then calls onDone() — caller routes to /register or /quick.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  });
  const spoken = useRef(false);

  const speak = () => {
    if (spoken.current) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (muted) return;
    spoken.current = true;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("करो ऑनलाइन में आपका स्वागत है");
      u.lang = "hi-IN";
      u.rate = 0.95;
      u.pitch = 1.05;
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const hi = voices.find((v) => v.lang?.toLowerCase().startsWith("hi"));
      if (hi) u.voice = hi;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    // Try immediately; if the browser delays voices/audio, retry on first voice load or tap.
    speak();
    const t = setTimeout(speak, 50);
    const onGesture = () => speak();
    const onVoices = () => speak();
    try { window.speechSynthesis?.addEventListener("voiceschanged", onVoices, { once: true }); } catch { /* */ }
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", onGesture);
      try { window.speechSynthesis?.removeEventListener("voiceschanged", onVoices); } catch { /* */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Slide 1 → 2 at 1.6s. Slide 2 waits for the "Karo Online" CTA tap.
    if (idx === 0) {
      const t = setTimeout(() => setIdx(1), 1600);
      return () => clearTimeout(t);
    }
  }, [idx]);

  const finish = () => {
    try { sessionStorage.setItem(SPLASH_SESSION_KEY, "1"); } catch { /* */ }
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
    onDone();
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
      if (next) {
        try { window.speechSynthesis?.cancel(); } catch {}
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#fdf6e0]">
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-4 right-4 z-10 h-10 w-10 grid place-items-center rounded-full bg-white/80 border border-[#d4af37]/40 shadow-md backdrop-blur-sm active:scale-90 transition"
      >
        {muted
          ? <VolumeX className="h-5 w-5 text-[#8b6508]" />
          : <Volume2 className="h-5 w-5 text-[#8b6508]" />}
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={idx === 0 ? splash1 : splash2}
            alt="Karo Online"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* subtle floating shimmer on the pin */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 42%, rgba(255,243,200,0.55) 0%, transparent 45%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* CTA on slide 2 — tap to advance to mobile-number step */}
      <AnimatePresence>
        {idx === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 flex justify-center px-6"
          >
            <button
              onClick={finish}
              className="group relative h-12 min-w-[210px] rounded-full border border-[#f7dfa2]/75 bg-[#fff8df]/35 text-[#2f2209] font-bold text-base tracking-wide shadow-[0_10px_26px_-10px_rgba(75,50,8,0.55),0_0_0_1px_rgba(255,255,255,0.45)_inset] backdrop-blur-[2px] active:scale-[0.97] transition-transform"
              aria-label="Karo Online — Continue"
            >
              <span className="relative z-10">Karo Online</span>
              <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-transparent to-[#b8862a]/15" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* progress dots */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === idx ? "w-8 bg-[#8b6508]" : "w-1.5 bg-[#8b6508]/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
