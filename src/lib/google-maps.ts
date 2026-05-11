/**
 * Google Maps client-side helper.
 * Loads API key from `maps_services` (provider='google_maps', is_active=true)
 * and exposes thin wrappers over Google's Web Service REST endpoints.
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
      const { data } = await (supabase as any)
        .from("maps_services")
        .select("api_key, is_active")
        .eq("provider", "google_maps")
        .eq("is_active", true)
        .maybeSingle();
      const k = data?.api_key as string | undefined;
      return k && k.length > 10 ? k : null;
    } catch {
      return null;
    }
  })();
  return _keyPromise;
}

const BASE = "https://maps.googleapis.com/maps/api";

export type LatLng = { lat: number; lng: number };

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = await getGoogleMapsKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `${BASE}/geocode/json?latlng=${lat},${lng}&language=en&key=${key}`,
    );
    const j = await r.json();
    if (j.status !== "OK" || !j.results?.length) return null;
    // Prefer locality + administrative_area_level_1
    const best = j.results[0];
    const comps: Array<{ long_name: string; types: string[] }> = best.address_components ?? [];
    const pick = (t: string) => comps.find((c) => c.types.includes(t))?.long_name;
    const locality = pick("sublocality") || pick("locality") || pick("administrative_area_level_2");
    const region = pick("administrative_area_level_1");
    if (locality && region) return `${locality}, ${region}`;
    return best.formatted_address ?? null;
  } catch {
    return null;
  }
}

export async function geocode(address: string): Promise<LatLng | null> {
  const key = await getGoogleMapsKey();
  if (!key) return null;
  try {
    const r = await fetch(
      `${BASE}/geocode/json?address=${encodeURIComponent(address)}&region=in&key=${key}`,
    );
    const j = await r.json();
    if (j.status !== "OK") return null;
    const loc = j.results[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
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
  const key = await getGoogleMapsKey();
  if (!key || input.trim().length < 2) return [];
  try {
    const params = new URLSearchParams({
      input: input.trim(),
      components: "country:in",
      key,
    });
    if (opts.sessionToken) params.set("sessiontoken", opts.sessionToken);
    if (opts.bias)
      params.set("location", `${opts.bias.lat},${opts.bias.lng}`),
        params.set("radius", "50000");
    const r = await fetch(`${BASE}/place/autocomplete/json?${params}`);
    const j = await r.json();
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") return [];
    return (j.predictions ?? []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text ?? p.description,
      secondary_text: p.structured_formatting?.secondary_text ?? "",
    }));
  } catch {
    return [];
  }
}

export async function placeDetails(
  placeId: string,
  sessionToken?: string,
): Promise<{ address: string; lat: number; lng: number } | null> {
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
    const res = j.result;
    if (!res?.geometry?.location) return null;
    return {
      address: res.formatted_address ?? "",
      lat: res.geometry.location.lat,
      lng: res.geometry.location.lng,
    };
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
  const key = await getGoogleMapsKey();
  if (!key || destinations.length === 0) return destinations.map(() => null);
  try {
    const dest = destinations.map((d) => `${d.lat},${d.lng}`).join("|");
    const r = await fetch(
      `${BASE}/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${encodeURIComponent(dest)}&mode=driving&key=${key}`,
    );
    const j = await r.json();
    const row = j.rows?.[0]?.elements ?? [];
    return destinations.map((_, i) => {
      const e = row[i];
      if (!e || e.status !== "OK") return null;
      return {
        distanceMeters: e.distance.value,
        distanceText: e.distance.text,
        durationSeconds: e.duration.value,
        durationText: e.duration.text,
      };
    });
  } catch {
    return destinations.map(() => null);
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

export function newSessionToken(): string {
  return crypto.randomUUID();
}
