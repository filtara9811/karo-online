import { useEffect, useRef, useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Phone, Mic, Loader2, Check, X, Star, ShieldCheck, Sparkles, Pencil, Trash2, Volume2, VolumeX, Eye, Paperclip, Image as ImageIcon, Camera, CreditCard, Package, MapPin } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { playPing } from "@/lib/lead-sound";
import { speakHindi } from "@/lib/tts";
import whatsappIcon from "@/assets/whatsapp-icon.png";

function haptic(ms = 12) {
  try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms); } catch { /* ignore */ }
}


export type LeadChatPeer = {
  id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
  subtitle?: string | null;
};

type Msg = {
  id: string;
  lead_id: string;
  sender_id: string;
  sender_role: "customer" | "vendor";
  recipient_id: string | null;
  body: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  edited_at?: string | null;
  original_body?: string | null;
};

type Props = {
  leadId: string;
  peer: LeadChatPeer | null;
  myRole: "customer" | "vendor";
  onBack?: () => void;
};

const QUICK_CHIPS_CUSTOMER = [
  { label: "When can you reach?", emoji: "⏰" },
  { label: "Send price quote", emoji: "💰" },
  { label: "Share location", emoji: "📍" },
  { label: "Confirm booking", emoji: "✅" },
];
const QUICK_CHIPS_VENDOR = [
  { label: "On the way 🛵", emoji: "🛵" },
  { label: "Reaching in 15 min", emoji: "⏰" },
  { label: "Service complete ✅", emoji: "✅" },
  { label: "Share invoice", emoji: "🧾" },
];

const STATUS_FLOW = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
] as const;

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

