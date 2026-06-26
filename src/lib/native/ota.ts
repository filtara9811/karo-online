/**
 * Over-the-air updates via @capgo/capacitor-updater.
 * Web-safe: dynamic-imported, gated by isNative().
 *
 * Setup steps (one-time, on your machine):
 *  1. npx @capgo/cli@latest init           # creates capgo account + appId mapping
 *  2. npx @capgo/cli@latest login <api>    # auth (free tier OK)
 *  3. bun run build && npx cap sync android
 *  4. npx @capgo/cli@latest bundle upload --channel production
 *
 * On every native cold-start we call notifyAppReady() so the plugin marks
 * the running bundle as stable (prevents auto-rollback). Then we poll
 * the latest channel; if a new bundle is available we download and
 * activate it on next resume.
 */
import { isNative } from "./platform";

let installed = false;

export async function initOta(): Promise<void> {
  if (!isNative() || installed) return;
  installed = true;
  try {
    const { CapacitorUpdater } = await import(/* @vite-ignore */ ("@capgo/capacitor-updater" as string));
    // Mark current bundle as good — prevents rollback.
    await CapacitorUpdater.notifyAppReady();

    // Check for newer bundle on the configured channel.
    const latest = await CapacitorUpdater.getLatest();
    if (!latest?.url) return;

    const current = await CapacitorUpdater.current();
    if (current?.bundle?.version === latest.version) return;

    const bundle = await CapacitorUpdater.download({
      url: latest.url,
      version: latest.version,
    });
    if (bundle) {
      // Activate on next app resume so user isn't interrupted mid-task.
      await CapacitorUpdater.next({ id: bundle.id });
    }
  } catch (e) {
    console.warn("[ota] init failed", e);
  }
}

export async function forceCheckOta(): Promise<{ updated: boolean; version?: string }> {
  if (!isNative()) return { updated: false };
  try {
    const { CapacitorUpdater } = await import(/* @vite-ignore */ ("@capgo/capacitor-updater" as string));
    const latest = await CapacitorUpdater.getLatest();
    if (!latest?.url) return { updated: false };
    const current = await CapacitorUpdater.current();
    if (current?.bundle?.version === latest.version) return { updated: false, version: latest.version };
    const bundle = await CapacitorUpdater.download({ url: latest.url, version: latest.version });
    if (!bundle) return { updated: false };
    await CapacitorUpdater.set({ id: bundle.id });
    return { updated: true, version: latest.version };
  } catch (e) {
    console.warn("[ota] forceCheck failed", e);
    return { updated: false };
  }
}
