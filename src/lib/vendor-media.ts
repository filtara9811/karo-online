import { supabase } from "@/integrations/supabase/client";

export type VendorMediaKind = "cover" | "avatar" | "gallery" | "business";

const BUCKET = "business-cards";

async function prepareImage(file: File, maxSide: number): Promise<File | Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image too large. Please choose an image under 12 MB.");
  }
  if (file.type === "image/gif" || file.type === "image/svg+xml" || typeof createImageBitmap === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
  if (!blob) return file;
  if (blob.size >= file.size && file.size < 1_500_000) return file;
  return blob;
}

export async function uploadVendorMedia({
  userId,
  file,
  kind,
  maxSide = 1600,
}: {
  userId: string;
  file: File;
  kind: VendorMediaKind;
  maxSide?: number;
}): Promise<string> {
  const media = await prepareImage(file, maxSide);
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${kind}-${Date.now()}-${suffix}.jpg`;
  const uploadPromise = supabase.storage.from(BUCKET).upload(path, media, {
    upsert: false,
    contentType: media.type || "image/jpeg",
    cacheControl: "31536000",
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error("Upload timeout — internet slow hai, dobara try karein.")), 45_000);
  });
  const { error } = await Promise.race([uploadPromise, timeoutPromise]);
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}