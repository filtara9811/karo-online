/**
 * Resolve build-time identity for one app variant and print it as
 * KEY=value lines (append to $GITHUB_ENV in CI, or `eval` locally).
 *
 * Usage: node scripts/variant-env.mjs oneqr
 */
const VARIANTS = {
  customer: { id: "app.karoonline.twa", name: "Karo Online", theme: "#000000", icon: "public/icon-512.png" },
  vendor: { id: "app.karoonline.vendor", name: "Karo Vendor", theme: "#0a0a0a", icon: "public/icon-vendor-512.png" },
  staff: { id: "app.karoonline.staff", name: "Karo Staff", theme: "#fff8dc", icon: "public/icon-512.png" },
  oneqr: { id: "app.karoonline.oneqr", name: "Karo One QR", theme: "#0EA5E9", icon: "public/icon-oneqr-512.png" },
  shop: { id: "app.karoonline.shop", name: "Karo Digital Shop", theme: "#0f766e", icon: "public/icon-512.png" },
  referral: { id: "app.karoonline.referral", name: "Karo Referral", theme: "#f97316", icon: "public/icon-512.png" },
};

const variant = (process.argv[2] || "customer").toLowerCase();
const cfg = VARIANTS[variant];
if (!cfg) {
  console.error(`Unknown variant "${variant}". Options: ${Object.keys(VARIANTS).join(", ")}`);
  process.exit(1);
}

console.log(`KARO_VARIANT=${variant}`);
console.log(`VITE_APP_VARIANT=${variant}`);
console.log(`KARO_APP_ID=${cfg.id}`);
console.log(`KARO_APP_NAME=${cfg.name}`);
console.log(`KARO_THEME_COLOR=${cfg.theme}`);
console.log(`KARO_APP_ICON=${cfg.icon}`);
