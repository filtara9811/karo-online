import { initStatusBar } from "./status-bar";
import { initImmersive } from "./immersive";
import { initNativePush } from "./push";
import { isNative } from "./platform";

export { isNative, isAndroid, isIOS } from "./platform";
export { setStatusBarStyle } from "./status-bar";

/** One-shot native bootstrap. Call once from root effect. Safe on web. */
export async function bootstrapNative(): Promise<void> {
  if (!isNative()) return;
  await initStatusBar();
  await initImmersive();
  await initNativePush();
}
