import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  MapPin,
  Phone,
  Inbox,
  MessageCircle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type LeadUiStatus = "pending" | "in_process" | "success" | "rejected";

export type LeadFilter = "all" | LeadUiStatus;

type Row = {
  notificationId: string;
  leadId: string;
  status: LeadUiStatus;
  customerName: string | null;
  customerPhone: string | null;
  customerAvatar: string | null;
  subCategoryName: string;
  items: { name: string; image: string | null }[];
  address: string | null;
  note: string | null;
  createdAt: string;
  acceptedAt: string | null;
};

const STATUS_META: Record<LeadUiStatus, { label: string; tone: string; dot: string }> = {
  pending:    { label: "Pending",    tone: "bg-amber-50 text-amber-800 border-amber-200",     dot: "bg-amber-500" },
  in_process: { label: "In Process", tone: "bg-rose-50 text-rose-700 border-rose-200",         dot: "bg-rose-500" },
  success:    { label: "Success",    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  rejected:   { label: "Rejected",   tone: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400" },
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);
  return count;
}

export function VendorPendingLeadsSheet({
  open,
  onClose,
  initialFilter = "all",
  onOpenLead,
}: {
  open: boolean;
  onClose: () => void;
  initialFilter?: LeadFilter;
  onOpenLead?: (leadId: string) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeadFilter>(initialFilter);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => { if (open) setFilter(initialFilter); }, [open, initialFilter]);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;

    const load = async () => {
      setLoading(true);
      const { data: notifs } = await supabase
        .from("lead_notifications")
        .select("id, lead_id, status, created_at, responded_at, vendor_started_at, sub_category_name")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const list = (notifs ?? []) as any[];
      const leadIds = Array.from(new Set(list.map((n) => n.lead_id)));
      if (!leadIds.length) { if (alive) { setRows([]); setLoading(false); } return; }

      const { data: leads } = await supabase
        .from("leads")
        .select("id, customer_id, customer_name, customer_phone, sub_category_name, address, note, item_ids, item_names, images, status, created_at")
        .in("id", leadIds);
      const leadMap = new Map<string, any>((leads ?? []).map((l: any) => [l.id, l]));

      const customerIds = Array.from(new Set((leads ?? []).map((l: any) => l.customer_id).filter(Boolean))) as string[];
      const itemIds = Array.from(new Set((leads ?? []).flatMap((l: any) => (l.item_ids ?? []) as string[])));

      const [{ data: customers }, { data: items }] = await Promise.all([
        customerIds.length
          ? supabase.from("customers").select("user_id, name, phone, avatar_url").in("user_id", customerIds)
          : Promise.resolve({ data: [] as any[] }),
        itemIds.length
          ? supabase.from("catalog_items").select("id, name, image_url").in("id", itemIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const custMap = new Map<string, any>((customers ?? []).map((c: any) => [c.user_id, c]));
      const itemMap = new Map<string, { name: string; image: string | null }>(
        (items ?? []).map((it: any) => [it.id, { name: it.name, image: it.image_url ?? null }]),
      );

      const mapped: Row[] = list.map((n) => {
        const lead = leadMap.get(n.lead_id) ?? {};
        const cust = custMap.get(lead.customer_id) ?? {};
        const ids: string[] = lead.item_ids ?? [];
        const names: string[] = lead.item_names ?? [];
        const imgs: string[] = lead.images ?? [];
        const rowItems = ids.length
          ? ids.map((id, idx) => {
              const info = itemMap.get(id);
              return { name: info?.name || names[idx] || "Item", image: info?.image ?? imgs[idx] ?? null };
            })
          : [{ name: lead.sub_category_name ?? n.sub_category_name ?? "Service", image: imgs[0] ?? null }];

        // Derive UI status
        let uiStatus: LeadUiStatus;
        if (n.status === "rejected" || n.status === "expired") uiStatus = "rejected";
        else if (n.status === "pending") uiStatus = "pending";
        else if (lead.status === "completed") uiStatus = "success";
        else uiStatus = "in_process";

        return {
          notificationId: n.id,
          leadId: n.lead_id,
          status: uiStatus,
          customerName: cust.name ?? lead.customer_name ?? "Customer",
          customerPhone: cust.phone ?? lead.customer_phone ?? null,
          customerAvatar: cust.avatar_url ?? null,
          subCategoryName: lead.sub_category_name ?? n.sub_category_name ?? "Service",
          items: rowItems,
          address: lead.address ?? null,
          note: lead.note ?? null,
          createdAt: n.created_at,
          acceptedAt: n.responded_at ?? null,
        };
      });

      if (alive) { setRows(mapped); setLoading(false); }
    };
    load();
    const ch = supabase
      .channel(`vendor-leads-mgr-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [open, user]);

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, in_process: 0, success: 0, rejected: 0 } as Record<LeadFilter, number>;
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const visible = useMemo(
    () => filter === "all" ? rows : rows.filter((r) => r.status === filter),
    [rows, filter],
  );

  const moveTo = async (leadId: string, next: LeadUiStatus) => {
    setBusy(leadId);
    setMenuFor(null);
    const { data, error } = await supabase.rpc("set_my_lead_status", { _lead_id: leadId, _status: next });
    setBusy(null);
    const res = data as any;
    if (error || !res?.ok) {
      toast.error(res?.reason ?? error?.message ?? "Status update failed");
      return;
    }
    // Optimistic local update
    setRows((p) => p.map((r) => (r.leadId === leadId ? { ...r, status: next } : r)));
    toast.success(`Moved to ${STATUS_META[next].label}`);
  };

  const openChat = (leadId: string) => {
    onClose();
    if (onOpenLead) onOpenLead(leadId);
    else navigate({ to: "/vendor/chat", search: { leadId } as any });
  };

  const FILTERS: { key: LeadFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_process", label: "In Process" },
    { key: "success", label: "Success" },
    { key: "rejected", label: "Rejected" },
  ];

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
            style={{ height: "86vh" }}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-amber-300/70 my-3 flex-shrink-0" />

            <div className="px-5 pb-3 border-b border-amber-200/50 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-amber-700">✦ Lead Manager ✦</p>
                <h2 className="font-display text-xl text-gold-gradient leading-tight">My Leads</h2>
                <p className="text-[11px] text-amber-900/60 mt-0.5">
                  {counts.pending} pending · {counts.in_process} in process · {counts.success} success
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

            {/* Status filter pills */}
            <div className="flex gap-1.5 px-3 pt-2.5 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0 border-b border-amber-200/40">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                      active
                        ? "bg-amber-900 text-amber-50 border-amber-900 shadow"
                        : "bg-white/80 text-amber-900 border-amber-200"
                    }`}
                  >
                    {f.label} <span className={`ml-1 ${active ? "text-amber-200" : "text-amber-700"}`}>{counts[f.key]}</span>
                  </button>
                );
              })}
            </div>

            <div
              className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
            >
              {loading ? (
                <div className="grid place-items-center py-16 text-sm text-amber-900/60">
                  <Loader2 className="h-5 w-5 animate-spin mb-2" /> Loading…
                </div>
              ) : visible.length === 0 ? (
                <div className="grid place-items-center py-16 text-center">
                  <Inbox className="h-12 w-12 text-amber-400/60 mb-3" />
                  <p className="font-display font-bold text-base text-amber-900">No leads here</p>
                  <p className="text-xs text-amber-900/60 mt-1 px-8">
                    {filter === "all"
                      ? "Jaise hi koi customer request bhejega, yahan turant dikhega."
                      : `Koi lead ${STATUS_META[filter as LeadUiStatus]?.label ?? filter} mein nahi hai.`}
                  </p>
                </div>
              ) : (
                visible.map((r) => {
                  const meta = STATUS_META[r.status];
                  const showMenu = menuFor === r.notificationId;
                  return (
                    <article
                      key={r.notificationId}
                      className="rounded-2xl bg-white border border-amber-200/60 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => openChat(r.leadId)}
                        className="w-full text-left p-3.5 active:bg-amber-50/40 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-amber-200 to-amber-500 grid place-items-center text-white font-bold flex-shrink-0 shadow border-2 border-white">
                            {r.customerAvatar ? (
                              <img src={r.customerAvatar} alt={r.customerName ?? ""} className="h-full w-full object-cover" />
                            ) : (
                              (r.customerName || "C").charAt(0).toUpperCase()
                            )}
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
                            {r.customerPhone && (
                              <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" /> {r.customerPhone}
                              </p>
                            )}
                            {r.address && (
                              <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
                                <MapPin className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" /> {r.address}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Product thumbnails */}
                        {r.items.length > 0 && (
                          <div className="mt-2.5 flex gap-1.5 flex-wrap">
                            {r.items.slice(0, 4).map((it, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                                <div className="h-7 w-7 rounded-md overflow-hidden bg-white border border-amber-100 flex-shrink-0 grid place-items-center">
                                  {it.image ? (
                                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-[8px] font-bold text-slate-400">{it.name.charAt(0)}</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-amber-900 truncate max-w-[90px]">{it.name}</span>
                              </div>
                            ))}
                            {r.items.length > 4 && (
                              <span className="text-[10px] font-bold text-amber-700 self-center">+{r.items.length - 4}</span>
                            )}
                          </div>
                        )}

                        {r.note && (
                          <p className="mt-2 text-[11px] italic text-slate-600 bg-amber-50/60 border border-amber-100 rounded-lg px-2 py-1.5 line-clamp-2">
                            "{r.note}"
                          </p>
                        )}
                      </button>

                      {/* Action footer: status pill + quick actions */}
                      <div className="flex items-stretch border-t border-amber-100 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuFor(showMenu ? null : r.notificationId); }}
                          disabled={busy === r.leadId}
                          className={`flex-1 px-3 py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:bg-slate-50 ${meta.tone} border-r border-amber-100`}
                        >
                          <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                          {busy === r.leadId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {r.customerPhone && (
                          <a
                            href={`tel:${r.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 grid place-items-center border-r border-amber-100 active:bg-amber-50"
                            aria-label="Call"
                          >
                            <Phone className="h-4 w-4 text-amber-700" />
                          </a>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openChat(r.leadId); }}
                          className="px-3 grid place-items-center active:bg-emerald-50"
                          aria-label="Chat"
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-700" />
                        </button>

                        {showMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute left-2 bottom-full mb-1 z-10 bg-white rounded-xl border border-amber-200 shadow-xl py-1 w-44"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(["pending", "in_process", "success", "rejected"] as LeadUiStatus[])
                              .filter((s) => s !== r.status)
                              .map((s) => {
                                const m = STATUS_META[s];
                                return (
                                  <button
                                    key={s}
                                    onClick={() => moveTo(r.leadId, s)}
                                    className="w-full px-3 py-2 text-[12px] font-semibold text-left flex items-center gap-2 hover:bg-amber-50"
                                  >
                                    <span className={`inline-block h-2 w-2 rounded-full ${m.dot}`} />
                                    Move to {m.label}
                                    {s === "success" && <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-auto" />}
                                    {s === "rejected" && <XCircle className="h-3 w-3 text-rose-600 ml-auto" />}
                                  </button>
                                );
                              })}
                          </motion.div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
