import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FilterSchema = z.object({
  role: z.enum(["all", "vendor", "customer"]).default("all"),
  kyc_status: z.enum(["any", "verified", "pending", "rejected"]).default("any"),
  active: z.enum(["any", "active", "blocked"]).default("any"),
  city: z.string().trim().max(80).optional().nullable(),
});

async function assertAdmin(ctx: any) {
  const { data: ok } = await ctx.supabase.rpc("is_admin_user", { _user_id: ctx.userId } as any);
  if (!ok) throw new Response("forbidden", { status: 403 });
}

/** Resolve manual targets (UUIDs or 10-digit phones) → user_ids. */
async function resolveManualTargets(supabaseAdmin: any, raw: string[]): Promise<string[]> {
  const ids = new Set<string>();
  const phones: string[] = [];
  for (const t of raw) {
    const s = String(t || "").trim();
    if (!s) continue;
    if (/^[0-9a-fA-F-]{36}$/.test(s)) { ids.add(s); continue; }
    const digits = s.replace(/\D/g, "").slice(-10);
    if (digits.length === 10) phones.push(digits);
  }
  if (phones.length) {
    const [{ data: cs }, { data: vs }] = await Promise.all([
      supabaseAdmin.from("customers").select("user_id").in("phone", phones),
      supabaseAdmin.from("vendors").select("user_id").in("whatsapp", phones),
    ]);
    for (const r of (cs ?? []) as any[]) if (r.user_id) ids.add(r.user_id);
    for (const r of (vs ?? []) as any[]) if (r.user_id) ids.add(r.user_id);
  }
  return Array.from(ids);
}

/** Preview the audience size + sample list for a filter + manual targets. */
export const previewAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filter: FilterSchema,
    manual_targets: z.array(z.string()).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("admin_segment_audience", { _filter: data.filter as any });
    if (error) return { ok: false as const, error: error.message };
    const list = (rows ?? []) as Array<{ user_id: string; display_name: string; phone: string | null; role: string }>;
    const manualIds = await resolveManualTargets(supabaseAdmin, data.manual_targets ?? []);
    const merged = new Set<string>(list.map((u) => u.user_id));
    for (const id of manualIds) merged.add(id);
    return {
      ok: true as const,
      total: merged.size,
      filter_count: list.length,
      manual_count: manualIds.length,
      manual_unmatched: (data.manual_targets ?? []).length - manualIds.length,
      sample: list.slice(0, 20),
    };
  });

/** List campaigns (most recent first). */
export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("notification_campaigns" as any)
      .select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, items: data ?? [] };
  });

/** Create or update a campaign. */
export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(2000),
    image_url: z.string().url().nullable().optional(),
    action_url: z.string().nullable().optional(),
    notification_type: z.string().default("basic"),
    audience_filter: FilterSchema,
    manual_targets: z.array(z.string()).default([]),
    save_as_template: z.boolean().optional(),
    template_name: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: any = {
      name: data.name,
      title: data.title,
      body: data.body,
      image_url: data.image_url ?? null,
      action_url: data.action_url ?? null,
      notification_type: data.notification_type,
      audience_filter: data.audience_filter,
      manual_targets: data.manual_targets,
      channels: { push: true },
      status: "draft",
      created_by: context.userId,
    };
    let campaignId = data.id;
    if (campaignId) {
      await supabaseAdmin.from("notification_campaigns" as any).update(payload).eq("id", campaignId);
    } else {
      const { data: row } = await supabaseAdmin.from("notification_campaigns" as any).insert(payload).select("id").maybeSingle();
      campaignId = (row as any)?.id;
    }
    if (data.save_as_template) {
      await supabaseAdmin.from("notification_templates" as any).insert({
        name: data.template_name || data.name,
        title: data.title,
        body: data.body,
        image_url: data.image_url ?? null,
        action_url: data.action_url ?? null,
        notification_type: data.notification_type,
        created_by: context.userId,
      });
    }
    return { ok: true as const, id: campaignId };
  });

