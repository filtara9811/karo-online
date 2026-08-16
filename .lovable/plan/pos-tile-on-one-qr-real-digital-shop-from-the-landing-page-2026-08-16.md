# POS tile on One QR + real Digital Shop from the landing page

Two changes, both reusing screens that already exist in the app.

## 1. New "POS" tile on the One QR project card

- The project card today shows exactly four tiles: `Qr | visitor`, `Add campaign`, `My landing page`, `Add | link`.
- Add a fifth tile next to `Add | link`, labelled **POS** (shopping-bag/receipt icon), styled with the same accent glass tile.
- The tile row becomes a 5-up grid on wide phones and stays horizontally scrollable on narrow ones so nothing squeezes.
- Tapping POS opens the existing POS / Digital Dukan screen (`/vendor/shop`) — the screen in screenshot 2 with search, banners, retail/wholesale pricing, product grid and the `Bill Now` billing bar. Inventory and invoices work there as they do today.
- If the signed-in user is not yet a vendor, the existing vendor gate on that screen handles it (register/join prompt) — no new flow.

## 2. "See All" and dock "MY SHOP" open the merchant's Digital Shop

Today "See All" on the shopper landing page opens a plain A–Z product sheet, and the dock's `MY SHOP` pill opens the category tile view.

- Build one **Digital Shop sheet** for the landing page, laid out like screenshots 4 and 5:
  - Header: shop logo, "Welcome" + shop name + category, share and close buttons.
  - Search bar for products/brands.
  - Thin stats strip (rating, reviews, happy %, service grade) reusing the landing stats values.
  - Circular category row with `Explore ›`.
  - Featured "Shop the Collection" banner using the merchant's cover/banner media.
  - `Recommended / for you` grid with `See All ›`, then category sections, all cards in the existing clean white style with the merchant's branded CTA (Order / Inquiry / WhatsApp) already used on the landing rail.
- It is filled with the **merchant's real products** from the landing catalog (the same data the rail and product sheet use), not the demo catalog. Empty catalog shows a friendly "products coming soon" state.
- Wire both entry points to this sheet:
  - Product section `See All` (replaces the current all-products sheet).
  - Dock `MY SHOP` pill: opens the Digital Shop sheet directly. If the merchant has configured an external shop link, that link keeps its own tile inside the sheet's categories as it does now.
- Tapping any product inside keeps the current behaviour: opens the full product detail sheet with Inquiry (in-app chat) and Order.
- Same treatment in the merchant's live customer preview (screenshot 3), so the preview matches the real page.

## Technical notes

- `src/components/oneqr/QrProjectCard.tsx`: add the POS tile + scrollable tile row; new `onPos` prop wired in `src/routes/one-qr.tsx` to navigate to `/vendor/shop`.
- New `src/components/landing/LandingDigitalShopSheet.tsx` modelled on `VendorShopSheet.tsx`'s layout but driven by landing props (`products`, `accent`, `shopName`, `phone`, stats, cover) instead of the static `PRODUCTS` demo array; reuses `resolveCta` for CTAs and the existing thumbnail frame classes.
- `src/routes/s.$code.tsx`: swap `LandingAllProductsSheet` for the new sheet; keep the `onOpen` product-detail wiring. `LandingAllProductsSheet.tsx` is removed once unreferenced.
- `src/components/landing/LandingCategoryDock.tsx`: the `shop` pill triggers a new `onOpenShop` callback instead of expanding tiles.
- No database or backend changes.
