import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * One-time ₹599 (admin-configurable) Premium Links activation for the
 * merchant QR landing page. Mirrors the influencer activation engine.
 */

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().min(10).max(200),
  amount_inr: z.number().int().min(1).max(50000),
});

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getRazorpayGateway() {
  const admin = await getAdmin();
  const { data } = await admin
    .from("payment_gateways")
    .select("provider, is_active, is_test_mode, public_key, config, purpose, priority")
    .eq("is_active", true)
    .in("purpose", ["wallet_recharge", "both"])
    .order("priority", { ascending: true });
  return data?.find((g) => g.provider === "razorpay") ?? null;
}

export const createPremiumLinksOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data: settings } = await supabase
      .from("landing_page_settings" as never)
      .select("premium_link_fee_inr")
      .eq("id", 1)
      .maybeSingle();
    const fee = Math.max(1, Math.round(Number((settings as { premium_link_fee_inr?: number } | null)?.premium_link_fee_inr ?? 599)));

    const gateway = await getRazorpayGateway();
    if (!gateway) return { ok: false as const, error: "Razorpay gateway not configured" };
    const cfg = (gateway.config ?? {}) as Record<string, string>;
    const keyId = gateway.public_key?.trim();
    const keySecret = cfg.secret_key?.trim();
    if (!keyId || !keySecret) return { ok: false as const, error: "Razorpay credentials incomplete" };

    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: fee * 100,
          currency: "INR",
          receipt: `pl_${Date.now().toString(36)}_${userId.slice(0, 6)}`,
          notes: { user_id: userId, purpose: "premium_links_unlock" },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; amount?: number; error?: { description?: string } };
      if (!res.ok || !json.id) return { ok: false as const, error: json.error?.description ?? `HTTP ${res.status}` };
      return {
        ok: true as const,
        order_id: json.id,
        amount: json.amount ?? fee * 100,
        amount_inr: fee,
        key_id: keyId,
        is_test_mode: gateway.is_test_mode,
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

export const verifyPremiumLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VerifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = await getRazorpayGateway();
    if (!gateway) return { ok: false as const, error: "Razorpay gateway not configured" };
    const cfg = (gateway.config ?? {}) as Record<string, string>;
    const keySecret = cfg.secret_key?.trim();
    if (!keySecret) return { ok: false as const, error: "Razorpay secret missing" };

    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    if (expected !== data.razorpay_signature) {
      return { ok: false as const, error: "Signature verification failed" };
    }

    const { error } = await context.supabase.rpc(
      "mark_premium_links_unlocked" as never,
      { _payment_ref: data.razorpay_payment_id } as never,
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
