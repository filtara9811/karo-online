# Capacitor Native Builds — 6 apps from 1 codebase

Karo Online ships as **six separate Android apps**, all sharing the same web
codebase, database and login. Each has its own package name, launcher icon,
theme colour and default landing screen.

| Variant  | Package name              | Landing URL                                          | Play Store title    |
|----------|---------------------------|------------------------------------------------------|---------------------|
| customer | `app.karoonline.twa`      | `https://karoonline.in/quick`                        | Karo Online         |
| vendor   | `app.karoonline.vendor`   | `https://karoonline.in/vendor/dashboard?app=vendor`  | Karo Vendor         |
| staff    | `app.karoonline.staff`    | `https://karoonline.in/staff?app=staff`              | Karo Staff          |
| oneqr    | `app.karoonline.oneqr`    | `https://karoonline.in/one-qr?app=oneqr`             | Karo One QR         |
| shop     | `app.karoonline.shop`     | `https://karoonline.in/vendor/shop?app=shop`         | Karo Digital Shop   |
| referral | `app.karoonline.referral` | `https://karoonline.in/referral?app=referral`        | Karo Referral       |

The web app auto-detects the variant from `?app=` or the user-agent
(`KaroOnlineVendorApp`, `KaroOnlineOneQrApp`, `KaroOnlineShopApp`,
`KaroOnlineReferralApp`, `KaroOnlineStaffApp`) via `src/lib/app-variant.ts`.
That file is the single source of truth for app name, package name, home
route, theme colour, bottom-dock items and Play Store URL.

## Build a native AAB/APK for one variant

```bash
# 1. Point Capacitor at the right config
cp capacitor.config.oneqr.ts capacitor.config.ts   # or .customer / .vendor / .staff / .shop / .referral

# 2. Build the web bundle for that variant
VITE_APP_VARIANT=oneqr bun run build

# 3. Patch native project with the variant's identity
KARO_APP_ID=app.karoonline.oneqr KARO_APP_NAME="Karo One QR" node scripts/patch-native-android.mjs

# 4. Sync + open Android Studio
npx cap sync android
npx cap open android
# Build → Generate Signed APK / AAB
```

Notes:
- The Java namespace stays `app.karoonline.twa` for all variants; only
  `applicationId` (`KARO_APP_ID`) and the launcher label (`KARO_APP_NAME`)
  change per app. This keeps one set of Java sources.
- Register all six package names in the **same** Firebase project, then place
  the merged `google-services.json` at the project root (or upload per build).
- Backend (Lovable Cloud) is shared, so data and roles sync across all apps.
  Auth sessions are per-app (Android sandbox), same credentials everywhere.

## Deep links

`public/.well-known/assetlinks.json` lists all six packages with the release
keystore SHA-256 fingerprints, so `https://karoonline.in/...` opens the right
installed app. Keep `android:autoVerify="true"` on the https intent-filter.

## Cross-app promotion

`src/components/OtherAppsRail.tsx` renders Play Store links to the other five
apps inside the Quick Menu, driven by `otherApps()` in `app-variant.ts`.
