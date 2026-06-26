import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Subscribe to catalog (groups + items) changes. Useful for customer/vendor grids. */
export function useCatalogRealtime(onChange: () => void) {
  useEffect(() => {
    const ch = supabase
      .channel("catalog-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "catalog_groups" },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "catalog_items" },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [onChange]);
}
