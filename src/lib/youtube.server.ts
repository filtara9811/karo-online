/**
 * Server-only YouTube Data API v3 helpers.
 *
 * The API key lives in `YOUTUBE_API_KEY` and never reaches the browser — the
 * shopper landing page calls a server function which calls these helpers.
 */

const API = "https://www.googleapis.com/youtube/v3";

export type YoutubeVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  published_at: string | null;
};

export type YoutubeFeed = {
  ok: boolean;
  error?: string;
  playlistId?: string;
  videos: YoutubeVideo[];
  nextPageToken?: string | null;
};

function key(): string {
  const k = process.env["YOUTUBE_API_KEY"];
  if (!k) throw new Error("YOUTUBE_API_KEY is not set");
  return k;
}

async function call(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, key: key() });
  const r = await fetch(`${API}/${path}?${qs}`);
  const j = (await r.json()) as any;
  if (!r.ok) {
    const msg = j?.error?.errors?.[0]?.reason || j?.error?.message || `HTTP ${r.status}`;
    throw new Error(String(msg));
  }
  return j;
}

/** Uploads playlist id for a channel id (UC… → UU…). */
function uploadsPlaylist(channelId: string) {
  return channelId.startsWith("UC") ? `UU${channelId.slice(2)}` : channelId;
}

/**
 * Accepts anything a merchant might paste: a playlist id/url, a channel id/url,
 * an @handle, a /c/ or /user/ vanity url, or even a single video url.
 */
export async function resolvePlaylistId(input: string): Promise<string> {
  const raw = input.trim();
  if (!raw) throw new Error("empty_source");

  // Plain ids
  if (/^(PL|UU|FL|LL|OL)[\w-]{10,}$/.test(raw)) return raw;
  if (/^UC[\w-]{20,}$/.test(raw)) return uploadsPlaylist(raw);

  // Handle without url
  if (/^@[\w.\-]{3,}$/.test(raw)) return handleToUploads(raw.slice(1));

  let url: URL | null = null;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    /* not a url */
  }

  if (url) {
    const list = url.searchParams.get("list");
    if (list) return list.startsWith("UC") ? uploadsPlaylist(list) : list;

    const parts = url.pathname.split("/").filter(Boolean);
    const channelIdx = parts.indexOf("channel");
    if (channelIdx >= 0 && parts[channelIdx + 1]) return uploadsPlaylist(parts[channelIdx + 1]!);

    const handle = parts.find((p) => p.startsWith("@"));
    if (handle) return handleToUploads(handle.slice(1));

    const vanityIdx = parts.findIndex((p) => p === "c" || p === "user");
    if (vanityIdx >= 0 && parts[vanityIdx + 1]) return vanityToUploads(parts[vanityIdx + 1]!);
  }

  // Last resort: treat it as a search term for the channel
  return vanityToUploads(raw);
}

async function handleToUploads(handle: string): Promise<string> {
  const j = await call("channels", { part: "contentDetails", forHandle: `@${handle}` });
  const pl = j?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (pl) return pl as string;
  return vanityToUploads(handle);
}

async function vanityToUploads(term: string): Promise<string> {
  const j = await call("search", { part: "snippet", type: "channel", maxResults: "1", q: term });
  const id = j?.items?.[0]?.snippet?.channelId ?? j?.items?.[0]?.id?.channelId;
  if (!id) throw new Error("channel_not_found");
  return uploadsPlaylist(String(id));
}

/** One page (max 50) of videos from a playlist. */
export async function fetchPlaylistPage(
  playlistId: string,
  pageToken?: string,
  limit = 25,
): Promise<YoutubeFeed> {
  const j = await call("playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: String(Math.min(Math.max(limit, 1), 50)),
    ...(pageToken ? { pageToken } : {}),
  });

  const videos: YoutubeVideo[] = (j.items ?? [])
    .map((it: any) => {
      const id = it?.contentDetails?.videoId ?? it?.snippet?.resourceId?.videoId;
      if (!id) return null;
      const t = it?.snippet?.thumbnails ?? {};
      return {
        id: String(id),
        title: String(it?.snippet?.title ?? ""),
        thumbnail: (t.maxres ?? t.standard ?? t.high ?? t.medium ?? t.default)?.url ?? null,
        published_at: it?.contentDetails?.videoPublishedAt ?? it?.snippet?.publishedAt ?? null,
      } satisfies YoutubeVideo;
    })
    .filter(Boolean) as YoutubeVideo[];

  return { ok: true, playlistId, videos, nextPageToken: j.nextPageToken ?? null };
}
