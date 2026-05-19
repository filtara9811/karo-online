# KaroOnline — Play Store Deployment Guide

Yeh step-by-step guide hai apni web app ko **Google Play Store** par live karne ke liye, **Capacitor** ka use karke (Android wrapper banta hai jisme aapki PWA chalti hai).

App ID: `in.karoonline.app`
Display name: `KaroOnline`
Privacy: `https://karoonline.in/privacy`
Live web: `https://karoonline.in`

---

## Pre-requisites (apne local Mac/Windows/Linux par)

1. **Node.js 20+** & **bun** install
2. **Android Studio** (latest) — https://developer.android.com/studio
3. **JDK 17** (Android Studio ke saath aata hai)
4. **Git** + project clone (Lovable se "Export to GitHub" → `git clone`)
5. **Google Play Console** account ($25 one-time) — https://play.google.com/console

---

## Step 1 — Project locally setup karo

```bash
git clone <your-repo-url> karoonline
cd karoonline
bun install
bun run build
```

Test karo: `bun run dev` — `http://localhost:5173` par app chalni chahiye.

---

## Step 2 — Capacitor install karo

```bash
bun add @capacitor/core @capacitor/cli @capacitor/android
bunx cap init "KaroOnline" "in.karoonline.app" --web-dir dist
```

Yeh `capacitor.config.ts` banayega. Use ese update karo:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.karoonline.app',
  appName: 'KaroOnline',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Production: app local dist serve karega.
    // Live URL chahiye to: url: 'https://karoonline.in',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
  },
};

export default config;
```

---

## Step 3 — Android project generate karo

```bash
bun run build
bunx cap add android
bunx cap sync android
```

Yeh `android/` folder banayega.

---

## Step 4 — Icons & Splash

Apke project mein already hai:
- `public/icon-512.png` — launcher icon
- `public/icon-192.png`

```bash
bun add -d @capacitor/assets
# Source: assets/icon.png (1024×1024) + assets/splash.png (2732×2732) banao,
# ya existing public/icon-512.png ko 1024 upscale karo
bunx capacitor-assets generate --android
```

Manual fallback: Android Studio → `app/src/main/res/` → right-click → "New → Image Asset" → icon-512 select karo.

---

## Step 5 — AndroidManifest permissions

`android/app/src/main/AndroidManifest.xml` mein `<manifest>` tag ke andar add karo:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

Deep links ke liye `<activity>` ke andar:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="karoonline.in" />
</intent-filter>
```

---

## Step 6 — Signing key generate karo (ek baar)

```bash
keytool -genkey -v -keystore karoonline-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias karoonline

# Password 2 baar pucha jayega — SAFE JAGAH SAVE KARO
```

**`karoonline-release.jks` file ko safely backup karo (Google Drive private, password manager, etc.).** Yeh kho gayi to future updates push nahi kar paoge.

`android/key.properties` file banao (yeh git mein commit MAT karo — `.gitignore` mein add karo):

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=karoonline
storeFile=../../karoonline-release.jks
```

`android/app/build.gradle` mein `android { }` ke andar add karo:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    defaultConfig {
        applicationId "in.karoonline.app"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1        // har release ke saath +1 karo
        versionName "1.0.0"  // semantic version
    }
}
```

---

## Step 7 — Production build (AAB)

```bash
bun run build
bunx cap sync android
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` — yehi Play Store par upload karna hai.

---

## Step 8 — Play Console listing

1. https://play.google.com/console → **Create app**
   - Name: `KaroOnline`
   - Default language: English (India)
   - Type: App
   - Free
2. **Dashboard** par left menu se:
   - **App content** → privacy policy URL: `https://karoonline.in/privacy`
   - **Data safety form** bharo (location, contact info, etc. — jo permissions use kar rahe ho)
   - **Content rating** → questionnaire bharo
   - **Target audience** → 18+
   - **Ads** → No (agar nahi hai)
3. **Main store listing**:
   - **Short description** (80 chars):
     > `Local vendors se quick service & quotes — leads, orders, sab ek app mein.`
   - **Full description** (4000 chars): apke saath jo discuss hua tha woh paste karo
   - **App icon** (512×512 PNG)
   - **Feature graphic** (1024×500 PNG)
   - **Phone screenshots** (min 2, max 8) — preview se capture karke ya pehle generate kiye screenshots use karo
4. **Production** → **Create new release**
   - **App bundle**: `app-release.aab` upload karo
   - **Release name**: `1.0.0`
   - **Release notes**: First release! Quick local services, vendor leads, secure payments.
   - **Review release** → **Start rollout to Production**

---

## Step 9 — Digital Asset Links (deep links verification)

Play Console signing certificate ka SHA-256 chahiye:
**Setup → App integrity → App signing → "App signing key certificate" → SHA-256 fingerprint** copy karo.

Phir `public/.well-known/assetlinks.json` update karo:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "in.karoonline.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_HERE"]
  }
}]
```

Re-deploy karo. Verify: https://karoonline.in/.well-known/assetlinks.json browser mein khulna chahiye.

---

## Step 10 — Future updates

Har naye update ke liye:
1. Code change → commit
2. `android/app/build.gradle` mein `versionCode` +1, `versionName` update
3. `bun run build && bunx cap sync android && cd android && ./gradlew bundleRelease`
4. Play Console → new release → upload AAB → rollout

---

## Troubleshooting

- **"App not installed"** test mein: `versionCode` increment karo
- **Splash flicker**: `capacitor.config.ts` mein `launchShowDuration` adjust karo
- **White screen on launch**: `bunx cap sync android` rerun karo aur Android Studio mein "Build → Clean Project"
- **Crash on map**: Google Maps API key ko `AndroidManifest.xml` mein add karna padega (`<meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>`)
- **Push notifications**: FCM already integrated hai — `google-services.json` Firebase Console se download karke `android/app/` mein paste karo

---

## Quick checklist before submit

- [ ] Privacy policy URL live
- [ ] App icon 512×512 ready
- [ ] Feature graphic 1024×500 ready
- [ ] 2-8 screenshots ready
- [ ] Short + long description finalized
- [ ] Data safety form filled
- [ ] Content rating done
- [ ] Signing keystore backed up safely
- [ ] AAB built with `./gradlew bundleRelease`

Good luck! 🚀
