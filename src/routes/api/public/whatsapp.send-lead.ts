import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Internal hook called by the radar broadcaster after each ring batch.
 * Sends a Meta WhatsApp Cloud INTERACTIVE template message
 *   (image header + body + Accept/Reject quick-reply buttons)
 * to each notified vendor.
 *
 * Button payload format → "lead:<lead_id>:accept" | "lead:<lead_id>:reject"
 * Webhook (whatsapp.webhook.ts) parses these and calls accept/reject RPCs.
 *
 * Body: { lead_id, vendor_ids[], template_name?, language? }
 *
 * Soft no-ops when Meta provider isn't fully configured (Phase B bring-up).
 */

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  vendor_ids: z.array(z.string().uuid()).default([]),
  template_name: z.string().optional(),
  language: z.string().optional(),
});

function digitsOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.length === 10 ? `91${d}` : d;
}

type MetaProvider = {
  id: string;
  api_base_url: string | null;
  phone_number_id: string | null;
  access_token: string | null;
  default_template: string | null;
  is_active: boolean;
  is_test_mode: boolean;
};

async function loadActiveMetaProvider(): Promise<MetaProvider | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whatsapp_providers" as any)
    .select("id,api_base_url,phone_number_id,access_token,default_template,is_active,is_test_mode")
    .eq("provider", "meta_cloud")
    .eq("is_active", true)
    .limit(1);
  const row = (data ?? [])[0];
  if (!row) return null;
  return (row as unknown) as MetaProvider;
}

async function fetchLeadSummary(leadId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id,description,city,sub_category_name,image_url,budget")
    .eq("id", leadId)
    .maybeSingle();
  return data as any;
}

async function fetchVendors(vendorIds: string[]) {
  if (!vendorIds.length) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("vendors")
    .select("user_id,owner_name,business_name,whatsapp,phone")
    .in("user_id", vendorIds);
  return (data ?? []) as any[];
}

async function sendInteractive(args: {
  provider: MetaProvider;
  toPhone: string;
  leadId: string;
  templateName: string;
  language: string;
  lead: any;
  vendorName: string | null;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { provider, toPhone, leadId, templateName, language, lead, vendorName } = args;
  const base = (provider.api_base_url || "https://graph.facebook.com/v20.0").replace(/\/$/, "");
  const url = `${base}/${provider.phone_number_id}/messages`;

  const components: any[] = [];
  if (lead?.image_url) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: lead.image_url } }],
    });
  }
  components.push({
    type: "body",
    parameters: [
      { type: "text", text: vendorName || "Vendor" },
      { type: "text", text: lead?.sub_category_name || "Service" },
      { type: "text", text: lead?.city || "—" },
      { type: "text", text: (lead?.description || "New lead").slice(0, 120) },
    ],
  });
  // Quick-reply button payloads — webhook parses these
  components.push({
    type: "button",
    sub_type: "quick_reply",
    index: "0",
    parameters: [{ type: "payload", payload: `lead:${leadId}:accept` }],
  });
  components.push({
    type: "button",
    sub_type: "quick_reply",
    index: "1",
    parameters: [{ type: "payload", payload: `lead:${leadId}:reject` }],
  });

  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `${res.status}:${json?.error?.message || "send_failed"}` };
    }
    const messageId = json?.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (e: any) {
    return { ok: false, error: e?.message || "fetch_error" };
  }
}

export const Route = createFileRoute("/api/public/whatsapp/send-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
        }

        const provider = await loadActiveMetaProvider();
        if (!provider || !provider.access_token || !provider.phone_number_id) {
          return Response.json({ ok: true, skipped: "meta_not_configured" });
        }

        const templateName =
          body.template_name || provider.default_template || "lead_notification_v1";
        const language = body.language || "hi";

        const [lead, vendors] = await Promise.all([
          fetchLeadSummary(body.lead_id),
          fetchVendors(body.vendor_ids),
        ]);
        if (!lead) return Response.json({ ok: false, error: "lead_not_found" }, { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let sent = 0;
        const errors: string[] = [];

        for (const v of vendors) {
          const phone = digitsOnly(v.whatsapp || v.phone);
          if (!phone) continue;
          const result = await sendInteractive({
            provider,
            toPhone: phone,
            leadId: body.lead_id,
            templateName,
            language,
            lead,
            vendorName: v.business_name || v.owner_name || null,
          });
          await supabaseAdmin.from("whatsapp_message_logs" as any).insert({
            lead_id: body.lead_id,
            vendor_id: v.user_id,
            provider_id: provider.id,
            wa_message_id: result.messageId ?? null,
            to_phone: phone,
            template_name: templateName,
            status: result.ok ? "sent" : "failed",
            error_payload: result.ok ? null : { error: result.error },
          });
          if (result.ok) sent += 1;
          else errors.push(`${v.user_id}:${result.error}`);
        }

        return Response.json({
          ok: true,
          sent,
          total: vendors.length,
          template: templateName,
          errors: errors.slice(0, 5),
        });
      },
    },
  },
});
