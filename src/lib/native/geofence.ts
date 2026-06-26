/**
 * Background geofencing skeleton via @capacitor-community/background-geolocation.
 * Web-safe: dynamic-imported, gated by isNative().
 *
 * Usage:
 *   const id = await startBackgroundLocation((loc) => { ... });
 *   // later
 *   await stopBackgroundLocation(id);
 *
 * For true OS geofence regions (battery-efficient), use the platform's
 * Geofence APIs — this plugin gives continuous-but-throttled background
 * location which is sufficient for "is vendor inside service zone".
 */
import { isNative } from "./platform";

export type BgLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  bearing?: number | null;
  time?: number;
};

export type GeofenceZone = {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

let watcherId: string | null = null;
const zones = new Map<string, GeofenceZone>();
const insideState = new Map<string, boolean>();

export function registerZone(z: GeofenceZone) {
  zones.set(z.id, z);
}
export function clearZones() {
  zones.clear();
  insideState.clear();
}

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function startBackgroundLocation(
  onUpdate: (loc: BgLocation) => void,
  onTransition?: (zoneId: string, event: "enter" | "exit") => void,
): Promise<string> {
  if (!isNative()) throw new Error("Background location is only available in the native app");
  const mod: any = await import("@capacitor-community/background-geolocation");
  const BackgroundGeolocation = mod.BackgroundGeolocation ?? mod.default;
  const id: string = await BackgroundGeolocation.addWatcher(
    {
      backgroundMessage: "Karo Online is tracking your service zone",
      backgroundTitle: "Karo Online",
      requestPermissions: true,
      stale: false,
      distanceFilter: 25,
    },
    (location: BgLocation | null, error: any) => {
      if (error) {
        console.warn("[geofence] watcher error", error);
        return;
      }
      if (!location) return;
      onUpdate(location);
      if (!onTransition) return;
      for (const z of zones.values()) {
        const d = haversineMeters(location, z);
        const inside = d <= z.radiusMeters;
        const prev = insideState.get(z.id) ?? false;
        if (inside !== prev) {
          insideState.set(z.id, inside);
          onTransition(z.id, inside ? "enter" : "exit");
        }
      }
    },
  );
  watcherId = id;
  return id;
}

export async function stopBackgroundLocation(id?: string): Promise<void> {
  if (!isNative()) return;
  const target = id ?? watcherId;
  if (!target) return;
  const { BackgroundGeolocation } = await import("@capacitor-community/background-geolocation");
  try { await BackgroundGeolocation.removeWatcher({ id: target }); } catch {}
  if (target === watcherId) watcherId = null;
}

export function isTracking(): boolean {
  return !!watcherId;
}
