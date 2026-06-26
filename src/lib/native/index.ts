import { initStatusBar } from "./status-bar";
import { initImmersive } from "./immersive";
import { initNativePush } from "./push";
import { initOta } from "./ota";
import { initPrinter } from "./printer";
import { isNative } from "./platform";

export { isNative, isAndroid, isIOS } from "./platform";
export { setStatusBarStyle } from "./status-bar";
export * as Printer from "./printer";
export * as Geofence from "./geofence";
export * as Ota from "./ota";

/** One-shot native bootstrap. Call once from root effect. Safe on web. */
export async function bootstrapNative(): Promise<void> {
  if (!isNative()) return;
  await initStatusBar();
  await initImmersive();
  await initNativePush();
  // Non-blocking: OTA check shouldn't gate UI. Printer init is lazy
  // (only when user opens the printer screen), but BLE permission
  // priming here is cheap.
  initOta().catch(() => {});
  initPrinter().catch(() => {});
}
