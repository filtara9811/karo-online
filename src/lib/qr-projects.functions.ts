import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pickService, cfBase } from "./cashfree.functions";

const MarkPaidSchema = z.object({
  project_id: z.string().uuid(),
  order_id: z.string().min(3).max(80),
  price_inr: z.number().int().min(1).max(100000),
});

/**
 * Flips a QR project to "paid" — only after the Cashfree order is confirmed
 * PAID by the gateway. Client writes to is_paid/price_inr are frozen by a
 * database trigger, so this is the only path that can unlock a paid project.
 */
export const markQrProjectPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MarkPaidSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const svc = await pickService("leadx_purchase");
    if (!svc?.app_id || !svc?.secret_key) return { ok: false as const, error: "Cashfree service inactive" };

    try {
      const res = await fetch(`${cfBase(svc.is_test_mode)}/orders/${data.order_id}`, {
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": svc.app_id,
          "x-client-secret": svc.secret_key,
        },
      });
      const json = (await res.json().catch(() => ({}))) as { order_status?: string; message?: string };
      if (!res.ok) return { ok: false as const, error: json?.message ?? `HTTP ${res.status}` };
      if (String(json.order_status ?? "").toUpperCase() !== "PAID") {
        return { ok: false as const, error: `Order status: ${json.order_status ?? "UNKNOWN"}` };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await (supabaseAdmin as never as ReturnType<typeof Object>)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("qr_projects")
        .update({ is_paid: true, price_inr: data.price_inr })
        .eq("id", data.project_id)
        .eq("user_id", userId);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
