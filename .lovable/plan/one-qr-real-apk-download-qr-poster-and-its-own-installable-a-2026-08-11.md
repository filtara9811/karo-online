# One QR: real APK download, QR poster, and its own installable app with OTP verification

## What's broken today (verified)

1. **APK download fails.** The Quick Menu long-press sheet looks up a published release for audience `customer`/`vendor` only. Both existing release rows have no APK file and no external link, so the sheet silently falls back to PWA install — and when Chrome has no install prompt available it shows "Fail ho gaya · Install cancel ho gaya" (your second screenshot). There is no One QR release option at all.
2. **"My QR Code" installs the wrong app.** Its long-press target points at `manifest-programs.json`, whose `start_url` is `/referral`. So even a successful install opens the Programs app, not the One QR dashboard. `icon-oneqr-192/512.png` already exist but no One QR manifest uses them.
3. **No verification on the One QR dashboard.** `/one-qr` has no sign-in/OTP gate; an unverified visitor just sees empty state and a "Login karein" toast.

## What will change

**1. A real One QR release channel**
- Admin → APK / Download Manager gets a third audience: **One QR App** (alongside Customer / Vendor), so you can upload the One QR `.apk` or paste a Play Store / Drive link there.
- The long-press sheet for "My QR Code" asks for the `oneqr` release, falling back to the customer release if none is published. Direct `.apk` links stream with the progress bar and retry; store/Drive links open directly.
- When nothing is published yet, the sheet says so plainly and offers Install App (PWA) instead of showing a red failure.
- The install-failure message becomes actionable: "Chrome ⋮ → Install app" plus a note that install only works on the live site (not inside preview).

**2. QR code for promotion inside the same sheet**
- A "QR code" action in the long-press sheet opens the existing QR poster with the One QR link, so you can download/print the sticker and paste it anywhere.

**3. One QR becomes its own installable app**
- New `public/manifest-oneqr.json`: name "Karo One QR", own app id, `start_url` `/one-qr?source=pwa`, standalone, using `icon-oneqr-192.png` / `icon-oneqr-512.png`.
- "My QR Code" long-press uses this manifest, so the installed icon opens **only** the One QR dashboard.

**4. OTP verification + basic details on One QR**
- Opening `/one-qr` (web or installed app) without a verified session shows a One QR-branded gate that reuses the existing OTP flow: phone → OTP → basic details (name, business name, city) → verified, then the dashboard loads with the user's projects.
- Already-signed-in users see no gate. The gate is skipped for the public storefront links (`/s/...`), which stay open to customers.

## Technical notes

- `src/components/ApkDownloadSheet.tsx`: widen `ApkTarget.audience` to include `oneqr`, add release-fallback chain, "no release published" state, clearer install error, and a QR poster action.
- `src/components/ProfileHubSheet.tsx`: My QR Code target → `audience: "oneqr"`, `manifest: "/manifest-oneqr.json"`.
- `public/manifest-oneqr.json`: new file (no service worker, install-only — matches existing manifests).
- `src/routes/admin.web.apk.tsx`: add the One QR audience option.
- `src/routes/one-qr.tsx`: wrap the dashboard in a verification gate built on the existing `RegistrationFlow` / `sendOtp`+`verifyOtp` server functions; no schema change needed (`web_apk_releases.audience` is already free text).

## Note

I can wire the One QR download channel end to end, but I cannot produce the signed `.apk` binary itself — after this ships you upload the One QR APK (or paste its Play Store link) once in Admin → APK / Download Manager under the new One QR audience, and the button starts serving a real download.
