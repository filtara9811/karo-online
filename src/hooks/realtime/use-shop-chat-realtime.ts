import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Live updates for one shop chat thread (or all threads when threadId is null). */
export function useShopChatRealtime(
  channelKey: string | null | undefined,
  onChange: () => void,
  threadId?: string | null,
) {
  useEffect(() => {
    if (!channelKey) return;
    const ch = supabase
      .channel(`shop-chat-${channelKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shop_thread_messages",
          ...(threadId ? { filter: `thread_id=eq.${threadId}` } : {}),
        },
        () => onChange(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_threads" }, () => onChange())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelKey, threadId, onChange]);
}
