# One QR: google-services.json merge (Phase 1, Step 2)

Aapki uploaded file me dono packages already present hain:
- `app.karoonline.oneqr` (naya One QR app)
- `app.karoonline.twa` (purana app)

Firebase project `karoonline` (project number 242509372770) repo ki existing file se match karta hai, isliye koi mismatch nahi.

## Kya karunga

1. Uploaded merged config ko repo me do jagah likhunga (build aur Capacitor dono yahi padhte hain):
   - `google-services.json` (root)
   - `android/app/google-services.json`
2. Duplicate/purani stray file `google-services (1).json` repo se hata dunga (confusion aur galat file commit hone se bachne ke liye).
3. Verify karunga ki merged file me `app.karoonline.oneqr` maujood hai — yahi check build ke waqt `scripts/patch-native-android.mjs` bhi karta hai, taaki FCM silently fail na ho.

Code, UI, ya build workflow me koi doosra change nahi.

## Iske baad aapka next step

GitHub → Actions → **Build Android App** → Run workflow (variant already `oneqr`) → Artifacts se `karo-oneqr-playstore-aab` download karke Play Console Internal Testing me upload karein (guide: `ONEQR_PHASE1.md` STEP 4-5).

Uske baad Play Console → App integrity → App signing key ka **SHA-1 + SHA-256** Firebase me add karein, aur SHA-256 mujhe bhej dein — main `public/.well-known/assetlinks.json` update kar dunga (deep link verify hone ke liye zaroori).
