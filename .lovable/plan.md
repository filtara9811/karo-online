## Problem

The home screen crashes with "Something went wrong" because `QuickPage` now calls `useQuery` (React Query) but the project has **no `QueryClientProvider` set up anywhere** — router context, root route, and `src/start.ts` never create a `QueryClient`. Console confirms: `No QueryClient set, use QueryClientProvider to set one`.

On top of that, the recent refactor removed several pieces of the original home flow you liked:
- Mic FAB opens a small picker sheet instead of the full old search bar.
- Map no longer shows floating vendor pins for the selected category (e.g. Carpenter).
- Live geolocation + 1/2/5/10 km radius circles around the user are gone.

## Fix Plan

### 1. Wire up React Query properly (fixes the crash)
- `src/router.tsx`: create `QueryClient` **inside `getRouter`** (per-request), pass via `context: { queryClient }`, set `defaultPreloadStaleTime: 0`.
- `src/routes/__root.tsx`: use `createRootRouteWithContext<{ queryClient: QueryClient }>()`, wrap `<Outlet />` in `<QueryClientProvider client={queryClient}>`.
- Verify `@tanstack/react-query` is installed (it's already used in many hooks).

### 2. Restore the real search bar on the Mic FAB
- In `src/routes/quick.tsx`, keep the pulsing FAB but make it open the original full `SearchOverlay` (already exists in `src/components/SearchOverlay.tsx`) — not the small type-picker sheet.
- Speech recognition (`use-voice-input`) auto-fills the search field on open.
- Selecting a result runs the same `createLead` → `FindingVendorOverlay` flow.

### 3. Restore map behavior (Carpenter pins + live location + radius rings)
- Reinstate `MapView` on the home screen above the categories, using `useGeolocation()` for the live center.
- When a root/sub category is selected (e.g. Carpenter), fetch nearby vendors of that category and render them as floating pins via `markers` prop on `MapView`.
- Overlay 1 / 2 / 5 / 10 km radius circles centered on the user (Google Maps `Circle` inside `MapView`), with a small chip strip to pick the active radius; filter vendor markers by that radius.
- Reuse existing `quick-vendors.functions.ts` / `nearby-customers.functions.ts` patterns for the query.

### 4. Data sync sanity pass
- After Query is wired, admin-managed `categories` + `catalog_items` will actually load (they silently failed before because the hook threw). Verify tiles show admin images/emoji, sub-cards show admin items, and `/orders` still shows real leads.

### 5. Verify (in build mode)
- Reload `/`; confirm no red boundary, tiles render, mic opens the full SearchOverlay, map shows user dot + radius ring + Carpenter pins after selecting Carpenter.
- Playwright smoke: open `/`, click mic → assert search input visible; click Carpenter → assert markers on map.

### Files touched
- `src/router.tsx` (add QueryClient to context)
- `src/routes/__root.tsx` (add QueryClientProvider)
- `src/routes/quick.tsx` (mic → SearchOverlay, re-add MapView + radius chips + vendor pins)
- `src/components/MapView.tsx` (add optional `circles` prop for radius rings)

### Out of scope
Dock, profile sheet, `/orders`, admin, vendor, staff pages, backend schema.
