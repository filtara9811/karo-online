# Phase 1 — Sirf Karo One QR (ek app, ek baar me)

Baaki apps (Shop, Quick/Customer, Ads, Referral, Vendor, Staff) is phase me
touch nahi honge. Sirf One QR complete karke Play Store Internal Testing tak
le jayenge.

## 1. Package name — approve kijiye

Proposed (repo me already isi naam par config bana hua hai, isliye yahi
recommend hai — badalna hoga to bata dein, main sab jagah rename kar dunga):

```
app.karoonline.oneqr
```

| Field | Value (copy-paste ke liye) |
|---|---|
| App name | `Karo One QR` |
| Package name | `app.karoonline.oneqr` |
| Landing URL | `https://karoonline.in/one-qr?app=oneqr` |
| Theme colour | `#0EA5E9` |
| Privacy policy | `https://karoonline.in/privacy-policy` |

Aap "Approve" karein tabhi Firebase/build config change karunga. Naam badalna
ho to reject karke naya naam likh dein.

## 2. Firebase — sirf ye ek package register karna hai

Website: `https://console.firebase.google.com`
Project: `karoonline` → gear icon (Project settings) → Your apps →
**Add app → Android**.

Form me ye teen cheezein paste karein:

- Android package name: `app.karoonline.oneqr`
- App nickname: `Karo One QR`
- Debug signing SHA-1: filhaal khaali chhod dein (baad me add karenge)

"Register app" → phir **google-services.json** download karein aur mujhe
chat me upload kar dein. Main use repo me sahi jagah (root + `android/app/`)
merge kar dunga — purana `app.karoonline.twa` entry delete nahi hoga.

SHA fingerprints (deep link + Play signing ke liye) baad me Play Console se
milte hain — Step 5 me bataunga, tab wapas isi screen par add karenge.

## 3. Repo side kaam (main karunga, approval ke baad)

- `google-services.json` (root + `android/app/`) me oneqr client add — sirf
  oneqr, baaki 4 packages nahi.
- `patch-native-android.mjs` ka Firebase guard oneqr par pass hona verify.
- `capacitor.config.oneqr.ts` (already exists) recheck: appId, appName,
  `appendUserAgent: " KaroOnlineOneQrApp"`, deep-link `allowNavigation`.
- `assetlinks.json` me sirf oneqr entry rakhne ki zaroorat nahi — extra entries
  harmless hain, isliye file waise hi rahegi.
- Push service worker + FCM: One QR variant ke liye `kind: visitor` /
  `path: /one-qr` payload deep link par khulta hai — yahi verify karunga.

## 4. Signed AAB banana (GitHub Actions, ek click)

Website: `https://github.com/<aapka-repo>/actions`

1. Left side me **Build Android App** workflow choose karein
2. **Run workflow** → variant dropdown me `oneqr` select → Run
3. Build khatam hone par niche artifacts:
   - `karo-oneqr-playstore-aab` ← Play Store me yahi upload hota hai
   - `karo-oneqr-apk` ← phone me install karke test karne ke liye

Ye workflow ko chalne ke liye repo secrets chahiye (Settings → Secrets and
variables → Actions):

```
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Ye already set hain to kuch karna nahi. Nahi hain to main keystore banane ka
exact command de dunga.

## 5. Play Store — Internal Testing tak

Website: `https://play.google.com/console`

1. **Create app** → App name: `Karo One QR`, language: English (India),
   type: App, Free
2. Left menu → **Testing → Internal testing** → Create new release →
   `app-release.aab` upload
3. Testers tab → email list banayein (apna Gmail add karein) → Save
4. Left menu → **App content**: Privacy policy URL, Data safety form,
   Ads declaration, Content rating — sab bharna zaroori hai
5. **Setup → App integrity → App signing key certificate** → wahan se
   SHA-256 aur SHA-1 copy karein → Firebase (Step 2 wali screen) me add karein
   aur mujhe SHA-256 bhej dein, main `assetlinks.json` me daal dunga
6. Internal testing link tester ko bhejein → phone par install

## 6. Testing checklist (install ke baad)

- Login/OTP: number se login, session bana rahe
- QR scan: `/s/<code>` scan → visitor gate me naam+mobile → landing page khule
- One QR dashboard: visitor list, call/WhatsApp buttons, visit count
- Deep link: `adb shell am start -a android.intent.action.VIEW -d "https://karoonline.in/one-qr"`
  seedha app kholna chahiye (assetlinks verify hone ke baad)
- Notification: test push → tap → sahi screen par jaana
- Back button, offline banner, status bar colour `#0EA5E9`

## Technical notes

- Ek hi web codebase, variant `VITE_APP_VARIANT=oneqr` se decide hota hai
  (`src/lib/app-variant.ts`). Java namespace `app.karoonline.twa` hi rahega;
  sirf `applicationId` oneqr hota hai — isse ek hi Java source set chalta hai.
- Backend/database/login sab shared — koi migration ya schema change is phase
  me nahi hoga.
- Baaki variants ki config files repo me pehle se hain par is phase me na build
  hongi na Firebase me register — Phase 2 (Shop), Phase 3 (Quick), Phase 4 (Ads)
  me ek-ek karke same process repeat karenge.
