# One QR — Card Fix + Full Business Profile Form

## 1. Project card clean-up (screenshot 1 red marks)

- Fix the clipped logo: give the cover a proper bottom pad and place the avatar in its own row so the round logo is never half-cut behind the cover image.
- Fix the odd QR tile: render the QR into a fixed-size square canvas (crisp, correct margin, no overflow), so the tile shows a small clean QR instead of a bleeding code.
- Keep tile order exactly: QR | visitor → Add campaign (promotion) → My landing page → Add | link.
- Move the orange hub button out of the bottom pill and up into the header next to the back arrow (round gradient icon button). Bottom pill becomes three clean tabs (My Project · Vendors · Ads) with no orange centre button.
- Premium polish: soft pulse ring on the QR tile, spring press feedback on tiles, gentle shimmer on the cover, smoother sheet/tab transitions.

## 2. Tap the business identity → full Business Profile form (screenshot 2, ditto UI)

Tapping the logo/name/category row on the card opens a new full-height sheet built to match the mockup exactly:

- Header: cover image with camera button, round logo with camera button, then a two-tab pill: **Busness Details** | **Personal Details**.
- Business Details fields (outlined "notched-label" cards as in the mockup):
  - Business Name
  - Business Number (mobile)
  - Business Email
  - Business Address — tapping it expands to a multi-address editor (add / edit / remove several addresses, each with name, address line, city, pincode)
  - Business Category
  - Business Type: Product | Service
  - Business Type: Wholesale | Manufacture
  - Business Type: Shop | Online
- Personal Details tab: owner name, personal mobile, email, photo, PAN / Aadhaar, city.
- Save writes back to the merchant profile and immediately refreshes the card (logo, cover, name, category), plus the landing page which reads the same profile.

## Technical notes

- New component `src/components/oneqr/BusinessProfileSheet.tsx` (tabs, notched-label inputs, expandable address list), wired from `QrProjectCard.tsx` via a new `onProfile` prop and opened in `src/routes/one-qr.tsx`.
- Field mapping to the existing `vendors` row: `business_name`, `whatsapp`, `email`, `trade` (category), `deals_in` (product/service), `vendor_type` (wholesale/manufacture), `operation_mode` (shop/online), `owner_name`, `pan`, `aadhaar`, `avatar_url`, `cover_image_url`.
- Multiple addresses need storage: add a `business_addresses jsonb not null default '[]'` column to `vendors` via migration (RLS unchanged — existing owner policies cover it).
- QR fix: `QRCode.toCanvas` with `width: 72, margin: 1` into a fixed `h-7 w-7` canvas wrapped in a white rounded box.
- Images reuse `uploadVendorMedia` ("avatar" / "cover").
- Animations via framer-motion only (spring tiles, layout tab indicator, subtle pulse) — no new dependencies.
