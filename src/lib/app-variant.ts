/**
 * App variant — decides which "app" this build is.
 *
 * One web codebase ships as several separate Play Store apps. The variant
 * changes the landing route, app name, theme colour, bottom-dock items and
 * which route prefixes belong to this app. Database + auth stay shared.
 *
 * Set at build time via VITE_APP_VARIANT env, OR detected at runtime from:
 *  - `?app=vendor` / `?app=oneqr` … query string (Capacitor server.url passes it)
 *  - navigator.userAgent contains "KaroOnline<Variant>App"
 */
export type AppVariant =
  | "customer"
  | "vendor"
  | "staff"
  | "oneqr"
  | "shop"
  | "referral";

export type VariantConfig = {
  id: AppVariant;
  /** Play Store / launcher title */
  appName: string;
  /** Android package name for this variant */
  packageName: string;
  /** Where the app opens on launch */
  home: string;
  /** Splash / status-bar colour */
  themeColor: string;
  /** Route prefixes that belong to this app */
  scope: string[];
  /** Bottom dock configuration */
  dock: {
    left: { label: string; to: string };
    center: { title: string; sub: string };
  };
  /** Play Store listing URL (used for cross-app promotion + deep-link handoff) */
  playUrl: string;
};

const PLAY = (pkg: string) => `https://play.google.com/store/apps/details?id=${pkg}`;

export const VARIANTS: Record<AppVariant, VariantConfig> = {
  customer: {
    id: "customer",
    appName: "Karo Online",
    packageName: "app.karoonline.twa",
    home: "/",
    themeColor: "#000000",
    scope: ["/"],
    dock: {
      left: { label: "My Orders", to: "/orders" },
      center: { title: "Digital shope..", sub: "Digital shop | Vander panal | Referral" },
    },
    playUrl: PLAY("app.karoonline.twa"),
  },
  vendor: {
    id: "vendor",
    appName: "Karo Vendor",
    packageName: "app.karoonline.vendor",
    home: "/vendor/dashboard",
    themeColor: "#0a0a0a",
    scope: ["/vendor", "/leads", "/lead"],
    dock: {
      left: { label: "Leads", to: "/leads/inbox" },
      center: { title: "Vendor Panel", sub: "Leads | Shop | Wallet | KYC" },
    },
    playUrl: PLAY("app.karoonline.vendor"),
  },
  staff: {
    id: "staff",
    appName: "Karo Staff",
    packageName: "app.karoonline.staff",
    home: "/staff",
    themeColor: "#fff8dc",
    scope: ["/staff"],
    dock: {
      left: { label: "Tasks", to: "/staff/tasks" },
      center: { title: "Staff Panel", sub: "Tasks | Vendors | Wallet" },
    },
    playUrl: PLAY("app.karoonline.staff"),
  },
  oneqr: {
    id: "oneqr",
    appName: "Karo One QR",
    packageName: "app.karoonline.oneqr",
    home: "/one-qr",
    themeColor: "#0EA5E9",
    scope: ["/one-qr", "/s", "/q", "/c"],
    dock: {
      left: { label: "Visitors", to: "/one-qr" },
      center: { title: "One QR Business", sub: "QR | Visitors | Links | Poster" },
    },
    playUrl: PLAY("app.karoonline.oneqr"),
  },
  shop: {
    id: "shop",
    appName: "Karo Digital Shop",
    packageName: "app.karoonline.shop",
    home: "/vendor/shop",
    themeColor: "#e8e0d0",
    scope: ["/vendor/shop", "/vendor/listing", "/product", "/cart", "/checkout", "/orders"],
    dock: {
      left: { label: "Orders", to: "/orders" },
      center: { title: "Digital Shop", sub: "Products | Orders | Listing" },
    },
    playUrl: PLAY("app.karoonline.shop"),
  },
  referral: {
    id: "referral",
    appName: "Karo Referral",
    packageName: "app.karoonline.referral",
    home: "/referral",
    themeColor: "#f97316",
    scope: ["/referral", "/r"],
    dock: {
      left: { label: "Rewards", to: "/referral" },
      center: { title: "Referral Program", sub: "Scan | Share | Earn" },
    },
    playUrl: PLAY("app.karoonline.referral"),
  },
};

const ALL: AppVariant[] = ["customer", "vendor", "staff", "oneqr", "shop", "referral"];

function isVariant(v: string | null | undefined): v is AppVariant {
  return !!v && (ALL as string[]).includes(v);
}

export function getAppVariant(): AppVariant {
  const env = (import.meta.env.VITE_APP_VARIANT as string | undefined)?.toLowerCase();
  if (isVariant(env)) return env;

  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(window.location.search).get("app")?.toLowerCase();
      if (isVariant(q)) return q;
      const ua = navigator.userAgent || "";
      if (/KaroOnlineStaffApp/i.test(ua)) return "staff";
      if (/KaroOnlineVendorApp/i.test(ua)) return "vendor";
      if (/KaroOnlineOneQrApp/i.test(ua)) return "oneqr";
      if (/KaroOnlineShopApp/i.test(ua)) return "shop";
      if (/KaroOnlineReferralApp/i.test(ua)) return "referral";
    } catch {
      /* ignore */
    }
  }
  return "customer";
}

export function getVariantConfig(v: AppVariant = getAppVariant()): VariantConfig {
  return VARIANTS[v] ?? VARIANTS.customer;
}

export function initialRouteForVariant(v: AppVariant): string {
  if (v === "customer") return "/quick";
  return getVariantConfig(v).home;
}

/** Is this pathname part of the current variant's app? */
export function isInVariantScope(pathname: string, v: AppVariant = getAppVariant()): boolean {
  const cfg = getVariantConfig(v);
  if (v === "customer") return true; // customer app is the full marketplace
  return cfg.scope.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}

/** Other apps for cross-promotion (everything except the current variant). */
export function otherApps(v: AppVariant = getAppVariant()): VariantConfig[] {
  return ALL.filter((x) => x !== v).map((x) => VARIANTS[x]);
}
