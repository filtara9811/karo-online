import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Public webhook called by the Postgres waterfall processor after each batch
 * of vendors is notified. It fans out a WhatsApp message to those vendors via
 * the GatewayAPI connector. No-ops gracefully when the connector secret is
 * not yet linked, so the broadcast trigger never fails because of WhatsApp.
 *
 * Body: { lead_id: string, vendor_ids: string[], batch_no: number }
 */

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  vendor_ids: z.array(z.string().uuid()).default([]),
  batch_no: z.number().int().optional(),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/gatewayapi";

function digitsOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return null;
  // Default to India country code when 10-digit local number is given.
  return d.length === 10 ? `91${d}` : d;
}

async function fetchVendorPhones(vendorIds: string[]): Promise<{ vendor_id: string; phone: string; name: string | null }[]> {
  if (vendorIds.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .select("user_id,owner_name,business_name,whatsapp,phone")
    .in("user_id", vendorIds);
  if (error || !data) return [];
  const out: { vendor_id: string; phone: string; name: string | null }[] = [];
  for (const v of data as any[]) {
    const phone = digitsOnly(v.whatsapp) ?? digitsOnly(v.phone);
    if (phone) out.push({ vendor_id: v.user_id, phone, name: v.business_name || v.owner_name || null });
  }
  return out;
}

export const Route = createFileRoute("/api/public/hooks/lead-whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e) {
          return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        const gwKey = process.env.GATEWAYAPI_API_KEY;
        // Soft no-op when connector is not linked yet — the migration must
        // never fail because the user hasn't enabled GatewayAPI.
        if (!lovableKey || !gwKey) {
          return Response.json({ ok: true, skipped: "gatewayapi_not_configured" });
        }

        const recipients = await fetchVendorPhones(body.vendor_ids);
        if (recipients.length === 0) {
          return Response.json({ ok: true, sent: 0 });
        }

        let sent = 0;
        const errors: string[] = [];
        for (const r of recipients) {
          const message = `Karoonline · New Lead\n${r.name ? `Hi ${r.name},\n` : ""}You've received a new lead request. Please open the Karoonline vendor app to accept it within 30 seconds.\n\nLead Ref: ${body.lead_id.slice(0, 8)}`;
          try {
            const res = await fetch(`${GATEWAY_URL}/mobile/single`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "X-Connection-Api-Key": gwKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sender: "Karoonline",
                recipient: Number(r.phone),
                message,
                reference: `lead-${body.lead_id}-${r.vendor_id.slice(0, 6)}`,
              }),
            });
            if (res.ok) sent += 1;
            else errors.push(`${r.vendor_id}:${res.status}`);
          } catch (e: any) {
            errors.push(`${r.vendor_id}:${e?.message ?? "err"}`);
          }
        }

        return Response.json({ ok: true, sent, total: recipients.length, errors: errors.slice(0, 5) });
      },
    },
  },
});
