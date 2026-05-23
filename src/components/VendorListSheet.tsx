import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, MessageCircle, Loader2, MapPin, CheckCircle2, IndianRupee, BadgeCheck, Phone, ThumbsUp, ThumbsDown, ShieldCheck, ShieldAlert, Minimize2, Navigation, RotateCcw, Ban, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VendorChatSheet } from "@/components/VendorChatSheet";
import type { LeadChatPeer } from "@/components/LeadChatThread";
import { useActiveInquiry, setActiveInquiry, clearActiveInquiry } from "@/hooks/use-active-inquiry";
import { playPing } from "@/lib/lead-sound";

type AcceptedVendor = {
  vendor_id: string;
  business_name: string | null;
  owner_name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  total_reviews: number | null;
  distance_km: number | null;
  vendor_note?: string | null;
  quoted_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  mapping_notes?: string | null;
  cover_image_url?: string | null;
};

type Props = {
  open: boolean;
  category: string | null;
  productImage?: string | null;
  leadId: string | null;
  expectedVendors?: number;
  onTryAgain?: () => Promise<void> | void;
  onClose: () => void;
  /** Called when user explicitly minimizes (X / back) without approving. */
  onMinimize?: () => void;
};

const SEARCH_WINDOW_MS = 25_000;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

function formatMoney(value?: number | null) {
  if (value == null) return null;
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function VendorListSheet({ open, category: propCategory, productImage: propImage, leadId: propLeadId, expectedVendors = 0, onTryAgain, onClose, onMinimize }: Props) {
  const navigate = useNavigate();
  const { inquiry } = useActiveInquiry();
  // Prefer the active (open) inquiry's identity so the sheet stays in sync
  // when restored from the floating widget (multi-inquiry picker).
  const leadId = inquiry?.leadId ?? propLeadId;
  const category = inquiry?.category ?? propCategory;
  const productImage = inquiry?.productImage ?? propImage;
  const [vendors, setVendors] = useState<AcceptedVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [chatPeer, setChatPeer] = useState<LeadChatPeer | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const seenVendorIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.body.classList.add("ko-accepted-vendor-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("ko-accepted-vendor-open");
    };
  }, [open]);

  // Thin progress bar (search window timer)
  useEffect(() => {
    if (!open) return;
    const started = inquiry?.startedAt ?? Date.now();
    const tick = () => {
      const elapsed = Date.now() - started;
      setProgress(Math.min(100, (elapsed / SEARCH_WINDOW_MS) * 100));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [open, inquiry?.startedAt]);

  // Reset approved when sheet reopens with a different lead
  useEffect(() => {
    if (open) {
      setApprovedId(null);
      seenVendorIdsRef.current = new Set();
    }
  }, [open, leadId]);

  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId });
      if (!alive) return;
      setLoadError(error ? "Vendor list load nahi ho paayi. Dobara try ho raha hai…" : null);
      const list = (data ?? []) as AcceptedVendor[];
      const nextIds = new Set(list.map((v) => v.vendor_id));
      if (seenVendorIdsRef.current.size > 0 && list.some((v) => !seenVendorIdsRef.current.has(v.vendor_id))) {
        playPing("message");
      }
      seenVendorIdsRef.current = nextIds;
      setVendors(list);
      setLoading(false);
      // keep inquiry vendor count fresh
      if (inquiry && inquiry.leadId === leadId && inquiry.vendorCount !== list.length) {
        setActiveInquiry({ ...inquiry, vendorCount: list.length });
      }
      const { data: leadRow } = await supabase
        .from("leads")
        .select("customer_approved_vendor_id")
        .eq("id", leadId)
        .maybeSingle();
      if (alive && (leadRow as any)?.customer_approved_vendor_id) {
        setApprovedId((leadRow as any).customer_approved_vendor_id);
      }
    };
    setLoading(true);
    load();
    const ch = supabase
      .channel(`lead-accepted-${leadId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lead_notifications", filter: `lead_id=eq.${leadId}` },
        (payload) => { if ((payload.new as any)?.status === "accepted") load(); })
      .subscribe();
    const poll = setInterval(load, 4000);
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch); };
  }, [open, leadId]);

  const approvedVendor = useMemo(() => vendors.find((v) => v.vendor_id === approvedId) ?? null, [vendors, approvedId]);

  if (!open) return null;

  const openChat = (v: AcceptedVendor) => {
    setChatPeer({
      id: v.vendor_id,
      name: v.business_name || v.owner_name || "Vendor",
      avatar_url: v.avatar_url,
      phone: v.phone || v.whatsapp,
      subtitle: v.owner_name && v.business_name ? v.owner_name : "Verified vendor",
    });
  };

  const approveVendor = async (v: AcceptedVendor) => {
    if (!leadId || approvedId) return;
    setApproving(v.vendor_id);
    const { data, error } = await supabase.rpc("customer_approve_vendor", {
      _lead_id: leadId,
      _vendor_id: v.vendor_id,
    });
    setApproving(null);
    if (error || !(data as any)?.ok) {
      toast.error("Approve fail hua, dobara try karein");
      return;
    }
    setApprovedId(v.vendor_id);
    toast.success(`${v.business_name || v.owner_name || "Vendor"} approved! Order moved to My Orders.`);
    // Persist approval to floating widget & minimize sheet after a beat
    setActiveInquiry({
      leadId: leadId!,
      category: category ?? "Service",
      productImage: productImage ?? null,
      startedAt: inquiry?.startedAt ?? Date.now(),
      vendorCount: vendors.length,
      approved: {
        vendor_id: v.vendor_id,
        name: v.business_name || v.owner_name || "Vendor",
        avatar_url: v.avatar_url,
        phone: v.phone || v.whatsapp,
        quoted_price: v.quoted_price ?? null,
      },
      open: false,
    });
    // Don't auto-minimize anymore — customer wants to manage from here.
    // setTimeout(() => onClose(), 1200);
  };

  const unapproveVendor = async () => {
    if (!leadId) return;
    try {
      await supabase.from("leads").update({ customer_approved_vendor_id: null }).eq("id", leadId);
    } catch {}
    setApprovedId(null);
    setManageOpen(false);
    if (inquiry) {
      setActiveInquiry({ ...inquiry, approved: null, vendorCount: vendors.length });
    }
    toast.success("Vendor unapproved — full list restored");
  };

  const openTrackStatus = () => {
    setManageOpen(false);
    onClose();
    navigate({ to: "/orders" });
  };

  const handleMinimize = () => {
    if (inquiry) setActiveInquiry({ ...inquiry, open: false, vendorCount: vendors.length });
    onMinimize?.();
    onClose();
  };

  const visibleVendors = approvedId ? vendors.filter((v) => v.vendor_id === approvedId) : vendors;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center">
      <button
        aria-label="Minimize"
        onClick={handleMinimize}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-gradient-to-b from-white to-[#f5f6f8] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#a8acb3] to-transparent opacity-80" />
        </div>

        {/* Thin progress bar (search window) */}
        {!approvedId && (
          <div className="px-5 pt-1 flex-shrink-0">
            <div className="h-1 rounded-full bg-slate-200/70 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 text-center">
              {progress < 100 ? `Searching · ${vendors.length} accepted` : `Window closed · ${vendors.length} vendor${vendors.length === 1 ? "" : "s"}`}
            </p>
          </div>
        )}

        {/* Product strip just below progress */}
        <div className="px-3 pt-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#fff8dc]/90 via-white to-[#fff8dc]/60 border border-[color:oklch(0.78_0.14_82/0.4)] px-2.5 py-2 shadow-sm">
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-white border border-amber-200 flex-shrink-0">
              {productImage ? (
                <img src={productImage} alt={category ?? "Product"} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-amber-600 font-bold">{(category ?? "?")[0]}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-amber-700">✦ Your Request</p>
              <h3 className="font-display text-[14px] font-bold text-slate-800 truncate leading-tight">
                {category ?? "Service"} <span className="text-slate-400 font-normal text-[11px]">· nearby vendors</span>
              </h3>
            </div>
            <button
              onClick={handleMinimize}
              aria-label="Minimize"
              className="h-8 w-8 grid place-items-center rounded-full bg-white border border-slate-200 active:scale-90 flex-shrink-0"
            >
              <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
            </button>
            <button
              onClick={handleMinimize}
              aria-label="Close"
              className="h-8 w-8 grid place-items-center rounded-full bg-white border border-slate-200 active:scale-90 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-3 space-y-3">
          {loading && vendors.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-[color:oklch(0.55_0.10_82)]" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Vendors check ho rahe hain…</p>
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12 px-3">
              <motion.div
                className="mx-auto h-14 w-14 rounded-full border-2 border-[color:oklch(0.78_0.14_82/0.55)] grid place-items-center bg-white shadow-sm"
                animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <Loader2 className="h-6 w-6 animate-spin text-[color:oklch(0.55_0.10_82)]" />
              </motion.div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                {loadError ?? (expectedVendors > 0 ? "Abhi kisi vendor ne accept nahi kiya." : "Yahan vendor available nahi hai.")}
              </p>
              <div className="mt-5 flex gap-2 justify-center">
                {onTryAgain && (
                  <button
                    onClick={() => onTryAgain()}
                    className="px-4 py-2 rounded-full bg-[color:oklch(0.78_0.14_82)] text-white font-display text-sm font-bold active:scale-95"
                  >
                    Try again
                  </button>
                )}
                <button
                  onClick={handleMinimize}
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-display text-sm font-bold active:scale-95"
                >
                  Minimize
                </button>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {visibleVendors.map((v, i) => {
                const isApproved = approvedId === v.vendor_id;
                const displayName = v.business_name || v.owner_name || "Vendor";
                const sub = v.business_name && v.owner_name ? v.owner_name : "Verified vendor";
                const rating = Number(v.rating ?? 4.8);
                const happyPct = Math.min(100, Math.max(0, Math.round((rating / 5) * 100)));
                const badPct = 100 - happyPct;
                const coverImage = v.cover_image_url || productImage || null;
                const priceRange = v.price_min != null && v.price_max != null
                  ? `${formatMoney(v.price_min)} – ${formatMoney(v.price_max)}`
                  : formatMoney(v.quoted_price);
                const detailNote = v.mapping_notes || v.vendor_note || null;
                // No KYC field in RPC yet — show pending pill as default (verified surfaces via BadgeCheck on avatar already).
                const kycVerified = false;
                return (
                  <motion.div
                    key={v.vendor_id}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.04, type: "spring", damping: 22, stiffness: 260 }}
                    className={`relative rounded-2xl bg-white border overflow-hidden shadow-[0_6px_22px_-10px_rgba(15,23,42,0.25)] ${
                      isApproved
                        ? "border-emerald-400 ring-2 ring-emerald-300 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.5)]"
                        : "border-[color:oklch(0.78_0.14_82/0.35)]"
                    }`}
                  >
                    {/* Cover/header strip */}
                    <div className="relative h-20 bg-[color:oklch(0.86_0.08_86)] overflow-hidden">
                      {coverImage ? (
                        <img src={coverImage} alt={category ?? "Service"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-white/90" />
                      <div className="absolute top-2 left-3 flex items-center gap-1.5">
                        <div className="px-2 py-0.5 rounded-full bg-white/95 border border-amber-300 text-[10px] font-display font-bold text-amber-900 shadow-sm">
                          ✦ {category ?? "Service"}
                        </div>
                        {priceRange && (
                          <div className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold inline-flex items-center gap-0.5 shadow">
                            <IndianRupee className="h-2.5 w-2.5" /> {priceRange.replace(/₹/g, "").trim()}
                          </div>
                        )}
                      </div>
                      {v.distance_km != null && (
                        <div className="absolute top-2 right-3 px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold inline-flex items-center gap-0.5 shadow">
                          <MapPin className="h-3 w-3" /> {v.distance_km} km
                        </div>
                      )}
                      {isApproved && (
                        <div className="absolute bottom-1.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow">
                          <CheckCircle2 className="h-3 w-3" /> APPROVED
                        </div>
                      )}
                    </div>

                    {/* Identity row */}
                    <div className="px-3 pt-0 pb-2 flex items-start gap-3 -mt-8 relative">
                      <div className="relative flex-shrink-0">
                        {v.avatar_url ? (
                          <img
                            src={v.avatar_url}
                            alt={displayName}
                            className="h-14 w-14 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full border-[3px] border-white shadow-md bg-gradient-to-br from-amber-50 to-emerald-50 grid place-items-center font-display text-base font-bold text-amber-800">
                            {initials(displayName)}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white grid place-items-center shadow border border-emerald-200">
                          <BadgeCheck className="h-3 w-3 text-emerald-600" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-9">
                        <h4 className="font-display text-[15px] font-bold text-[color:oklch(0.22_0.02_260)] leading-tight truncate">
                          {displayName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{sub}</p>
                        {/* Distance + area row */}
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                            <Navigation className="h-3 w-3" />
                            {v.distance_km != null ? `${v.distance_km} km away` : "Nearby"}
                          </span>
                          {detailNote && (
                            <span className="truncate text-slate-500">· {detailNote}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mx-3 mb-2 grid grid-cols-4 gap-1.5 rounded-xl bg-slate-50 border border-slate-100 px-2 py-1.5 text-center">
                      <span className="inline-flex items-center justify-center gap-0.5 font-bold text-amber-700 text-[11px]">
                        <Star className="h-3 w-3" fill="currentColor" /> {rating.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold text-red-600">
                        <ThumbsDown className="h-2.5 w-2.5" /> {badPct}%
                      </span>
                      <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold text-emerald-700">
                        <ThumbsUp className="h-2.5 w-2.5" /> {happyPct}%
                      </span>
                      <span className={`inline-flex items-center justify-center gap-0.5 rounded-full text-[9px] font-bold ${kycVerified ? "text-emerald-700" : "text-amber-700"}`}>
                        {kycVerified ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
                        KYC
                      </span>
                    </div>

                    {/* Price — range OR quoted, always shown when available */}
                    {priceRange && (
                      <div className="px-3 pb-2 flex items-baseline gap-2">
                        <div className="inline-flex items-baseline font-display font-bold text-emerald-700 text-xl leading-none">
                          <IndianRupee className="h-4 w-4 self-center" />
                          <span>{priceRange.replace(/₹/g, "")}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          {v.price_min != null && v.price_max != null ? "mapped range" : "vendor quote"}
                        </span>
                      </div>
                    )}

                    {/* Action bar */}
                    <div className="px-3 pb-3 grid grid-cols-[1fr_auto_auto] gap-2">
                      <button
                        onClick={() => isApproved ? setManageOpen(true) : approveVendor(v)}
                        disabled={(!!approvedId && !isApproved) || approving === v.vendor_id}
                        className={`h-10 rounded-xl font-display font-bold text-sm inline-flex items-center justify-center gap-1.5 transition active:scale-95 ${
                          isApproved
                            ? "bg-emerald-500 text-white"
                            : approvedId
                              ? "bg-slate-100 text-slate-400"
                              : "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow"
                        }`}
                      >
                        {approving === v.vendor_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isApproved ? (
                          <><CheckCircle2 className="h-4 w-4" /> Approved · Manage</>
                        ) : (
                          <>Approve</>
                        )}
                      </button>
                      <button
                        onClick={() => openChat(v)}
                        className="h-10 w-10 rounded-xl bg-white border-2 border-sky-500 text-sky-700 grid place-items-center active:scale-95"
                        aria-label="Chat"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      {(v.phone || v.whatsapp) && (
                        <a
                          href={`tel:${v.phone || v.whatsapp}`}
                          className="h-10 w-10 rounded-xl bg-white border-2 border-emerald-500 text-emerald-700 grid place-items-center active:scale-95"
                          aria-label="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Cancel inquiry — at the bottom of the list, slim & long */}
          {!approvedId && vendors.length > 0 && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full mt-2 h-9 rounded-full bg-white border border-slate-200 text-[12px] font-bold text-slate-500 hover:text-red-600 hover:border-red-200 active:scale-[0.98] transition"
            >
              Cancel this inquiry
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirm modal */}
      <AnimatePresence>
        {confirmCancel && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[90] grid place-items-center bg-black/40 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl"
            >
              <h4 className="font-display font-bold text-slate-900">Cancel this inquiry?</h4>
              <p className="mt-1 text-[12px] text-slate-500">
                Jab tak yeh screen active hai aap dusri request nahi bhej sakte. Cancel karein ya next move (My Orders)?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm active:scale-95"
                >
                  Keep open
                </button>
                <button
                  onClick={async () => {
                    if (leadId) {
                      try { await supabase.from("leads").update({ status: "cancelled" }).eq("id", leadId); } catch {}
                      clearActiveInquiry(leadId);
                    }
                    setConfirmCancel(false);
                    onClose();
                  }}
                  className="h-10 rounded-xl bg-red-500 text-white font-bold text-sm active:scale-95"
                >
                  Yes, cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatPeer && (
          <VendorChatSheet
            open={!!chatPeer}
            leadId={leadId}
            peer={chatPeer}
            onClose={() => setChatPeer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
