import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  X,
  Phone,
  MapPin,
  Receipt,
  Clock,
  Loader2,
  Truck,
  Wrench,
  Flag,
  CheckCircle2,
  Menu as MenuIcon,
  ShoppingBag,
  Plus,
  Link as LinkIcon,
  Send,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LeadChatThread, type LeadChatPeer } from "@/components/LeadChatThread";
import type { Lead } from "@/lib/leads";

type Props = {
  open: boolean;
  lead: Lead | null;
  otherLeads?: Lead[]; // for top avatar strip
  onClose: () => void;
  onSwitchLead?: (id: string) => void;
};

type RealLead = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  sub_category_name: string;
  sub_category_id: string;
  note: string | null;
  address: string | null;
  status: string;
  accepted_vendor_ids: string[];
  lead_price_inr: number;
  created_at: string;
  images: string[] | null;
};

type StatusEvent = {
  id: string;
  status_key: string;
  message: string | null;
  created_at: string;
};

const STEPS: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "accepted", label: "Accepted", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#15803d" },
  { key: "on_the_way", label: "On the way", icon: <Truck className="h-3.5 w-3.5" />, color: "#0369a1" },
  { key: "arrived", label: "Arrived", icon: <MapPin className="h-3.5 w-3.5" />, color: "#7c3aed" },
  { key: "working", label: "Working", icon: <Wrench className="h-3.5 w-3.5" />, color: "#b45309" },
  { key: "completed", label: "Completed", icon: <Flag className="h-3.5 w-3.5" />, color: "#15803d" },
];

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const mon = d.toLocaleString("en-IN", { month: "short" }).toLowerCase();
  const day = d.getDate();
  const yr = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${day} ${mon} ${yr}  ${h}:${m} ${ap}`;
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} stroke="#e5e7eb" strokeWidth="3.5" fill="none" />
        <circle cx="22" cy="22" r={r} stroke="#15803d" strokeWidth="3.5" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-emerald-700">{pct}%</span>
    </div>
  );
}

type CustomStep = { key: string; label: string };

export function VendorLeadDetailSheet({ open, lead, otherLeads = [], onClose, onSwitchLead }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"progress" | "chat">("progress");
  const [showContact, setShowContact] = useState(false);
  const [real, setReal] = useState<RealLead | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [composeFor, setComposeFor] = useState<{ key: string; label: string } | null>(null);
  const [composeText, setComposeText] = useState("");
  const [composeLink, setComposeLink] = useState("");

  useEffect(() => {
    if (open) {
      setTab("progress");
      setShowContact(false);
    }
  }, [open, lead?.id]);

  // Load custom steps per-lead from localStorage
  useEffect(() => {
    if (!lead?.id) return;
    try {
      const raw = localStorage.getItem(`vendor:custom-steps:${lead.id}`);
      setCustomSteps(raw ? JSON.parse(raw) : []);
    } catch { setCustomSteps([]); }
  }, [lead?.id]);
  const persistSteps = (next: CustomStep[]) => {
    setCustomSteps(next);
    if (lead?.id) localStorage.setItem(`vendor:custom-steps:${lead.id}`, JSON.stringify(next));
  };

  useEffect(() => {
    if (!open || !lead) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, customer_id, customer_name, customer_phone, sub_category_name, sub_category_id, note, address, status, accepted_vendor_ids, lead_price_inr, created_at, images")
        .eq("id", lead.id)
        .maybeSingle();
      if (cancelled) return;
      setReal((data as RealLead) ?? null);
      const { data: evs } = await supabase
        .from("vendor_status_updates")
        .select("id, status_key, message, created_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setEvents((evs ?? []) as StatusEvent[]);
    })();
    const ch = supabase
      .channel(`sheet-lead-${lead.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "vendor_status_updates", filter: `lead_id=eq.${lead.id}` },
        (p) => setEvents((prev) => [...prev, p.new as StatusEvent]))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [open, lead?.id]);

  const isAccepted = !!user && !!real && (real.accepted_vendor_ids ?? []).includes(user.id);
  const reached = useMemo(() => {
    const s = new Set(events.map((e) => e.status_key));
    if (isAccepted) s.add("accepted");
    return s;
  }, [events, isAccepted]);

  const peer: LeadChatPeer | null = lead && real ? {
    id: real.customer_id,
    name: real.customer_name || lead.name || "Customer",
    avatar_url: lead.avatarUrl ?? null,
    phone: real.customer_phone || lead.phone || null,
    subtitle: real.sub_category_name,
  } : null;

  const sendStatus = async (status_key: string, opts?: { message?: string; link?: string }) => {
    if (!real || !user) return;
    setBusyKey(status_key);
    try {
      const { sendStatusPushToCustomer } = await import("@/lib/push.functions");
      const composedMsg = [opts?.message?.trim(), opts?.link?.trim()].filter(Boolean).join("\n") || null;
      const { error } = await supabase.from("vendor_status_updates").insert({
        lead_id: real.id, vendor_id: user.id, status_key, message: composedMsg,
      } as any);
      if (error) {
        toast.error(error.message);
      } else {
        await sendStatusPushToCustomer({ data: { lead_id: real.id, status_key } }).catch(() => {});
        const label = STEPS.find((s) => s.key === status_key)?.label ?? customSteps.find((s) => s.key === status_key)?.label ?? status_key;
        toast.success(`✓ Customer notified: ${label}`);
      }
    } finally {
      setBusyKey(null);
    }
  };

  if (!lead) return null;

  const phoneDigits = (real?.customer_phone ?? lead.phone ?? "").replace(/\D/g, "");
  const phoneDisplay = isAccepted
    ? (real?.customer_phone ?? lead.phone ?? "—")
    : phoneDigits.length >= 4 ? `•••• ${phoneDigits.slice(-4)}` : "—";

  const initial = (lead.name || "C").charAt(0).toUpperCase();
  const avatars = [lead, ...otherLeads.filter((l) => l.id !== lead.id)].slice(0, 6);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 z-[90]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.35 }}
            onDragEnd={(_: any, info: PanInfo) => {
              if (info.offset.y > 140 || info.velocity.y > 800) onClose();
            }}
            className="fixed left-0 right-0 bottom-0 z-[91] flex flex-col"
            style={{ height: "90vh" }}
          >
            {/* Drag handle */}
            <div className="grid place-items-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <span className="block h-1.5 w-12 rounded-full bg-white/40" />
            </div>

            {/* ===== Top: avatar strip — transparent so overlay gray shows through ===== */}
            <div className="relative pt-1 pb-3 px-4">
              <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide">
                {avatars.map((l) => {
                  const active = l.id === lead.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => onSwitchLead?.(l.id)}
                      className="relative flex-shrink-0 flex flex-col items-center gap-1 active:scale-90 transition"
                      aria-label={l.name}
                    >
                      <span className={`block h-11 w-11 rounded-full overflow-hidden border-2 ${active ? "border-amber-400 shadow-[0_4px_14px_-2px_rgba(217,119,6,0.65)]" : "border-white/30"}`}>
                        {l.avatarUrl ? (
                          <img src={l.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid place-items-center h-full w-full bg-gradient-to-br from-amber-300 to-amber-500 text-white font-display font-bold text-sm">
                            {l.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      {active && (
                        <span className="text-[10px] text-white font-medium max-w-[68px] truncate drop-shadow">
                          {l.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===== Body sheet ===== */}
            <div className="relative flex-1 rounded-t-3xl bg-[#f7f3ea] overflow-hidden flex flex-col">
              {/* Close X */}
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white grid place-items-center shadow-md border border-slate-200 active:scale-90"
              >
                <X className="h-4 w-4 text-slate-700" />
              </button>

              <div
                className="overflow-y-auto flex-1 pb-6"
                style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
              >
                {/* ===== Lead identity card ===== */}
                <section className="mx-3 mt-4 rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setShowContact((v) => !v)}
                      className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-amber-400 shadow active:scale-90 flex-shrink-0"
                      aria-label="Show contact details"
                    >
                      {lead.avatarUrl ? (
                        <img src={lead.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid place-items-center h-full w-full bg-gradient-to-br from-amber-200 to-amber-400 text-white font-display font-bold text-lg">
                          {initial}
                        </span>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-lg font-bold text-slate-900 leading-tight truncate">
                        {real?.customer_name || lead.name}
                      </p>
                      <button
                        onClick={() => setShowContact((v) => !v)}
                        className="text-[10px] text-slate-500 underline underline-offset-2"
                      >
                        Customer | details
                      </button>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {fmtDate(real?.created_at ?? lead.createdAtIso)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-slate-500">
                        Lead id - <span className="font-mono font-bold text-slate-700">{lead.leadCode}</span>
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-300 bg-emerald-50">
                        <ProgressRing pct={lead.progressPct ?? 25} />
                        <div className="flex flex-col leading-tight pr-1">
                          <span className="text-[11px] font-bold text-emerald-800 capitalize">
                            {isAccepted ? "Accepted" : "Pending"}
                          </span>
                          <span className="text-[8px] text-emerald-700 underline underline-offset-2">
                            Live status update
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact details — reveals on avatar/name tap */}
                  <AnimatePresence initial={false}>
                    {showContact && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-2">
                          <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={phoneDisplay} />
                          {(real?.address || lead.address) && (
                            <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={(real?.address ?? lead.address) || "—"} />
                          )}
                          <Row icon={<Receipt className="h-3.5 w-3.5" />} label="Lead ID" value={(real?.id ?? lead.id).slice(0, 8)} />
                          <Row icon={<Clock className="h-3.5 w-3.5" />} label="Created" value={new Date(real?.created_at ?? lead.createdAtIso ?? Date.now()).toLocaleString()} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ===== Inner product card ===== */}
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base font-bold text-slate-900 leading-tight truncate">
                        {real?.sub_category_name || lead.service}
                      </p>
                      <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                        {real?.note || lead.note || "Good and best service"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800">
                          ★ {lead.rating ?? 4.9}
                        </span>
                        <span className="font-display text-sm font-bold text-slate-800 underline underline-offset-2">
                          ₹ {Number(real?.lead_price_inr ?? lead.amount ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-[#eef0f3] grid place-items-center">
                      {lead.productImage ? (
                        <img src={lead.productImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 text-center leading-tight px-1">
                          {(lead.service || "").split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {/* ===== Tabs: Live progress / Chat (thinner) ===== */}
                <div className="mx-3 mt-3 grid grid-cols-2 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setTab("progress")}
                    className={`py-1.5 text-[12px] font-display font-bold ${tab === "progress" ? "bg-[#5c2018] text-white" : "bg-white text-slate-600"}`}
                  >
                    Live progress
                  </button>
                  <button
                    onClick={() => setTab("chat")}
                    className={`py-1.5 text-[12px] font-display font-bold ${tab === "chat" ? "bg-[#5c2018] text-white" : "bg-white text-slate-600"}`}
                  >
                    Chat 💬
                  </button>
                </div>

                {/* ===== Live Progress timeline ===== */}
                {tab === "progress" && (
                  <section className="mx-3 mt-3">
                    <h3 className="font-display font-bold text-base text-amber-900 underline underline-offset-4 mb-2 px-1">
                      Live progress
                    </h3>
                    <ol className="relative pl-12 space-y-2 before:content-[''] before:absolute before:left-[26px] before:top-3 before:bottom-6 before:border-l-2 before:border-dashed before:border-slate-300">
                      {[...STEPS, ...customSteps.map((c) => ({ key: c.key, label: c.label, icon: <Pencil className="h-3.5 w-3.5" />, color: "#5c2018" }))].map((s, idx) => {
                        const isReached = reached.has(s.key);
                        const evt = events.find((e) => e.status_key === s.key);
                        const isNext = !isReached && isAccepted &&
                          STEPS.slice(0, idx).every((p) => reached.has(p.key) || p.key === "accepted");
                        const NodeIcon = idx === 0 ? MenuIcon : idx === 1 ? ShoppingBag : null;
                        return (
                          <li key={s.key} className="relative">
                            <span
                              className={`absolute -left-12 top-1 h-9 w-9 rounded-full grid place-items-center border-2 ${
                                isReached
                                  ? "bg-emerald-500 border-white text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                                  : "bg-slate-700 border-white text-white/90"
                              }`}
                            >
                              {NodeIcon ? <NodeIcon className="h-3.5 w-3.5" /> : s.icon}
                            </span>
                            <button
                              disabled={!isAccepted || isReached || busyKey === s.key}
                              onClick={() => {
                                setComposeText("");
                                setComposeLink("");
                                setComposeFor({ key: s.key, label: s.label });
                              }}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl shadow-sm text-left disabled:opacity-60 active:scale-[0.98] transition"
                              style={{
                                background: isReached
                                  ? "linear-gradient(90deg, #d1fae5, #ffffff)"
                                  : isNext
                                    ? "linear-gradient(90deg, #fef3c7, #ffffff)"
                                    : "linear-gradient(90deg, #f5f5f5, #ffffff)",
                                border: "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              <span className={`font-display font-bold text-[13px] ${isReached ? "text-emerald-800" : "text-slate-800"}`}>
                                {busyKey === s.key ? (
                                  <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…</span>
                                ) : (
                                  `Update ${s.label}`
                                )}
                              </span>
                              <Plus className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                            {evt && (
                              <p className="mt-0.5 ml-1 text-[10px] text-slate-500">{new Date(evt.created_at).toLocaleTimeString()}</p>
                            )}
                          </li>
                        );
                      })}
                      <li className="relative">
                        <button
                          onClick={() => {
                            const label = window.prompt("Naya step ka naam (e.g. Payment requested)");
                            if (!label?.trim()) return;
                            const key = `custom_${Date.now()}`;
                            persistSteps([...customSteps, { key, label: label.trim() }]);
                          }}
                          className="absolute -left-12 top-1 h-9 w-9 rounded-full grid place-items-center bg-slate-900 text-white shadow active:scale-90"
                          aria-label="Add custom step"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <p className="text-[11px] text-slate-500 italic pt-2">Apna step add karein — customer ko link/payment bhi bhej sakte ho 🔔</p>
                      </li>
                    </ol>
                  </section>
                )}

                {/* ===== Chat tab — renders in the same area as progress ===== */}
                {tab === "chat" && peer && real && (
                  <section className="mx-3 mt-3 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ height: "48vh" }}>
                    <LeadChatThread
                      leadId={real.id}
                      peer={peer}
                      myRole="vendor"
                      onBack={() => setTab("progress")}
                    />
                  </section>
                )}
              </div>
            </div>

            {/* ===== Compose / Asset bottom sheet for a step ===== */}
            <AnimatePresence>
              {composeFor && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setComposeFor(null)}
                    className="absolute inset-0 bg-black/40 z-20"
                  />
                  <motion.div
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 280 }}
                    className="absolute left-0 right-0 bottom-0 z-30 bg-white rounded-t-3xl p-4 shadow-2xl"
                  >
                    <div className="grid place-items-center pb-2">
                      <span className="block h-1.5 w-12 rounded-full bg-slate-300" />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-display font-bold text-slate-900 text-base">
                        Update: <span className="text-[#5c2018]">{composeFor.label}</span>
                      </p>
                      <button onClick={() => setComposeFor(null)} className="h-7 w-7 rounded-full bg-slate-100 grid place-items-center">
                        <X className="h-3.5 w-3.5 text-slate-600" />
                      </button>
                    </div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Message (asset)</label>
                    <textarea
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      placeholder="Example: Aapka payment ka request — link ke through bharein"
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    />
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-3 block">Link (optional)</label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                      <LinkIcon className="h-4 w-4 text-slate-400" />
                      <input
                        value={composeLink}
                        onChange={(e) => setComposeLink(e.target.value)}
                        placeholder="https://pay.example/..."
                        className="flex-1 py-2 text-sm focus:outline-none bg-transparent"
                      />
                    </div>
                    <button
                      disabled={busyKey === composeFor.key}
                      onClick={async () => {
                        const key = composeFor.key;
                        await sendStatus(key, { message: composeText, link: composeLink });
                        setComposeFor(null);
                      }}
                      className="mt-4 w-full py-3 rounded-xl bg-[#5c2018] text-white font-display font-bold text-sm shadow-lg active:scale-[0.98] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {busyKey === composeFor.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send update to customer
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="h-7 w-7 rounded-full bg-amber-50 grid place-items-center text-amber-700 flex-shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-[0.18em] text-amber-700 font-bold">{label}</p>
        <p className="text-sm text-slate-800 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
