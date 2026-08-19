/**
 * Tiny in-memory TTL cache for Instagram / Pinterest auto-feed pages so
 * repeated shopper visits don't burn the RapidAPI quota.
 */
export { fetchSocialPage, normalizeHandle } from "./social-feed.server";
export type { SocialFeed, SocialItem, SocialProvider } from "./social-feed.server";

const store = new Map<string, { at: number; value: unknown }>();

export async function cachedSocial<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
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
