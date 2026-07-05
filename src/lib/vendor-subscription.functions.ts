import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

// Public settings fetch (no auth required — plan is public)
export const getVendorSubscriptionSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb
      .from("vendor_subscription_settings")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, settings: data };
  },
);

const StartSchema = z.object({ mode: z.enum(["full", "trial"]).default("full") });

export const startVendorSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StartSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context as { userId: string };

    const { data: cfg } = await (supabaseAdmin as any)
      .from("vendor_subscription_settings")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!cfg) return { ok: false as const, error: "Plan configured nahi hai" };

    const amountPaise = data.mode === "trial" ? cfg.trial_price_paise : cfg.price_paise;
    if (!amountPaise || amountPaise <= 0)
      return { ok: false as const, error: "Invalid plan amount" };

    // Get Cashfree service
    const { data: svc } = await (supabaseAdmin as any)
      .from("cashfree_services")
      .select("app_id, secret_key, is_test_mode")
      .eq("service_key", "vendor_subscription")
      .eq("is_active", true)
      .maybeSingle();
    const fallback = svc
      ? svc
      : (
          await (supabaseAdmin as any)
            .from("cashfree_services")
            .select("app_id, secret_key, is_test_mode")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()
        ).data;

    if (!fallback?.app_id || !fallback?.secret_key)
      return {
        ok: false as const,
        error: "Cashfree configured nahi hai. Admin → Cashfree Services me setup karein.",
      };

    const { data: vendor } = await (supabaseAdmin as any)
      .from("vendors")
      .select("owner_name, email, whatsapp, manager_email")
      .eq("user_id", userId)
      .maybeSingle();

    const order_id = `KO_SUB_${Date.now()}_${userId.slice(0, 6)}`;
    const phone = (vendor?.whatsapp ?? "").toString().replace(/\D/g, "").slice(-10) || "9999999999";
    const email = vendor?.email ?? vendor?.manager_email ?? `vendor_${userId.slice(0, 8)}@karoonline.in`;
    const request = getRequest();
    const appOrigin =
      request?.headers.get("origin") ??
      (request?.url ? new URL(request.url).origin : "https://karoonline.in");
    const base = fallback.is_test_mode
      ? "https://sandbox.cashfree.com/pg"
      : "https://api.cashfree.com/pg";

    try {
      const res = await fetch(`${base}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": fallback.app_id,
          "x-client-secret": fallback.secret_key,
        },
        body: JSON.stringify({
          order_id,
          order_amount: amountPaise / 100,
          order_currency: "INR",
          customer_details: {
            customer_id: userId,
            customer_email: email,
            customer_phone: phone,
            customer_name: vendor?.owner_name ?? "Vendor",
          },
          order_meta: {
            return_url: `${appOrigin}/vendor/join?cf_sub_order={order_id}`,
          },
          order_note: `${cfg.plan_name} — ${data.mode}`,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json.payment_session_id) {
        return {
          ok: false as const,
          error: `Cashfree: ${json?.message || json?.error?.description || `HTTP ${res.status}`}`,
        };
      }

      await (supabaseAdmin as any)
        .from("vendors")
        .update({ subscription_order_id: order_id })
        .eq("user_id", userId);

      return {
        ok: true as const,
        order_id,
        payment_session_id: json.payment_session_id as string,
        mode: fallback.is_test_mode ? ("sandbox" as const) : ("production" as const),
      };
    } catch (e) {
      return { ok: false as const, error: `Network: ${(e as Error).message}` };
    }
  });

const VerifySchema = z.object({ order_id: z.string().min(1) });

export const verifyVendorSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VerifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context as { userId: string };

    const { data: svc } = await (supabaseAdmin as any)
      .from("cashfree_services")
      .select("app_id, secret_key, is_test_mode")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!svc?.app_id) return { ok: false as const, error: "Cashfree not configured" };

    const base = svc.is_test_mode
      ? "https://sandbox.cashfree.com/pg"
      : "https://api.cashfree.com/pg";

    try {
      const res = await fetch(`${base}/orders/${encodeURIComponent(data.order_id)}`, {
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": svc.app_id,
          "x-client-secret": svc.secret_key,
        },
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
      const paid = json.order_status === "PAID";
      if (paid) {
        const { data: cfg } = await (supabaseAdmin as any)
          .from("vendor_subscription_settings")
          .select("trial_days")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        await (supabaseAdmin as any)
          .from("vendors")
          .update({
            payment_completed: true,
            payment_completed_at: new Date().toISOString(),
            subscription_expires_at: expires.toISOString(),
            onboarding_step: 4,
            onboarding_completed_at: new Date().toISOString(),
            status: "active",
          })
          .eq("user_id", userId);
      }
      return { ok: true as const, paid, status: json.order_status };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
