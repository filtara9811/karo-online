import { isNative } from "./platform";

/**
 * Hide splash and ensure Android immersive (no chrome bar / no system bars peek).
 * Re-applies on app resume so notification-pull doesn't permanently re-show bars.
 */
export async function initImmersive(): Promise<void> {
  if (!isNative()) return;
  try {
    const [{ SplashScreen }, { App }] = await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/app"),
    ]);

    // Hide splash on first paint
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => undefined);
    }, 400);

    // Re-apply overlay on resume
    App.addListener("resume", async () => {
      try {
        const { StatusBar } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch {
        /* noop */
      }
    });
  } catch (e) {
    console.warn("[native] immersive init failed", e);
  }
}
