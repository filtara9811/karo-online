import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Store, Package } from "lucide-react";
import { loadShopMessages, sendShopMessage, type ShopMessage } from "@/lib/shop-chat";
import { useShopChatRealtime } from "@/hooks/realtime/use-shop-chat-realtime";
import { needsLightText, withAlpha } from "./landing-shared";
import { optimizedImage, IMG } from "@/lib/img";

/** Full-height in-app chat between the shopper and the merchant for one thread. */
export function LandingChatSheet({
  threadId,
  accent,
  shopName,
  avatarUrl,
  headline,
  productImage,
  onClose,
}: {
  threadId: string | null;
  accent: string;
  shopName: string;
  avatarUrl?: string | null;
  headline?: string | null;
  productImage?: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ShopMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fg = needsLightText(accent) ? "#ffffff" : "#12100a";

  const refresh = useCallback(async () => {
    if (!threadId) return;
    setMessages(await loadShopMessages(threadId));
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 6000);
    return () => window.clearInterval(id);
  }, [threadId, refresh]);

  useShopChatRealtime(threadId, refresh, threadId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !threadId || busy) return;
    setBusy(true);
    setDraft("");
    const ok = await sendShopMessage(threadId, body);
    if (ok) await refresh();
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {threadId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/50"
          />
          <motion.section
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[151] flex h-[88svh] flex-col overflow-hidden rounded-t-[28px] bg-[#f4efe8]"
          >
            <header className="flex items-center gap-3 px-4 py-3" style={{ background: accent, color: fg }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: withAlpha("#ffffff", 0.25) }}>
                {avatarUrl ? <img src={avatarUrl} alt={shopName} className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{shopName}</p>
                <p className="truncate text-[11px] opacity-80">{headline || "Chat with the shop"}</p>
              </div>
              <button onClick={onClose} aria-label="Close chat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full active:scale-90" style={{ background: withAlpha("#ffffff", 0.22) }}>
                <X className="h-4 w-4" />
              </button>
            </header>

            {headline && (
              <div className="flex items-center gap-2.5 border-b border-black/5 bg-white px-4 py-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                  {productImage ? (
                    <img src={optimizedImage(productImage, IMG.tile) ?? productImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-slate-400" />
                  )}
                </span>
                <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-700">{headline}</p>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 [-webkit-overflow-scrolling:touch]">
              {messages.map((msg) => {
                const mine = msg.sender === "shopper";
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      mine ? "ml-auto rounded-tr-sm" : "rounded-tl-sm bg-white text-slate-800"
                    }`}
                    style={mine ? { background: accent, color: fg } : undefined}
                  >
                    <p className="whitespace-pre-line">{msg.body}</p>
                    <p className={`mt-0.5 text-right text-[9px] ${mine ? "opacity-70" : "text-slate-400"}`}>
                      {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })}
              {!messages.length && (
                <p className="mx-auto mt-6 w-fit rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  Message bhejiye — shop turant reply karegi
                </p>
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void send(); }}
              className="flex items-end gap-2 border-t border-black/5 bg-white px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={1}
                placeholder="Type a message…"
                className="max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl bg-slate-100 px-3.5 py-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                aria-label="Send message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-lg active:scale-95 disabled:opacity-50"
                style={{ background: accent, color: fg }}
              >
                <Send className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </button>
            </form>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
