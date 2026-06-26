import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Subscribe to lead_messages for a single lead. Calls onChange on any message event. */
export function useLeadThreadRealtime(leadId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!leadId) return;
    const ch = supabase
      .channel(`lead-thread-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [leadId, onChange]);
}
