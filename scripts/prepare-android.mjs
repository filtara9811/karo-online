import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ANDROID_VARIANTS } from "./android-variants.mjs";

const root = process.cwd();

const variant = (process.argv[2] || "customer").toLowerCase();
const config = ANDROID_VARIANTS[variant];
if (!config) {
  console.error(`Unknown Android variant "${variant}". Choose: ${Object.keys(ANDROID_VARIANTS).join(", ")}`);
  process.exit(1);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const sourceConfig = path.join(root, `capacitor.config.${variant}.ts`);
if (!fs.existsSync(sourceConfig)) {
  console.error(`Missing ${path.basename(sourceConfig)}.`);
  process.exit(1);
}
fs.copyFileSync(sourceConfig, path.join(root, "capacitor.config.ts"));

const env = {
  ...process.env,
  KARO_VARIANT: variant,
  VITE_APP_VARIANT: variant,
  KARO_APP_ID: config.id,
  KARO_APP_NAME: config.name,
  KARO_THEME_COLOR: config.theme,
  KARO_APP_ICON: config.icon,
};

console.log(`📱 Preparing ${config.name} (${config.id}) for Android Studio and CI...`);
run("bun", ["run", "build"], env);
run("bunx", ["cap", "sync", "android"], env);
run(process.execPath, ["scripts/patch-native-android.mjs"], env);
run(process.execPath, ["scripts/validate-android-toolchain.mjs"], env);
console.log(`✅ ${config.name} Android project is ready. Open the android/ folder in Android Studio.`);