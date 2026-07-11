import { initStatusBar } from "./status-bar";
import { initImmersive } from "./immersive";
import { initNativePush } from "./push";
import { initOta } from "./ota";
import { initPrinter } from "./printer";
import { initNativeNavigation } from "./navigation";
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
  await initNativeNavigation();
  await initNativePush();
  // Non-blocking: OTA check shouldn't gate UI. Printer init is lazy
  // (only when user opens the printer screen), but BLE permission
  // priming here is cheap.
  initOta().catch(() => {});
  initPrinter().catch(() => {});

  // Re-hydrate Supabase session on app resume. Android may evict the WebView
  // in the background, dropping in-memory auth state — force a refresh so
  // users don't appear "logged out" when they return to the app.
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) return;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // No cached session — nothing to do; user will see signed-out UI.
          return;
        }
        // Nudge listeners so hooks re-sync (e.g. profile fetch).
        await supabase.auth.refreshSession().catch(() => undefined);
      } catch { /* noop */ }
    });
  } catch (e) {
    console.warn("[native] resume listener failed", e);
  }
}
