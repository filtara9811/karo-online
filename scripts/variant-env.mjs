/**
 * Resolve build-time identity for one app variant and print it as
 * KEY=value lines (append to $GITHUB_ENV in CI, or `eval` locally).
 *
 * Usage: node scripts/variant-env.mjs oneqr
 */
import { ANDROID_VARIANTS } from "./android-variants.mjs";

const variant = (process.argv[2] || "customer").toLowerCase();
const cfg = ANDROID_VARIANTS[variant];
if (!cfg) {
  console.error(`Unknown variant "${variant}". Options: ${Object.keys(ANDROID_VARIANTS).join(", ")}`);
  process.exit(1);
}

console.log(`KARO_VARIANT=${variant}`);
console.log(`VITE_APP_VARIANT=${variant}`);
console.log(`KARO_APP_ID=${cfg.id}`);
console.log(`KARO_APP_NAME=${cfg.name}`);
console.log(`KARO_THEME_COLOR=${cfg.theme}`);
console.log(`KARO_APP_ICON=${cfg.icon}`);
