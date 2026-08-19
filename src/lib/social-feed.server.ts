/**
 * Server-only Instagram + Pinterest auto-feed adapters (RapidAPI).
 *
 * Why RapidAPI: the official Instagram Graph API needs a Business account,
 * a Facebook Page, an app and App Review per merchant; Pinterest v5 needs
 * OAuth + app approval. Shopkeepers would never get through that, so phase 1
 * just takes a pasted handle / URL.
 *
 * Everything provider-specific is isolated here — if a scraper API dies we
 * swap the host/path (env override) and the app code stays untouched.
 * `RAPIDAPI_KEY` never reaches the browser: only server functions call this.
 */

export type SocialItem = {
  id: string;
  /** "video" plays inline; "image" renders as a still slide. */
  kind: "video" | "image";
  src: string;
  poster: string | null;
  title: string;
};

export type SocialFeed = {
  ok: boolean;
  error?: string;
  items: SocialItem[];
  nextCursor?: string | null;
};

export type SocialProvider = "instagram" | "pinterest";

const DEFAULTS: Record<SocialProvider, { host: string; path: string; userParam: string; cursorParam: string }> = {
  instagram: {
    host: "instagram-scraper-api2.p.rapidapi.com",
    path: "/v1/reels",
    userParam: "username_or_id_or_url",
    cursorParam: "pagination_token",
  },
  pinterest: {
    host: "pinterest-scraper-api.p.rapidapi.com",
    path: "/user/pins",
    userParam: "username",
    cursorParam: "bookmark",
  },
};

function config(provider: SocialProvider) {
  const d = DEFAULTS[provider];
  const p = provider.toUpperCase();
  return {
    host: process.env[`RAPIDAPI_${p}_HOST`] || d.host,
    path: process.env[`RAPIDAPI_${p}_PATH`] || d.path,
    userParam: process.env[`RAPIDAPI_${p}_USER_PARAM`] || d.userParam,
    cursorParam: process.env[`RAPIDAPI_${p}_CURSOR_PARAM`] || d.cursorParam,
  };
}

function key(): string {
  const k = process.env["RAPIDAPI_KEY"];
  if (!k) throw new Error("RAPIDAPI_KEY is not set");
  return k;
}

/** `@handle`, profile url, reel url or plain username → username. */
export function normalizeHandle(provider: SocialProvider, input: string): string {
  const raw = input.trim();
  if (!raw) throw new Error("empty_source");
  if (/^@[\w.\-]{2,}$/.test(raw)) return raw.slice(1);
  if (/^[\w.\-]{2,40}$/.test(raw)) return raw;
  let url: URL | null = null;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    throw new Error("invalid_source");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (provider === "pinterest") {
    // pinterest.com/<user>/<board>
    if (parts[0]) return parts.slice(0, 2).join("/");
    throw new Error("invalid_source");
  }
  const skip = new Set(["p", "reel", "reels", "tv", "stories", "explore"]);
  const first = parts.find((p) => !skip.has(p));
  if (!first) throw new Error("invalid_source");
  return first.replace(/^@/, "");
}

async function call(provider: SocialProvider, params: Record<string, string>) {
  const c = config(provider);
  const qs = new URLSearchParams(params);
  const r = await fetch(`https://${c.host}${c.path}?${qs}`, {
    headers: { "x-rapidapi-key": key(), "x-rapidapi-host": c.host },
  });
  const text = await r.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json error body */
  }
  if (!r.ok) {
    const msg =
      (json as { message?: string; error?: string } | null)?.message ??
      (json as { error?: string } | null)?.error ??
      `HTTP ${r.status}`;
    throw new Error(String(msg).slice(0, 160));
  }
  return json;
}

const VIDEO_KEYS = ["video_url", "videoUrl", "video_versions", "video", "url_720p", "v_url", "contentUrl"];
const IMAGE_KEYS = ["thumbnail_url", "thumbnail_src", "display_url", "image_url", "images", "thumbnail", "cover", "image"];

function firstUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") return /^https?:\/\//.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const u = firstUrl(v, depth + 1);
      if (u) return u;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const k of ["url", "src", "uri", "originals", "orig", "564x", "236x"]) {
      const u = firstUrl(obj[k], depth + 1);
      if (u) return u;
    }
    for (const v of Object.values(obj)) {
      const u = firstUrl(v, depth + 1);
      if (u) return u;
    }
  }
  return null;
}

/** Pull the list of posts/pins out of whatever envelope the provider uses. */
function findList(json: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 5 || json == null || typeof json !== "object") return [];
  if (Array.isArray(json)) {
    const rows = json.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
    return rows.length ? rows : [];
  }
  const obj = json as Record<string, unknown>;
  for (const k of ["items", "data", "pins", "results", "reels", "edges", "posts", "response"]) {
    const found = findList(obj[k], depth + 1);
    if (found.length) return found;
  }
  for (const v of Object.values(obj)) {
    const found = findList(v, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function findCursor(json: unknown, param: string): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const candidates = [param, "next_cursor", "nextCursor", "end_cursor", "bookmark", "pagination_token", "next_max_id", "cursor"];
  for (const k of candidates) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 1) return v;
    if (Array.isArray(v) && typeof v[0] === "string" && (v[0] as string).length > 1) return v[0] as string;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = findCursor(v, param);
      if (found) return found;
    }
  }
  return null;
}

function mapItem(row: Record<string, unknown>, provider: SocialProvider, i: number): SocialItem | null {
  const node = (row["node"] && typeof row["node"] === "object" ? (row["node"] as Record<string, unknown>) : row) as Record<string, unknown>;
  const media = (node["media"] && typeof node["media"] === "object" ? (node["media"] as Record<string, unknown>) : node) as Record<string, unknown>;

  let video: string | null = null;
  for (const k of VIDEO_KEYS) {
    video = firstUrl(media[k]) ?? firstUrl(node[k]);
    if (video) break;
  }
  let image: string | null = null;
  for (const k of IMAGE_KEYS) {
    image = firstUrl(media[k]) ?? firstUrl(node[k]);
    if (image) break;
  }
  const src = video ?? image;
  if (!src) return null;

  const rawId =
    node["id"] ?? node["pk"] ?? node["code"] ?? node["shortcode"] ?? node["pin_id"] ?? node["entity_id"];
  const id = `${provider}-${String(rawId ?? `${i}-${src.slice(-16)}`)}`;
  const title =
    (typeof node["title"] === "string" && node["title"]) ||
    (typeof node["grid_title"] === "string" && node["grid_title"]) ||
    (typeof node["description"] === "string" && node["description"]) ||
    firstCaption(node) ||
    "";

  return {
    id,
    kind: video ? "video" : "image",
    src,
    poster: image && image !== src ? image : null,
    title: String(title).slice(0, 140),
  };
}

function firstCaption(node: Record<string, unknown>): string {
  const cap = node["caption"];
  if (typeof cap === "string") return cap;
  if (cap && typeof cap === "object") {
    const t = (cap as Record<string, unknown>)["text"];
    if (typeof t === "string") return t;
  }
  return "";
}

/** One page of a merchant's Instagram reels / Pinterest pins. */
export async function fetchSocialPage(
  provider: SocialProvider,
  source: string,
  cursor?: string | null,
  limit = 24,
): Promise<SocialFeed> {
  const c = config(provider);
  const handle = normalizeHandle(provider, source);
  const params: Record<string, string> = { [c.userParam]: handle };
  if (cursor) params[c.cursorParam] = cursor;
  const json = await call(provider, params);

  const rows = findList(json);
  const items: SocialItem[] = [];
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const item = mapItem(row, provider, i);
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    if (items.length < Math.min(Math.max(limit, 1), 30)) items.push(item);
  });

  if (!items.length) {
    return { ok: false, error: "no_media_found", items: [], nextCursor: null };
  }
  return { ok: true, items, nextCursor: findCursor(json, c.cursorParam) };
}
