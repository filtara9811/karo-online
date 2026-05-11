// Server-side FCM v1 sender. Reads service account JSON + project_id from
// firebase_services (admin), signs an OAuth2 JWT via jose, exchanges it for
// an access token, then POSTs to FCM v1.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SignJWT, importPKCS8 } from "jose";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const pk = await importPKCS8(sa.private_key.replace(/\\n/g, "\n"), "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri || "https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);
  const r = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  if (!r.ok) throw new Error(`OAuth token exchange failed: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { access_token: string };
  return j.access_token;
}

async function sendOne(opts: {
  projectId: string;
  accessToken: string;
  token: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const message: any = {
    token: opts.token,
    notification: { title: opts.title, body: opts.body },
    webpush: {
      fcm_options: { link: opts.actionUrl || "/" },
      notification: {
        ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
      },
    },
    data: {
      ...(opts.actionUrl ? { action_url: opts.actionUrl } : {}),
      ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
    },
  };
  const r = await fetch(
    `https://fcm.googleapis.com/v1/projects/${opts.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );
  if (r.ok) return { ok: true, status: r.status };
  const txt = await r.text();
  return { ok: false, status: r.status, error: txt };
}

/** Send a test push for a notification trigger to the calling admin user. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ trigger_id: z.string().uuid(), user_id: z.string().uuid().optional() }))
  .handler(async ({ data, context }) => {
    const { userId, supabase: userSb } = context;

    // is admin?
    const { data: isAdmin } = await userSb.rpc("is_admin_user", { _user_id: userId } as any);
    if (!isAdmin) throw new Response("Not authorized", { status: 403 });

    const targetUser = data.user_id || userId;

    // Fetch trigger + FCM config (admin client bypasses RLS)
    const [{ data: trig }, { data: fcm }, { data: tokens }] = await Promise.all([
      supabaseAdmin.from("notification_triggers").select("*").eq("id", data.trigger_id).maybeSingle(),
      supabaseAdmin.from("firebase_services").select("project_id, service_account_json").eq("service_key", "fcm").maybeSingle(),
      supabaseAdmin.from("device_tokens").select("token").eq("user_id", targetUser).eq("is_active", true),
    ]);

    if (!trig) return { ok: false, reason: "trigger_not_found" as const };
    if (!fcm?.project_id || !fcm?.service_account_json) {
      return { ok: false, reason: "fcm_not_configured" as const };
    }
    const list = (tokens ?? []).map((t: any) => t.token).filter(Boolean);
    if (list.length === 0) return { ok: false, reason: "no_device_tokens" as const, hint: "Open the app and Allow notifications first." };

    let sa: ServiceAccount;
    try {
      sa = typeof fcm.service_account_json === "string"
        ? JSON.parse(fcm.service_account_json)
        : (fcm.service_account_json as any);
    } catch {
      return { ok: false, reason: "service_account_invalid" as const };
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken(sa);
    } catch (e: any) {
      return { ok: false, reason: "oauth_failed" as const, error: String(e?.message ?? e) };
    }

    const results: Array<{ ok: boolean; status: number; error?: string; token: string }> = [];
    for (const tk of list) {
      const r = await sendOne({
        projectId: fcm.project_id,
        accessToken,
        token: tk,
        title: trig.title,
        body: trig.body,
        imageUrl: trig.image_url,
        actionUrl: trig.action_url,
      });
      results.push({ ...r, token: tk });
      await supabaseAdmin.from("notification_logs").insert({
        trigger_id: data.trigger_id,
        user_id: targetUser,
        device_token: tk,
        provider: "fcm",
        channel: "push",
        status: r.ok ? "delivered" : "failed",
        error: r.ok ? null : r.error?.slice(0, 500),
        payload: { title: trig.title, body: trig.body, test: true },
      } as any);

      // Auto-deactivate dead tokens
      if (!r.ok && (r.status === 404 || r.status === 400)) {
        await supabaseAdmin.from("device_tokens").update({ is_active: false }).eq("token", tk);
      }
    }

    await supabaseAdmin.from("notification_triggers").update({ last_fired_at: new Date().toISOString() }).eq("id", data.trigger_id);

    const okCount = results.filter((r) => r.ok).length;
    return { ok: okCount > 0, sent: okCount, failed: results.length - okCount, results };
  });
