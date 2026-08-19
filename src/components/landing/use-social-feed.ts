import { useCallback, useEffect, useRef, useState } from "react";
import { getInstagramFeed, getPinterestFeed } from "@/lib/social-feed.functions";
import type { LandingMediaItem, VideoProduct } from "@/lib/landing-types";

type ProductMap = Record<string, VideoProduct[]> | null | undefined;

/**
 * Dynamic Instagram / Pinterest feed for the shopper landing page.
 * Items arrive as normal video/image media items so the existing snap-scroll
 * reel player renders them exactly like a manually added video.
 */
export function useSocialFeed({
  provider,
  source,
  enabled,
  products,
}: {
  provider: "instagram" | "pinterest";
  source?: string | null;
  enabled?: boolean;
  products?: ProductMap;
}) {
  const [items, setItems] = useState<LandingMediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  const on = !!enabled && !!source?.trim();

  const load = useCallback(
    async (next?: string | null) => {
      if (!on || loading) return;
      setLoading(true);
      try {
        const fetcher = provider === "instagram" ? getInstagramFeed : getPinterestFeed;
        const res = await fetcher({ data: { source: source!.trim(), cursor: next ?? null, limit: 24 } });
        if (!res.ok) { setDone(true); return; }
        const fresh: LandingMediaItem[] = [];
        for (const it of res.items) {
          if (seen.current.has(it.id)) continue;
          seen.current.add(it.id);
          fresh.push({
            type: it.kind === "video" ? "video" : "image",
            src: it.src,
            ...(it.poster ? { poster: it.poster } : {}),
            products: products?.[it.id] ?? [],
          });
        }
        setItems((p) => [...p, ...fresh]);
        setCursor(res.nextCursor ?? null);
        if (!res.nextCursor) setDone(true);
      } catch {
        setDone(true);
      } finally {
        setLoading(false);
      }
    },
    // source/products are stable per landing payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on, provider, source, loading],
  );

  useEffect(() => {
    if (!on) { setItems([]); seen.current = new Set(); setDone(false); setCursor(null); return; }
    if (items.length === 0 && !done && !loading) void load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, provider, source]);

  /** Called as the viewer nears the end of the reel. */
  const loadMore = useCallback(() => {
    if (!on || done || loading || !cursor) return;
    void load(cursor);
  }, [cursor, done, load, loading, on]);

  return { items, loadMore, loading, done };
}
