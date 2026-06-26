# Phase 1 + Phase 2: Capacitor Native + Realtime

दोनों phase एक साथ करेंगे, बिना bugs के। हर step के बाद test।

## Phase 2 — Capacitor Native Wrap

### 1. Install & Init
```
bun add @capacitor/core @capacitor/cli @capacitor/android
bun add @capacitor/status-bar @capacitor/splash-screen @capacitor/app
bun add @capacitor/push-notifications @capacitor/geolocation
bun add @capacitor/network @capacitor/preferences @capacitor/share
```

### 2. `capacitor.config.ts` (root)
- `appId: app.karoonline.twa` (existing TWA package — reuse)
- `appName: Karo Online`
- `webDir: dist`
- `server.androidScheme: https`
- `server.url`: production `https://karoonline.in` (live reload off — bundled assets)
- **Android Immersive Mode**: `android.overrideUserAgent`, plus custom `MainActivity` flag via plugin config
- **StatusBar plugin**: `style: DARK`, `backgroundColor: #000000`, `overlaysWebView: true`
- **SplashScreen**: 2s, `backgroundColor: #0a0606`, gold logo
- **PushNotifications**: enabled

### 3. Native helpers (`src/lib/native/`)
- `platform.ts` — `isNative()`, `isAndroid()` via `Capacitor.getPlatform()`
- `status-bar.ts` — dynamic color per route (dark hero = transparent overlay, light pages = white bg)
- `immersive.ts` — apply sticky-immersive on app resume so Chrome bar never reappears
- `push.ts` — register FCM via `PushNotifications` plugin (replaces web FCM token on native), upsert to `device_tokens` with `platform: 'android'`

### 4. Wire-up in `__root.tsx`
- On mount: if native → call `StatusBar.setOverlaysWebView`, hide splash after first paint, register push
- Existing web FCM hook stays for browser users (skip when `isNative()`)

### 5. Android project
- `npx cap add android`
- `MainActivity.java`: add `WindowCompat.setDecorFitsSystemWindows(false)` + immersive flags
- `AndroidManifest.xml`: `android:windowSoftInputMode="adjustResize"`, FCM service, notification permission
- `google-services.json` placeholder (user uploads when building APK)

### 6. Build script
- `bun run build && npx cap sync android` → APK build via `cd android && ./gradlew assembleRelease`
- Document in `PLAYSTORE_DEPLOY.md`

## Phase 1 — Supabase Realtime

### 7. Migration: enable realtime on key tables
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.leads,
  public.lead_messages,
  public.lead_notifications,
  public.catalog_groups,
  public.catalog_items,
  public.vendor_item_mappings;
```

### 8. Realtime hooks (`src/hooks/realtime/`)
- `use-leads-realtime.ts` — vendor inbox auto-refresh on new lead row matching vendor's groups
- `use-lead-thread-realtime.ts` — chat messages live
- `use-catalog-realtime.ts` — admin catalog edits push to customer subcategory grid

Pattern (RLS-respected, cleanup in `useEffect` return):
```ts
const ch = supabase.channel(`leads-${vendorId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' },
      () => queryClient.invalidateQueries({ queryKey: ['vendor-leads'] }))
  .subscribe();
return () => { supabase.removeChannel(ch); };
```

### 9. Integration points
- `VendorLeadInbox` → `useLeadsRealtime(vendorId)`
- `LeadChatThread` → `useLeadThreadRealtime(leadId)`
- Customer `subcategories` page → `useCatalogRealtime(groupId)`

## Auto-Logout Verification
पिछली turn में fix लगाया था; इस turn में दोबारा regression test करूँगा (sign-in → refresh → ensure no auto-logout)।

## Google Cloud IAM Steps (आप करेंगे)

FCM `403 Forbidden` fix — Service Account को role दें:

1. https://console.cloud.google.com → Project select करें (Firebase वाला — `karo-online` या जो भी)
2. **IAM & Admin → IAM**
3. अपना service account ढूँढें: `firebase-adminsdk-xxxxx@<project>.iam.gserviceaccount.com`
4. **Edit (pencil)** → **+ ADD ANOTHER ROLE**
5. ये roles add करें:
   - `Firebase Cloud Messaging API Admin`
   - `Service Account Token Creator`
   - `Firebase Admin SDK Administrator Service Agent`
6. **Save**
7. **APIs & Services → Library** → "Firebase Cloud Messaging API" → **Enable** (अगर disabled है)
8. 2-3 minute wait → हम test push भेजेंगे

## Testing Plan (हर step पर)

| Step | Test |
|------|------|
| Capacitor install | `bun run build` clean |
| Native plugins | Web build still works (Capacitor APIs only call on native) |
| Status bar/immersive | Web unchanged, native logic gated by `isNative()` |
| Realtime migrations | Existing queries unaffected |
| Realtime hooks | Open 2 tabs → lead/message updates in 2nd tab without refresh |
| Auto-logout | Sign in → close tab → reopen → still signed in |

हर change के बाद Playwright से preview check करूँगा। कोई regression मिले तो उसी turn में fix।

## Out of scope (Phase 3 के लिए)
- Geofencing (battery)
- OTA via Capgo
- BLE printer
- Play Store upload

---
**Phase 3 अगली बार:** Geofencing + OTA + BLE + Play Store।
