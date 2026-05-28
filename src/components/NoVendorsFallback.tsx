import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Gift, Play, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadiusSlider } from "@/components/RadiusSlider";

type Props = {
  leadId: string;
  category: string | null;
  /** Called after a successful "Try again" expansion — overlay should reset and re-poll. */
  onRetry: () => void;
};

/**
 * Shown inside FindingVendorOverlay when all rings (0→10 km) returned 0 vendors.
 * Provides: promo video + "Try again" (radius / city expansion) + "Referral".
 */
export function NoVendorsFallback({ leadId, category, onRetry }: Props) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"radius" | "city" | "area">("radius");
  const [radius, setRadius] = useState(20);
  const [cityText, setCityText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitExpansion() {
    setSubmitting(true);
    try {
      const patch: Record<string, unknown> = {};
      if (mode === "radius") {
        patch.search_radius_km = radius;
      } else {
        // City/area expansion = unlimited radius + appended note
        patch.search_radius_km = 0;
        if (cityText.trim()) {
          patch.note = `[Expand:${mode}] ${cityText.trim()}`;
        }
      }
      const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
      if (error) throw error;
      // Re-broadcast immediately, starting at outer-expansion ring (>10km)
      await supabase.rpc("broadcast_next_lead_batch", {
        _lead_id: leadId,
        _batch_size: 5,
        _ring_index: 4,
      });
      toast.success("Search expand kar di — vendors dhoondh rahe hain");
      setSheetOpen(false);
      onRetry();
    } catch (e) {
      console.error(e);
      toast.error("Expand fail hua, dobara try karein");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pt-2 pb-3 overflow-y-auto">
      {/* Promo video */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 via-white to-amber-50 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow">
        <video
          src="/promo-vendors.mp4"
          poster="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=70"
          controls
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
          Karo Online
        </div>
      </div>

      <p className="mt-3 text-center text-[12px] text-[color:oklch(0.40_0.05_85)] leading-snug px-2">
        Aapke {category ?? "service"} ke liye 10 km mein abhi koi vendor available nahi hai.<br />
        Search expand karein ya kisi friend ko refer karein.
      </p>

      <div className="flex-1" />

      {/* Bottom CTA row */}
      <div className="mt-3 rounded-2xl bg-gradient-to-r from-[#fff8dc] via-white to-[#fef3c7] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.4)] p-1.5 flex items-stretch gap-1.5">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-amber-50 active:scale-[0.98] transition-all"
        >
          <MapPin className="h-4 w-4 text-amber-700" strokeWidth={2.4} />
          <div className="text-left">
            <p className="font-display text-[13px] font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">Try | Again</p>
            <p className="text-[9px] text-[color:oklch(0.50_0.06_85)] leading-tight">Find more</p>
          </div>
        </button>
        <div className="w-px bg-[color:oklch(0.78_0.14_82/0.4)]" />
        <button
          onClick={() => navigate({ to: "/referral" })}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-amber-50 active:scale-[0.98] transition-all"
        >
          <p className="font-display text-[13px] font-bold text-[color:oklch(0.25_0.05_85)]">Reffrel</p>
          <Gift className="h-4 w-4 text-amber-700" strokeWidth={2.4} />
        </button>
      </div>

      {/* Expansion sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-20"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 z-30 bg-white rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] p-4 pb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-base font-bold text-[color:oklch(0.25_0.05_85)]">
                  Aage kaise dhundein?
                </h3>
                <button onClick={() => setSheetOpen(false)} className="h-7 w-7 grid place-items-center rounded-full bg-slate-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Mode tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl mb-3">
                {(["radius", "city", "area"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-2 rounded-lg text-[12px] font-display font-bold capitalize transition-all ${
                      mode === m
                        ? "bg-white text-[color:oklch(0.30_0.05_85)] shadow"
                        : "text-[color:oklch(0.50_0.06_85)]"
                    }`}
                  >
                    {m === "radius" ? "Radius wise" : m === "city" ? "City wise" : "Area wise"}
                  </button>
                ))}
              </div>

              {mode === "radius" ? (
                <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-3 py-3">
                  <RadiusSlider value={radius} onChange={setRadius} label="Search within" />
                  <p className="text-[10px] text-[color:oklch(0.50_0.06_85)] mt-2">
                    10 km mein kuch nahi mila — radius badhakar dobara try karein.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-3 py-3">
                  <label className="text-[11px] font-display font-bold text-[color:oklch(0.30_0.05_85)] uppercase tracking-wider">
                    {mode === "city" ? "City name" : "Area / locality"}
                  </label>
                  <input
                    value={cityText}
                    onChange={(e) => setCityText(e.target.value)}
                    placeholder={mode === "city" ? "e.g. Delhi" : "e.g. Connaught Place"}
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <button
                onClick={submitExpansion}
                disabled={submitting || (mode !== "radius" && !cityText.trim())}
                className="w-full mt-4 h-12 rounded-2xl font-display font-bold text-white bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#d97706] shadow-[0_6px_18px_-6px_rgba(217,119,6,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Dhoondh rahe hain…" : "Search expand karein"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
