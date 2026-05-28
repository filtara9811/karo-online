// Public endpoint called by the Android Foreground Service (vendor app)
// to push live GPS coordinates. Auth is by the vendor's Supabase access token
// passed as Authorization: Bearer <token>. We verify the token via Supabase
// admin client, then upsert lat/lng + is_online + location_updated_at.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_online: z.boolean().optional(),
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export const Route = createFileRoute("/api/public/vendor-location")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") || "";
          const token = auth.replace(/^Bearer\s+/i, "").trim();
          if (!token) {
            return new Response(JSON.stringify({ ok: false, error: "missing_token" }), {
              status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() },
            });
          }
          const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
          if (uErr || !u?.user) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
              status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() },
            });
          }
          const userId = u.user.id;

          const raw = await request.json().catch(() => ({}));
          const parsed = Body.safeParse(raw);
          if (!parsed.success) {
            return new Response(JSON.stringify({ ok: false, error: "bad_body", issues: parsed.error.issues }), {
              status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() },
            });
          }
          const { lat, lng, is_online } = parsed.data;

          // Write to LIVE columns only — preserve registered shop lat/lng.
          // Matching engine picks effective coords based on vendors.operation_mode.
          const { error: upErr } = await (supabaseAdmin as any)
            .from("vendors")
            .update({
              live_lat: lat,
              live_lng: lng,
              location_updated_at: new Date().toISOString(),
              ...(typeof is_online === "boolean" ? { is_online } : {}),
            })
            .eq("user_id", userId);
          if (upErr) {
            return new Response(JSON.stringify({ ok: false, error: upErr.message }), {
              status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() },
            });
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() },
          });
        }
      },
    },
  },
});
