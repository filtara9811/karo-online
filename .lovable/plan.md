## Goal
Polish `/vendor/listing` UI to match reference (screenshot B) — premium, smooth, with cover/avatar upload, Business/Personal profile toggle, and edit-card action on each listing. Also ensure `/vendor/listing` and `/vendor/services` open as **bottom-sheet style overlays above the home dashboard** rather than as independent full-screen routes.

## Scope
Frontend/UI only. No DB, no RLS, no server functions. Reuse existing `vendor_item_mappings`, `vendors`, `catalog_items`, `categories` queries already wired.

---

## 1. Bottom-sheet presentation (both `/vendor/listing` + `/vendor/services`)

Currently both are full-page routes rendered on their own background. Change presentation so that when the user opens either from the dashboard, the vendor dashboard stays visually behind (dimmed), and the target screen slides up as a rounded bottom-sheet panel filling ~92% of the viewport height.

Approach (no route change, keeps deep-linkability):
- Add a shared `<SheetShell>` wrapper (new file `src/components/vendor/SheetShell.tsx`) that renders:
  - fixed inset-0 backdrop `bg-black/40 backdrop-blur-sm`, click → `router.history.back()`
  - inner panel: `fixed inset-x-0 bottom-0 top-4 rounded-t-3xl overflow-hidden shadow-2xl` with slide-up spring animation (framer-motion, already in project)
  - small grabber handle at top
- Wrap `VendorListingPage` and `VendorServicesPage` in `<SheetShell>`.
- Background image: render a static snapshot of dashboard (simple: keep dashboard route mounted by using `useCanGoBack` + rendering nothing behind — instead we paint a soft dashboard-tinted gradient so the sheet feels layered).
- Back button + backdrop tap both call `navigate({ to: '/vendor/dashboard' })`.

## 2. My Listing — premium visual polish

Match screenshot B closely:

**Header row**
- Back circle + `My Listing ›` gold pill (unchanged position, tighten spacing)
- Title `My Listing / Inventory` in serif display, subtitle muted

**Business card**
- Cover: 160px, real image fill (fix current broken `alt="cover"` display), rounded top only, `Change Cover` chip top-right; tapping opens hidden file input → upload to `vendors.cover_image_url` via existing Supabase Storage bucket (reuse whatever `profile` route uses; if none, use `avatars` bucket + `covers/` prefix).
- Avatar: 96px circle overlapping cover by ~40px, ring-4 white, camera badge bottom-right → upload to `vendors.profile_photo_url`.
- Right side: Name (serif bold) + verified tick, tagline `trade`, location with pin icon, `Edit Profile` gold-outline pill → `/profile`.
- Premium Member gold chip below.
- **Business Profile / Personal Profile segmented toggle** (visual only for now — stores selection in local `useState`; both tabs show same data).
- 5-column stats strip (Total Listings, Total Orders, Total Leads, Happy %, Member Since). Icons in gold circles above numbers; numbers in serif display font.

**Search + filter bar** — unchanged shape, slightly taller (h-12), softer shadow.

**Quick tiles (4)** — enlarge to fit label fully (`Active Listings`, `Inactive Listings`, `Total Orders`, `Total Leads`) instead of truncating to `ACT…`. Two-line layout: icon+label top, big number bottom, small % chip.

**Your Listings header** — serif bold + `View All ›`.

**Listing card** (redesigned to match screenshot B):
```
┌──────────────────────────────────────────────┐
│ [img]  Blazer Stitching        [Active] [◉] │
│  80px  Gents Tailor                          │
│        ₹1500 – ₹4000        [✎] Updated 2d  │
│        ⏱30-45m 🛡Home  🎖Standard   ★4.8    │
├──────────────────────────────────────────────┤
│ Orders  Leads  Views  Resp     [ ⋯ ]        │
│  156    340   2.4K    98%                   │
└──────────────────────────────────────────────┘
```
- Image 80×80 rounded-2xl.
- Edit pencil button next to price → opens small bottom-sheet to edit `price_min`/`price_max` (updates `vendor_item_mappings`).
- Gold toggle switch mutates `is_active` (already wired — keep).
- `⋯` menu: Edit, Duplicate (stub), Remove (soft delete via `is_active=false` for now).
- Meta row (duration/home service/standard/rating) uses tiny pill icons — placeholders when data missing.

**Floating FAB** — gold circle with `Add Your Inventory` black pill label to its left (matches screenshot). Slightly larger (56px), stronger shadow.

**Motion**
- Sheet slide-up: framer-motion spring (stiffness 320, damping 32).
- Cards: staggered fade+lift on first paint (`initial y:8 opacity:0` → `animate y:0 opacity:1`, 40ms stagger).
- Toggle: existing scale, keep.

## 3. Upload plumbing (cover + avatar)
- Hidden `<input type=file accept="image/*">` per target.
- Client-side compress via `createImageBitmap` + canvas to max 1600px width, JPEG q0.85.
- Upload path: `supabase.storage.from('avatars').upload(\`${uid}/cover-${Date.now()}.jpg\`, blob, { upsert: true })` → get public URL → update `vendors` row.
- Optimistic preview via `URL.createObjectURL`.
- Toast success/failure via existing `sonner`.

## Files
- **NEW** `src/components/vendor/SheetShell.tsx` — backdrop + slide-up panel wrapper.
- **NEW** `src/components/vendor/ListingCard.tsx` — extracted premium card.
- **EDIT** `src/routes/vendor.listing.tsx` — wrap in SheetShell, redesign business card (cover/avatar upload, Business/Personal toggle, larger stats), redesign quick tiles (no truncation), swap listing rendering to `<ListingCard>`, add edit-price sheet, upgrade FAB.
- **EDIT** `src/routes/vendor.services.tsx` — wrap existing content in `SheetShell` (no other changes).

## Out of scope
- No changes to `/vendor/dashboard`, catalog, mapping logic, or any backend.
- Business/Personal toggle is visual (same data both tabs) — real personal-profile data model can come later.
- Duplicate listing is a stub toast.
- Reviews count (`4.8 (320 Reviews)`) shown only when data exists; otherwise hidden.
