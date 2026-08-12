import type { ProductCta, VideoProduct } from "@/lib/landing-types";
import { normalizeUrl } from "./landing-shared";

export type CtaPreset = {
  id: string;
  label: string;
  color: string;
  /** True when the button talks to the merchant instead of an external store. */
  contact?: boolean;
};

/** Ready-made marketplace / contact buttons a merchant can attach to a product. */
export const CTA_PRESETS: CtaPreset[] = [
  { id: "amazon", label: "Amazon", color: "#111827" },
  { id: "flipkart", label: "Flipkart", color: "#1e5cd8" },
  { id: "meesho", label: "Meesho", color: "#9f2089" },
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", contact: true },
  { id: "inquiry", label: "Inquiry", color: "#f97316", contact: true },
  { id: "call", label: "Call", color: "#0f766e", contact: true },
  { id: "custom", label: "Custom", color: "#334155" },
];

export function presetById(id?: string | null): CtaPreset | undefined {
  return CTA_PRESETS.find((p) => p.id === (id ?? "").toLowerCase());
}

export type ResolvedCta = {
  label: string;
  color: string;
  href: string;
  external: boolean;
};

/**
 * Resolves the button shown on a product card: merchant preset first, then the
 * product link, and finally a WhatsApp / call enquiry to the shop itself.
 */
export function resolveCta(
  product: VideoProduct,
  opts: { shopName: string; phone?: string | null },
): ResolvedCta {
  const cta: ProductCta = product.cta ?? {};
  const preset = presetById(cta.preset) ?? presetById(cta.label?.toLowerCase());
  const label = (cta.label ?? preset?.label ?? "Inquiry").trim() || "Inquiry";
  const color = (cta.color ?? preset?.color ?? "#f97316").trim();

  const digits = (opts.phone ?? "").replace(/\D/g, "").slice(-10);
  const text = product.enquiry?.trim()
    || `Hi ${opts.shopName}, mujhe "${product.name}" ke baare me jaankari chahiye.`;
  const waHref = digits.length === 10
    ? `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`
    : "";

  const explicit = (cta.url ?? product.url ?? "").trim();
  if (preset?.id === "call" && digits.length === 10) {
    return { label, color, href: `tel:+91${digits}`, external: false };
  }
  if (preset?.contact && !explicit) {
    return { label, color, href: waHref || (digits ? `tel:+91${digits}` : "#"), external: !!waHref };
  }
  if (explicit) return { label, color, href: normalizeUrl(explicit), external: true };
  return { label, color, href: waHref || "#", external: !!waHref };
}
