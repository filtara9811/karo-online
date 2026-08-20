/**
 * Public server functions for the Instagram / Pinterest auto-feed.
 * Thin wrappers only — the RapidAPI key stays inside the server modules.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FeedInput = z.object({
  source: z.string().min(2).max(300),
  cursor: z.string().max(400).optional().nullable(),
  limit: z.number().int().min(1).max(30).optional(),
});

type FeedInputT = { source: string; cursor?: string | null; limit?: number };

async function page(provider: "instagram" | "pinterest", data: FeedInputT) {
  const { fetchSocialPage, cachedSocial } = await import("./social-feed-cache.server");
  try {
    return await cachedSocial(
      `${provider}:${data.source}:${data.cursor ?? ""}:${data.limit ?? 24}`,
      8 * 60_000,
      () => fetchSocialPage(provider, data.source, data.cursor ?? undefined, data.limit ?? 24),
    );
  } catch (e) {
    return { ok: false as const, error: (e as Error).message, items: [], nextCursor: null };
  }
}

export const getInstagramFeed = createServerFn({ method: "POST" })
  .inputValidator((d: FeedInputT) => FeedInput.parse(d))
  .handler(async ({ data }) => page("instagram", data));

export const getPinterestFeed = createServerFn({ method: "POST" })
  .inputValidator((d: FeedInputT) => FeedInput.parse(d))
  .handler(async ({ data }) => page("pinterest", data));

/** Admin "Test Connection" — verifies the saved RapidAPI keys actually work. */
export const testSocialFeedConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: "instagram" | "pinterest"; source: string }) =>
    z.object({ provider: z.enum(["instagram", "pinterest"]), source: z.string().min(2).max(300) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: { role: string }) => r.role === "super_admin" || r.role === "admin");
    if (!ok) return { ok: false as const, error: "forbidden", count: 0 };
    const { fetchSocialPage, clearRapidApiConfigCache } = await import("./social-feed.server");
    clearRapidApiConfigCache();
    const res = await fetchSocialPage(data.provider, data.source, null, 3);
    return { ok: res.ok, error: res.error ?? null, count: res.items.length };
  });
