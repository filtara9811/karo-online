# Stabilize Android Studio AAB builds for all Karo apps

## Confirmed diagnosis
- The installed native stack is Capacitor 8.4.1. Its Android modules default to API 36 and Java 21, and some source code references `Build.VERSION_CODES.VANILLA_ICE_CREAM`; compiling those modules with API 34 cannot work.
- The root project already uses the correct Capacitor 8 toolchain: Android Gradle Plugin 8.13.0 and Gradle 8.14.3. AGP 8.13 supports API 36, so downgrading to AGP 8.5 or SDK 34 is neither required nor desirable.
- `android/variables.gradle` and `android/app/build.gradle` currently force API 35, while `scripts/patch-native-android.mjs` rewrites those same API 35 values after sync. This is why manual Android Studio changes do not persist.
- The patch script also pins AndroidX and Cordova versions older than Capacitor 8’s documented baseline.
- The repository does not use Gradle `productFlavors`; its six apps are selected through Capacitor config files plus `KARO_APP_ID`. They share one Android project, so one centralized native version baseline is the correct architecture.
- Local build instructions currently disagree about whether native patching runs before or after `cap sync`, which can produce different checked-in and generated states.

## Implementation

### 1. Align the complete native dependency matrix
Use one production baseline everywhere:

```text
Capacitor Android/Core/CLI  8.4.1
compileSdk / targetSdk      36
minSdk                      26 (retain current app support floor)
Android Gradle Plugin       8.13.0
Gradle wrapper              8.14.3
Java source/target          21
Google Services plugin      4.4.4
```

- Update the shared Android variables to API 36 and Capacitor 8-compatible AndroidX/Cordova versions.
- Make the app module read compile/min/target SDK from the shared root variables instead of repeating raw SDK numbers.
- Preserve the existing application IDs, namespace, Firebase setup, release signing, icons, versioning, and native services.

### 2. Stop generated files from reverting the fix
- Refactor `patch-native-android.mjs` so its generated `variables.gradle` and `app/build.gradle` use the same centralized API 36 baseline.
- Replace the broad mutation of Gradle files inside `node_modules` with validation or narrowly scoped compatibility handling; dependencies should not depend on locally rewritten installed packages.
- Add a fail-fast native compatibility check that reports any drift in AGP, wrapper, SDK, or Java versions before Gradle compilation.
- Keep the patch operation idempotent so repeated Capacitor syncs and Android Studio opens produce the same project.

### 3. Unify all six app variants
- Keep the current variant-selection model for customer, vendor, staff, OneQR, shop, and referral; do not introduce unnecessary Gradle flavors.
- Ensure every selected Capacitor config flows through the same sync/patch/version validation path while changing only app identity values such as package name, label, icon, theme, and start URL.
- Remove the workflow’s OneQR-only release identity assertion from the shared build path or scope it correctly, so manually selected non-OneQR variants are not treated as configuration failures.

### 4. Make local Android Studio and CI use one preparation flow
- Add one documented/scripted command to select a variant, build web assets, run Capacitor sync, apply the native patch, and validate the resulting Android project in the correct order.
- Reuse that same command from GitHub Actions instead of maintaining a separate native setup sequence.
- Update local instructions for Android Studio: install Android SDK Platform 36, select JDK 21 for Gradle, run the variant preparation command, open `android/`, sync Gradle, then use **Build Signed App Bundle**.
- Keep CI-only keystore decoding in GitHub Actions; it will not alter or block Android Studio’s normal signing wizard or a local `android/key.properties` setup.

## Verification
- Run a clean Capacitor sync and native preparation twice, then confirm the second run creates no version drift.
- Inspect the resolved Gradle model to confirm every app and plugin module compiles against API 36 with Java 21.
- Compile native debug/release code to prove the `VANILLA_ICE_CREAM` symbol resolves and there are no AGP/Gradle metadata mismatches.
- Validate at least OneQR and Vendor variant preparation to prove package identity changes while the native SDK matrix stays identical.
- Run `bundleRelease` when local signing properties are available; otherwise validate the release bundle task up to signing and provide the exact Android Studio signing steps.
- Preserve the current web application and backend behavior; this change is limited to native Android build configuration and documentation.

## Practical requirement on the local machine
Android Studio must have Android SDK Platform 36 installed and use JDK 21 for this Capacitor 8 project. The repository can enforce and explain these requirements, but it cannot install those local Android Studio components automatically.