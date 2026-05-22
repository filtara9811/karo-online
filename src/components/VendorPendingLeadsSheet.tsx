import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Clock, MapPin, Phone, Inbox, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type ReadyRow = {
  leadId: string;
  customerName: string | null;
  subCategoryName: string;
  address: string | null;
  note: string | null;
  acceptedAt: string;
};


type PendingRow = {
  notificationId: string;
  leadId: string;
  customerName: string | null;
  customerPhone: string | null;
  subCategoryName: string;
  itemNames: string[];
  address: string | null;
  note: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Hook → live count of vendor's PENDING lead notifications (for dock badge).
 */
export function usePendingLeadsCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const refresh = async () => {
      const { count: c } = await supabase
        .from("lead_notifications")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .eq("status", "pending");
      if (alive) setCount(c ?? 0);
    };
    refresh();
    const ch = supabase
      .channel(`pending-leads-count-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  return count;
}

export function VendorPendingLeadsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [ready, setReady] = useState<ReadyRow[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      const [{ data: briefs }, { data: acc }] = await Promise.all([
        supabase.rpc("get_my_pending_lead_briefs"),
        supabase
          .from("lead_notifications")
          .select("lead_id, responded_at, leads!inner(id, sub_category_name, customer_name, address, note)")
          .eq("vendor_id", user.id)
          .eq("status", "accepted")
          .is("vendor_started_at", null)
          .order("responded_at", { ascending: false })
          .limit(20),
      ]);
      const list = (briefs ?? []) as any[];
      const mapped: PendingRow[] = list
        .filter((b) => b.notification_status === "pending" && (!b.status || b.status === "pending" || b.status === "open" || b.status === "new"))
        .map((b) => ({
          notificationId: b.id, leadId: b.id,
          customerName: b.customer_name_initial ?? "Customer",
          customerPhone: null,
          subCategoryName: b.sub_category_name ?? "Service",
          itemNames: (b.item_names ?? []) as string[],
          address: b.area_hint ?? null,
          note: b.note ?? null,
          createdAt: b.created_at,
        }));
      const readyMapped: ReadyRow[] = (acc ?? []).map((r: any) => ({
        leadId: r.lead_id,
        customerName: r.leads?.customer_name ?? "Customer",
        subCategoryName: r.leads?.sub_category_name ?? "Service",
        address: r.leads?.address ?? null,
        note: r.leads?.note ?? null,
        acceptedAt: r.responded_at,
      }));
      if (alive) { setRows(mapped); setReady(readyMapped); setLoading(false); }
    };
    load();
    const ch = supabase
      .channel(`pending-leads-sheet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [open, user]);

  const accept = async (leadId: string) => {
    setBusy(leadId);
    const { data, error } = await supabase.rpc("accept_lead", { _lead_id: leadId });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const res = data as any;
    if (res?.ok) {
      toast.success(res?.auto_started ? "Lead accepted — moved to dashboard" : "Accepted — press Start Work when ready");
      setRows((p) => p.filter((r) => r.leadId !== leadId));
    } else {
      toast.error(res?.reason || "Could not accept");
    }
  };

  const startWork = async (leadId: string) => {
    setBusy(leadId);
    const { data, error } = await supabase.rpc("start_lead_work", { _lead_id: leadId });
    setBusy(null);
    if (error || !(data as any)?.ok) { toast.error("Could not start work"); return; }
    toast.success("Lead moved to dashboard ✓");
    setReady((p) => p.filter((r) => r.leadId !== leadId));
  };

  const reject = async (leadId: string) => {
    setBusy(leadId);
    await supabase.rpc("reject_lead", { _lead_id: leadId });
    setBusy(null);
    setRows((p) => p.filter((r) => r.leadId !== leadId));
  };


  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[91] bg-gradient-to-b from-[#fdf8ec] to-[#f7efd6] rounded-t-3xl shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.45)] flex flex-col"
            style={{ height: "82vh" }}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-amber-300/70 my-3 flex-shrink-0" />

            <div className="px-5 pb-3 border-b border-amber-200/50 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-amber-700">✦ Incoming ✦</p>
                <h2 className="font-display text-xl text-gold-gradient leading-tight">Pending Leads</h2>
                <p className="text-[11px] text-amber-900/60 mt-0.5">
                  {rows.length} pending · {ready.length} ready to start
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 grid place-items-center rounded-full bg-white border border-amber-300/60 shadow-sm active:scale-90"
              >
                <X className="h-4 w-4 text-amber-900" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {loading ? (
                <div className="grid place-items-center py-16 text-sm text-amber-900/60">Loading…</div>
              ) : (
                <>
                  {ready.length > 0 && (
                    <div className="space-y-2">
                      <p className="px-1 text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
                        ✓ Accepted — press Start Work
                      </p>
                      {ready.map((r) => (
                        <article
                          key={`ready-${r.leadId}`}
                          className="rounded-2xl bg-white border border-emerald-200/70 shadow-sm overflow-hidden"
                        >
                          <div className="p-3.5 flex items-start gap-3">
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-500 grid place-items-center text-white font-bold flex-shrink-0 shadow">
                              {(r.customerName || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-[15px] text-slate-800 truncate">
                                {r.customerName || "Customer"}
                              </p>
                              <p className="text-xs font-semibold text-emerald-800 mt-0.5">{r.subCategoryName}</p>
                              {r.address && (
                                <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
                                  <MapPin className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" /> {r.address}
                                </p>
                              )}
                              {r.note && (
                                <p className="mt-1.5 text-[11px] italic text-slate-600 line-clamp-2">"{r.note}"</p>
                              )}
                            </div>
                          </div>
                          <button
                            disabled={busy === r.leadId}
                            onClick={() => startWork(r.leadId)}
                            className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 active:from-emerald-600 active:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5 border-t border-emerald-100"
                          >
                            <Check className="h-3.5 w-3.5" /> Start Work — move to dashboard
                          </button>
                        </article>
                      ))}
                      <div className="h-px bg-amber-200/60 my-2" />
                    </div>
                  )}
                  {rows.length === 0 && ready.length === 0 ? (
                <div className="grid place-items-center py-16 text-center">
                  <Inbox className="h-12 w-12 text-amber-400/60 mb-3" />
                  <p className="font-display font-bold text-base text-amber-900">No pending leads</p>
                  <p className="text-xs text-amber-900/60 mt-1 px-8">
                    Jaise hi koi customer request bhejega, yahan turant dikhega.
                  </p>
                </div>
              ) : (
                rows.map((r) => (
                  <article
                    key={r.notificationId}
                    className="rounded-2xl bg-white border border-amber-200/60 shadow-sm overflow-hidden"
                  >
                    <div className="p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 grid place-items-center text-white font-bold flex-shrink-0 shadow">
                          {(r.customerName || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="font-display font-bold text-[15px] text-slate-800 truncate">
                              {r.customerName || "Customer"}
                            </p>
                            <span className="text-[10px] text-amber-700 flex items-center gap-0.5 flex-shrink-0">
                              <Clock className="h-2.5 w-2.5" /> {timeAgo(r.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-amber-800 mt-0.5">{r.subCategoryName}</p>
                          {r.itemNames.length > 0 && (
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                              {r.itemNames.join(" · ")}
                            </p>
                          )}
                          {r.address && (
                            <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
                              <MapPin className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" /> {r.address}
                            </p>
                          )}
                        </div>
                      </div>
                      {r.note && (
                        <p className="mt-2 text-[11px] italic text-slate-600 bg-amber-50/60 border border-amber-100 rounded-lg px-2 py-1.5">
                          "{r.note}"
                        </p>
                      )}
                    </div>
                    <div className="flex border-t border-amber-100">
                      <button
                        disabled={busy === r.leadId}
                        onClick={() => reject(r.leadId)}
                        className="flex-1 py-2.5 text-xs font-bold text-rose-600 active:bg-rose-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      {r.customerPhone && (
                        <a
                          href={`tel:${r.customerPhone}`}
                          className="px-4 grid place-items-center border-l border-amber-100 active:bg-amber-50"
                          aria-label="Call"
                        >
                          <Phone className="h-4 w-4 text-amber-700" />
                        </a>
                      )}
                      <button
                        disabled={busy === r.leadId}
                        onClick={() => accept(r.leadId)}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 active:from-emerald-600 active:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5 border-l border-amber-100"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
