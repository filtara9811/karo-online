# Karo Online — Android (Capacitor) Build Guide

This project is wrapped with **Capacitor 8** to produce a native Android APK / AAB. The web app stays the source of truth; Capacitor just packages it and adds native hooks (StatusBar overlay, immersive mode, native FCM, native geolocation).

## Prerequisites (one-time, on your dev machine)

1. **Node 20+** and `bun` (project already uses bun).
2. **Android Studio** (Hedgehog or newer) → installs Android SDK + platform-tools.
3. **JDK 17** (Android Studio bundles one).
4. Environment vars (Linux/macOS):
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
   ```

## First-time Android folder setup

The `android/` folder is NOT committed (it's generated). Create it once:

```bash
bun install
bun run build
npx cap add android
npx cap sync android
```

Then drop your Firebase config:

```bash
cp /path/to/google-services.json android/app/google-services.json
```

## Build & Run

```bash
# 1. Build the web bundle
bun run build

# 2. Copy bundle + plugins into android/
npx cap sync android

# 3. Open in Android Studio (recommended for first build)
npx cap open android

# OR build APK from CLI
cd android
./gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # → AAB for Play Store
```

## Immersive Mode (no Chrome bar)

`capacitor.config.ts` already enables `StatusBar.overlaysWebView` and dark style. To make it truly edge-to-edge on Android 13+, add this to `android/app/src/main/java/app/karoonline/twa/MainActivity.java` after the `super.onCreate(...)` call:

```java
import androidx.core.view.WindowCompat;
import android.view.WindowManager;

@Override
public void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
    getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
}
```

## Signing (Play Store)

Use the **same SHA-256 fingerprint** already registered in `public/.well-known/assetlinks.json`. Generate the keystore once and reuse for every release.

## Live reload during dev (optional)

```bash
CAP_SERVER_URL=http://<your-laptop-lan-ip>:8080 npx cap sync android
```

Then run `bun run dev` on your laptop and launch the APK on a phone on the same Wi-Fi.

## What works natively (auto, no extra code)

- `@capacitor/status-bar` — dark immersive status bar
- `@capacitor/splash-screen` — wine/gold splash
- `@capacitor/push-notifications` — native FCM (requires `google-services.json`)
- `@capacitor/geolocation` — high-accuracy GPS
- `@capacitor/network`, `@capacitor/preferences`, `@capacitor/share`

The web FCM token registration is automatically skipped on native; the native plugin takes over.
