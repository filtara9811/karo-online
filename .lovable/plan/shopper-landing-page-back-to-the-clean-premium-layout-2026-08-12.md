# Shopper Landing Page — Back to the Clean Premium Layout

Revert `/s/{code}` from the TikTok-style sidebar to the clean layered design in Screenshots 2 & 3, and extend the vendor product editor with CTA buttons and quantity.

## 1. Remove the Reels sidebar

- Delete the right-side vertical action rail (views, like, comment, share, follow, products).
- Video stays full-bleed behind everything; all engagement info moves into a horizontal bar below the video.

## 2. Stats bar under the video (real data only)

A single sleek pill bar, glass style, sitting above the product carousel:

- Views · Shares · Products · Happy Customers % · Inquiries
- Values come from real tracked counts for that shop (scan/view events, share events, product count, inquiry events). Any metric with no data is hidden rather than faked.
- Red "Tag Karo" banner row directly above the stats bar with the real tag count and a chevron, exactly as in Screenshot 3.

## 3. Top header bar

- Left: shop avatar (tap = full profile sheet), shop name + verified tick, tagline line (trade/`WHOLESALER`).
- Right: Google My Business icon button (shown only when the merchant has a GMB link saved), then the Download button.
- Download button hides automatically when the app is already installed or running standalone.

## 4. Product carousel

- Clean white cards: image, badge (New / Bestseller), title, price + strike price, rating with review count, and a coloured CTA button per product.
- Only the products mapped to the currently playing video are shown; switching video swaps the rail.
- The gaps between cards stay transparent so the video shows through.
- Rail auto-scrolls gently; touch/drag pauses it and lets the shopper scroll freely in both directions.
- Tapping a card opens the product sheet with the image fully visible (contained, not cropped), full details and the CTA buttons.

## 5. Bottom dock

Restore the previous vendor-driven dock: Share, Payment/Cards, Shop, Web/Links, Download — categories built from the links the merchant pastes in setup, with the tile rail that opens on tap. No reels dock.

## 6. Smooth video transitions

- Remove the black flash on vertical swipe: crossfade/slide with both frames present during the transition and a persistent black-free backdrop (previous frame stays painted until the new one is ready).
- Press-and-hold on the video pauses playback; releasing resumes.

## 7. Share = the playing video

- Share now sends the deep link to the exact video (`/s/{code}?m={index}`), and the preview image is that video's own thumbnail/poster frame instead of the generic Karo label card.
- Opening a shared link jumps straight to that video.

## 8. Vendor product editor additions

- CTA button picker: presets for Amazon, Flipkart, Meesho, WhatsApp, Inquiry and Call (brand colour auto-applied) plus a custom option with free label text and a colour picker.
- Quantity / stock field per product, shown on the shopper card and product sheet.

## 9. Installable shop app after QR scan

Ensure that after any QR scan, the shopper gets the merchant-branded install: APK download when the merchant has that service active, otherwise the white-label PWA install with the merchant's own icon and name. The Download button and prompt reflect whichever is active, and disappear once installed.

## Technical notes

- `LandingReelsOverlay.tsx` is replaced by a new `LandingStatsBar.tsx` + reuse of `LandingProductRail.tsx` (non-compact clean-card variant) inside `s.$code.tsx`.
- `LandingReelsDock.tsx` is dropped from the reels/shop layouts; `LandingCategoryDock` becomes the single dock for all non-chat styles.
- `LandingTopBar.tsx` gains `tagline` and `gmbUrl` props; install button visibility already keys off `useLandingInstall`.
- `LandingStoryMedia.tsx`: replace `AnimatePresence mode="popLayout"` swap with a stacked crossfade (no unmount gap), add pointer-down/up pause, and accept an initial index from `?m=`.
- `VideoProduct` type in `src/lib/landing-types.ts` extends with `cta` (`{ preset, label, color, url }`), `quantity`, `mrp`, `reviews`, `badge`; editor in `src/components/oneqr/LandingMediaSheet.tsx` + `ProductEditor.tsx` writes them.
- Stats read existing `qr_events` aggregates via a public read path; no new tables unless an aggregate RPC is required for counts.
- New per-video OG image handler extends `api.public.share-image` to accept a media index and use the video poster.
