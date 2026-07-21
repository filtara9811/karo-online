import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeadChatThread, type LeadChatPeer } from "@/components/LeadChatThread";

type Props = {
  open: boolean;
  leadId: string | null;
  peer: LeadChatPeer | null;
  onClose: () => void;
};

type AcceptedVendor = {
  vendor_id: string;
  business_name: string | null;
  owner_name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  rating: number | null;
  distance_km: number | null;
  quoted_price?: number | null;
  price_min?: number | null;
};

function money(v?: number | null) {
  if (v == null) return null;
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

/**
 * Bottom-sheet chat around LeadChatThread with a horizontal vendor rail
 * so the customer can switch between all accepted vendors for the same lead
 * without leaving the chat.
 */
export function VendorChatSheet({ open, leadId, peer, onClose }: Props) {
  const [vendors, setVendors] = useState<AcceptedVendor[]>([]);
  const [activePeer, setActivePeer] = useState<LeadChatPeer | null>(peer);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Reset selection when the sheet is (re)opened with a different peer.
  useEffect(() => {
    if (open) setActivePeer(peer);
  }, [open, peer?.id]);

  // Load all accepted vendors for this lead so the rail can show every
  // vendor the customer can chat with.
  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId });
      if (!alive) return;
      setVendors(((data ?? []) as AcceptedVendor[]));
    };
    load();
    const ch = supabase
      .channel(`chat-sheet-accept-${leadId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_notifications", filter: `lead_id=eq.${leadId}` },
        (p) => { if ((p.new as any)?.status === "accepted") load(); },
      )
      .subscribe();
    const poll = setInterval(load, 6000);
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch); };
  }, [open, leadId]);

  const railVendors = useMemo(() => {
    // Ensure the initially-passed peer appears in the rail even before RPC returns.
    if (!peer) return vendors;
    if (vendors.some((v) => v.vendor_id === peer.id)) return vendors;
    return [
      {
        vendor_id: peer.id,
        business_name: peer.name,
        owner_name: peer.subtitle ?? null,
        avatar_url: peer.avatar_url,
        whatsapp: null,
        phone: peer.phone,
        rating: null,
        distance_km: null,
      } as AcceptedVendor,
      ...vendors,
    ];
  }, [vendors, peer]);

  const selectVendor = (v: AcceptedVendor) => {
    setActivePeer({
      id: v.vendor_id,
      name: v.business_name || v.owner_name || "Vendor",
      avatar_url: v.avatar_url,
      phone: v.phone || v.whatsapp,
      subtitle: v.business_name && v.owner_name ? v.owner_name : "Verified vendor",
    });
  };

  if (!open || !leadId) return null;
  const activeId = activePeer?.id ?? peer?.id ?? null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center">
      <button
        aria-label="Close chat"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
        style={{ height: "88vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0 bg-white">
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 h-8 w-8 grid place-items-center rounded-full bg-white shadow border border-slate-200 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Vendor rail — swipe left/right to switch chat */}
        {railVendors.length > 0 && (
          <div className="px-3 pt-1 pb-2 border-b border-slate-100 flex-shrink-0 bg-white">
            <div className="flex items-center justify-between mb-1.5 pr-8">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                {railVendors.length} Vendor{railVendors.length === 1 ? "" : "s"} — tap to switch
              </p>
              {railVendors.length > 1 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Users className="h-3 w-3" /> swipe
                </span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x">
              <AnimatePresence initial={false}>
                {railVendors.map((v) => {
                  const active = v.vendor_id === activeId;
                  const name = v.business_name || v.owner_name || "Vendor";
                  const price = v.quoted_price ?? v.price_min;
                  return (
                    <motion.button
                      key={v.vendor_id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => selectVendor(v)}
                      className={`snap-start flex-shrink-0 w-[88px] rounded-2xl border p-2 flex flex-col items-center text-center transition-all ${
                        active
                          ? "border-orange-400 bg-orange-50/60 ring-2 ring-orange-200 shadow-md"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="relative">
                        {v.avatar_url ? (
                          <img
                            src={v.avatar_url}
                            alt={name}
                            className="h-12 w-12 rounded-full object-cover border-2 border-white shadow"
                            loading="lazy"
                          />
                        ) : (
                          <span className="h-12 w-12 rounded-full bg-orange-600 text-white grid place-items-center border-2 border-white shadow text-xs font-bold">
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
                      ) : null}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <LeadChatThread
            key={`${leadId}-${activeId ?? "none"}`}
            leadId={leadId}
            peer={activePeer ?? peer}
            myRole="customer"
            onBack={onClose}
          />
        </div>
      </motion.div>
    </div>
  );
}
