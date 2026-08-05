# Karo One QR — Play Store listing + signed AAB

## Identity

| Field            | Value                                        |
|------------------|----------------------------------------------|
| App name         | Karo One QR                                  |
| Package name     | `app.karoonline.oneqr`                       |
| Landing route    | `https://karoonline.in/one-qr?app=oneqr`     |
| Theme colour     | `#0EA5E9`                                    |
| Category         | Business                                     |
| Privacy policy   | https://karoonline.in/privacy-policy         |

## Listing assets (repo me ready hain)

| Asset                    | File                                    | Size      |
|--------------------------|-----------------------------------------|-----------|
| App icon (Play listing)  | `public/store/oneqr-icon-512.png`       | 512×512   |
| Launcher icon (build)    | `public/icon-oneqr-512.png`             | 512×512   |
| Feature graphic          | `public/store/oneqr-feature-graphic.png`| 1024×500  |

Screenshots (min 2, phone 9:16) Play Console me upload karein — `/one-qr`
dashboard, visitor list, poster screen ke screenshots best kaam karte hain.

## Store text

**Short description (80 chars)**
`Ek QR — visitors capture, links, poster aur live business dashboard.`

**Full description**
```
Karo One QR aapke business ke liye ek hi QR code deta hai.

• Ek QR — customer scan kare aur naam + mobile number capture ho jaye
• Live visitor list — call aur WhatsApp ek tap me
• Landing page — story style photo/video, social + payment + shop links
• QR poster — print-ready poster apne logo aur accent colour ke saath
• Visit stats — kitne scan, kis din, kaun aaya

Login Karo Online account se hi hota hai — data aur reports sab jagah same.
```

## Signed AAB banane ka tarika

### A) GitHub Actions se (recommended, one click)

Actions → **Build Android App** → Run workflow → `variant: oneqr` → Run.

Workflow khud:
1. `capacitor.config.oneqr.ts` → `capacitor.config.ts` copy karta hai
2. `VITE_APP_VARIANT=oneqr` ke saath web bundle build karta hai
3. `KARO_APP_ID=app.karoonline.oneqr`, `KARO_APP_NAME="Karo One QR"`,
   `KARO_THEME_COLOR=#0EA5E9`, `KARO_APP_ICON=public/icon-oneqr-512.png`
   ke saath native patch chalata hai
4. `google-services.json` me `app.karoonline.oneqr` verify karta hai
5. release keystore se **signed APK + AAB** banata hai

Artifacts: `karo-oneqr-playstore-aab` (Play upload), `karo-oneqr-apk` (testing),
`karo-oneqr-store-assets` (icon + feature graphic).

Required repo secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

### B) Local machine se

```bash
cp capacitor.config.oneqr.ts capacitor.config.ts
eval "$(node scripts/variant-env.mjs oneqr | sed 's/^/export /')"
bun run build
bunx cap sync android
node scripts/patch-native-android.mjs
cd android && ./gradlew :app:bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

## Upload se pehle checklist

- [ ] Firebase me `app.karoonline.oneqr` registered + merged `google-services.json` committed (dekhein `FIREBASE_APPS.md`)
- [ ] `public/.well-known/assetlinks.json` me oneqr package + Play App Signing SHA-256
- [ ] `versionCode` pichhli release se bada (CI `github.run_number` se auto badhta hai)
- [ ] Play Console → Data safety form + Privacy policy URL bhara hua
