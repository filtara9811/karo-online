import { useEffect, useState } from "react";

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
    // 30 min cache
    if (Date.now() - parsed.ts > 30 * 60 * 1000) return null;
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
  try {
    // OpenStreetMap Nominatim — no API key required, free for low volume.
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
  const [state, setState] = useState<GeoState>(() => {
    const cached = readCache();
    if (cached) {
      return {
        status: "ready",
        lat: cached.lat,
        lng: cached.lng,
        label: cached.label,
        accuracyKm: null,
      };
    }
    return {
      status: "idle",
      lat: null,
      lng: null,
      label: "Detecting your location…",
      accuracyKm: null,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unsupported", label: "Location unavailable" }));
      return;
    }

    let cancelled = false;
    setState((s) => (s.status === "ready" ? s : { ...s, status: "loading" }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracyKm = pos.coords.accuracy / 1000;
        setState({
          status: "ready",
          lat,
          lng,
          label: "Locating address…",
          accuracyKm,
        });
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
          label:
            err.code === err.PERMISSION_DENIED
              ? "Enable location to detect address"
              : "Location unavailable",
        }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
