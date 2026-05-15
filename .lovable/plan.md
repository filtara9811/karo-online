# Pre-Launch Blocker Fix Plan

## Diagnosis (from live logs)

1. **Maps**: Google REST APIs (Geocoding/Distance Matrix/Places/Directions) reject every request with `REQUEST_DENIED: API keys with referer restrictions cannot be used with this API`. Referrer restrictions only work for the JS SDK, not the REST endpoints. **This is why locations are imprecise and KM is wrong on cards** — we're falling back to haversine for everything.
2. **FCM**: 8 active device tokens exist in DB. Background SW (`firebase-messaging-sw.js`) is already shipped. Need to verify token registration on both vendor + customer, confirm `sendTestPush` actually reaches devices, and add a custom looped sound for vendor leads in the SW (currently only the in-app `lead-sound.ts` plays — silent if app is closed).
3. **Lead flow**: Customer creates lead → fan-out to vendors → vendor accepts → chat. Need a single instrumented trace.
4. **Perf**: `Catalog request timed out` warning on every Quick load → 3s timeout on the catalog query, then app waits before painting. Plus image-heavy catalog and a deprecated `google.maps.Marker`.

---

## What I will fix

### 1. Maps & Distance (server-side proxy)

- Add **`GOOGLE_MAPS_SERVER_KEY`** secret (a separate key with **No restrictions** or **IP restrictions only** — not HTTP referrer). I'll request this via `add_secret`.
- Create `src/lib/maps.functions.ts` with 4 server functions:
  - `reverseGeocodeFn({ lat, lng })`
  - `distanceMatrixFn({ origin, destinations[] })`
  - `placesAutocompleteFn`, `placeDetailsFn`
- Rewrite `src/lib/google-maps.ts` REST wrappers to call these server fns instead of `maps.googleapis.com` directly. Keep JS SDK loader (`loadMapsSdk`) on the client — that one *does* honour referrer restrictions and is correct as-is.
- Bump geolocation accuracy: drop `maximumAge: 0` two-shot pattern, request high-accuracy fix with watchPosition until `accuracy < 25m` before locking the camera.
- Replace deprecated `google.maps.Marker` warning by switching vendor pins to `AdvancedMarkerElement` where supported (already done for the user pin).

### 2. FCM Notifications (background + custom sound)

- **Background sound**: edit `public/firebase-messaging-sw.js` to:
  - Play a custom MP3 (`/sounds/lead-alert.mp3`) on incoming `lead` data messages by routing through a focused client when one is open, and using `vibrate: [400,150,400,150,800]` + a high-priority Android channel on the notification payload.
  - Add `requireInteraction: true` and `silent: false` so Android shows it persistently.
- Add `/sounds/lead-alert.mp3` (loud chime asset; embed as base64-decoded blob or ship a small file).
- **Token verification**: add a server fn `verifyMyDeviceToken` that the Quick screen calls after login — it confirms the latest FCM token matches what's in `device_tokens`, re-registers if drifted. Also surface token status in `/admin/system-status`.
- **Vendor leads**: server-side, when a new lead is fanned out, send FCM with `data: { type: "lead", sound: "lead_alert", channel_id: "ko_leads" }` so the SW can pick it up while the app is killed.
- Verify `sendTestPush` end-to-end: I'll invoke it against a real vendor and tail logs.

### 3. End-to-end flow trace

- Add structured `console.info("[lead-flow] ...")` checkpoints at:
  customer create → DB insert → fan-out fn → vendor token lookup → FCM send result → vendor accept → chat row insert → realtime delivery to customer.
- Run one synthetic round-trip from a test customer to a test vendor and report exactly where it breaks (likely the FCM send step until #2 lands).

### 4. Performance (Login → Quick)

- Catalog timeout: bump query budget but **render the screen optimistically** with the static fallback so map paints in <300ms; hydrate categories when query lands. (Currently we wait, then warn, then paint.)
- Defer `loadMapsSdk()` until after first paint (already async, but currently blocks first vendor-list render).
- Convert hero/category JPEGs in `src/assets` to WebP via `?format=webp` (`vite-imagetools` is already supported by Vite).
- Preload only the LCP map skeleton; lazy-load `VendorListSheet`, `ChatSheets`, `FindingVendorOverlay` with `React.lazy` so they're not in the initial Quick bundle.
- Move `useFcmToken` registration behind `requestIdleCallback` — it currently runs synchronously after auth.

---

## What I need from you (one action)

Create a **second Google Maps API key** in Google Cloud Console with these settings:
- **Application restrictions**: None *(or IP addresses only, leaving blank is fine for now)*
- **API restrictions**: Geocoding API, Distance Matrix API, Places API, Directions API

Paste it when I prompt for the `GOOGLE_MAPS_SERVER_KEY` secret. The existing referrer-restricted key stays as-is for the JS map tiles — don't change it.

---

## Order of execution

1. Request `GOOGLE_MAPS_SERVER_KEY` → wait for paste.
2. Land server-side maps proxy (#1) — unblocks correct address + KM immediately.
3. FCM SW + custom sound + token verifier (#2).
4. Lead-flow instrumentation + live trace (#3).
5. Perf pass (#4).
6. Hand back: ready for SHA-256 fingerprint + Play Store wrap.

Total touch: ~8 files edited, 2 new files, 1 new secret, 0 schema changes.
