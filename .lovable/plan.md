## Problems identified (from screenshots + code scan)

**Screenshot #1 — Golden map-pin splash (beige background)**
- Source: `src/components/IntroSplash.tsx` (uses `ko-splash-pin.png`), rendered by `src/routes/register.tsx` on first session load, plus the native Capacitor splash configured in `capacitor.config.ts` (`SplashScreen` plugin).
- User wants this **completely removed** from the entire app.

**Screenshot #2 — Black "KaroOnline / LOADING…" screen with the golden bottom pill visible**
- Source: `src/routes/index.tsx` (lines 78–87) — a full-screen black "checking" state that runs on every launch while it decides whether to redirect to `/quick`. Because it does a delayed `navigate({ to: "/quick" })`, the SPA briefly renders `/quick`'s `BottomActionBar` (`All | Digital | Shop · Basic | Sarvice`) on top of a black canvas → exactly what the screenshot shows.
- Also, on native the Capacitor shell (`capacitor-shell/index.html`) shows its own "Karo Online" spinner, then `location.replace("https://karoonline.in/")` reloads the WebView — that reload is why users see this loading twice.

**Screenshot #3 — Home shows stale/old data, then map covered by "clouds", then redirects**
- `src/routes/quick.tsx` shows cached catalog immediately (see `cachePeek`), then swaps in fresh data after a network fetch; console log confirms `Catalog request timed out` warnings. Combined with `useGeolocation` + `QuickServiceMap` mounting before permission is granted, the map is visible with grey overlay before the location is resolved.
- Because `/` re-runs its "installed app?" check on every cold start and re-navigates to `/quick`, users see the black splash → home flash → data swap → map redraw chain.

**Screenshot #4 — "Something went wrong · Check that Google Play is enabled"**
- This is a Google Play Services popup fired by Firebase (FCM registration) inside `KaroFirebaseMessagingService` / `src/hooks/use-fcm-token.ts` on devices with missing/outdated Play Services. It should be caught silently.

**Auto-logout when app is backgrounded (native)**
- Root cause: `capacitor.config.ts` sets `server.url = "https://karoonline.in"`. The native app is not loading local bundled HTML — it loads the live site inside the WebView. When Android reclaims the WebView memory in the background, the whole page reloads and the Supabase session in `localStorage` sometimes ends up in a different origin/storage container (especially with WWW → apex redirect at boot). No native session persistence is wired up.

**Chrome address-bar / "browser look" appearing intermittently**
- Same root cause as above: because Capacitor loads `https://karoonline.in` remotely, some redirects (e.g. `www.karoonline.in` → `karoonline.in` in `__root.tsx`) can bounce the WebView into Chrome Custom Tabs, showing the browser chrome. Immersive mode also breaks on those handoffs.

---

## Fix plan (no scope creep — only what the user reported)

### 1. Remove the golden map-pin splash entirely
- Delete usage of `IntroSplash` in `src/routes/register.tsx` (drop `showSplash` state + branch, drop `SPLASH_SESSION_KEY` handling).
- Delete `src/components/IntroSplash.tsx` and `src/assets/ko-splash-pin.png.asset.json`.
- In `capacitor.config.ts`, set `SplashScreen.launchShowDuration: 0`, `showSpinner: false`, and switch background to solid black `#000000` so Android's native splash is instant and matches the app theme.

