import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  radiusKm: z.number().min(0).max(50).optional(),
});

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export type DigitalShop = {
  id: string;
  business_name: string | null;
  owner_name: string | null;
  trade: string | null;
  deals_in: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  cover_video_url: string | null;
  verified: boolean;
  is_online: boolean;
  lat: number | null;
  lng: number | null;
  km: number | null;
  service_radius_km: number;
};

/**
 * Public list of approved digital shops near a customer.
 * Returns only non-PII columns — safe for anon/customer reads.
 */
export const getNearbyDigitalShops = createServerFn({ method: "POST" })
  .inputValidator((d) => Schema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; shops: DigitalShop[] } | { ok: false; error: string; shops: [] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("vendors")
      .select(
        "id, business_name, owner_name, trade, deals_in, avatar_url, cover_image_url, cover_video_url, verified, is_online, status, is_blocked, lat, lng, live_lat, live_lng, location_updated_at, operation_mode, service_radius_km"
      )
      .eq("is_blocked", false)
      .eq("status", "active");

    if (error) return { ok: false as const, error: error.message, shops: [] };

    const origin = data.origin ?? null;
    const radiusKm = data.radiusKm ?? 25;
    const FRESH_MS = 24 * 60 * 60 * 1000;

    const shops: DigitalShop[] = (rows ?? [])
      .map((v: any) => {
        const fresh = !!v.location_updated_at && Date.now() - new Date(v.location_updated_at).getTime() <= FRESH_MS;
        const useLive = v.operation_mode === "dynamic" && fresh && v.live_lat != null && v.live_lng != null;
        const rawLat = useLive ? v.live_lat : (v.lat ?? v.live_lat);
        const rawLng = useLive ? v.live_lng : (v.lng ?? v.live_lng);
        const lat = rawLat == null ? null : Number(rawLat);
        const lng = rawLng == null ? null : Number(rawLng);
        const km =
          origin && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
            ? kmBetween(origin, { lat, lng })
            : null;
        return {
          id: String(v.id),
          business_name: v.business_name ?? null,
          owner_name: v.owner_name ?? null,
          trade: v.trade ?? null,
          deals_in: v.deals_in ?? null,
          avatar_url: v.avatar_url ?? null,
          cover_image_url: v.cover_image_url ?? null,
          cover_video_url: v.cover_video_url ?? null,
          verified: Boolean(v.verified),
          is_online: Boolean(v.is_online),
          lat,
          lng,
          km,
          service_radius_km: Number(v.service_radius_km ?? 10),
        };
      })
      .filter((s) => !origin || s.km == null || radiusKm === 0 || s.km <= radiusKm)
      .sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        return (a.km ?? 9999) - (b.km ?? 9999);
      })
      .slice(0, 30);

    return { ok: true as const, shops };
  });
