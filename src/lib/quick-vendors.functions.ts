import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const QuickVendorsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  origin: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  radiusKm: z.number().min(0).max(50).optional(),
});

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

export const getQuickMapVendors = createServerFn({ method: "POST" })
  .inputValidator((d) => QuickVendorsSchema.parse(d))
  .handler(async ({ data }) => {
    const itemIds = Array.from(new Set(data.itemIds)).slice(0, 50);
    const { data: mappings, error: mappingsError } = await (supabaseAdmin as any)
      .from("vendor_item_mappings")
      .select("vendor_id")
      .in("item_id", itemIds)
      .eq("is_active", true);

    if (mappingsError) return { ok: false as const, error: mappingsError.message, vendors: [] };

    const vendorIds = Array.from(new Set((mappings ?? []).map((m: any) => m.vendor_id).filter(Boolean)));
    if (vendorIds.length === 0) return { ok: true as const, vendors: [] };

    const { data: vendors, error: vendorsError } = await (supabaseAdmin as any)
      .from("vendors")
      .select("id, user_id, business_name, owner_name, avatar_url, status, is_blocked, is_online, lat, lng, live_lat, live_lng, location_updated_at, operation_mode, service_radius_km")
      .in("user_id", vendorIds);

    if (vendorsError) return { ok: false as const, error: vendorsError.message, vendors: [] };

    const origin = data.origin ?? null;
    const radiusKm = data.radiusKm ?? 10;
    if (!origin) return { ok: true as const, vendors: [] };
    const publicVendors = (vendors ?? [])
      .filter((v: any) => v.status === "active" && v.is_blocked === false)
      .map((v: any) => {
        const dynamic = v.operation_mode === "dynamic";
        const fresh = !!v.location_updated_at && Date.now() - new Date(v.location_updated_at).getTime() <= 10 * 60 * 1000;
        const useLive = dynamic && fresh && v.live_lat != null && v.live_lng != null;
        const rawLat = useLive ? v.live_lat : v.lat;
        const rawLng = useLive ? v.live_lng : v.lng;
        const lat = rawLat == null ? null : Number(rawLat);
        const lng = rawLng == null ? null : Number(rawLng);
        const online = Boolean(v.is_online);
        const km = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? kmBetween(origin, { lat, lng }) : null;
        return {
        id: String(v.id),
        user_id: String(v.user_id),
        business_name: v.business_name as string | null,
        owner_name: v.owner_name as string | null,
        avatar_url: v.avatar_url as string | null,
        status: v.status as string | null,
        is_online: online,
        lat,
        lng,
        service_radius_km: Number(v.service_radius_km ?? 10),
        km,
        };
      })
      .filter((v: any) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.km != null)
      .filter((v: any) => (radiusKm === 0 || v.km <= radiusKm) && (v.service_radius_km === 0 || v.km <= v.service_radius_km))
      .sort((a: any, b: any) => (a.km ?? 9999) - (b.km ?? 9999))
      .slice(0, 12);

    return { ok: true as const, vendors: publicVendors };
  });

// Fetch ALL vendors (online + offline) near a customer, irrespective of item mapping.
// Used to populate the customer map by default (before any category is picked).
// Offline vendors fall back to registered shop lat/lng so they always float
// on the map as long as admin has approved them.
const NearbyOnlineSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  radiusKm: z.number().min(0).max(50).optional(),
  subCategoryId: z.string().uuid().nullable().optional(),
  itemIds: z.array(z.string().uuid()).max(50).optional(),
});