/** Delete campaign. */
export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notification_campaigns" as any).delete().eq("id", data.id);
    return { ok: true as const };
  });

/** Resolve audience and fan-out push to every device of every matched user. */
export const sendCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { pushToUser } = await import("./push.functions");

    const { data: c } = await supabaseAdmin.from("notification_campaigns" as any).select("*").eq("id", data.id).maybeSingle();
    if (!c) return { ok: false as const, error: "campaign_not_found" };

    const filter = (c as any).audience_filter ?? { role: "all", kyc_status: "any", active: "any" };
    const { data: segRows, error: segErr } = await supabaseAdmin.rpc("admin_segment_audience", { _filter: filter });
    if (segErr) return { ok: false as const, error: segErr.message };
    const merged = new Set<string>(((segRows ?? []) as any[]).map((u) => u.user_id).filter(Boolean));
    const manual = Array.isArray((c as any).manual_targets) ? (c as any).manual_targets as string[] : [];
    const manualIds = await resolveManualTargets(supabaseAdmin, manual);
    for (const id of manualIds) merged.add(id);
    const ids = Array.from(merged);
    if (ids.length === 0) return { ok: false as const, error: "no_recipients" };

    await supabaseAdmin.from("notification_campaigns" as any).update({ status: "sending" }).eq("id", data.id);

    let sent = 0, delivered = 0, failed = 0;
    for (const uid of ids) {
      const r: any = await pushToUser({
        userId: uid,
        title: (c as any).title,
        body: (c as any).body,
        imageUrl: (c as any).image_url,
        actionUrl: (c as any).action_url,
        campaignId: data.id,
        extraData: { kind: "campaign", campaign_id: data.id },
      });
      sent += 1;
      if (r?.sent) delivered += r.sent;
      if (r?.total && r.total > (r.sent ?? 0)) failed += r.total - r.sent;
    }

    await supabaseAdmin.from("notification_campaigns" as any).update({
      status: "sent",
      sent_count: sent,
      delivered_count: delivered,
      failed_count: failed,
    }).eq("id", data.id);

    return { ok: true as const, recipients: ids.length, delivered, failed };
  });

/** List saved templates. */
export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("notification_templates" as any).select("*").order("created_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, items: data ?? [] };
  });

/** Delete template. */
export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notification_templates" as any).delete().eq("id", data.id);
    return { ok: true as const };
  });

/** Direct test push to a single user id or 10-digit phone. */
export const sendDirectTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    target: z.string().min(3).max(80),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(2000),
    image_url: z.string().url().nullable().optional(),
    action_url: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { pushToUser } = await import("./push.functions");

    let userId: string | null = null;
    const raw = data.target.trim();
    if (/^[0-9a-fA-F-]{36}$/.test(raw)) {
      userId = raw;
    } else {
      const phone = raw.replace(/\D/g, "").slice(-10);
      if (phone.length === 10) {
        const { data: c } = await supabaseAdmin.from("customers").select("user_id").eq("phone", phone).maybeSingle();
        userId = (c as any)?.user_id ?? null;
        if (!userId) {
          const { data: v } = await supabaseAdmin.from("vendors").select("user_id").eq("whatsapp", phone).maybeSingle();
          userId = (v as any)?.user_id ?? null;
        }
      }
    }
    if (!userId) return { ok: false as const, error: "user_not_found" };

    const r: any = await pushToUser({
      userId,
      title: data.title,
      body: data.body,
      imageUrl: data.image_url ?? null,
      actionUrl: data.action_url ?? null,
      highPriority: true,
      extraData: { kind: "direct_test" },
    });
    return { ok: !!r?.ok, target_user_id: userId, ...r };
  });

/** Detailed log rows with user name / phone for clickable KPI drawer. */
export const getLogDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["sent", "delivered", "failed"]).optional(),
    campaign_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(1000).default(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("admin_get_log_details", {
      _status: data.status ?? null,
      _campaign_id: data.campaign_id ?? null,
      _limit: data.limit,
    } as any);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, items: rows ?? [] };
  });
