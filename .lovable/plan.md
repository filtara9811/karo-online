## Goal
Redesign only the `/quick` page UI to match screenshot #2 (TikTok-style). Backend / flow / lead-raise logic stays identical. Fix the "flash then disappears" issue so the new UI stays mounted reliably.

## Layout changes (top → bottom)

```text
┌─────────────────────────────┐
│  MAP HERO (unchanged)       │
├─────────────────────────────┤
│  [Service ▾]  [Delhi ▾]     │  ← Type + Location pills (was already here)
├─────────────────────────────┤
│  All Categories       View ›│
│  ← [Home][Finance][Legal][Basic][…] →   ← NOW HORIZONTAL SCROLL
├─────────────────────────────┤
│  Sub Category View          │
│  ┌───────────────────────┐  │
│  │  BIGGER sub-cat card  │  │  ← plumber / carpenter cards
│  │  (image + info)       │  │     enlarged; vertical scroll here only
│  └───────────────────────┘  │
│  ...                        │
├─────────────────────────────┤
│  Floating Mic FAB (search)  │  ← stays floating, right side
├─────────────────────────────┤
│  [My Orders] [👤 Profile] [My Shops]  ← 3-slot floating dock
└─────────────────────────────┘
```

## Specific changes

1. **Categories row → horizontal scroll strip**
   - Replace the current `grid grid-cols-4` root-category tiles with a horizontal `overflow-x-auto snap-x` rail placed directly under the Service/Location pills.
   - Each tile ~84×84 rounded-2xl; active tile has orange border + tint (keep `layoutId` glow animation).
   - Only this row scrolls horizontally; page still scrolls vertically for cards.

2. **Sub-category cards → larger**
   - Increase card image from `w-28 h-28` → `w-32 h-32` (or full-height `h-36`).
   - Bigger title (`text-[18px]`), more padding (`p-4`), rounded-3xl, softer shadow.
   - Keep expand-on-tap → variation selector + Find Vendor button (unchanged behavior).

3. **Floating dock (3 slots)** — already exists as `FloatingDockNav`, ensure it renders on `/quick`:
   - Left: **My Orders** (badge, dispatches `ko-open-orders`)
   - Center (raised): **Profile avatar FAB** → opens `ProfileHubSheet`
   - Right: **My Shops** (badge, → `/vendors`)

4. **Mic / search → floating FAB** (already floating; keep it above the dock at `bottom-28 right-4`).

5. **Top-corner profile removed** — the profile is now only the center dock FAB. Ensure `AppShell` header on `/quick` doesn't render a duplicate profile icon.

6. **Fix the "UI flashes then reverts" bug**
   - Root cause suspicion: `AppShell` conditionally hides/shows chrome based on route, and something re-mounts `quick.tsx` with the legacy layout.
   - Verify `SHOW_FLOATING_DOCK_ON = ["/quick"]` matches actual pathname (no trailing slash mismatch).
   - Ensure `/quick` route is not falling back to `/quicklegacy` anywhere (remove any redirect / navigate call in current `quick.tsx` — the mic FAB currently does `navigate({ to: "/quicklegacy" })`, change it to trigger voice input instead of navigating away).
   - Confirm `routeTree.gen.ts` picks up the new `quick.tsx`, not a cached duplicate.

## Files to edit
- `src/routes/quick.tsx` — categories → horizontal rail; enlarge sub-cat cards; mic FAB no longer navigates to legacy.
- `src/components/AppShell.tsx` — verify FloatingDockNav shows on `/quick`; hide any duplicate top-right profile on this route.
- `src/components/FloatingDockNav.tsx` — minor polish only if needed (already 3-slot).

## Out of scope
- No backend, DB, server-function, or lead-flow changes.
- No changes to other routes.
- No new categories or content — only visual/layout restructure.
