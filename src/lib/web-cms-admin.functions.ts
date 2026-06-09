/**
 * Admin-side write helpers for the Special Web CMS.
 * Reads are done from the browser via the supabase client directly (RLS allows admin).
 * Writes go through server fns to bypass any client-side RLS gotchas and to centralize
 * admin auth checks.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TableEnum = z.enum([
  "web_pages",
  "web_hero_sections",
  "web_content_blocks",
  "web_pricing_plans",
  "web_apk_releases",
  "web_offers",
  "web_testimonials",
  "web_brand_logos",
  "web_faqs",
  "web_forms",
  "web_blog_posts",
  "web_media_assets",
  "web_virtual_devices",
]);
type WebTable = z.infer<typeof TableEnum>;

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const ok = (data ?? []).some((r) =>
    ["super_admin", "admin", "moderator", "support"].includes(String(r.role)),
  );
  if (!ok) throw new Error("Forbidden");
}

export const cmsUpsert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: WebTable; row: Record<string, unknown> }) =>
    z.object({ table: TableEnum, row: z.record(z.string(), z.unknown()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const row = { ...data.row, updated_by: context.userId };
    const { data: out, error } = await supabaseAdmin
      .from(data.table as never)
      .upsert(row as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const cmsDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: WebTable; id: string }) =>
    z.object({ table: TableEnum, id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFormSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { form_id: string }) =>
    z.object({ form_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: subs, error } = await supabaseAdmin
      .from("web_form_submissions")
      .select("*")
      .eq("form_id", data.form_id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return subs ?? [];
  });
