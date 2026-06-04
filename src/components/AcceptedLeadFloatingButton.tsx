import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Maximize2 } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type AcceptedLead = {
  notificationId: string;
  leadId: string;
  subCategoryName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAvatar: string | null;
  productImage: string | null;
  address: string | null;
  distanceKm: number | null;
  note: string | null;
  acceptedAt: string;
};

type NotificationRow = {
  id: string;
  lead_id: string;
  sub_category_name: string | null;
  responded_at: string | null;
  created_at: string;
  status?: string | null;
};

type LeadLookup = {
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  note: string | null;
  images: string[] | null;
  lat: number | null;
  lng: number | null;
};

type CustomerRow = {
  user_id: string;
  avatar_url: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

type VendorLocationRow = {
  lat: number | null;
  lng: number | null;
  live_lat: number | null;
  live_lng: number | null;
};

const STORAGE_DISMISS_KEY = "ko-accepted-fab-dismissed-v2";

function maskPhone(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "Phone hidden";
  return `${digits.slice(0, 2)}••••••${digits.slice(-2)}`;
}

function areaLine(lead: AcceptedLead) {
  const parts = [lead.address, lead.distanceKm != null ? `${lead.distanceKm} km` : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(" · ") : "Location pending";
}

/**
 * Horizontal pill above the vendor dashboard search bar (mirrors the
 * customer-side FloatingInquiryWidget). Shows count of accepted leads.
 * Tap → bottom-sheet picker listing each accepted lead with service name
 * and customer; tap a row → opens chat.
 */
export function AcceptedLeadFloatingButton({ onOpenList }: { onOpenList?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState<AcceptedLead[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(STORAGE_DISMISS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  // Only render on vendor dashboard. Hide on chat/inner screens.
  const shouldShow = location.pathname === "/vendor/dashboard";

  useEffect(() => {
    if (!user || !shouldShow) return;
    let cancelled = false;

    const load = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("lead_notifications")
        .select("id, lead_id, status, responded_at, created_at, sub_category_name")
        .eq("vendor_id", user.id)
        .eq("status", "accepted")
        .gte("created_at", since)
        .order("responded_at", { ascending: false, nullsFirst: false })
        .limit(20);
      if (cancelled) return;
      const rows = (data ?? []) as any[];

      // Enrich with customer profile, masked phone, address, distance and product/notes.
      const leadIds = rows.map((r) => r.lead_id);
      let leadMap = new Map<string, {
        customer_id: string | null;
        customer_name: string | null;
        customer_phone: string | null;
        address: string | null;
        note: string | null;
        images: string[] | null;
        lat: number | null;
        lng: number | null;
      }>();
      if (leadIds.length) {
        const { data: ls } = await supabase
          .from("leads")
          .select("id, customer_id, customer_name, customer_phone, address, note, images, lat, lng")
          .in("id", leadIds);
        (ls ?? []).forEach((l: any) => leadMap.set(l.id, l as any));
      }
      const custIds = Array.from(new Set([...leadMap.values()].map((v) => v.customer_id).filter(Boolean) as string[]));
      let avatarMap = new Map<string, string | null>();
      if (custIds.length) {
        const { data: cs } = await supabase
          .from("customers").select("user_id, avatar_url, name, phone, address, lat, lng").in("user_id", custIds);
        (cs ?? []).forEach((c: any) => avatarMap.set(c.user_id, c.avatar_url ?? null));
        (cs ?? []).forEach((c: any) => {
          for (const [leadId, leadInfo] of leadMap) {
            if (leadInfo.customer_id !== c.user_id) continue;
            leadMap.set(leadId, {
              ...leadInfo,
              customer_name: leadInfo.customer_name ?? c.name ?? null,
              customer_phone: leadInfo.customer_phone ?? c.phone ?? null,
              address: leadInfo.address ?? c.address ?? null,
              lat: leadInfo.lat ?? c.lat ?? null,
              lng: leadInfo.lng ?? c.lng ?? null,
            });
          }
        });
      }

      let vendorLoc: { lat: number | null; lng: number | null } | null = null;
      const { data: vrow } = await supabase
        .from("vendors")
        .select("lat, lng, live_lat, live_lng")
        .eq("user_id", user.id)
        .maybeSingle();
      if (vrow) {
        vendorLoc = {
          lat: (vrow as any).live_lat ?? (vrow as any).lat ?? null,
          lng: (vrow as any).live_lng ?? (vrow as any).lng ?? null,
        };
      }

      const calcDistance = (lat?: number | null, lng?: number | null) => {
        if (vendorLoc?.lat == null || vendorLoc?.lng == null || lat == null || lng == null) return null;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat - vendorLoc.lat);
        const dLng = toRad(lng - vendorLoc.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(vendorLoc.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
        return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
      };

      const mapped: AcceptedLead[] = rows.map((r) => {
        const li = leadMap.get(r.lead_id) as any;
        return {
          notificationId: r.id,
          leadId: r.lead_id,
          subCategoryName: r.sub_category_name,
          customerName: li?.customer_name ?? null,
          customerPhone: li?.customer_phone ?? null,
          customerAvatar: li?.customer_id ? avatarMap.get(li.customer_id) ?? null : null,
          productImage: Array.isArray(li?.images) ? li.images[0] ?? null : null,
          address: li?.address ?? null,
          distanceKm: calcDistance(li?.lat, li?.lng),
          note: li?.note ?? null,
          acceptedAt: r.responded_at ?? r.created_at,
        };
      });
      setLeads(mapped);
    };
    load();

    const ch = supabase
      .channel(`accepted-lead-fab-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          if (row.status !== "accepted") return;
          void load();
          // Un-dismiss this id on fresh accept
          setDismissedIds((s) => {
            const n = new Set(s); n.delete(row.id);
            try { window.localStorage.setItem(STORAGE_DISMISS_KEY, JSON.stringify([...n])); } catch { /* ignore */ }
            return n;
          });
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user, shouldShow]);

  if (!shouldShow) return null;
  const visible = leads.filter((l) => !dismissedIds.has(l.notificationId));
  if (visible.length === 0) return null;

  const count = visible.length;
  const primary = visible[0];

  const handleDismissAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((s) => {
      const n = new Set(s);
      visible.forEach((l) => n.add(l.notificationId));
      try { window.localStorage.setItem(STORAGE_DISMISS_KEY, JSON.stringify([...n])); } catch { /* ignore */ }
      return n;
    });
    setPickerOpen(false);
  };

  const openLead = (leadId: string) => {
    setPickerOpen(false);
    navigate({ to: "/vendor/chat", search: { leadId } as any });
  };

  const handleTap = () => {
    if (onOpenList) {
      onOpenList();
      return;
    }
    if (count > 1) setPickerOpen(true);
    else openLead(primary.leadId);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="accepted-lead-pill"
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{
            opacity: 1, scale: 1,
            y: [0, -3, 0, -1.5, 0],
            rotate: [0, -1.2, 1.2, -0.6, 0.6, 0],
          }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{
            type: "spring", damping: 22, stiffness: 260,
            y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 2.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" },
          }}
          className="absolute z-[45] left-1/2 bottom-3 -translate-x-1/2 w-[88vw] max-w-sm"
        >
          {/* Pulse halo */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-emerald-400/25"
            animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute -inset-1 rounded-2xl border-2 border-emerald-300"
            animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative rounded-2xl shadow-[0_10px_30px_-8px_rgba(15,23,42,0.4)] border overflow-hidden backdrop-blur bg-gradient-to-br from-emerald-50 to-white border-emerald-300">
            <button
              onClick={handleTap}
              className="w-full flex items-center gap-2.5 py-2 pl-3 pr-9 text-left active:scale-[0.98] transition"
              aria-label="Open accepted lead requests"
            >
              <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-500 grid place-items-center shadow border-2 border-white relative overflow-hidden">
                  <motion.span
                    className="absolute inset-0 rounded-full bg-emerald-400/50"
                    animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  {primary.customerAvatar || primary.productImage ? (
                    <img src={primary.customerAvatar ?? primary.productImage ?? ""} alt="" className="relative z-10 h-full w-full object-cover" />
                  ) : (
                    <span className="relative z-10 text-white font-display font-bold text-lg">
                      {(primary.customerName ?? primary.subCategoryName ?? "L")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {count > 1 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-white">
                    {count}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <p className="font-display text-[13px] font-bold leading-tight truncate text-emerald-900">
                  {count > 1
                    ? `${count} leads · ${primary.customerName ?? "Customer"}`
                    : primary.customerName ?? "Customer profile"}
                </p>
                <p className="text-[10px] text-slate-600 truncate font-semibold">
                  {maskPhone(primary.customerPhone)} · {primary.subCategoryName ?? "Product enquiry"}
                </p>
                <p className="text-[9px] text-slate-500 truncate">
                  {areaLine(primary)}
                </p>
              </div>
              <Maximize2 className="h-3.5 w-3.5 text-slate-400 ml-auto flex-shrink-0" />
            </button>

            <button
              onClick={handleDismissAll}
              aria-label="Hide"
              className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-white/90 border border-slate-200 active:scale-90"
            >
              <X className="h-3 w-3 text-slate-600" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Picker sheet — multi-lead */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[88] flex items-end justify-center bg-black/40"
            onClick={() => setPickerOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex justify-center pt-2 pb-1"><span className="h-1.5 w-14 rounded-full bg-slate-200" /></div>
              <div className="px-5 pt-1 pb-3">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-emerald-700">✦ Accepted Leads</p>
                <h3 className="font-display text-lg font-bold text-slate-800">Which lead do you want to chat?</h3>
              </div>
              <div className="px-3 pb-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {visible.map((l) => (
                  <button
                    key={l.notificationId}
                    onClick={() => openLead(l.leadId)}
                    className="w-full flex items-start gap-3 p-2.5 rounded-2xl border border-emerald-200 bg-white hover:bg-emerald-50/40 active:scale-[0.98] text-left transition"
                  >
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-200 flex-shrink-0 grid place-items-center">
                      {l.customerAvatar || l.productImage
                        ? <img src={l.customerAvatar ?? l.productImage ?? ""} alt="" className="h-full w-full object-cover" />
                        : <span className="text-emerald-700 font-bold">{(l.customerName ?? "C")[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold text-slate-800 truncate">
                        {l.customerName ?? "Customer"}
                      </p>
                      <p className="text-[11px] text-slate-600 truncate font-semibold">
                        {maskPhone(l.customerPhone)} · {l.subCategoryName ?? "Product enquiry"}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        📍 {areaLine(l)}
                      </p>
                      {l.note && <p className="mt-1 text-[10px] italic text-slate-500 line-clamp-2">“{l.note}”</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
