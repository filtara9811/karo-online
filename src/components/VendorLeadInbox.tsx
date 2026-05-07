import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LeadChatThread, type LeadChatPeer } from "@/components/LeadChatThread";

type LeadRow = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  sub_category_name: string;
  status: string;
  accepted_count: number;
  created_at: string;
};

type CustomerProfile = {
  user_id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type LeadStatusBadge = { label: string; cls: string };

function statusBadge(status: string): LeadStatusBadge {
  switch (status) {
    case "accepted":
    case "in_progress":
      return { label: "In Progress", cls: "bg-amber-100 text-amber-700 border border-amber-300" };
    case "approved":
      return { label: "Approved", cls: "bg-blue-100 text-blue-700 border border-blue-300" };
    case "completed":
    case "fulfilled":
      return { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border border-emerald-300" };
    case "declined":
    case "rejected":
      return { label: "Cancelled", cls: "bg-rose-100 text-rose-700 border border-rose-300" };
    default:
      return { label: "Accepted", cls: "bg-amber-100 text-amber-700 border border-amber-300" };
  }
}

/**
 * Vendor-side multi-lead chat — Screenshot #2 style.
 * Top: avatars of customers (one per accepted lead). Below: active header,
 * lead-tabs (e.g. "AC Service · In Progress"), then full LeadChatThread.
 */
export function VendorLeadInbox({ initialLeadId }: { initialLeadId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CustomerProfile>>({});
  const [activeLeadId, setActiveLeadId] = useState<string>(initialLeadId ?? "");
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data: rows } = await supabase
        .from("leads")
        .select("id, customer_id, customer_name, customer_phone, sub_category_name, status, accepted_count, created_at")
        .contains("accepted_vendor_ids", [user.id])
        .order("created_at", { ascending: false })
        .limit(40);
      if (!alive) return;
      const list = (rows ?? []) as LeadRow[];
      setLeads(list);
      const ids = Array.from(new Set(list.map((l) => l.customer_id)));
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("customers")
          .select("user_id, name, phone, avatar_url")
          .in("user_id", ids);
        if (!alive) return;
        const map: Record<string, CustomerProfile> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      if (!activeLeadId && list.length > 0) setActiveLeadId(list[0].id);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`vendor-inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // If initialLeadId supplied via query, switch to it once leads load
  useEffect(() => {
    if (initialLeadId && leads.some((l) => l.id === initialLeadId)) {
      setActiveLeadId(initialLeadId);
    }
  }, [initialLeadId, leads]);

  const active = leads.find((l) => l.id === activeLeadId);
  const activeProfile = active ? profiles[active.customer_id] : undefined;
  const peer: LeadChatPeer | null = active
    ? {
        id: active.customer_id,
        name: activeProfile?.name || active.customer_name || "Customer",
        avatar_url: activeProfile?.avatar_url ?? null,
        phone: activeProfile?.phone || active.customer_phone || null,
        subtitle: "Customer · Lead chat",
      }
    : null;

  if (loading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-gradient-to-b from-amber-50 to-white p-6 text-center">
        <div>
          <p className="text-4xl mb-3">📭</p>
          <p className="font-display font-bold text-base text-slate-800">Abhi koi accepted lead nahi</p>
          <p className="text-xs text-slate-500 mt-1">Lead accept karte hi customer ka chat yahan khulega.</p>
          <button onClick={() => navigate({ to: "/vendor/dashboard" })} className="mt-4 px-4 py-2 rounded-full bg-[#d97706] text-white text-sm font-bold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // For tabs we group leads by customer (multiple services from same customer)
  const sameCustomerLeads = active
    ? leads.filter((l) => l.customer_id === active.customer_id)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#f4f4f6] to-[#e9eaee]">
      {/* ===== Top: customer avatars switcher ===== */}
      <div className="flex-shrink-0 bg-white border-b border-amber-200/60 px-3 py-2.5">
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
          {leads.slice(0, 4).map((l) => {
            const p = profiles[l.customer_id];
            const isActive = l.id === activeLeadId;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLeadId(l.id)}
                className="relative flex-shrink-0 active:scale-90 transition"
                aria-label={p?.name || l.customer_name || "Customer"}
              >
                <span
                  className={`relative block h-12 w-12 rounded-full overflow-hidden border-2 transition-all ${
                    isActive ? "border-[#d97706] shadow-[0_4px_14px_-2px_rgba(217,119,6,0.55)] scale-110" : "border-white shadow-sm"
                  }`}
                >
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid place-items-center h-full w-full bg-gradient-to-br from-amber-200 to-amber-400 text-white font-bold">
                      {(p?.name || l.customer_name || "C").charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                {isActive && (
                  <motion.span layoutId="vendor-cust-pin" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#d97706] border-2 border-white" />
                )}
              </button>
            );
          })}
          {leads.length > 4 && (
            <button
              onClick={() => setShowAll(true)}
              className="ml-auto flex-shrink-0 h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border-2 border-white shadow-sm active:scale-90"
              aria-label="All customers"
            >
              <span className="text-xs font-bold text-amber-800">{leads.length}+</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== Service tabs (multiple services from same customer) ===== */}
      {sameCustomerLeads.length > 1 && (
        <div className="flex-shrink-0 bg-white border-b border-amber-100 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {sameCustomerLeads.map((l) => {
            const isActive = l.id === activeLeadId;
            const b = statusBadge(l.status);
            return (
              <button
                key={l.id}
                onClick={() => setActiveLeadId(l.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl border-b-2 text-[11px] font-semibold transition ${
                  isActive ? "border-amber-500 text-amber-800" : "border-transparent text-slate-500"
                }`}
              >
                <span className="font-bold">{l.sub_category_name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${b.cls}`}>{b.label}</span>
                {l.accepted_count > 1 && (
                  <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">{l.accepted_count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== Embedded chat thread ===== */}
      <div className="flex-1 relative">
        {active && (
          <LeadChatThread
            key={active.id}
            leadId={active.id}
            peer={peer}
            myRole="vendor"
            onBack={() => navigate({ to: "/vendor/dashboard" })}
          />
        )}
      </div>

      {/* All-customers sheet */}
      <AnimatePresence>
        {showAll && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAll(false)} className="fixed inset-0 bg-black/50 z-[80]" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl shadow-2xl flex flex-col"
              style={{ height: "85vh" }}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 my-3" />
              <div className="px-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-slate-800">All Leads ({leads.length})</h3>
                <button onClick={() => setShowAll(false)} className="h-8 w-8 grid place-items-center rounded-full bg-gray-100 active:scale-90">
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {leads.map((l) => {
                  const p = profiles[l.customer_id];
                  const b = statusBadge(l.status);
                  return (
                    <button
                      key={l.id}
                      onClick={() => { setActiveLeadId(l.id); setShowAll(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition text-left"
                    >
                      <span className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid place-items-center h-full w-full bg-gradient-to-br from-amber-200 to-amber-400 text-white font-bold">
                            {(p?.name || l.customer_name || "C").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-slate-800 truncate">
                          {p?.name || l.customer_name || "Customer"}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{l.sub_category_name}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${b.cls}`}>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
