/**
 * Google Maps client-side helper.
 * Loads API key from `maps_services` (provider='google_maps', is_active=true)
 * and exposes wrappers over Google's Web Service REST + JS SDK.
 *
 * Includes a localStorage offline cache for reverse-geocode, distance-matrix,
 * directions and autocomplete responses so repeat lookups stay fast and
 * survive PWA / Android WebView offline transitions.
 *
 * NOTE: API key has HTTP referrer restrictions, so all calls run from the
 * browser (Referer header is set automatically). Do NOT call these from
 * server functions.
 */
import { supabase } from "@/integrations/supabase/client";

let _keyPromise: Promise<string | null> | null = null;

export function getGoogleMapsKey(): Promise<string | null> {
  if (_keyPromise) return _keyPromise;
  _keyPromise = (async () => {
    try {
      const { data } = await (supabase as any).rpc("get_active_maps_key");
      const row = data as { api_key?: string; map_sdk_key?: string } | null;
      const k = row?.map_sdk_key || row?.api_key;
      return k && k.length > 10 ? k : null;
    } catch {
      return null;
    }
  })();
  return _keyPromise;
}

const BASE = "https://maps.googleapis.com/maps/api";
export const GOOGLE_MAPS_AUTH_FAILURE_EVENT = "ko-google-maps-auth-failure";

export type LatLng = { lat: number; lng: number };

// ─── offline cache ────────────────────────────────────────────────────────
type CacheEntry<T> = { v: T; ts: number };
const CACHE_NS = "ko-gmaps-cache:";
const TTL = {
  reverse: 7 * 24 * 60 * 60 * 1000, // 7 days
  geocode: 30 * 24 * 60 * 60 * 1000,
  distance: 5 * 60 * 1000, // 5 min — traffic-sensitive
  directions: 10 * 60 * 1000,
  autocomplete: 60 * 60 * 1000,
};

function cacheGet<T>(key: string, ttl: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_NS + key);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - e.ts > ttl) return null;
    return e.v;
  } catch {
    return null;
  }
}
function cacheSet<T>(key: string, v: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_NS + key, JSON.stringify({ v, ts: Date.now() } as CacheEntry<T>));
  } catch {
    /* quota — ignore */
  }
}
const round = (n: number, d = 4) => Number(n.toFixed(d));

// ─── REST wrappers ────────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const k = `rev:${round(lat, 4)},${round(lng, 4)}`;
  const cached = cacheGet<string>(k, TTL.reverse);
  if (cached) return cached;

  const key = await getGoogleMapsKey();
  if (!key) return null;
  try {
    const r = await fetch(`${BASE}/geocode/json?latlng=${lat},${lng}&language=en&key=${key}`);
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] reverseGeocode REQUEST_DENIED:", j.error_message);
      return null;
    }
    if (j.status !== "OK" || !j.results?.length) return null;
    // Prefer the most specific result (street_address > premise > sublocality_level_3/2/1 > route)
    const priority = [
      "street_address", "premise", "subpremise",
      "sublocality_level_3", "sublocality_level_2", "sublocality_level_1",
      "route", "neighborhood", "locality",
    ];
    const ranked = [...j.results].sort((a: any, b: any) => {
      const ra = Math.min(...(a.types ?? []).map((t: string) => { const i = priority.indexOf(t); return i < 0 ? 99 : i; }), 99);
      const rb = Math.min(...(b.types ?? []).map((t: string) => { const i = priority.indexOf(t); return i < 0 ? 99 : i; }), 99);
      return ra - rb;
    });
    const best = ranked[0];
    const comps: Array<{ long_name: string; types: string[] }> = best.address_components ?? [];
    const pick = (t: string) => comps.find((c) => c.types.includes(t))?.long_name;
    const street = pick("route");
    const number = pick("street_number");
    const sublocal =
      pick("sublocality_level_2") ||
      pick("sublocality_level_1") ||
      pick("sublocality") ||
      pick("neighborhood");
    const locality = pick("locality") || pick("administrative_area_level_2");
    // Pincode: try the chosen result first, then fall back to ANY result that has one
    let pincode = pick("postal_code");
    if (!pincode) {
      for (const r of j.results as any[]) {
        const c = (r.address_components ?? []).find((c: any) => c.types?.includes("postal_code"));
        if (c?.long_name) { pincode = c.long_name; break; }
      }
    }
    const localityWithPin = locality && pincode ? `${locality} ${pincode}` : (locality || pincode);
    const parts = [number && street ? `${number} ${street}` : street, sublocal, localityWithPin].filter(Boolean);
    const out = parts.length ? parts.join(", ") : (best.formatted_address ?? null);
    if (out) cacheSet(k, out);
    return out;
  } catch {
    return null;
  }
}

