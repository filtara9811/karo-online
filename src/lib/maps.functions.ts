/**
 * Server-side proxies for Google Maps Web Service REST APIs.
 *
 * Why this exists: Google's REST endpoints (Geocoding, Distance Matrix,
 * Places, Directions) DO NOT honor HTTP-referrer key restrictions — only
 * the JS SDK does. So calling them from the browser with a referrer-locked
 * key always returns REQUEST_DENIED. We proxy through the server using a
 * separate, IP/unrestricted server key (`GOOGLE_MAPS_SERVER_KEY`).
 *
 * Keep this file thin — server fn declarations only — so the splitter can
 * stub it out of client bundles cleanly.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://maps.googleapis.com/maps/api";

function key(): string {
  const k = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");
  return k;
}

const LatLng = z.object({ lat: z.number(), lng: z.number() });

// ─── Reverse geocode ────────────────────────────────────────────────────
export const reverseGeocodeFn = createServerFn({ method: "POST" })
  .inputValidator((d: { lat: number; lng: number }) =>
    LatLng.parse(d),
  )
  .handler(async ({ data }) => {
    const url = `${BASE}/geocode/json?latlng=${data.lat},${data.lng}&language=en&key=${key()}`;
    const r = await fetch(url);
    const j = (await r.json()) as any;
    if (j.status !== "OK") {
      return { ok: false as const, status: j.status as string, error: j.error_message ?? null };
    }
    return { ok: true as const, results: j.results as any[] };
  });

// ─── Geocode (address → latlng) ─────────────────────────────────────────
export const geocodeFn = createServerFn({ method: "POST" })
  .inputValidator((d: { address: string }) =>
    z.object({ address: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const url = `${BASE}/geocode/json?address=${encodeURIComponent(data.address)}&region=in&key=${key()}`;
    const r = await fetch(url);
    const j = (await r.json()) as any;
    if (j.status !== "OK" || !j.results?.[0]?.geometry?.location) {
      return { ok: false as const, status: j.status, error: j.error_message ?? null };
    }
    const loc = j.results[0].geometry.location;
    return { ok: true as const, lat: loc.lat as number, lng: loc.lng as number };
  });

// ─── Distance matrix ────────────────────────────────────────────────────
export const distanceMatrixFn = createServerFn({ method: "POST" })
  .inputValidator((d: { origin: { lat: number; lng: number }; destinations: { lat: number; lng: number }[] }) =>
    z.object({
      origin: LatLng,
      destinations: z.array(LatLng).min(1).max(25),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const dest = data.destinations.map((d) => `${d.lat},${d.lng}`).join("|");
    const url = `${BASE}/distancematrix/json?origins=${data.origin.lat},${data.origin.lng}&destinations=${encodeURIComponent(dest)}&mode=driving&units=metric&key=${key()}`;
    const r = await fetch(url);
    const j = (await r.json()) as any;
    if (j.status !== "OK") {
      return { ok: false as const, status: j.status as string, error: j.error_message ?? null };
    }
    const row = j.rows?.[0]?.elements ?? [];
    const elements = row.map((e: any) =>
      e?.status === "OK"
        ? {
            distanceMeters: e.distance.value as number,
            distanceText: e.distance.text as string,
            durationSeconds: e.duration.value as number,
            durationText: e.duration.text as string,
          }
        : null,
    );
    return { ok: true as const, elements };
  });

// ─── Places autocomplete ────────────────────────────────────────────────
export const placesAutocompleteFn = createServerFn({ method: "POST" })
  .inputValidator((d: { input: string; sessionToken?: string; bias?: { lat: number; lng: number } | null }) =>
    z.object({
      input: z.string().min(1).max(200),
      sessionToken: z.string().max(64).optional(),
      bias: LatLng.nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({ input: data.input, components: "country:in", key: key() });
    if (data.sessionToken) params.set("sessiontoken", data.sessionToken);
    if (data.bias) {
      params.set("location", `${data.bias.lat},${data.bias.lng}`);
      params.set("radius", "50000");
    }
    const r = await fetch(`${BASE}/place/autocomplete/json?${params}`);
    const j = (await r.json()) as any;
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
      return { ok: false as const, status: j.status as string, error: j.error_message ?? null };
    }
    const predictions = (j.predictions ?? []).map((p: any) => ({
      place_id: p.place_id as string,
      description: p.description as string,
      main_text: (p.structured_formatting?.main_text ?? p.description) as string,
      secondary_text: (p.structured_formatting?.secondary_text ?? "") as string,
    }));
    return { ok: true as const, predictions };
  });

// ─── Place details ──────────────────────────────────────────────────────
export const placeDetailsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { placeId: string; sessionToken?: string }) =>
    z.object({
      placeId: z.string().min(1).max(255),
      sessionToken: z.string().max(64).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      place_id: data.placeId,
      fields: "formatted_address,geometry",
      key: key(),
    });
    if (data.sessionToken) params.set("sessiontoken", data.sessionToken);
    const r = await fetch(`${BASE}/place/details/json?${params}`);
    const j = (await r.json()) as any;
    const res = j.result;
    if (j.status !== "OK" || !res?.geometry?.location) {
      return { ok: false as const, status: j.status as string, error: j.error_message ?? null };
    }
    return {
      ok: true as const,
      address: (res.formatted_address ?? "") as string,
      lat: res.geometry.location.lat as number,
      lng: res.geometry.location.lng as number,
    };
  });

// ─── Directions ─────────────────────────────────────────────────────────
export const directionsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }) =>
    z.object({ origin: LatLng, destination: LatLng }).parse(d),
  )
  .handler(async ({ data }) => {
    const url = `${BASE}/directions/json?origin=${data.origin.lat},${data.origin.lng}&destination=${data.destination.lat},${data.destination.lng}&mode=driving&key=${key()}`;
    const r = await fetch(url);
    const j = (await r.json()) as any;
    const route = j.routes?.[0];
    const leg = route?.legs?.[0];
    if (j.status !== "OK" || !route || !leg) {
      return { ok: false as const, status: j.status as string, error: j.error_message ?? null };
    }
    return {
      ok: true as const,
      polyline: (route.overview_polyline?.points ?? "") as string,
      distanceText: (leg.distance?.text ?? "") as string,
      durationText: (leg.duration?.text ?? "") as string,
      steps: (leg.steps ?? []).map((s: any) => ({
        html: (s.html_instructions ?? "") as string,
        distance: (s.distance?.text ?? "") as string,
        duration: (s.duration?.text ?? "") as string,
      })),
    };
  });
