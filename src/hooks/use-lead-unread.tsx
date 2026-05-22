import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { playPing } from "@/lib/lead-sound";

/**
 * Per-lead unread chat message counts for the current user, with realtime
 * updates + a soft ping sound whenever a brand-new unread message arrives.
 */
export function useLeadUnreadCounts(leadIds: string[]): Record<string, number> {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const idsKey = leadIds.join(",");
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!user || leadIds.length === 0) {
      setCounts({});
      return;
    }
    let alive = true;
    const refresh = async (silent = false) => {
      const { data } = await supabase.rpc("count_unread_lead_messages", { _lead_ids: leadIds });
      if (!alive) return;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.lead_id] = Number(r.unread_count ?? 0); });
      setCounts(map);
      if (!silent && !firstLoad.current) {
        // Trigger ping only if total unread went up
        const total = Object.values(map).reduce((s, n) => s + n, 0);
        const prev = Object.values(counts).reduce((s, n) => s + n, 0);
        if (total > prev) playPing("message");
      }
      firstLoad.current = false;
    };
    refresh(true);

    const ch = supabase
      .channel(`unread-lead-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          if (leadIds.includes(row.lead_id)) refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_messages", filter: `recipient_id=eq.${user.id}` },
        () => refresh(true),
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, idsKey]);

  return counts;
}
