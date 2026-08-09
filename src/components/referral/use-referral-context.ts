import { useLocation } from "@tanstack/react-router";
import { getVariantConfig } from "@/lib/app-variant";

export type ReferralSurface = "customer" | "oneqr" | "vendor" | "shop";

export type ReferralContext = {
  surface: ReferralSurface;
  label: string;
  accent: string;
  accentSoft: string;
  /** Builds the shareable deep link for the current surface. */
  buildLink: (myCode: string, shopCode?: string | null) => string;
  shareTitle: string;
  shareText: (link: string) => string;
};

function origin() {
  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://karoonline.in";
}

const CUSTOMER: ReferralContext = {
  surface: "customer",
  label: "Refer & Earn",
  accent: "#f97316",
  accentSoft: "#fdba74",
  buildLink: (code) => `${origin()}/r/${encodeURIComponent(code)}`,
  shareTitle: "Karo Online — Refer & Earn",
  shareText: (link) => `Karo Online join karo aur wallet me reward pao 🎁\n${link}`,
};

const VENDOR: ReferralContext = {
  surface: "vendor",
  label: "Refer a shop",
  accent: "#d4af37",
  accentSoft: "#f5d97a",
  buildLink: (code) => `${origin()}/r/${encodeURIComponent(code)}?k=vendor`,
  shareTitle: "Karo Online — Vendor Referral",
  shareText: (link) => `Apni dukaan Karo Online par list karo, leads aur rewards pao.\n${link}`,
};

const ONEQR: ReferralContext = {
  surface: "oneqr",
  label: "Share my QR",
  accent: "#f59e0b",
  accentSoft: "#fcd34d",
  buildLink: (code, shopCode) => {
    const shop = shopCode || code;
    return `${origin()}/s/${encodeURIComponent(shop)}?ref=${encodeURIComponent(code)}`;
  },
  shareTitle: "My Digital Business Card",
  shareText: (link) => `Mera digital QR business page dekhiye 👇\n${link}`,
};

const SHOP: ReferralContext = {
  ...ONEQR,
  surface: "shop",
  label: "Share my shop",
  accent: "#10b981",
  accentSoft: "#6ee7b7",
  shareTitle: "My Digital Shop",
  shareText: (link) => `Meri digital dukaan par order kariye 👇\n${link}`,
};

/** Route-aware referral surface: same wallet, different shared link. */
export function useReferralContext(): ReferralContext {
  const pathname = useLocation({ select: (l) => l.pathname });
  const variant = getVariantConfig();

  if (pathname.startsWith("/one-qr")) return ONEQR;
  if (pathname.startsWith("/vendor")) return VENDOR;
  if (pathname.startsWith("/vendors") || pathname.startsWith("/product") || pathname.startsWith("/orders"))
    return SHOP;
  if (variant.id === "oneqr") return ONEQR;
  if (variant.id === "vendor" || variant.id === "shop") return VENDOR;
  return CUSTOMER;
}
