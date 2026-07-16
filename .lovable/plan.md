## Goal
Wire the new home screen (`/` → `QuickPage`) to the real admin data and restore the two flows the old app had: **search bar via mic** and **Find Vendor overlay after tapping the orange button**. Also verify My Orders opens the existing orders page with its data intact.

## Problems today (in `src/routes/quick.tsx`)

1. **Cards are hardcoded.** `ROOT_CATS` and `SUB_CATS` are static arrays with only Plumber / Carpenter / Electrician / AC and local PNG images. Admin-managed rows in the `categories` table (with `image_url`, `icon`, `parent_id`, `type_id`) are never loaded, so nothing the admin adds shows up.
2. **Mic FAB opens the wrong sheet.** It calls `setTypePickerOpen(true)` which opens `ProductServicePicker` (Product/Service/Other tiles). The old search bar (`SearchOverlay` at `src/components/SearchOverlay.tsx`) is not wired.
3. **Find Vendor button doesn't navigate.** It inserts a `leads` row and shows a toast. The old app pushed the user into `FindingVendorOverlay` (radar screen at `src/components/FindingVendorOverlay.tsx`) with the fresh `leadId` and category image.
4. **My Orders** already navigates to `/orders` from the dock — needs a smoke check that the route still renders with its existing hook data.

## Changes

### A. Load categories from the backend
In `QuickPage`:
- Add TanStack Query fetch for `categories` where `is_active=true`, split by `parent_id IS NULL` (root) vs children (sub). Filter to the "service" `type_id` (same one the admin catalog uses; look up once via `catalog_types.code = 'service'`).
- Map root rows → tile rail. Show `image_url` if it's an https URL, treat single-character `image_url` as emoji, else fall back to a `Wrench` icon. Keep the horizontal snap-scroll layout.
- Map child rows of the selected root → sub-category cards. Use the row's `image_url` for the card thumbnail (fallback to the existing service PNGs when null). Ratings/verified/available counts stay as UI placeholders until real aggregates exist — not in scope.
- Load variations for the expanded sub from `item_variations` (or `catalog_items` if that's what admin uses — resolve at implementation time by inspecting the admin catalog page) and feed them into the variation bottom sheet instead of the hardcoded string array.
- Preserve the current expand/collapse, orange-border-on-select, and animations.

### B. Mic FAB → real search bar
- Add `const [searchOpen, setSearchOpen] = useState(false)` and render `<SearchOverlay open={searchOpen} onClose={...} items={...} subCategories={...} onQuickPick={...} />` alongside the existing sheets.
- Change the mic button `onClick` from `setTypePickerOpen(true)` to `setSearchOpen(true)`. Keep the pulse ring and orange gradient.
- `onQuickPick` should behave like tapping a sub card: pre-select the sub + variation and call the same lead-creation path as Find Vendor so voice/search → find vendor works end-to-end.

### C. Find Vendor → radar overlay (navigation feel)
- Refactor `handleFindVendor` to:
  1. Insert the lead (same payload as today).
  2. Store `{ leadId, categoryName, categoryImage }` in state.
  3. Open `<FindingVendorOverlay open leadId=… category=… categoryImage=… onComplete=… onClose=… />` mounted at the page root.
- On `onComplete`, close the overlay and toast success (existing behavior). On `onClose`, just close.
- Keep the orange gradient button and its "Sending…" state while the insert is in flight.

### D. My Orders sanity pass
- `FloatingDockNav` already routes to `/orders` on tap. Read `src/routes/orders.tsx` and `use-my-orders` once to confirm nothing depends on the removed marketing-shell path, and that the route still lists the customer's real leads. No code changes expected unless a regression is found.

### E. Tidy leftovers
- Remove `ProductServicePicker` import + state from `quick.tsx` if nothing else opens it (verify no other trigger).
- Keep `/quick` route as an alias of `/` (same `QuickPage` component) so existing links don't 404.

## Out of scope
- Redesigning the map, dock, or profile sheet.
- Any backend/RLS changes — reads use the browser client with existing anon/authenticated policies on `categories` and `item_variations`.
- Changing `/orders`, vendor, admin, or staff pages.

## Files touched
- `src/routes/quick.tsx` — data loading, mic wiring, Find Vendor overlay, variation source.
- `src/components/SearchOverlay.tsx` — no code change; just newly consumed.
- `src/components/FindingVendorOverlay.tsx` — no code change; just newly consumed.
- (Read-only sanity: `src/routes/orders.tsx`, `src/hooks/use-my-orders.tsx`, admin catalog page to confirm the exact `type_id` / variations table.)

## Verification
- Preview at `/`: root tiles and sub cards reflect rows visible in the admin catalog (add a test row → appears after refetch).
- Tap mic → `SearchOverlay` opens with search input focused and history/recommended chips.
- Expand a card → tap orange "Find Vendor" → radar overlay appears with the picked category image; closing it returns to home.
- Tap "My Orders" in the dock → `/orders` opens and lists the signed-in user's leads.
