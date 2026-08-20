import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = {
  agp: "8.13.0",
  gradle: "8.14.3",
  compileSdk: "36",
  targetSdk: "36",
  java: "21",
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function requireMatch(errors, text, pattern, message) {
  if (!pattern.test(text)) errors.push(message);
}

export function validateAndroidToolchain({ root = process.cwd() } = {}) {
  const android = path.join(root, "android");
  const build = read(path.join(android, "build.gradle"));
  const wrapper = read(path.join(android, "gradle/wrapper/gradle-wrapper.properties"));
  const variables = read(path.join(android, "variables.gradle"));
  const app = read(path.join(android, "app/build.gradle"));
  const errors = [];

  requireMatch(errors, build, new RegExp(`com\\.android\\.tools\\.build:gradle:${EXPECTED.agp.replaceAll(".", "\\.")}`), `Android Gradle Plugin must be ${EXPECTED.agp}.`);
  requireMatch(errors, wrapper, new RegExp(`gradle-${EXPECTED.gradle.replaceAll(".", "\\.")}-all\\.zip`), `Gradle wrapper must be ${EXPECTED.gradle}.`);
  requireMatch(errors, variables, new RegExp(`compileSdkVersion\\s*=\\s*${EXPECTED.compileSdk}\\b`), `compileSdkVersion must be ${EXPECTED.compileSdk}.`);
  requireMatch(errors, variables, new RegExp(`targetSdkVersion\\s*=\\s*${EXPECTED.targetSdk}\\b`), `targetSdkVersion must be ${EXPECTED.targetSdk}.`);
  requireMatch(errors, app, /compileSdk\s*=\s*rootProject\.ext\.compileSdkVersion/, "App compileSdk must use the shared root value.");
  requireMatch(errors, app, /targetSdk\s*=\s*rootProject\.ext\.targetSdkVersion/, "App targetSdk must use the shared root value.");
  requireMatch(errors, app, new RegExp(`sourceCompatibility\\s*=\\s*JavaVersion\\.VERSION_${EXPECTED.java}`), `Java source compatibility must be ${EXPECTED.java}.`);
  requireMatch(errors, app, new RegExp(`targetCompatibility\\s*=\\s*JavaVersion\\.VERSION_${EXPECTED.java}`), `Java target compatibility must be ${EXPECTED.java}.`);

  if (errors.length) {
    console.error("❌ Android toolchain configuration drift detected:");
    for (const error of errors) console.error(` - ${error}`);
    console.error("Run `bun run android:prepare <variant>` to regenerate the supported configuration.");
    throw new Error("Android toolchain validation failed");
  }

  console.log(`✅ Android toolchain validated: API ${EXPECTED.compileSdk}, AGP ${EXPECTED.agp}, Gradle ${EXPECTED.gradle}, Java ${EXPECTED.java}.`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  validateAndroidToolchain();
}