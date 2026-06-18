## Goal
Polish the merchant QR Poster + public landing flow per the annotated screenshots. Everything below is scoped to UI/UX + one small migration. No business-logic rewrites.

## 1. Karo Online brand logo asset
- Upload a clean gold "Karo Online" map-pin logo (square PNG) once via `lovable-assets` → `src/assets/karo-logo.png.asset.json`.
- Replace the `/karo-logo.png` reference inside `QrPosterSheet.tsx` (both on-screen QR overlay + canvas export). Drop the "K" text fallback entirely; if the image fails, render a subtle gold dot instead.

## 2. QR Poster Sheet — `src/components/QrPosterSheet.tsx`
**Media frame (top photo area)**
- Replace the plain `<img>` with a `PanZoomFrame` (new local component, ~80 LOC). Supports:
  - 1-finger drag (pointer events) to shift the photo up/down/left/right inside the rounded container.
  - Pinch-to-zoom (2-pointer distance) + double-tap to reset.
  - Persists `{ scale, x, y }` per slot into `merchant_link_settings.poster_bg_transforms` (new jsonb).
  - Same transform is replayed in the canvas export so the downloaded poster matches what the user framed.

**Thumbnail slots → multi-media**
- Each of the 3 slots accepts: image upload, short video upload (≤15 MB, mp4/webm), or a URL (YouTube / Instagram / mp4). Long-press slot → small action menu (Replace / Paste URL / Remove).
- Store as `poster_media: [{ kind: 'image'|'video'|'url', src, thumb?, transform? }]`. Keep legacy `poster_bg_urls` populated with the image entries for back-compat.
- Video slots show a play-glyph thumbnail; on the poster only the active slot renders (image directly, video poster frame for video/url).

**Name strip (matches screenshot #1)**
- Add a circular merchant avatar to the LEFT of the name input (reads `profiles.avatar_url`; tap to upload → stored on profile). Bold the shop name with `font-display font-extrabold tracking-tight`. Keep the pencil edit affordance.

**Split bottom action bar**
- Replace current 3-button row with TWO pills matching the annotated layout:
  - Left pill `📥 Download / Share` → opens `PosterExportSheet` (new bottom sheet, styled like the existing `QuickActionsSheet`).
  - Right pill `🌐 Link Menu` → opens existing `MerchantLinksSetupSheet`.
- Remove the floating center "+" button.

**`PosterExportSheet` (new file)**
- Two big rows (Quick Service look): "Download QR" and "Share | QR".
- Download: circular determinate progress ring around the icon while rendering+saving, morphs into a green check + haptic on success. Uses the existing share-with-file → anchor fallback chain.
- Share: directly calls `navigator.share({ files })`; on Android this surfaces WhatsApp as the top target. Desktop fallback = copy link toast.

## 3. Merchant Links Setup Sheet — `src/components/MerchantLinksSetupSheet.tsx`
- Add `"Other"` option to the payment provider `<Select>`; when chosen, show a free-text "Custom label" input (saved into existing `payment_label`).
- Add a scanner icon button inside the UPI/VPA input (right-aligned, as in screenshot #2). Tapping opens a new `VpaScannerSheet`.

## 4. New `src/components/VpaScannerSheet.tsx`
- Lightweight live camera viewfinder using `BarcodeDetector` when available, else lazy-load `qr-scanner` (already a transitive option — fallback bundle). Uses `getUserMedia({ video: { facingMode: 'environment' } })`.
- On scan: parse `upi://pay?pa=...&pn=...` (and PhonePe/Paytm intent URLs), extract `pa` (VPA) + optional `pn` (label), write back to the parent input, close sheet, success toast.
- Manual "Enter manually" fallback + permission-denied empty state.

## 5. Public landing page — `src/routes/s.$code.tsx`
**Speed (<1 s target)**
- Preload critical fetch in route `loader` via the public Supabase client (anon, no auth) calling `get_public_landing(_code)`. Inline initial data so first paint has merchant card already.
- Strip every shared chrome import (no `AppShell`, no header, no search). Route is intentionally a bare full-bleed page.
- Aggressive `Cache-Control: public, max-age=60, s-maxage=300` via `setResponseHeaders` in the loader.

**Mirrored media card**
- Render the exact poster composition: framed shop photo (or auto-playing muted-inline video / YouTube embed for the active media), gold border, QR is NOT shown (the customer already scanned it).
- Below the card: 3 vertical pill buttons in fixed order, gated by toggles:
  1. **Make Trusted Payment** — opens UPI deep link based on `payment_provider` (`phonepe://`, `paytmmp://`, `tez://`, `upi://`).
  2. **Visit Digital Shop** — opens `digital_shop_url` in new tab.
  3. **Download Mobile App** — device-aware: iOS UA → App Store URL (admin-settable `ios_app_url`, fallback to Play if blank); else Play Store with `?referrer=code=<code>`. Always visible.
- Add `ios_app_url` text column to `landing_page_settings` for the device-aware redirect.

## 6. Razorpay ₹599 unlock fix — `src/lib/premium-links.functions.ts` + caller
- Symptom: checkout hangs because the client-side `Razorpay` handler's `verify` is fired but UI never closes. Fix:
  - In the caller component (inside `MerchantLinksSetupSheet`'s premium tile), wrap `rzp.on('payment.failed', …)` and ensure the `handler` callback awaits `verifyPremiumLinks({ data })` inside a `try/finally` that always closes the loading state.
  - Switch `verifyPremiumLinks` HMAC import from `crypto` to `node:crypto` (Worker-safe) and return `{ ok, unlocked_at }` so the UI can refresh `premium_unlocked` immediately without a second round-trip.
  - Add a small "Verifying…" toast + success confetti hook.

## 7. Migration (single file)
```sql
ALTER TABLE public.merchant_link_settings
  ADD COLUMN IF NOT EXISTS poster_media jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS poster_bg_transforms jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.landing_page_settings
  ADD COLUMN IF NOT EXISTS ios_app_url text;
```
(No new tables → no new GRANT/RLS needed.)

## Files
**New:** `src/components/PosterExportSheet.tsx`, `src/components/VpaScannerSheet.tsx`, `src/assets/karo-logo.png.asset.json`, one migration.
**Edited:** `QrPosterSheet.tsx`, `MerchantLinksSetupSheet.tsx`, `routes/s.$code.tsx`, `lib/premium-links.functions.ts`, `routes/admin.referrals.tsx` (add iOS URL field), `integrations/supabase/types.ts` (after migration).

## Out of scope
No changes to referral logic, withdraw gate, admin auth, or any other module. Build verified with `tsc --noEmit` only after all edits land.
