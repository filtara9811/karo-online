# Fix publishing + rich product editor for video mapping

## What's actually breaking (verified)

The `merchant_link_settings` rows for real merchants are **6–8 MB each** (largest `poster_media` alone is 6.0 MB). That is because product photos and uploaded images are stored as base64 `data:` strings inside the JSONB column instead of as storage URLs. Every "Publish changes" rewrites and re-compresses that whole multi‑MB row, which is what produces `canceling statement due to statement timeout` and the button that spins forever.

So the real fix is to stop putting image bytes in the database — not to raise a timeout.

## 1. Instant, reliable publish

- Every image picked in the video studio and in the product form is **uploaded to storage first** (same bucket as videos, public URL), then only the URL is saved. Photos get client-side compression (max ~1600px, JPEG/WebP) before upload so uploads are fast.
- One-time cleanup: existing base64 entries already in a merchant's `poster_media` are converted to storage uploads the first time the studio opens that record, so old heavy rows shrink and stop timing out.
- Publish gets a hard timeout guard (~12s), full try/catch, spinner state that always clears, and clear success/error toasts. No silent hang.
- After the shrink, publish writes a few KB of JSON — sub-second.

## 2. Product mapping uses the POS-style editor (screenshot 3)

The small "Product details" sheet is replaced by the rich editor already used by the Digital Shop POS (`ProductEditor`), opened from a video's product slot:

- Sale type: Wholesale / Retail / Both, with bulk pricing tiers
- Media 0/6: front, back, left, right + video, multi-slot uploads (all to storage)
- Shop category mapping (primary + extra categories)
- Product name, tagline/description, price, GST % and include/exclude, unit
- Variations (size, colour, …) with add/remove
- Voice-to-text mic on name / tagline / description fields (existing `useVoiceInput`)
- Save writes back into the video's attached product list, so the shoppable rail on the landing page shows name, price, image, description, enquiry text and buy link as before.

Up to 10 products per video stays; the slot rail and `+` stay.

## 3. Landing page: single progress, manual advance only

- The story bar becomes **one single progress bar** for the video that is playing (no per-item segments).
- The video **never auto-advances**. It loops or holds at the end; the next video only appears when the viewer swipes manually. Images keep a gentle timer but also no longer force the video away.

## Technical notes

- New shared helper `src/lib/media-upload.ts`: compress image → upload to storage → return public URL; used by `LandingMediaSheet`, `VideoProductSheet` replacement, and `ProductEditor` media slots.
- `LandingMediaSheet.tsx`: product slot tap opens `ProductEditor` (adapter maps `ProductDraft` ⇄ `VideoProduct`, keeping `id`, `enquiry`, `url`, `rating`); base64 sanitiser runs on load; `persist()` gains AbortController-style timeout + toasts.
- `VideoProductSheet.tsx` is retired (kept only if a light path is still needed) — the editor becomes the single product UI.
- `LandingStoryMedia.tsx`: replace segment array with a single bar; drop `onEnded={() => go(1)}` and the image auto-index for video items.
- No schema migration required — the payload shape is unchanged, it just stops carrying base64. A `poster_media` size guard (reject > 512 KB JSON) is added client-side to prevent regressions.
- Verification: publish a video with 2 products end-to-end and confirm the write completes in well under a second and the row size drops to KB; check the live `/s/{code}` page shows a single progress bar and does not auto-advance.
