import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SERVICE_ROWS,
  SERVICE_MENU_KEY,
  resolveServices,
  type ServiceDef,
  type ServiceMenuRow,
} from "@/lib/service-menu";

/**
 * Reads the admin-controlled `service_menu` row from app_settings.
 * Missing/unreadable config → all services enabled (fail-open, never a blank menu).
 */
export function useServiceMenu() {
  const [rows, setRows] = useState<ServiceMenuRow[]>(DEFAULT_SERVICE_ROWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", SERVICE_MENU_KEY)
          .maybeSingle();
        const arr = (data?.value as { services?: ServiceMenuRow[] } | null)?.services;
        if (!cancelled && Array.isArray(arr) && arr.length) setRows(arr);
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const services: ServiceDef[] = resolveServices(rows);
  return { services, rows, loading };
}