export const getNearbyOnlineVendors = createServerFn({ method: "POST" })
  .inputValidator((d) => NearbyOnlineSchema.parse(d))
  .handler(async ({ data }) => {
    const itemIds = Array.from(new Set(data.itemIds ?? [])).slice(0, 50);
    let mappedVendorIds: string[] | null = null;

    if (itemIds.length || data.subCategoryId) {
      let query = (supabaseAdmin as any)
        .from("vendor_item_mappings")
        .select("vendor_id, catalog_items!inner(category_id)")
        .eq("is_active", true);

      if (itemIds.length) query = query.in("item_id", itemIds);
      if (data.subCategoryId) query = query.eq("catalog_items.category_id", data.subCategoryId);

      const { data: mappings, error: mappingsError } = await query;
      if (mappingsError) {
        return { ok: false as const, error: mappingsError.message, vendors: [], onlineCount: 0, offlineCount: 0 };
      }
      mappedVendorIds = Array.from(new Set((mappings ?? []).map((m: any) => String(m.vendor_id)).filter(Boolean)));
      if (mappedVendorIds.length === 0) {
        return { ok: true as const, vendors: [], onlineCount: 0, offlineCount: 0 };
      }
    }

    const { data: vendors, error } = await (supabaseAdmin as any)
      .from("vendors")
      .select("id, user_id, business_name, owner_name, avatar_url, status, is_blocked, is_online, lat, lng, live_lat, live_lng, location_updated_at, operation_mode, service_radius_km")
      .eq("is_blocked", false);

    if (error) return { ok: false as const, error: error.message, vendors: [], onlineCount: 0, offlineCount: 0 };

    const origin = data.origin ?? null;
    const radiusKm = data.radiusKm ?? 10;
    const FRESH_MS = 24 * 60 * 60 * 1000; // 24h tolerance for live coords
    const vendorUserIds = Array.from(new Set((vendors ?? []).map((v: any) => v.user_id).filter(Boolean)));
    const profileMap = new Map<string, { address: string | null; avatar_url: string | null }>();
    if (vendorUserIds.length) {
      const { data: customerRows } = await (supabaseAdmin as any)
        .from("customers")
        .select("user_id, address, avatar_url")
        .in("user_id", vendorUserIds);
      (customerRows ?? []).forEach((c: any) =>
        profileMap.set(String(c.user_id), { address: c.address ?? null, avatar_url: c.avatar_url ?? null }),
      );
    }
    const publicVendors = (vendors ?? [])
      .filter((v: any) => !mappedVendorIds || mappedVendorIds.includes(String(v.user_id)) || mappedVendorIds.includes(String(v.id)))
      .map((v: any) => {
        const fresh = !!v.location_updated_at && Date.now() - new Date(v.location_updated_at).getTime() <= FRESH_MS;
        const useLive = fresh && v.live_lat != null && v.live_lng != null;
        const rawLat = useLive ? v.live_lat : (v.lat ?? v.live_lat);
        const rawLng = useLive ? v.live_lng : (v.lng ?? v.live_lng);
        const lat = rawLat == null ? null : Number(rawLat);
        const lng = rawLng == null ? null : Number(rawLng);
        const km = origin && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
          ? kmBetween(origin, { lat, lng }) : null;
        const profile = profileMap.get(String(v.user_id));
        const areaRaw = String(profile?.address ?? "").split(",").slice(0, 2).join(",").trim();
        const isOnline = v.status === "active" && Boolean(v.is_online);
        return {
          id: String(v.id),
          user_id: String(v.user_id),
          business_name: v.business_name as string | null,
          owner_name: v.owner_name as string | null,
          avatar_url: (v.avatar_url || profile?.avatar_url || null) as string | null,
          status: v.status as string | null,
          is_online: isOnline,
          area: areaRaw || null,
          lat,
          lng,
          service_radius_km: Number(v.service_radius_km ?? 10),
          km,
        };
      })
      .filter((v: any) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && (!origin || v.km != null))
      .filter((v: any) => !origin || radiusKm === 0 || v.km <= radiusKm)
      .sort((a: any, b: any) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        return (a.km ?? 9999) - (b.km ?? 9999);
      })
      .slice(0, 24);

    const onlineCount = publicVendors.filter((v: any) => v.is_online).length;
    const offlineCount = publicVendors.length - onlineCount;
    return { ok: true as const, vendors: publicVendors, onlineCount, offlineCount };
  });