/**
 * Server-only Instagram + Pinterest auto-feed adapters (RapidAPI).
 *
 * Why RapidAPI: the official Instagram Graph API needs a Business account,
 * a Facebook Page, an app and App Review per merchant; Pinterest v5 needs
 * OAuth + app approval. Shopkeepers would never get through that, so we
 * just take a pasted handle / URL.
 *
 * Credentials come from the admin panel (`app_settings.rapidapi_config`,
 * admin-only readable) and fall back to the server env secrets. Nothing here
 * ever reaches the browser: only server functions import this module.
 *
 * Verified live shapes (Aug 2026):
 *  - Instagram "Instagram Scraper Stable API": POST form-urlencoded to
 *    /get_ig_user_reels.php with `username_or_url` + `amount`; returns
 *    { reels: [{ node: { ...media, code, pk, image_versions2 } }],
 *      pagination_token }. The list endpoint exposes cover images only, so a
 *    reel renders as its cover with a deep link to Instagram.
 *  - Pinterest "Pinterest Scraper 5": GET /pins?username=<user>; returns
 *    { data: { pins: [{ id, images, videos, grid_title, seo_title }] } }.
 */

export type SocialItem = {
  id: string;
  /** "video" plays inline; "image" renders as a still slide. */
  kind: "video" | "image";
  src: string;
  poster: string | null;
  title: string;
  /** Original post URL, used when the media can only be watched on-platform. */
  link?: string | null;
};

export type SocialFeed = {
  ok: boolean;
  error?: string;
  items: SocialItem[];
  nextCursor?: string | null;
};

export type SocialProvider = "instagram" | "pinterest";

export type RapidApiConfig = {
  instagram_key: string;
  instagram_host: string;
  instagram_path: string;
  pinterest_key: string;
  pinterest_host: string;
  pinterest_path: string;
};

export const RAPIDAPI_DEFAULTS: RapidApiConfig = {
  instagram_key: "",
  instagram_host: "instagram-scraper-stable-api.p.rapidapi.com",
  instagram_path: "/get_ig_user_reels.php",
  pinterest_key: "",
  pinterest_host: "pinterest-scraper5.p.rapidapi.com",
  pinterest_path: "/pins",
};

let cached: { at: number; value: RapidApiConfig } | null = null;

/** Admin-panel config first, env secrets as fallback. Cached for a minute. */
export async function loadRapidApiConfig(force = false): Promise<RapidApiConfig> {
  if (!force && cached && Date.now() - cached.at < 60_000) return cached.value;

  const env = {
    instagram_key: process.env["RAPIDAPI_KEY"] ?? "",
    instagram_host: process.env["RAPIDAPI_INSTAGRAM_HOST"] || RAPIDAPI_DEFAULTS.instagram_host,
    instagram_path: process.env["RAPIDAPI_INSTAGRAM_PATH"] || RAPIDAPI_DEFAULTS.instagram_path,
    pinterest_key: process.env["RAPIDAPI_KEY"] ?? "",
    pinterest_host: process.env["RAPIDAPI_PINTEREST_HOST"] || RAPIDAPI_DEFAULTS.pinterest_host,
    pinterest_path: process.env["RAPIDAPI_PINTEREST_PATH"] || RAPIDAPI_DEFAULTS.pinterest_path,
  } satisfies RapidApiConfig;

  let db: Partial<RapidApiConfig> = {};
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "rapidapi_config")
      .maybeSingle();
    const v = (data as { value?: Partial<RapidApiConfig> } | null)?.value;
    if (v && typeof v === "object") db = v;
  } catch {
    /* no admin client / no row — env only */
  }

  const pick = (a: unknown, b: string) => (typeof a === "string" && a.trim() ? a.trim() : b);
  const value: RapidApiConfig = {
    instagram_key: pick(db.instagram_key, env.instagram_key),
    instagram_host: pick(db.instagram_host, env.instagram_host),
    instagram_path: pick(db.instagram_path, env.instagram_path),
    pinterest_key: pick(db.pinterest_key, env.pinterest_key),
    pinterest_host: pick(db.pinterest_host, env.pinterest_host),
    pinterest_path: pick(db.pinterest_path, env.pinterest_path),
  };
  cached = { at: Date.now(), value };
  return value;
}

