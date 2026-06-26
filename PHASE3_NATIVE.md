# Phase 3 — Native Hardware & OTA

All three modules are web-safe (dynamic imports, `isNative()` gated). They only activate inside the Android/iOS Capacitor build.

## 1. Bluetooth Thermal Printer (`src/lib/native/printer.ts`)

```ts
import { Printer } from "@/lib/native";

// Scan
const found: Printer.PrinterDevice[] = [];
await Printer.scanPrinters((d) => found.push(d), 8000);

// Connect + print
await Printer.connectPrinter(found[0].deviceId);
await Printer.writeBytes(
  Printer.escposReceipt({
    title: "Karo Online",
    lines: ["Order #1234", "Total: ₹450"],
    footer: "Thank you!",
  }),
);
await Printer.disconnectPrinter();
```

Android: add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## 2. Background Geofencing (`src/lib/native/geofence.ts`)

```ts
import { Geofence } from "@/lib/native";

Geofence.registerZone({ id: "shop", latitude: 28.61, longitude: 77.20, radiusMeters: 500 });

const id = await Geofence.startBackgroundLocation(
  (loc) => console.log("loc", loc),
  (zoneId, evt) => console.log(zoneId, evt), // "enter" | "exit"
);

// later
await Geofence.stopBackgroundLocation(id);
```

Android: `ACCESS_BACKGROUND_LOCATION` + foreground service entry — see plugin README.

## 3. OTA Updates via Capgo (`src/lib/native/ota.ts`)

Auto-runs from `bootstrapNative()`. To push a new web bundle without a Play Store release:

```bash
# one-time setup
npx @capgo/cli@latest init
npx @capgo/cli@latest login <YOUR_CAPGO_API_KEY>

# every release
bun run build
npx cap sync android
npx @capgo/cli@latest bundle upload --channel production
```

Users get the new bundle on next cold-start; `notifyAppReady()` guards against bad releases (auto-rollback if app crashes before flag).

Manual check from anywhere:
```ts
import { Ota } from "@/lib/native";
const { updated, version } = await Ota.forceCheckOta();
```
