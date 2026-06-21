
# Offline-First Architecture + Cancel Button Fix + System Audit

## A. Fix Cancel Inquiry Dialog (🔴 Red marked issue)
The "Keep" / "Yes, cancel" buttons on the "Cancel this inquiry?" popup are not responding to taps. I will:
- Locate the active inquiry/finding dialog component on `/` (home)
- Wire `onClick` handlers properly (Keep → close dialog, Yes,cancel → call `cancelInquiry` RPC + close + toast)
- Ensure dialog z-index is above the map/FAB so taps register
- Add disabled-state during async call

## B. Offline-First Architecture (PWA)

### 1. App Shell (Zero-Internet Boot)
- Add `vite-plugin-pwa` with `generateSW`, `registerType: autoUpdate`
- Cache app shell (HTML, JS, CSS, fonts, icons) using Workbox
- `NetworkFirst` for navigations, `CacheFirst` for hashed assets
- Guarded registration wrapper (skip in Lovable preview/iframe/dev)
- Manifest with standalone display, theme colors, icons
- Custom offline fallback page (no browser dino)

### 2. IndexedDB Cache Layer (`src/lib/offline/`)
Using `idb` package:
- `cache.ts` — get/set with TTL for: `vendors_nearby` (10km list), `leads`, `visits`, `vendor_profile`, `customer_profile`, `categories`
- `queue.ts` — append-only action queue: `{id, type, payload, createdAt, attempts, status}`
- `sync.ts` — flush queue on `online` event + on app focus; exponential backoff

### 3. Customer Offline Logic
- Wrap nearby-vendor fetch with `cacheFirst-then-network` helper
- Show "You are offline" banner (top, dismissible) when `!navigator.onLine`
- Service-request submit: if offline → push to queue, toast "Request saved. Will sync when online", show pending badge
- Auto-sync on reconnect

### 4. Vendor Offline Logic
- Cache `/vendor/leads`, `/vendor/visitors`, `/vendor/profile` data
- Status toggle (Online/Offline shop) → queue when offline, optimistic UI
- Lead updates → queue when offline

### 5. Optimistic UI
- New `<PendingSyncBadge />` (small clock icon) attached to queued items
- `useOfflineMutation` hook: applies optimistic update → enqueues → on sync removes badge

### 6. Global UI
- `<OfflineBanner />` mounted in `__root.tsx`
- `<SyncStatus />` in header showing queued count

## C. System Audit (deliverable as markdown report)
I'll generate `AUDIT_REPORT.md` color-coded:
- 🟢 Green — working: Auth, QR, KYC gate, withdraw, wallet, admin panels, field exec, vendor register
- 🟡 Yellow — needs attention: missing offline, cancel button bug, geo radius edge cases
- 🔴 Red — broken: any runtime issues found via Playwright smoke

Then run a Playwright smoke across `/`, `/vendor`, `/admin`, `/field`, `/q/:code` with screenshots.

## Files to create/edit
**New**
- `src/lib/offline/db.ts` (IndexedDB setup via `idb`)
- `src/lib/offline/cache.ts`
- `src/lib/offline/queue.ts`
- `src/lib/offline/sync.ts`
- `src/hooks/useOnlineStatus.ts`
- `src/hooks/useOfflineMutation.ts`
- `src/components/OfflineBanner.tsx`
- `src/components/PendingSyncBadge.tsx`
- `src/lib/pwa/register.ts` (guarded registrar)
- `public/manifest.webmanifest`
- `public/offline.html`
- `AUDIT_REPORT.md`

**Edit**
- `vite.config.ts` — add `vite-plugin-pwa`
- `src/routes/__root.tsx` — mount OfflineBanner, register SW
- `src/routes/index.tsx` (or wherever the Cancel dialog lives) — fix button handlers
- Customer vendor-list hook → wrap with cache
- Vendor leads/visits hooks → wrap with cache
- Service-request submit → enqueue when offline

## Scope note
This is a large change (~12 new files, ~6 edited). I'll implement in this order to keep each commit working:
1. Fix Cancel button (quick win)
2. IndexedDB + queue + hooks
3. PWA shell + manifest
4. Wire offline into customer + vendor flows
5. Audit report + Playwright smoke

Approve and I'll start with step 1 immediately.
