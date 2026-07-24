import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Radar, Check, ArrowRight, Star, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { playPing } from "@/lib/lead-sound";
import { NoVendorsFallback } from "@/components/NoVendorsFallback";
import { LeadChatThread, type LeadChatPeer } from "@/components/LeadChatThread";
import { LeadOrderStatusPanel } from "@/components/LeadOrderStatusPanel";
import { setActiveInquiry } from "@/hooks/use-active-inquiry";

type AcceptedPreview = {
  vendor_id: string;
  business_name: string | null;
  owner_name: string | null;
  avatar_url: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  distance_km?: number | null;
  vendor_note?: string | null;
  quoted_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  cover_image_url?: string | null;
};

const TOTAL_MS = 60_000; // overall radar window (60s — blueprint)
const PROCEED_UNLOCK_MS = 30_000; // "Proceed" button enables after 30s
const TARGET_VENDORS = 5;
function money(v?: number | null) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

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
  const [currentRing, setCurrentRing] = useState(0); // 0..3 = standard rings; 4 = expanded
  const [noVendorsFinal, setNoVendorsFinal] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [approvedVendorId, setApprovedVendorId] = useState<string | null>(null);
  const [approvingVendorId, setApprovingVendorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "status">("chat");
  const completedRef = useRef(false);
  const seenVendorIdsRef = useRef<Set<string>>(new Set());
  const ringLoopKey = useRef(0); // bumped on retry to cancel old loops

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
    setActiveVendorId(null);
    setApprovedVendorId(null);
    setActiveTab("chat");
    setCurrentRing(0);
    setNoVendorsFinal(false);

    const load = async () => {
      const [{ data }, { data: leadRow }] = await Promise.all([
        supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId }),
        supabase
          .from("leads")
          .select("customer_approved_vendor_id")
          .eq("id", leadId)
          .maybeSingle(),
      ]);
      if (!alive) return;
      const list = (data ?? []) as AcceptedPreview[];
      const nextIds = new Set(list.map((v) => v.vendor_id));
      if (seenVendorIdsRef.current.size > 0 && list.some((v) => !seenVendorIdsRef.current.has(v.vendor_id))) {
        playPing("message");
      }
      seenVendorIdsRef.current = nextIds;
      setVendors(list);
      const approvedId = (leadRow as { customer_approved_vendor_id?: string | null } | null)?.customer_approved_vendor_id ?? null;
      if (approvedId) {
        completedRef.current = true;
        setDone(true);
        setApprovedVendorId(approvedId);
        setActiveVendorId(approvedId);
      }
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

  // Phase 3 — Sequential ring loop: 0→1, 1→2, 2→5, 5→10 km.
  // quick.tsx already fires ring 0 at lead-create. We continue from ring 1.
  // If a ring is empty we advance immediately; if it has vendors we wait 10s.
  // After ring 3 finishes with 0 total vendors → trigger NoVendorsFallback.
  useEffect(() => {
    if (!open || !leadId) return;
    const myKey = ++ringLoopKey.current;
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    (async () => {
      // Give ring 0 (from quick.tsx) a head-start
      await sleep(8_000);
      for (let ring = 1; ring <= 3; ring++) {
        if (cancelled || completedRef.current || myKey !== ringLoopKey.current) return;
        setCurrentRing(ring);
        const { data } = await supabase.rpc("broadcast_next_lead_batch", {
          _lead_id: leadId,
          _batch_size: 5,
          _ring_index: ring,
        });
        const res = data as { count?: number; ring_empty?: boolean; vendor_ids?: string[] } | null;
        const ids = res?.vendor_ids ?? [];
        if (ids.length > 0) {
          import("@/lib/push.functions").then(({ sendLeadPushToVendor }) => {
            ids.forEach((vid) =>
              sendLeadPushToVendor({ data: { vendor_id: vid, lead_id: leadId } }).catch(() => {}),
            );
          });
          await sleep(10_000);
        } else {
          // ring empty — short pause then next ring
          await sleep(1_500);
        }
      }
      // All standard rings done.
      if (!cancelled && myKey === ringLoopKey.current && !completedRef.current) {
        setCurrentRing(4);
        // Give realtime a beat to deliver any final accepts
        await sleep(2_500);
        if (seenVendorIdsRef.current.size === 0) {
          setNoVendorsFinal(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [open, leadId]);

  // Completion timer (max window) + tick elapsed seconds for Proceed unlock
  useEffect(() => {
    if (!open) return;
    setElapsedMs(0);
    const startedAt = Date.now();
    const tick = setInterval(() => setElapsedMs(Date.now() - startedAt), 500);
    const t = setTimeout(() => finish(false), TOTAL_MS);
    return () => { clearTimeout(t); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  useEffect(() => {
    if (open && vendors.length >= TARGET_VENDORS) finish(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors.length, open]);

  useEffect(() => {
    if (!open || vendors.length === 0) return;
    if (approvedVendorId && vendors.some((v) => v.vendor_id === approvedVendorId)) {
      if (activeVendorId !== approvedVendorId) setActiveVendorId(approvedVendorId);
      return;
    }
    if (activeVendorId && vendors.some((v) => v.vendor_id === activeVendorId)) return;
    const first = [...vendors].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))[0];
    setActiveVendorId(first.vendor_id);
  }, [activeVendorId, approvedVendorId, open, vendors]);

  const approvedVendor = useMemo(
    () => vendors.find((v) => v.vendor_id === approvedVendorId) ?? null,
    [approvedVendorId, vendors],
  );

  const hasVendors = vendors.length > 0;

  const visibleVendors = useMemo(
    () => (approvedVendorId ? vendors.filter((v) => v.vendor_id === approvedVendorId) : vendors),
    [approvedVendorId, vendors],
  );

  const approveVendor = async (vendor: AcceptedPreview) => {
    if (!leadId || approvedVendorId || approvingVendorId) return;
    setApprovingVendorId(vendor.vendor_id);
    const { data, error } = await supabase.rpc("customer_approve_vendor", {
      _lead_id: leadId,
      _vendor_id: vendor.vendor_id,
    });
    setApprovingVendorId(null);
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      toast.error("Approve fail hua, dobara try karein");
      return;
    }
    completedRef.current = true;
    setDone(true);
    setApprovedVendorId(vendor.vendor_id);
    setActiveVendorId(vendor.vendor_id);
    setActiveTab("chat");
    setActiveInquiry({
      leadId,
      category: category ?? "Service",
      productImage: categoryImage ?? null,
      startedAt: Date.now(),
      vendorCount: vendors.length,
      approved: {
        vendor_id: vendor.vendor_id,
        name: vendor.business_name || vendor.owner_name || "Vendor",
        avatar_url: vendor.avatar_url,
        phone: vendor.phone || vendor.whatsapp || null,
        quoted_price: vendor.quoted_price ?? null,
      },
      open: false,
    });
    toast.success(`${vendor.business_name || vendor.owner_name || "Vendor"} approved — chat opened`);
  };

  function finish(transitionToHub = true) {
    if (completedRef.current) return;
    completedRef.current = true;
    setDone(true);
    if (transitionToHub) {
      setTimeout(() => onComplete(), 900);
    }
  }

  const activeVendor = useMemo(
    () => approvedVendor ?? vendors.find((v) => v.vendor_id === activeVendorId) ?? null,
    [activeVendorId, approvedVendor, vendors],
  );

  const peer: LeadChatPeer | null = activeVendor
    ? {
        id: activeVendor.vendor_id,
        name: activeVendor.business_name || activeVendor.owner_name || "Vendor",
        avatar_url: activeVendor.avatar_url,
        phone: activeVendor.phone || activeVendor.whatsapp,
        subtitle: activeVendor.business_name && activeVendor.owner_name ? activeVendor.owner_name : "Verified nearby vendor",
      }
    : null;

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
        className={`relative w-full max-w-md bg-gradient-to-b from-white via-[#fffaf0] to-[#fef3c7] shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] pointer-events-auto pb-[env(safe-area-inset-bottom)] flex flex-col overflow-hidden ${hasVendors ? "rounded-t-xl" : "rounded-t-3xl"}`}
        style={{ height: hasVendors ? "100dvh" : "96dvh", maxHeight: hasVendors ? "100dvh" : "96dvh" }}
      >
        {/* Drag handle — only while searching */}
        {!hasVendors && (
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
          </div>
        )}

        {hasVendors ? (
          /* Compact top bar once chat is live */
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:oklch(0.88_0.05_82)] bg-white/90 backdrop-blur flex-shrink-0">
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90 flex-shrink-0"
            >
              <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
            </button>
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.5)] flex-shrink-0">
              {categoryImage ? (
                <img src={categoryImage} alt={category ?? "service"} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center">
                  <Sparkles className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" strokeWidth={2.4} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[13px] font-bold text-[color:oklch(0.25_0.05_85)] leading-tight truncate">
                {category ?? "Service"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.50_0.08_85)] truncate">
                {done ? `✓ ${vendors.length} vendor${vendors.length === 1 ? "" : "s"} ready` : `Finding vendors · ${vendors.length}/${TARGET_VENDORS}`}
              </p>
            </div>
            <motion.div
              animate={done ? { scale: 1 } : { scale: [1, 1.15, 1] }}
              transition={done ? undefined : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className={`h-6 w-6 rounded-full border-2 border-white shadow grid place-items-center flex-shrink-0 ${done ? "bg-gradient-to-br from-emerald-400 to-emerald-600" : "bg-gradient-to-br from-[#fff8dc] to-[#fbbf24]"}`}
            >
              {done ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : <Radar className="h-3 w-3 text-white" strokeWidth={2.4} />}
            </motion.div>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mx-4 mt-0.5 mb-1 h-1 rounded-full bg-[color:oklch(0.92_0.02_85)] overflow-hidden flex-shrink-0">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-emerald-500"
                initial={{ width: "5%" }}
                animate={{ width: done ? "100%" : `${Math.min(100, ((currentRing + 1) / 4) * 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
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
          </>
        )}


        {/* Title strip — only in searching state */}
        {!hasVendors && (
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
            <p className="text-[10px] text-[color:oklch(0.50_0.08_85)] truncate">
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
        )}


        {/* MAIN — fallback OR radar+vendor stack */}
        {noVendorsFinal && leadId ? (
          <NoVendorsFallback
            leadId={leadId}
            category={category}
            onRetry={() => {
              setNoVendorsFinal(false);
              setCurrentRing(0);
              // re-run the ring loop
              ringLoopKey.current++;
            }}
          />
        ) : (
        <div className="flex-1 min-h-0 px-3 pt-2 pb-2 flex flex-col gap-2 overflow-hidden">
          {/* Radar stays on top; chat opens below as soon as the first real vendor accepts. */}
          <div className={`relative flex-shrink-0 ${approvedVendorId ? "h-[38px]" : vendors.length > 0 ? "h-[82px]" : "h-[300px]"}`}>
            <motion.div
              initial={{ scale: 1 }}
              animate={approvedVendorId ? { scale: 0.18, opacity: 0.35 } : done ? { scale: 0.42 } : { scale: vendors.length > 0 ? 0.36 : 1 }}
              transition={{ type: "spring", damping: 22, stiffness: 180 }}
              className="relative h-[260px] w-full max-w-[260px] mx-auto grid place-items-center origin-top"
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={done ? "done" : "searching"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="px-3 py-1.5 rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow font-display text-[11px] font-bold text-[color:oklch(0.30_0.05_85)] whitespace-nowrap"
              >
                {done
                  ? `✓ Completed · ${vendors.length} vendor${vendors.length === 1 ? "" : "s"} ready`
                  : `Finding nearby vendors… ${vendors.length}/${TARGET_VENDORS}`}
              </motion.div>
            </AnimatePresence>
            </div>
          </div>

          {vendors.length > 0 ? (
            <>
              <div className={`rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.45)] px-3 ${approvedVendorId ? "py-1.5" : "py-2"} shadow-[0_4px_14px_-6px_rgba(212,175,55,0.45)] flex-shrink-0`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-[11px] font-display font-bold text-[color:oklch(0.30_0.05_85)]">
                    {approvedVendorId ? "Approved vendor pinned" : done ? "Completed — vendors ready" : "Vendors live aa rahe hain"}
                  </p>
                  {activeVendor?.phone || activeVendor?.whatsapp ? (
                    <a
                      href={`tel:${activeVendor.phone || activeVendor.whatsapp}`}
                      className="h-7 px-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1 active:scale-95"
                    >
                      <Phone className="h-3 w-3" /> Call
                    </a>
                  ) : null}
                </div>
                {approvedVendorId && activeVendor ? (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-2 py-1.5 shadow-sm"
                  >
                    {activeVendor.avatar_url ? (
                      <img src={activeVendor.avatar_url} alt={activeVendor.business_name || activeVendor.owner_name || "Vendor"} className="h-11 w-11 rounded-full object-cover border-2 border-white shadow" />
                    ) : (
                      <span className="h-11 w-11 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] text-white grid place-items-center border-2 border-white shadow text-xs font-display font-bold">
                        {initials(activeVendor.business_name || activeVendor.owner_name || "Vendor")}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-900 truncate">{activeVendor.business_name || activeVendor.owner_name || "Vendor"}</p>
                      <p className="text-[10px] text-slate-600 truncate">
                        Approved · {activeVendor.distance_km != null ? `${activeVendor.distance_km.toFixed(1)} km` : "Matched"}
                        {(activeVendor.quoted_price ?? activeVendor.price_min) != null ? ` · ${money(activeVendor.quoted_price ?? activeVendor.price_min)}` : ""}
                      </p>
                    </div>
                    <span className="h-7 px-2 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Approved
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x pb-0.5">
                    <AnimatePresence initial={false}>
                      {visibleVendors.map((v, i) => {
                        const name = v.business_name || v.owner_name || "Vendor";
                        const active = v.vendor_id === activeVendorId;
                        const approved = v.vendor_id === approvedVendorId;
                        const approving = v.vendor_id === approvingVendorId;
                        const price = v.quoted_price ?? v.price_min;
                        return (
                          <motion.div
                            key={v.vendor_id}
                            layout
                            initial={{ opacity: 0, y: 16, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -16, scale: 0.84 }}
                            transition={{ type: "spring", damping: 22, stiffness: 220, delay: i * 0.03 }}
                            className={`snap-start flex-shrink-0 w-[104px] rounded-2xl border p-2 flex flex-col items-center text-center transition-all ${
                              approved
                                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 shadow-md"
                                : active
                                  ? "border-orange-400 bg-orange-50/70 ring-2 ring-orange-200 shadow-md"
                                  : "border-slate-200 bg-white"
                            }`}
                          >
                            <button type="button" onClick={() => setActiveVendorId(v.vendor_id)} className="w-full flex flex-col items-center text-center active:scale-95">
                              <div className="relative h-12 w-12">
                                {v.avatar_url ? (
                                  <img
                                    src={v.avatar_url}
                                    alt={name}
                                    className="h-12 w-12 rounded-full object-cover border-2 border-white shadow"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="h-12 w-12 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#d97706] text-white grid place-items-center border-2 border-white shadow text-[13px] font-display font-bold">
                                    {initials(name)}
                                  </span>
                                )}
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                              </div>
                              <p className="mt-1 text-[11px] font-bold text-slate-800 leading-tight line-clamp-1 w-full">
                                {name.split(" ").slice(0, 2).join(" ")}
                              </p>
                              <div className="mt-0.5 flex items-center gap-0.5 text-[10px] font-bold text-slate-700">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                {(v.rating ?? 4.8).toFixed(1)}
                              </div>
                              {price != null ? (
                                <p className="text-[10px] font-bold text-slate-900 leading-tight">{money(price)}</p>
                              ) : v.distance_km != null ? (
                                <p className="text-[10px] text-slate-500 leading-tight">{v.distance_km.toFixed(1)} km</p>
                              ) : (
                                <p className="text-[10px] text-emerald-600 font-semibold leading-tight">Matched</p>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={!!approvedVendorId || approving}
                              onClick={() => approveVendor(v)}
                              className={`mt-1 w-full h-6 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-80 ${
                                approved
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                              }`}
                            >
                              {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : approved ? <Check className="h-3 w-3" /> : null}
                              {approved ? "Approved" : "Approve"}
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {activeVendor && !approvedVendorId && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 flex-shrink-0">
                  <p className="text-[11px] text-slate-700 leading-tight truncate">
                    {approvedVendorId ? "Approved chat: " : "Chat open: "}<span className="font-bold text-slate-900">{activeVendor.business_name || activeVendor.owner_name}</span>
                    {activeVendor.distance_km != null ? <span> · {activeVendor.distance_km.toFixed(1)} km</span> : null}
                    {activeVendor.vendor_note ? <span> · {activeVendor.vendor_note}</span> : null}
                  </p>
                </div>
              )}

              {approvedVendorId && (
                <div className="flex-shrink-0 grid grid-cols-2 gap-2 rounded-2xl bg-white border border-amber-200 p-1 shadow-sm">
                  {(["chat", "status"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`h-9 rounded-xl text-[12px] font-display font-bold transition-all active:scale-95 ${
                        activeTab === tab
                          ? "bg-gradient-to-r from-[#fbbf24] to-[#d97706] text-white shadow"
                          : "text-slate-600"
                      }`}
                    >
                      {tab === "chat" ? "Chat" : "Order Status"}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.40)] bg-white shadow-[0_8px_24px_-14px_rgba(0,0,0,0.4)]">
                {leadId && peer && activeTab === "status" ? (
                  <LeadOrderStatusPanel
                    leadId={leadId}
                    vendor={peer}
                    category={category}
                    productImage={categoryImage}
                    onBackToChat={() => setActiveTab("chat")}
                  />
                ) : leadId && peer ? (
                  <LeadChatThread
                    key={`${leadId}-${peer.id}`}
                    leadId={leadId}
                    peer={peer}
                    myRole="customer"
                    onBack={onClose}
                    embedded
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-auto mb-3 rounded-2xl bg-white/85 border border-[color:oklch(0.78_0.14_82/0.40)] px-3 py-3 text-center flex-shrink-0">
              <p className="text-[12px] font-display font-bold text-[color:oklch(0.30_0.05_85)]">
                Real nearby vendor profiles yahin appear hongi.
              </p>
              <p className="text-[10px] text-[color:oklch(0.50_0.06_85)] mt-1">
                First vendor accept karte hi neeche chat automatically open ho jayegi.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Proceed-early CTA — unlocks after 30s OR as soon as ≥1 vendor accepts */}
        {!done && !noVendorsFinal && vendors.length === 0 && (() => {
          const unlocked = vendors.length >= 1 || elapsedMs >= PROCEED_UNLOCK_MS;
          const remainingSec = Math.max(0, Math.ceil((PROCEED_UNLOCK_MS - elapsedMs) / 1000));
          return (
            <div className="flex-shrink-0 px-4 pb-3 pt-1">
              <button
                onClick={() => { if (unlocked) finish(); }}
                disabled={!unlocked}
                className={`w-full h-11 rounded-2xl font-display text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                  unlocked
                    ? "bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-white shadow-[0_6px_18px_-6px_rgba(217,119,6,0.6)] active:scale-[0.98]"
                    : "bg-[color:oklch(0.92_0.02_85)] text-[color:oklch(0.55_0.04_85)] cursor-not-allowed"
                }`}
              >
                {unlocked ? (
                  <>
                    Continue to full vendor view
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </>
                ) : (
                  <>Proceed available in {remainingSec}s…</>
                )}
              </button>
              <p className="text-center text-[10px] text-[color:oklch(0.50_0.06_85)] mt-1.5">
                {unlocked
                  ? "Aage badhein — baaki vendors background mein search hote rahenge"
                  : "Best 5 vendors dhoondh rahe hain…"}
              </p>
            </div>
          );
        })()}
        <div className="flex-shrink-0 h-3" />
      </motion.div>
    </div>
  );
}
