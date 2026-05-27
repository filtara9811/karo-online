import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const QuickVendorsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  origin: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
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
      .from("vendors_public")
      .select("id, user_id, business_name, owner_name, avatar_url, status, is_blocked, lat, lng, service_radius_km")
      .in("user_id", vendorIds);

    if (vendorsError) return { ok: false as const, error: vendorsError.message, vendors: [] };

    const origin = data.origin ?? null;
    const publicVendors = (vendors ?? [])
      .filter((v: any) => v.lat != null && v.lng != null)
      .map((v: any) => ({
        id: String(v.id),
        user_id: String(v.user_id),
        business_name: v.business_name as string | null,
        owner_name: v.owner_name as string | null,
        avatar_url: v.avatar_url as string | null,
        status: v.status as string | null,
        lat: Number(v.lat),
        lng: Number(v.lng),
        service_radius_km: Number(v.service_radius_km ?? 10),
        km: origin ? kmBetween(origin, { lat: Number(v.lat), lng: Number(v.lng) }) : null,
      }))
      .filter((v: any) => v.km == null || v.km <= Math.max(10, Number(v.service_radius_km ?? 10)))
      .sort((a: any, b: any) => (a.km ?? 9999) - (b.km ?? 9999))
      .slice(0, 8);

    return { ok: true as const, vendors: publicVendors };
  });