import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to leads table changes. Calls onChange on any INSERT/UPDATE.
 * Caller is responsible for refetching / invalidating queries.
 */
export function useLeadsRealtime(scopeKey: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!scopeKey) return;
    const ch = supabase
      .channel(`leads-rt-${scopeKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_notifications" },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [scopeKey, onChange]);
}
