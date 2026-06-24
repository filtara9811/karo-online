import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: send a "hello" interactive WhatsApp Cloud message to verify
 * provider credentials. On success the provider row is auto-marked Active.
 *
 * Uses default Meta "hello_world" template (always pre-approved) when no
 * custom template is configured.
 */

const TestInput = z.object({
  provider_id: z.string().uuid(),
  to_phone: z.string().min(8).max(20),
});

function digitsOnly(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}

export const sendTestWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => TestInput.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin" as any,
    });
    if (!isAdmin) {
      return { ok: false as const, error: "forbidden" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: provErr } = await supabaseAdmin
      .from("whatsapp_providers" as any)
      .select("id,api_base_url,phone_number_id,access_token,default_template,provider")
      .eq("id", data.provider_id)
      .maybeSingle();
    if (provErr || !row) return { ok: false as const, error: "provider_not_found" };

    const p = row as any;
    if (!p.access_token || !p.phone_number_id) {
      return { ok: false as const, error: "missing_credentials" };
    }

    const base = (p.api_base_url || "https://graph.facebook.com/v20.0").replace(/\/$/, "");
    const url = `${base}/${p.phone_number_id}/messages`;
    const templateName = p.default_template || "hello_world";
    const phone = digitsOnly(data.to_phone);

    const body = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: { name: templateName, language: { code: "en_US" } },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${p.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (e: any) {
      return { ok: false as const, error: `network: ${e?.message ?? "fetch_error"}` };
    }
    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false as const,
        error: `${res.status}: ${json?.error?.message || "Meta API error"}`,
        details: json?.error ?? null,
      };
    }

    // Auto-mark active on first successful test send
    await supabaseAdmin
      .from("whatsapp_providers" as any)
      .update({ is_active: true })
      .eq("id", p.id);

    return {
      ok: true as const,
      message_id: json?.messages?.[0]?.id ?? null,
      template_used: templateName,
    };
  });
