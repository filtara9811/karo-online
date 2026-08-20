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
# One command selects the identity, builds web assets, syncs Capacitor,
# applies native settings, and validates the Android toolchain.
bun run android:prepare oneqr

# Then open the generated project.
bunx cap open android
```

In Android Studio, open **Build → Generate Signed App Bundle or APK → Android
App Bundle**. The local machine must have **Android SDK Platform 36** installed
and Android Studio's **Gradle JDK** set to **JDK 21**.

Supported variants: `customer`, `vendor`, `staff`, `oneqr`, `shop`, `referral`.
All variants use compile/target SDK 36, AGP 8.13.0, Gradle 8.14.3, and Java 21.

Notes:
- The Java namespace stays `app.karoonline.twa` for all variants; only
  `applicationId` (`KARO_APP_ID`) and the launcher label (`KARO_APP_NAME`)
  change per app. This keeps one set of Java sources.
- Register all six package names in the **same** Firebase project, then place
  the merged `google-services.json` at the project root (or upload per build).
- Backend (Lovable Cloud) is shared, so data and roles sync across all apps.
  Auth sessions are per-app (Android sandbox), same credentials everywhere.
- Do not manually change SDK or plugin versions in Android Studio. Run
  `bun run android:prepare <variant>` again after any Capacitor sync.

## Deep links

`public/.well-known/assetlinks.json` lists all six packages with the release
keystore SHA-256 fingerprints, so `https://karoonline.in/...` opens the right
installed app. Keep `android:autoVerify="true"` on the https intent-filter.

## Cross-app promotion

`src/components/OtherAppsRail.tsx` renders Play Store links to the other five
apps inside the Quick Menu, driven by `otherApps()` in `app-variant.ts`.