export async function geocode(address: string): Promise<LatLng | null> {
  const k = `geo:${address.trim().toLowerCase()}`;
  const cached = cacheGet<LatLng>(k, TTL.geocode);
  if (cached) return cached;

  const key = await getGoogleMapsKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `${BASE}/geocode/json?address=${encodeURIComponent(address)}&region=in&key=${key}`,
    );
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] geocode REQUEST_DENIED:", j.error_message);
      return null;
    }
    if (j.status !== "OK") return null;
    const loc = j.results[0]?.geometry?.location;
    if (!loc) return null;
    const out = { lat: loc.lat, lng: loc.lng };
    cacheSet(k, out);
    return out;
  } catch {
    return null;
  }
}

export type PlacePrediction = {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
};

export async function placesAutocomplete(
  input: string,
  opts: { sessionToken?: string; bias?: LatLng } = {},
): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];
  const k = `ac:${trimmed.toLowerCase()}|${opts.bias ? round(opts.bias.lat, 2) + "," + round(opts.bias.lng, 2) : ""}`;
  const cached = cacheGet<PlacePrediction[]>(k, TTL.autocomplete);
  if (cached) return cached;

  const key = await getGoogleMapsKey();
  if (!key) return [];
  try {
    const params = new URLSearchParams({ input: trimmed, components: "country:in", key });
    if (opts.sessionToken) params.set("sessiontoken", opts.sessionToken);
    if (opts.bias) {
      params.set("location", `${opts.bias.lat},${opts.bias.lng}`);
      params.set("radius", "50000");
    }
    const r = await fetch(`${BASE}/place/autocomplete/json?${params}`);
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] autocomplete REQUEST_DENIED:", j.error_message);
      return [];
    }
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") return [];
    const out = (j.predictions ?? []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text ?? p.description,
      secondary_text: p.structured_formatting?.secondary_text ?? "",
    }));
    cacheSet(k, out);
    return out;
  } catch {
    return [];
  }
}

export async function placeDetails(
  placeId: string,
  sessionToken?: string,
): Promise<{ address: string; lat: number; lng: number } | null> {
  const k = `pd:${placeId}`;
  const cached = cacheGet<{ address: string; lat: number; lng: number }>(k, TTL.geocode);
  if (cached) return cached;

  const key = await getGoogleMapsKey();
  if (!key) return null;
  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "formatted_address,geometry",
      key,
    });
    if (sessionToken) params.set("sessiontoken", sessionToken);
    const r = await fetch(`${BASE}/place/details/json?${params}`);
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] placeDetails REQUEST_DENIED:", j.error_message);
      return null;
    }
    const res = j.result;
    if (!res?.geometry?.location) return null;
    const out = {
      address: res.formatted_address ?? "",
      lat: res.geometry.location.lat,
      lng: res.geometry.location.lng,
    };
    cacheSet(k, out);
    return out;
  } catch {
    return null;
  }
}

export type DistanceResult = {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
};

export async function distanceMatrix(
  origin: LatLng,
  destinations: LatLng[],
): Promise<(DistanceResult | null)[]> {
  if (destinations.length === 0) return [];
  // Per-destination cache
  const out: (DistanceResult | null)[] = new Array(destinations.length).fill(null);
  const missing: number[] = [];
  destinations.forEach((d, i) => {
    const k = `dm:${round(origin.lat)},${round(origin.lng)}|${round(d.lat)},${round(d.lng)}`;
    const c = cacheGet<DistanceResult>(k, TTL.distance);
    if (c) out[i] = c;
    else missing.push(i);
  });
  if (missing.length === 0) return out;

  const key = await getGoogleMapsKey();
  if (!key) return out;
  try {
    const dest = missing.map((i) => `${destinations[i].lat},${destinations[i].lng}`).join("|");
    const r = await fetch(
      `${BASE}/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${encodeURIComponent(dest)}&mode=driving&key=${key}`,
    );
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] distanceMatrix REQUEST_DENIED:", j.error_message);
      return out;
    }
    const row = j.rows?.[0]?.elements ?? [];
    missing.forEach((destIdx, rowIdx) => {
      const e = row[rowIdx];
      if (!e || e.status !== "OK") return;
      const result: DistanceResult = {
        distanceMeters: e.distance.value,
        distanceText: e.distance.text,
        durationSeconds: e.duration.value,
        durationText: e.duration.text,
      };
      out[destIdx] = result;
      const k = `dm:${round(origin.lat)},${round(origin.lng)}|${round(destinations[destIdx].lat)},${round(destinations[destIdx].lng)}`;
      cacheSet(k, result);
    });
    return out;
  } catch {
    return out;
  }
}

export type DirectionsResult = {
  polyline: string;
  distanceText: string;
  durationText: string;
  steps: Array<{ html: string; distance: string; duration: string }>;
};

