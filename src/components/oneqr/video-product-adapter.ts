import type { EditorProduct } from "@/components/ProductEditor";
import type { VideoProduct } from "@/lib/landing-types";

function parsePrice(v?: string | null): number {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** VideoProduct → the rich POS editor draft. */
export function toEditorProduct(p: VideoProduct): EditorProduct {
  const price = parsePrice(p.price);
  const mrp = parsePrice(p.mrp) || price;
  return {
    id: p.id,
    name: p.name ?? "",
    tagline: p.enquiry ?? "",
    description: p.description ?? "",
    price,
    mrp,
    image: p.image ?? "",
    rating: p.rating ?? 4.8,
    reviews: p.reviews ?? 0,
    seller: "",
    category: "",
    sellingPrice: price,
    media: p.image ? [{ id: "m0", type: "image", url: p.image }] : [],
    variations: [],
  };
}

/** Rich editor draft → VideoProduct, preserving fields the editor doesn't own. */
export function fromEditorProduct(original: VideoProduct, e: EditorProduct): VideoProduct {
  const price = e.sellingPrice ?? e.price ?? 0;
  const image = (e.media ?? []).find((m) => m.type === "image")?.url || e.image || original.image || null;
  const variations = (e.variationsList ?? []).map((v) => v.label).filter(Boolean);
  const extras = [
    e.primaryCategory ? `Category: ${e.primaryCategory}` : "",
    variations.length ? `Options: ${variations.join(", ")}` : "",
    e.saleType && e.saleType !== "retail" ? `Sale: ${e.saleType}` : "",
  ].filter(Boolean);
  const description = [e.description?.trim(), ...extras].filter(Boolean).join("\n");
  const mrp = e.mrp && e.mrp > price ? `₹${e.mrp}` : (original.mrp ?? null);
  return {
    ...original,
    id: original.id,
    name: e.name?.trim() || original.name,
    price: price ? `₹${price}` : (original.price ?? ""),
    mrp,
    image,
    description,
    enquiry: e.tagline?.trim() || original.enquiry || "",
    url: original.url ?? "",
    rating: e.rating ?? original.rating ?? 4.8,
    reviews: e.reviews ?? original.reviews ?? null,
    quantity: original.quantity ?? null,
    cta: original.cta ?? null,
  };
}

