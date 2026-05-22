import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type NotifRow = {
  id: string;
  lead_id: string;
  status: string; // pending | accepted | rejected | sold_out
  sub_category_name: string;
  created_at: string;
  responded_at: string | null;
};

type LeadInfo = {
  id: string;
  customer_name: string | null;
  address: string | null;
  sub_category_id: string | null;
};

const STATUS_META: Record<string, { label: string; dot: string; tag: string }> = {
  pending: { label: "Naya Lead", dot: "bg-amber-500", tag: "bg-amber-100 text-amber-800 border-amber-300" },
  accepted: { label: "Accepted", dot: "bg-emerald-500", tag: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  rejected: { label: "Skipped", dot: "bg-slate-400", tag: "bg-slate-100 text-slate-700 border-slate-300" },
  sold_out: { label: "Sold Out", dot: "bg-rose-500", tag: "bg-rose-100 text-rose-700 border-rose-300" },
};

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function VendorNotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [leads, setLeads] = useState<Record<string, LeadInfo>>({});
  const [images, setImages] = useState<Record<string, string | null>>({});

  const unreadCount = notifs.filter((n) => n.status === "pending").length;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("lead_notifications")
        .select("id, lead_id, status, sub_category_name, created_at, responded_at")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!alive) return;
      const list = (data ?? []) as NotifRow[];
      setNotifs(list);

      // For accepted/in-progress leads the vendor can still read the row.
      // For pending leads, RLS blocks PII — we just show the sub_category_name
      // from the notification itself and skip address/customer name lookups.
      const acceptedIds = list.filter((n) => n.status === "accepted").map((n) => n.lead_id);
      if (acceptedIds.length > 0) {
        const { data: lrows } = await supabase
          .from("leads")
          .select("id, customer_name, address, sub_category_id")
          .in("id", acceptedIds);
        if (!alive) return;
        const lmap: Record<string, LeadInfo> = {};
        (lrows ?? []).forEach((r: any) => { lmap[r.id] = r; });
        setLeads(lmap);
        const subIds = Array.from(new Set((lrows ?? []).map((r: any) => r.sub_category_id).filter(Boolean)));
        if (subIds.length > 0) {
          const { data: cats } = await supabase
            .from("categories")
            .select("id, image_url")
            .in("id", subIds);
          if (!alive) return;
          const imap: Record<string, string | null> = {};
          (cats ?? []).forEach((c: any) => { imap[c.id] = c.image_url ?? null; });
          setImages(imap);
        }
      } else {
        setLeads({});
        setImages({});
      }
    };
    load();
    const ch = supabase
      .channel(`vendor-bell-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user]);

  const openLead = (n: NotifRow) => {
    setOpen(false);
    if (n.status === "accepted") {
      navigate({ to: "/vendor/chat", search: { leadId: n.lead_id } as any });
    } else {
      navigate({ to: "/vendor/lead/$id", params: { id: n.lead_id } });
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        className="relative h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm active:scale-90 shrink-0"
      >
        <Bell className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-rose-500 to-amber-600 text-[9px] font-bold text-white grid place-items-center border border-white shadow"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-[90]"
            />
            <motion.div
              initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed top-0 right-0 left-0 z-[91] bg-white rounded-b-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: "85vh" }}
            >
              <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between border-b border-amber-100">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-700">Lead Inbox</p>
                  <h3 className="font-display font-bold text-lg text-slate-800">Notifications · {notifs.length}</h3>
                </div>
                <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-full bg-gray-100 active:scale-90">
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {notifs.length === 0 && (
                  <div className="text-center py-12">
                    <Bell className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-700">Abhi koi notification nahi</p>
                    <p className="text-[11px] text-slate-500 mt-1">Naya lead aate hi yahan dikhega.</p>
                  </div>
                )}
                {notifs.map((n) => {
                  const meta = STATUS_META[n.status] ?? STATUS_META.pending;
                  const lead = leads[n.lead_id];
                  const subId = lead?.sub_category_id ?? null;
                  const img = subId ? images[subId] : null;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openLead(n)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-amber-50 active:bg-amber-100 transition text-left border border-transparent hover:border-amber-200"
                    >
                      <span className="relative h-12 w-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-gradient-to-br from-amber-100 to-amber-200 grid place-items-center">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Bell className="h-5 w-5 text-amber-700" />
                        )}
                        <span className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ${meta.dot} border-2 border-white`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-display font-bold text-sm text-slate-800 truncate flex-1">
                            {n.sub_category_name}
                          </p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${meta.tag}`}>{meta.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">
                          {lead?.customer_name || "Customer"}{lead?.address ? ` · ${lead.address}` : ""}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {timeAgo(n.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
