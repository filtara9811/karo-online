## Home Screen (/quick) Refinements

**1. Map & Category Rail**
- Shrink map height (~45% → ~38%) so product/recommended area gets more room.
- Hide Google attribution/legal text overlap: add `mapTypeControl:false`, `keyboardShortcuts:false`, and CSS mask to push "Google · Keyboard shortcuts · Map data · Terms" strip below the category rail (translate map div down by ~24px inside a clipped wrapper).
- Category circles: increase size (64→76px), add glassmorphic backdrop pill behind each (`bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg`), realistic depth via inner highlight + soft drop shadow.
- Category rail: enable **both horizontal AND vertical** scroll on expanded subcategory grid (currently vertical-only) — add horizontal chip strip as primary, grid as secondary.

**2. Type Selector Pill (Service / Product / Other)**
- Top-left pill currently shows only active type. Convert to segmented 3-way selector (Service | Product | Other) that filters the entire category rail + recommended list live from `catalog_types` table.
- Service → service vendors' categories; Product → product vendors; Other → other type vendors. Wire to `useActiveTypeId` (already exists globally).

**3. Subcategory Detail Card (expanded)**
- Restore product/variation images from `catalog_items.image_url` (currently shows blank/text-only tiles like "Blazer", "Anarkali Suit").
- Add gender/segment tabs above variation grid: **Gents · Ladies · Kids** (default = Gents). Filter variations by `catalog_items.segment` field (or tag-based fallback). Persist last selection.
- Variation tiles: image thumbnail + name, tap to select → enables Find Vendor.

**4. Floating Bottom Dock Scope**
- `FloatingDockNav` (My Orders / Profile FAB / My Shops) currently renders on many routes. Restrict to home only: mount inside `/quick` route component instead of `AppShell`. Remove from all other routes (orders, profile, vendor pages, radar screen, etc.).
- Radar (`FindingVendorOverlay`) already dims but dock still bleeds through — confirm hidden via `body[data-finder-open]` selector too.

### Technical Notes
- Files to modify:
  - `src/routes/quick.tsx` — map sizing, type selector, subcategory image binding, gender tabs, mount dock locally
  - `src/components/QuickServiceMap.tsx` — Google controls off, attribution clip, category rail styling (glass + larger)
  - `src/components/FloatingDockNav.tsx` — remove global mount
  - `src/components/AppShell.tsx` — strip dock from shell; expand HIDE list is not needed once dock is route-scoped
- Data: use existing `catalog_items.image_url`; add `.segment` filter (already present in schema per prior work). No migrations needed unless segment column missing — will verify at build time.
- No backend/RLS changes.
