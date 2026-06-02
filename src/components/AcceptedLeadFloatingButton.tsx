import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, X } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type AcceptedLead = {
  notificationId: string;
  leadId: string;
  subCategoryName: string | null;
  acceptedAt: string;
};

const STORAGE_POS_KEY = "ko-accepted-fab-pos-v1";
const STORAGE_DISMISS_KEY = "ko-accepted-fab-dismissed-v1";

/**
 * Floating, draggable button shown on the vendor dashboard after the vendor
 * accepts a lead. Tap → opens chat with that lead. User can drag anywhere on
 * the screen (position persists). X dismisses until next accept.
 */
export function AcceptedLeadFloatingButton() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState<AcceptedLead[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(STORAGE_DISMISS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Only render for vendor accounts and vendor routes
  const isVendor = profile?.role === "vendor" || profile?.is_vendor === true;
  const onVendorRoute = location.pathname.startsWith("/vendor");
  const onChatRoute = location.pathname.startsWith("/vendor/chat");
  const shouldShow = isVendor && onVendorRoute && !onChatRoute;

  // Load saved position
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_POS_KEY);
      if (raw) setPos(JSON.parse(raw));
      else setPos({ x: window.innerWidth - 84, y: window.innerHeight - 220 });
    } catch {
      setPos({ x: window.innerWidth - 84, y: window.innerHeight - 220 });
    }
  }, []);

  // Fetch & subscribe accepted leads
  useEffect(() => {
    if (!user || !shouldShow) return;
    let cancelled = false;

    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("lead_notifications")
        .select("id, lead_id, status, responded_at, created_at, sub_category_name")
        .eq("vendor_id", user.id)
        .eq("status", "accepted")
        .gte("created_at", since)
        .order("responded_at", { ascending: false, nullsFirst: false })
        .limit(5);
      if (cancelled) return;
      const mapped: AcceptedLead[] = (data ?? []).map((r: any) => ({
        notificationId: r.id,
        leadId: r.lead_id,
        subCategoryName: r.sub_category_name,
        acceptedAt: r.responded_at ?? r.created_at,
      }));
      setLeads(mapped);
    };
    load();

    const ch = supabase
      .channel(`accepted-lead-fab-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          if (row.status !== "accepted") return;
          setLeads((p) => {
            const exists = p.find((l) => l.notificationId === row.id);
            const next: AcceptedLead = {
              notificationId: row.id,
              leadId: row.lead_id,
              subCategoryName: row.sub_category_name,
              acceptedAt: row.responded_at ?? row.created_at,
            };
            return exists
              ? p.map((l) => (l.notificationId === row.id ? next : l))
              : [next, ...p].slice(0, 5);
          });
          // New accept → un-dismiss this id
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

  if (!shouldShow || !pos) return null;

  const visible = leads.filter((l) => !dismissedIds.has(l.notificationId));
  if (visible.length === 0) return null;
  const top = visible[0];

  const persistPos = (x: number, y: number) => {
    try { window.localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({ x, y })); } catch { /* ignore */ }
  };

  const handleDismiss = () => {
    setDismissedIds((s) => {
      const n = new Set(s);
      visible.forEach((l) => n.add(l.notificationId));
      try { window.localStorage.setItem(STORAGE_DISMISS_KEY, JSON.stringify([...n])); } catch { /* ignore */ }
      return n;
    });
  };

  const handleOpen = () => {
    navigate({ to: "/vendor/chat", search: { leadId: top.leadId } as any });
  };

  // Bounds for drag
  const w = typeof window !== "undefined" ? window.innerWidth : 360;
  const h = typeof window !== "undefined" ? window.innerHeight : 640;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[90] pointer-events-none">
      <AnimatePresence>
        <motion.div
          key="acc-fab"
          drag
          dragMomentum={false}
          dragConstraints={{ left: 8, right: w - 72, top: 60, bottom: h - 100 }}
          initial={{ scale: 0.6, opacity: 0, x: pos.x, y: pos.y }}
          animate={{ scale: 1, opacity: 1, x: pos.x, y: pos.y }}
          exit={{ scale: 0.6, opacity: 0 }}
          onDragEnd={(_, info) => {
            const x = Math.max(8, Math.min(w - 72, pos.x + info.offset.x));
            const y = Math.max(60, Math.min(h - 100, pos.y + info.offset.y));
            setPos({ x, y });
            persistPos(x, y);
          }}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{ touchAction: "none" }}
        >
          <div className="relative">
            <button
              type="button"
              onClick={handleOpen}
              aria-label={`Open accepted lead${top.subCategoryName ? `: ${top.subCategoryName}` : ""}`}
              className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_10px_28px_-4px_rgba(5,150,105,0.7)] border-[3px] border-white grid place-items-center active:scale-95"
            >
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-400/50"
                animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <Headphones className="h-7 w-7 text-white relative z-10" strokeWidth={2.4} />
              {visible.length > 1 && (
                <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold grid place-items-center border-2 border-white">
                  {visible.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Hide"
              className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-white border border-amber-300 grid place-items-center text-amber-900 shadow active:scale-90"
            >
              <X className="h-3 w-3" />
            </button>
            {top.subCategoryName && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-900/90 text-white text-[10px] font-semibold shadow">
                {top.subCategoryName}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
