import { useEffect, useState } from "react";
import { reverseGeocode as googleReverseGeocode } from "@/lib/google-maps";

export type GeoState = {
  status: "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";
  lat: number | null;
  lng: number | null;
  label: string; // human-readable address (best-effort)
  accuracyKm: number | null;
};

const STORAGE_KEY = "ko-geo-cache";

type Cache = { lat: number; lng: number; label: string; ts: number };

function readCache(): Cache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    // 2 min cache (location can change quickly when user moves)
    if (Date.now() - parsed.ts > 2 * 60 * 1000) return null;
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
  // 1) Try Google (faster, more accurate, India-friendly)
  try {
    const g = await googleReverseGeocode(lat, lng);
    if (g) return g;
  } catch {
    /* fall through to OSM */
  }
  try {
    // 2) Fallback: OpenStreetMap Nominatim — no API key required.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("reverse geocode failed");
    const data = await res.json();
    const a = data?.address ?? {};
    const locality =
      a.suburb ||
      a.neighbourhood ||
      a.village ||
      a.town ||
      a.city_district ||
      a.city ||
      a.county;
    const region = a.state_district || a.state;
    if (locality && region) return `${locality}, ${region}`;
    if (locality) return locality;
    if (data?.display_name) {
      // First two comma-separated parts
      return String(data.display_name).split(",").slice(0, 2).join(",").trim();
    }
  } catch {
    /* fall through */
  }
  return "My current location";
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    lat: null,
    lng: null,
    label: "Detecting your location…",
    accuracyKm: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let watchId: number | null = null;

    const start = (forceFresh = false) => {
      if (!forceFresh) {
        const cached = readCache();
        if (cached) {
          setState({
            status: "ready",
            lat: cached.lat,
            lng: cached.lng,
            label: cached.label,
            accuracyKm: null,
          });
          return;
        }
      }
      if (!("geolocation" in navigator)) {
        setState((s) => ({ ...s, status: "unsupported", label: "Location unavailable" }));
        return;
      }

      setState((s) => (s.status === "ready" && !forceFresh ? s : { ...s, status: "loading", label: "Detecting your location…" }));

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracyKm = pos.coords.accuracy / 1000;
          setState({ status: "ready", lat, lng, label: "Locating address…", accuracyKm });
          const label = await reverseGeocode(lat, lng);
          if (cancelled) return;
          writeCache({ lat, lng, label, ts: Date.now() });
          setState({ status: "ready", lat, lng, label, accuracyKm });
        },
        (err) => {
          if (cancelled) return;
          setState((s) => ({
            ...s,
            status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
            label: err.code === err.PERMISSION_DENIED
              ? "Enable location to detect address"
              : "Location unavailable",
          }));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );

      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          if (cancelled) return;
          if (pos.coords.accuracy > 100) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setState((s) => ({ ...s, lat, lng, accuracyKm: pos.coords.accuracy / 1000 }));
          const label = await reverseGeocode(lat, lng);
          if (cancelled) return;
          writeCache({ lat, lng, label, ts: Date.now() });
          setState({ status: "ready", lat, lng, label, accuracyKm: pos.coords.accuracy / 1000 });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    };

    start();

    const onRefresh = () => start(true);
    window.addEventListener("ko-geo-refresh", onRefresh);

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener("ko-geo-refresh", onRefresh);
    };
  }, []);

  return state;
}
