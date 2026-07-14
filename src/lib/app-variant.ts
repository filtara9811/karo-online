/**
 * App variant — decides which "app" this build is (customer / vendor / staff).
 *
 * Set at build time via VITE_APP_VARIANT env, OR detected at runtime from:
 *  - `?app=vendor` / `?app=staff` query string (Capacitor initial server.url passes this)
 *  - navigator.userAgent contains "KaroOnlineVendorApp" / "KaroOnlineStaffApp"
 *
 * All three variants share the same web codebase; the variant only changes
 * the initial landing route and a few visual touches.
 */
export type AppVariant = "customer" | "vendor" | "staff";

export function getAppVariant(): AppVariant {
  const env = (import.meta.env.VITE_APP_VARIANT as string | undefined)?.toLowerCase();
  if (env === "vendor" || env === "staff" || env === "customer") return env;

  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(window.location.search).get("app");
      if (q === "vendor" || q === "staff" || q === "customer") return q;
      const ua = navigator.userAgent || "";
      if (/KaroOnlineStaffApp/i.test(ua)) return "staff";
      if (/KaroOnlineVendorApp/i.test(ua)) return "vendor";
    } catch {
      /* ignore */
    }
  }
  return "customer";
}

export function initialRouteForVariant(v: AppVariant): string {
  switch (v) {
    case "vendor":
      return "/vendor/dashboard";
    case "staff":
      return "/staff";
    case "customer":
    default:
      return "/quick";
  }
}
