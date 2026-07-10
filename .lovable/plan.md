## Goal
Polish the Category Mapping UI on `/vendor/services` to match the reference screenshot (screenshot 1) — bigger, cleaner cards with proper spacing, better hierarchy, and smooth auto-selection. No backend/data changes.

## Changes (only `src/routes/vendor.services.tsx`)

### 1. Header cleanup
- Remove the small `<p>` "Type → Category → Sub-category → toggle ON karke rate set karein." text from inside the title block and place it as a subtle breadcrumb line directly under "My Services" (matching screenshot: `Type → Category → Sub-category → Toggle ON karein`).
- Keep back button + `Open Shop` style spacing consistent.

### 2. Main Categories row (bigger, cleaner)
- Add a section label `▎Main Categories` (gold accent bar + bold text) above the strip.
- Increase card size from `w-[76px]` → `w-[92px]` with `p-3`, `rounded-2xl`, white bg, subtle border.
- Increase icon size from 32 → 44.
- Text: 2 lines, `text-[11px]`, bold, dark brown.
- Active state: soft gold gradient fill + gold border + shadow (same as screenshot).
- Horizontal scroll retained.

### 3. Sub-categories → move OUT of the left rail into a horizontal row
- Reference screenshot 1 shows sub-categories as a **horizontal scroller** below main categories, not a vertical left rail.
- Remove the `grid-cols-[112px_1fr]` two-column layout.
- Add a new section `▎Sub-categories (Home Services)` header with the active main category name in gold.
- Render sub-categories as horizontal pill-cards: icon (28px) on the left + name on the right, `rounded-xl`, white bg, gold border on active with light gold fill.
- Add `+` add card at the end of the row (was in left rail).

### 4. Variations row polish
- Header `Variations (AC Services)` with active sub-category name in gold accent.
- Keep as horizontal scroll, but enlarge cards to `w-[96px] h-[96px]`, icon 40px, bold name below.
- Active = gold gradient fill + white icon tint.
- **Auto-select first variation**: change `useEffect(() => { setActiveGroup(""); }, [subId])` to auto-pick `subGroups[0]?.name ?? ""` when sub changes (so a variation is always selected instead of showing all).

### 5. Items list header
- Change `<h2>{currentSub?.name}</h2>` block to match screenshot: `Services / Products (AC Repairing)` with the active variation name in gold, and an `+ Add New Service / Variation` button on the right.

### 6. Items list (already close, minor polish)
- Keep existing toggle/pricing behavior untouched.
- Slightly tighten card padding and ensure icon boxes render at 56–64px for readability (small tweak from current sizing).

### 7. Bottom `+` FAB
- Keep the floating gold `+` for suggesting new categories.

## Out of scope
- No changes to database, RLS, server functions, `vendor_item_mappings`, admin panel, or realtime subscriptions.
- No changes to `ItemPricingSheet`, `CategorySuggestionSheet`, or `IconImage`.
- No route changes; `/vendor/services` stays the single page.

## Files touched
- `src/routes/vendor.services.tsx` (layout + styling only)
