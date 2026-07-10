
## Goal

`/vendor/services` page ka layout badalna hai — jo abhi **bottom sheet pickers** hain (Category + Sub-category), unhe **inline** kar dena hai reference screenshot 2 ke jaisa. Toggle, variations, pricing sheet — sab as-is rahega.

## New Layout (mobile)

```text
┌───────────────────────────────────────┐
│ ← My Services                          │
│    Type → Category → Sub → Toggle ON   │
├───────────────────────────────────────┤
│ [Service] [Product] [Other]            │  ← type pills (already there)
├───────────────────────────────────────┤
│ ⇦ [Home Serv] [Business] [Repair]… ⇨  │  ← NEW: root categories, horizontal scroll
├──────────┬────────────────────────────┤
│ Categories│ Sub-categories (AC Serv) ▲│
│ ┌──────┐ │ [All] [Install] [Repair]…  │  ← variation group chips (existing)
│ │ AC ✓ │ │                             │
│ ├──────┤ │ Services / Variations       │
│ │ Plumb│ │ ┌─────────────────────────┐│
│ ├──────┤ │ │ 🔧 AC General  ₹300 [•]││  ← items list with toggle (existing)
│ │ Elec │ │ ├─────────────────────────┤│
│ │  …   │ │ │ 🧊 Compressor  ₹450 [•]││
│ └──────┘ │ └─────────────────────────┘│
│ +Suggest │                             │
└──────────┴────────────────────────────┘
```

## Changes in `src/routes/vendor.services.tsx`

1. **Main-category horizontal strip** (below type pills, in the sticky header)
   - Replace bottom "Category" `PickerButton` with an inline horizontal scroller.
   - Each root category = small card (icon + name), tap = `setCatId(id)`, active card gets gold-gradient background.
   - Horizontally scrollable (`overflow-x-auto snap-x`), same look as reference cards.

2. **Sub-category left rail** (inside `<main>`, two-column layout)
   - `<main>` becomes a **2-column grid**: `grid-cols-[112px_1fr]` (mobile) with left rail sticky-ish + independent vertical scroll.
   - Left column = vertical list of `subCats` (rows with icon + name). Active row = gold background + left accent bar.
   - Bottom of left rail keeps a small `+ Add Category` link that opens the existing `CategorySuggestionSheet`.
   - Right column = existing sub-category heading + variation group chips + items list (unchanged).

3. **Bottom bar**
   - Remove Category / Sub-category `PickerButton`s.
   - Remove `PickerSheet` component usage for `"cat"` and `"sub"` (and the `openPicker` auto-open effect).
   - Keep only the `+` FAB (suggest new category) — either as a small floating button or move it into the left-rail footer. Preference: floating gold `+` button bottom-right (like ref screenshot 2 doesn't need bottom bar).
   - Reset `BOTTOM_BARS_H` / bottom padding accordingly.

4. **Auto-open picker effect** (`autoOpenedRef` / `setOpenPicker("cat")`)
   - Delete — no more picker sheet to open.
   - `useEffect` chain that syncs `catId` on `typeId` change stays (still needed to keep a valid selection).

5. **Behavior guarantees (unchanged)**
   - Toggle ON/OFF, pricing sheet, variations chips, DB mapping, realtime refresh — untouched.
   - Type pills, header, gold theme, category suggestion sheet — untouched.

## Files touched

- `src/routes/vendor.services.tsx` (only layout — no backend, no schema, no query changes)

## Out of scope

- `PickerSheet` component itself: leave in file for now (will just be unused); can remove later if you want.
- Any admin panel / product mapping / DB changes.
