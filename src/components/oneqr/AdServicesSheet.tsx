import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, SlidersHorizontal, Star, ShieldCheck, Globe, Sparkles, Megaphone, Loader2,
} from "lucide-react";

type Service = { name: string; scope: string; rating: string };
type AdCategory = { key: string; name: string; emoji: string; services: Service[] };

export const AD_CATEGORIES: AdCategory[] = [
  {
    key: "meta",
    name: "Meta Ads (Facebook Ad)",
    emoji: "📣",
    services: [
      { name: "Facebook Page Promotion", scope: "Worldwide", rating: "4.8" },
      { name: "Facebook Post Engagement", scope: "Worldwide", rating: "4.8" },
      { name: "Facebook Lead Generation", scope: "Worldwide", rating: "4.7" },
      { name: "Facebook Conversions Ads", scope: "Worldwide", rating: "4.9" },
    ],
  },
  {
    key: "instagram",
    name: "Instagram Ads",
    emoji: "📸",
    services: [
      { name: "Instagram Reels Promotion", scope: "Worldwide", rating: "4.9" },
      { name: "Instagram Profile Growth", scope: "India", rating: "4.7" },
      { name: "Instagram Story Ads", scope: "Worldwide", rating: "4.8" },
    ],
  },
  {
    key: "google",
    name: "Google Ads",
    emoji: "🔍",
    services: [
      { name: "Google Search Ads", scope: "India", rating: "4.8" },
      { name: "Google Maps / Local Ads", scope: "Nearby", rating: "4.9" },
      { name: "YouTube Video Ads", scope: "Worldwide", rating: "4.7" },
    ],
  },
  {
    key: "offline",
    name: "Offline Ads",
    emoji: "📰",
    services: [
      { name: "Newspaper Insert", scope: "City", rating: "4.6" },
      { name: "Hoarding / Banner", scope: "Local", rating: "4.7" },
      { name: "Pamphlet Distribution", scope: "Nearby", rating: "4.5" },
    ],
  },
  {
    key: "karo",
    name: "Karo Nearby Ads",
    emoji: "📍",
    services: [
      { name: "Nearby Sponsored Card", scope: "0–5 km", rating: "4.9" },
      { name: "QR Landing Boost", scope: "0–2 km", rating: "4.8" },
    ],
  },
];

/** Ad Services bottom sheet — category tiles, chip filter and campaign requests. */
export function AdServicesSheet({
  open, onOpenChange, projectTitle, onRequest,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectTitle: string;
  onRequest: (payload: { category: string; service: string; scope: string }) => Promise<void> | void;
}) {
  const [cat, setCat] = useState(AD_CATEGORIES[0].key);
  const [chip, setChip] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [scope, setScope] = useState<string>("any");
  const [busy, setBusy] = useState<string | null>(null);

  const active = AD_CATEGORIES.find((c) => c.key === cat) ?? AD_CATEGORIES[0];

  const visible = useMemo(() => {
    const cats = chip === "all" ? [active] : AD_CATEGORIES.filter((c) => c.key === chip);
    return cats.flatMap((c) =>
      c.services
        .filter((s) => scope === "any" || s.scope.toLowerCase() === scope)
        .map((s) => ({ ...s, category: c.name, emoji: c.emoji })),
    );
  }, [active, chip, scope]);

  const scopes = useMemo(
    () => ["any", ...new Set(AD_CATEGORIES.flatMap((c) => c.services.map((s) => s.scope.toLowerCase())))],
    [],
  );

  const request = async (s: { name: string; scope: string; category: string }) => {
    setBusy(s.name);
    await onRequest({ category: s.category, service: s.name, scope: s.scope });
    setBusy(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[141] max-h-[92vh] rounded-t-[32px] bg-gradient-to-b from-amber-50 to-white border-t border-amber-200 overflow-hidden flex flex-col"
          >
            <div className="pt-2.5 grid place-items-center">
              <span className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
              <span className="h-11 w-11 rounded-full bg-amber-100 grid place-items-center text-xl">📣</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-[18px] text-slate-900">Ad Services</h2>
                <p className="text-[11px] text-slate-500 truncate">for {projectTitle}</p>
              </div>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="h-10 px-3 rounded-full bg-white border border-amber-200 text-[12px] font-bold text-slate-700 inline-flex items-center gap-1.5 active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4 text-amber-600" /> Filter
              </button>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close ad services"
                className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 grid place-items-center active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {filterOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 overflow-hidden">
                <div className="rounded-2xl border border-amber-200 bg-white p-3">
                  <p className="text-[11px] font-bold text-slate-700 mb-2">Reach area</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scopes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setScope(s)}
                        className={`h-8 px-3 rounded-full text-[11px] font-bold capitalize ${
                          scope === s ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Category tiles */}
            <div className="mt-2 flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
              {AD_CATEGORIES.map((c) => (
                <motion.button
                  key={c.key}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setCat(c.key); setChip("all"); }}
                  className={`shrink-0 w-[104px] rounded-2xl border bg-white px-2 pt-3 pb-2.5 text-center ${
                    cat === c.key ? "border-orange-400 ring-2 ring-orange-200" : "border-amber-200"
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">{c.name}</p>
                </motion.button>
              ))}
            </div>

            {/* Sub-category chips */}
            <div className="mt-2.5 flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1">
              {["all", ...AD_CATEGORIES.map((c) => c.key)].map((k) => {
                const label = k === "all" ? "All" : AD_CATEGORIES.find((c) => c.key === k)!.name;
                const emoji = k === "all" ? "" : AD_CATEGORIES.find((c) => c.key === k)!.emoji;
                return (
                  <button
                    key={k}
                    onClick={() => setChip(k)}
                    className={`shrink-0 h-10 px-4 rounded-full text-[12px] font-bold inline-flex items-center gap-1.5 ${
                      chip === k ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : "bg-white border border-amber-200 text-slate-700"
                    }`}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                );
              })}
            </div>

            <p className="px-4 mt-3 text-[11px] font-bold text-slate-500">
              {chip === "all" ? `${active.name} services` : "Filtered services"}
            </p>

            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8 space-y-3">
              {visible.map((s) => (
                <article key={s.category + s.name} className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                  <div className="p-3 flex items-center gap-3">
                    <span className="h-14 w-14 shrink-0 rounded-xl bg-amber-50 grid place-items-center text-2xl">{s.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-[14px] text-slate-900 leading-tight">{s.name}</p>
                      <div className="mt-1 flex items-center gap-2.5 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {s.rating}
                        </span>
                        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Verified</span>
                        <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3 text-orange-500" /> {s.scope}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-t border-amber-100">
                    <button
                      onClick={() => setFilterOpen(true)}
                      className="h-11 text-[12px] font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 active:bg-amber-50"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" /> Choice filter
                    </button>
                    <button
                      onClick={() => request(s)}
                      disabled={busy === s.name}
                      className="h-11 border-l border-amber-100 text-[12px] font-extrabold text-emerald-600 inline-flex items-center justify-center gap-1.5 active:bg-emerald-50"
                    >
                      {busy === s.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Create Campaign
                    </button>
                  </div>
                </article>
              ))}
              {visible.length === 0 && (
                <p className="text-xs text-slate-500 rounded-2xl border border-black/10 bg-white px-3 py-4 inline-flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-amber-600" /> Is filter me koi service nahi mili.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
