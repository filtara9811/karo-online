import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Package, Send, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useShopChatRealtime } from "@/hooks/realtime/use-shop-chat-realtime";
import { optimizedImage, IMG } from "@/lib/img";
import { SheetShell } from "./SheetShell";

type Thread = {
  id: string;
  kind: string;
  status: string;
  quantity: number;
  visitor_name: string | null;
  visitor_phone: string | null;
  product_name: string | null;
  product_image: string | null;
  product_price: string | null;
  last_message_at: string;
};

type Msg = { id: string; sender: string; body: string; created_at: string };

/** Merchant side of the shopper chat: one thread per product inquiry / order. */
export function ShopChatsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("shop_threads" as never)
      .select("id, kind, status, quantity, visitor_name, visitor_phone, product_name, product_image, product_price, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(100);
    setThreads((data as unknown as Thread[]) ?? []);
  }, [user?.id]);

  const loadMessages = useCallback(async () => {
    if (!active?.id) return;
    const { data } = await supabase
      .from("shop_thread_messages" as never)
      .select("id, sender, body, created_at")
      .eq("thread_id", active.id)
      .order("created_at", { ascending: true });
    setMessages((data as unknown as Msg[]) ?? []);
  }, [active?.id]);

  useEffect(() => {
    if (!open) return;
    setActive(null);
    setLoading(true);
    void loadThreads().finally(() => setLoading(false));
  }, [open, loadThreads]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  const onRealtime = useCallback(() => {
    void loadThreads();
    void loadMessages();
  }, [loadThreads, loadMessages]);

  useShopChatRealtime(open ? (active?.id ?? "inbox") : null, onRealtime, active?.id ?? null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const reply = async () => {
    const body = draft.trim();
    if (!body || !active || busy) return;
    setBusy(true);
    setDraft("");
    const { error } = await supabase.rpc("shop_thread_reply" as never, { _thread: active.id, _body: body } as never);
    setBusy(false);
    if (error) { toast.error("Reply nahi gaya: " + error.message); return; }
    await loadMessages();
  };

  return (
    <SheetShell
      open={open}
      onClose={onClose}
      section="chats"
      title={active ? (active.product_name || "Shop chat") : "Shop chats"}
      subtitle={active ? (active.visitor_name || active.visitor_phone || "Customer") : "Product-wise inquiries aur orders"}
      footer={
        active ? (
          <form onSubmit={(e) => { e.preventDefault(); void reply(); }} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Back to all chats"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder="Reply to customer…"
              className="max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl bg-slate-100 px-3.5 py-3 text-[13px] outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send reply"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        ) : undefined
      }
    >
      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
      ) : active ? (
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender === "merchant";
            return (
              <div
                key={m.id}
                className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[13px] shadow-sm ${
                  mine ? "ml-auto rounded-tr-sm bg-amber-500 text-white" : "rounded-tl-sm bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`mt-0.5 text-right text-[9px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })}
          {!messages.length && <p className="py-8 text-center text-[12px] text-slate-500">No messages yet.</p>}
          <div ref={endRef} />
        </div>
      ) : threads.length ? (
        <div className="space-y-2">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-2.5 text-left active:scale-[0.99]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                {t.product_image ? (
                  <img src={optimizedImage(t.product_image, IMG.tile) ?? t.product_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-slate-400" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-slate-900">{t.product_name || "General inquiry"}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {t.visitor_name || "Customer"}
                  {t.visitor_phone ? ` · ${t.visitor_phone}` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${
                  t.kind === "order" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {t.kind}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center gap-2 py-10 text-slate-400">
          <MessageCircle className="h-6 w-6" />
          <p className="text-[12px]">Koi chat nahi — customer inquiry aane par yahan dikhegi.</p>
        </div>
      )}
    </SheetShell>
  );
}
