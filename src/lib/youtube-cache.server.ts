/**
 * Tiny in-memory TTL cache for YouTube Data API responses so repeated shopper
 * visits don't burn the daily quota. Re-exports the fetch helpers so the server
 * function only needs one dynamic import.
 */
export { resolvePlaylistId, fetchPlaylistPage } from "./youtube.server";
export type { YoutubeFeed, YoutubeVideo } from "./youtube.server";

const store = new Map<string, { at: number; value: unknown }>();

export async function cachedFeed<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  store.set(key, { at: Date.now(), value });
  if (store.size > 300) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    for (const [k] of oldest) store.delete(k);
  }
  return value;
}
