# Phase 1 — Karo One QR: A se Z tak (copy-paste guide)

Sirf **ek app** — Karo One QR. Shop / Quick / Ads baad me, ek-ek karke.

## 0. Final identity (yahi values har jagah paste karni hain)

| Field | Value |
|---|---|
| App name | `Karo One QR` |
| Android package name | `app.karoonline.oneqr` |
| Landing URL | `https://karoonline.in/one-qr?app=oneqr` |
| Theme colour | `#0EA5E9` |
| Privacy policy URL | `https://karoonline.in/privacy-policy` |
| Category | Business |

Ye package name badalna **nahi** hai. Play Store par ek baar upload hone ke
baad package name kabhi change nahi ho sakta.

---

## STEP 1 — Firebase me sirf ye ek app register karein

Website: **https://console.firebase.google.com**

1. Project `karoonline` kholein
2. Top-left gear icon → **Project settings**
3. Neeche scroll → **Your apps** → **Add app** → Android icon
4. Form bharein:
   - Android package name: `app.karoonline.oneqr`
   - App nickname: `Karo One QR`
   - Debug signing certificate SHA-1: **khaali chhod dein** (Step 5 me add karenge)
5. **Register app** dabayein
6. **google-services.json** download karein (Download button)
7. Baaki steps (SDK add karna) **skip** karein — code me pehle se laga hua hai

Sirf yahi ek package register karein. `app.karoonline.shop`,
`app.karoonline.referral` etc. abhi nahi.

---

## STEP 2 — Downloaded file repo me lagayein

Local machine par, repo folder me:

```bash
node scripts/merge-google-services.mjs ~/Downloads/google-services.json --verify app.karoonline.oneqr
```

Ye script:
- naye oneqr entry ko purane entries ke saath merge karta hai
- file ko `google-services.json` **aur** `android/app/google-services.json` dono jagah likh deta hai
- agar oneqr package file me nahi hai to saaf error deta hai (silent FCM failure nahi)

Phir ye file commit karein.

Aap chahein to file mujhe chat me upload kar dein — main merge kar dunga.

---

## STEP 3 — Signing keystore (ek hi baar banana hai)

Agar keystore pehle se hai to ye step skip karein.

```bash
keytool -genkey -v -keystore upload-keystore.jks -alias karo-upload \
  -keyalg RSA -keysize 2048 -validity 10000
# password yaad rakhein / password manager me save karein
base64 -w0 upload-keystore.jks > keystore.b64.txt
```

Website: **https://github.com/<aapka-repo>/settings/secrets/actions**

4 secrets add karein:

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `keystore.b64.txt` ka poora content |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `karo-upload` |
| `ANDROID_KEY_PASSWORD` | key password (same ho to wahi) |

`upload-keystore.jks` file ka backup rakhein — kho gayi to app update kabhi
nahi ho payega.

---

## STEP 4 — Signed AAB banayein (ek click)

Website: **https://github.com/<aapka-repo>/actions**

1. Left side → **Build Android App**
2. **Run workflow** → `variant` dropdown → `oneqr` → **Run workflow**
3. ~10-15 min baad build page ke neeche **Artifacts**:
   - `karo-oneqr-playstore-aab` → Play Store me upload karne ke liye
   - `karo-oneqr-apk` → phone me install karke test karne ke liye
   - `karo-oneqr-store-assets` → icon + feature graphic

Build khud hi: oneqr capacitor config copy karta hai, `VITE_APP_VARIANT=oneqr`
se web bundle banata hai, package name/icon/theme patch karta hai,
`google-services.json` me `app.karoonline.oneqr` verify karta hai, aur signed
APK + AAB nikalta hai.

---

## STEP 5 — Play Console: app banayein + Internal Testing

Website: **https://play.google.com/console**

1. **Create app**
   - App name: `Karo One QR`
   - Default language: English (India)
   - App or game: App
   - Free or paid: Free
   - declarations tick → **Create app**
2. Left menu → **Test and release → Testing → Internal testing** →
   **Create new release** → `app-release.aab` upload → **Next** → **Save**
3. Usi page par **Testers** tab → **Create email list** → apna Gmail +
   testers ke email → Save → release ko rollout karein
4. Left menu → **Monetise/Grow → Store presence → Main store listing**:
   - Short description (80 char):
     `Ek QR — visitors capture, links, poster aur live business dashboard.`
   - Full description: `PLAYSTORE_ONEQR.md` se copy karein
   - App icon: `public/store/oneqr-icon-512.png`
   - Feature graphic: `public/store/oneqr-feature-graphic.png`
   - Phone screenshots: kam se kam 2 (One QR dashboard, visitor list, poster)
5. Left menu → **Policy → App content**: Privacy policy URL, Data safety,
   Ads, Content rating, Target audience — sab complete karein
6. Left menu → **Setup → App integrity → App signing** →
   **App signing key certificate** ka **SHA-256** aur **SHA-1** copy karein:
   - Firebase (Step 1 wali app screen) → **Add fingerprint** → dono paste karein
   - SHA-256 mujhe chat me bhej dein → main `public/.well-known/assetlinks.json`
     update kar dunga (deep link verify hone ke liye zaroori hai)

---

## STEP 6 — Testing checklist (APK / internal testing build par)

| Test | Kaise | Pass hone ka matlab |
|---|---|---|
| Launch | App icon tap | `/one-qr` screen khule, status bar `#0EA5E9` |
| OTP login | mobile number → OTP | login ho, app band karke kholne par bhi logged-in |
| QR scan | doosre phone se QR scan | visitor gate me naam + mobile poochhe, phir landing page |
| Visitor list | One QR dashboard | naya visitor top par, Call + WhatsApp button kaam karein |
| Visit count | dobara scan | counter badhe |
| Deep link | `adb shell am start -a android.intent.action.VIEW -d "https://karoonline.in/one-qr"` | app khule (browser nahi) |
| App Links verified | `adb shell pm get-app-links app.karoonline.oneqr` | `verified` dikhe |
| Notification | test push bhejein | tap par sahi screen khule |
| Back button | andar jaake back | app se bahar na nikle, screen wapas jaye |
| Offline | internet band | offline banner dikhe, crash na ho |

Deep link Step 5.6 (SHA-256 assetlinks me) ke baad hi verify hoga — usse
pehle link browser me khulega, ye normal hai.

---

## Order of operations (short)

```text
1. Firebase me app.karoonline.oneqr register  →  google-services.json
2. merge-google-services.mjs chalayein + commit
3. GitHub secrets me keystore (ek hi baar)
4. Actions → Build Android App → variant: oneqr → signed AAB
5. Play Console → Internal testing me AAB upload → listing + app content
6. Play signing SHA-256 → Firebase + assetlinks.json
7. Test checklist → stable → Production
```

Phase 2 (Karo Shop) tabhi shuru karenge jab ye poora stable ho jaye.