export async function directions(
  origin: LatLng,
  destination: LatLng,
): Promise<DirectionsResult | null> {
  const k = `dir:${round(origin.lat)},${round(origin.lng)}|${round(destination.lat)},${round(destination.lng)}`;
  const cached = cacheGet<DirectionsResult>(k, TTL.directions);
  if (cached) return cached;

  const key = await getGoogleMapsKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `${BASE}/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&key=${key}`,
    );
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] directions REQUEST_DENIED:", j.error_message);
      return null;
    }
    const route = j.routes?.[0];
    const leg = route?.legs?.[0];
    if (!route || !leg) return null;
    const out: DirectionsResult = {
      polyline: route.overview_polyline?.points ?? "",
      distanceText: leg.distance?.text ?? "",
      durationText: leg.duration?.text ?? "",
      steps: (leg.steps ?? []).map((s: any) => ({
        html: s.html_instructions ?? "",
        distance: s.distance?.text ?? "",
        duration: s.duration?.text ?? "",
      })),
    };
    cacheSet(k, out);
    return out;
  } catch {
    return null;
  }
}

export async function nearbySearch(
  location: LatLng,
  opts: { radius?: number; keyword?: string; type?: string } = {},
): Promise<Array<{ name: string; place_id: string; vicinity: string; lat: number; lng: number; rating?: number }>> {
  const key = await getGoogleMapsKey();
  if (!key) return [];
  try {
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: String(opts.radius ?? 5000),
      key,
    });
    if (opts.keyword) params.set("keyword", opts.keyword);
    if (opts.type) params.set("type", opts.type);
    const r = await fetch(`${BASE}/place/nearbysearch/json?${params}`);
    const j = await r.json();
    if (j.status === "REQUEST_DENIED") {
      console.warn("[gmaps] nearbySearch REQUEST_DENIED:", j.error_message);
      return [];
    }
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") return [];
    return (j.results ?? []).map((p: any) => ({
      name: p.name,
      place_id: p.place_id,
      vicinity: p.vicinity ?? "",
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
      rating: p.rating,
    }));
  } catch {
    return [];
  }
}

// ─── Static Map (image) ───────────────────────────────────────────────────
export async function staticMapUrl(opts: {
  center?: LatLng;
  zoom?: number;
  size?: { w: number; h: number };
  scale?: 1 | 2;
  markers?: Array<LatLng & { color?: string; label?: string }>;
  polyline?: string;
}): Promise<string | null> {
  const key = await getGoogleMapsKey();
  if (!key) return null;
  const size = opts.size ?? { w: 600, h: 240 };
  const params = new URLSearchParams({
    size: `${size.w}x${size.h}`,
    scale: String(opts.scale ?? 2),
    maptype: "roadmap",
    key,
  });
  if (opts.center) params.set("center", `${opts.center.lat},${opts.center.lng}`);
  if (opts.zoom != null) params.set("zoom", String(opts.zoom));
  (opts.markers ?? []).forEach((m) => {
    const parts = [`color:${m.color ?? "red"}`];
    if (m.label) parts.push(`label:${m.label}`);
    parts.push(`${m.lat},${m.lng}`);
    params.append("markers", parts.join("|"));
  });
  if (opts.polyline) params.append("path", `weight:4|color:0x10b981ff|enc:${opts.polyline}`);
  return `${BASE}/staticmap?${params}`;
}

// ─── JS SDK loader ────────────────────────────────────────────────────────
let _sdkPromise: Promise<any> | null = null;
export function loadMapsSdk(libs: string[] = ["places"]): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (_sdkPromise) return _sdkPromise;
  _sdkPromise = (async () => {
    const key = await getGoogleMapsKey();
    if (!key) return null;
    return new Promise((resolve) => {
      let settled = false;
      const resolveOnce = (value: any) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const previousAuthFailure = (window as any).gm_authFailure;
      (window as any).gm_authFailure = () => {
        try { window.dispatchEvent(new Event(GOOGLE_MAPS_AUTH_FAILURE_EVENT)); } catch { /* noop */ }
        if (typeof previousAuthFailure === "function") previousAuthFailure();
        resolveOnce(null);
      };
      const cbName = `__gmaps_cb_${Date.now()}`;
      (window as any)[cbName] = () => {
        resolveOnce((window as any).google ?? null);
        try { delete (window as any)[cbName]; } catch { /* */ }
      };
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=${libs.join(",")}&callback=${cbName}&loading=async`;
      s.async = true;
      s.defer = true;
      s.onerror = () => resolveOnce(null);
      document.head.appendChild(s);
      window.setTimeout(() => resolveOnce((window as any).google?.maps ? (window as any).google : null), 12000);
    });
  })();
  return _sdkPromise;
}

export function newSessionToken(): string {
  return crypto.randomUUID();
}

// haversine fallback when Distance Matrix unavailable
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
