import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Vendor-side Accept / Reject server fns, used by the
 * `/lead/accept/$id` and `/lead/reject/$id` landing pages that
 * the Fast2SMS "Visit website" buttons link to.
 *
 * Auth: requireSupabaseAuth — the vendor must be signed in.
 *       caller's auth.uid() is used as the vendor id, no spoofing.
 */

export const acceptLeadAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ leadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vendor } = await supabaseAdmin
      .from("vendors")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!vendor) {
      return { ok: false as const, error: "not_a_vendor" };
    }

    const { data: result, error } = await supabaseAdmin.rpc(
      "accept_lead_for_vendor" as any,
      { _lead_id: data.leadId, _vendor_id: userId },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, result };
  });

export const rejectLeadAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        leadId: z.string().uuid(),
        reason: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vendor } = await supabaseAdmin
      .from("vendors")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!vendor) {
      return { ok: false as const, error: "not_a_vendor" };
    }

    const { data: result, error } = await supabaseAdmin.rpc(
      "reject_lead_for_vendor" as any,
      { _lead_id: data.leadId, _vendor_id: userId, _reason: data.reason },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, result };
  });
