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
  highPriority?: boolean;
  extraData?: Record<string, string>;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const isHigh = !!opts.highPriority;
  const message: any = {
    token: opts.token,
    notification: { title: opts.title, body: opts.body },
    android: {
      priority: isHigh ? "HIGH" : "NORMAL",
      notification: {
        channel_id: isHigh ? "lead_alerts_v2" : "default",
        sound: isHigh ? "lead_ring" : "default",
        notification_priority: isHigh ? "PRIORITY_MAX" : "PRIORITY_DEFAULT",
        default_vibrate_timings: true,
        default_light_settings: true,
        visibility: "PUBLIC",
        ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
      },
    },
    apns: {
      headers: { "apns-priority": isHigh ? "10" : "5" },
      payload: {
        aps: {
          sound: isHigh ? "lead_ring.caf" : "default",
          "interruption-level": isHigh ? "time-sensitive" : "active",
          "content-available": 1,
        },
      },
    },
    webpush: {
      headers: { Urgency: isHigh ? "high" : "normal", TTL: isHigh ? "60" : "3600" },
      fcm_options: { link: opts.actionUrl || "/" },
      notification: {
        requireInteraction: isHigh,
        renotify: true,
        silent: false,
        vibrate: isHigh ? [400, 150, 400, 150, 800] : [200, 100, 200],
        ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
      },
    },
    data: {
      ...(opts.actionUrl ? { action_url: opts.actionUrl } : {}),
      ...(opts.imageUrl ? { image: opts.imageUrl } : {}),
      ...(opts.extraData ?? {}),
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

/** Fan-out a single push to all active device tokens of a user. */
async function pushToUser(opts: {
  userId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
  highPriority?: boolean;
  extraData?: Record<string, string>;
}) {
  const [{ data: fcm }, { data: tokens }] = await Promise.all([
    supabaseAdmin.from("firebase_services").select("project_id, service_account_json").eq("service_key", "fcm").maybeSingle(),
    supabaseAdmin.from("device_tokens").select("token").eq("user_id", opts.userId).eq("is_active", true),
  ]);
  if (!fcm?.project_id || !fcm?.service_account_json) return { ok: false, reason: "fcm_not_configured" as const };
  const list = (tokens ?? []).map((t: any) => t.token).filter(Boolean);
  if (list.length === 0) return { ok: false, reason: "no_device_tokens" as const };

  let sa: ServiceAccount;
  try {
    sa = typeof fcm.service_account_json === "string" ? JSON.parse(fcm.service_account_json) : (fcm.service_account_json as any);
  } catch { return { ok: false, reason: "service_account_invalid" as const }; }

  let accessToken: string;
  try { accessToken = await getAccessToken(sa); }
  catch (e: any) { return { ok: false, reason: "oauth_failed" as const, error: String(e?.message ?? e) }; }

  let okCount = 0;
  for (const tk of list) {
    const r = await sendOne({
      projectId: fcm.project_id,
      accessToken,
      token: tk,
      title: opts.title,
      body: opts.body,
      imageUrl: opts.imageUrl,
      actionUrl: opts.actionUrl,
      highPriority: opts.highPriority,
      extraData: opts.extraData,
    });
    if (r.ok) okCount += 1;
    if (!r.ok && (r.status === 404 || r.status === 400)) {
      await supabaseAdmin.from("device_tokens").update({ is_active: false }).eq("token", tk);
    }
  }
  return { ok: okCount > 0, sent: okCount, total: list.length };
}

/** High-priority push to a vendor when a new lead is targeted at them. */
export const sendLeadPushToVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ vendor_id: z.string().uuid(), lead_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, sub_category_id, sub_category_name, customer_id, customer_name, customer_phone, address, images, lat, lng")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (!lead) return { ok: false, reason: "lead_not_found" as const };

    // Fetch customer avatar (icon) + sub-category image (large image)
    const [{ data: cust }, { data: cat }] = await Promise.all([
      (lead as any).customer_id
        ? supabaseAdmin.from("customers").select("avatar_url").eq("user_id", (lead as any).customer_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      (lead as any).sub_category_id
        ? supabaseAdmin.from("categories").select("image_url, icon").eq("id", (lead as any).sub_category_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    const customerAvatar = (cust as any)?.avatar_url ?? null;
    const subCatImage = (cat as any)?.image_url ?? (cat as any)?.icon ?? null;
    const firstLeadImage = (((lead as any).images ?? []) as string[])[0] ?? null;
    // Big image: prefer customer's actual lead photo, else sub-category image
    const heroImage = firstLeadImage || subCatImage || null;
    // Icon: customer avatar; fallback to sub-cat icon then default
    const iconUrl = customerAvatar || subCatImage || null;

    const last4 = (lead as any).customer_phone ? String((lead as any).customer_phone).replace(/\D/g, "").slice(-4) : "";
    const body = `${(lead as any).customer_name ?? "Customer"} • ${(lead as any).sub_category_name}${last4 ? ` • •••• ${last4}` : ""}`;
    return await pushToUser({
      userId: data.vendor_id,
      title: "🔔 New Lead — 15s to respond",
      body,
      imageUrl: heroImage,
      iconUrl,
      actionUrl: `/vendor/dashboard?leadId=${lead.id}`,
      highPriority: true,
      extraData: {
        kind: "lead_alert",
        lead_id: lead.id as string,
        ...(iconUrl ? { icon: iconUrl } : {}),
        ...(heroImage ? { image: heroImage } : {}),
      },
    });
  });

/** Notify the customer with a vendor status update ("On the way", "Arrived", etc.). */
export const sendStatusPushToCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    lead_id: z.string().uuid(),
    status_key: z.string().min(1).max(64),
    message: z.string().max(280).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, customer_id, sub_category_name, accepted_vendor_ids")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (!lead) return { ok: false, reason: "lead_not_found" as const };
    if (!((lead as any).accepted_vendor_ids ?? []).includes(userId)) {
      return { ok: false, reason: "not_accepted_vendor" as const };
    }

    const { data: vendor } = await supabaseAdmin
      .from("vendors").select("business_name, owner_name").eq("user_id", userId).maybeSingle();
    const vendorName = (vendor as any)?.business_name || (vendor as any)?.owner_name || "Your vendor";

    // Persist the update (idempotent on RLS — already inserted by client; this is a fallback)
    await supabaseAdmin.from("vendor_status_updates").insert({
      lead_id: data.lead_id,
      vendor_id: userId,
      status_key: data.status_key,
      message: data.message ?? null,
    }).then(() => null, () => null);

    const labels: Record<string, string> = {
      on_the_way: "🚗 Vendor is on the way",
      arrived: "📍 Vendor has arrived",
      working: "🛠️ Vendor started the work",
      completed: "✅ Vendor marked job complete",
    };
    const title = labels[data.status_key] ?? "Vendor update";
    const body = data.message || `${vendorName} • ${(lead as any).sub_category_name}`;
    return await pushToUser({
      userId: (lead as any).customer_id,
      title,
      body,
      actionUrl: `/status?leadId=${lead.id}`,
      highPriority: true,
      extraData: { kind: "vendor_status", lead_id: lead.id as string, status_key: data.status_key },
    });
  });
