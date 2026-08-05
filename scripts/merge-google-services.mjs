/**
 * Merge a freshly downloaded google-services.json into the repo copy.
 *
 * Firebase Console ek hi merged file deta hai, par kabhi-kabhi aap sirf naye
 * app ki file download karte ho. Ye script naye "client" entries ko purane
 * entries ke saath merge kar deta hai (package_name par de-dupe), aur file
 * ko root + android/app/ dono jagah likh deta hai.
 *
 * Usage:
 *   node scripts/merge-google-services.mjs ~/Downloads/google-services.json
 *   node scripts/merge-google-services.mjs ~/Downloads/google-services.json --verify app.karoonline.oneqr
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const incomingPath = process.argv[2];
const verifyIdx = process.argv.indexOf("--verify");
const verifyPackage = verifyIdx > -1 ? process.argv[verifyIdx + 1] : null;

if (!incomingPath) {
  console.error("Usage: node scripts/merge-google-services.mjs <downloaded-google-services.json> [--verify <package>]");
  process.exit(1);
}
if (!fs.existsSync(incomingPath)) {
  console.error(`❌ File not found: ${incomingPath}`);
  process.exit(1);
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

let incoming;
try {
  incoming = readJson(incomingPath);
} catch (e) {
  console.error("❌ Downloaded file is not valid JSON:", e?.message || e);
  process.exit(1);
}

const rootTarget = path.join(root, "google-services.json");
const appTarget = path.join(root, "android", "app", "google-services.json");

let existing = null;
if (fs.existsSync(rootTarget)) {
  try {
    existing = readJson(rootTarget);
  } catch {
    console.warn("⚠️  Existing root google-services.json is invalid JSON — it will be replaced.");
  }
}

if (existing?.project_info?.project_id && incoming?.project_info?.project_id &&
    existing.project_info.project_id !== incoming.project_info.project_id) {
  console.error(
    `❌ Firebase project mismatch: repo has "${existing.project_info.project_id}" ` +
    `but the downloaded file is for "${incoming.project_info.project_id}".\n` +
    "   Saare Karo apps ek hi Firebase project me register hone chahiye."
  );
  process.exit(1);
}

const pkgOf = (c) => c?.client_info?.android_client_info?.package_name;
const merged = {
  project_info: incoming.project_info || existing?.project_info,
  client: [],
  configuration_version: incoming.configuration_version || existing?.configuration_version || "1",
};

const seen = new Set();
for (const c of [...(incoming.client || []), ...(existing?.client || [])]) {
  const pkg = pkgOf(c);
  if (!pkg || seen.has(pkg)) continue;
  seen.add(pkg);
  merged.client.push(c);
}

if (verifyPackage && !seen.has(verifyPackage)) {
  console.error(
    `❌ "${verifyPackage}" merged file me nahi mila.\n` +
    "   Firebase Console → Project settings → Your apps → Add app → Android me\n" +
    `   package "${verifyPackage}" register karke file dobara download karein.`
  );
  process.exit(1);
}

const out = JSON.stringify(merged, null, 2) + "\n";
fs.writeFileSync(rootTarget, out);
fs.mkdirSync(path.dirname(appTarget), { recursive: true });
fs.writeFileSync(appTarget, out);

console.log("✅ Merged google-services.json written to:");
console.log("   - google-services.json");
console.log("   - android/app/google-services.json");
console.log(`🔥 Registered packages (${merged.client.length}): ${[...seen].join(", ")}`);
