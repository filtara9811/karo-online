# TikTok-Style Customer Home Redesign

Redesigning `/` (customer home) to match screenshot #1 layout and adopting the floating 3-button bottom nav from screenshot #2. Keeps ALL existing business logic (leads, vendor find, cart, digital shops, join vendor) — only the presentation layer changes.

## New Home Layout (`src/routes/index.tsx` + new components)

Vertical stack (mobile-first, single column):

1. **Map hero (top)** — reuse existing `MapView` / customer + vendor pins. Height ~38vh. Curved bottom edge with soft shadow. Show "You / Ravi Plumber / Amit Carpenter" style pins with distance labels (data already available from `nearby-customers.functions`).

2. **Type + Location row** — two pill selectors side by side:
   - Left pill: **Service / Product / Other** (icon + label + chevron). Tap → opens existing `ProductServicePicker` bottom sheet. Selection persists via existing `useActiveTypeId`. Changing type re-filters the categories below.
   - Right pill: **Location** (map-pin icon + city name + chevron). Tap → opens existing `LocationPickerSheet`.

3. **All Categories row** — horizontal scroller of 4 main categories (Home / Finance / Legal / Basic). Header `All Categories` + `View ›` on right. Tapping `View ›` or the header opens a new bottom sheet showing every category. Selected category is highlighted with orange border + tinted background (animated with framer-motion `layoutId` for smooth pill-slide).

4. **Sub-category cards (main content)** — big rounded cards per sub-category (Plumber, Carpenter, Electrician…). Each card shows:
   - Illustration/thumb (left)
   - Title, tagline, rating, verified/available counts
   - When card is **selected/expanded**: a bottom action row appears inside the card with:
     - Left: **Variation selector** pill (opens existing variation bottom sheet — reuses current `ItemPricingSheet` / needs sheet)
     - Right: Orange **Find Vendor** button → triggers existing raise-lead flow directly
   - Collapsed cards just show a `›` chevron; tapping expands with a smooth height animation.

5. **Floating bottom nav (screenshot #2 style)** — new `FloatingDockNav` component:
   - Dark rounded pill bar with 3 slots
   - Left: **My Orders** (badge = order count) → opens bottom sheet with existing `MyOrdersList`
   - Center: **Profile FAB** (raised circular avatar, sits above the bar with white halo) → opens bottom sheet with two big buttons: **Join Vendor / Vendor Dashboard** and **Menu**
   - Right: **My Shops** (badge = shop count) → opens digital shops bottom sheet (reuse existing digital-shop UI)
   - Selected slot animates: icon lifts into the raised circle (framer-motion `layoutId="dock-active"`), background highlight slides to its position

## Animation & Polish

- `framer-motion` for: pill selection slide, card expand/collapse, bottom-sheet spring open, dock icon lift.
- Bottom sheets use existing shadcn `Drawer` with spring easing; add drag-to-dismiss.
- Tap feedback: `whileTap={{ scale: 0.96 }}` on all buttons.

## Files

**New**
- `src/components/home/HomeMapHero.tsx` — map + pin overlay
- `src/components/home/TypeLocationRow.tsx` — the two pills
- `src/components/home/CategoryStrip.tsx` — 4 main categories + View sheet
- `src/components/home/SubCategoryCard.tsx` — expandable card with Find Vendor + variation
- `src/components/FloatingDockNav.tsx` — 3-button dock (screenshot #2)
- `src/components/ProfileHubSheet.tsx` — center-FAB bottom sheet (Join Vendor / Menu)

**Edited**
- `src/routes/index.tsx` — recompose using above
- `src/components/AppShell.tsx` — hide old bottom bar on `/`, mount `FloatingDockNav` instead

## Out of Scope (unchanged)
- Backend / server functions / DB
- Staff, admin, vendor panels
- Auth flows
- Existing lead-raise logic (only the trigger button moves)

## Technical notes
- Reuses `useActiveTypeId`, `ProductServicePicker`, `LocationPickerSheet`, `MyOrdersList`, existing lead-raise mutation, existing digital-shops sheet — no logic rewrites.
- All colors use existing semantic tokens (orange = `--gold-*` tokens already in `styles.css`).
- Mobile-only layout (max-w-md centered), matches current app shell width.