/** Called by the admin panel after a save so the next fetch uses new keys. */
export function clearRapidApiConfigCache() {
  cached = null;
}

/** `@handle`, profile url, reel/board url or plain username → username. */
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
    if (parts[0]) return parts[0];
    throw new Error("invalid_source");
  }
  const skip = new Set(["p", "reel", "reels", "tv", "stories", "explore"]);
  const first = parts.find((p) => !skip.has(p));
  if (!first) throw new Error("invalid_source");
  return first.replace(/^@/, "");
}

function bestUrl(bag: unknown): string | null {
  if (!bag || typeof bag !== "object") return typeof bag === "string" && /^https?:/.test(bag) ? bag : null;
  const obj = bag as Record<string, unknown>;
  const candidates: { w: number; url: string }[] = [];
  const walk = (v: unknown, depth = 0) => {
    if (depth > 4 || v == null) return;
    if (typeof v === "string") {
      if (/^https?:\/\//.test(v)) candidates.push({ w: 0, url: v });
      return;
    }
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o["url"] === "string") {
        const w = typeof o["width"] === "number" ? (o["width"] as number) : 0;
        candidates.push({ w, url: o["url"] as string });
        return;
      }
      Object.values(o).forEach((x) => walk(x, depth + 1));
    }
  };
  walk(obj);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.w - a.w);
  return candidates[0]!.url;
}

/* ── Instagram ─────────────────────────────────────────────────────────── */