### 2. Kill the "black KaroOnline LOADING…" flash
- In `src/routes/index.tsx`, remove the full-screen `checking` black loading state. Do the "installed app?" detection synchronously in `useEffect` and either navigate immediately or render marketing — never render a stand-alone black loading screen.
- Fallback UI while `useEffect` runs one tick: render the marketing hero skeleton (light theme), not black.
- In `capacitor-shell/index.html`, remove the intermediate spinner page — either bundle a truly local `index.html` that boots the SPA, or make the redirect happen with zero visible flicker (no ring, no text, `background: transparent`).
- In `src/components/AppShell.tsx`, guarantee `BottomActionBar` never renders when `useRouterState().isLoading` is true AND no route content is mounted yet (so it can't sit alone on a black canvas).

### 3. Fix native auto-logout + Chrome-bar leak
- In `capacitor.config.ts`, remove `server.url` for production builds. Ship the SPA as local assets by pointing `webDir` at the built `dist/` (not `capacitor-shell`). This is the only reliable way to stop Android from swapping to Custom Tabs and reloading the site on resume.
- Update `scripts/patch-native-android.mjs` / build docs so `bun run build && npx cap sync android` copies the real SPA build into the APK.
- Add `App.addListener("appStateChange", …)` in `src/lib/native/index.ts` to call `supabase.auth.getSession()` on resume and re-hydrate — belt-and-suspenders against WebView eviction.
- Keep the WWW → apex redirect in `__root.tsx` **web-only**: skip it when `isNative()` is true, so Capacitor never triggers a cross-origin bounce.

### 4. Suppress the "Google Play services" popup
- In `src/lib/native/push.ts` and `src/hooks/use-fcm-token.ts`, wrap FCM registration in a try/catch that swallows the `MISSING`/`OUT_OF_DATE` Google Play error and silently disables push for that device. No dialog, no toast.
- On the Android side (`KaroFirebaseMessagingService`), guard `FirebaseMessaging.getInstance()` with `GoogleApiAvailability.isGooglePlayServicesAvailable()` and early-return when not `SUCCESS`.

### 5. Stop the home-screen "stale data → map cloud → redirect" chain
- In `src/routes/quick.tsx`, do NOT render `cachePeek` catalog when the cache belongs to a different auth user or is older than 60s — render the skeleton instead. This removes the "old data flashes" complaint.
- Mount `QuickServiceMap` only after `useGeolocation` returns a coordinate or explicit denial — no map paint before permission resolves (kills the "cloud" flash).
- Increase the `Catalog request timed out` threshold and switch the fallback to a subtle inline banner instead of a warning toast.

### 6. End-to-end verification (must pass before I claim done)
- Playwright script that launches localhost, navigates `/` → confirms **no black loading screen**, no `IntroSplash`, and lands on marketing or `/quick` cleanly. Screenshot each step.
- Playwright script that navigates directly to `/quick` with a mocked geolocation, confirms map only appears once coords resolve, and the bottom pill never sits on a black canvas.
- `tsgo` typecheck + `bun run build` clean.
- Manual native verification steps documented for you to install the new APK and confirm: no map-pin splash, no auto-logout on background, no Chrome bar, no Play Services popup.

---

## After fixes — full A-to-Z app audit (deliverable)

I will produce `AUDIT_REPORT.md` covering:
1. **Auth & session** — every sign-in path, session persistence on web + native, logout hygiene, OAuth redirect URIs.
2. **Native shell** — Capacitor config, splash, status bar, immersive mode, back-button handling, deep links, push token lifecycle, Play Services fallback.
3. **Routes** — every route in `src/routes/`, its loader/head/SSR posture, error + notFound boundaries, whether it is public vs `_authenticated`.
4. **Data layer** — Supabase policies per public table (RLS + GRANT audit), server functions vs edge functions, admin-client leaks, secret handling.
5. **Realtime + FCM** — subscription cleanup, duplicate listeners, notification dedup, sound/vibration behavior.
6. **UI shell** — `AppShell` overlays (`BottomActionBar`, `TopHeader`, `FloatingInquiryWidget`, `PermissionsGate`, `VendorLeadAlerts`) — z-index, render conditions, mobile safe-area.
7. **Vendor flow** — dashboard → my listing (bottom sheet) → my services (bottom sheet) audit against the layered-sheet spec from the last turn.
8. **Performance** — cold-start budget, catalog cache staleness, image assets, code-split boundaries, unused imports.
9. **Security findings** — run the security scanner and summarize open items with severity + recommended fix.
10. **Action list** — prioritized P0/P1/P2 with file/line references and estimated effort.

No backend schema changes will be made in this pass unless a P0 security finding requires one — those will be called out explicitly for your approval before I run any migration.
