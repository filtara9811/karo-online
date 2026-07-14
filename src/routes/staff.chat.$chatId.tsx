import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listChatMessages, sendChatMessage } from "@/lib/staff.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff/chat/$chatId")({
  component: ChatDetailPage,
});

type Msg = { id: string; sender_id: string; body: string | null; sent_at: string };

function ChatDetailPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const fetchMsgs = useServerFn(listChatMessages);
  const send = useServerFn(sendChatMessage);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then((r) => setMe(r.data.user?.id ?? null));
  }, []);

  useEffect(() => {
    fetchMsgs({ data: { chat_id: chatId } }).then((r) => setMsgs(r as Msg[])).catch(() => {});
    const ch = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as Msg]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, fetchMsgs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await send({ data: { chat_id: chatId, body } });
    } catch { setText(body); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[oklch(0.98_0.008_88)]">
      <header className="flex items-center gap-3 px-3 py-3 bg-emerald-700 text-white shadow-md">
        <button onClick={() => navigate({ to: "/staff" })} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <div className="h-9 w-9 rounded-full bg-white/20 grid place-items-center font-semibold">C</div>
        <div>
          <p className="font-semibold text-sm">Chat</p>
          <p className="text-[10px] opacity-80">Online</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.95 0.04 85 / 0.3) 0, transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.9 0.06 88 / 0.2) 0, transparent 40%)" }}>
        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                mine ? "bg-emerald-500 text-white rounded-br-sm" : "bg-white text-foreground rounded-bl-sm"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[9px] mt-0.5 text-right ${mine ? "text-emerald-100" : "text-muted-foreground"}`}>
                  {new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">No messages yet. Say hi 👋</p>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 p-3 bg-white border-t border-[color:oklch(0.9_0.03_85)]">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..."
          className="flex-1 h-11 px-4 rounded-full bg-muted text-sm" />
        <button type="submit" disabled={sending || !text.trim()}
          className="h-11 w-11 grid place-items-center rounded-full bg-emerald-600 text-white disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
