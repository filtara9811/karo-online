import { uploadVendorMedia } from "@/lib/vendor-media";
import type { LandingMediaItem, VideoProduct } from "@/lib/landing-types";

/** True when the string is an inline base64 payload (heavy — must never be saved to JSONB). */
export function isDataUrl(src?: string | null): boolean {
  return !!src && src.startsWith("data:");
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(meta || "")?.[1] || "image/jpeg";
  const bin = atob(b64 || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

/** Compress + upload an image file to storage and return its public URL. */
export async function uploadImage(userId: string, file: File, maxSide = 1600): Promise<string> {
  return uploadVendorMedia({ userId, file, kind: "gallery", maxSide });
}

/** Convert an inline base64 image into a storage URL. Non-data URLs pass through. */
export async function ensureStoredUrl(userId: string, src?: string | null): Promise<string | null> {
  if (!src) return src ?? null;
  if (!isDataUrl(src)) return src;
  if (src.startsWith("data:video")) return null; // videos must be uploaded, never inlined
  const url = await uploadImage(userId, dataUrlToFile(src, `img-${Date.now()}.jpg`));
  return url;
}

/** Move every inline image inside a product to storage. */
export async function sanitizeProduct(userId: string, p: VideoProduct): Promise<VideoProduct> {
  if (!isDataUrl(p.image)) return p;
  return { ...p, image: await ensureStoredUrl(userId, p.image) };
}

/**
 * Strip every base64 payload out of a media list, uploading images to storage.
 * Keeps landing rows in the KB range so publishing never hits a statement timeout.
 */
export async function sanitizeMediaList(
  userId: string,
  items: LandingMediaItem[],
): Promise<{ items: LandingMediaItem[]; changed: boolean }> {
  let changed = false;
  const out: LandingMediaItem[] = [];
  for (const item of items) {
    let next = item;
    if (isDataUrl(item.src)) {
      const url = await ensureStoredUrl(userId, item.src).catch(() => null);
      changed = true;
      if (!url) continue; // drop un-recoverable inline video blobs
      next = { ...next, src: url };
    }
    if (next.products?.length) {
      const products: VideoProduct[] = [];
      for (const p of next.products) {
        if (isDataUrl(p.image)) {
          changed = true;
          products.push({ ...p, image: await ensureStoredUrl(userId, p.image).catch(() => null) });
        } else {
          products.push(p);
        }
      }
      next = { ...next, products };
    }
    out.push(next);
  }
  return { items: out, changed };
}

/** Approximate JSON byte size — used as a client-side guard before writing JSONB. */
export function jsonBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

/** Reject a promise that takes longer than `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}
