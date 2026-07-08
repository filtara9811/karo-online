## Vendor Onboarding — Polish + Full Product Mapping Flow + Admin Video Upload

Three focused changes. No backend/schema changes. Uses existing `catalog_groups`, `catalog_items`, and (if present) sub-category / pricing columns.

### 1. UI smoothness pass (Business Info + Category Mapping sheets)

- Reduce primary CTA height: `Submit & Continue` and `Save Mapping` from `py-4` to `py-3` (about 44px) with smaller text and gentler shadow.
- Reduce close buttons to `h-8 w-8`, tab bar to `h-9`, category chips to `min-w-[76px] h-14`, service-type tabs to slightly smaller icons.
- Smoother transitions: add `transition-all duration-200 ease-out` on expand/collapse, chip active state, and toggle switches. Framer-motion is already in the project, use `AnimatePresence` + `motion.div` for the expandable variation panels.
- Slightly softer rounded radii and shadows on sheets to feel more "premium mobile".

### 2. Full Category Mapping breakdown (screenshot #3 flow)

Rework `InventoryMappingSheet.tsx` into a **3-level expandable flow** driven by real data:

```
Type tab (Service / Product / Both)
  └─ Category chip strip (All + admin categories with icons)
       └─ Main Category card (e.g., Tailor Service — Mapped/Map Now badge, chevron)
            └─ Sub-category tabs (All / Ladies Tailor / Gents Tailor / Kids Wear)
                 └─ Product & Variation rows (image, name, Basic Price, Premium Price, toggle, chevron)
                      └─ Row tap opens inline editor: edit basic/premium price + short note
```

- Sub-categories: read from `catalog_items` where an item has children (or from a `sub_category` field if present). If schema doesn't expose sub-categories, treat the first-level `catalog_items` as sub-categories and their `variations` (JSON field) as products; fall back to flat items when neither exists — no schema change.
- `Mapped` badge = at least one variation under that category is toggled ON in `selected[]`. Updates instantly.
- Progress % = mapped main categories ÷ visible main categories.
- "View All Products (N)" expands beyond first 6.
- Inline price editing writes to a local `priceOverrides` map, persisted alongside `selected` in the same draft (localStorage) — save handler already exists; extend the `vendor_item_mappings` upsert to include price fields only if the columns exist (safe optional spread).
- Row toggle uses smooth spring motion; expanded panel uses `motion.div` height animation.

### 3. Admin video upload (file OR YouTube URL)

Currently `admin.subscription.tsx` only accepts a URL. Extend `VideoSettingCard`:

- Two tabs: **Paste URL** (existing) and **Upload Video**.
- Upload tab: file input (`accept="video/mp4,video/webm"`), uploads to Supabase Storage bucket `public-assets` (already used elsewhere; if missing, use `vendor-assets`) at path `onboarding/vendor-bg-{timestamp}.mp4`, then stores the public URL in `app_settings.vendor_onboarding_video.url`. Shows upload progress and preview.
- Also surface a shortcut link **Admin → Onboarding Video** from `admin.index.tsx` so it's discoverable (user couldn't find it).
- The vendor onboarding page already reads this key — no change needed there.

### Files touched

- `src/components/vendor-join/InventoryMappingSheet.tsx` — rewrite with 3-level flow, sub-category tabs, inline price editor, motion transitions, smaller buttons.
- `src/components/vendor-join/BusinessInfoSheet.tsx` — smaller CTA + close button, smoother transitions.
- `src/routes/vendor.join.tsx` — extend draft type with `priceOverrides`, pass to sheet, pass to save handler.
- `src/routes/admin.subscription.tsx` — add file-upload tab in `VideoSettingCard`.
- `src/routes/admin.index.tsx` — add "Onboarding Video" quick-link card.

### Out of scope (confirm if needed)

- The 5-tab "Map Plumbing Service" full editor (screenshot #4 — Profile / Pricing / Service Areas / Media / Review) is a much larger screen. This plan implements the inline expandable editor first (matches screenshot #3). The full-page editor can be a follow-up if you want it built too.
