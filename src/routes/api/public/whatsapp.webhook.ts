import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Meta WhatsApp Cloud webhook
 *  - GET  → handshake verification (hub.challenge echo)
 *  - POST → message + button-click events; routes Accept/Reject to RPCs
 *
 * Configure in Meta Developer Portal:
 *   Callback URL:   https://<your-domain>/api/public/whatsapp/webhook
 *   Verify Token:   (value from Admin → WhatsApp → Webhook Verify Token)
 *   Subscribe to:   messages
 */

type ProviderRow = {
  id: string;
  provider: string;
  webhook_verify_token: string | null;
  app_secret: string | null;
};

async function loadProviders(): Promise<ProviderRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whatsapp_providers" as any)
    .select("id,provider,webhook_verify_token,app_secret")
    .in("provider", ["meta_cloud", "fast2sms_meta"]);
  return (data ?? []) as ProviderRow[];
}

function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  try {
    const a = Buffer.from(got, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Button payload convention sent at template-send time:
 *   { id: "lead:<lead_id>:accept" }    or  "lead:<lead_id>:reject"
 */
function parseButtonPayload(id: string): { leadId: string; action: "accept" | "reject" } | null {
  const m = /^lead:([0-9a-f-]{36}):(accept|reject)$/i.exec(id || "");
  if (!m) return null;
  return { leadId: m[1], action: m[2].toLowerCase() as "accept" | "reject" };
}

function digitsOnly(s: string): string {
  return (s || "").replace(/\D/g, "");
}

async function resolveVendorByPhone(phone: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const d = digitsOnly(phone);
  if (d.length < 10) return null;
  const last10 = d.slice(-10);
  const { data } = await supabaseAdmin
    .from("vendors")
    .select("user_id,whatsapp,phone")
    .or(`whatsapp.ilike.%${last10},phone.ilike.%${last10}`)
    .limit(1);
  const row = (data ?? [])[0] as any;
  return row?.user_id ?? null;
}

async function logButtonClick(args: {
  leadId: string;
  vendorId: string | null;
  waMessageId: string | null;
  button: string;
  toPhone: string;
  reason?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("whatsapp_message_logs" as any).insert({
    lead_id: args.leadId,
    vendor_id: args.vendorId,
    wa_message_id: args.waMessageId,
    to_phone: args.toPhone,
    status: "button_clicked",
    button_clicked: args.button,
    clicked_at: new Date().toISOString(),
    error_payload: args.reason ? { reason: args.reason } : null,
  });
}

async function handleInteractive(msg: any, fromPhone: string) {
  const interactive = msg.interactive;
  const reply = interactive?.button_reply ?? interactive?.list_reply;
  if (!reply?.id) return;
  const parsed = parseButtonPayload(reply.id);
  if (!parsed) return;

  const vendorId = await resolveVendorByPhone(fromPhone);
  await logButtonClick({
    leadId: parsed.leadId,
    vendorId,
    waMessageId: msg.id ?? null,
    button: parsed.action,
    toPhone: fromPhone,
  });

  if (!vendorId) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (parsed.action === "accept") {
    await supabaseAdmin.rpc("accept_lead_for_vendor" as any, {
      _lead_id: parsed.leadId,
      _vendor_id: vendorId,
    });
  } else {
    await supabaseAdmin.rpc("reject_lead_for_vendor" as any, {
      _lead_id: parsed.leadId,
      _vendor_id: vendorId,
      _reason: "rejected_via_whatsapp",
    });
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (mode !== "subscribe" || !token || !challenge) {
          return new Response("bad_request", { status: 400 });
        }
        const providers = await loadProviders();
        const ok = providers.some((p) => p.webhook_verify_token && p.webhook_verify_token === token);
        if (!ok) return new Response("forbidden", { status: 403 });
        return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
      },

      POST: async ({ request }) => {
        const raw = await request.text();
        const sigHeader = request.headers.get("x-hub-signature-256");

        const providers = await loadProviders();
        // Accept signature from ANY configured Meta-style provider's app_secret.
        // If no app_secret is set yet (Phase B bring-up), allow but log a warning.
        const secretCandidates = providers.map((p) => p.app_secret).filter((s): s is string => !!s);
        const signatureOk =
          secretCandidates.length === 0
            ? true
            : secretCandidates.some((s) => verifySignature(raw, sigHeader, s));
        if (!signatureOk) {
          return new Response("invalid_signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("bad_json", { status: 400 });
        }

        try {
          const entries = Array.isArray(payload?.entry) ? payload.entry : [];
          for (const entry of entries) {
            const changes = Array.isArray(entry?.changes) ? entry.changes : [];
            for (const change of changes) {
              const value = change?.value;
              const messages = Array.isArray(value?.messages) ? value.messages : [];
              for (const msg of messages) {
                if (msg?.type === "interactive") {
                  await handleInteractive(msg, msg?.from ?? "");
                }
              }
            }
          }
        } catch (e: any) {
          // Always return 200 to Meta to prevent retries storming; log internally.
          console.error("[wa-webhook] processing_error", e?.message ?? e);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
