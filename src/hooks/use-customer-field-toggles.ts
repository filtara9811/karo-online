import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FieldKey = "name" | "gender" | "email" | "address" | "manager" | "referral";

export type FieldToggleMap = Record<FieldKey, boolean>;

const DEFAULTS: FieldToggleMap = {
  name: true, gender: true, email: true, address: true, manager: true, referral: true,
};

export function useCustomerFieldToggles() {
  const [toggles, setToggles] = useState<FieldToggleMap>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("customer_form_toggles")
        .select("field_key, enabled");
      if (cancelled) return;
      if (data) {
        const m = { ...DEFAULTS };
        for (const r of data as { field_key: string; enabled: boolean }[]) {
          if (r.field_key in m) (m as any)[r.field_key] = r.enabled;
        }
        setToggles(m);
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  return { toggles, ready };
}
