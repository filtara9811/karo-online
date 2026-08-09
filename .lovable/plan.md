# Live preview editor: working Links / Product / Videos / Settings + realistic phone frame

## 1. Why Links, Product, Videos don't work now
All three round buttons in the preview toolbar call the same `onLinks` handler, and the links sheet it opens renders at a lower stacking layer than the full-screen preview sheet — so it opens *behind* the preview and looks like nothing happened. Fix: raise the setup sheets above the preview layer, and give each button its own target.

## 2. Each button gets its own bottom sheet
- **Links | add** — opens the existing link setup sheet directly on the **Social Media** tab; merchant can switch to Payment / Shop / Website / Contact / More and add links. Saves instantly, preview refreshes.
- **Product | add** — opens the product editor (name, price, image, link) so shop products appear on the landing page product rail.
- **Videos | add** — opens a media manager: up to 10 slots, upload video or image from phone, or paste a YouTube / Instagram link. These are the story/reel media on the landing page.
- **Settings** (new, 6th button) — landing page extras: enquiry/feedback form toggle, which fields to collect (name, phone, city, message), optional welcome pop-up with title + message, and "show my details" toggle. Stored with the merchant's landing settings; the landing page reads it and shows the form/pop-up.

Toolbar becomes a single clean scrollable row of 6 round icons: Colour · Theme · Links · Product · Videos · Settings — same size, tiny labels, no clutter.

## 3. Realistic phone frame + right-sized content
- Frame: thicker rounded bezel, notch/pill at top, subtle side buttons, soft outer shadow, 9:19.5 device ratio — looks like a real handset.
- Content inside is currently oversized because it renders at desktop-ish width. Fix by rendering the landing page at true mobile width (390px) and CSS-scaling it down into the frame, so buttons, text and dock look exactly like a real phone, just smaller.
- Preview keeps auto-refreshing after every colour / theme / link / media / settings change.

## Technical notes
- `src/components/oneqr/LivePreviewFace.tsx`: split `onLinks` into `onLinks` / `onProducts` / `onVideos` / `onSettings` props; add the 6th tool; rebuild phone frame with a fixed 390px-wide iframe transformed via `scale()` inside the bezel.
- `src/components/oneqr/LandingEditorSheet.tsx` + `src/routes/one-qr.tsx`: pass the four new handlers through; open the corresponding sheets.
- Raise `MerchantLinksSetupSheet` / product / media sheet layers above the preview overlay (`z-[170]+`) so they stack correctly, plus an `initialTab` prop for Links.
- Product + Videos reuse the existing product/media editors from `QrPosterSheet` — extracted into small standalone sheets so both places share them.
- New `LandingExtrasSheet.tsx` for Settings; the form/pop-up config is stored as JSON in the existing `merchant_link_settings` row (no new table), and `src/routes/s.$code.tsx` renders it.
