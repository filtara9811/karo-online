/**
 * Public server functions for the Instagram / Pinterest auto-feed.
 * Thin wrappers only — the RapidAPI key stays inside the server modules.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
