/**
 * Public server functions for the dynamic YouTube feed on the shopper landing
 * page. Thin wrappers only — real work lives in `youtube.server.ts` so the
 * API key never enters a client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FeedInput = z.object({
  source: z.string().min(2).max(300),
  pageToken: z.string().max(200).optional().nullable(),
  limit: z.number().int().min(1).max(50).optional(),
});

/** Resolve + fetch one page of the merchant's channel / playlist videos. */
export const getYoutubeFeed = createServerFn({ method: "POST" })
  .inputValidator((d: { source: string; pageToken?: string | null; limit?: number }) => FeedInput.parse(d))
  .handler(async ({ data }) => {
    const { resolvePlaylistId, fetchPlaylistPage, cachedFeed } = await import("./youtube-cache.server");
    try {
      const playlistId = await cachedFeed(`pl:${data.source}`, 30 * 60_000, () =>
        resolvePlaylistId(data.source),
      );
      const page = await cachedFeed(
        `pg:${playlistId}:${data.pageToken ?? ""}:${data.limit ?? 25}`,
        5 * 60_000,
        () => fetchPlaylistPage(playlistId, data.pageToken ?? undefined, data.limit ?? 25),
      );
      return page;
    } catch (e) {
      return { ok: false as const, error: (e as Error).message, videos: [], nextPageToken: null };
    }
  });
