import { getDB } from "./db";

const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24h

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const rec = (await db.get("cache", key)) as
      | { data: T; updatedAt: number; ttlMs: number }
      | undefined;
    if (!rec) return null;
    if (Date.now() - rec.updatedAt > rec.ttlMs) return null;
    return rec.data;
  } catch {
    return null;
  }
}

export async function cachePeek<T>(key: string): Promise<T | null> {
  // Return even if stale (used to keep something visible offline)
  try {
    const db = await getDB();
    const rec = (await db.get("cache", key)) as { data: T } | undefined;
    return rec?.data ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL) {
  try {
    const db = await getDB();
    await db.put("cache", { key, data, updatedAt: Date.now(), ttlMs });
  } catch {
    /* ignore */
  }
}

export async function cacheDelete(key: string) {
  try {
    const db = await getDB();
    await db.delete("cache", key);
  } catch {
    /* ignore */
  }
}

/** Fetch with cache-first-then-network strategy. */
export async function swr<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { ttlMs?: number; onUpdate?: (data: T) => void } = {},
): Promise<T | null> {
  const cached = await cachePeek<T>(key);
  if (typeof navigator !== "undefined" && navigator.onLine) {
    fetcher()
      .then((fresh) => {
        cacheSet(key, fresh, opts.ttlMs);
        opts.onUpdate?.(fresh);
      })
      .catch(() => {});
  }
  return cached;
}
