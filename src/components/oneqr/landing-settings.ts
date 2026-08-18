import { supabase } from "@/integrations/supabase/client";

/**
 * Merchant landing settings are per QR project (one row per project), so every
 * studio read/write must be scoped to the project slug currently being edited.
 * Without the slug we fall back to the merchant's oldest project row, which is
 * exactly what the backend RPC does.
 */

/** Resolve a project slug owned by the signed-in merchant to its id. */
export async function resolveProjectId(userId: string, slug?: string | null): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabase
    .from("qr_projects")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/** Read the settings row for one project (or the default row when no slug). */
export async function loadLinkSettings<T>(
  userId: string,
  slug: string | null | undefined,
  columns: string,
): Promise<T | null> {
  const projectId = await resolveProjectId(userId, slug);
  let q = supabase
    .from("merchant_link_settings" as never)
    .select(columns)
    .eq("user_id", userId);
  q = projectId ? q.eq("project_id", projectId) : q.order("created_at", { ascending: true });
  const { data } = await q.limit(1).maybeSingle();
  return (data as T | null) ?? null;
}

/** Save settings for one project — the slug travels inside the RPC payload. */
export function saveLinkSettings(
  payload: Record<string, unknown>,
  slug?: string | null,
): Promise<{ error: { message: string } | null }> {
  return supabase.rpc("upsert_merchant_link_settings" as never, {
    _payload: slug ? { ...payload, project_slug: slug } : payload,
  } as never) as unknown as Promise<{ error: { message: string } | null }>;
}
