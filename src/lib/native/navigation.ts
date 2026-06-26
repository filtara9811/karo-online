import { isNative } from "./platform";

let registered = false;

/** Native back button should drive app history, not expose browser chrome. */
export async function initNativeNavigation(): Promise<void> {
  if (!isNative() || registered) return;
  registered = true;
  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("appUrlOpen", ({ url }) => {
      try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        if (path && path !== window.location.pathname) {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } catch {
        /* noop */
      }
    });
    await App.addListener("backButton", ({ canGoBack }) => {
      const path = window.location.pathname;
      const atHome = path === "/" || path === "/quick" || path === "/home";
      if (canGoBack && !atHome) {
        window.history.back();
        return;
      }
      App.minimizeApp().catch(() => undefined);
    });
  } catch (e) {
    console.warn("[native] navigation init failed", e);
  }
}