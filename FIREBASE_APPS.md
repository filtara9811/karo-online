# Firebase — 6 packages register karna (ek hi project me)

Ek hi Firebase project (`karoonline`) me chhe apps register hote hain. Database,
login aur backend sab shared rehta hai — sirf Android package per app alag hai.

## Register karne ke steps (Firebase Console)

Firebase Console → Project `karoonline` → ⚙️ Project settings → **Your apps** →
**Add app → Android**. Har package ke liye ek baar repeat karein:

| # | Android package name      | App nickname      |
|---|---------------------------|-------------------|
| 1 | `app.karoonline.twa`      | Karo Online       |
| 2 | `app.karoonline.vendor`   | Karo Vendor       |
| 3 | `app.karoonline.staff`    | Karo Staff        |
| 4 | `app.karoonline.oneqr`    | Karo One QR       |
| 5 | `app.karoonline.shop`     | Karo Digital Shop |
| 6 | `app.karoonline.referral` | Karo Referral     |

Har app me **SHA-1 + SHA-256** dono fingerprints add karein — upload keystore
aur Play App Signing key, dono ke:

```bash
# upload keystore (jo CI me use hota hai)
keytool -list -v -keystore android/upload-keystore.jks -alias <ALIAS>
# Play App Signing key → Play Console → Setup → App integrity → App signing key certificate
```

Sab 6 register hone ke baad **ek hi** merged `google-services.json` download
karein (usme saare 6 `client` entries honge) aur repo root par commit karein:

```
google-services.json          ← merged file (6 packages)
```

CI aur `scripts/patch-native-android.mjs` dono check karte hain ki jis variant
ki build ho rahi hai uska package is file me maujood hai; nahi milne par build
readable error ke saath rukti hai (silent FCM failure nahi hoti).

## Deep link / open-from-notification mapping

Android side:

- `AndroidManifest.xml` me MainActivity par do intent-filters hain —
  `https://karoonline.in` + `https://www.karoonline.in` (`autoVerify="true"`)
  aur custom scheme `karo://app/...`.
- `public/.well-known/assetlinks.json` me saare 6 packages + release/upload
  SHA-256 fingerprints listed hain, isliye https link seedha installed app
  kholta hai (App Links verified).
- `KaroFirebaseMessagingService` push data se target route nikalta hai:
  `deep_link` → `url` → `action_url` → `path` → `route` → (`lead_id` fallback).
  Relative path ho to `https://karoonline.in` prefix lag jata hai. Notification
  tap par MainActivity `ACTION_VIEW` + URI ke saath khulti hai.
- Lead alerts (`kind: lead_alert | new_lead | direct_test`) `LeadAlertService`
  par jaate hain — loud ring + Hindi TTS + `karo://app/vendor/dashboard?leadId=…`.

Web side:

- `src/lib/native/navigation.ts` ka `appUrlOpen` listener URI se
  `pathname + search + hash` nikaal kar in-app navigate karta hai.
- `src/lib/native/push.ts` ka `pushNotificationActionPerformed` accept/reject
  action buttons aur `action_url`/`url` handle karta hai.

Push payload examples (server → device):

```jsonc
{ "kind": "lead_alert", "lead_id": "123" }                  // ring + /vendor/lead/123
{ "kind": "visitor", "path": "/one-qr" }                    // One QR dashboard
{ "kind": "order", "deep_link": "karo://app/orders" }       // Orders
{ "kind": "referral", "url": "https://karoonline.in/referral" }
```

Test karne ka tarika (device connected):

```bash
# https App Link
adb shell am start -a android.intent.action.VIEW -d "https://karoonline.in/one-qr"
# custom scheme
adb shell am start -a android.intent.action.VIEW -d "karo://app/referral"
# App Links verification status
adb shell pm get-app-links app.karoonline.oneqr    # expect: verified
```
