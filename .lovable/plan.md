# Landing Page v2 — Story Media, Theme Top Bar, Category Link Dock

Rework the public scan/landing page (`/s/<code>`) plus the vendor-side Link setup and QR poster sheets so the landing page looks like the reference: a story-style media viewer with progress bars, a themed top bar with shop identity, and a bottom row of round category buttons that reveal that category's links.

## 1. Top bar (themed identity strip)

- Replace the current floating white identity chip with a solid top bar painted in the merchant's chosen theme accent colour (red theme = red bar, black = black bar), with auto-contrasting text.
- Contents: round profile photo / shop logo (from backend), shop name (+ verified tick), and a 3-dot menu on the right.
- Tapping the profile photo opens a simple bottom sheet: large avatar, shop name, trade, phone, address, verified badge, the merchant's QR code rendered on the spot, and a **Download QR** button for the visitor.

## 2. Story-style media progress

- Use every uploaded media item (not just the first) as a full-screen story: segmented progress bars along the top — one segment per item, so 5 photos = 5 bars, 5 videos = 5 bars.
- Images auto-advance on a timer; videos advance when playback ends (with a capped duration for embeds). Tap left/right halves to go back/forward, hold to pause. Smooth animated fills and cross-fades between slides.
- The existing secondary "2 tile gallery" block is removed since all media now lives in the story.

## 3. Bottom category dock + link sheet

- Bottom of the landing page: a horizontally scrollable row of round buttons, one per link category the vendor has filled (e.g. Social Media, Payment, My Shop, Website, Contact, Offers, More) — matching the reference row with labels under each circle.
- Tapping a category opens a bottom sheet whose links appear as a horizontally scrollable rail of large brand tiles (Instagram, Twitter/X, Facebook, YouTube, etc. with their own icons/colours), exactly like the reference. Payment category opens the existing UPI flow; Play Store / app download stays available.
- Only categories that actually have enabled links show up. Smooth spring animations for open/close and rail snapping.

## 4. Vendor link setup (screenshot 2)

- Add a horizontal category tab strip at the top of "Setup Scan Actions": Social Media, Payment, Shop, Website, Contact, Other.
- Selecting a category shows only that category's rows. Social Media pre-seeds known platform rows (Instagram, Facebook, YouTube, X, WhatsApp, Telegram, LinkedIn) where the vendor just pastes a URL; "Add link" adds a custom row inside the current category.
- Existing Play Store / Payment / Digital Shop blocks move under their matching tabs; premium unlock gating is preserved.

## 5. QR poster media (screenshot 3)

- The poster media picker keeps its thumbnails, and each saved item (image / video / link) becomes one story slide on the landing page — so what the vendor uploads is exactly what visitors see with matching progress segments.

## Technical notes

- Landing page: `src/routes/s.$code.tsx` split into small components — `LandingTopBar`, `LandingStoryMedia`, `LandingProfileSheet`, `LandingCategoryDock`, `LandingLinksSheet` — under `src/components/landing/`.
- Link categories ride along inside the existing `extra_links` JSON as a `category` field, and `get_public_landing` already returns `extra_links` verbatim, so **no database migration is needed**. Merchant `phone`, `address`, `trade`, `avatar_url` and theme accent are already returned by the RPC.
- Vendor editor: `src/components/MerchantLinksSetupSheet.tsx` gains the tab strip and per-category rows; saves through the existing `upsert_merchant_link_settings` RPC.
- QR download in the profile sheet reuses the existing QR rendering approach used by the poster sheet (client-side canvas → PNG download).
- Animations via the already-installed `framer-motion`; colours derived from the theme accent, no hardcoded palette.
