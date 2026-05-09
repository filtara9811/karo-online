

# Vendor Shop — Visiting-Card Dashboard, Search/Banner/Categories, Scanner & Variations

Five-part upgrade to `/vendor/shop`. Premium gold theme is **locked** — no purple, no off-palette colors.

## 1. Flippable "Visiting Card" Dashboard

Convert `VendorDashboardCard` into a **3D flip card** (front ↔ back via long-press, ~500 ms hold).

- **Front (default · live "today"):** current 5 metrics — Stock|value, SALES|Profit, Sales|quit, Expans|shop, Invest + the Day/Week/Month/Year strip + footer margin/sale.
- **Back (history):** Yesterday vs Today comparison block — Sales, Orders, Customers, Avg Bill, Top Product, Loss/Profit delta with up/down arrows. A "Tap or hold to flip back" hint at bottom.
- Long-press detector reuses the same pattern already used on product tiles (450 ms timer). A small flip icon (top-right of card) gives a tap-to-flip alternative for accessibility.
- Animation: CSS `transform: rotateY(180deg)` with `transform-style: preserve-3d` and `backface-visibility: hidden` on both faces. New keyframe in `styles.css`.

## 2. Search Bar + Sliding Banners

Inserted directly **below** the dashboard card, **above** the products grid.

- **Search bar:** rounded gold-border pill with magnifier icon; filters the product grid live by name / tagline / category. Uses local `searchQuery` state.
- **Banner carousel:** horizontally swipeable strip (snap-x) with 3 default gold-themed banner slides (festive, bestseller, wholesale). Auto-advances every 4 s, dots indicator below. **Long-press** any banner opens a small `BannerEditorSheet` to add/replace images (stored in component state, persisted later).

## 3. Auto-Scrolling "Top Products" Strip + Category Sections

Replace the single 2-column grid with a structured feed:

- **Top Products strip (above category list):** horizontal auto-marquee scroll (slow, infinite, pauses on touch) — uses the existing `ProductTile` at smaller width.
- **Category sections:** group `items` by `primaryCategory` / `category`. Each section renders:
  - a section header chip ("Catagry | Suit", "Catagry | Perfume", etc.) with gold underline
  - a horizontal scroll row of product tiles for that category
- Sections render in deterministic order; categories with 0 products are skipped. The "All Products" 2-column grid remains at the bottom as a fallback "browse all" view.

## 4. Variation Bottom-Sheet on Quick-Add (Wholesale / Retail toggle)

When the gold "+" button on a product tile is tapped:

- **If product has `variationsList` or `variations`:** open a new `QuickAddVariationSheet` (built on top of the existing `VariationPickerSheet` patterns).
  - Shows product image, name, price.
  - Pricing toggle pill: **Retail ₹** ↔ **Wholesale ₹** (uses `sellingPrice` for retail, `buyingPrice * 1.15` or new `wholesalePrice` field as wholesale fallback).
  - Size chips (S, M, L, XL, XXL — derived from `variationsList`) and color swatches.
  - Qty stepper (− N +).
  - Confirm button → adds line to cart with `priceOverride` set and a `meta` note for variation label.
- **If no variations:** add directly to cart (current behavior), still respecting the active Retail/Wholesale toggle stored at shop level (small toggle near the basket bar).
- Flying-image animation continues to fire on confirm.

## 5. Barcode Scanner replaces "Bill Now" Pill

The bottom floating "Bill Now" gold pill gains a **scanner-first** layout:

```text
[ basket · 3 items · ₹19,197 ]   [ 📷 SCAN ]   [ Bill Now → ]
```

- New left-of-pill **Scan** button (gold round, barcode icon) opens a full-screen `BarcodeScannerOverlay`.
- Overlay shows a viewfinder frame with an animated green laser line (CSS keyframe), a torch toggle, a camera-flip button, and an X close button — purely visual scanner UI for now (no real `getUserMedia` to keep it offline-safe; emits a mocked scan after 1.2 s and falls back to a manual "enter barcode" input).
- Each successful scan auto-resolves to a product (matched by `id`/SKU), runs the same variation/quick-add flow (step 4), shows a quick toast, and stays open so the vendor can keep scanning. A small running tally pill ("3 items added · ₹2,400") sits at the bottom of the overlay with a "Done" button to close.

## Files

**New**
- `src/components/DashboardFlipCard.tsx` — wrapper that holds front/back and the flip state (front = `VendorDashboardCard`, back = new `DashboardHistoryFace`).
- `src/components/DashboardHistoryFace.tsx` — yesterday-vs-today comparison.
- `src/components/ShopSearchBar.tsx`
- `src/components/BannerCarousel.tsx` (+ inline `BannerEditorSheet`)
- `src/components/CategorySections.tsx` — category grouping + horizontal rows.
- `src/components/TopProductsMarquee.tsx`
- `src/components/QuickAddVariationSheet.tsx` — variation picker with retail/wholesale toggle.
- `src/components/BarcodeScannerOverlay.tsx`

**Edited**
- `src/routes/vendor.shop.tsx` — wire new components in order: FlipCard → SearchBar → BannerCarousel → TopProductsMarquee → CategorySections → All Products grid; replace "Bill Now" pill with the new 3-button bar.
- `src/components/VendorDashboardCard.tsx` — extract content as the front face used inside `DashboardFlipCard` (no behavior change).
- `src/lib/products.ts` — add optional `wholesalePrice?: number` to `Product`.
- `src/styles.css` — add `card-flip`, `marquee-x`, `scanner-laser`, `banner-fade` keyframes plus 3D helper utility classes.

## Technical notes

- **No new dependencies.** Scanner UI is presentational; real camera decoding can be added later behind the same overlay API.
- **State stays in `vendor.shop.tsx`** — search query, retail/wholesale toggle, scanner open, banners list — to keep flows simple and avoid prop-drilling churn.
- **Hydration-safe:** all timers (banner auto-advance, marquee, scanner mock-scan) live inside `useEffect`.
- **Color lock:** every new element uses the existing `#fff3c8 → #d4af37 → #8b6508` gradient + `text-gold-gradient` utilities. No purple/teal anywhere.
- **Performance:** marquee uses pure CSS animation (no JS rAF loop); category rows lazy-render off-screen tiles via simple slicing.

