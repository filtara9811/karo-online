# QR Hub – Final Refinements Plan

Scope: complete the QR Hub poster creator, setup sheet, public landing page, and Razorpay premium flow. Match the annotated screenshots exactly. No new business logic outside what is listed.

---

## 1. Poster Creator (`src/components/QrPosterSheet.tsx`)

### 1a. Pan/Zoom shop image
- Add a `PanZoomFrame` wrapper around the main hero image with:
  - 1-finger drag (pointer events) to shift X/Y
  - 2-finger pinch (touch events) to scale 1×–4×
  - Mouse-wheel + drag fallback for desktop testing
  - Bounds clamp so the image always covers the frame
- Persist `{ x, y, scale }` per slot to `merchant_link_settings.poster_bg_transforms` (jsonb keyed by slot index). Migration already exists.

### 1b. Multi-media thumbnail slots
- Each of the 3 slots accepts: image upload, short video upload (mp4/webm ≤ 15 MB), OR a pasted URL (YouTube/Instagram/direct video).
- Tap slot when empty → small chooser popover: "Photo · Video · Paste URL".
- Persist as `poster_media: [{ type:'image'|'video'|'url', src, provider? }]` (column already in migration).
- Active slot renders correctly in preview: `<img>` for image, `<video autoplay muted loop playsinline>` for video, embedded `<iframe>` for YouTube/Insta URL.

### 1c. QR center logo
- Use `karoLogoAsset.url` (gold map-pin) drawn cleanly onto QR canvas. Remove the "K" text fallback path – on error just leave the gold ring blank rather than showing a stray letter.
- Increase center clear-area + EC level `H` (already set) so scanning is reliable.

### 1d. Bold name strip + avatar
- Left: circular avatar (40px) showing merchant `avatar_url` (from profiles) with `Camera` overlay to upload/replace.
- Center: shop name in **bold display font** (`font-display font-extrabold tracking-tight`).
- Right: pencil edit icon as today.

### 1e. Split bottom action bar – matches Quick Service bottom sheet style
- Replace the current 3-button row with a single pill bar (rounded-full, white, gold border) split in half:
  - Left half: `Download` icon + label
  - Vertical divider
  - Right half: `Link Menu` (globe icon) + label
- Left half → opens **DownloadShareSheet** (new bottom Drawer) with two large action tiles:
  - **Download QR** → renders blob, shows circular spinner → green check tick animation on success → save/share to gallery.
  - **Share | QR** → native `navigator.share` with file (WhatsApp first-class).
- Right half → opens existing `MerchantLinksSetupSheet` (Setup Scan Actions).
- Remove the centre "+" FAB.

---

## 2. Setup Scan Actions (`src/components/MerchantLinksSetupSheet.tsx`)

- Provider dropdown gains an **"Other"** option → reveals a free-text "Custom payload" field that is stored as-is into the UPI/VPA value.
- UPI/VPA input row: add a small `ScanLine`/`Camera` icon button on the right end. Click opens new `VpaScannerSheet` (already drafted) – live camera, `BarcodeDetector` (with `jsQR` wasm fallback if unavailable), parses `upi://pay?pa=...&pn=...` and writes `pa` back into the input.
- "Update Payment Details" button persists via existing RPC.

---

## 3. Public Landing Page (`src/routes/s.$code.tsx`)

- Strip all marketplace chrome: no search bar, no global header, no profile menu. Render as a standalone single-screen page.
- Layout mirrors the poster:
  1. Media card at top: shows the same active poster media (image / video / URL embed) using the same `poster_media` payload.
  2. Bold shop name + avatar strip.
  3. Three vertical CTA buttons stacked, large, full-width:
     - **Make Trusted Payment** – `upi://pay?pa=<vpa>&pn=<name>` deep link; hidden if Payment toggle OFF.
     - **Visit Digital Shop** – merchant `digital_shop_url`; hidden if toggle OFF.
     - **Download Mobile App** – device-aware: iOS → `ios_app_url` (App Store), else → Play Store URL with `?referrer=karo_<code>`. Always visible.
- Loader prefetches the merchant row server-side via existing `get_public_merchant_by_code` RPC → first paint ≈ 1 s. No client `useEffect` waterfalls.

---

## 4. Razorpay Premium Fix (`src/lib/premium-links.functions.ts` + `src/lib/razorpay-client.ts`)

- Ensure `Razorpay` script is loaded once and the `handler` callback invokes `verify_premium_payment` server fn with `{ order_id, payment_id, signature }`.
- Fix hanging: wrap script-load in a promise with 8 s timeout + toast on failure; ensure `modal.ondismiss` resolves so the calling component re-enables the CTA.
- On verify success: optimistic update `is_premium=true` in the parent query cache, close modal, toast success.

---

## 5. Technical details

- Files to create: `src/components/PanZoomFrame.tsx`, `src/components/DownloadShareSheet.tsx`, `src/components/VpaScannerSheet.tsx` (finalize), `src/components/MediaSlotChooser.tsx`.
- Files to edit: `QrPosterSheet.tsx`, `MerchantLinksSetupSheet.tsx`, `s.$code.tsx`, `premium-links.functions.ts`, `razorpay-client.ts`.
- DB: no new migrations — `poster_media`, `poster_bg_transforms`, `ios_app_url` already added in earlier migrations.
- Verification: rely on the harness build/typecheck; spot-check with Playwright by opening the QR poster sheet and the landing page at `/s/<test-code>`.
