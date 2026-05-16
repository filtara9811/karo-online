import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, MessageCircle, Loader2, MapPin, CheckCircle2, IndianRupee, BadgeCheck, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VendorChatSheet } from "@/components/VendorChatSheet";
import type { LeadChatPeer } from "@/components/LeadChatThread";

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
};

type Props = {
  open: boolean;
  category: string | null;
  leadId: string | null;
  expectedVendors?: number;
  onTryAgain?: () => Promise<void> | void;
  onClose: () => void;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70";

export function VendorListSheet({ open, category, leadId, expectedVendors = 0, onTryAgain, onClose }: Props) {
  const [vendors, setVendors] = useState<AcceptedVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [chatPeer, setChatPeer] = useState<LeadChatPeer | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.body.classList.add("ko-accepted-vendor-open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("ko-accepted-vendor-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Reset approved when sheet reopens with a different lead
  useEffect(() => {
    if (open) setApprovedId(null);
  }, [open, leadId]);

  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId });
      if (!alive) return;
      setLoadError(error ? "Vendor list load nahi ho paayi. Dobara try ho raha hai…" : null);
      setVendors((data ?? []) as AcceptedVendor[]);
      setLoading(false);
      // Sync already-approved state
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_notifications", filter: `lead_id=eq.${leadId}` },
        (payload) => { if ((payload.new as any)?.status === "accepted") load(); },
      )
      .subscribe();
    const poll = setInterval(load, 4000);
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch); };
  }, [open, leadId]);

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
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-gradient-to-b from-white to-[#f5f6f8] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#a8acb3] to-transparent opacity-80" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Accepted Vendors ✦
            </p>
            <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.01_260)] truncate">
              {category ?? "Service"}
            </h3>
            <p className="text-[10px] text-[color:oklch(0.50_0.08_85)] mt-0.5">
              {loading
                ? "Searching…"
                : approvedId
                  ? "Approved — order moved to My Orders"
                  : `${vendors.length} vendor${vendors.length === 1 ? "" : "s"} ready to help`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] active:scale-90 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
          {loading ? (
            <div className="grid place-items-center py-16 text-center">
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
                  onClick={onClose}
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-display text-sm font-bold active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            vendors.map((v, i) => {
              const isApproved = approvedId === v.vendor_id;
              const isDimmed = !!approvedId && !isApproved;
              const cover = COVER;
              return (
                <motion.div
                  key={v.vendor_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: isDimmed ? 0.4 : 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl bg-white border overflow-hidden shadow-[0_4px_18px_-8px_rgba(15,23,42,0.18)] transition ${
                    isApproved
                      ? "border-emerald-400 ring-2 ring-emerald-300 shadow-[0_8px_28px_-6px_rgba(16,185,129,0.45)]"
                      : "border-[color:oklch(0.72_0.01_260/0.4)]"
                  } ${isDimmed ? "pointer-events-none" : ""}`}
                >
                  {/* Cover banner */}
                  <div className="relative h-20 w-full">
                    <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 border border-amber-300/60 text-[10px] font-display font-bold text-amber-900 shadow">
                      ✦ {category ?? "Service"}
                    </div>
                    {v.distance_km != null && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600/95 text-white text-[10px] font-bold inline-flex items-center gap-0.5 shadow">
                        <MapPin className="h-3 w-3" /> {v.distance_km} km
                      </div>
                    )}
                    {isApproved && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow">
                        <CheckCircle2 className="h-3 w-3" /> APPROVED
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-3 right-3 text-white">
                      <p className="font-display text-sm font-bold leading-tight truncate drop-shadow">
                        {v.business_name || v.owner_name || "Vendor"}
                      </p>
                    </div>
                  </div>

                  {/* Body: avatar + rating */}
                  <div className="px-3 pt-3 pb-2 flex items-center gap-3 -mt-7 relative">
                    <img
                      src={v.avatar_url || FALLBACK_AVATAR}
                      alt={v.business_name ?? ""}
                      className="h-14 w-14 rounded-full object-cover border-[3px] border-white shadow-md flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0 pt-6">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                          <Star className="h-3 w-3" fill="currentColor" />
                          {(v.rating ?? 4.8).toFixed(1)}
                          <span className="text-slate-400 font-normal ml-0.5">({v.total_reviews ?? 0})</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Delivery rating</span>
                      </div>
                    </div>
                    {v.quoted_price != null && (
                      <div className="text-right pt-6">
                        <span className="inline-flex items-center font-display font-bold text-emerald-700 text-base leading-none">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {Number(v.quoted_price).toLocaleString("en-IN")}
                        </span>
                        <p className="text-[9px] uppercase tracking-wider text-slate-400">Quote</p>
                      </div>
                    )}
                  </div>

                  {/* Vendor note */}
                  {v.vendor_note && (
                    <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                      "{v.vendor_note}"
                    </div>
                  )}

                  {/* Action row: Approve + Chat */}
                  <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => approveVendor(v)}
                      disabled={!!approvedId || approving === v.vendor_id}
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
                        <><CheckCircle2 className="h-4 w-4" /> Approved</>
                      ) : (
                        <>Approve</>
                      )}
                    </button>
                    <button
                      onClick={() => openChat(v)}
                      className="h-10 rounded-xl bg-white border-2 border-sky-500 text-sky-700 font-display font-bold text-sm inline-flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <MessageCircle className="h-4 w-4" /> Chat
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

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
