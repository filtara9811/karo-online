import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, ExternalLink } from "lucide-react";
import { setOrderRating, gmbReviewUrl } from "@/lib/orders-store";

const MOODS = [
  { id: "angry", emoji: "😡", label: "Bad", color: "from-red-400 to-red-600", stars: 1 },
  { id: "neutral", emoji: "😐", label: "Okay", color: "from-amber-400 to-orange-500", stars: 3 },
  { id: "happy", emoji: "😊", label: "Good", color: "from-emerald-400 to-emerald-600", stars: 4 },
  { id: "love", emoji: "🤩", label: "Excellent", color: "from-fuchsia-400 to-pink-500", stars: 5 },
] as const;

type MoodId = typeof MOODS[number]["id"];

export function RatingSheet({
  orderId,
  vendorName,
  vendorAvatar,
  gmbPlaceId,
  onClose,
}: {
  orderId: string;
  vendorName: string;
  vendorAvatar: string;
  gmbPlaceId?: string | null;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<MoodId | null>(null);
  const [stars, setStars] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const selectedMood = MOODS.find((m) => m.id === mood);
  const reviewUrl = gmbReviewUrl(gmbPlaceId);

  const submit = () => {
    if (!mood || stars === 0) return;
    setOrderRating(orderId, mood, stars);
    setSubmitted(true);
    // Burst confetti / celebrate then auto-close after delay if no GMB action
    if (stars < 4 || !reviewUrl) {
      setTimeout(onClose, 1800);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed bottom-0 left-0 right-0 z-[90] bg-white rounded-t-3xl p-5 pb-8 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-4" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-gray-100 active:scale-90"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        {!submitted ? (
          <>
            <div className="flex flex-col items-center text-center">
              <img src={vendorAvatar} alt="" className="h-16 w-16 rounded-full border-4 border-amber-200 shadow-lg" />
              <h3 className="mt-3 font-display font-bold text-lg text-slate-800">
                Aapka kaam kaisa laga?
              </h3>
              <p className="text-xs text-slate-500">Rate {vendorName.split(" | ")[0]}'s service</p>
            </div>

            {/* Mood */}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {MOODS.map((m) => {
                const active = mood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMood(m.id); setStars(m.stars); }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition active:scale-95 ${
                      active
                        ? `bg-gradient-to-br ${m.color} border-transparent text-white shadow-lg scale-105`
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className={`text-[10px] font-bold ${active ? "text-white" : "text-slate-600"}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stars (visible after mood) */}
            <AnimatePresence>
              {mood && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-5"
                >
                  <p className="text-center text-xs font-semibold text-slate-600 mb-2">
                    Star rating
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setStars(n)}
                        className="active:scale-90 transition"
                        aria-label={`${n} stars`}
                      >
                        <Star
                          className={`h-9 w-9 transition ${
                            n <= stars
                              ? "fill-amber-400 text-amber-400 drop-shadow"
                              : "text-gray-300"
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={!mood || stars === 0}
              onClick={submit}
              className="mt-6 w-full h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-400 active:scale-95"
            >
              Submit Review
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-4xl shadow-2xl"
            >
              {selectedMood?.emoji}
            </motion.div>
            <h3 className="mt-4 font-display font-bold text-xl text-slate-800">
              Shukriya! 🙏
            </h3>
            <p className="text-xs text-slate-500 mt-1">Your feedback helps us improve.</p>

            {stars >= 4 && reviewUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"
              >
                <p className="text-xs font-bold text-blue-900 mb-2">
                  💙 Loved the service? Help {vendorName.split(" | ")[0]} grow
                </p>
                <p className="text-[11px] text-blue-700 mb-3">
                  Share your experience on Google — takes 30 seconds.
                </p>
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setTimeout(onClose, 800)}
                  className="w-full h-11 rounded-full bg-white border-2 border-blue-500 text-blue-600 font-bold text-sm shadow flex items-center justify-center gap-2 active:scale-95"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Review on Google
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={onClose}
                  className="mt-2 w-full text-[11px] font-semibold text-slate-500"
                >
                  Maybe later
                </button>
              </motion.div>
            )}
            {stars >= 4 && !reviewUrl && (
              <p className="mt-4 text-[11px] text-slate-400 italic">
                Vendor hasn't linked their Google profile yet.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}
