import { useCallback, useEffect, useRef, useState } from "react";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import type { LandingMediaItem, VideoProduct } from "@/lib/landing-types";

type ProductMap = Record<string, VideoProduct[]> | null | undefined;

/**
 * Dynamic YouTube channel / playlist feed for the shopper landing page.
 * Videos arrive as `type: "url"` media items so the existing loop-safe embed
 * player renders them exactly like a manually added video link.
 */
export function useYoutubeFeed({
  source,
  enabled,
  products,
}: {
  source?: string | null;
  enabled?: boolean;
  products?: ProductMap;
}) {
  const [items, setItems] = useState<LandingMediaItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  const on = !!enabled && !!source?.trim();

  const load = useCallback(
    async (pageToken?: string | null) => {
      if (!on || loading) return;
      setLoading(true);
      try {
        const res = await getYoutubeFeed({
          data: { source: source!.trim(), pageToken: pageToken ?? null, limit: 25 },
        });
        if (!res.ok) { setDone(true); return; }
        const next: LandingMediaItem[] = [];
        for (const v of res.videos) {
          if (seen.current.has(v.id)) continue;
          seen.current.add(v.id);
          next.push({
            type: "url",
            src: `https://www.youtube.com/watch?v=${v.id}`,
            poster: v.thumbnail,
            products: products?.[v.id] ?? [],
          });
        }
        setItems((p) => [...p, ...next]);
        setToken(res.nextPageToken ?? null);
        if (!res.nextPageToken) setDone(true);
      } catch {
        setDone(true);
      } finally {
        setLoading(false);
      }
    },
    // products/source are stable per landing payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on, source, loading],
  );

  useEffect(() => {
    if (!on) { setItems([]); seen.current = new Set(); setDone(false); setToken(null); return; }
    if (items.length === 0 && !done && !loading) void load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, source]);

  /** Called as the viewer nears the end of the reel. */
  const loadMore = useCallback(() => {
    if (!on || done || loading || !token) return;
    void load(token);
  }, [done, loading, load, on, token]);

  return { items, loadMore, loading, done };
}
