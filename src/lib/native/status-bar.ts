import { isNative } from "./platform";

/**
 * Configure status bar for immersive look. Safe no-op on web.
 * Dynamically imports plugins so web bundles don't pull native APIs.
 */
export async function initStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#00000000" });
  } catch (e) {
    console.warn("[native] status bar init failed", e);
  }
}

/** Set status bar style dynamically per-route (call from page mounts). */
export async function setStatusBarStyle(theme: "dark" | "light"): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
  } catch {
    /* noop */
  }
}
