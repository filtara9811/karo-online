import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OrderSchema = z.object({
  amount_inr: z.number().int().min(1).max(500000),
  purpose: z.enum(["wallet_recharge", "coin_purchase"]),
  notes: z.record(z.string(), z.string()).optional(),
});

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().min(10).max(200),
  amount_inr: z.number().int().min(1).max(500000),
  purpose: z.enum(["wallet_recharge", "coin_purchase"]),
});

async function logSystem(
  provider: string | null,
  status: "success" | "error",
  message: string,
  meta: Record<string, unknown> = {},
) {
  try {
    await supabaseAdmin.from("system_logs").insert([{
      kind: "payment",
      provider,
      status,
      message: message.slice(0, 500),
      meta,
    }] as any);
    });
  } catch (e) {
    console.error("[system_logs] failed", e);
  }
}

async function getActiveGateway(purpose: "wallet_recharge" | "coin_purchase") {
  const { data, error } = await supabaseAdmin
    .from("payment_gateways")
    .select("provider, is_active, is_test_mode, public_key, config, purpose, priority")
    .eq("is_active", true)
    .in("purpose", [purpose, "both"])
    .order("priority", { ascending: true });
  if (error) throw new Error(error.message);
  // Prefer Razorpay (per user) then fallback Cashfree
  const rz = data?.find((g) => g.provider === "razorpay");
  return rz ?? data?.[0] ?? null;
}

export const createPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => OrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const gateway = await getActiveGateway(data.purpose);
    if (!gateway) {
      await logSystem(null, "error", `No active payment gateway for ${data.purpose}`);
      return { ok: false as const, error: "Koi active payment gateway nahi mila. Admin → Payment Gateways." };
    }

    if (gateway.provider !== "razorpay") {
      return { ok: false as const, error: `${gateway.provider} integration pending` };
    }

    const cfg = (gateway.config ?? {}) as Record<string, string>;
    const keyId = gateway.public_key?.trim();
    const keySecret = cfg.secret_key?.trim();
    if (!keyId || !keySecret) {
      await logSystem("razorpay", "error", "Razorpay key_id or secret_key missing in admin config");
      return { ok: false as const, error: "Razorpay credentials incomplete in Admin settings" };
    }

    const amountPaise = data.amount_inr * 100;
    const receipt = `r_${Date.now().toString(36)}_${userId.slice(0, 6)}`;

    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          notes: { user_id: userId, purpose: data.purpose, ...(data.notes ?? {}) },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        amount?: number;
        currency?: string;
        error?: { description?: string };
      };
      if (!res.ok || !json.id) {
        const msg = json.error?.description ?? `HTTP ${res.status}`;
        await logSystem("razorpay", "error", `Order create failed: ${msg}`, { receipt });
        return { ok: false as const, error: `Razorpay: ${msg}` };
      }
      await logSystem("razorpay", "success", `Order created ${json.id}`, {
        amount: json.amount,
        purpose: data.purpose,
      });
      return {
        ok: true as const,
        order_id: json.id,
        amount: json.amount ?? amountPaise,
        currency: json.currency ?? "INR",
        key_id: keyId,
        is_test_mode: gateway.is_test_mode,
      };
    } catch (e) {
      const msg = (e as Error).message;
      await logSystem("razorpay", "error", `Network: ${msg}`);
      return { ok: false as const, error: `Network error: ${msg}` };
    }
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VerifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const gateway = await getActiveGateway(data.purpose);
    if (!gateway || gateway.provider !== "razorpay") {
      return { ok: false as const, error: "Razorpay gateway not active" };
    }
    const cfg = (gateway.config ?? {}) as Record<string, string>;
    const keySecret = cfg.secret_key?.trim();
    if (!keySecret) {
      return { ok: false as const, error: "Razorpay secret missing" };
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");

    if (expected !== data.razorpay_signature) {
      await logSystem("razorpay", "error", "Signature mismatch", {
        order: data.razorpay_order_id,
      });
      return { ok: false as const, error: "Signature verification failed" };
    }

    // Credit wallet (real money flow)
    const amountPaise = data.amount_inr * 100;
    if (data.purpose === "wallet_recharge") {
      // Insert wallet row if missing then increment
      await supabaseAdmin
        .from("vendor_wallets")
        .upsert({ vendor_id: userId }, { onConflict: "vendor_id", ignoreDuplicates: true });
      const { data: wallet } = await supabaseAdmin
        .from("vendor_wallets")
        .select("service_balance_paise, lifetime_recharged_paise")
        .eq("vendor_id", userId)
        .maybeSingle();
      const newBal = (wallet?.service_balance_paise ?? 0) + amountPaise;
      const newLifetime = (wallet?.lifetime_recharged_paise ?? 0) + amountPaise;
      await supabaseAdmin
        .from("vendor_wallets")
        .update({
          service_balance_paise: newBal,
          lifetime_recharged_paise: newLifetime,
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", userId);
      await supabaseAdmin.from("wallet_transactions").insert({
        vendor_id: userId,
        wallet_kind: "service",
        txn_type: "recharge",
        direction: "credit",
        amount_paise: amountPaise,
        status: "success",
        description: "Razorpay recharge",
        reference_id: data.razorpay_payment_id,
        balance_after_paise: newBal,
      });
    }
    await logSystem("razorpay", "success", `Payment verified ${data.razorpay_payment_id}`, {
      purpose: data.purpose,
    });
    return { ok: true as const };
  });
