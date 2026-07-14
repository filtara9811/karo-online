/** Confidence-score helpers for OCR extraction results. */

export type ConfidenceLevel = "high" | "medium" | "low";

export function levelFor(score: number | null | undefined): ConfidenceLevel {
  if (score == null) return "medium";
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function colorFor(level: ConfidenceLevel): {
  dot: string;
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (level) {
    case "high":
      return {
        dot: "bg-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        label: "High",
      };
    case "medium":
      return {
        dot: "bg-amber-500",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        label: "Medium",
      };
    case "low":
      return {
        dot: "bg-rose-500",
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        label: "Low — verify",
      };
  }
}

export function pctString(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score * 100)}%`;
}

/** Weighted overall from field-level confidence (mobile/name/address matter most). */
const WEIGHTS: Record<string, number> = {
  business_name: 3,
  mobile: 3,
  address: 2,
  owner_name: 1.5,
  city: 1,
  state: 1,
  pincode: 1.5,
  gstin: 1.5,
  email: 1,
  whatsapp: 1,
  shop_type_hint: 1,
  services: 1,
  products: 1,
};

export function computeOverall(fields: Record<string, number> | null | undefined): number {
  if (!fields) return 0;
  let num = 0;
  let den = 0;
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v !== "number") continue;
    const w = WEIGHTS[k] ?? 0.5;
    num += v * w;
    den += w;
  }
  return den > 0 ? Math.max(0, Math.min(1, num / den)) : 0;
}
