## Goal
Replace the current `/vendor/services` UI with the clean, professional design shown in screenshot 2 (My Listing / Mapping reference). Keep 100% of the existing functionality — type switch, main categories, sub-categories, variations, item toggle, pricing sheet, category suggest — but rebuild the layout, spacing, and cards so it looks like the reference.

No backend / data / route changes. Frontend-only rewrite of `src/routes/vendor.services.tsx`. The page continues to open inside `SheetShell`.

---

## Layout to build (top → bottom)

**1. Header row**
- Circular back button (left) + serif title `My Services / Mapping` gradient gold.
- Subtitle breadcrumb: `Type → Category → Sub-category → Toggle ON karein`.
- Right pill button `My Listing ›` (gold outline, clipboard icon) → navigates to `/vendor/listing`.

**2. Type tabs (Service / Product / Other)**
- Full-width row of 3 equal pills, active = gold gradient fill + icon, inactive = white with thin gold border. Slightly larger tap area (h-12), softer shadow.

**3. Search + filter row (NEW)**
- Rounded search input `Search service, category, etc…` with leading magnifier icon.
- Square filter button on the right (funnel icon) — opens the existing suggest sheet as a stub for now (visual parity with reference).

**4. Main Categories**
- Section label with gold vertical bar + `View All ›` on the right.
- Horizontal scroll row of larger tiles (72–80px icon, label below, 2-line clamp).
- Active tile = soft gold halo circle behind the icon (like the "Home Services" tile in reference) instead of the current filled card. Inactive = plain white, no border card — just icon + label.

**5. Sub-categories**
- Same section-label + `View All ›`.
- Horizontal scroll of icon-only tiles (icon on top, label below), active = subtle gold outline box, matching reference.
- `+ Add` chip at the end (keeps current suggest flow).

**6. Variations**
- Same style as sub-categories row (image tile + label). Active variant highlighted with gold outline box.
- Auto-select first variation on sub-cat change (already implemented — keep).

**7. Services / Products header**
- `Services / Products (Variation name)` serif bold + pill `+ Add New Service` on the right (gold outline).

**8. Item cards (redesigned to match reference)**
```
┌───────────────────────────────────────────────────────────────┐
│ [img]  Blazer                Basic Price  Premium Price  [✎] │
│ 72px   Premium quality...    ₹1500        ₹4000          [◉] │
│        ⏱30-45min 🛡Home 🎖Std   [● Active]        Updated 2d  │
└───────────────────────────────────────────────────────────────┘
```
- 72×72 rounded image left.
- Name (bold) + one-line subtitle (from `catalog_items` name/notes fallback).
- Meta row: duration / Home Service / Standard pills (placeholder icons when no data — matches current behaviour).
- Two price columns: `Basic Price` (price_min) + `Premium Price` (price_max). When no mapping yet, show suggested item price_min/max in muted style.
- Status chip: green `● Active` when mapping exists, gray `Inactive` otherwise.
- Right column: pencil edit button + gold toggle switch (same size as reference ~28×48) + `Updated Xd ago` timestamp (from mapping updated_at if available, otherwise hidden).
- Toggle ON with no price → opens existing `ItemPricingSheet` (unchanged). Toggle OFF → deletes mapping (unchanged).

**9. Floating FAB**
- Gold circle `+` bottom-right (unchanged behaviour — opens category suggest). Slightly larger (56px) with stronger shadow, matches reference.

---

## Visual system
- Backgrounds: keep `#fffdf6 → #fdf6e3` page gradient inside `SheetShell`.
- Cards: white, 1px `#e9d68a55` border, `rounded-2xl`, soft shadow.
- Active gold gradient: `linear-gradient(180deg,#fbbf24,#d97706)` (existing).
- Toggle: gold ON, `oklch(0.88 0.02 60)` OFF (match `ListingCard` style already used on /vendor/listing).
- Fonts: existing serif display for headings, sans for body.
- Motion: fade+lift stagger on item cards (framer-motion), 40ms per row.

## Files
- **EDIT** `src/routes/vendor.services.tsx` — full layout rewrite (no logic changes). Keep all queries, effects, `savePricing`, `turnOff`, `SheetShell` wrap, `ItemPricingSheet`, `CategorySuggestionSheet`. Add search-bar state (client-side filter over `visibleItems.name`). Replace item card renderer with new two-column-price layout. Update main-category / sub-category / variation tiles to reference style.
- **No new components required**. Reuse `IconImage`, existing sheets.

## Out of scope
- No DB, RLS, migration, or new fields. `Updated X ago` uses `vendor_item_mappings.updated_at` **only if already selected** — if not currently in the select, extend the existing `.select("item_id, price_min, price_max, notes, variations")` to also include `updated_at` (safe additive select, no schema change).
- Filter funnel button is visual only (opens suggest sheet as placeholder).
- "View All" links are visual only (no separate page yet).
- Item subtitle / duration / grade come from existing fields or are hidden when missing — no new schema.

## Verification
- Load `/vendor/services` — layout matches reference.
- Switch Service/Product/Other tabs — cats update.
- Pick main → sub → variation — items filter correctly, first variation auto-selected.
- Toggle an item ON → pricing sheet opens → save → card shows Active + price. Toggle OFF → mapping removed.
- Search input filters visible items live.
- Back button + backdrop tap dismiss the sheet to `/vendor/dashboard`.
- No console errors, no TS errors.
