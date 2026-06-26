import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import splashPin from "@/assets/ko-splash-pin.png.asset.json";

export const SPLASH_SESSION_KEY = "ko-splash-seen-session";
const MUTE_KEY = "ko-tts-muted";

/**
 * Single-image branded splash using the golden Karo Online map-pin logo.
 * Plays a Hindi greeting once (mute toggle top-right), shows a Skip button,
 * and auto-finishes after ~2.4s. Safety auto-finish at 6.2s.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
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
      u.lang = "hi-IN"; u.rate = 0.95; u.pitch = 1.05; u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const hi = voices.find((v) => v.lang?.toLowerCase().startsWith("hi"));
      if (hi) u.voice = hi;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const finish = () => {
    try { sessionStorage.setItem(SPLASH_SESSION_KEY, "1"); } catch { /* */ }
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
    onDone();
  };

  useEffect(() => {
    speak();
    const t1 = setTimeout(speak, 50);
    const onGesture = () => speak();
    try { window.speechSynthesis?.addEventListener("voiceschanged", speak, { once: true }); } catch { /* */ }
    window.addEventListener("pointerdown", onGesture, { once: true });
    const auto = setTimeout(finish, 2400);
    const safety = setTimeout(finish, 6200);
    return () => {
      clearTimeout(t1); clearTimeout(auto); clearTimeout(safety);
      window.removeEventListener("pointerdown", onGesture);
      try { window.speechSynthesis?.removeEventListener("voiceschanged", speak); } catch { /* */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
      if (next) { try { window.speechSynthesis?.cancel(); } catch {} }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#fdf4d4] flex items-center justify-center">
      <img
        src={splashPin.url}
        alt="Karo Online"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-4 right-4 z-20 h-10 w-10 grid place-items-center rounded-full bg-white/90 border border-[#d4af37]/40 shadow-md backdrop-blur-sm active:scale-90"
      >
        {muted ? <VolumeX className="h-5 w-5 text-[#8b6508]" /> : <Volume2 className="h-5 w-5 text-[#8b6508]" />}
      </button>

      <button
        onClick={finish}
        className="absolute top-4 left-4 z-20 rounded-full bg-white/90 border border-[#d4af37]/40 px-3 py-2 text-[11px] font-bold text-[#8b6508] shadow-md active:scale-95"
      >
        Skip
      </button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,243,200,0.55) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}
