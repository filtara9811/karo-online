
## 1. Real Google Map (same as Quick page)

In `src/routes/vendors.tsx`, replace the decorative `MapBg` + fake `PINS` block with the actual `QuickServiceMap` component used on `/quick`. Pins are built from the real `visible` vendor list (id, name, avatar, lat, lng, km, status) — so when filters change (city/area/range), only matching shops plot on the map. Keeps the existing center "my location" + radius behaviour.

## 2. Bottom-sheet pickers for filters

Right now City / Area / Trade / Range are inline dropdown pills. Convert each pill so that tapping it opens a bottom sheet picker (using existing `Sheet` primitive — Radix dialog from `src/components/ui/sheet.tsx`):

- **City** — list of cities (Delhi, Mumbai, Agra, …) derived from vendor pool. After picking, the Area picker auto-refreshes to that city's areas.
- **Area** — cascaded from selected city.
- **Trade** — Wholesaler / Retailer / All.
- **Range** — slider 1–50 km inside the sheet.
- **Category** (new pill, replacing the unclear "color wise" filter) — picks from the existing CATS list (Tools, AC, Carpentry, …).

Selected values show on the pill itself; an X chip clears.

## 3. Shop "chhatri" (awning) on each card

Add a decorative striped canopy strip on top of `ShopCard3D`'s media area so each card looks like a physical dukan front:
- Pure CSS — repeating linear-gradient stripes in shop orange (#f97316) + white, ~14 px tall, sitting just above the media image with a scalloped bottom edge (SVG mask).
- No external image; lightweight and themeable.

## 4. Bottom action bar layout (unchanged structurally, polished)

Current bar already has **Sarvic|Products** picker on the left and **Quick|Sarvic** picker on the right, with the categories row above. Keeping this — only tightening spacing so both pickers stay tucked at the bottom corners and the category row sits cleanly centered between them (matches screenshot annotation).

## Files touched

- `src/routes/vendors.tsx` — swap map, wire pickers into sheets, add awning wrapper, add Category filter pill.
- `src/components/ShopCard3D` (defined inside vendors.tsx) — add awning element.

No backend / data-layer changes. No new dependencies.
