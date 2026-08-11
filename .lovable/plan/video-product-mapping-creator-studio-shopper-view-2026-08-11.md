# Video → Product mapping (creator studio + shopper view)

## What changes for the vendor

The "Videos & media" sheet becomes a **Video Studio** that looks like screenshot 2:

- Paste a YouTube / Instagram / Facebook link, or upload a video (or photo).
- The selected video shows as a large 9:16 player card at the top.
- Directly under the player: a horizontal scrollable row of **product slots** — dashed "Add products" tiles plus a round `+` at the end. 1 to 10 products per video.
- Tapping a slot opens a smooth bottom sheet to fill: product photo, name, price, description, enquiry text (pre-filled WhatsApp message), and a Buy / redirect link (WhatsApp, Amazon, website).
- Below the player, a rail of all videos (each thumbnail shows its attached product mini-thumbs) plus an **Add new** dashed block.
- One prominent **Publish** button at the bottom — saves everything and refreshes the live preview.
- Long-press / ⋮ on a video card: replace, reorder, delete.

Uploaded videos go to the existing media bucket (public URL) instead of being embedded as base64 — important for fast landing pages.

## What changes for the customer (/s/{code})

- Store header with avatar, name and story-style progress bars stays on top.
- **Full video plays start to finish.** Progress bar tracks real video time (20s or 1 hour — no cut-off). When it ends, it auto-advances to the next video; manual swipe up/down still works. YouTube/Instagram links track real playback where the provider allows it, otherwise the segment simply doesn't force-advance early.
- Under the video, a **Top Products** auto-sliding carousel showing only the products attached to the *currently playing* video: image, title, price, rating, and a quick action button. Pauses on touch.
- Tapping a product opens a premium detail sheet: big image, name, price, description, and two actions — **Enquiry** (WhatsApp / lead capture) and **Buy / View** (redirect link).
- Bottom category dock (social · payment · my shop · …) stays, cleaned up so tabs don't collide with the carousel.
- Smooth spring animations throughout; no layout shift while media loads.

## Technical notes

- Data model: extend each `poster_media` item in `merchant_link_settings` with `products?: VideoProduct[]` (`{ id, name, price, image, description, enquiry, url, rating? }`). No new table, no migration — saved through the existing `upsert_merchant_link_settings` RPC. Shared type added to `src/lib/landing-types.ts` and mirrored in `LandingStoryMedia`.
- `src/components/oneqr/LandingMediaSheet.tsx` → rebuilt as the studio (player card, slot rail, video rail, Publish). New `src/components/oneqr/VideoProductSheet.tsx` for the per-product form, reusing `SheetShell` z-layers so it stacks above the live preview.
- Video upload switches to `uploadVendorMedia`-style storage upload (public URL) with progress + size guard.
- `src/components/landing/LandingStoryMedia.tsx`: replace the fixed `DURATION` timer for videos with `timeupdate`/`onEnded`-driven progress; keep the fixed timer only for images. Expose the active index so the parent can render matching products.
- New `src/components/landing/LandingProductRail.tsx` (auto-slide carousel, reusing the marquee pattern from `TopProductsMarquee`) and `src/components/landing/LandingProductSheet.tsx` (detail + Enquiry/Buy). Wired in `src/routes/s.$code.tsx` under the media block.
- Existing shop-category products (`extra_links` with `shop-` ids) keep working; video products are additive and shown per video.
- Verification: Playwright pass over the studio (add link → attach 2 products → publish) and the published landing page (video plays full length, auto-advance, carousel + product sheet actions) at 360px and 414px widths.
