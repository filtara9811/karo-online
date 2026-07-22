import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, MapPin, PackageCheck, Route, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { LeadChatPeer } from "@/components/LeadChatThread";

type Props = {
  leadId: string;
  vendor: LeadChatPeer;
  category: string | null;
  productImage?: string | null;
  onBackToChat: () => void;
};

type LeadRow = {
  id: string;
  status: string | null;
  created_at: string;
  customer_approved_vendor_id?: string | null;
};

type StatusEvent = {
  id: string;
  status_key: string;
  message: string | null;
  created_at: string;
};

const STEPS = [
  { key: "placed", label: "Order Placed", icon: PackageCheck, tone: "slate" },
  { key: "accepted", label: "Vendor Accepted", icon: Check, tone: "emerald" },
  { key: "on_the_way", label: "On The Way", icon: Route, tone: "sky" },
  { key: "working", label: "Service Started", icon: Wrench, tone: "amber" },
  { key: "completed", label: "Completed", icon: Check, tone: "green" },
] as const;

function fmt(iso?: string | null) {
  if (!iso) return "Pending";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Live update";
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

export function LeadOrderStatusPanel({ leadId, vendor, category, productImage, onBackToChat }: Props) {
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [{ data: leadData }, { data: evs }] = await Promise.all([
        supabase
          .from("leads")
          .select("id,status,created_at,customer_approved_vendor_id")
          .eq("id", leadId)
          .maybeSingle(),
        supabase
          .from("vendor_status_updates")
          .select("id,status_key,message,created_at")
          .eq("lead_id", leadId)
          .eq("vendor_id", vendor.id)
          .order("created_at", { ascending: true }),
      ]);
      if (!alive) return;
      setLead((leadData as LeadRow | null) ?? null);
      setEvents((evs ?? []) as StatusEvent[]);
    };
    load();
    const ch = supabase
      .channel(`lead-order-status-${leadId}-${vendor.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_status_updates", filter: `lead_id=eq.${leadId}` }, (payload) => {
        const ev = payload.new as StatusEvent & { vendor_id?: string | null };
        if (ev.vendor_id && ev.vendor_id !== vendor.id) return;
        setEvents((prev) => (prev.some((x) => x.id === ev.id) ? prev : [...prev, ev]));
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [leadId, vendor.id]);

  const timeline = useMemo(() => {
    const reached = new Set<string>(["placed"]);
    const eventByKey = new Map(events.map((e) => [e.status_key, e]));
    const status = lead?.status ?? "";
    const approved = lead?.customer_approved_vendor_id === vendor.id || ["approved", "in_progress", "completed"].includes(status);
    if (approved || eventByKey.has("accepted")) reached.add("accepted");
    if (eventByKey.has("on_the_way") || eventByKey.has("arrived") || eventByKey.has("working") || eventByKey.has("completed")) reached.add("on_the_way");
    if (eventByKey.has("working") || eventByKey.has("completed")) reached.add("working");
    if (eventByKey.has("completed") || status === "completed") reached.add("completed");
    if (status === "completed") {
      STEPS.forEach((s) => reached.add(s.key));
    }
    const lastReached = Math.max(0, STEPS.findLastIndex((s) => reached.has(s.key)));
    return STEPS.map((step, index) => {
      const ev = step.key === "placed" ? null : eventByKey.get(step.key);
      const done = reached.has(step.key);
      return {
        ...step,
        done,
        active: index === lastReached && !reached.has("completed"),
        at: step.key === "placed" ? lead?.created_at : ev?.created_at,
        message: ev?.message,
      };
    });
  }, [events, lead, vendor.id]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-gradient-to-b from-[#fffaf0] to-white">
      <div className="flex-shrink-0 px-3 py-2 border-b border-amber-200/60 bg-white/90">
        <div className="flex items-center gap-2.5">
          <div className="h-12 w-12 rounded-2xl overflow-hidden bg-amber-50 border border-amber-200 flex-shrink-0">
            {productImage ? (
              <img src={productImage} alt={category ?? "Order"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-amber-700 font-display font-bold">
                {(category ?? "O")[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-700">Order Status</p>
            <h3 className="font-display text-[15px] font-bold text-slate-900 truncate">{category ?? "Service Request"}</h3>
            <p className="text-[11px] text-slate-500 truncate">#{leadId.slice(0, 8)} · {vendor.name}</p>
          </div>
          <button
            onClick={onBackToChat}
            className="h-9 px-3 rounded-full bg-slate-900 text-white text-[11px] font-bold active:scale-95"
          >
            Chat
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#3f4750] to-[#181b20] text-white shadow-md">
          <div className="h-24 bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#15803d] opacity-90" />
          <div className="px-3 pb-3 -mt-8 flex items-end gap-3">
            {vendor.avatar_url ? (
              <img src={vendor.avatar_url} alt={vendor.name} className="h-16 w-16 rounded-2xl object-cover border-4 border-white shadow" />
            ) : (
              <span className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] border-4 border-white shadow grid place-items-center font-display font-bold">
                {initials(vendor.name)}
              </span>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <p className="font-display text-base font-bold truncate">{vendor.name}</p>
              <p className="text-[11px] text-white/75 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Live service timeline
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 relative pl-1 pb-4">
          <div className="absolute left-[22px] top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 via-amber-300 to-slate-200" />
          <div className="space-y-3">
            {timeline.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex items-start gap-3"
                >
                  <div className="relative w-[44px] flex-shrink-0 flex justify-center pt-0.5">
                    {step.active ? (
                      <motion.span
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="h-11 w-11 rounded-full grid place-items-center bg-amber-500 text-white border-[3px] border-white shadow-md ring-4 ring-amber-200"
                      >
                        <Icon className="h-5 w-5" />
                      </motion.span>
                    ) : step.done ? (
                      <span className="h-8 w-8 rounded-full grid place-items-center bg-emerald-500 text-white shadow-sm">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="h-8 w-8 rounded-full grid place-items-center bg-white border-2 border-slate-300 text-[10px] font-bold text-slate-400">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className={`flex-1 min-w-0 rounded-xl px-3 py-2 border shadow-sm transition ${
                    step.active
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300"
                      : step.done
                        ? "bg-white border-emerald-100"
                        : "bg-white/70 border-slate-100"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-display text-[14px] font-bold leading-tight truncate ${step.done ? "text-slate-800" : "text-slate-400"}`}>
                        {step.label}
                      </p>
                      {step.active ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                      ) : null}
                    </div>
                    <p className={`text-[10px] mt-0.5 ${step.done ? "text-slate-500" : "text-slate-400 italic"}`}>
                      {step.done ? fmt(step.at) : "Pending…"}
                    </p>
                    {step.message ? <p className="text-[11px] text-slate-600 mt-1 leading-snug">{step.message}</p> : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}