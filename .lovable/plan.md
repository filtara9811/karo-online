# Marketplace Dashboard Redesign

Keeps existing UI tokens (gold/awning theme, sheets, cart, fly-to-basket) intact. Only the `/home` page composition changes plus two new overlay components. Existing routes `/vendor/shop`, `/product/$id` remain as-is for direct deep-links.

## 1. /home — New composition (single scroll surface)

Order top→bottom:

1. **Map Header** (sticky-ish, ~38vh)
   - Reuse `QuickServiceMap` (same component as `/quick`) with vendor pins.
   - Source pins from `getNearbyOnlineVendors` server fn (already used in `/quick`).
2. **Control Bar** (overlapping bottom edge of map, like quick)
   - Left: circular "My Orders" button → opens existing orders sheet/route.
   - Center: Search pill (reuse `SearchOverlay` trigger).
   - Right: Profile avatar → opens `ProfileSheet`.
3. **Category strip** (horizontal scroll, existing `CATEGORIES`) — filters vendor grid.
4. **Vendor Feed** (vertical, infinite scroll, YouTube-style)
   - Card height tuned so **exactly ~3 cards visible per mobile viewport** (≈ 30vh each on 360×698, includes awning + image + vendor row + CTA).
   - Card design = "shop card" matching screenshot #1: striped awning top, hero product/banner image, vendor avatar pill, rating + Trusted/Assured badges, shop name in gold, tagline, location, "Send Inquiry now" CTA.
   - Tap card → opens **Shop Overlay** (no navigation).
   - Infinite loader: append next page on scroll-near-bottom (IntersectionObserver). Fallback to demo vendor list when DB empty.
5. **"Recommended for you"** rail (horizontal) appears below the first ~6 vendors so it slides in "from the side" as user scrolls — reuses existing `ProductRail`.
6. Existing Hot Deals / Featured rails remain further down.

The page is **one vertical scroll**; map stays at top and scrolls out (not pinned), matching "YouTube feel" the user described.

## 2. Stacked Bottom-Sheet Overlay system

New component `src/components/StackedSheet.tsx`:
- Fixed, 90vh, rounded-top, slide-up animation.
- Prominent `X` button top-right corner (user explicitly requested).
- Manages stack via context: `useSheetStack()` exposes `push(node)` / `pop()`.
- Each pushed sheet renders **on top** of the previous one with a small inset (4–8px) so the underlying sheet edge peeks ("एक के ऊपर एक layer").
- Backdrop click closes top sheet only.
- Body scroll-lock while any sheet open.

## 3. ShopOverlay (new wrapper)

`src/components/ShopOverlay.tsx`
- Renders the existing `/vendor/shop` page content as a 90vh sheet (extract `VendorShop` body into a presentational component, or embed via iframe-free re-import).
- Boutique theme already exists in `vendor.shop.tsx` (awning, gold tiles) — reuse.
- Tapping a product tile inside → `push(<ProductOverlay id={..}/>)`.

## 4. ProductOverlay (new wrapper)

`src/components/ProductOverlay.tsx`
- Renders the existing product detail UI (extract from `src/routes/product.$id.tsx` into `ProductDetailView` component).
- 90vh stacked sheet, own X button.
- Cart/inquiry actions reuse current hooks.

## 5. Refactor (minimal)

- `src/routes/vendor.shop.tsx` → split body into `<VendorShopView />` exported from `src/components/VendorShopView.tsx`. Route file becomes thin wrapper. Overlay imports same view.
- `src/routes/product.$id.tsx` → split into `<ProductDetailView productId={..}/>`. Same pattern.
- No changes to data layer, auth, or business logic.

## 6. Files

**New:**
- `src/components/StackedSheet.tsx` (+ context)
- `src/components/ShopOverlay.tsx`
- `src/components/ProductOverlay.tsx`
- `src/components/VendorShopView.tsx` (extracted)
- `src/components/ProductDetailView.tsx` (extracted)
- `src/components/VendorFeedCard.tsx` (the 3-per-screen shop card)

**Edited:**
- `src/routes/home.tsx` — new composition described above.
- `src/routes/vendor.shop.tsx` — thin wrapper around `VendorShopView`.
- `src/routes/product.$id.tsx` — thin wrapper around `ProductDetailView`.

## 7. Out of scope (preserved)

- No backend, RLS, or server-fn changes.
- Existing `/quick`, vendor dashboard, admin remain untouched.
- Auth flow, cart store, fly-to-basket animation untouched.
- Gold/awning visual tokens kept; only composition + new sheet stack added.

## Open question

Currently the home awning + striped header (the red circled area in screenshot #2) is shown by `MarketingLayout` / page chrome. Do you want me to:
- **(a)** remove that top awning band on `/home` so the map sits directly under the status bar, or
- **(b)** keep the awning but shrink it so the map starts immediately below it?

I'll go with (a) unless you say otherwise.
