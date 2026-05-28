import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Radar, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playPing } from "@/lib/lead-sound";

type AcceptedPreview = {
  vendor_id: string;
  business_name: string | null;
  owner_name: string | null;
  avatar_url: string | null;
};

const TOTAL_MS = 60_000; // overall radar window (60s — blueprint)
const PROCEED_UNLOCK_MS = 30_000; // "Proceed" button enables after 30s
const TARGET_VENDORS = 5;
const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70";

type Props = {
  open: boolean;
  category: string | null;
  categoryImage?: string | null;
  leadId: string | null;
  onComplete: () => void;
  onClose: () => void;
};

export function FindingVendorOverlay({ open, category, categoryImage, leadId, onComplete, onClose }: Props) {
  const [vendors, setVendors] = useState<AcceptedPreview[]>([]);
  const [done, setDone] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const completedRef = useRef(false);
  const seenVendorIdsRef = useRef<Set<string>>(new Set());

  // Hide global BottomActionBar
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) document.body.dataset.finderOpen = "1";
    else delete document.body.dataset.finderOpen;
    return () => {
      delete document.body.dataset.finderOpen;
    };
  }, [open]);

  // Load + realtime accepted vendors
  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;
    completedRef.current = false;
    seenVendorIdsRef.current = new Set();
    setDone(false);
    setVendors([]);

    const load = async () => {
      const { data } = await supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId });
      if (!alive) return;
      const list = (data ?? []) as AcceptedPreview[];
      const nextIds = new Set(list.map((v) => v.vendor_id));
      if (seenVendorIdsRef.current.size > 0 && list.some((v) => !seenVendorIdsRef.current.has(v.vendor_id))) {
        playPing("message");
      }
      seenVendorIdsRef.current = nextIds;
      setVendors(list);
    };
    load();

    const ch = supabase
      .channel(`finder-accept-${leadId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_notifications", filter: `lead_id=eq.${leadId}` },
        (p) => { if ((p.new as any)?.status === "accepted") load(); },
      )
      .subscribe();
    const poll = setInterval(load, 2500);

    return () => {
      alive = false;
      clearInterval(poll);
      supabase.removeChannel(ch);
    };
  }, [open, leadId]);

  // Completion timer (max window) + early finish on TARGET_VENDORS
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => finish(), TOTAL_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && vendors.length >= TARGET_VENDORS) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors.length, open]);

  function finish() {
    if (completedRef.current) return;
    completedRef.current = true;
    setDone(true);
    // brief celebration before transitioning to full vendor list
    setTimeout(() => onComplete(), 900);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] flex items-end justify-center pointer-events-none">
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/15 to-transparent pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md bg-gradient-to-b from-white via-[#fffaf0] to-[#fef3c7] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] pointer-events-auto pb-[env(safe-area-inset-bottom)] flex flex-col overflow-hidden"
        style={{ height: "90vh", maxHeight: "90vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        {/* Header */}
        <div className="px-4 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] uppercase tracking-[0.25em] font-display font-bold text-[color:oklch(0.45_0.10_82)]">
            ✦ {done ? "Found" : "Finding"} ✦
          </span>
          <span className="text-[11px] font-display italic text-[color:oklch(0.45_0.08_85)]">
            Find vendor · live broadcast
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-3.5 w-3.5 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        {/* Title strip */}
        <div className="mx-4 rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2.5 flex items-center gap-2.5 shadow-gold-glow flex-shrink-0">
          <div className="h-12 w-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.5)] flex-shrink-0">
            {categoryImage ? (
              <img src={categoryImage} alt={category ?? "service"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center">
                <Sparkles className="h-5 w-5 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.4} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-[color:oklch(0.25_0.05_85)] leading-tight truncate">
              {category ?? "Service"} | service vendor
            </h3>
            <p className="text-[10px] text-[color:oklch(0.50_0.08_85)]">
              {done ? `${vendors.length} vendor${vendors.length === 1 ? "" : "s"} ready` : "Broadcasting your request to nearby vendors…"}
            </p>
          </div>
          <div className="relative h-10 w-10 grid place-items-center flex-shrink-0">
            {!done && [0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-[color:oklch(0.78_0.14_82/0.5)]"
                animate={{ scale: [0.7, 1.3], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
              />
            ))}
            <motion.div
              animate={done ? { scale: 1 } : { scale: [1, 1.05, 1] }}
              transition={done ? undefined : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className={`relative h-7 w-7 rounded-full border-2 border-white shadow grid place-items-center ${done ? "bg-gradient-to-br from-emerald-400 to-emerald-600" : "bg-gradient-to-br from-[#fff8dc] to-[#fbbf24]"}`}
            >
              {done ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />}
            </motion.div>
          </div>
        </div>

        {/* MAIN — radar (animates upward as vendors arrive) + faded vendor stack */}
        <div className="flex-1 min-h-0 px-5 pt-3 pb-2 relative overflow-hidden">
          {/* Radar — moves up and shrinks slightly as vendors fill the bottom */}
          <motion.div
            initial={{ y: 0, scale: 1 }}
            animate={done
              ? { y: -10, scale: 0.9 }
              : { y: -Math.min(vendors.length, TARGET_VENDORS) * 14, scale: 1 - Math.min(vendors.length, TARGET_VENDORS) * 0.02 }
            }
            transition={{ type: "spring", damping: 22, stiffness: 180 }}
            className="relative h-[260px] w-full max-w-[260px] mx-auto grid place-items-center"
          >
            {/* Radar rings */}
            {!done && [0, 0.5, 1, 1.5].map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="absolute inset-0 m-auto rounded-full border-2"
                style={{
                  borderColor: "oklch(0.78 0.14 82 / 0.55)",
                  animation: `finder-radar 2.4s cubic-bezier(0.22,1,0.36,1) ${delay}s infinite`,
                  width: "100%",
                  height: "100%",
                }}
              />
            ))}

            {[0.3, 0.55, 0.8].map((s) => (
              <span
                key={s}
                aria-hidden
                className="absolute rounded-full border border-dashed border-[color:oklch(0.78_0.14_82/0.35)]"
                style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
              />
            ))}

            {!done && (
              <span
                aria-hidden
                className="absolute inset-0 m-auto rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, oklch(0.78 0.14 82 / 0.45) 35deg, transparent 80deg, transparent 360deg)",
                  animation: "finder-orbit 2.6s linear infinite",
                  maskImage: "radial-gradient(circle, black 60%, transparent 70%)",
                  WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 70%)",
                }}
              />
            )}

            {/* Center badge — radar → green check */}
            <motion.div
              animate={done ? { scale: [1, 1.15, 1] } : { scale: [1, 1.06, 1] }}
              transition={{ duration: done ? 0.7 : 1.6, repeat: done ? 0 : Infinity, ease: "easeInOut" }}
              className={`relative h-20 w-20 rounded-full border-4 border-white shadow-[0_8px_24px_-4px_rgba(212,175,55,0.7)] grid place-items-center z-10 ${
                done
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700"
                  : "bg-gradient-to-br from-[#fff8dc] via-[#fbbf24] to-[#d97706]"
              }`}
            >
              {done ? (
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              ) : (
                <Radar className="h-9 w-9 text-white" strokeWidth={2.2} />
              )}
            </motion.div>
          </motion.div>

          {/* Status pill */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={done ? "done" : "searching"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="px-3 py-1.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow font-display text-[11px] font-bold text-[color:oklch(0.30_0.05_85)] whitespace-nowrap"
              >
                {done
                  ? `✓ Found ${vendors.length} vendor${vendors.length === 1 ? "" : "s"}`
                  : `Finding nearby vendors… ${vendors.length}/${TARGET_VENDORS}`}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Live vendor cards rising from bottom (visible, not clickable) */}
          <div className="absolute left-0 right-0 bottom-0 px-3 pb-2 space-y-1.5 pointer-events-none">
            {vendors.length > 0 && !done && (
              <p className="text-center text-[10px] font-display font-bold text-[color:oklch(0.42_0.10_82)] mb-1">
                ✦ {vendors.length} vendor{vendors.length === 1 ? "" : "s"} ne abhi accept kiya · aur aa rahe hain…
              </p>
            )}
            <AnimatePresence initial={false}>
              {vendors.slice(0, TARGET_VENDORS).map((v, i) => (
                <motion.div
                  key={v.vendor_id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{
                    opacity: done ? 1 : 0.92,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ type: "spring", damping: 22, stiffness: 220, delay: i * 0.05 }}
                  className="rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.55)] shadow-[0_4px_14px_-4px_rgba(212,175,55,0.35)] px-2.5 py-1.5 flex items-center gap-2"
                >
                  <img
                    src={v.avatar_url || FALLBACK_AVATAR}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[12px] font-bold text-[color:oklch(0.25_0.05_85)] leading-tight truncate">
                      {v.business_name || v.owner_name || "Vendor"}
                    </p>
                    <p className="text-[9px] text-emerald-700 font-semibold truncate">
                      ✓ {done ? "Ready to connect" : "Just accepted"}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold flex-shrink-0">
                    ✓
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-shrink-0 h-3" />
      </motion.div>
    </div>
  );
}
