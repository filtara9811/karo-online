# Digital Dukan polish — 4 fixes

## 1. Lock the map (customer "All Digital Shops" page)

File: `src/routes/vendors.tsx` → `DraggableSheet`

The bottom sheet currently has a peek snap at ~55% so the sheet covers part of the map and (since it's a full-height container starting at top: 0) blocks finger-drag on the map area entirely.

- Convert `DraggableSheet` so the sheet only occupies the area BELOW the map. Sheet `top` snaps to the map bottom (e.g. `mapHeight = 42vh`), and `height = vh - mapHeight` instead of full `vh`. The sheet's transparent overlay no longer extends over the map, so the user can pan/zoom the map freely.
- Keep the 3 snap points but constrain them to the sheet region (full / half / peek of `vh - mapHeight`).
- The map (`QuickServiceMap`) stays fixed in the top 42% of the screen — never covered by the sheet container.
- Remove the auto-pulse / fly-in that happens when the sheet first mounts (set initial `y` directly without `animate()` on mount).

## 2. On/Off toggle redirects to vendor panel

File: `src/components/ShopLiveToggle.tsx`

This toggle is used on both customer top-right (screenshot 1) and vendor shop (screenshot 2). Add an optional `redirectOnEnable` prop. When `true` and the user flips it ON, after the DB update succeeds, navigate to `/vendor/shop` (same behaviour as the Quick screen's on-button). On the customer `vendors.tsx` page, pass `redirectOnEnable`. On `vendor.shop.tsx`, leave default (no redirect — they're already there).

Also: today the toggle isn't actually rendered on `vendors.tsx` top-right of the map. Add it as a floating button at the map's top-right corner inside `<section className="absolute inset-0">`.

## 3. Vendor panel cover (screenshot 2)

File: `src/routes/vendor.shop.tsx` + `src/components/ShopMediaUploader.tsx`

- Move `ShopMediaUploader` (the cover video/image) out of the scrollable body and render it as a full-bleed header BEHIND the sticky top bar — width 100%, height ~220px, no rounded corners on top.
- Overlay the vendor profile logo as a circular badge that "pokes out" below the cover: positioned absolute, half on the cover and half on the white sheet below, left-aligned with the existing avatar logic.
- Top-right corner of the cover: add an **X close button** (white pill, `X` icon) that calls `navigate({ to: "/vendor/dashboard" })` — replaces the existing left-side `ArrowLeft` back button (keep the toggle and the Receipt button in place, just swap the back-arrow position to top-right X over the cover).

## 4. Product / shop detail sheet (screenshot 3)

The card `onOpen` currently navigates to `/home?vendor=…` which is the wrong target for the product preview shown. Two changes:

- Add an **X close button** at the top-right corner of whatever sheet/overlay is opened from `ShopCard3D` → today that's a route navigation. Make it a slide-up bottom sheet (`Sheet side="bottom"`) instead, with the product photo at top and product info below — and an `X` in the top-right of the sheet that closes it (returns to the digital shops list).
- Remove the "magic / flash" animation: in `ShopCard3D` strip the `whileHover y:-3`, the `whileTap scale:.985`, and the auto-sliding interval flash on tap (`setIdx` flash). Replace tap feedback with a tiny opacity transition only. The sheet opening uses Radix's default smooth slide — no extra Framer pulse.

## Files touched

- `src/routes/vendors.tsx` — lock sheet under map, render `ShopLiveToggle` on map, convert card open into a bottom-sheet detail with X, smooth card taps.
- `src/components/ShopLiveToggle.tsx` — add `redirectOnEnable` prop.
- `src/routes/vendor.shop.tsx` — full-bleed cover, profile logo overhang, top-right X close.
- `src/components/ShopMediaUploader.tsx` — allow `variant="hero"` (no rounded top, full width, fixed height).

No backend/data changes. No new dependencies.