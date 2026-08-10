/**
 * Image URL optimiser.
 *
 * Supabase Storage can resize/re-encode on the fly through its image render
 * endpoint. Merchant uploads are often 2-4 MB phone photos, so every landing
 * image goes through here with a slot-sized width and a quality cap.
 * Non-storage URLs (CDN assets, YouTube thumbs, data URLs) pass through.
 */
export type ImgOpts = { w?: number; q?: number; resize?: "cover" | "contain" };

export function optimizedImage(url?: string | null, opts: ImgOpts = {}): string | undefined {
  if (!url) return undefined;
  if (!/^https?:\/\//i.test(url)) return url;

  const { w = 720, q = 62, resize = "cover" } = opts;

  // Supabase Storage public object -> render/image transform endpoint
  if (url.includes("/storage/v1/object/public/")) {
    const base = url.split("?")[0].replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${base}?width=${Math.round(w)}&quality=${q}&resize=${resize}`;
  }

  return url;
}

/** Common slot sizes so call sites stay consistent. */
export const IMG = {
  avatarSm: { w: 96, q: 60 } as ImgOpts,
  avatarLg: { w: 224, q: 65 } as ImgOpts,
  tile: { w: 240, q: 60 } as ImgOpts,
  card: { w: 560, q: 62 } as ImgOpts,
  hero: { w: 820, q: 66 } as ImgOpts,
};