export function LeadChatThread({ leadId, peer, myRole, onBack }: Props) {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leadStatus, setLeadStatus] = useState<string>("pending");
  const [acting, setActing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rated, setRated] = useState<number>(0);
  const [actionMsg, setActionMsg] = useState<Msg | null>(null);
  const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
  const [editText, setEditText] = useState("");
  const [viewOriginal, setViewOriginal] = useState<Msg | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; price: number | null; image: string | null }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [ttsOn, setTtsOn] = useState(true);
  const lastSpokenId = useRef<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heardMessageIds = useRef<Set<string>>(new Set());
  const chips = myRole === "vendor" ? QUICK_CHIPS_VENDOR : QUICK_CHIPS_CUSTOMER;

  // Identify self
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Load lead status
  useEffect(() => {
    if (!leadId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("leads").select("status").eq("id", leadId).maybeSingle();
      if (alive && data?.status) setLeadStatus(data.status);
    })();
    const ch = supabase
      .channel(`lead-status-${leadId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId}` },
        (p) => { const s = (p.new as any)?.status; if (s) setLeadStatus(s); })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [leadId]);

  // Initial messages
  useEffect(() => {
    if (!leadId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const query = supabase
        .from("lead_messages")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });
      const { data } = peer?.id
        ? await query.or(`sender_id.eq.${peer.id},recipient_id.eq.${peer.id}`)
        : await query;
      if (!alive) return;
      setMessages((data ?? []) as Msg[]);
      setLoading(false);
      requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 9e6 }));
    })();
    return () => { alive = false; };
  }, [leadId, peer?.id]);

  // Realtime messages
  useEffect(() => {
    if (!leadId || !me) return;
    const ch = supabase
      .channel(`lead-msg-${leadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const m = payload.new as Msg;
          if (peer?.id && m.sender_id !== peer.id && m.recipient_id !== peer.id) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== me && !heardMessageIds.current.has(m.id)) {
            heardMessageIds.current.add(m.id);
            playPing("message");
            haptic(20);
            if (ttsOn && m.body && lastSpokenId.current !== m.id) {
              lastSpokenId.current = m.id;
              speakHindi(m.body, { dedupKey: m.id, ignoreMute: true });
            }
          }
          requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 9e6, behavior: "smooth" }));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId, peer?.id, me, ttsOn]);

  const send = async (override?: string) => {
    const body = (override ?? text).trim();
    if (!body || !me || sending) return;
    setSending(true);
    if (!override) setText("");
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`, lead_id: leadId, sender_id: me, sender_role: myRole,
      recipient_id: peer?.id ?? null, body, image_url: null, read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 9e6, behavior: "smooth" }));
    const { data, error } = await supabase
      .from("lead_messages")
      .insert({ lead_id: leadId, sender_id: me, sender_role: myRole, recipient_id: peer?.id ?? null, body })
      .select("*").single();
    setSending(false);
    if (error) {
      setMessages((p) => p.filter((m) => m.id !== optimistic.id));
      if (!override) setText(body);
      toast.error("Message bhej nahi paaye. Dobara try karein.");
      return;
    }
    setMessages((p) => p.map((m) => (m.id === optimistic.id ? (data as Msg) : m)));
  };

  const updateLeadStatus = async (next: string, successMsg: string) => {
    if (acting) return;
    setActing(true);
    const { error } = await supabase.from("leads").update({ status: next }).eq("id", leadId);
    setActing(false);
    if (error) { toast.error("Update nahi ho paya. Dobara try karein."); return; }
    setLeadStatus(next);
    toast.success(successMsg);
    if (next === "completed" && myRole === "customer") setShowRating(true);
  };


  const uploadAndSendImage = async (file: File) => {
    if (!me) return;
    try {
      const path = `${leadId}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const up = await supabase.storage.from("chat-media").upload(path, file, { upsert: false, contentType: file.type });
      let imageUrl: string | null = null;
      if (!up.error) {
        imageUrl = supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl;
      } else {
        // Fallback: inline base64 (small previews only)
        if (file.size < 250_000) {
          imageUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
        } else {
          toast.error("Image upload nahi ho paya. Storage 'chat-media' setup karein.");
          return;
        }
      }
      const { error } = await supabase.from("lead_messages").insert({
        lead_id: leadId, sender_id: me, sender_role: myRole, recipient_id: peer?.id ?? null,
        body: null, image_url: imageUrl,
      });
      if (error) toast.error("Image send fail");
    } catch { toast.error("Image send fail"); }
  };

  const sendPaymentLink = () => {
    const amt = window.prompt("Amount (₹) for payment request?");
    if (!amt) return;
    const n = Number(amt.replace(/[^\d.]/g, ""));
    if (!n || n <= 0) { toast.error("Sahi amount daaliye"); return; }
    send(`💳 Payment Request: ₹${n}\nTap to pay (UPI link coming).`);
  };

  const shareLocation = () => {
    if (!("geolocation" in navigator)) { toast.error("Location not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        send(`📍 My location: ${url}`);
      },
      () => toast.error("Location permission denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const loadCatalog = async () => {
    if (!me) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("catalog_items") as any)
      .select("id,name,price,image_url,vendor_id")
      .eq("vendor_id", me)
      .limit(40);
    setCatalog((data ?? []).map((r: { id: string; name: string; price: number | null; image_url: string | null }) => ({
      id: r.id, name: r.name, price: r.price, image: r.image_url,
    })));
  };

  const stepIndex = Math.max(0, STATUS_FLOW.findIndex((s) => s.key === leadStatus));
  const isPending = leadStatus === "pending" || leadStatus === "new" || leadStatus === "accepted";
  const showApproveBanner = myRole === "customer" && isPending;
  const showCompleteBanner = myRole === "customer" && (leadStatus === "approved" || leadStatus === "in_progress");
  const showVendorComplete = myRole === "vendor" && leadStatus === "approved";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-[#f4f4f6] to-[#e9eaee]">
      {/* Header — gold accent like classic chat */}
      <header className="flex-shrink-0 bg-gradient-to-b from-[#3f4750] to-[#1a1d22] text-white shadow-md">
        <div className="flex items-center gap-2.5 px-3 py-3">
          {peer?.avatar_url ? (
            <img src={peer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-[#d4af37]/70" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#d4af37] to-[#92400e] grid place-items-center text-sm font-display font-bold border-2 border-[#d4af37]/70">
              {peer?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold truncate flex items-center gap-1.5">
              {peer?.name ?? "Vendor"}
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </p>
            <p className="text-[11px] opacity-80 truncate flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {peer?.subtitle ?? "Live · Lead chat"}
            </p>
          </div>
          <button
            onClick={() => { haptic(); setTtsOn((v) => !v); toast.success(ttsOn ? "Read-aloud off" : "Read-aloud on"); }}
            aria-label="Toggle read aloud"
            className="h-9 w-9 grid place-items-center rounded-full bg-white/10 active:scale-90"
          >
            {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-60" />}
          </button>
          <button
            onClick={() => { haptic(); onBack ? onBack() : navigate({ to: myRole === "vendor" ? "/vendor/dashboard" : "/quick" }); }}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>


        {/* Status pipeline */}
        <div className="px-3 pb-2.5 flex items-center gap-1.5">
          {STATUS_FLOW.map((s, i) => {
            const done = i <= stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s.key} className="flex items-center gap-1.5 flex-1 min-w-0">
                <motion.span
                  animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    done ? "bg-[#fbbf24]" : "bg-white/25"
                  } ${active ? "ring-2 ring-[#fbbf24]/40" : ""}`}
                />
                <span className={`text-[9px] font-display font-semibold uppercase tracking-wider truncate ${done ? "text-[#fde68a]" : "text-white/45"}`}>
                  {s.label}
                </span>
                {i < STATUS_FLOW.length - 1 && (
                  <span className={`flex-1 h-px ${done ? "bg-[#fbbf24]/60" : "bg-white/15"}`} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Approve / Complete action banner */}
      <AnimatePresence>
        {(showApproveBanner || showCompleteBanner || showVendorComplete) && (
          <motion.div
            initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
            className="flex-shrink-0 bg-gradient-to-r from-[#fff8dc] via-[#fde68a] to-[#fff8dc] border-b-2 border-[#d4af37]/60 shadow-sm"
          >
            <div className="px-3 py-2.5 flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#d97706] to-[#92400e] grid place-items-center shadow flex-shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-display font-bold uppercase tracking-wider text-[#92400e]">
                  Action required
                </p>
                <p className="text-[12px] font-semibold text-[#7c2d12] leading-tight truncate">
                  {showApproveBanner && "Vendor ko approve karein agar baat ho gayi ho."}
                  {showCompleteBanner && "Service complete ho gayi? Mark karein."}
                  {showVendorComplete && "Customer se approve hua. Service complete hone par mark karein."}
                </p>
              </div>
              {showApproveBanner && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    disabled={acting}
                    onClick={() => updateLeadStatus("declined", "Vendor declined")}
                    className="h-8 px-3 rounded-full bg-white border border-red-300 text-red-600 text-[11px] font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> No
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    disabled={acting}
                    onClick={() => updateLeadStatus("approved", "Vendor approved! ✅")}
                    className="h-8 px-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[11px] font-bold shadow flex items-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
                  </motion.button>
                </div>
              )}
              {(showCompleteBanner || showVendorComplete) && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={acting}
                  onClick={() => updateLeadStatus("completed", "Marked as completed 🎉")}
                  className="h-8 px-3.5 rounded-full bg-gradient-to-r from-[#d97706] to-[#92400e] text-white text-[11px] font-bold shadow flex items-center gap-1 active:scale-95 disabled:opacity-50 flex-shrink-0"
                >
                  {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Mark Complete
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed → Rate strip (customer side) */}
      {myRole === "customer" && leadStatus === "completed" && rated === 0 && (
        <button
          onClick={() => setShowRating(true)}
          className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 border-b border-amber-300 flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Star className="h-4 w-4 text-amber-600" fill="currentColor" />
          <span className="text-xs font-display font-bold text-amber-800">Rate karein — vendor ki service kaisi rahi?</span>
        </button>
      )}

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#d97706]" />
          </div>
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-xs text-slate-500 py-20">
            <span className="inline-block text-4xl mb-2">👋</span>
            <p className="font-semibold">Say hi — start the conversation.</p>
            <p className="text-[10px] text-slate-400 mt-1">Aapki messages secure aur live sync hote hain.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((m) => {
              const mine = m.sender_id === me;
              const deleted = !!m.is_deleted;
              const startLong = () => {
                if (!mine || deleted || String(m.id).startsWith("tmp-")) return;
                longPressTimer.current = setTimeout(() => {
                  haptic(25);
                  setActionMsg(m);
                }, 450);
              };
              const cancelLong = () => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              };
              return (
                <motion.div
                  key={m.id} layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`flex ${mine ? "justify-end" : "justify-start"} items-end gap-1.5`}
                >
                  {!mine && !deleted && m.body && (
                    <button
                      aria-label="Read aloud"
                      onClick={() => { haptic(); speakHindi(m.body!, { force: true }); }}
                      className="h-7 w-7 grid place-items-center rounded-full bg-white border border-slate-200 shadow-sm active:scale-90 mb-1"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  )}
                  <div
                    onPointerDown={startLong}
                    onPointerUp={cancelLong}
                    onPointerLeave={cancelLong}
                    onContextMenu={(e) => { if (mine && !deleted) { e.preventDefault(); haptic(25); setActionMsg(m); } }}
                    onClick={() => { if (deleted && mine && m.original_body) setViewOriginal(m); }}
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl shadow-sm select-none ${
                      deleted
                        ? "bg-slate-100 text-slate-400 italic border border-slate-200 rounded-bl-sm rounded-br-sm"
                        : mine
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-sm"
                          : "bg-white border border-[color:oklch(0.78_0.14_82/0.30)] text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    {deleted ? (
                      <p className="text-sm leading-snug flex items-center gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" />
                        This message was deleted
                        {mine && m.original_body && <Eye className="h-3 w-3 ml-1 opacity-60" />}
                      </p>
                    ) : (
                      <>
                        {m.body && <p className="text-sm leading-snug whitespace-pre-wrap break-words">{m.body}</p>}
                        {m.image_url && (
                          <img src={m.image_url} alt="" className="mt-1 rounded-lg max-h-60 object-cover" />
                        )}
                      </>
                    )}
                    <p className={`text-[10px] mt-0.5 text-right ${deleted ? "text-slate-400" : mine ? "text-white/75" : "text-slate-400"}`}>
                      {fmtTime(m.created_at)}
                      {m.edited_at && !deleted && <span className="ml-1 opacity-80">(edited)</span>}
                      {mine && !deleted && <span className="ml-1 font-bold">✓✓</span>}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Quick-reply chips */}
      <div className="flex-shrink-0 px-3 pt-1.5 pb-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 w-max">
          {chips.map((c, i) => (
            <motion.button
              key={c.label}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => { haptic(18); send(c.label); }}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] shadow-sm active:scale-95"
            >
              <span className="text-xs">{c.emoji}</span>
              <span className="text-[11px] font-display font-semibold text-[color:oklch(0.30_0.05_85)] whitespace-nowrap">{c.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] bg-transparent">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.35)] px-3 py-2 shadow-sm">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="| Type a message…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:italic placeholder:text-[#9ca3af]"
            />
            <button aria-label="Mic" className="h-8 w-8 grid place-items-center rounded-full bg-[#f3f4f6] active:scale-90">
              <Mic className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
            </button>
            <button
              aria-label="Attach"
              onClick={() => { haptic(); setAttachOpen(true); }}
              className="h-8 w-8 grid place-items-center rounded-full bg-[color:oklch(0.96_0.05_82)] border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
            >
              <Paperclip className="h-4 w-4 text-[color:oklch(0.45_0.12_82)]" />
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => send()}
            disabled={!text.trim() || sending}
            aria-label="Send"
            className="h-11 w-11 grid place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md active:scale-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </motion.button>
        </div>
      </div>

      {/* Hidden file pickers */}
      <input
        ref={fileInputRef} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSendImage(f); e.target.value = ""; }}
      />
      <input
        ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSendImage(f); e.target.value = ""; }}
      />

      {/* Attachment sheet */}
      <AnimatePresence>
        {attachOpen && (
          <div className="fixed inset-0 z-[96] flex items-end justify-center">
            <motion.button
              aria-label="Close" onClick={() => setAttachOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl p-4 pb-7 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-3" />
              <p className="text-[11px] uppercase tracking-wider text-slate-500 text-center mb-4">Share with {peer?.name ?? "user"}</p>
              <div className="grid grid-cols-4 gap-3">
                <AttachTile
                  icon={Package} label="Catalog" tone="amber"
                  onClick={() => { haptic(); setAttachOpen(false); loadCatalog(); setCatalogOpen(true); }}
                />
                <AttachTile
                  icon={ImageIcon} label="Gallery" tone="violet"
                  onClick={() => { haptic(); setAttachOpen(false); fileInputRef.current?.click(); }}
                />
                <AttachTile
                  icon={Camera} label="Camera" tone="rose"
                  onClick={() => { haptic(); setAttachOpen(false); cameraInputRef.current?.click(); }}
                />
                <AttachTile
                  icon={CreditCard} label="Payment" tone="emerald"
                  onClick={() => { haptic(); setAttachOpen(false); sendPaymentLink(); }}
                />
                <AttachTile
                  icon={Phone} label="Call" tone="sky"
                  disabled={!peer?.phone}
                  onClick={() => { haptic(); setAttachOpen(false); if (peer?.phone) window.location.href = `tel:${peer.phone}`; else toast.error("Phone number nahi mila"); }}
                />
                <AttachTile
                  icon={WhatsAppIcon} label="WhatsApp" tone="green"
                  disabled={!peer?.phone}
                  onClick={() => { haptic(); setAttachOpen(false); if (peer?.phone) window.open(`https://wa.me/${peer.phone.replace(/\D/g, "")}`, "_blank"); else toast.error("Phone number nahi mila"); }}
                />
                <AttachTile
                  icon={MapPin} label="Location" tone="blue"
                  onClick={() => { haptic(); setAttachOpen(false); shareLocation(); }}
                />
                <AttachTile
                  icon={Sparkles} label="Quick quote" tone="gold"
                  onClick={() => { haptic(); setAttachOpen(false); send("💰 Quote: ₹___ (please confirm)"); }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Catalog sheet */}
      <AnimatePresence>
        {catalogOpen && (
          <div className="fixed inset-0 z-[97] flex items-end justify-center">
            <motion.button
              aria-label="Close" onClick={() => setCatalogOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl p-4 pb-7 shadow-2xl max-h-[75vh] flex flex-col"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-3" />
              <p className="font-display font-bold text-slate-800 mb-2 text-center">Send from catalog</p>
              <div className="overflow-y-auto flex-1 -mx-1 px-1">
                {catalog.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-12">No products found. Add items in your catalog first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {catalog.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => {
                          haptic();
                          const price = it.price != null ? ` — ₹${it.price}` : "";
                          send(`🛍️ ${it.name}${price}`);
                          setCatalogOpen(false);
                        }}
                        className="text-left rounded-2xl border border-slate-200 bg-white p-2 active:scale-[0.98] shadow-sm"
                      >
                        {it.image && <img src={it.image} alt="" className="w-full h-24 object-cover rounded-xl mb-1.5" />}
                        <p className="text-xs font-semibold text-slate-800 truncate">{it.name}</p>
                        {it.price != null && <p className="text-[11px] font-bold text-emerald-600">₹{it.price}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setCatalogOpen(false)} className="mt-3 w-full h-11 rounded-full bg-slate-100 text-sm font-semibold text-slate-600">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Action sheet (long-press own message) */}
      <AnimatePresence>
        {actionMsg && (
          <div className="fixed inset-0 z-[96] flex items-end justify-center">
            <motion.button
              aria-label="Close" onClick={() => setActionMsg(null)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl p-4 pb-6 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-3" />
              <p className="text-[11px] uppercase tracking-wider text-slate-500 text-center mb-3">Message actions</p>
              <div className="space-y-2">
                <button
                  onClick={() => { haptic(); setEditingMsg(actionMsg); setEditText(actionMsg?.body ?? ""); setActionMsg(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 active:scale-[0.98]"
                >
                  <Pencil className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700">Edit message</span>
                </button>
                <button
                  onClick={async () => {
                    const target = actionMsg; setActionMsg(null);
                    if (!target) return;
                    haptic(35);
                    const { error } = await supabase.from("lead_messages").update({
                      is_deleted: true,
                      deleted_at: new Date().toISOString(),
                      original_body: target.body,
                      body: null,
                    }).eq("id", target.id);
                    if (error) { toast.error("Delete nahi ho paya"); return; }
                    setMessages((prev) => prev.map((x) => x.id === target.id
                      ? { ...x, is_deleted: true, deleted_at: new Date().toISOString(), original_body: target.body, body: null }
                      : x));
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Delete for everyone</span>
                </button>
                <button
                  onClick={() => setActionMsg(null)}
                  className="w-full px-4 py-3 rounded-2xl text-sm font-semibold text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit composer */}
      <AnimatePresence>
        {editingMsg && (
          <div className="fixed inset-0 z-[97] flex items-end justify-center">
            <motion.button
              aria-label="Close" onClick={() => setEditingMsg(null)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl p-5 pb-6 shadow-2xl"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-3" />
              <p className="font-display font-bold text-slate-800 mb-2">Edit message</p>
              <textarea
                value={editText} onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditingMsg(null)} className="flex-1 h-11 rounded-full bg-slate-100 text-sm font-semibold text-slate-600">Cancel</button>
                <button
                  onClick={async () => {
                    const target = editingMsg; const next = editText.trim();
                    if (!target || !next || next === target.body) { setEditingMsg(null); return; }
                    const { error } = await supabase.from("lead_messages").update({
                      body: next,
                      edited_at: new Date().toISOString(),
                      original_body: target.original_body ?? target.body,
                    }).eq("id", target.id);
                    if (error) { toast.error("Edit nahi ho paya"); return; }
                    setMessages((prev) => prev.map((x) => x.id === target.id
                      ? { ...x, body: next, edited_at: new Date().toISOString(), original_body: x.original_body ?? x.body }
                      : x));
                    setEditingMsg(null);
                  }}
                  className="flex-1 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold"
                >Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Original content viewer (sender only) */}
      <AnimatePresence>
        {viewOriginal && (
          <div className="fixed inset-0 z-[98] grid place-items-center p-5">
            <motion.button
              aria-label="Close" onClick={() => setViewOriginal(null)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl"
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Original (only you can see)</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{viewOriginal.original_body}</p>
              <button onClick={() => setViewOriginal(null)} className="mt-4 w-full h-10 rounded-full bg-slate-900 text-white text-sm font-bold">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rating sheet */}
      <AnimatePresence>
        {showRating && (
          <InlineRatingSheet
            vendorName={peer?.name ?? "Vendor"}
            onClose={() => setShowRating(false)}
            onSubmit={(stars) => { setRated(stars); setShowRating(false); toast.success(`Thanks for rating ${stars}★`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InlineRatingSheet({
  vendorName, onClose, onSubmit,
}: { vendorName: string; onClose: () => void; onSubmit: (stars: number) => void }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center">
      <motion.button
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 mb-4" />
        <h3 className="font-display text-lg font-bold text-center text-slate-800">Rate {vendorName}</h3>
        <p className="text-xs text-slate-500 text-center mt-1">Aapka feedback baaki customers ki help karega.</p>
        <div className="flex items-center justify-center gap-2 mt-5">
          {[1,2,3,4,5].map((i) => {
            const filled = i <= (hover || stars);
            return (
              <motion.button
                key={i} whileTap={{ scale: 0.85 }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
                onClick={() => setStars(i)}
                className="active:scale-90"
              >
                <Star
                  className={`h-10 w-10 transition ${filled ? "text-amber-400" : "text-slate-200"}`}
                  fill={filled ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              </motion.button>
            );
          })}
        </div>
        <button
          disabled={stars === 0}
          onClick={() => onSubmit(stars)}
          className="mt-6 w-full h-12 rounded-full bg-gradient-to-r from-[#d97706] to-[#92400e] text-white font-display font-bold shadow-md active:scale-95 disabled:opacity-50"
        >
          Submit Rating
        </button>
      </motion.div>
    </div>
  );
}

function WhatsAppIcon() {
  return <img src={whatsappIcon} alt="" className="h-5 w-5" />;
}

type AttachTone = "amber" | "violet" | "rose" | "emerald" | "sky" | "green" | "blue" | "gold";
const TONE_MAP: Record<AttachTone, string> = {
  amber: "from-amber-100 to-amber-200 text-amber-700 border-amber-300",
  violet: "from-violet-100 to-violet-200 text-violet-700 border-violet-300",
  rose: "from-rose-100 to-rose-200 text-rose-700 border-rose-300",
  emerald: "from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-300",
  sky: "from-sky-100 to-sky-200 text-sky-700 border-sky-300",
  green: "from-green-100 to-green-200 text-green-700 border-green-300",
  blue: "from-blue-100 to-blue-200 text-blue-700 border-blue-300",
  gold: "from-[#fff8dc] to-[#fde68a] text-[#92400e] border-[#d4af37]/60",
};

function AttachTile({
  icon: Icon, label, tone, onClick, disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: AttachTone;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-40"
    >
      <span className={`h-14 w-14 grid place-items-center rounded-2xl bg-gradient-to-br border shadow-sm ${TONE_MAP[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">{label}</span>
    </button>
  );
}
