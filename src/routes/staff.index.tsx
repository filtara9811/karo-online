import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquarePlus, Search, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyChats } from "@/lib/staff.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff/")({
  component: StaffChatsPage,
});

type Chat = {
  id: string;
  chat_type: string;
  title: string | null;
  last_message_at: string | null;
  vendor_id: string | null;
};

function StaffChatsPage() {
  const navigate = useNavigate();
  const fetchChats = useServerFn(listMyChats);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchChats();
        setChats(rows as Chat[]);
      } finally { setLoading(false); }
    })();
    // Realtime: refetch when new message arrives
    const ch = supabase
      .channel("staff-chats-refresh")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_chat_messages" }, () => {
        fetchChats().then((r) => setChats(r as Chat[])).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchChats]);

  const filtered = chats.filter((c) => !q || (c.title ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-md mx-auto">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[color:oklch(0.9_0.03_85)] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Chats</h1>
          <button onClick={() => navigate({ to: "/staff/vendors" })}
            className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8]">
            <MessageSquarePlus className="h-4 w-4 text-[color:oklch(0.55_0.16_82)]" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats..."
            className="w-full h-10 pl-9 pr-3 rounded-full bg-muted text-sm" />
        </div>
      </header>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Koi chat nahi hai abhi.<br />Vendor onboard karo, chat thread auto-create hoga.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[color:oklch(0.94_0.02_85)]">
          {filtered.map((c) => (
            <li key={c.id}>
              <button onClick={() => navigate({ to: "/staff/chat/$chatId", params: { chatId: c.id } })}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 grid place-items-center text-emerald-700 font-semibold">
                  {(c.title ?? "C").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate text-sm">{c.title ?? (c.chat_type === "vendor_thread" ? "Vendor thread" : "Chat")}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.chat_type}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
