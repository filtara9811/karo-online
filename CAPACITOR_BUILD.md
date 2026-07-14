# Capacitor Native Builds — 3 apps from 1 codebase

Karo Online ships as **three separate Android apps**, all sharing the same web
codebase and Supabase backend but each with its own package name, launcher
icon, and default landing screen.

| Variant  | Package name            | Landing URL                                            | Play Store title |
|----------|-------------------------|--------------------------------------------------------|-------------------|
| customer | `app.karoonline.twa`    | `https://karoonline.in/quick`                          | Karo Online       |
| vendor   | `app.karoonline.vendor` | `https://karoonline.in/vendor/dashboard?app=vendor`    | Karo Vendor       |
| staff    | `app.karoonline.staff`  | `https://karoonline.in/staff?app=staff`                | Karo Staff        |

The web app auto-detects the variant from `?app=` or the user-agent
(`KaroOnlineVendorApp` / `KaroOnlineStaffApp`) via `src/lib/app-variant.ts`.

## Build a native APK for one variant

```bash
# 1. Point Capacitor at the right config
cp capacitor.config.customer.ts capacitor.config.ts     # or .vendor.ts / .staff.ts

# 2. Sync + open Android Studio
npx cap sync android
npx cap open android

# 3. In Android Studio: Build → Generate Signed APK / AAB
```

Each variant has its own Play Store listing under the package name above.
Backend (Supabase) is shared, so real-time sync just works across all three.

## Deep links

- `https://karoonline.in/s/onboard/<token>` → opens Staff App if installed
  (via Android App Links / assetlinks.json), else Play Store or browser.
- `https://karoonline.in/v/onboard/<token>` → same for Vendor App.

Configure the intent-filter with `android:autoVerify="true"` per variant's
`AndroidManifest.xml` before submitting to Play Store, and add each package's
SHA-256 fingerprint to `public/.well-known/assetlinks.json`.
