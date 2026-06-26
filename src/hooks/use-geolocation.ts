import { useEffect, useRef, useState } from "react";
import { reverseGeocode as googleReverseGeocode } from "@/lib/google-maps";
import { isNative } from "@/lib/native/platform";

export type GeoState = {
  status: "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";
  lat: number | null;
  lng: number | null;
  label: string; // human-readable address (best-effort)
  accuracyKm: number | null;
};

const STORAGE_KEY = "ko-geo-cache-v2";

type Cache = { lat: number; lng: number; label: string; accuracy: number; ts: number };

function readCache(): Cache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    // Only use very fresh + reasonably accurate cache (60s, ≤100m)
    if (Date.now() - parsed.ts > 60 * 1000) return null;
    if ((parsed.accuracy ?? 9999) > 100) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: Cache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* noop */
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  let googleLabel: string | null = null;
  try {
    const g = await googleReverseGeocode(lat, lng);
    if (g) googleLabel = g;
  } catch {
    /* fall through to OSM */
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("reverse geocode failed");
    const data = await res.json();
    const a = data?.address ?? {};
    const neighbourhood = a.neighbourhood || a.quarter || a.hamlet;
    const suburb = a.suburb || a.city_district || a.village || a.town;
    const city = a.city || a.county || a.state_district || a.state;
    const parts = [neighbourhood, suburb, city]
      .filter(Boolean)
      .filter((part, index, arr) => arr.indexOf(part) === index)
      .slice(0, 2);
    if (parts.length) return parts.join(", ");
    if (data?.display_name) {
      return String(data.display_name).split(",").slice(0, 2).join(",").trim();
    }
  } catch {
    /* noop */
  }
  if (googleLabel) return googleLabel;
  return "My current location";
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    lat: null,
    lng: null,
    label: "Detecting your location…",
    accuracyKm: null,
  });
  const bestAccuracyRef = useRef<number>(Infinity);
  const lastGeocodeAtRef = useRef<number>(0);
  const lastGeocodedKeyRef = useRef<string>("");
  const geocodeSeqRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let watchId: number | null = null;
    let nativeWatchId: string | null = null;
    let oneShotTimer: number | null = null;
    let refreshTimer: number | null = null;

    const maybeReverseGeocode = async (lat: number, lng: number, accuracy: number) => {
      // Do not print a confident mohalla name from a rough GPS/IP fix.
      if (accuracy > 180) {
        setState((s) => ({ ...s, label: "Improving GPS accuracy…" }));
        return;
      }
      // throttle: at most once per 8s, and only if moved ≥ 30m (~0.0003°)
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const now = Date.now();
      if (key === lastGeocodedKeyRef.current && now - lastGeocodeAtRef.current < 8000) return;
      lastGeocodedKeyRef.current = key;
      lastGeocodeAtRef.current = now;
      const seq = ++geocodeSeqRef.current;
      const label = await reverseGeocode(lat, lng);
      if (cancelled || seq !== geocodeSeqRef.current) return;
      setState((s) => {
        if (s.lat == null || s.lng == null) return s;
        if (distanceMeters({ lat, lng }, { lat: s.lat, lng: s.lng }) > 80) return s;
        writeCache({ lat: s.lat, lng: s.lng, label, accuracy: (s.accuracyKm ?? 0) * 1000, ts: Date.now() });
        return { ...s, label };
      });
    };

    const applyCoords = (lat: number, lng: number, accuracy: number) => {
      if (cancelled) return;

      // Always show first fix even if rough, but prefer better fixes after.
      // Reject only if a *much worse* fix arrives after a good one.
      if (accuracy > bestAccuracyRef.current * 2 && bestAccuracyRef.current < 50) return;
      if (accuracy < bestAccuracyRef.current) bestAccuracyRef.current = accuracy;

      setState((s) => ({
        status: "ready",
        lat,
        lng,
        label: s.label === "Detecting your location…" || s.label === "Enable location to detect address"
          ? "Locating address…"
          : s.label,
        accuracyKm: accuracy / 1000,
      }));
      void maybeReverseGeocode(lat, lng, accuracy);
    };

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      applyCoords(lat, lng, accuracy);
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      setState((s) => ({
        ...s,
        status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
        label:
          err.code === err.PERMISSION_DENIED
            ? "Enable location to detect address"
            : "Location unavailable",
      }));
    };

    const seedFromCache = (forceFresh: boolean) => {
      if (forceFresh) {
        bestAccuracyRef.current = Infinity;
        setState((s) => ({ ...s, status: "loading", label: "Detecting your location…" }));
        return;
      }
      const cached = readCache();
      if (cached) {
        setState({
          status: "ready",
          lat: cached.lat,
          lng: cached.lng,
          label: cached.label,
          accuracyKm: cached.accuracy / 1000,
        });
        bestAccuracyRef.current = cached.accuracy;
      } else {
        setState((s) => ({ ...s, status: "loading", label: "Detecting your location…" }));
      }
    };

    const startNative = async (forceFresh = false) => {
      seedFromCache(forceFresh);
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const currentPerm = await Geolocation.checkPermissions().catch(() => null);
        if (currentPerm?.location !== "granted") {
          await Geolocation.requestPermissions({ permissions: ["location"] });
        }
        const first = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
        applyCoords(first.coords.latitude, first.coords.longitude, first.coords.accuracy ?? 9999);
        if (nativeWatchId) {
          await Geolocation.clearWatch({ id: nativeWatchId }).catch(() => undefined);
        }
        nativeWatchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
          (position, err) => {
            if (cancelled) return;
            if (err) {
              const msg = String((err as any)?.message ?? err).toLowerCase();
              setState((s) => ({
                ...s,
                status: msg.includes("denied") || msg.includes("permission") ? "denied" : "error",
                label: msg.includes("denied") || msg.includes("permission")
                  ? "Enable location to detect address"
                  : "Location unavailable",
              }));
              return;
            }
            if (!position) return;
            applyCoords(position.coords.latitude, position.coords.longitude, position.coords.accuracy ?? 9999);
          },
        );
      } catch (err) {
        if (cancelled) return;
        const msg = String((err as any)?.message ?? err).toLowerCase();
        setState((s) => ({
          ...s,
          status: msg.includes("denied") || msg.includes("permission") ? "denied" : "error",
          label: msg.includes("denied") || msg.includes("permission")
            ? "Enable location to detect address"
            : "Location unavailable",
        }));
      }
    };

    const start = (forceFresh = false) => {
      if (isNative()) {
        void startNative(forceFresh);
        return;
      }
      if (!("geolocation" in navigator)) {
        setState((s) => ({ ...s, status: "unsupported", label: "Location unavailable" }));
        return;
      }

      // Show cached position instantly while we await a fresh GPS fix.
      seedFromCache(forceFresh);

      // Kick a one-shot high-accuracy request to get a first fix fast.
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      // Continuously watch — this is what auto-refreshes the pin as the user moves.
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      });
    };

    start();

    // Auto-refresh location every 2 minutes while the app is open. This removes
    // the need for manual refresh after the phone wakes/network changes.
    refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") start(true);
    }, 120_000);

    const onRefresh = () => start(true);
    window.addEventListener("ko-geo-refresh", onRefresh);

    // When the tab/app regains focus, request a fresh fix (user may have moved).
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (isNative()) {
          start(true);
          return;
        }
        navigator.geolocation.getCurrentPosition(onSuccess, () => {}, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (nativeWatchId != null) {
        const id = nativeWatchId;
        void import("@capacitor/geolocation")
          .then(({ Geolocation }) => Geolocation.clearWatch({ id }))
          .catch(() => undefined);
      }
      if (oneShotTimer != null) window.clearTimeout(oneShotTimer);
      if (refreshTimer != null) window.clearInterval(refreshTimer);
      window.removeEventListener("ko-geo-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
}
