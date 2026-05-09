import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";

const BANNERS = [
  { id: 1, bg: "from-amber-400 to-orange-500", emoji: "🎁", title: "10% off on AC service", sub: "Today only" },
  { id: 2, bg: "from-emerald-400 to-teal-500", emoji: "⚡", title: "Same-day repair", sub: "Quick vendors near you" },
  { id: 3, bg: "from-violet-400 to-fuchsia-500", emoji: "⭐", title: "Top-rated vendor", sub: "5★ verified" },
];

/**
 * Compact top media zone (Option D):
 * - Tiny live-tracking map strip (left)
 * - Auto-sliding promo banners (right) — 3s interval
 */
export function ChatTopMedia({ vendorName }: { vendorName: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((n) => (n + 1) % BANNERS.length), 3000);
    return () => clearInterval(t);
  }, []);
  const b = BANNERS[idx];

  return (
    <div className="flex-shrink-0 px-3 pt-2 pb-1.5 flex gap-2">
      {/* Map (small) */}
      <div className="relative h-[78px] w-[110px] rounded-2xl overflow-hidden border border-emerald-200 shadow-sm flex-shrink-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 40%, oklch(0.94 0.05 150) 0%, oklch(0.88 0.06 150) 60%, oklch(0.82 0.06 150) 100%)",
          }}
        />
        {/* faux roads */}
        <svg className="absolute inset-0" viewBox="0 0 110 78" preserveAspectRatio="none">
          <path d="M0,55 Q30,40 60,50 T110,30" stroke="white" strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M20,0 L40,78" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
        </svg>
        {/* vendor pin */}
        <motion.span
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white"
        >
          <MapPin className="h-3 w-3" />
        </motion.span>
        <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur text-[8.5px] font-bold text-emerald-700 flex items-center gap-1">
          <Navigation className="h-2.5 w-2.5" /> 1.2 km · 6 min
        </div>
      </div>

      {/* Banners */}
      <div className="relative h-[78px] flex-1 rounded-2xl overflow-hidden shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-br ${b.bg} px-3 py-2 flex items-center gap-2.5`}
          >
            <span className="text-2xl drop-shadow">{b.emoji}</span>
            <div className="flex-1 min-w-0 text-white">
              <p className="text-xs font-bold leading-tight truncate">{b.title}</p>
              <p className="text-[10px] opacity-90 truncate">{b.sub}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-1 right-2 flex gap-0.5">
          {BANNERS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-3 bg-white" : "w-1 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
