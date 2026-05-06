import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Phone, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
};

type Props = {
  leadId: string;
  peer: LeadChatPeer | null;
  myRole: "customer" | "vendor";
  onBack?: () => void;
};

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
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Identify self
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Initial load
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
      // For customer thread, scope to peer vendor; for vendor, peer is the customer
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

  // Realtime subscribe
  useEffect(() => {
    if (!leadId) return;
    const ch = supabase
      .channel(`lead-msg-${leadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const m = payload.new as Msg;
          // Filter to this peer thread on the client
          if (peer?.id && m.sender_id !== peer.id && m.recipient_id !== peer.id) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 9e6, behavior: "smooth" }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId, peer?.id]);

  const send = async () => {
    const body = text.trim();
    if (!body || !me || sending) return;
    setSending(true);
    setText("");
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      lead_id: leadId,
      sender_id: me,
      sender_role: myRole,
      recipient_id: peer?.id ?? null,
      body,
      image_url: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 9e6, behavior: "smooth" }));
    const { data, error } = await supabase
      .from("lead_messages")
      .insert({
        lead_id: leadId,
        sender_id: me,
        sender_role: myRole,
        recipient_id: peer?.id ?? null,
        body,
      })
      .select("*")
      .single();
    setSending(false);
    if (error) {
      setMessages((p) => p.filter((m) => m.id !== optimistic.id));
      setText(body);
      return;
    }
    setMessages((p) => p.map((m) => (m.id === optimistic.id ? (data as Msg) : m)));
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f5f6f8]">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-3 bg-gradient-to-b from-[#3f4750] to-[#1a1d22] text-white shadow-md">
        <button
          onClick={() => (onBack ? onBack() : navigate({ to: myRole === "vendor" ? "/vendor/dashboard" : "/quick" }))}
          aria-label="Back"
          className="h-9 w-9 grid place-items-center rounded-full bg-white/10 active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {peer?.avatar_url ? (
          <img src={peer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-white/30" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-white/15 grid place-items-center text-sm font-bold">
            {peer?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold truncate">{peer?.name ?? "Chat"}</p>
          <p className="text-[11px] opacity-70 truncate">{peer?.subtitle ?? "Live · Lead chat"}</p>
        </div>
        {peer?.phone && (
          <a
            href={`tel:${peer.phone}`}
            aria-label="Call"
            className="h-10 w-10 grid place-items-center rounded-full bg-emerald-500 active:scale-90"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-20">
            Say hi 👋 — start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                    mine
                      ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-br-sm"
                      : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                  }`}
                >
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.image_url && (
                    <img src={m.image_url} alt="" className="mt-1 rounded-lg max-h-60 object-cover" />
                  )}
                  <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"} text-right`}>
                    {fmtTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="px-2 py-2 bg-white border-t border-slate-200 flex items-end gap-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 max-h-32"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          aria-label="Send"
          className="h-10 w-10 grid place-items-center rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md active:scale-95 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
