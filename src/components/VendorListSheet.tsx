import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { X, Star, Phone, MessageCircle, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
const COVER =
  "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=600&q=70";

export function VendorListSheet({ open, category, leadId, expectedVendors = 0, onTryAgain, onClose }: Props) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<AcceptedVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<AcceptedVendor | null>(null);

  // Lock scroll
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

  // Load + realtime poll on lead acceptance
  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_lead_accepted_vendors", { _lead_id: leadId });
      if (!alive) return;
      setLoadError(error ? "Vendor list load nahi ho paayi. Dobara try ho raha hai…" : null);
      setVendors((data ?? []) as AcceptedVendor[]);
      setLoading(false);
    };
    setLoading(true);
    load();
    // Subscribe to lead row updates so list grows as vendors accept
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
    // Safety: poll every 4s while open in case realtime is delayed
    const poll = setInterval(load, 4000);
    return () => { alive = false; clearInterval(poll); supabase.removeChannel(ch); };
  }, [open, leadId]);

  if (!open) return null;

  const goToChat = (v: AcceptedVendor) => {
    if (!leadId) return;
    onClose();
    navigate({ to: "/chat", search: { leadId, vendorId: v.vendor_id } as any });
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
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#a8acb3] to-transparent opacity-80" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Accepted Vendors ✦
            </p>
            <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.01_260)]">
              {category ?? "Service"}
            </h3>
            <p className="text-[10px] text-[color:oklch(0.50_0.08_85)] mt-0.5">
              {loading ? "Searching…" : `${vendors.length} vendor${vendors.length === 1 ? "" : "s"} ready to help`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
          {loading ? (
            <div className="grid place-items-center py-16 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-[color:oklch(0.55_0.10_82)]" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Accepted vendors check ho rahe hain…</p>
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
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {expectedVendors > 0
                  ? "Jaise hi vendor accept karega, uski profile yahin call aur chat option ke saath aa jayegi."
                  : "Dobara try karein ya cancel karke home screen par wapas ja sakte hain."}
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
            vendors.map((v, i) => (
              <motion.article
                key={v.vendor_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl bg-white border-2 border-[color:oklch(0.72_0.01_260/0.4)] overflow-hidden shadow-sm"
              >
                <div className="px-3 pt-3 pb-2 flex items-center gap-3">
                  <img
                    src={v.avatar_url || FALLBACK_AVATAR}
                    alt={v.business_name ?? ""}
                    className="h-14 w-14 rounded-full object-cover border-2 border-white shadow"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-base font-bold text-slate-800 leading-tight truncate">
                      {v.business_name || v.owner_name || "Vendor"}
                    </h4>
                    {v.email && (
                      <p className="text-[11px] text-slate-500 truncate">{v.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                        <Star className="h-3 w-3" fill="currentColor" />
                        {(v.rating ?? 4.8).toFixed(1)}
                        <span className="text-slate-400 font-normal ml-0.5">({v.total_reviews ?? 0})</span>
                      </span>
                      {v.distance_km != null && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                          📍 {v.distance_km} km
                        </span>
                      )}
                    </div>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                </div>

                <div className="flex items-stretch border-t border-slate-200 bg-[color:oklch(0.13_0.02_85)]">
                  {v.phone || v.whatsapp ? (
                    <a
                      href={`tel:${v.phone || v.whatsapp}`}
                      className="flex-1 py-2.5 flex items-center justify-center gap-1.5 font-display font-bold text-sm text-white active:scale-95"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  ) : (
                    <button disabled className="flex-1 py-2.5 text-white/50 text-sm font-bold">
                      No Phone
                    </button>
                  )}
                  <button
                    onClick={() => goToChat(v)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 font-display font-bold text-sm text-white border-l border-white/10 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </button>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeContact && (
          <ContactPopup
            vendor={activeContact}
            onClose={() => setActiveContact(null)}
            onChat={() => { const v = activeContact; setActiveContact(null); goToChat(v); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactPopup({
  vendor, onClose, onChat,
}: { vendor: AcceptedVendor; onClose: () => void; onChat: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-6">
      <motion.button
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.65)] backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className="relative w-full max-w-sm rounded-3xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="relative h-28">
          <img src={COVER} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white shadow active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute -bottom-8 left-4 h-16 w-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
            <img src={vendor.avatar_url || FALLBACK_AVATAR} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="px-4 pt-10 pb-3">
          <h3 className="font-display text-lg font-bold">
            {vendor.business_name || vendor.owner_name || "Vendor"}
          </h3>
          <p className="text-xs text-slate-500">{vendor.owner_name ?? "Verified vendor"}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 text-amber-500" fill="currentColor" />)}
            <span className="text-xs font-bold text-slate-700">4.8</span>
          </div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {vendor.phone || vendor.whatsapp ? (
            <a
              href={`tel:${vendor.phone || vendor.whatsapp}`}
              className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-white active:scale-95"
            >
              <Phone className="h-5 w-5" />
              <span className="text-[11px] font-display font-bold">Call</span>
            </a>
          ) : (
            <div className="py-3 text-center text-[11px] text-slate-400 rounded-2xl bg-slate-100">No phone</div>
          )}
          <button
            onClick={onChat}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 text-white active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[11px] font-display font-bold">Chat</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