async function fetchInstagram(
  cfg: RapidApiConfig,
  handle: string,
  cursor: string | null | undefined,
  limit: number,
): Promise<SocialFeed> {
  if (!cfg.instagram_key) return { ok: false, error: "missing_api_key", items: [], nextCursor: null };
  const body = new URLSearchParams({ username_or_url: handle, amount: String(Math.min(Math.max(limit, 1), 30)) });
  if (cursor) body.set("pagination_token", cursor);

  const r = await fetch(`https://${cfg.instagram_host}${cfg.instagram_path}`, {
    method: "POST",
    headers: {
      "x-rapidapi-key": cfg.instagram_key,
      "x-rapidapi-host": cfg.instagram_host,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await r.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: r.ok ? "provider_busy" : `HTTP ${r.status}`, items: [], nextCursor: null };
  }
  if (!r.ok) {
    return { ok: false, error: String(json?.["message"] ?? `HTTP ${r.status}`).slice(0, 160), items: [], nextCursor: null };
  }
  if (typeof json?.["error"] === "string") {
    const e = json["error"] as string;
    return { ok: false, error: /username|exist/i.test(e) ? "invalid_source" : e.slice(0, 160), items: [], nextCursor: null };
  }

  const rows = (Array.isArray(json?.["reels"]) ? (json["reels"] as unknown[]) : Array.isArray(json?.["posts"]) ? (json["posts"] as unknown[]) : []) as Record<string, unknown>[];
  const items: SocialItem[] = [];
  for (const row of rows) {
    const node = (row?.["node"] && typeof row["node"] === "object" ? row["node"] : row) as Record<string, unknown>;
    const media = (node?.["media"] && typeof node["media"] === "object" ? node["media"] : node) as Record<string, unknown>;
    const video = bestUrl(media["video_versions"] ?? media["video_url"]);
    const cover =
      bestUrl(media["image_versions2"]) ??
      bestUrl(media["display_resources"]) ??
      bestUrl(media["thumbnail_url"] ?? media["display_url"]) ??
      bestUrl((media["carousel_media"] as unknown[])?.[0]);
    const src = video ?? cover;
    if (!src) continue;
    const code = typeof media["code"] === "string" ? (media["code"] as string) : null;
    const id = `instagram-${String(media["pk"] ?? media["id"] ?? code ?? items.length)}`;
    if (items.some((i) => i.id === id)) continue;
    const caption = media["caption"];
    const title =
      (caption && typeof caption === "object" && typeof (caption as Record<string, unknown>)["text"] === "string"
        ? ((caption as Record<string, unknown>)["text"] as string)
        : typeof caption === "string"
          ? caption
          : "") || "";
    items.push({
      id,
      kind: video ? "video" : "image",
      src,
      poster: cover && cover !== src ? cover : null,
      title: title.slice(0, 140),
      link: code ? `https://www.instagram.com/reel/${code}/` : null,
    });
    if (items.length >= limit) break;
  }

  if (!items.length) return { ok: false, error: "no_media_found", items: [], nextCursor: null };
  const token = json?.["pagination_token"];
  return { ok: true, items, nextCursor: typeof token === "string" && token.length > 1 ? token : null };
}

/* ── Pinterest ─────────────────────────────────────────────────────────── */

async function fetchPinterest(cfg: RapidApiConfig, handle: string, limit: number): Promise<SocialFeed> {
  if (!cfg.pinterest_key) return { ok: false, error: "missing_api_key", items: [], nextCursor: null };
  const qs = new URLSearchParams({ username: handle });
  const r = await fetch(`https://${cfg.pinterest_host}${cfg.pinterest_path}?${qs}`, {
    headers: { "x-rapidapi-key": cfg.pinterest_key, "x-rapidapi-host": cfg.pinterest_host },
  });
  const text = await r.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `HTTP ${r.status}`, items: [], nextCursor: null };
  }
  if (!r.ok) {
    const detail = json?.["detail"];
    const msg = Array.isArray(detail) ? "invalid_source" : String(json?.["message"] ?? `HTTP ${r.status}`);
    return { ok: false, error: msg.slice(0, 160), items: [], nextCursor: null };
  }

  const data = (json?.["data"] ?? {}) as Record<string, unknown>;
  const pins = (Array.isArray(data["pins"]) ? data["pins"] : []) as Record<string, unknown>[];
  const items: SocialItem[] = [];
  for (const pin of pins) {
    const image = bestUrl(pin["images"]);
    const videoBag = pin["videos"];
    let video: string | null = null;
    if (videoBag && typeof videoBag === "object") {
      const list = (videoBag as Record<string, unknown>)["video_list"];
      const urls: string[] = [];
      const walk = (v: unknown, d = 0) => {
        if (d > 4 || v == null) return;
        if (typeof v === "string" && /^https?:\/\/.+\.(mp4|m3u8)/.test(v)) urls.push(v);
        else if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1));
        else if (typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => walk(x, d + 1));
      };
      walk(list ?? videoBag);
      video = urls.find((u) => u.endsWith(".mp4")) ?? urls[0] ?? null;
    }
    const src = video ?? image;
    if (!src) continue;
    const id = `pinterest-${String(pin["id"] ?? pin["node_id"] ?? items.length)}`;
    if (items.some((i) => i.id === id)) continue;
    const title =
      (typeof pin["grid_title"] === "string" && (pin["grid_title"] as string)) ||
      (typeof pin["title"] === "string" && (pin["title"] as string)) ||
      (typeof pin["seo_title"] === "string" && (pin["seo_title"] as string)) ||
      (typeof pin["description"] === "string" && (pin["description"] as string)) ||
      "";
    items.push({
      id,
      kind: video ? "video" : "image",
      src,
      poster: image && image !== src ? image : null,
      title: String(title).slice(0, 140),
      link: pin["id"] ? `https://www.pinterest.com/pin/${String(pin["id"])}/` : null,
    });
    if (items.length >= limit) break;
  }

  if (!items.length) return { ok: false, error: "no_media_found", items: [], nextCursor: null };
  // This provider returns one page per profile call.
  return { ok: true, items, nextCursor: null };
}

/** One page of a merchant's Instagram reels / Pinterest pins. */
export async function fetchSocialPage(
  provider: SocialProvider,
  source: string,
  cursor?: string | null,
  limit = 24,
): Promise<SocialFeed> {
  const cfg = await loadRapidApiConfig();
  let handle: string;
  try {
    handle = normalizeHandle(provider, source);
  } catch (e) {
    return { ok: false, error: (e as Error).message, items: [], nextCursor: null };
  }
  const n = Math.min(Math.max(limit, 1), 30);
  return provider === "instagram"
    ? fetchInstagram(cfg, handle, cursor, n)
    : fetchPinterest(cfg, handle, n);
}
